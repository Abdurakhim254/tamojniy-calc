import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { Country, CountryGoods, Preference, TnvedCode } from '../entities';
import { FxService } from '../common/fx.service';
import { bad, Lang, msg, normLang, unitName } from '../common/msgs';
import { SettingsService } from '../common/settings.service';
import { digits, formatCode, round2 } from '../common/util';
import { matchesPreference, TnvedService } from '../tnved/tnved.service';

export interface CalcItemInput { code: string; price: number; freight?: number; insurance?: number; qty?: number }
export interface CalcInput {
  mode: 'import' | 'export' | 'temporary';
  date?: string;
  hasCertificate: boolean;
  origin: string; dispatch: string; trader: string;
  currency: string;
  fxRates?: Record<string, number>;
  tempMonths?: number;
  lang?: string;
  items: CalcItemInput[];
}

type Regime = 'ZST' | 'MFN' | 'OTHER';

export interface ItemResult {
  code: string; display: string; description: string; unit: string | null;
  customsValue: number; regime: Regime;
  /** Числа для пояснения формул на клиенте */
  dutyPct: number; dutySpecific: number | null; dutySpecificCurrency: string | null; excisePct: number | null; vatPct: number; feePct: number;
  qty: number; preferenceApplied: boolean; additionalApplied: boolean;
  dutyRateLabel: string;
  duty: number; excise: number; vat: number; fee: number; util: number; total: number;
  notes: string[]; warnings: string[];
}

/** Доп. пошлина (по схеме из duty_calc_variants.html, ст. 3001 ТК РУз): процентных пунктов к ставке. */
export const additionalPoints = (base: number) => (base < 10 ? 5 : base < 20 ? 10 : base < 30 ? 15 : 20);
const isDemo = (note?: string | null) => !!note && /^(DEMO|ДЕМО)/.test(note);

@Injectable()
export class CalcService {
  constructor(
    private tnved: TnvedService,
    private fx: FxService,
    private settings: SettingsService,
    @InjectRepository(Country) private countries: Repository<Country>,
    @InjectRepository(CountryGoods) private goods: Repository<CountryGoods>,
    @InjectRepository(Preference) private prefs: Repository<Preference>,
    @InjectRepository(TnvedCode) private codes: Repository<TnvedCode>,
  ) {}

