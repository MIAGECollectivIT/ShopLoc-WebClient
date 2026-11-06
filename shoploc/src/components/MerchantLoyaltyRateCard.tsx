import * as React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { loyaltyRateSchema, calculateSimulatedPoints } from '@/lib/validation/loyalty';
import { getStoreLoyaltyRate, updateStoreLoyaltyRate } from '@/lib/api';
import type { MerchantLoyaltyRate } from '@/types/loyalty';
import {
  Coins,
  Sparkles,
  Calculator,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  TrendingUp,
  Info,
} from 'lucide-react';

interface MerchantLoyaltyRateCardProps {
  storeId: number;
  storeName?: string;
  onRateUpdated?: (rate: MerchantLoyaltyRate) => void;
}

export function MerchantLoyaltyRateCard({
  storeId,
  storeName,
  onRateUpdated,
}: MerchantLoyaltyRateCardProps) {
  // State from server
  const [initialRate, setInitialRate] = React.useState<MerchantLoyaltyRate | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  // Form state
  const [euroAmount, setEuroAmount] = React.useState<string>('1.00');
  const [pointsReward, setPointsReward] = React.useState<string>('1');
  const [errors, setErrors] = React.useState<{ euroAmount?: string; pointsReward?: string }>({});

  // Submission & feedback
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);

  // Live simulator custom test amount
  const [testAmount, setTestAmount] = React.useState<string>('25');

  // Load existing rate
  const fetchRate = React.useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await getStoreLoyaltyRate(storeId);
      setInitialRate(data);
      setEuroAmount(Number(data.euroAmount).toFixed(2));
      setPointsReward(String(data.pointsReward));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors du chargement du barème';
      setLoadError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [storeId]);

  React.useEffect(() => {
    fetchRate();
  }, [fetchRate]);

  // Derived numeric values for simulation
  const numEuro = parseFloat(euroAmount.replace(',', '.')) || 0;
  const numPoints = parseFloat(pointsReward.replace(',', '.')) || 0;
  const numTestAmount = parseFloat(testAmount.replace(',', '.')) || 0;

  // Validation helper
  const validateForm = (): boolean => {
    const result = loyaltyRateSchema.safeParse({
      euroAmount,
      pointsReward,
    });

    if (!result.success) {
      const fieldErrors: { euroAmount?: string; pointsReward?: string } = {};
      for (const issue of result.error.issues) {
        if (issue.path[0] === 'euroAmount' && !fieldErrors.euroAmount) {
          fieldErrors.euroAmount = issue.message;
        }
        if (issue.path[0] === 'pointsReward' && !fieldErrors.pointsReward) {
          fieldErrors.pointsReward = issue.message;
        }
      }
      setErrors(fieldErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setServerError(null);

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const parsedValues = loyaltyRateSchema.parse({ euroAmount, pointsReward });
      const updated = await updateStoreLoyaltyRate(storeId, {
        euroAmount: parsedValues.euroAmount,
        pointsReward: parsedValues.pointsReward,
      });

      setInitialRate(updated);
      setEuroAmount(Number(updated.euroAmount).toFixed(2));
      setPointsReward(String(updated.pointsReward));
      setSuccessMessage('Barème de fidélité enregistré et appliqué avec succès !');
      onRateUpdated?.(updated);

      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'enregistrement du barème";
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset to default rate (1 € = 1 pt)
  const handleResetToDefault = () => {
    setEuroAmount('1.00');
    setPointsReward('1');
    setErrors({});
    setSuccessMessage(null);
    setServerError(null);
  };

  const hasChanges =
    initialRate &&
    (Number(initialRate.euroAmount).toFixed(2) !== Number(numEuro).toFixed(2) ||
      Number(initialRate.pointsReward) !== Number(numPoints));

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardContent className="py-12 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="size-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Chargement du barème de fidélité...</p>
        </CardContent>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="py-8 flex flex-col items-center justify-center space-y-3 text-center">
          <AlertTriangle className="size-8 text-destructive" />
          <p className="text-sm font-medium text-destructive">{loadError}</p>
          <Button variant="outline" size="sm" onClick={fetchRate} className="gap-1.5">
            <RotateCcw className="size-4" /> Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <Coins className="size-5" />
                </div>
                <CardTitle className="text-xl font-bold">Barème de fidélité</CardTitle>
                <Badge variant="secondary" className="gap-1 text-xs font-normal">
                  <Sparkles className="size-3 text-amber-500 fill-amber-500" />
                  Espace Commerçant
                </Badge>
              </div>
              <CardDescription>
                Définissez le taux de conversion euro ➔ points pour récompenser les clients de{' '}
                <strong>{storeName || 'votre boutique'}</strong> lors de leurs achats.
              </CardDescription>
            </div>

            {initialRate && (
              <Badge
                variant="outline"
                className="self-start sm:self-auto py-1 px-2.5 text-xs font-mono"
              >
                Actuel : {Number(initialRate.euroAmount).toFixed(2)} € = {initialRate.pointsReward}{' '}
                pt(s)
              </Badge>
            )}
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {/* Success notification */}
            {successMessage && (
              <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center gap-2.5 text-sm animate-in fade-in duration-200">
                <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Server error notification */}
            {serverError && (
              <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2.5 text-sm animate-in fade-in duration-200">
                <AlertTriangle className="size-5 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Informational banner */}
            <div className="p-3.5 rounded-lg bg-muted/60 border border-border/80 flex items-start gap-2.5 text-xs text-muted-foreground">
              <Info className="size-4 shrink-0 text-primary mt-0.5" />
              <div className="space-y-1">
                <span className="font-medium text-foreground">
                  Comment fonctionne l'attribution des points ?
                </span>
                <p>
                  Pour chaque tranche de <strong>montant en euros</strong> dépensée, votre client
                  reçoit le <strong>nombre de points</strong> correspondant (avec gestion des
                  demi-points). Par exemple, avec 2,00 € = 1 pt, un achat de 25 € donne droit à 12,5
                  points.
                </p>
              </div>
            </div>

            {/* Inputs grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-4 rounded-xl bg-card border border-border">
              {/* Euro amount input */}
              <div className="space-y-2">
                <Label
                  htmlFor="euroAmount"
                  className="text-sm font-semibold flex items-center gap-1.5"
                >
                  <span>Tranche d'achat</span>
                  <span className="text-xs text-muted-foreground font-normal">(en €)</span>
                </Label>
                <div className="relative">
                  <Input
                    id="euroAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="1.00"
                    value={euroAmount}
                    onChange={(e) => {
                      setEuroAmount(e.target.value);
                      if (errors.euroAmount)
                        setErrors((prev) => ({ ...prev, euroAmount: undefined }));
                    }}
                    className={`pr-8 text-base font-medium ${errors.euroAmount ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    disabled={isSubmitting}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">
                    €
                  </span>
                </div>
                {errors.euroAmount ? (
                  <p className="text-xs text-destructive font-medium">{errors.euroAmount}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Ex: 1.00 € (défaut), 2.50 €, 5.00 € (max 2 décimales)
                  </p>
                )}
              </div>

              {/* Points reward input */}
              <div className="space-y-2">
                <Label
                  htmlFor="pointsReward"
                  className="text-sm font-semibold flex items-center gap-1.5"
                >
                  <span>Points attribués</span>
                  <span className="text-xs text-muted-foreground font-normal">(par tranche)</span>
                </Label>
                <div className="relative">
                  <Input
                    id="pointsReward"
                    type="number"
                    step="0.5"
                    min="0.5"
                    placeholder="1"
                    value={pointsReward}
                    onChange={(e) => {
                      setPointsReward(e.target.value);
                      if (errors.pointsReward)
                        setErrors((prev) => ({ ...prev, pointsReward: undefined }));
                    }}
                    className={`pr-14 text-base font-medium ${errors.pointsReward ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    disabled={isSubmitting}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold uppercase">
                    pts
                  </span>
                </div>
                {errors.pointsReward ? (
                  <p className="text-xs text-destructive font-medium">{errors.pointsReward}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Multiple de 0.5 supérieur ou égal à 0.5 pt (ex: 0.5, 1, 1.5, 2, 5)
                  </p>
                )}
              </div>
            </div>

            {/* Live conversion summary badge */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-primary" />
                <span className="text-xs font-medium text-foreground">
                  Règle active configurée :
                </span>
              </div>
              <div className="text-sm font-semibold text-primary">
                {numEuro > 0 && numPoints > 0 ? (
                  <span>
                    Chaque tranche de <strong>{numEuro.toFixed(2)} €</strong> donne{' '}
                    <strong>
                      {numPoints} {numPoints > 1 ? 'points' : 'point'}
                    </strong>
                  </span>
                ) : (
                  <span className="text-muted-foreground font-normal italic">
                    Valeurs incomplètes
                  </span>
                )}
              </div>
            </div>

            {/* Interactive Live Simulator */}
            <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="size-4 text-primary" />
                  <h4 className="text-sm font-semibold">Simulateur de gains en direct</h4>
                </div>
                <span className="text-xs text-muted-foreground">Prévisualisation client</span>
              </div>

              {/* Quick simulation presets */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[10, 25, 50, 100].map((amount) => {
                  const pts = calculateSimulatedPoints(numEuro, numPoints, amount);
                  return (
                    <div
                      key={amount}
                      className="p-2.5 rounded-lg bg-background border border-border text-center space-y-1 shadow-2xs"
                    >
                      <span className="text-xs text-muted-foreground font-medium">
                        {amount} € d'achat
                      </span>
                      <div className="text-base font-bold text-foreground flex items-center justify-center gap-1">
                        <span className="text-primary">{pts}</span>
                        <span className="text-xs font-normal text-muted-foreground">pts</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Custom amount test */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <Label
                  htmlFor="customTestAmount"
                  className="text-xs text-muted-foreground shrink-0"
                >
                  Tester un montant libre :
                </Label>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative w-28">
                    <Input
                      id="customTestAmount"
                      type="number"
                      step="0.5"
                      min="0"
                      value={testAmount}
                      onChange={(e) => setTestAmount(e.target.value)}
                      className="h-8 text-xs pr-6"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      €
                    </span>
                  </div>
                  <span className="text-xs font-medium">
                    ➔ donne{' '}
                    <strong className="text-primary font-bold">
                      {calculateSimulatedPoints(numEuro, numPoints, numTestAmount)} point(s)
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetToDefault}
              disabled={isSubmitting}
              className="gap-1.5 text-xs"
            >
              <RotateCcw className="size-3.5" />
              Rétablir 1 € = 1 pt (Défaut)
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !hasChanges}
              className="gap-2 text-xs font-semibold px-4"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="size-3.5" />
                  Enregistrer les modifications
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
