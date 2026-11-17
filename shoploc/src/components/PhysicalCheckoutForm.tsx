import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { normalizeAmountInput, physicalSaleFormSchema } from '@/lib/validation/physicalSale';
import { calculateSimulatedPoints } from '@/lib/validation/loyalty';
import { getStoreLoyaltyRate, recordPhysicalSale } from '@/lib/api';
import type { CustomerIdentificationResponse } from '@/types/user';
import type { MerchantLoyaltyRate } from '@/types/loyalty';
import type { PhysicalSaleResponse } from '@/types/sales';
import {
  Coins,
  CreditCard,
  UserCheck,
  QrCode,
  Mail,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Sparkles,
  Store,
  ShieldCheck,
} from 'lucide-react';
import { cn } from 'cn';

export interface PhysicalCheckoutFormProps {
  storeId: number;
  storeName?: string;
  customer: CustomerIdentificationResponse | null;
  onCancel: () => void;
  onSuccess: (receipt: PhysicalSaleResponse) => void;
  className?: string;
}

const AMOUNT_PRESETS = ['5.00', '10.00', '20.00', '50.00'];

/**
 * In-store physical checkout form.
 * Enforces:
 * 1. Prior presence of an identified customer.
 * 2. Positive decimal amount with at most 2 decimal digits.
 * 3. Real-time loyalty points simulation according to store rate.
 * 4. Transaction recording and points attribution via Sales Service.
 */
