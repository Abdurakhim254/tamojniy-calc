// Источник: Постановление МИВТ/МИД/ГТК РУз от 22.06.2020 (рег. №3267 от 30.06.2020), приложения №1 и №2.
export const MFN: [string, string][] = [
  ['AT', 'Австрия'], ['AF', 'Афганистан'], ['BD', 'Бангладеш'], ['BE', 'Бельгия'], ['BG', 'Болгария'],
  ['BR', 'Бразилия'], ['GB', 'Великобритания'], ['HU', 'Венгрия'], ['VN', 'Вьетнам'], ['DE', 'Германия'],
  ['GR', 'Греция'], ['DK', 'Дания'], ['EG', 'Египет'], ['IL', 'Израиль'], ['IN', 'Индия'],
  ['ID', 'Индонезия'], ['IE', 'Ирландия'], ['ES', 'Испания'], ['IT', 'Италия'], ['JO', 'Иордания'],
  ['CY', 'Кипр'], ['KR', 'Республика Корея'], ['CN', 'Китай'], ['LV', 'Латвия'], ['LT', 'Литва'],
  ['MT', 'Мальта'], ['LU', 'Люксембург'], ['NL', 'Нидерланды'], ['PT', 'Португалия'], ['PK', 'Пакистан'],
  ['PL', 'Польша'], ['SI', 'Словения'], ['RO', 'Румыния'], ['SK', 'Словакия'], ['SG', 'Сингапур'],
  ['US', 'США'], ['TR', 'Турция'], ['FI', 'Финляндия'], ['FR', 'Франция'], ['HR', 'Хорватия'],
  ['CZ', 'Чехия'], ['SE', 'Швеция'], ['CH', 'Швейцария'], ['EE', 'Эстония'], ['JP', 'Япония'],
  ['SA', 'Саудовская Аравия'], ['MY', 'Малайзия'],
];
export const ZST: [string, string][] = [
  ['BY', 'Беларусь'], ['GE', 'Грузия'], ['KZ', 'Казахстан'], ['KG', 'Кыргызстан'], ['MD', 'Молдова'],
  ['RU', 'Россия'], ['TM', 'Туркменистан'], ['UA', 'Украина'], ['TJ', 'Таджикистан'], ['AZ', 'Азербайджан'],
];
// Льгота действует только на перечень товаров (перечни в проект не входят — заполняются через country_goods)
export const GOODS_LIST_ONLY = ['TM', 'SG'];

// УП-145 от 31.05.2022, приложение №1 — нулевые ставки с 01.05.2022 до 01.01.2023.
const UP145 = (name: string, nameEn: string, nameUz: string, prefixes: string[], exceptPrefixes: string[] = []) => ({
  name, nameEn, nameUz, prefixes, exceptPrefixes, dutyPercent: 0,
  validFrom: '2022-05-01', validTo: '2023-01-01', source: 'UP-145, 31.05.2022, №1',
});
export const PREFERENCES = [
  UP145('Пищевые субпродукты', 'Edible offal', "Oziq-ovqat subproduktlari", ['0206']),
  UP145('Рыба', 'Fish', "Baliq", ['0301', '0302', '0303']),
  UP145('Филе рыбное', 'Fish fillets', "Baliq filesi", ['0304']),
  UP145('Рыба сушёная, солёная', 'Dried or salted fish', "Quritilgan, tuzlangan baliq", ['0305']),
  UP145('Молоко и сливки сгущённые', 'Condensed milk and cream', "Quyultirilgan sut va qaymoq", ['0402']),
  UP145('Сливочное масло, молочные пасты', 'Butter and milk spreads', 'Sariyog\' va sut pastalari', ['0405']),
  UP145('Яйца птиц', 'Bird eggs', "Qush tuxumlari", ['0407']),
  UP145('Бананы', 'Bananas', "Banan", ['0803']),
  UP145('Цитрусовые (кроме лимона)', 'Citrus fruit (except lemons)', "Sitrus mevalar (limondan tashqari)", ['0805'], ['0805501000']),
  UP145('Кофе', 'Coffee', "Kofe", ['0901']),
  UP145('Чай в первичных упаковках до 3 кг (одноразовая)', 'Tea in packs up to 3 kg (single-use)', "3 kg gacha qadoqdagi choy (bir martalik)", ['0902100001', '0902300001']),
  UP145('Прочий чай в упаковках до 3 кг', 'Other tea in packs up to 3 kg', "3 kg gacha qadoqdagi boshqa choy", ['0902100009', '0902300009']),
  UP145('Масло соевое', 'Soybean oil', "Soya moyi", ['1507']),
  UP145('Масло арахисовое', 'Groundnut oil', 'Yer yong\'oq moyi', ['1508']),
  UP145('Масло пальмовое', 'Palm oil', "Palma moyi", ['1511']),
  UP145('Масло рапсовое, горчичное', 'Rapeseed and mustard oil', "Raps va gorchitsa moyi", ['1514']),
  UP145('Гидрогенизированные жиры и масла', 'Hydrogenated fats and oils', 'Gidrogenlangan yog\' va moylar', ['1516']),
  UP145('Маргарин', 'Margarine', "Margarin", ['1517']),
  UP145('Экстракт солодовый, готовые пищевые продукты', 'Malt extract and prepared foods', "Solod ekstrakti va tayyor oziq-ovqat", ['1901']),
  UP145('Тапиока', 'Tapioca', "Tapioka", ['1903000000']),
  UP145('Готовые продукты из зерна (хлопья)', 'Prepared cereal products (flakes)', "Donli tayyor mahsulotlar (parchalar)", ['1904']),
  UP145('Дрожжи пекарные', "Baker's yeast", "Novvoy xamirturushi", ['2102103100', '2102103900']),
];

// ДЕМО-ставки: только чтобы можно было попробовать интерфейс. НЕ официальные значения!
export const DEMO_RATES = [
  { code: '8471', dutyPercent: 5 },
  { code: '6109', dutyPercent: 20 },
  { code: '0901', dutyPercent: 15 },
  { code: '2203', dutyPercent: 30, excisePercent: 10 },
  { code: '8703', dutyPercent: 30, excisePercent: 5, utilFee: 1000000 },
];
