import * as Yup from 'yup';

export const STORE_CATEGORIES = [
  'Alimentation & Épicerie',
  'Boulangerie & Pâtisserie',
  'Boucherie & Charcuterie',
  'Restauration & Traiteur',
  'Commerce de détail',
  'Mode & Habillement',
  'Santé, Beauté & Bien-être',
  'Culture, Loisirs & Cadeaux',
  "Artisanat & Métiers d'art",
  'Services & Proximité',
  'Autre',
] as const;

export type StoreCategory = (typeof STORE_CATEGORIES)[number];

export interface CreateStoreFormData {
  name: string;
  category: string;
  address: string;
  url: string;
  rib: string;
  userId: number | '';
}

/**
 * Official letter-to-digit conversion map for French RIB account numbers.
 * A, J = 1 | B, K, S = 2 | C, L, T = 3 | D, M, U = 4 | E, N, V = 5 | F, O, W = 6 | G, P, X = 7 | H, Q, Y = 8 | I, R, Z = 9
 */
const FRENCH_RIB_LETTER_MAP: Record<string, string> = {
  A: '1',
  B: '2',
  C: '3',
  D: '4',
  E: '5',
  F: '6',
  G: '7',
  H: '8',
  I: '9',
  J: '1',
  K: '2',
  L: '3',
  M: '4',
  N: '5',
  O: '6',
  P: '7',
  Q: '8',
  R: '9',
  S: '2',
  T: '3',
  U: '4',
  V: '5',
  W: '6',
  X: '7',
  Y: '8',
  Z: '9',
};

/**
 * Strips whitespace, dashes, and underscores, returning an uppercase string.
 */
export function cleanRibOrIban(value: string): string {
  if (!value) return '';
  return value.replace(/[\s-_]/g, '').toUpperCase();
}

/**
 * Validates a French RIB against the statutory modulo 97 check algorithm.
 * Format: 5 digits (bank) + 5 digits (branch) + 11 alphanumeric characters (account) + 2 digits (key).
 */
export function isValidFrenchRib(value: string): boolean {
  const cleaned = cleanRibOrIban(value);
  if (!/^[0-9]{10}[A-Z0-9]{11}[0-9]{2}$/.test(cleaned)) {
    return false;
  }

  const bankCode = cleaned.slice(0, 5);
  const counterCode = cleaned.slice(5, 10);
  const rawAccountNumber = cleaned.slice(10, 21);
  const rawKey = cleaned.slice(21, 23);

  // Convert account alphanumeric characters according to the French banking standard
  let convertedAccount = '';
  for (const char of rawAccountNumber) {
    if (/[0-9]/.test(char)) {
      convertedAccount += char;
    } else if (FRENCH_RIB_LETTER_MAP[char]) {
      convertedAccount += FRENCH_RIB_LETTER_MAP[char];
    } else {
      return false;
    }
  }

  try {
    const b = BigInt(bankCode);
    const g = BigInt(counterCode);
    const c = BigInt(convertedAccount);
    const key = BigInt(rawKey);

    // French RIB formula: Key = 97 - ((89 * Bank + 15 * Branch + 3 * Account) % 97)
    const remainder = Number((89n * b + 15n * g + 3n * c) % 97n);
    const calculatedKey = remainder === 0 ? 97 : 97 - remainder;

    return BigInt(calculatedKey) === key;
  } catch {
    return false;
  }
}

/**
 * Validates an IBAN using the ISO 7064 MOD 97-10 checksum algorithm.
 */
export function isValidIban(value: string): boolean {
  const cleaned = cleanRibOrIban(value);
  // An IBAN has 2 letters country code, 2 check digits, and 11 to 30 alphanumeric characters
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(cleaned)) {
    return false;
  }

  // Move first 4 characters (country code + check digits) to the end
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);

  // Convert letters to numerical values (A = 10 ... Z = 35)
  let numericString = '';
  for (const char of rearranged) {
    const code = char.charCodeAt(0);
    if (code >= 65 && code <= 90) {
      numericString += (code - 55).toString();
    } else if (code >= 48 && code <= 57) {
      numericString += char;
    } else {
      return false;
    }
  }

  try {
    // ISO 7064 MOD 97-10 check requires remainder of 1
    return BigInt(numericString) % 97n === 1n;
  } catch {
    return false;
  }
}

/**
 * Validates whether the given string is either a valid French RIB or a valid IBAN.
 */
export function isValidRibOrIban(value: string): boolean {
  if (!value) return false;
  const cleaned = cleanRibOrIban(value);

  // If input starts with a 2-letter country code, prioritize IBAN validation
  if (/^[A-Z]{2}/.test(cleaned)) {
    return isValidIban(cleaned);
  }

  // Otherwise validate as a 23-character French RIB
  if (cleaned.length === 23) {
    return isValidFrenchRib(cleaned);
  }

  return false;
}

/**
 * Formats a raw RIB or IBAN string with grouping spaces for enhanced legibility.
 */
export function formatRibOrIban(value: string): string {
  const cleaned = cleanRibOrIban(value);
  if (!cleaned) return '';

  if (/^[A-Z]{2}/.test(cleaned)) {
    // Format IBAN in 4-character blocks
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
  }

  if (cleaned.length === 23) {
    // Format RIB: BBBBB GGGGG CCCCCCCCCCC KK
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5, 10)} ${cleaned.slice(10, 21)} ${cleaned.slice(21, 23)}`.trim();
  }

  return cleaned.replace(/(.{4})/g, '$1 ').trim();
}

/**
 * Yup schema for store creation form validation (SLE-86).
 * User-facing validation messages remain strictly in French.
 */
export const createStoreValidationSchema = Yup.object().shape({
  name: Yup.string()
    .trim()
    .required("Le nom de l'établissement est obligatoire")
    .max(255, 'Le nom ne doit pas dépasser 255 caractères'),
  category: Yup.string()
    .trim()
    .required("La catégorie d'activité est obligatoire")
    .max(255, 'La catégorie ne doit pas dépasser 255 caractères'),
  address: Yup.string()
    .trim()
    .required("L'adresse de l'établissement est obligatoire")
    .max(255, "L'adresse ne doit pas dépasser 255 caractères"),
  url: Yup.string()
    .trim()
    .max(500, "L'URL ne doit pas dépasser 500 caractères")
    .test('is-valid-url', "L'URL doit être valide (ex: https://mon-commerce.fr)", (val) => {
      if (!val || val.trim() === '') return true;
      try {
        const urlToTest =
          val.startsWith('http://') || val.startsWith('https://') ? val : `https://${val}`;
        new URL(urlToTest);
        return true;
      } catch {
        return false;
      }
    }),
  rib: Yup.string()
    .trim()
    .required('Le RIB ou IBAN est obligatoire')
    .test(
      'is-valid-rib-iban',
      'Le format ou la clé algorithmique du RIB/IBAN est invalide (RIB français 23 car. ou IBAN valide)',
      (val) => Boolean(val && isValidRibOrIban(val))
    ),
  userId: Yup.number()
    .typeError('Veuillez sélectionner un compte partenaire')
    .required("L'établissement doit être obligatoirement rattaché à un compte partenaire")
    .positive('Identifiant de partenaire invalide'),
});
