import { Injectable } from '@nestjs/common';
import { bad } from '../common/msgs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { DocumentReq, Rate, TnvedCode } from '../entities';
import { digits, formatCode } from '../common/util';

const chunk = <T>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(',', '.').replace('%', '').trim());
  return Number.isFinite(n) ? n : null;
};
const str = (v: unknown): string | null => (v === null || v === undefined || String(v).trim() === '' ? null : String(v).trim());

@Injectable()
export class ImportService {
  constructor(
    @InjectRepository(TnvedCode) private codes: Repository<TnvedCode>,
    @InjectRepository(Rate) private rates: Repository<Rate>,
    @InjectRepository(DocumentReq) private docs: Repository<DocumentReq>,
  ) {}

  private sheetRows(buf: Buffer): Record<string, unknown>[] {
    const wb = XLSX.read(buf, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null, raw: true });
    // нормализуем заголовки: нижний регистр, пробелы -> _
    return rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k.trim().toLowerCase().replace(/\s+/g, '_'), v])));
  }

  /** Файл кодов: колонки по порядку — №, код ТН ВЭД, ед. изм., описание (как в КОДЫ-НОВЫЕ.xlsx). */
  async importCodes(buf: Buffer, replace = false) {
    const wb = XLSX.read(buf, { type: 'buffer' });
    const raw = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: null });
    const items: TnvedCode[] = [];
    for (const r of raw) {
      const code = digits(String(r[1] ?? ''));
      if (code.length < 4 || code.length > 10 || !/^\d[\d ]+$/.test(String(r[1] ?? '').trim())) continue;
      const description = String(r[3] ?? '').trim();
      items.push({
        code, display: formatCode(code), unit: str(r[2]), description,
        searchText: `${code} ${description}`.toLowerCase(), heading: code.slice(0, 4),
      });
    }
    if (!items.length) throw bad('IMPORT_CODES_EMPTY');
    if (replace) await this.codes.clear();
    for (const part of chunk(items, 400)) {
      await this.codes.createQueryBuilder().insert().values(part)
        .orUpdate(['display', 'unit', 'description', 'searchText', 'heading'], ['code']).execute();
    }
    return { imported: items.length };
  }

  /** Колонки: code, duty_percent, duty_specific, duty_currency, excise_percent, excise_specific, excise_currency, vat_percent, util_fee, note */
  async importRates(buf: Buffer, replace = false) {
    const items: Rate[] = [];
    for (const r of this.sheetRows(buf)) {
      const code = digits(String(r['code'] ?? r['код'] ?? ''));
      if (code.length < 2) continue;
      items.push({
        code,
        dutyPercent: num(r['duty_percent']), dutySpecific: num(r['duty_specific']), dutyCurrency: str(r['duty_currency']),
        excisePercent: num(r['excise_percent']), exciseSpecific: num(r['excise_specific']), exciseCurrency: str(r['excise_currency']),
        vatPercent: num(r['vat_percent']), utilFee: num(r['util_fee']), note: str(r['note']),
      });
    }
    if (!items.length) throw bad('IMPORT_RATES_EMPTY');
    if (replace) await this.rates.clear();
    for (const part of chunk(items, 300)) await this.rates.save(part);
    return { imported: items.length };
  }

  /** Колонки: code_prefix, title, kind (certificate | license | benefit | other) */
  async importDocuments(buf: Buffer, replace = false) {
    const items: Partial<DocumentReq>[] = [];
    for (const r of this.sheetRows(buf)) {
      const codePrefix = digits(String(r['code_prefix'] ?? r['code'] ?? ''));
      const title = str(r['title']);
      if (codePrefix.length < 2 || !title) continue;
      items.push({ codePrefix, title, kind: str(r['kind']) ?? 'other' });
    }
    if (!items.length) throw bad('IMPORT_DOCS_EMPTY');
    if (replace) await this.docs.clear();
    for (const part of chunk(items, 300)) await this.docs.save(part);
    return { imported: items.length };
  }

  ratesTemplate(): Buffer {
    const rows = [
      ['code', 'duty_percent', 'duty_specific', 'duty_currency', 'excise_percent', 'excise_specific', 'excise_currency', 'vat_percent', 'util_fee', 'note'],
      ['8471', 5, null, null, null, null, null, null, null, 'пример: ставка на всю товарную позицию'],
      ['8703210000', 30, 1.5, 'EUR', 5, null, null, null, 1000000, 'пример: комбинированная ставка (больше из двух)'],
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'rates');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}
