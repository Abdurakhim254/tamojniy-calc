import { BadRequestException } from '@nestjs/common';

export type Lang = 'ru' | 'en' | 'uz';
export const normLang = (l?: string): Lang => (l === 'en' || l === 'uz' ? l : 'ru');

/** Серверные сообщения (предупреждения, примечания, Excel) на трёх языках. */
const M: Record<string, Record<Lang, string>> = {
  // предупреждения
  W_CODE_NOT_FOUND: { ru: 'Код не найден в справочнике ТН ВЭД', en: 'Code not found in the HS code directory', uz: 'Kod TIF TN spravochnikida topilmadi' },
  W_NO_RATE: { ru: 'Для этого кода нет ставок в базе — платежи не рассчитаны. Загрузите ставки.', en: 'No rates in the database for this code, so payments are not calculated. Import the rates.', uz: "Bu kod uchun bazada stavkalar yo'q, to'lovlar hisoblanmadi. Stavkalarni yuklang." },
  W_DEMO: { ru: 'Ставка ДЕМО — не официальная', en: 'This is a DEMO rate, not an official one', uz: 'Stavka DEMO, rasmiy emas' },
  W_NEED_QTY_DUTY: { ru: 'Для специфической ставки укажите количество в единицах измерения тарифа', en: 'This rate is per unit: enter the quantity in the tariff unit', uz: "Bu stavka birlik uchun belgilangan: miqdorni tarif o'lchov birligida kiriting" },
  W_NEED_QTY_EXCISE: { ru: 'Для акциза укажите количество', en: 'Enter the quantity for the excise calculation', uz: "Aksiz uchun miqdorni kiriting" },
  W_GOODS_LIST: { ru: '{countries}: льгота действует только на перечень товаров, а перечень не загружен или код в него не входит', en: '{countries}: the preference applies only to a list of goods; the list is not loaded or the code is not in it', uz: "{countries}: imtiyoz faqat tovarlar ro'yxatiga tegishli; ro'yxat yuklanmagan yoki kod unda yo'q" },
  // примечания
  N_NO_CERT: { ru: 'Нет сертификата происхождения: ставка ×1 + дополнительная пошлина', en: 'No certificate of origin: rate ×1 plus additional duty', uz: "Kelib chiqish sertifikati yo'q: stavka ×1 + qo'shimcha boj" },
  N_ZST: { ru: 'Режим свободной торговли (все три страны в прил. №2): пошлина 0', en: 'Free trade regime (all three countries are in annex 2): duty is 0', uz: "Erkin savdo rejimi (uchala davlat 2-ilovada): boj 0" },
  N_MFN: { ru: 'Режим наибольшего благоприятствования (все три страны в прил. №1): ставка ×1', en: 'Most-favoured-nation regime (all three countries are in annex 1): rate ×1', uz: "Eng ko'p qulaylik rejimi (uchala davlat 1-ilovada): stavka ×1" },
  N_OTHER_BENEFIT: { ru: 'Страны вне списков: временная льгота до {date}, ставка ×{mult}', en: 'Countries outside the lists: temporary benefit until {date}, rate ×{mult}', uz: "Ro'yxatlarda yo'q davlatlar: {date} gacha vaqtinchalik imtiyoz, stavka ×{mult}" },
  N_OTHER_ADD: { ru: 'Страны вне списков: ставка ×{mult} + дополнительная пошлина', en: 'Countries outside the lists: rate ×{mult} plus additional duty', uz: "Ro'yxatlarda yo'q davlatlar: stavka ×{mult} + qo'shimcha boj" },
  N_PREF: { ru: 'Льгота: {name} ({source})', en: 'Preference: {name} ({source})', uz: 'Imtiyoz: {name} ({source})' },
  N_TEMP: { ru: 'Временный ввоз: {months} мес. × {pct}% от платежей', en: 'Temporary import: {months} month(s) × {pct}% of the payments', uz: "Vaqtincha olib kirish: {months} oy × to'lovlarning {pct}%" },
  N_EXPORT: { ru: 'Экспорт: рассчитан только таможенный сбор', en: 'Export: only the customs fee is calculated', uz: "Eksport: faqat bojxona yig'imi hisoblandi" },
  // подписи
  PER: { ru: 'за', en: 'per', uz: 'har' },
  PREF_SUFFIX: { ru: 'льгота', en: 'preference', uz: 'imtiyoz' },
  UNIT: { ru: 'ед.', en: 'unit', uz: 'birlik' },
  // Excel
  X_TITLE: { ru: 'Расчёт таможенных платежей на {date}; 1 {cur} = {rate} сум', en: 'Customs payments as of {date}; 1 {cur} = {rate} UZS', uz: "Bojxona to'lovlari hisob-kitobi, {date}; 1 {cur} = {rate} so'm" },
  X_CODE: { ru: 'Код ТН ВЭД', en: 'HS code', uz: 'TIF TN kodi' },
  X_DESC: { ru: 'Описание', en: 'Description', uz: 'Tavsif' },
  X_VALUE: { ru: 'Таможенная стоимость, сум', en: 'Customs value, UZS', uz: "Bojxona qiymati, so'm" },
  X_RATE: { ru: 'Ставка пошлины', en: 'Duty rate', uz: 'Boj stavkasi' },
  X_DUTY: { ru: 'Пошлина', en: 'Duty', uz: 'Boj' },
  X_EXCISE: { ru: 'Акциз', en: 'Excise', uz: 'Aksiz' },
  X_VAT: { ru: 'НДС', en: 'VAT', uz: 'QQS' },
  X_FEE: { ru: 'Таможенный сбор', en: 'Customs fee', uz: "Bojxona yig'imi" },
  X_UTIL: { ru: 'Утильсбор', en: 'Recycling fee', uz: "Utilizatsiya yig'imi" },
  X_TOTAL: { ru: 'Итого', en: 'Total', uz: 'Jami' },
  X_NOTES: { ru: 'Примечания', en: 'Notes', uz: 'Izohlar' },
  X_SHEET: { ru: 'Расчёт', en: 'Calculation', uz: 'Hisob-kitob' },
};

const UNITS: Record<string, [string, string, string]> = {
  '6': ['м', 'm', 'm'], '55': ['м²', 'm²', 'm²'], '112': ['л', 'l', 'l'], '113': ['м³', 'm³', 'm³'], '114': ['тыс. м³', 'thousand m³', 'ming m³'],
  '162': ['метрический карат', 'metric carat', 'metrik karat'], '163': ['г', 'g', 'g'], '715': ['пар', 'pairs', 'juft'], '796': ['шт', 'pcs', 'dona'],
  '797': ['100 шт', '100 pcs', '100 dona'], '798': ['тыс. шт', 'thousand pcs', 'ming dona'],
  '831': ['л чистого спирта (100%)', 'l of pure alcohol (100%)', 'l sof spirt (100%)'],
};
/** Код ОКЕИ → название единицы; неизвестный код возвращается как №код. */
export const unitName = (lang: Lang, code?: string | null): string =>
  !code ? '' : UNITS[String(Number(code))]?.[lang === 'ru' ? 0 : lang === 'en' ? 1 : 2] ?? `№${code}`;

export const msg = (lang: Lang, key: string, p: Record<string, unknown> = {}): string =>
  (M[key]?.[lang] ?? M[key]?.ru ?? key).replace(/\{(\w+)\}/g, (_, k) => String(p[k] ?? ''));

/** Ошибка API: клиент получает { code, params } и переводит сам. */
export const bad = (code: string, params: Record<string, unknown> = {}) => new BadRequestException({ code, params });
