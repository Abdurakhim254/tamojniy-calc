/** Единицы измерения в справочнике — числовые коды ОКЕИ. Названия: [ru, en, uz]. Неизвестный код показывается как есть. */
const UNITS: Record<string, [string, string, string]> = {
  '6': ['м', 'm', 'm'],
  '55': ['м²', 'm²', 'm²'],
  '112': ['л', 'l', 'l'],
  '113': ['м³', 'm³', 'm³'],
  '114': ['тыс. м³', 'thousand m³', 'ming m³'],
  '162': ['метрический карат', 'metric carat', 'metrik karat'],
  '163': ['г', 'g', 'g'],
  '715': ['пар', 'pairs', 'juft'],
  '796': ['шт', 'pcs', 'dona'],
  '797': ['100 шт', '100 pcs', '100 dona'],
  '798': ['тыс. шт', 'thousand pcs', 'ming dona'],
  '831': ['л чистого спирта (100%)', 'l of pure alcohol (100%)', 'l sof spirt (100%)'],
};
export const unitName = (code: string | null | undefined, lang: 'ru' | 'en' | 'uz'): string => {
  if (!code) return '';
  const hit = UNITS[String(Number(code))];
  return hit ? hit[lang === 'ru' ? 0 : lang === 'en' ? 1 : 2] : `№${code}`;
};
