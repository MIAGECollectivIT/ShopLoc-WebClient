import { z } from 'zod';

/**
 * Validates vehicle license plates according to French standards:
 * - SIV (Système d'Immatriculation des Véhicules, since 2009): AA-123-AA (excluding letters I, O, U)
 * - FNI (Fichier National des Immatriculations, 1950-2009): 1234 AB 75 (1 to 4 digits, 1 to 3 letters, 2 to 3 digits or 2A/2B)
 */
export const SIV_REGEX = /^[A-HJ-NP-TV-Z]{2}[-\s]?[0-9]{3}[-\s]?[A-HJ-NP-TV-Z]{2}$/i;
export const FNI_REGEX = /^[0-9]{1,4}[-\s]?[A-Z]{1,3}[-\s]?(?:[0-9]{2,3}|2[AB])$/i;

const SIV_CLEAN_REGEX = /^([A-HJ-NP-TV-Z]{2})([0-9]{3})([A-HJ-NP-TV-Z]{2})$/;
const FNI_CLEAN_REGEX = /^([0-9]{1,4})([A-Z]{1,3})([0-9]{2,3}|2[AB])$/;

/**
 * Checks whether a given string is a valid French license plate (SIV or FNI).
 */
export function isValidFrenchLicensePlate(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return SIV_REGEX.test(trimmed) || FNI_REGEX.test(trimmed);
}

/**
 * Normalizes a French license plate into standard display format with hyphens or spaces.
 * - SIV: "AA-123-AA"
 * - FNI: "1234 AB 75"
 */
export function normalizeLicensePlate(value: string | null | undefined): string {
  if (!value) return '';
  const raw = value.trim().toUpperCase();
  const clean = raw.replace(/[-\s]/g, '');

  const sivMatch = clean.match(SIV_CLEAN_REGEX);
  if (sivMatch) {
    return `${sivMatch[1]}-${sivMatch[2]}-${sivMatch[3]}`;
  }

  const fniMatch = clean.match(FNI_CLEAN_REGEX);
  if (fniMatch) {
    return `${fniMatch[1]} ${fniMatch[2]} ${fniMatch[3]}`;
  }

  return raw;
}

/**
 * Official GDPR / RGPD disclosure notice regarding municipal vehicle verification.
 */
export const RGPD_LICENSE_PLATE_NOTICE =
  "Conformément au RGPD, les plaques d'immatriculation renseignées sont collectées uniquement afin d'associer vos véhicules aux avantages de stationnement municipal et commerçant. Ces données feront l'objet d'une vérification ponctuelle par les services municipaux compétents.";

/**
 * Zod schema for validating and normalizing a French license plate string.
 */
export const licensePlateSchema = z
  .string()
  .trim()
  .min(1, "La plaque d'immatriculation est obligatoire")
  .refine(isValidFrenchLicensePlate, {
    message: "Format d'immatriculation invalide (ex: AA-123-AA ou 1234 AB 75)",
  });

/**
 * Form schema for vehicle input.
 */
export const vehicleFormSchema = z.object({
  licensePlate: licensePlateSchema,
});

export type VehicleFormData = z.infer<typeof vehicleFormSchema>;
