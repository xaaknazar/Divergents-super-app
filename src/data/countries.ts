// Справочник стран для анкеты: код, название по-русски, по-английски и флаг.
//
// Раньше страны вводились руками по одной — люди писали «оаэ», «Эмираты» и
// «UAE», и одно и то же место оказывалось тремя разными строками. Список
// сгенерирован из ISO 3166-1 через Intl.DisplayNames, отсортирован по алфавиту.

export interface Country {
  code: string;
  name: string;
  /** Название по-английски: люди ищут и в латинской раскладке. */
  en: string;
  flag: string;
}

/** Страны, которые чаще всего выбирает наша аудитория — показываем первыми. */
export const POPULAR_COUNTRY_CODES = ["KZ","RU","TR","AE","GE","UZ","KG","TH","EG","CN","US","IT","FR","ES","DE","GB"];

/**
 * Разговорные названия. Официальное имя в справочнике часто не то, которое
 * человек набирает: ОАЭ он ищет как «Эмираты», Великобританию — как «Англию».
 */
const ALIASES: Record<string, string[]> = {
  AE: ['эмираты', 'объединённые арабские эмираты', 'объединенные арабские эмираты', 'дубай', 'абу-даби', 'uae'],
  GB: ['англия', 'британия', 'шотландия', 'уэльс', 'лондон', 'uk'],
  US: ['америка', 'сша', 'штаты', 'usa'],
  KR: ['южная корея', 'корея'],
  KP: ['северная корея', 'кндр'],
  NL: ['голландия', 'нидерланды'],
  CZ: ['чехия', 'чешская республика'],
  CH: ['швейцария'],
  MM: ['бирма'],
  CI: ['кот д ивуар', 'берег слоновой кости'],
  VA: ['ватикан'],
  TL: ['восточный тимор'],
  CD: ['конго', 'заир'],
  CG: ['конго'],
  MK: ['македония'],
  SZ: ['свазиленд'],
  TW: ['тайвань'],
  HK: ['гонконг'],
  MO: ['макао'],
  PS: ['палестина'],
};

