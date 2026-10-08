import { useCallback, useState } from 'react';
import { LANGS, useI18n, Key } from './i18n';
import Calculator from './pages/Calculator';
import Data from './pages/Data';
import Search from './pages/Search';

type Tab = 'search' | 'calc' | 'data';
const TABS: [Tab, Key][] = [['search', 'tab.search'], ['calc', 'tab.calc'], ['data', 'tab.data']];

function Guide() {
  const { t } = useI18n();
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem('guideHidden') === '1'; } catch { return false; } });
  if (hidden) return null;
  return (
    <aside className="guide" aria-label={t('guide.title')}>
      <b>{t('guide.title')}</b>
      <ol><li>{t('guide.1')}</li><li>{t('guide.2')}</li><li>{t('guide.3')}</li></ol>
      <button className="ghost" onClick={() => { setHidden(true); try { localStorage.setItem('guideHidden', '1'); } catch { /* ignore */ } }}>{t('guide.hide')}</button>
    </aside>
  );
}

export default function App() {
  const { t, lang, setLang } = useI18n();
  const [tab, setTab] = useState<Tab>('calc');
  const [queue, setQueue] = useState<string[]>([]); // коды, отправленные из поиска в расчёт
  const clearQueue = useCallback(() => setQueue([]), []);

  return (
    <div className="shell">
      <header className="top">
        <div className="brand">
          <span className="logo" aria-hidden="true">₸</span>
          <div><h1>{t('app.title')}</h1><p>{t('app.subtitle')}</p></div>
        </div>
        <div className="langs" role="group" aria-label={t('lang.label')}>
          {LANGS.map((l) => (
            <button key={l.id} className={lang === l.id ? 'on' : ''} aria-pressed={lang === l.id} title={l.name} onClick={() => setLang(l.id)}>{l.label}</button>
          ))}
        </div>
      </header>
      <nav className="tabs" aria-label="Sections">
        {TABS.map(([id, key]) => (
          <button key={id} className={tab === id ? 'tab on' : 'tab'} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>{t(key)}</button>
        ))}
      </nav>
      <main>
        {tab !== 'data' && <Guide />}
        {tab === 'search' && <Search onAddToCalc={(c) => { setQueue((q) => [...q, c]); setTab('calc'); }} />}
        {tab === 'calc' && <Calculator queue={queue} clearQueue={clearQueue} goSearch={() => setTab('search')} />}
        {tab === 'data' && <Data />}
      </main>
    </div>
  );
}
