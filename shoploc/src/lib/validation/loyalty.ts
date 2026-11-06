import { z } from 'zod';

/**
 * Schéma de validation Zod pour le barème de fidélité commerçant.
 * Règles :
 * - Montant en euros : strictement positif (> 0), 2 décimales au maximum.
 * - Nombre de points : multiple de 0.5 supérieur ou égal à 0.5 (gestion des demi-points).
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
            // Doit être un multiple de 0.5 (ex: 0.5, 1, 1.5, 2, 2.5...)
            const doubled = val * 2;
            return Math.abs(doubled - Math.round(doubled)) < 1e-9;
          },
          { message: 'Le nombre de points doit être un multiple de 0.5 (ex: 0.5, 1, 1.5, 2)' }
        )
    ),
});

export type LoyaltyRateFormValues = z.infer<typeof loyaltyRateSchema>;

/**
 * Calcule le nombre de points attribués pour un montant d'achat donné selon le barème configuré.
 * Règle métier : calcul proportionnel avec prise en compte des demi-points (pas de 0.5 point).
 * Ex: 25 € avec un barème de 2.00 € = 1 pt donne 12.5 points (et non 12).
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
  // Prise en compte des demi-points (arrondi au demi-point inférieur)
  const halfPoints = Math.floor(rawPoints * 2) / 2;
  return halfPoints;
}