export const COUNTRIES: Country[] = [
  { code: 'AU', name: 'Австралия', en: 'Australia', flag: '🇦🇺' },
  { code: 'AT', name: 'Австрия', en: 'Austria', flag: '🇦🇹' },
  { code: 'AZ', name: 'Азербайджан', en: 'Azerbaijan', flag: '🇦🇿' },
  { code: 'AL', name: 'Албания', en: 'Albania', flag: '🇦🇱' },
  { code: 'DZ', name: 'Алжир', en: 'Algeria', flag: '🇩🇿' },
  { code: 'AO', name: 'Ангола', en: 'Angola', flag: '🇦🇴' },
  { code: 'AD', name: 'Андорра', en: 'Andorra', flag: '🇦🇩' },
  { code: 'AG', name: 'Антигуа и Барбуда', en: 'Antigua & Barbuda', flag: '🇦🇬' },
  { code: 'AR', name: 'Аргентина', en: 'Argentina', flag: '🇦🇷' },
  { code: 'AM', name: 'Армения', en: 'Armenia', flag: '🇦🇲' },
  { code: 'AF', name: 'Афганистан', en: 'Afghanistan', flag: '🇦🇫' },
  { code: 'BS', name: 'Багамы', en: 'Bahamas', flag: '🇧🇸' },
  { code: 'BD', name: 'Бангладеш', en: 'Bangladesh', flag: '🇧🇩' },
  { code: 'BB', name: 'Барбадос', en: 'Barbados', flag: '🇧🇧' },
  { code: 'BH', name: 'Бахрейн', en: 'Bahrain', flag: '🇧🇭' },
  { code: 'BY', name: 'Беларусь', en: 'Belarus', flag: '🇧🇾' },
  { code: 'BZ', name: 'Белиз', en: 'Belize', flag: '🇧🇿' },
  { code: 'BE', name: 'Бельгия', en: 'Belgium', flag: '🇧🇪' },
  { code: 'BJ', name: 'Бенин', en: 'Benin', flag: '🇧🇯' },
  { code: 'BG', name: 'Болгария', en: 'Bulgaria', flag: '🇧🇬' },
  { code: 'BO', name: 'Боливия', en: 'Bolivia', flag: '🇧🇴' },
  { code: 'BA', name: 'Босния и Герцеговина', en: 'Bosnia & Herzegovina', flag: '🇧🇦' },
  { code: 'BW', name: 'Ботсвана', en: 'Botswana', flag: '🇧🇼' },
  { code: 'BR', name: 'Бразилия', en: 'Brazil', flag: '🇧🇷' },
  { code: 'BN', name: 'Бруней', en: 'Brunei', flag: '🇧🇳' },
  { code: 'BF', name: 'Буркина-Фасо', en: 'Burkina Faso', flag: '🇧🇫' },
  { code: 'BI', name: 'Бурунди', en: 'Burundi', flag: '🇧🇮' },
  { code: 'BT', name: 'Бутан', en: 'Bhutan', flag: '🇧🇹' },
  { code: 'VU', name: 'Вануату', en: 'Vanuatu', flag: '🇻🇺' },
  { code: 'VA', name: 'Ватикан', en: 'Vatican City', flag: '🇻🇦' },
  { code: 'GB', name: 'Великобритания', en: 'United Kingdom', flag: '🇬🇧' },
  { code: 'HU', name: 'Венгрия', en: 'Hungary', flag: '🇭🇺' },
  { code: 'VE', name: 'Венесуэла', en: 'Venezuela', flag: '🇻🇪' },
  { code: 'TL', name: 'Восточный Тимор', en: 'Timor-Leste', flag: '🇹🇱' },
  { code: 'VN', name: 'Вьетнам', en: 'Vietnam', flag: '🇻🇳' },
  { code: 'GA', name: 'Габон', en: 'Gabon', flag: '🇬🇦' },
  { code: 'HT', name: 'Гаити', en: 'Haiti', flag: '🇭🇹' },
  { code: 'GY', name: 'Гайана', en: 'Guyana', flag: '🇬🇾' },
  { code: 'GM', name: 'Гамбия', en: 'Gambia', flag: '🇬🇲' },
  { code: 'GH', name: 'Гана', en: 'Ghana', flag: '🇬🇭' },
  { code: 'GT', name: 'Гватемала', en: 'Guatemala', flag: '🇬🇹' },
  { code: 'GN', name: 'Гвинея', en: 'Guinea', flag: '🇬🇳' },
  { code: 'GW', name: 'Гвинея-Бисау', en: 'Guinea-Bissau', flag: '🇬🇼' },
  { code: 'DE', name: 'Германия', en: 'Germany', flag: '🇩🇪' },
  { code: 'GI', name: 'Гибралтар', en: 'Gibraltar', flag: '🇬🇮' },
  { code: 'HN', name: 'Гондурас', en: 'Honduras', flag: '🇭🇳' },
  { code: 'HK', name: 'Гонконг (САР)', en: 'Hong Kong SAR China', flag: '🇭🇰' },
  { code: 'GD', name: 'Гренада', en: 'Grenada', flag: '🇬🇩' },
  { code: 'GL', name: 'Гренландия', en: 'Greenland', flag: '🇬🇱' },
  { code: 'GR', name: 'Греция', en: 'Greece', flag: '🇬🇷' },
  { code: 'GE', name: 'Грузия', en: 'Georgia', flag: '🇬🇪' },
  { code: 'DK', name: 'Дания', en: 'Denmark', flag: '🇩🇰' },
  { code: 'DJ', name: 'Джибути', en: 'Djibouti', flag: '🇩🇯' },
  { code: 'DM', name: 'Доминика', en: 'Dominica', flag: '🇩🇲' },
  { code: 'DO', name: 'Доминиканская Республика', en: 'Dominican Republic', flag: '🇩🇴' },
  { code: 'EG', name: 'Египет', en: 'Egypt', flag: '🇪🇬' },
  { code: 'ZM', name: 'Замбия', en: 'Zambia', flag: '🇿🇲' },
  { code: 'ZW', name: 'Зимбабве', en: 'Zimbabwe', flag: '🇿🇼' },
  { code: 'IL', name: 'Израиль', en: 'Israel', flag: '🇮🇱' },
  { code: 'IN', name: 'Индия', en: 'India', flag: '🇮🇳' },
  { code: 'ID', name: 'Индонезия', en: 'Indonesia', flag: '🇮🇩' },
  { code: 'JO', name: 'Иордания', en: 'Jordan', flag: '🇯🇴' },
  { code: 'IQ', name: 'Ирак', en: 'Iraq', flag: '🇮🇶' },
  { code: 'IR', name: 'Иран', en: 'Iran', flag: '🇮🇷' },
  { code: 'IE', name: 'Ирландия', en: 'Ireland', flag: '🇮🇪' },
  { code: 'IS', name: 'Исландия', en: 'Iceland', flag: '🇮🇸' },
  { code: 'ES', name: 'Испания', en: 'Spain', flag: '🇪🇸' },
  { code: 'IT', name: 'Италия', en: 'Italy', flag: '🇮🇹' },
  { code: 'YE', name: 'Йемен', en: 'Yemen', flag: '🇾🇪' },
  { code: 'CV', name: 'Кабо-Верде', en: 'Cape Verde', flag: '🇨🇻' },
  { code: 'KZ', name: 'Казахстан', en: 'Kazakhstan', flag: '🇰🇿' },
  { code: 'KH', name: 'Камбоджа', en: 'Cambodia', flag: '🇰🇭' },
  { code: 'CM', name: 'Камерун', en: 'Cameroon', flag: '🇨🇲' },
  { code: 'CA', name: 'Канада', en: 'Canada', flag: '🇨🇦' },
  { code: 'QA', name: 'Катар', en: 'Qatar', flag: '🇶🇦' },
  { code: 'KE', name: 'Кения', en: 'Kenya', flag: '🇰🇪' },
  { code: 'CY', name: 'Кипр', en: 'Cyprus', flag: '🇨🇾' },
  { code: 'KG', name: 'Киргизия', en: 'Kyrgyzstan', flag: '🇰🇬' },
  { code: 'KI', name: 'Кирибати', en: 'Kiribati', flag: '🇰🇮' },
  { code: 'CN', name: 'Китай', en: 'China', flag: '🇨🇳' },
  { code: 'KP', name: 'КНДР', en: 'North Korea', flag: '🇰🇵' },
  { code: 'CO', name: 'Колумбия', en: 'Colombia', flag: '🇨🇴' },
  { code: 'KM', name: 'Коморы', en: 'Comoros', flag: '🇰🇲' },
  { code: 'CG', name: 'Конго - Браззавиль', en: 'Congo - Brazzaville', flag: '🇨🇬' },
  { code: 'CD', name: 'Конго - Киншаса', en: 'Congo - Kinshasa', flag: '🇨🇩' },
  { code: 'CR', name: 'Коста-Рика', en: 'Costa Rica', flag: '🇨🇷' },
  { code: 'CI', name: 'Кот-д’Ивуар', en: 'Côte d’Ivoire', flag: '🇨🇮' },
  { code: 'CU', name: 'Куба', en: 'Cuba', flag: '🇨🇺' },
  { code: 'KW', name: 'Кувейт', en: 'Kuwait', flag: '🇰🇼' },
  { code: 'LA', name: 'Лаос', en: 'Laos', flag: '🇱🇦' },
  { code: 'LV', name: 'Латвия', en: 'Latvia', flag: '🇱🇻' },
  { code: 'LS', name: 'Лесото', en: 'Lesotho', flag: '🇱🇸' },
  { code: 'LR', name: 'Либерия', en: 'Liberia', flag: '🇱🇷' },
  { code: 'LB', name: 'Ливан', en: 'Lebanon', flag: '🇱🇧' },
  { code: 'LY', name: 'Ливия', en: 'Libya', flag: '🇱🇾' },
  { code: 'LT', name: 'Литва', en: 'Lithuania', flag: '🇱🇹' },
  { code: 'LI', name: 'Лихтенштейн', en: 'Liechtenstein', flag: '🇱🇮' },
  { code: 'LU', name: 'Люксембург', en: 'Luxembourg', flag: '🇱🇺' },
  { code: 'MU', name: 'Маврикий', en: 'Mauritius', flag: '🇲🇺' },
  { code: 'MR', name: 'Мавритания', en: 'Mauritania', flag: '🇲🇷' },
  { code: 'MG', name: 'Мадагаскар', en: 'Madagascar', flag: '🇲🇬' },
  { code: 'MO', name: 'Макао (САР)', en: 'Macao SAR China', flag: '🇲🇴' },
  { code: 'MW', name: 'Малави', en: 'Malawi', flag: '🇲🇼' },
  { code: 'MY', name: 'Малайзия', en: 'Malaysia', flag: '🇲🇾' },
  { code: 'ML', name: 'Мали', en: 'Mali', flag: '🇲🇱' },
  { code: 'MV', name: 'Мальдивы', en: 'Maldives', flag: '🇲🇻' },
  { code: 'MT', name: 'Мальта', en: 'Malta', flag: '🇲🇹' },
  { code: 'MA', name: 'Марокко', en: 'Morocco', flag: '🇲🇦' },
  { code: 'MH', name: 'Маршалловы о-ва', en: 'Marshall Islands', flag: '🇲🇭' },
  { code: 'MX', name: 'Мексика', en: 'Mexico', flag: '🇲🇽' },
  { code: 'MZ', name: 'Мозамбик', en: 'Mozambique', flag: '🇲🇿' },
  { code: 'MD', name: 'Молдова', en: 'Moldova', flag: '🇲🇩' },
  { code: 'MC', name: 'Монако', en: 'Monaco', flag: '🇲🇨' },
  { code: 'MN', name: 'Монголия', en: 'Mongolia', flag: '🇲🇳' },
  { code: 'MM', name: 'Мьянма (Бирма)', en: 'Myanmar (Burma)', flag: '🇲🇲' },
  { code: 'NA', name: 'Намибия', en: 'Namibia', flag: '🇳🇦' },
  { code: 'NR', name: 'Науру', en: 'Nauru', flag: '🇳🇷' },
  { code: 'NP', name: 'Непал', en: 'Nepal', flag: '🇳🇵' },
  { code: 'NE', name: 'Нигер', en: 'Niger', flag: '🇳🇪' },
  { code: 'NG', name: 'Нигерия', en: 'Nigeria', flag: '🇳🇬' },
  { code: 'NL', name: 'Нидерланды', en: 'Netherlands', flag: '🇳🇱' },
  { code: 'NI', name: 'Никарагуа', en: 'Nicaragua', flag: '🇳🇮' },
  { code: 'NZ', name: 'Новая Зеландия', en: 'New Zealand', flag: '🇳🇿' },
  { code: 'NO', name: 'Норвегия', en: 'Norway', flag: '🇳🇴' },
  { code: 'AE', name: 'ОАЭ', en: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'OM', name: 'Оман', en: 'Oman', flag: '🇴🇲' },
  { code: 'PK', name: 'Пакистан', en: 'Pakistan', flag: '🇵🇰' },
  { code: 'PW', name: 'Палау', en: 'Palau', flag: '🇵🇼' },
  { code: 'PS', name: 'Палестинские территории', en: 'Palestinian Territories', flag: '🇵🇸' },
  { code: 'PA', name: 'Панама', en: 'Panama', flag: '🇵🇦' },
  { code: 'PG', name: 'Папуа — Новая Гвинея', en: 'Papua New Guinea', flag: '🇵🇬' },
  { code: 'PY', name: 'Парагвай', en: 'Paraguay', flag: '🇵🇾' },
  { code: 'PE', name: 'Перу', en: 'Peru', flag: '🇵🇪' },
  { code: 'PL', name: 'Польша', en: 'Poland', flag: '🇵🇱' },
  { code: 'PT', name: 'Португалия', en: 'Portugal', flag: '🇵🇹' },
  { code: 'PR', name: 'Пуэрто-Рико', en: 'Puerto Rico', flag: '🇵🇷' },
  { code: 'KR', name: 'Республика Корея', en: 'South Korea', flag: '🇰🇷' },
  { code: 'RU', name: 'Россия', en: 'Russia', flag: '🇷🇺' },
  { code: 'RW', name: 'Руанда', en: 'Rwanda', flag: '🇷🇼' },
  { code: 'RO', name: 'Румыния', en: 'Romania', flag: '🇷🇴' },
  { code: 'SV', name: 'Сальвадор', en: 'El Salvador', flag: '🇸🇻' },
  { code: 'WS', name: 'Самоа', en: 'Samoa', flag: '🇼🇸' },
  { code: 'SM', name: 'Сан-Марино', en: 'San Marino', flag: '🇸🇲' },
  { code: 'ST', name: 'Сан-Томе и Принсипи', en: 'São Tomé & Príncipe', flag: '🇸🇹' },
  { code: 'SA', name: 'Саудовская Аравия', en: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'SC', name: 'Сейшельские о-ва', en: 'Seychelles', flag: '🇸🇨' },
  { code: 'SN', name: 'Сенегал', en: 'Senegal', flag: '🇸🇳' },
  { code: 'VC', name: 'Сент-Винсент и Гренадины', en: 'St. Vincent & Grenadines', flag: '🇻🇨' },
  { code: 'KN', name: 'Сент-Китс и Невис', en: 'St. Kitts & Nevis', flag: '🇰🇳' },
  { code: 'LC', name: 'Сент-Люсия', en: 'St. Lucia', flag: '🇱🇨' },
  { code: 'RS', name: 'Сербия', en: 'Serbia', flag: '🇷🇸' },
  { code: 'SG', name: 'Сингапур', en: 'Singapore', flag: '🇸🇬' },
  { code: 'SY', name: 'Сирия', en: 'Syria', flag: '🇸🇾' },
  { code: 'SK', name: 'Словакия', en: 'Slovakia', flag: '🇸🇰' },
  { code: 'SI', name: 'Словения', en: 'Slovenia', flag: '🇸🇮' },
  { code: 'US', name: 'Соединенные Штаты', en: 'United States', flag: '🇺🇸' },
  { code: 'SB', name: 'Соломоновы о-ва', en: 'Solomon Islands', flag: '🇸🇧' },
  { code: 'SO', name: 'Сомали', en: 'Somalia', flag: '🇸🇴' },
  { code: 'SD', name: 'Судан', en: 'Sudan', flag: '🇸🇩' },
  { code: 'SR', name: 'Суринам', en: 'Suriname', flag: '🇸🇷' },
  { code: 'SL', name: 'Сьерра-Леоне', en: 'Sierra Leone', flag: '🇸🇱' },
  { code: 'TJ', name: 'Таджикистан', en: 'Tajikistan', flag: '🇹🇯' },
  { code: 'TH', name: 'Таиланд', en: 'Thailand', flag: '🇹🇭' },
  { code: 'TW', name: 'Тайвань', en: 'Taiwan', flag: '🇹🇼' },
  { code: 'TZ', name: 'Танзания', en: 'Tanzania', flag: '🇹🇿' },
  { code: 'TG', name: 'Того', en: 'Togo', flag: '🇹🇬' },
  { code: 'TO', name: 'Тонга', en: 'Tonga', flag: '🇹🇴' },
  { code: 'TT', name: 'Тринидад и Тобаго', en: 'Trinidad & Tobago', flag: '🇹🇹' },
  { code: 'TV', name: 'Тувалу', en: 'Tuvalu', flag: '🇹🇻' },
  { code: 'TN', name: 'Тунис', en: 'Tunisia', flag: '🇹🇳' },
  { code: 'TM', name: 'Туркменистан', en: 'Turkmenistan', flag: '🇹🇲' },
  { code: 'TR', name: 'Турция', en: 'Türkiye', flag: '🇹🇷' },
  { code: 'UG', name: 'Уганда', en: 'Uganda', flag: '🇺🇬' },
  { code: 'UZ', name: 'Узбекистан', en: 'Uzbekistan', flag: '🇺🇿' },
  { code: 'UA', name: 'Украина', en: 'Ukraine', flag: '🇺🇦' },
  { code: 'UY', name: 'Уругвай', en: 'Uruguay', flag: '🇺🇾' },
  { code: 'FO', name: 'Фарерские о-ва', en: 'Faroe Islands', flag: '🇫🇴' },
  { code: 'FM', name: 'Федеративные Штаты Микронезии', en: 'Micronesia', flag: '🇫🇲' },
  { code: 'FJ', name: 'Фиджи', en: 'Fiji', flag: '🇫🇯' },
  { code: 'PH', name: 'Филиппины', en: 'Philippines', flag: '🇵🇭' },
  { code: 'FI', name: 'Финляндия', en: 'Finland', flag: '🇫🇮' },
  { code: 'FR', name: 'Франция', en: 'France', flag: '🇫🇷' },
  { code: 'HR', name: 'Хорватия', en: 'Croatia', flag: '🇭🇷' },
  { code: 'CF', name: 'Центрально-Африканская Республика', en: 'Central African Republic', flag: '🇨🇫' },
  { code: 'TD', name: 'Чад', en: 'Chad', flag: '🇹🇩' },
  { code: 'ME', name: 'Черногория', en: 'Montenegro', flag: '🇲🇪' },
  { code: 'CZ', name: 'Чехия', en: 'Czechia', flag: '🇨🇿' },
  { code: 'CL', name: 'Чили', en: 'Chile', flag: '🇨🇱' },
  { code: 'CH', name: 'Швейцария', en: 'Switzerland', flag: '🇨🇭' },
  { code: 'SE', name: 'Швеция', en: 'Sweden', flag: '🇸🇪' },
  { code: 'LK', name: 'Шри-Ланка', en: 'Sri Lanka', flag: '🇱🇰' },
  { code: 'EC', name: 'Эквадор', en: 'Ecuador', flag: '🇪🇨' },
  { code: 'GQ', name: 'Экваториальная Гвинея', en: 'Equatorial Guinea', flag: '🇬🇶' },
  { code: 'ER', name: 'Эритрея', en: 'Eritrea', flag: '🇪🇷' },
  { code: 'SZ', name: 'Эсватини', en: 'Eswatini', flag: '🇸🇿' },
  { code: 'EE', name: 'Эстония', en: 'Estonia', flag: '🇪🇪' },
  { code: 'ET', name: 'Эфиопия', en: 'Ethiopia', flag: '🇪🇹' },
  { code: 'ZA', name: 'Южно-Африканская Республика', en: 'South Africa', flag: '🇿🇦' },
  { code: 'SS', name: 'Южный Судан', en: 'South Sudan', flag: '🇸🇸' },
  { code: 'JM', name: 'Ямайка', en: 'Jamaica', flag: '🇯🇲' },
  { code: 'JP', name: 'Япония', en: 'Japan', flag: '🇯🇵' },
];

