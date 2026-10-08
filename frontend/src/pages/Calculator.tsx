import { useEffect, useRef, useState } from 'react';
import { api, CalcRequest, CalcResponse, Country, digitsOnly, ItemResult, splitDesc, today } from '../api';
import Hint from '../components/Hint';
import { useI18n } from '../i18n';

interface Row { id: number; code: string; price: string; freight: string; insurance: string; qty: string }
interface Info { display: string; description: string; unit: string | null; hasRate: boolean }
const emptyRow = (id: number, code = ''): Row => ({ id, code, price: '', freight: '', insurance: '', qty: '' });
const CURRENCIES = ['USD', 'EUR', 'RUB', 'CNY', 'UZS'];
const MODES: CalcRequest['mode'][] = ['import', 'export', 'temporary'];
const num = (s: string) => Number(s.replace(/\s/g, '').replace(',', '.')) || 0;

function CountrySelect({ label, value, onChange, countries }: { label: string; value: string; onChange: (v: string) => void; countries: Country[] }) {
  const { t, lang, country } = useI18n();
  const group = (regime: string) =>
    countries.filter((c) => c.regime === regime).sort((a, b) => country(a.iso, a.name).localeCompare(country(b.iso, b.name), lang));
  const opt = (c: Country) => <option key={c.iso} value={c.iso}>{country(c.iso, c.name)}{c.goodsListOnly ? ` (${t('c.byList')})` : ''}</option>;
  return (
    <label>{label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="XX">{t('c.otherCountry')}</option>
        <optgroup label={t('regime.ZST')}>{group('ZST').map(opt)}</optgroup>
        <optgroup label={t('regime.MFN')}>{group('MFN').map(opt)}</optgroup>
      </select>
    </label>
  );
}

export default function Calculator({ queue, clearQueue, goSearch }: { queue: string[]; clearQueue: () => void; goSearch: () => void }) {
  const { t, lang, money, errText, unit: unitLabel } = useI18n();
  const [countries, setCountries] = useState<Country[]>([]);
  const [mode, setMode] = useState<CalcRequest['mode']>('import');
  const [date, setDate] = useState(today());
  const [months, setMonths] = useState('1');
  const [cert, setCert] = useState(true);
  const [same, setSame] = useState(true);
  const [origin, setOrigin] = useState('XX');
  const [dispatch, setDispatch] = useState('XX');
  const [trader, setTrader] = useState('XX');
  const [currency, setCurrency] = useState('USD');
  const [fx, setFx] = useState<Record<string, number>>({});
  const [fxDate, setFxDate] = useState<string>();
  const [fxLoaded, setFxLoaded] = useState(false);
  const [fxManual, setFxManual] = useState('');
  const [rows, setRows] = useState<Row[]>([emptyRow(1)]);
  const [infos, setInfos] = useState<Record<string, Info | 'missing'>>({});
  const [hints, setHints] = useState<{ code: string; display: string; description: string }[]>([]);
  const [out, setOut] = useState<{ res: CalcResponse; rows: Row[] } | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const nextId = useRef(2);
  const seq = useRef(0);
  const pending = useRef(new Set<string>());

  useEffect(() => {
    api.countries().then(setCountries).catch((e) => setErr(errText(e)));
    api.fx().then((f) => { setFx(f.rates); setFxDate(f.date); }).catch(() => undefined).finally(() => setFxLoaded(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { // коды, присланные со вкладки поиска
    if (!queue.length) return;
    setRows((rs) => [...rs.filter((r) => r.code.trim() || r.price), ...queue.map((c) => emptyRow(nextId.current++, c))]);
    clearQueue();
  }, [queue, clearQueue]);

  useEffect(() => { // название и единица измерения под полем кода
    rows.forEach((r) => {
      const c = digitsOnly(r.code);
      if (c.length !== 10 || c in infos || pending.current.has(c)) return;
      pending.current.add(c);
      api.detail(c)
        .then((d) => setInfos((m) => ({ ...m, [c]: { display: d.display, description: d.description, unit: d.unit, hasRate: !!d.rate } })))
        .catch(() => setInfos((m) => ({ ...m, [c]: 'missing' })))
        .finally(() => pending.current.delete(c));
    });
  }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const liveRate = fx[currency];
  const rateShown = fxManual || (liveRate ? String(Math.round(liveRate * 100) / 100) : '');
  const update = (id: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const suggest = (v: string) => { if (v.trim().length >= 2 && !/^\d+$/.test(v.trim())) api.search(v).then((x) => setHints(x.slice(0, 12))).catch(() => undefined); };

  const usedRows = rows.filter((r) => digitsOnly(r.code).length === 10 && num(r.price) > 0);
  const buildRequest = (used: Row[]): CalcRequest => ({
    mode, date, hasCertificate: cert, lang,
    origin, dispatch: same ? origin : dispatch, trader: same ? origin : trader, currency,
    fxRates: { ...fx, ...(currency !== 'UZS' && num(rateShown) > 0 ? { [currency]: num(rateShown) } : {}) },
    tempMonths: Math.max(1, Math.round(num(months)) || 1),
    items: used.map((r) => ({ code: digitsOnly(r.code), price: num(r.price), freight: num(r.freight), insurance: num(r.insurance), qty: num(r.qty) || undefined })),
  });

  // Расчёт «вживую»: пересчитываем при любом изменении данных (с небольшой задержкой)
  const reqKey = JSON.stringify([mode, date, cert, same, origin, dispatch, trader, currency, rateShown, months, lang, fxLoaded, usedRows]);
  useEffect(() => {
    if (!usedRows.length) { setOut(null); setErr(''); setBusy(false); return; }
    const id = ++seq.current;
    setBusy(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.calc(buildRequest(usedRows));
        if (id === seq.current) { setOut({ res, rows: usedRows }); setErr(''); }
      } catch (e) {
        if (id === seq.current) { setOut(null); setErr(errText(e)); }
      } finally { if (id === seq.current) setBusy(false); }
    }, 450);
    return () => clearTimeout(timer);
  }, [reqKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const download = async () => {
    try {
      const url = URL.createObjectURL(await api.exportXlsx(buildRequest(usedRows)));
      Object.assign(document.createElement('a'), { href: url, download: `customs-${date}.xlsx` }).click();
      URL.revokeObjectURL(url);
    } catch (e) { setErr(errText(e)); }
  };

  /** Пошаговое объяснение расчёта для одного товара */
  const formulas = (i: ItemResult, row: Row, res: CalcResponse): string[] => {
    const u = t('common.uzs');
    const parts = [num(row.price), num(row.freight), num(row.insurance)].filter((x) => x > 0).map(money).join(' + ');
    const lines = [`${t('f.value', { sum: parts, rate: money(res.fxRate) })} = ${money(i.customsValue)} ${u}`];
    const value = money(i.customsValue);
    if (res.mode === 'export') {
      lines.push(`${t('f.fee', { value, pct: i.feePct })} = ${money(i.fee)} ${u}`, t('f.exportOnly'));
      return lines;
    }
    if (i.vat === 0 && i.duty === 0 && i.excise === 0) { lines.push(t('f.noRate')); return lines; }
    if (res.mode !== 'temporary') {
      lines.push(i.dutySpecific != null
        ? `${t('f.dutyMixed', { label: i.dutyRateLabel })} = ${money(i.duty)} ${u}`
        : i.dutyPct === 0 ? `${t('f.dutyZero')} = 0 ${u}` : `${t('f.duty', { value, pct: i.dutyPct })} = ${money(i.duty)} ${u}`);
      if (i.excise > 0) lines.push(`${i.excisePct != null ? t('f.excise', { value, duty: money(i.duty), pct: i.excisePct }) : t('pay.excise')} = ${money(i.excise)} ${u}`);
      lines.push(`${t('f.vat', { value, duty: money(i.duty), excise: money(i.excise), pct: i.vatPct })} = ${money(i.vat)} ${u}`);
    }
    lines.push(`${t('f.fee', { value, pct: i.feePct })} = ${money(i.fee)} ${u}`);
    return lines;
  };

  const res = out?.res;
  const pays: [string, keyof CalcResponse['totals']][] = [['pay.duty', 'duty'], ['pay.excise', 'excise'], ['pay.vat', 'vat'], ['pay.fee', 'fee'], ['pay.util', 'util']];
  const allWarnings = res ? [...new Set(res.items.flatMap((i) => i.warnings))] : [];

  return (
    <div className="calc2">
      <div className="stack">
        <section className="panel step">
          <h2><span className="n">1</span>{t('c.step1')}</h2>
          <div className="seg" role="radiogroup" aria-label={t('c.step1')}>
            {MODES.map((m) => (
              <button key={m} role="radio" aria-checked={mode === m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>{t(`mode.${m}` as 'mode.import')}</button>
            ))}
          </div>
          <div className="grid">
            <label>{t('c.date')}<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
            {mode === 'temporary' && <label>{t('c.months')}<input inputMode="numeric" value={months} onChange={(e) => setMonths(e.target.value)} /></label>}
          </div>
        </section>

        <section className="panel step">
          <h2><span className="n">2</span>{t('c.step2')} <Hint text={t('c.countryHelp')} /></h2>
          <div className="grid">
            <CountrySelect label={t('c.origin')} value={origin} onChange={setOrigin} countries={countries} />
            <label className="check"><input type="checkbox" checked={cert} onChange={(e) => setCert(e.target.checked)} /> {t('c.cert')} <Hint text={t('c.certHelp')} /></label>
          </div>
          <label className="check"><input type="checkbox" checked={same} onChange={(e) => setSame(e.target.checked)} /> {t('c.sameCountry')}</label>
          {!same && (
            <div className="grid">
              <CountrySelect label={t('c.dispatch')} value={dispatch} onChange={setDispatch} countries={countries} />
              <CountrySelect label={t('c.trader')} value={trader} onChange={setTrader} countries={countries} />
            </div>
          )}
        </section>

        <section className="panel step">
          <h2><span className="n">3</span>{t('c.step3')}</h2>
          <div className="grid">
            <label>{t('c.currency')}
              <select value={currency} onChange={(e) => { setCurrency(e.target.value); setFxManual(''); }}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select>
            </label>
            {currency !== 'UZS' && (
              <label>{t('c.rate', { cur: currency })}
                <input inputMode="decimal" value={rateShown} placeholder={t('c.rateType')} onChange={(e) => setFxManual(e.target.value)} />
                {liveRate && !fxManual && <small className="muted">{fxDate ? t('c.rateCb', { date: fxDate }) : t('c.rateCbNoDate')}</small>}
              </label>
            )}
          </div>
          {fxLoaded && !liveRate && currency !== 'UZS' && !fxManual && <p className="notice warn">{t('c.rateWarn')}</p>}
        </section>

        <section className="panel step">
          <div className="between">
            <h2><span className="n">4</span>{t('c.step4')}</h2>
            <button className="linklike" onClick={goSearch}>{t('c.findCode')}</button>
          </div>
          <datalist id="codes">{hints.map((h) => <option key={h.code} value={h.code}>{h.display} — {splitDesc(h.description).title}</option>)}</datalist>
          {rows.map((r, idx) => {
            const c = digitsOnly(r.code);
            const info = c.length === 10 ? infos[c] : undefined;
            const unit = info && info !== 'missing' && info.unit ? unitLabel(info.unit) : null;
            return (
              <div className="item" key={r.id}>
                <div className="between">
                  <b>{t('c.itemN', { n: idx + 1 })}</b>
                  <button className="ghost small" onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.id !== r.id) : [emptyRow(nextId.current++)]))}>{t('c.remove')}</button>
                </div>
                <label>{t('c.code')} <Hint text={t('c.codeHelp')} />
                  <input list="codes" className="code" placeholder={t('c.codePh')} value={r.code} onChange={(e) => { update(r.id, { code: e.target.value }); suggest(e.target.value); }} />
                </label>
                {info && (
                  <p className="info">
                    {info === 'missing'
                      ? <span className="badge bad">{t('c.badgeNotFound')}</span>
                      : <><span>{splitDesc(info.description).title}</span>{!info.hasRate && <span className="badge warn">{t('c.badgeNoRate')}</span>}</>}
                  </p>
                )}
                <div className="grid four">
                  <label>{t('c.price', { cur: currency })} <Hint text={t('c.priceHelp')} />
                    <input inputMode="decimal" value={r.price} onChange={(e) => update(r.id, { price: e.target.value })} />
                  </label>
                  <label>{t('c.freight', { cur: currency })} <Hint text={t('c.freightHelp')} />
                    <input inputMode="decimal" value={r.freight} onChange={(e) => update(r.id, { freight: e.target.value })} />
                  </label>
                  <label>{t('c.insurance', { cur: currency })}
                    <input inputMode="decimal" value={r.insurance} onChange={(e) => update(r.id, { insurance: e.target.value })} />
                  </label>
                  <label>{unit ? t('c.qty', { unit }) : t('c.qtyUnitless')} <Hint text={t('c.qtyHelp')} />
                    <input inputMode="decimal" value={r.qty} onChange={(e) => update(r.id, { qty: e.target.value })} />
                  </label>
                </div>
              </div>
            );
          })}
          <button className="ghost" onClick={() => setRows((rs) => [...rs, emptyRow(nextId.current++)])}>{t('c.addItem')}</button>
        </section>
      </div>

      <aside id="result" className="panel result" aria-live="polite">
        <h2>{t('c.res.title')} {busy && <span className="muted small">{t('c.res.busy')}</span>}</h2>
        {err && <p className="notice bad" role="alert">{err}</p>}
        {!res && !err && <p className="muted">{t('c.res.empty')}</p>}
        {res && (
          <>
            <div className="total">
              <span>{t('c.res.total')}</span>
              <b>{money(res.totals.total)}</b>
              <span>{t('common.uzs')}</span>
            </div>
            <p className="muted small">{t('c.res.value')}: {money(res.totals.customsValue)} {t('common.uzs')} · {t('c.res.fx', { cur: res.currency, rate: money(res.fxRate) })}</p>
            {allWarnings.map((w) => <p key={w} className="notice warn">{w}</p>)}

            <ul className="break">
              {pays.map(([label, key]) => {
                const v = res.totals[key];
                const share = res.totals.total > 0 ? (v / res.totals.total) * 100 : 0;
                return (
                  <li key={key} className={v === 0 ? 'zero' : ''}>
                    <span>{t(label as 'pay.duty')}</span><b>{money(v)}</b>
                    <i style={{ width: `${share}%` }} aria-hidden="true" />
                  </li>
                );
              })}
            </ul>

            <h3>{t('c.res.items')}</h3>
            {res.items.map((i, k) => (
              <details key={k} className="how" open={res.items.length === 1}>
                <summary>
                  <span className="code">{i.display}</span>
                  <span className="grow">{splitDesc(i.description).title}</span>
                  <b>{money(i.total)}</b>
                </summary>
                <p className="muted small">{t('c.res.how')}:</p>
                <ol className="formula">{formulas(i, out.rows[k], res).map((l, n) => <li key={n}>{l}</li>)}</ol>
                {i.notes.length > 0 && <><p className="muted small">{t('c.res.notes')}:</p><ul className="plain small">{i.notes.map((n, x) => <li key={x}>{n}</li>)}</ul></>}
              </details>
            ))}
            <button className="primary wide" onClick={download}>⬇ {t('c.res.excel')}</button>
          </>
        )}
      </aside>
      {res && (
        <a className="mobile-total" href="#result">
          <span>{t('c.res.total')}</span><b>{money(res.totals.total)} {t('common.uzs')} ↓</b>
        </a>
      )}
    </div>
  );
}
