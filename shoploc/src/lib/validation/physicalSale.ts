import { z } from 'zod';

/**
 * Normalizes live amount input string:
 * - Replaces ',' with '.'
 * - Strips any non-digit characters except the single decimal dot
 * - Restricts decimal portion to at most 2 digits
 */
export function normalizeAmountInput(val: string): string {
  if (!val) return '';
  const cleaned = val.replace(/[^0-9.,]/g, '').replace(',', '.');
  const parts = cleaned.split('.');
  if (parts.length === 1) {
    return parts[0];
  }
  const integerPart = parts[0];
  const decimalPart = parts.slice(1).join('').slice(0, 2);
  return `${integerPart}.${decimalPart}`;
}

const parseAmountNumber = (val: unknown): number => {
  if (typeof val === 'string') {
    return parseFloat(normalizeAmountInput(val));
  }
  return typeof val === 'number' ? val : NaN;
};

/**
 * Zod validation schema for physical checkout sales.
 * Acceptance criteria:
 * - Requires identified customer (clientCode)
 * - Amount must be a positive decimal number with at most 2 decimal places
 */
export const physicalSaleFormSchema = z.object({
  storeId: z.number({ message: 'Identifiant du commerce requis' }).positive(),
  clientCode: z
    .string()
    .trim()
    .min(3, 'Le code client est requis (minimum 3 caractères)')
    .max(32, 'Le code client est trop long'),
  amount: z
    .union([z.number(), z.string()])
    .transform(parseAmountNumber)
    .pipe(
      z
        .number({ message: 'Montant invalide' })
        .positive('Le montant doit être strictement supérieur à 0 €')
        .max(10000, 'Le montant ne peut pas dépasser 10 000 €')
        .refine(
          (val) => {
            const strVal = val.toString();
            const decimalPart = strVal.split('.')[1];
            return !decimalPart || decimalPart.length <= 2;
          },
          { message: 'Le montant ne doit pas comporter plus de 2 chiffres après la virgule' }
        )
    ),
  customerId: z.string().optional(),
  currency: z.string().default('EUR'),
  paymentMethod: z.string().default('PHYSICAL'),
});

export type PhysicalSaleFormValues = z.infer<typeof physicalSaleFormSchema>;
