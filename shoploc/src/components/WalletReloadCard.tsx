import * as React from 'react';
import { reloadWallet } from '@/lib/api';
import type { Wallet } from '@/types/wallet';
import type { AuthUser } from '@/types/user';
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
import { Separator } from '@/components/ui/separator';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

const PRESET_AMOUNTS = [10, 20, 50, 100];
const MIN_RELOAD_AMOUNT = 5.0;
const MAX_RELOAD_AMOUNT = 100.0;

interface WalletReloadCardProps {
  user: AuthUser | null;
  token: string | null;
  weeklyReloadRemaining?: number | null;
  onReloadSuccess: (updatedWallet: Wallet) => Promise<void> | void;
}

function getAmountValidationMessage(
  rawInput: string,
  parsedAmount: number,
  weeklyReloadRemaining?: number | null
): string | null {
  if (!rawInput.trim()) {
    return 'Veuillez saisir un montant.';
  }
  if (Number.isNaN(parsedAmount)) {
    return 'Veuillez saisir un montant numérique valide.';
  }
  if (parsedAmount < MIN_RELOAD_AMOUNT) {
    return `Le montant minimum de rechargement est de ${MIN_RELOAD_AMOUNT.toFixed(2)} €.`;
  }
  if (parsedAmount > MAX_RELOAD_AMOUNT) {
    return `Le montant maximum de rechargement par opération est de ${MAX_RELOAD_AMOUNT.toFixed(2)} €.`;
  }
  if (
    weeklyReloadRemaining !== undefined &&
    weeklyReloadRemaining !== null &&
    parsedAmount > weeklyReloadRemaining
  ) {
    return `Plafond 7 jours glissants dépassé : il vous reste ${weeklyReloadRemaining.toFixed(2)} € disponibles sur 250,00 €.`;
  }
  return null;
}

