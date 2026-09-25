/** Crockford-style alphabet: no 0/O, 1/I/L ambiguity when read aloud or typed. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const GROUPS = 4;
const GROUP_LEN = 4;
export const LICENSE_PREFIX = "WWD";

function randomChars(count: number, rng: (n: number) => Uint8Array): string {
  const bytes = rng(count);
  let out = "";
  for (let i = 0; i < count; i++) out += ALPHABET[bytes[i]! % ALPHABET.length];
  return out;
}

function defaultRng(n: number): Uint8Array {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return bytes;
}

/** Generates a key like WWD-7K3N-PQ2X-M9RT-4VZC. */
export function generateLicenseKey(rng: (n: number) => Uint8Array = defaultRng): string {
  const groups: string[] = [];
  for (let g = 0; g < GROUPS; g++) groups.push(randomChars(GROUP_LEN, rng));
  return `${LICENSE_PREFIX}-${groups.join("-")}`;
}

const KEY_PATTERN = new RegExp(`^${LICENSE_PREFIX}(?:-[${ALPHABET}]{${GROUP_LEN}}){${GROUPS}}$`);

export function normalizeLicenseKey(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "").replace(/[^A-Z0-9-]/g, "");
}

export function isLicenseKeyFormat(input: string): boolean {
  return KEY_PATTERN.test(normalizeLicenseKey(input));
}
