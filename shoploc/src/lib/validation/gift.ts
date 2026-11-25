import { z } from 'zod';

export const giftSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Le nom de l'article cadeau est obligatoire")
    .max(120, 'Le nom ne doit pas dépasser 120 caractères'),
  description: z
    .string()
    .trim()
    .max(1000, 'La description ne doit pas dépasser 1000 caractères')
    .optional()
    .or(z.literal('')),
  pointsCost: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val))
    .pipe(
      z
        .number()
        .int('Le coût en points doit être un nombre entier')
        .min(1, "Le coût en points doit être d'au moins 1 point")
    ),
  stock: z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => {
      if (val === undefined || val === '') return 0;
      return typeof val === 'string' ? parseInt(val, 10) : val;
    })
    .pipe(
      z
        .number()
        .int('Le stock doit être un nombre entier')
        .min(0, 'Le stock ne peut pas être négatif')
    ),
  imageUrl: z
    .string()
    .trim()
    .regex(/^(https?:\/\/.*)?$/, "L'URL de l'image doit être une URL http(s) valide")
    .optional()
    .or(z.literal('')),
  vfpExclusive: z.boolean().default(false),
});

export type GiftFormValues = z.infer<typeof giftSchema>;