const BY_NAME = new Map(COUNTRIES.map((c) => [c.name.toLowerCase(), c]));

/** Флаг по названию — чтобы показать его и у значений, сохранённых раньше. */
export function countryFlag(name: string): string {
  return BY_NAME.get(name.trim().toLowerCase())?.flag ?? '';
}

/** Все строки, по которым можно найти страну. */
function haystack(c: Country): string[] {
  return [c.name.toLowerCase(), c.en.toLowerCase(), c.code.toLowerCase(), ...(ALIASES[c.code] ?? [])];
}

/**
 * Поиск: «каз» → Казахстан, «эмираты» → ОАЭ, «france» → Франция.
 * Пустой запрос отдаёт популярные страны сверху, затем всё остальное.
 */
export function searchCountries(query: string): Country[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    const popular = POPULAR_COUNTRY_CODES
      .map((code) => COUNTRIES.find((c) => c.code === code))
      .filter((c): c is Country => !!c);
    const rest = COUNTRIES.filter((c) => !POPULAR_COUNTRY_CODES.includes(c.code));
    return [...popular, ...rest];
  }
  // Совпадение с начала слова важнее совпадения в середине: «мали» не должно
  // выдавать «Сомали» раньше самого Мали.
  const starts: Country[] = [];
  const contains: Country[] = [];
  for (const c of COUNTRIES) {
    const hay = haystack(c);
    if (hay.some((h) => h.startsWith(q))) starts.push(c);
    else if (hay.some((h) => h.includes(q))) contains.push(c);
  }
  return [...starts, ...contains];
}
