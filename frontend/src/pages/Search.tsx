import { useEffect, useState } from 'react';
import { api, Code, CodeDetail, splitDesc, TreeNode } from '../api';
import { useI18n } from '../i18n';

const EXAMPLES = ['кофе', 'молоко', 'рис', '0901'];

export default function Search({ onAddToCalc }: { onAddToCalc: (code: string) => void }) {
  const { t, lang, money, errText, unit: unitLabel } = useI18n();
  const [q, setQ] = useState('');
  const [found, setFound] = useState<Code[] | null>(null);
  const [trail, setTrail] = useState<string[]>([]);
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [detail, setDetail] = useState<CodeDetail | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      if (!q.trim()) { setFound(null); return; }
      api.search(q).then((r) => { setFound(r); setError(''); }).catch((e) => setError(errText(e)));
    }, 250);
    return () => clearTimeout(id);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const prefix = trail[trail.length - 1] ?? '';
  useEffect(() => { api.tree(prefix).then(setNodes).catch((e) => setError(errText(e))); }, [prefix]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = (code: string) => { setCopied(false); api.detail(code).then(setDetail).catch((e) => setError(errText(e))); };
  const copy = () => {
    if (!detail) return;
    navigator.clipboard?.writeText(detail.code).then(() => setCopied(true)).catch(() => undefined);
  };
  const r = detail?.rate;
  const prefName = (p: CodeDetail['preferences'][number]) => (lang === 'en' ? p.nameEn : lang === 'uz' ? p.nameUz : p.name) || p.name;
  const isDemo = !!r?.note && /^(DEMO|ДЕМО)/.test(r.note);
  const unit = unitLabel(detail?.unit);

  return (
    <div className="stack">
      <section className="panel searchbox">
        <div className="field-row">
          <input className="big" type="search" autoFocus placeholder={t('s.placeholder')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('s.placeholder')} />
          {q && <button className="ghost" onClick={() => setQ('')} aria-label="×">×</button>}
        </div>
        <p className="chips">
          <span className="muted">{t('s.examples')}</span>
          {EXAMPLES.map((x) => <button key={x} className="chip" onClick={() => setQ(x)}>{x}</button>)}
        </p>
        <p className="muted small">{t('s.ruNote')}</p>
        {error && <p className="err" role="alert">{error}</p>}
      </section>

      <div className="split">
        <section className="panel">
          {found ? (
            <>
              <p className="muted">{found.length ? t('s.found', { n: found.length }) : t('s.none')}</p>
              {found.length >= 50 && <p className="muted small">{t('s.foundMore', { n: 50 })}</p>}
              <ul className="list">
                {found.map((c) => {
                  const d = splitDesc(c.description);
                  return (
                    <li key={c.code}>
                      <button className={detail?.code === c.code ? 'sel' : ''} onClick={() => open(c.code)}>
                        <span className="code">{c.display}</span>
                        <span><b>{d.title}</b>{d.parents.length > 0 && <small>{d.parents.join(' › ')}</small>}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <>
              <h2 className="h2">{t('s.browse')}</h2>
              <p className="crumbs">
                <button onClick={() => setTrail([])}>{t('s.allGroups')}</button>
                {trail.map((x, i) => <button key={x} onClick={() => setTrail(trail.slice(0, i + 1))}>› {x}</button>)}
              </p>
              <ul className="list">
                {nodes.map((n) => (
                  <li key={n.prefix}>
                    {n.leaf ? (
                      <button className={detail?.code === n.prefix ? 'sel' : ''} onClick={() => open(n.prefix)}>
                        <span className="code">{n.display}</span>
                        <span><b>{splitDesc(n.title).title}</b>{splitDesc(n.title).parents.length > 0 && <small>{splitDesc(n.title).parents.join(' › ')}</small>}</span>
                      </button>
                    ) : (
                      <button onClick={() => setTrail([...trail, n.prefix])}>
                        <span className="code">{n.prefix}</span>
                        <span><b>{n.prefix.length === 2 ? t('s.group', { n: n.prefix }) : n.title}</b></span>
                        <span className="muted small">{t('s.codesCount', { n: n.count ?? 0 })}</span>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="panel detail" aria-live="polite">
          {!detail ? <p className="muted">{t('s.pick')}</p> : (
            <>
              <div className="between">
                <h2 className="code lg">{detail.display}</h2>
                <button className="ghost" onClick={copy}>{copied ? '✓' : '⧉'}</button>
              </div>
              <ol className="path">{detail.path.map((p, i) => <li key={i}>{p.replace(/:$/, '')}</li>)}</ol>
              <p className="muted">{t('d.unit')}: <b>{unit || '—'}</b></p>

              <h3>{t('d.rates')}</h3>
              {!r ? <p className="notice warn">{t('d.noRate')}</p> : (
                <>
                  {isDemo && <p className="notice warn">{t('d.demo')}</p>}
                  <dl className="kv">
                    <dt>{t('d.duty')}</dt>
                    <dd>{r.dutyPercent != null ? `${r.dutyPercent}%` : '—'}{r.dutySpecific != null && ` / ${r.dutySpecific} ${r.dutyCurrency ?? ''} ${t('d.perUnit', { unit: unit || '—' })}`}</dd>
                    <dt>{t('d.excise')}</dt>
                    <dd>{r.excisePercent != null ? `${r.excisePercent}%` : r.exciseSpecific != null ? `${r.exciseSpecific} ${r.exciseCurrency ?? ''}` : '—'}</dd>
                    <dt>{t('d.vat')}</dt><dd>{r.vatPercent != null ? `${r.vatPercent}%` : t('d.vatDefault')}</dd>
                    <dt>{t('d.util')}</dt><dd>{r.utilFee != null ? `${money(r.utilFee)} ${t('common.uzs')}` : '—'}</dd>
                    {r.note && !isDemo && <><dt>{t('d.note')}</dt><dd>{r.note}</dd></>}
                  </dl>
                </>
              )}

              <h3>{t('d.docs')}</h3>
              {detail.documents.length
                ? <ul className="plain">{detail.documents.map((d) => <li key={d.id}><span className="tag">{t(`kind.${d.kind}` as 'kind.other')}</span> {d.title}</li>)}</ul>
                : <p className="muted">{t('d.noDocs')}</p>}

              {detail.preferences.length > 0 && (
                <>
                  <h3>{t('d.prefs')}</h3>
                  <ul className="plain">{detail.preferences.map((p) => <li key={p.id}>{t('d.prefLine', { name: prefName(p), pct: p.dutyPercent, date: p.validTo, source: p.source })}</li>)}</ul>
                </>
              )}
              <button className="primary wide" onClick={() => onAddToCalc(detail.code)}>{t('d.addToCalc')} →</button>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
