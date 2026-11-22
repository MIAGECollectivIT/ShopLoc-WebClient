import { z } from 'zod';
import { RFC_5322_EMAIL_REGEX } from './register';

export const adminUserUpdateSchema = z.object({
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
  email: z
    .string()
    .trim()
    .min(1, "L'adresse email est obligatoire")
    .max(255, "L'adresse email ne doit pas dépasser 255 caractères")
    .regex(RFC_5322_EMAIL_REGEX, 'Format d’adresse email invalide'),
  role: z.enum(['CLIENT', 'MERCHANT', 'ADMIN']),
});

export type AdminUserUpdateFormValues = z.infer<typeof adminUserUpdateSchema>;
