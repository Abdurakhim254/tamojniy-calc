import { useEffect, useState } from 'react';
import { api, API_BASE_URL, Stats } from '../api';
import { Key, useI18n } from '../i18n';

const SETTING_KEYS = ['vatPercent', 'customsFeePercent', 'customsFeeMaxUzs', 'benefitUntil', 'otherMultiplier', 'tempPercentPerMonth'] as const;

function Importer({ kind, onDone }: { kind: 'codes' | 'rates' | 'documents'; onDone: () => void }) {
  const { t, errText } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [replace, setReplace] = useState(false);
  const [msg, setMsg] = useState<{ text: string; bad: boolean } | null>(null);
  const go = async () => {
    if (!file) return;
    setMsg({ text: t('dt.uploading'), bad: false });
    try {
      const r = await api.upload(kind, file, replace);
      setMsg({ text: t('dt.done', { n: r.imported }), bad: false });
      onDone();
    } catch (e) { setMsg({ text: errText(e), bad: true }); }
  };
  return (
    <div className="import">
      <h3>{t(`dt.${kind}.title` as Key)}</h3>
      <p className="muted small">{t(`dt.${kind}.hint` as Key)}</p>
      {kind === 'rates' && <p><a href={`${API_BASE_URL}/admin/rates/template`}>{t('dt.rates.tpl')}</a></p>}
      <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <label className="check"><input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} /> {t('dt.replace')}</label>
      <button className="primary" disabled={!file} onClick={go}>{t('dt.upload')}</button>
      {msg && <p className={msg.bad ? 'err' : 'muted'} role={msg.bad ? 'alert' : 'status'}>{msg.text}</p>}
    </div>
  );
}

export default function Data() {
  const { t, errText } = useI18n();
  const [s, setS] = useState<Record<string, string>>({});
  const [stats, setStats] = useState<Stats | null>(null);
  const [token, setToken] = useState(() => { try { return sessionStorage.getItem('adminToken') || ''; } catch { return ''; } });
  const [msg, setMsg] = useState<{ text: string; bad: boolean } | null>(null);

  const loadStats = () => api.stats().then(setStats).catch(() => undefined);
  useEffect(() => {
    api.settings().then(setS).catch((e) => setMsg({ text: errText(e), bad: true }));
    loadStats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    try { sessionStorage.setItem('adminToken', token); } catch { /* ignore */ }
    try { setS(await api.saveSettings(s)); setMsg({ text: t('dt.saved'), bad: false }); } catch (e) { setMsg({ text: errText(e), bad: true }); }
  };

  return (
    <div className="stack">
      <section className="panel">
        <h2 className="h2">{t('dt.status')}</h2>
        {stats && (
          <>
            <div className="stats">
              <div><b>{stats.codes.toLocaleString()}</b><span>{t('dt.codes')}</span></div>
              <div><b>{stats.rates.toLocaleString()}</b><span>{t('dt.rates')}</span></div>
              <div><b>{stats.documents.toLocaleString()}</b><span>{t('dt.docs')}</span></div>
            </div>
            {stats.rates === 0 && <p className="notice warn">{t('dt.noRatesWarn')}</p>}
            {stats.demoRates > 0 && <p className="notice warn">{t('dt.demoWarn', { n: stats.demoRates })}</p>}
          </>
        )}
      </section>

      <section className="panel">
        <h2 className="h2">{t('dt.import')}</h2>
        <Importer kind="rates" onDone={loadStats} />
        <Importer kind="documents" onDone={loadStats} />
        <Importer kind="codes" onDone={loadStats} />
      </section>

      <section className="panel">
        <h2 className="h2">{t('dt.settings')}</h2>
        <p className="muted small">{t('dt.settingsHint')}</p>
        <div className="grid">
          {SETTING_KEYS.map((k) => (
            <label key={k}>{t(`set.${k}` as Key)}<input value={s[k] ?? ''} onChange={(e) => setS({ ...s, [k]: e.target.value })} /></label>
          ))}
          <label>{t('dt.token')}<input type="password" value={token} onChange={(e) => setToken(e.target.value)} /></label>
        </div>
        <div className="actions"><button className="primary" onClick={save}>{t('dt.save')}</button></div>
        {msg && <p className={msg.bad ? 'err' : 'muted'} role={msg.bad ? 'alert' : 'status'}>{msg.text}</p>}
      </section>
    </div>
  );
}
