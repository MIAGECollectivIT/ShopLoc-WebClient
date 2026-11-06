import { z } from 'zod';

/**
 * Schéma de validation Zod pour le barème de fidélité commerçant.
 * Règles :
 * - Montant en euros : strictement positif (> 0), 2 décimales au maximum.
 * - Nombre de points : entier supérieur ou égal à 1.
 */
export const loyaltyRateSchema = z.object({
  euroAmount: z
    .union([z.number(), z.string()])
    .transform((val) => {
      if (typeof val === 'string') {
        const cleaned = val.trim().replace(',', '.');
        return parseFloat(cleaned);
      }
      return val;
    })
    .pipe(
      z
        .number()
        .positive('Le montant en euros doit être strictement supérieur à 0')
        .max(1000, 'Le montant en euros ne peut pas dépasser 1 000 € par tranche')
        .refine(
          (val) => {
            const strVal = val.toString();
            const decimalPart = strVal.split('.')[1];
            return !decimalPart || decimalPart.length <= 2;
          },
          { message: 'Le montant en euros ne doit pas comporter plus de 2 décimales (ex: 2.50)' }
        )
    ),
  pointsReward: z
    .union([z.number(), z.string()])
    .transform((val) => {
      if (typeof val === 'string') {
        return parseInt(val.trim(), 10);
      }
      return val;
    })
    .pipe(
      z
        .number()
        .int('Le nombre de points doit être un nombre entier')
        .min(1, 'Le nombre de points doit être au minimum de 1 point')
        .max(10000, 'Le nombre de points ne peut pas dépasser 10 000 points')
    ),
});

export type LoyaltyRateFormValues = z.infer<typeof loyaltyRateSchema>;

/**
 * Calcule le nombre de points attribués pour un montant d'achat donné selon le barème configuré.
 * Règle métier : floor(montant d'achat / euroAmount) * pointsReward
 */
export function calculateSimulatedPoints(
  euroAmount: number,
  pointsReward: number,
  purchaseAmount: number
): number {
  if (!euroAmount || euroAmount <= 0 || !pointsReward || pointsReward <= 0 || purchaseAmount <= 0) {
    return 0;
  }
  const steps = Math.floor(purchaseAmount / euroAmount);
  return steps * pointsReward;
}
