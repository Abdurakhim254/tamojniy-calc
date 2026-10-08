import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError } from './api';
import { COUNTRY_NAMES } from './countries';
import { Dict, en, ru, uz } from './locales';
import { unitName } from './units';

export type Lang = 'ru' | 'en' | 'uz';
export const LANGS: { id: Lang; label: string; name: string }[] = [
  { id: 'ru', label: 'RU', name: 'Русский' },
  { id: 'en', label: 'EN', name: 'English' },
  { id: 'uz', label: 'UZ', name: "O'zbekcha" },
];
const DICTS: Record<Lang, Dict> = { ru, en, uz };
// uz форматируем как ru (пробел между разрядами): данные uz-UZ в Intl есть не во всех браузерах
const NUM_LOCALE: Record<Lang, string> = { ru: 'ru-RU', en: 'en-US', uz: 'ru-RU' };

function detect(): Lang {
  try {
    const saved = localStorage.getItem('lang');
    if (saved === 'ru' || saved === 'en' || saved === 'uz') return saved;
  } catch { /* localStorage недоступен */ }
  const nav = (typeof navigator !== 'undefined' ? navigator.language : 'ru').slice(0, 2);
  return nav === 'uz' || nav === 'en' ? nav : 'ru';
}

export type Key = keyof Dict;
interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: Key, params?: Record<string, string | number>) => string;
  money: (n: number) => string;
  country: (iso: string, fallback?: string) => string;
  unit: (code: string | null | undefined) => string;
  errText: (e: unknown) => string;
}
const I18n = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detect);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem('lang', l); } catch { /* ignore */ }
  }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const value = useMemo<Ctx>(() => {
    const dict = DICTS[lang];
    const t: Ctx['t'] = (key, params) =>
      (dict[key] ?? ru[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => String(params?.[k] ?? ''));
    const nf = new Intl.NumberFormat(NUM_LOCALE[lang], { maximumFractionDigits: 2 });
    const errText = (e: unknown) => {
      if (e instanceof ApiError) {
        const key = `err.${e.code}` as Key;
        return key in dict ? t(key, e.params as Record<string, string>) : t('err.unknown');
      }
      return e instanceof TypeError ? t('err.network') : t('err.unknown');
    };
    return {
      lang, setLang, t, errText,
      money: (n) => nf.format(n),
      country: (iso, fallback) => COUNTRY_NAMES[iso]?.[lang === 'ru' ? 0 : lang === 'en' ? 1 : 2] ?? fallback ?? iso,
      unit: (code) => unitName(code, lang),
    };
  }, [lang, setLang]);

  return <I18n.Provider value={value}>{children}</I18n.Provider>;
}

export function useI18n() {
  const v = useContext(I18n);
  if (!v) throw new Error('I18nProvider is missing');
  return v;
}
