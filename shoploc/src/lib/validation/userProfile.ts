import { z } from 'zod';

/**
 * Validates that a YYYY-MM-DD birth date string is in the past and the user is at least 18 years old.
 */
function isAtLeast18(dateStr: string): boolean {
  const parsed = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return false;

  const today = new Date();
  if (parsed >= today) return false;

  const minBirthDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  return parsed <= minBirthDate;
}

/**
 * Zod schema for user profile updates (used in both sidebar "Modifier mes informations"
 * and admin user editing modal).
 */
export const userProfileUpdateSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'Le prénom est obligatoire')
    .max(100, 'Le prénom ne doit pas dépasser 100 caractères'),
  lastName: z
    .string()
    .trim()
    .min(1, 'Le nom est obligatoire')
    .max(100, 'Le nom ne doit pas dépasser 100 caractères'),
  pickupLocation: z
    .string()
    .trim()
    .max(150, 'Le point de retrait ne doit pas dépasser 150 caractères')
    .optional()
    .or(z.literal('')),
  birthDate: z
    .string()
    .trim()
    .min(1, 'La date de naissance est obligatoire')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (AAAA-MM-JJ)')
    .refine(isAtLeast18, {
      message: "L'utilisateur doit être âgé d'au moins 18 ans",
    }),
});

export type UserProfileUpdateFormData = z.infer<typeof userProfileUpdateSchema>;
