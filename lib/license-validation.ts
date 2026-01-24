/**
 * Nigerian Pharmacy Licence Numbers — Layered Validation
 *
 * Layer 1: Format sanity (hard validation). Catches obvious junk; never rejects
 *          real licences due to assumed PCN format.
 * Layer 2: Jurisdiction hinting (soft). Warn only; never block.
 *
 * PCN format is not publicly standardized. Validation is format-only;
 * human verification remains required.
 */

/** Format: uppercase alphanumeric, 8–20 chars. Must contain ≥1 letter and ≥1 digit. */
const FORMAT_REGEX = /^[A-Z0-9]{8,20}$/;

const hasLetter = (s: string) => /[A-Z]/.test(s);
const hasNumber = (s: string) => /[0-9]/.test(s);

/** Normalize for validation: trim, uppercase. */
function normalize(raw: string): string {
  return raw.trim().toUpperCase();
}

/** Normalize licence for storage (uppercase, no extra spaces). */
export function normalizeLicense(raw: string): string {
  return normalize(raw);
}

/**
 * Layer 1 — Format sanity validation (hard).
 * Use this to allow or block submission. Do not use format-specific regexes.
 * Rules: uppercase only, alphanumeric only, length 8–20, at least one letter and one digit.
 */
export function isLicenseFormatValid(raw: string): boolean {
  const trimmed = raw.trim();
  if (trimmed.length < 8 || trimmed.length > 20) return false;
  if (trimmed !== trimmed.toUpperCase()) return false;
  const s = normalize(raw);
  if (!FORMAT_REGEX.test(s)) return false;
  return hasLetter(s) && hasNumber(s);
}

/** Hard validation error message for UX. */
export const LICENSE_FORMAT_ERROR =
  'Licence number must be 8–20 characters and contain only letters and numbers.';

/**
 * Known jurisdiction prefixes (expandable). Used for soft hinting only.
 * Never block submission based on this.
 */
export const LICENSE_JURISDICTIONS = [
  'FCT',
  'ABJ',
  'LAG',
  'LOS',
  'OYO',
  'OG',
  'KD',
  'PH',
  'RIV',
  'EN',
  'AN',
  'IM',
  'EB',
  'BN',
  'ED',
  'EK',
  'OS',
  'ON',
] as const;

export type LicenseJurisdictionHint = 'known' | 'unknown';

/**
 * Layer 2 — Jurisdiction pattern hinting (soft).
 * Returns whether the licence starts with a known jurisdiction prefix.
 * Use for confidence hints / soft warnings only. Never block.
 */
export function getLicenseJurisdictionHint(raw: string): LicenseJurisdictionHint {
  const s = normalize(raw);
  const prefix2 = s.slice(0, 2);
  const prefix3 = s.slice(0, 3);
  const known = LICENSE_JURISDICTIONS.some((j) => j === prefix3 || j === prefix2);
  return known ? 'known' : 'unknown';
}

/** Soft warning message when jurisdiction is unknown. */
export const LICENSE_SOFT_WARNING =
  "We'll review this licence during verification.";
