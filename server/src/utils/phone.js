/**
 * Normalize any phone-number-ish input to canonical E.164 form (+233244000000).
 *
 * Accepted inputs:
 *   "0244000000"       → "+233244000000"   (Ghana local with leading zero)
 *   "244000000"        → "+233244000000"   (9-digit Ghana local without zero)
 *   "233244000000"     → "+233244000000"   (international, no +)
 *   "+233 24 400 0000" → "+233244000000"   (international with formatting)
 *   "00233244000000"   → "+233244000000"   (00 international prefix)
 *
 * If the input doesn't match any known pattern it's returned untouched so
 * upstream validators can flag it cleanly.
 */
export function normalizePhone(input, { defaultCountry = '233' } = {}) {
  if (input === undefined || input === null) return input;
  const raw = String(input).trim();
  if (!raw) return raw;

  const hadPlus = raw.startsWith('+');
  const digits = raw.replace(/[^\d]/g, '');

  if (hadPlus) {
    return '+' + digits;
  }
  if (digits.startsWith('00')) {
    return '+' + digits.slice(2);
  }
  if (digits.length === 10 && digits.startsWith('0')) {
    return '+' + defaultCountry + digits.slice(1);
  }
  if (digits.length === 9) {
    return '+' + defaultCountry + digits;
  }
  if (digits.startsWith(defaultCountry) && digits.length >= 11) {
    return '+' + digits;
  }
  if (digits.length >= 11) {
    return '+' + digits;
  }
  return raw; // let the validator fail downstream
}

/** True if the value looks like an email (contains '@'). */
export function looksLikeEmail(v) {
  return typeof v === 'string' && v.includes('@');
}
