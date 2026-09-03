// Телефон в анкете — казахстанский формат +7 (7XX) XXX-XX-XX по умолчанию.
// Раньше поле было свободным текстом: человек набирал «7» и уходил дальше, а в
// базу попадал огрызок номера, по которому невозможно позвонить.
//
// Номер с другим кодом страны («+1…», «+998…») тоже допустим: маску для него не
// строим (длину кода страны мы не знаем), а лишь оставляем «+», цифры и лёгкую
// группировку по три. Такой номер считается полным при 8–15 цифрах (E.164).

/** Наибольшая длина международного номера по E.164 — с кодом страны. */
const MAX_INTL_DIGITS = 15;
const MIN_INTL_DIGITS = 8;

/**
 * Международный ли ввод: начинается с «+», и код страны — не 7. Одинокий «+»
 * тоже международный: иначе он исчезал бы, не дав набрать следующую цифру.
 */
export function isInternationalPhone(raw: string): boolean {
  const text = String(raw ?? '').trimStart();
  if (!text.startsWith('+')) return false;
  const d = text.replace(/\D/g, '');
  return d.length === 0 || !d.startsWith('7');
}

/**
 * Десять цифр номера без кода страны (только для +7).
 *
 * Ввод неоднозначен: «777…» — это и начало кода оператора, и код страны с
 * оператором «77…». Поэтому ведущую семёрку срезаем только у полного номера
 * из 11 цифр, а привычную восьмёрку — всегда: как код оператора она не бывает.
 */
export function localPhoneDigits(raw: string): string {
  const text = String(raw ?? '');
  let d = text.replace(/\D/g, '');
  // «+» означает, что первая семёрка — код страны. Это же спасает разбор
  // собственного вывода маски: «+7 (777» содержит четыре семёрки, но номер в нём
  // трёхзначный.
  const hasPlus = text.trimStart().startsWith('+');
  if (hasPlus && d.startsWith('7')) d = d.slice(1);
  else if (d.startsWith('8')) d = d.slice(1);
  else if (d.length === 11 && d.startsWith('7')) d = d.slice(1);
  return d.slice(0, 10);
}

/** Цифры с кодом страны — то, что уходит на сервер как номер. */
export function phoneDigits(raw: string): string {
  if (isInternationalPhone(raw)) return String(raw ?? '').replace(/\D/g, '').slice(0, MAX_INTL_DIGITS);
  const local = localPhoneDigits(raw);
  return local ? `7${local}` : '';
}

/**
 * Цифры → «+7 (777) 123-45-67», по мере набора. Пустая строка остаётся пустой.
 * Международный номер → «+1 415 555 2671»-подобная запись (группы по три).
 */
export function formatPhone(raw: string): string {
  const text = String(raw ?? '');
  if (isInternationalPhone(text)) {
    const d = text.replace(/\D/g, '').slice(0, MAX_INTL_DIGITS);
    return `+${d.replace(/(\d{3})(?=\d)/g, '$1 ')}`;
  }
  // «+7» без скобки — человек только что набрал код страны вручную. Не стираем
  // его: иначе путь «+ → 7 → 7…» был бы невозможен.
  if (/^\+7\s*$/.test(text)) return '+7';
  const d = localPhoneDigits(text);
  if (!d) return '';
  const a = d.slice(0, 3);
  const b = d.slice(3, 6);
  const c = d.slice(6, 8);
  const e = d.slice(8, 10);
  let out = `+7 (${a}`;
  // Скобку закрываем только когда за ней уже есть цифры: иначе Backspace стирал
  // бы её и маска дописывала обратно — курсор стоял бы на месте.
  if (b) out += `) ${b}`;
  if (c) out += `-${c}`;
  if (e) out += `-${e}`;
  return out;
}

/** Полный ли номер: десять цифр после «+7» либо 8–15 цифр с другим кодом страны. */
export function isValidPhone(raw: string): boolean {
  if (isInternationalPhone(raw)) {
    const n = String(raw ?? '').replace(/\D/g, '').length;
    return n >= MIN_INTL_DIGITS && n <= MAX_INTL_DIGITS;
  }
  return localPhoneDigits(raw).length === 10;
}
