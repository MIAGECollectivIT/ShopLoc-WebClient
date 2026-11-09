import { z } from 'zod';

/**
 * Zod validation schema for the merchant loyalty rate.
 * Rules:
 * - Euro amount: strictly positive (> 0), up to 2 decimal places.
 * - Points reward: multiple of 0.5 greater than or equal to 0.5 (supports half-points).
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
        const cleaned = val.trim().replace(',', '.');
        return parseFloat(cleaned);
      }
      return val;
    })
    .pipe(
      z
        .number()
        .min(0.5, 'Le nombre de points doit être au minimum de 0.5 point')
        .max(10000, 'Le nombre de points ne peut pas dépasser 10 000 points')
        .refine(
          (val) => {
            // Must be a multiple of 0.5 (e.g., 0.5, 1, 1.5, 2, 2.5...)
            const doubled = val * 2;
            return Math.abs(doubled - Math.round(doubled)) < 1e-9;
          },
          { message: 'Le nombre de points doit être un multiple de 0.5 (ex: 0.5, 1, 1.5, 2)' }
        )
    ),
});

export type LoyaltyRateFormValues = z.infer<typeof loyaltyRateSchema>;

/**
 * Calculates the number of points awarded for a given purchase amount based on the configured rate.
 * Business rule: proportional calculation supporting half-points (0.5 point steps).
 * Example: 25 € with a rate of 2.00 € = 1 pt yields 12.5 points (not 12).
 */
export function calculateSimulatedPoints(
  euroAmount: number,
  pointsReward: number,
  purchaseAmount: number
): number {
  if (!euroAmount || euroAmount <= 0 || !pointsReward || pointsReward <= 0 || purchaseAmount <= 0) {
    return 0;
  }
  const rawPoints = (purchaseAmount / euroAmount) * pointsReward;
  // Support half-points (rounded down to the nearest half-point)
  const halfPoints = Math.floor(rawPoints * 2) / 2;
  return halfPoints;
}
