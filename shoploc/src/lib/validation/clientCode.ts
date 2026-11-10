import { z } from 'zod';

/**
 * Zod validation schema for the 7-character customer loyalty code.
 * Rules:
 * - Must be a string.
 * - Automatically trimmed and converted to uppercase.
 * - Must be exactly 7 alphanumeric characters (A-Z, 0-9).
 */
export const clientCodeSchema = z
  .string({
    message: 'Le code client est requis.',
  })
  .trim()
  .transform((val) => val.toUpperCase())
  .pipe(
    z
      .string()
      .length(7, 'Le code client doit comporter exactement 7 caractères.')
      .regex(/^[A-Z0-9]{7}$/, 'Le code client ne doit contenir que des lettres et des chiffres.')
  );

export type ClientCodeInput = z.infer<typeof clientCodeSchema>;

export const manualClientCodeFormSchema = z.object({
  clientCode: clientCodeSchema,
});

export type ManualClientCodeFormValues = z.infer<typeof manualClientCodeFormSchema>;