export function PhysicalCheckoutForm({
  storeId,
  storeName,
  customer,
  onCancel,
  onSuccess,
  className,
}: PhysicalCheckoutFormProps) {
  const [amount, setAmount] = React.useState('');
  const [fieldError, setFieldError] = React.useState<string | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Store loyalty rate state
  const [loyaltyRate, setLoyaltyRate] = React.useState<MerchantLoyaltyRate | null>(null);
  const [isLoadingRate, setIsLoadingRate] = React.useState(true);

  // Load store loyalty rate for live points calculation
  React.useEffect(() => {
    let isMounted = true;
    setIsLoadingRate(true);
    getStoreLoyaltyRate(storeId)
      .then((rate) => {
        if (isMounted) setLoyaltyRate(rate);
      })
      .catch(() => {
        if (isMounted) {
          // Default fallback rate (1 € = 1 pt)
          setLoyaltyRate({
            storeId,
            euroAmount: 1.0,
            pointsReward: 1.0,
          });
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingRate(false);
      });

    return () => {
      isMounted = false;
    };
  }, [storeId]);

  // Compute live simulated points based on amount and store rate
  const parsedAmount = parseFloat(amount || '0');
  const simulatedPoints = React.useMemo(() => {
    if (!loyaltyRate || isNaN(parsedAmount) || parsedAmount <= 0) {
      return 0;
    }
    return calculateSimulatedPoints(loyaltyRate.euroAmount, loyaltyRate.pointsReward, parsedAmount);
  }, [loyaltyRate, parsedAmount]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const normalized = normalizeAmountInput(rawValue);
    setAmount(normalized);
    setFieldError(null);
    setServerError(null);
  };

  const handleApplyPreset = (preset: string) => {
    setAmount(preset);
    setFieldError(null);
    setServerError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldError(null);
    setServerError(null);

    // Rule 1: Impose identified customer presence
    if (!customer || !customer.clientCode) {
      setServerError(
        'Un client identifié est obligatoire pour enregistrer un encaissement physique.'
      );
      return;
    }

    // Rule 2: Validate positive amount with max 2 decimal digits
    const parseResult = physicalSaleFormSchema.safeParse({
      storeId,
      clientCode: customer.clientCode,
      amount,
      customerId: customer.publicId,
    });

    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      setFieldError(issue?.message || 'Montant invalide.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await recordPhysicalSale({
        storeId,
        clientCode: customer.clientCode,
        customerId: customer.publicId,
        amount: parseResult.data.amount,
        currency: 'EUR',
        paymentMethod: 'PHYSICAL_CASH',
      });

      onSuccess(response);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erreur lors de l'enregistrement de l'encaissement.";
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Guard: If no customer is identified, block the form entirely
  if (!customer) {
    return (
      <Card className={cn('w-full max-w-lg border-destructive/30 bg-card shadow-md', className)}>
        <CardHeader className="text-center pb-4">
          <div className="size-12 rounded-full bg-destructive/10 text-destructive mx-auto flex items-center justify-center mb-2">
            <AlertCircle className="size-6" />
          </div>
          <CardTitle className="text-lg font-bold text-destructive">Client non identifié</CardTitle>
          <CardDescription>
            L'encaissement en caisse physique impose la présence préalable d'un client identifié.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center pb-6">
          <Button type="button" variant="outline" onClick={onCancel} className="gap-2">
            <ArrowLeft className="size-4" />
            <span>Retour au scanner client</span>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const customerDisplayName = `${customer.firstName} ${customer.lastNameMasked}`.trim();

  return (
    <Card className={cn('w-full max-w-lg border-border bg-card shadow-lg', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-2 mb-1">
          <Badge
            variant="outline"
            className="gap-1.5 border-primary/30 text-primary bg-primary/5 text-xs py-0.5"
          >
            <CreditCard className="size-3 text-primary" />
            <span>Encaissement Caisse Physique</span>
          </Badge>

          {storeName && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Store className="size-3.5 text-primary" />
              <span className="truncate max-w-[150px]">{storeName}</span>
            </div>
          )}
        </div>

        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <span>Saisie du montant payé</span>
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Saisissez le montant réglé en boutique pour enregistrer la vente et créditer
          automatiquement les points fidélité.
        </CardDescription>

        {/* Identified Customer Summary Banner */}
        <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <UserCheck className="size-4.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span>{customerDisplayName}</span>
                <ShieldCheck className="size-3 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                <span className="font-mono text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1">
                  <QrCode className="size-3" />
                  {customer.clientCode}
                </span>
                {customer.emailMasked && (
                  <span className="hidden sm:inline flex items-center gap-1">
                    <Mail className="size-3" />
                    {customer.emailMasked}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Badge
            variant="outline"
            className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/5 text-[10px]"
          >
            Client vérifié
          </Badge>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 pb-4">
          {/* Server Error Alert */}
          {serverError && (
            <div
              className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2"
              role="alert"
            >
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Quick Amount Presets */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Montants rapides :</span>
              {amount && (
                <button
                  type="button"
                  onClick={() => setAmount('')}
                  className="text-[11px] text-primary hover:underline"
                >
                  Effacer
                </button>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {AMOUNT_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyPreset(preset)}
                  disabled={isSubmitting}
                  className={cn(
                    'h-8 text-xs font-medium',
                    amount === preset && 'border-primary bg-primary/10 text-primary'
                  )}
                >
                  {preset} €
                </Button>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <Label
              htmlFor="checkout-amount"
              className="text-sm font-semibold flex items-center justify-between"
            >
              <span>Montant payé (€)</span>
              <span className="text-[11px] font-normal text-muted-foreground">
                Max 2 chiffres après la virgule
              </span>
            </Label>
            <div className="relative flex items-center">
              <Input
                id="checkout-amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={handleAmountChange}
                disabled={isSubmitting}
                autoFocus
                className={cn(
                  'h-12 text-lg font-bold pr-10 tracking-wide',
                  fieldError && 'border-destructive focus-visible:ring-destructive'
                )}
              />
              <span className="absolute right-3.5 text-base font-bold text-muted-foreground pointer-events-none">
                €
              </span>
            </div>
            {fieldError && <p className="text-xs text-destructive font-medium">{fieldError}</p>}
          </div>

          {/* Live Points Simulation Card */}
          <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-amber-500" />
                <span>Points de fidélité accordés</span>
              </span>
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 text-xs font-bold">
                <Coins className="size-3 text-amber-500" />
                <span>+{simulatedPoints.toFixed(1)} pts</span>
              </Badge>
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/60 pt-2">
              <span>Barème boutique appliqué :</span>
              <span className="font-mono font-medium text-foreground">
                {isLoadingRate
                  ? 'Chargement du barème...'
                  : loyaltyRate
                    ? `${loyaltyRate.euroAmount.toFixed(2)} € = ${loyaltyRate.pointsReward.toFixed(1)} pt`
                    : '1.00 € = 1.0 pt'}
              </span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row items-center gap-2 pt-2 pb-6 border-t border-border bg-muted/10">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-full sm:w-auto text-xs gap-1.5"
          >
            <ArrowLeft className="size-3.5" />
            <span>Annuler</span>
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting || !amount || parseFloat(amount) <= 0}
            className="w-full sm:flex-1 h-10 gap-2 font-semibold bg-primary text-primary-foreground shadow-xs"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Validation en cours...</span>
              </>
            ) : (
              <>
                <CreditCard className="size-4" />
                <span>Valider l'encaissement ({amount ? `${amount} €` : '0 €'})</span>
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
