import { z } from 'zod';
import { RFC_5322_EMAIL_REGEX } from './register';

export const loginZodSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "L'adresse email est obligatoire")
    .regex(RFC_5322_EMAIL_REGEX, "Format d'adresse email invalide (ex: nom@domaine.fr)"),
  password: z.string().min(1, 'Le mot de passe est obligatoire'),
});

export const loginValidationSchema = loginZodSchema;
export type LoginFormData = z.infer<typeof loginZodSchema>;
