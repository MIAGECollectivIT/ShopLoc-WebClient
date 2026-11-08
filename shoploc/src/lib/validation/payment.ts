import { z } from 'zod';

const parseNumberInput = (val: unknown): number => {
  if (typeof val === 'string') {
    return parseFloat(val.trim().replace(',', '.'));
  }
  return typeof val === 'number' ? val : NaN;
};

export const paymentFormSchema = z.object({
  amount: z
    .union([z.number(), z.string()])
    .transform(parseNumberInput)
    .pipe(
      z
        .number({ message: 'Montant invalide' })
        .positive('Le montant doit être strictement supérieur à 0 €')
        .max(10000, 'Le montant ne peut pas dépasser 10 000 €')
    ),
  reference: z
    .string()
    .trim()
    .min(3, 'La référence doit contenir au moins 3 caractères')
    .max(128, 'La référence est trop longue'),
  cardHolder: z.string().trim().min(2, 'Le nom du titulaire est requis'),
  cardNumber: z
    .string()
    .transform((v) => v.replace(/\s+/g, ''))
    .pipe(z.string().regex(/^\d{16}$/, 'Le numéro de carte doit comporter 16 chiffres')),
  expiryDate: z
    .string()
    .trim()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Format MM/AA requis'),
  cvc: z
    .string()
    .trim()
    .regex(/^\d{3,4}$/, 'Code CVC à 3 ou 4 chiffres requis'),
});

export type PaymentFormValues = z.infer<typeof paymentFormSchema>;