export function WalletReloadCard({
  user,
  token,
  weeklyReloadRemaining,
  onReloadSuccess,
}: WalletReloadCardProps) {
  const [reloadAmountInput, setReloadAmountInput] = React.useState<string>('20.00');
  const [cardHolder, setCardHolder] = React.useState<string>('');
  const [cardNumber, setCardNumber] = React.useState<string>('4111 2222 3333 4444');
  const [expiryDate, setExpiryDate] = React.useState<string>('12/28');
  const [cvc, setCvc] = React.useState<string>('421');
  const [isSubmittingReload, setIsSubmittingReload] = React.useState(false);
  const [reloadSuccessMessage, setReloadSuccessMessage] = React.useState<string | null>(null);
  const [reloadErrorMessage, setReloadErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (user?.firstName || user?.lastName) {
      setCardHolder(`${user.firstName || ''} ${user.lastName || ''}`.trim());
    } else if (user?.email) {
      setCardHolder(user.email.split('@')[0]);
    }
  }, [user]);

  const parsedAmount = parseFloat(reloadAmountInput.replace(',', '.'));
  const isAmountValid =
    !Number.isNaN(parsedAmount) &&
    parsedAmount >= MIN_RELOAD_AMOUNT &&
    parsedAmount <= MAX_RELOAD_AMOUNT;
  const amountValidationMessage = getAmountValidationMessage(
    reloadAmountInput,
    parsedAmount,
    weeklyReloadRemaining
  );

  const handleReload = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!isAmountValid) {
      return;
    }

    setIsSubmittingReload(true);
    setReloadSuccessMessage(null);
    setReloadErrorMessage(null);

    try {
      const updatedWallet = await reloadWallet(parsedAmount, 'tok_visa_4242', token || undefined);
      setReloadSuccessMessage(
        `Votre porte-monnaie a été rechargé de ${parsedAmount.toFixed(2)} € avec succès !`
      );
      await onReloadSuccess(updatedWallet);
    } catch (err: unknown) {
      console.error('Erreur rechargement:', err);
      setReloadErrorMessage(
        err instanceof Error
          ? err.message
          : 'Échec du rechargement. Veuillez vérifier vos coordonnées bancaires.'
      );
    } finally {
      setIsSubmittingReload(false);
    }
  };

  return (
    <Card className="border-border bg-card rounded-2xl shadow-sm overflow-hidden h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <CreditCard className="size-5 text-primary" />
            Recharger mon porte-monnaie en ligne
          </CardTitle>
          <Badge
            variant="outline"
            className="text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
          >
            Norme RG001
          </Badge>
        </div>
        <CardDescription className="text-xs sm:text-sm">
          Créditez immédiatement votre solde par carte bancaire. Montant autorisé : de 5,00 € à
          100,00 €.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleReload} className="flex flex-1 flex-col">
        <CardContent className="space-y-5 pb-6 flex-1">
          {reloadSuccessMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-start gap-3">
              <CheckCircle2 className="size-5 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div className="text-sm">
                <p className="font-semibold">Rechargement réussi !</p>
                <p className="text-xs mt-0.5">{reloadSuccessMessage}</p>
              </div>
            </div>
          )}

          {reloadErrorMessage && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive flex items-start gap-3">
              <AlertTriangle className="size-5 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold">Échec du rechargement</p>
                <p className="text-xs mt-0.5">{reloadErrorMessage}</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Label htmlFor="reload-amount" className="text-xs font-semibold text-foreground">
              1. Choisissez le montant à créditer
            </Label>

            <div className="grid grid-cols-4 gap-2">
              {PRESET_AMOUNTS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={parsedAmount === preset ? 'default' : 'outline'}
                  size="sm"
                  className="font-bold text-xs h-9 cursor-pointer transition-all"
                  onClick={() => {
                    setReloadAmountInput(preset.toFixed(2));
                    setReloadSuccessMessage(null);
                    setReloadErrorMessage(null);
                  }}
                >
                  +{preset} €
                </Button>
              ))}
            </div>

            <div className="relative mt-2">
              <Input
                id="reload-amount"
                type="number"
                step="0.01"
                min={MIN_RELOAD_AMOUNT}
                max={MAX_RELOAD_AMOUNT}
                value={reloadAmountInput}
                onChange={(e) => {
                  setReloadAmountInput(e.target.value);
                  setReloadSuccessMessage(null);
                  setReloadErrorMessage(null);
                }}
                placeholder="Montant (ex: 25.00)"
                className={`text-base font-semibold pr-10 ${
                  amountValidationMessage ? 'border-destructive focus-visible:ring-destructive' : ''
                }`}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground font-bold">
                €
              </div>
            </div>

            {amountValidationMessage ? (
              <p className="text-xs text-destructive flex items-center gap-1.5">
                <AlertCircle className="size-3.5 shrink-0" />
                {amountValidationMessage}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Montant strict : minimum 5,00 € — maximum 100,00 €.
              </p>
            )}
          </div>

          <Separator />

          <div className="space-y-4">
            <Label className="text-xs font-semibold text-foreground">
              2. Coordonnées de la carte bancaire
            </Label>

            <div className="space-y-3">
              <div>
                <Label htmlFor="card-holder" className="text-xs text-muted-foreground">
                  Nom sur la carte
                </Label>
                <Input
                  id="card-holder"
                  type="text"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  placeholder="Jean Dupont"
                  className="mt-1 text-sm"
                  required
                />
              </div>

              <div>
                <Label htmlFor="card-number" className="text-xs text-muted-foreground">
                  Numéro de carte bancaire
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="card-number"
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="4111 2222 3333 4444"
                    className="font-mono text-sm pl-9"
                    required
                  />
                  <CreditCard className="size-4 text-muted-foreground absolute left-3 top-2.5" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="card-exp" className="text-xs text-muted-foreground">
                    Date d&apos;expiration
                  </Label>
                  <Input
                    id="card-exp"
                    type="text"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    placeholder="MM/AA"
                    className="mt-1 font-mono text-sm text-center"
                    maxLength={5}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="card-cvc" className="text-xs text-muted-foreground">
                    Code CVV / CVC
                  </Label>
                  <Input
                    id="card-cvc"
                    type="password"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value)}
                    placeholder="123"
                    className="mt-1 font-mono text-sm text-center"
                    maxLength={4}
                    required
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 pb-6 px-6 border-t border-border/50 bg-muted/15 mt-auto">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 order-2 sm:order-1">
            <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
            Paiement sécurisé via passerelle bancaire
          </div>
          <Button
            type="submit"
            disabled={!isAmountValid || isSubmittingReload}
            className="w-full sm:w-auto font-semibold gap-2 order-1 sm:order-2 cursor-pointer"
          >
            {isSubmittingReload ? (
              <>
                <RefreshCw className="size-4 animate-spin" />
                Autorisation bancaire...
              </>
            ) : (
              <>
                <PlusCircle className="size-4" />
                Recharger {isAmountValid ? `${parsedAmount.toFixed(2)} €` : ''}
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