  async calculate(input: CalcInput) {
    if (!input?.items?.length) throw bad('EMPTY_ITEMS');
    const lang: Lang = normLang(input.lang);
    const m = (k: string, p?: Record<string, unknown>) => msg(lang, k, p);
    const s = await this.settings.all();
    const date = input.date || new Date().toISOString().slice(0, 10);
    const mode = input.mode || 'import';
    const cur = (input.currency || 'USD').toUpperCase();
    const live = await this.fx.rates();
    const rateOf = (c: string) => {
      const v = c === 'UZS' ? 1 : input.fxRates?.[c] ?? live[c];
      if (!v) throw bad('NO_FX', { currency: c });
      return v;
    };
    const cMap = new Map((await this.countries.find()).map((c) => [c.iso, c]));
    const goodsAll = await this.goods.find();
    const prefs = await this.prefs.find();
    const vatDefault = Number(s.vatPercent);
    const feePct = Number(s.customsFeePercent);
    const feeMax = Number(s.customsFeeMaxUzs);
    const months = Math.max(1, input.tempMonths || 1);
    const tempFactor = mode === 'temporary' ? (months * Number(s.tempPercentPerMonth)) / 100 : 1;

    const items: ItemResult[] = [];
    for (const it of input.items) {
      const code = digits(it.code);
      const warnings: string[] = [];
      const notes: string[] = [];
      const info = await this.codes.findOne({ where: { code } });
      if (!info) warnings.push(m('W_CODE_NOT_FOUND'));
      const rate = await this.tnved.resolveRate(code);
      if (!rate) warnings.push(m('W_NO_RATE'));
      else if (isDemo(rate.note)) warnings.push(m('W_DEMO'));

      const qty = it.qty ?? 0;
      const customsValue = ((it.price || 0) + (it.freight || 0) + (it.insurance || 0)) * rateOf(cur);

      // --- режим страны ---
      const regimeOf = (iso: string): Regime | 'NONE' => {
        const c = cMap.get(iso);
        if (!c) return 'NONE';
        if (c.goodsListOnly && !goodsAll.some((g) => g.iso === iso && code.startsWith(g.codePrefix))) return 'NONE';
        return c.regime as Regime;
      };
      const rs = [input.origin, input.dispatch, input.trader].map(regimeOf);
      let regime: Regime = 'OTHER';
      if (rs.every((r) => r === 'ZST')) regime = 'ZST';
      else if (rs.every((r) => r === 'MFN')) regime = 'MFN';

      let multiplier = 1;
      let addDuty = false;
      if (mode === 'export') {
        multiplier = 1;
      } else if (!input.hasCertificate) {
        addDuty = true;
        notes.push(m('N_NO_CERT'));
      } else if (regime === 'ZST') {
        multiplier = 0;
        notes.push(m('N_ZST'));
      } else if (regime === 'MFN') {
        notes.push(m('N_MFN'));
      } else {
        multiplier = Number(s.otherMultiplier);
        if (date >= s.benefitUntil) addDuty = true;
        notes.push(m(addDuty ? 'N_OTHER_ADD' : 'N_OTHER_BENEFIT', { date: s.benefitUntil, mult: multiplier }));
      }
      if (mode !== 'export' && regime === 'OTHER' && input.hasCertificate) {
        const lim = [...new Set([input.origin, input.dispatch, input.trader])].filter((iso) => cMap.get(iso)?.goodsListOnly);
        if (lim.length) warnings.push(m('W_GOODS_LIST', { countries: lim.join(', ') }));
      }

      // --- платежи ---
      let duty = 0, excise = 0, vat = 0, util = 0;
      let dutyPct = 0, excisePct: number | null = null, vatPct = vatDefault, prefApplied = false;
      let dutyLabel = '—';
      const imp = mode !== 'export';
      if (rate && imp) {
        const base = rate.dutyPercent ?? 0;
        dutyPct = base * multiplier + (addDuty ? additionalPoints(base) : 0);
        const dutyByPct = (customsValue * dutyPct) / 100;
        let dutySpec = 0;
        if (rate.dutySpecific) {
          if (!qty) warnings.push(m('W_NEED_QTY_DUTY'));
          dutySpec = rate.dutySpecific * qty * rateOf((rate.dutyCurrency || 'EUR').toUpperCase()) * multiplier;
        }
        duty = Math.max(dutyByPct, dutySpec);
        dutyLabel = rate.dutySpecific
          ? `${dutyPct}% / ${rate.dutySpecific} ${rate.dutyCurrency || 'EUR'} ${m('PER')} ${unitName(lang, info?.unit) || m('UNIT')}`
          : `${dutyPct}%`;

        const pref = input.hasCertificate ? prefs.find((p) => matchesPreference(p, code, date)) : undefined;
        if (pref) {
          prefApplied = true;
          dutyPct = pref.dutyPercent;
          duty = (customsValue * pref.dutyPercent) / 100;
          dutyLabel = `${pref.dutyPercent}% (${m('PREF_SUFFIX')})`;
          const name = (lang === 'en' ? pref.nameEn : lang === 'uz' ? pref.nameUz : pref.name) || pref.name;
          notes.push(m('N_PREF', { name, source: pref.source }));
        }

        excisePct = rate.excisePercent;
        const exByPct = rate.excisePercent ? ((customsValue + duty) * rate.excisePercent) / 100 : 0;
        const exSpec = rate.exciseSpecific ? rate.exciseSpecific * qty * rateOf((rate.exciseCurrency || 'USD').toUpperCase()) : 0;
        if (rate.exciseSpecific && !qty) warnings.push(m('W_NEED_QTY_EXCISE'));
        excise = Math.max(exByPct, exSpec);
        vatPct = rate.vatPercent ?? vatDefault;
        vat = ((customsValue + duty + excise) * vatPct) / 100;
        util = rate.utilFee ?? 0;
      }
      let fee = (customsValue * feePct) / 100;
      if (feeMax > 0) fee = Math.min(fee, feeMax);
      if (tempFactor !== 1) {
        duty *= tempFactor; excise *= tempFactor; vat *= tempFactor;
        notes.push(m('N_TEMP', { months, pct: s.tempPercentPerMonth }));
      }
      if (mode === 'export') notes.push(m('N_EXPORT'));

      items.push({
        code, display: formatCode(code), description: info?.description ?? '', unit: info?.unit ?? null,
        customsValue: round2(customsValue), regime,
        dutyPct, dutySpecific: rate?.dutySpecific ?? null, dutySpecificCurrency: rate?.dutyCurrency ?? null,
        excisePct, vatPct, feePct, qty, preferenceApplied: prefApplied, additionalApplied: addDuty,
        dutyRateLabel: dutyLabel,
        duty: round2(duty), excise: round2(excise), vat: round2(vat), fee: round2(fee), util: round2(util),
        total: round2(duty + excise + vat + fee + util), notes, warnings,
      });
    }
    const sum = (k: 'customsValue' | 'duty' | 'excise' | 'vat' | 'fee' | 'util' | 'total') => round2(items.reduce((a, x) => a + x[k], 0));
    return {
      date, mode, currency: cur, fxRate: round2(rateOf(cur)), tempMonths: months, items,
      totals: { customsValue: sum('customsValue'), duty: sum('duty'), excise: sum('excise'), vat: sum('vat'), fee: sum('fee'), util: sum('util'), total: sum('total') },
    };
  }

  async exportXlsx(input: CalcInput): Promise<Buffer> {
    const lang = normLang(input.lang);
    const m = (k: string, p?: Record<string, unknown>) => msg(lang, k, p);
    const r = await this.calculate(input);
    const head = ['X_CODE', 'X_DESC', 'X_VALUE', 'X_RATE', 'X_DUTY', 'X_EXCISE', 'X_VAT', 'X_FEE', 'X_UTIL', 'X_TOTAL', 'X_NOTES'].map((k) => m(k));
    const rows: (string | number)[][] = r.items.map((i) => [i.display, i.description, i.customsValue, i.dutyRateLabel, i.duty, i.excise, i.vat, i.fee, i.util, i.total, [...i.notes, ...i.warnings].join('; ')]);
    const t = r.totals;
    rows.push([m('X_TOTAL'), '', t.customsValue, '', t.duty, t.excise, t.vat, t.fee, t.util, t.total, '']);
    const ws = XLSX.utils.aoa_to_sheet([[m('X_TITLE', { date: r.date, cur: r.currency, rate: r.fxRate })], head, ...rows]);
    ws['!cols'] = [{ wch: 16 }, { wch: 50 }, ...Array(8).fill({ wch: 17 }), { wch: 60 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, m('X_SHEET'));
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}
