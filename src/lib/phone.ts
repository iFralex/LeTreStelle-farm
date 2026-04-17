/**
 * Strips spaces and leading + then, if 10 digits, prepends the Italian country
 * code (39) so all stored numbers are in the form 39XXXXXXXXXX.
 */
export function normalizePhone(raw: string): string {
  const stripped = raw.replace(/\s/g, '').replace(/^\+/, '')
  return stripped.length === 10 ? '39' + stripped : stripped
}

/** Accepts a raw input and returns true if the normalized form is a plausible number. */
export function isValidPhone(raw: string): boolean {
  return /^\d{11,13}$/.test(normalizePhone(raw))
}
