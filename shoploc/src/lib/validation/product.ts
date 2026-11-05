import { z } from 'zod';

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export const productSchema = z.object({
  reference: z
    .string()
    .trim()
    .min(1, 'La référence est obligatoire')
    .max(100, 'La référence ne doit pas dépasser 100 caractères')
    .regex(
      /^[A-Za-z0-9_-]+$/,
      'La référence ne doit contenir que des lettres, chiffres, tirets ou underscores'
    ),
  name: z
    .string()
    .trim()
    .min(1, 'Le nom du produit est obligatoire')
    .max(255, 'Le nom ne doit pas dépasser 255 caractères'),
  description: z
    .string()
    .trim()
    .max(1000, 'La description ne doit pas dépasser 1000 caractères')
    .optional()
    .or(z.literal('')),
  price: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val))
    .pipe(
      z.number().min(0, 'Le prix ne peut pas être négatif').max(99999.99, 'Le prix est trop élevé')
    ),
  stockQuantity: z
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
  imageUrl: z.string().trim().url().optional().or(z.literal('')),
});

export type ProductFormValues = z.infer<typeof productSchema>;
