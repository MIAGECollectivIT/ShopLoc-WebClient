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
import { paymentFormSchema } from '@/lib/validation/payment';
import { authorizePayment } from '@/lib/api';
import type { PaymentAuthorizationResponse } from '@/types/payment';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Receipt,
  RotateCcw,
  Calendar,
} from 'lucide-react';

interface PaymentPreset {
  label: string;
  amount: string;
  referencePrefix: string;
}

const PAYMENT_PRESETS: PaymentPreset[] = [
  { label: 'Achat Click & Collect', amount: '42.50', referencePrefix: 'CMD-CC' },
  { label: 'Stationnement Urbain', amount: '4.50', referencePrefix: 'PARK-SIV' },
  { label: 'Recharge Porte-Monnaie', amount: '25.00', referencePrefix: 'TOPUP-LOC' },
];

function generateReference(prefix: string): string {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${randomSuffix}`;
}

export interface PaymentSimulatorCardProps {
  initialAmount?: string | number;
  initialReference?: string;
  onPaymentSuccess?: (receipt: PaymentAuthorizationResponse) => void;
}

export function PaymentSimulatorCard({
  initialAmount,
  initialReference,
  onPaymentSuccess,
}: PaymentSimulatorCardProps = {}) {
  const [amount, setAmount] = React.useState(
    initialAmount !== undefined ? String(initialAmount) : '42.50'
  );
  const [reference, setReference] = React.useState(initialReference || generateReference('CMD-CC'));
  const [cardHolder, setCardHolder] = React.useState('Jean Dupont');
  const [cardNumber, setCardNumber] = React.useState('4111 2222 3333 4444');
  const [expiryDate, setExpiryDate] = React.useState('12/28');
  const [cvc, setCvc] = React.useState('421');

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [receipt, setReceipt] = React.useState<PaymentAuthorizationResponse | null>(null);

  const applyPreset = (preset: PaymentPreset) => {
    setAmount(preset.amount);
    setReference(generateReference(preset.referencePrefix));
    setFieldErrors({});
    setServerError(null);
  };

  const resetSimulation = () => {
    setReceipt(null);
    setServerError(null);
    setFieldErrors({});
    setReference(generateReference('CMD-CC'));
  };

  const monthInputRef = React.useRef<HTMLInputElement>(null);

  const handleAmountChange = (val: string) => {
    const clean = val.replace(/[^0-9.,]/g, '').replace(',', '.');
    const parts = clean.split('.');
    if (parts.length > 2) return;
    setAmount(clean);
  };

  const handleCardNumberChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, '').slice(0, 16);
    const formatted = digitsOnly.match(/.{1,4}/g)?.join(' ') || digitsOnly;
    setCardNumber(formatted);
  };

  const handleExpiryTextChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, '').slice(0, 4);
    if (digitsOnly.length >= 3) {
      setExpiryDate(`${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`);
    } else {
      setExpiryDate(digitsOnly);
    }
  };

  const handleMonthPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;
    const [year, month] = val.split('-');
    if (year && month) {
      const shortYear = year.slice(-2);
      setExpiryDate(`${month}/${shortYear}`);
    }
  };

  const openMonthPicker = () => {
    const input = monthInputRef.current;
    if (!input) return;
    const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof pickerInput.showPicker === 'function') {
      pickerInput.showPicker();
    } else {
      input.focus();
    }
  };

  const handleCvcChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, '').slice(0, 4);
    setCvc(digitsOnly);
  };

  const handleAuthorizePayment = async (event: React.FormEvent) => {
    event.preventDefault();
    setServerError(null);

    const parsed = paymentFormSchema.safeParse({
      amount,
      reference,
      cardHolder,
      cardNumber,
      expiryDate,
      cvc,
    });

    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] || 'form');
        if (!nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const lastFour = parsed.data.cardNumber.slice(-4);
      const response = await authorizePayment({
        amount: parsed.data.amount,
        currency: 'EUR',
        reference: parsed.data.reference,
        paymentToken: `tok_card_${lastFour}`,
      });
      setReceipt(response);
      onPaymentSuccess?.(response);
    } catch (err: unknown) {
      setServerError(
        err instanceof Error ? err.message : 'Erreur lors de la communication avec la banque'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <CreditCard className="size-5" />
              </div>
              <CardTitle className="text-lg font-bold">Passerelle de Paiement Bancaire</CardTitle>
            </div>
            <Badge variant="secondary" className="gap-1 text-xs">
              <ShieldCheck className="size-3.5 text-emerald-600" />
              Règle RG001
            </Badge>
          </div>
          <CardDescription>
            Simulez une autorisation bancaire pour un achat local, une recharge ou un stationnement.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleAuthorizePayment}>
          <CardContent className="space-y-4 pb-6">
            <div className="flex flex-wrap gap-2">
              {PAYMENT_PRESETS.map((preset) => (
                <Button
                  key={preset.referencePrefix}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(preset)}
                  disabled={isSubmitting}
                  className="text-xs"
                >
                  {preset.label} ({preset.amount} €)
                </Button>
              ))}
            </div>

            {serverError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2 text-sm">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="payment-amount">Montant (€)</Label>
                <Input
                  id="payment-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  disabled={isSubmitting}
                />
                {fieldErrors.amount && (
                  <p className="text-xs text-destructive">{fieldErrors.amount}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="payment-reference">Référence commande</Label>
                  <span className="text-[11px] text-muted-foreground">Auto-générée</span>
                </div>
                <Input
                  id="payment-reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  disabled={isSubmitting}
                  className="font-mono text-xs bg-muted/30"
                />
                {fieldErrors.reference && (
                  <p className="text-xs text-destructive">{fieldErrors.reference}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="card-holder">Titulaire de la carte</Label>
              <Input
                id="card-holder"
                placeholder="ex: Jean Dupont"
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value)}
                disabled={isSubmitting}
                autoComplete="cc-name"
              />
              {fieldErrors.cardHolder && (
                <p className="text-xs text-destructive">{fieldErrors.cardHolder}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="card-number">Numéro de carte (16 chiffres)</Label>
              <Input
                id="card-number"
                placeholder="4111 2222 3333 4444"
                value={cardNumber}
                onChange={(e) => handleCardNumberChange(e.target.value)}
                disabled={isSubmitting}
                maxLength={19}
                inputMode="numeric"
                autoComplete="cc-number"
              />
              {fieldErrors.cardNumber && (
                <p className="text-xs text-destructive">{fieldErrors.cardNumber}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="card-expiry">Expiration (MM/AA)</Label>
                <div className="relative flex items-center">
                  <Input
                    id="card-expiry"
                    placeholder="12/28"
                    value={expiryDate}
                    onChange={(e) => handleExpiryTextChange(e.target.value)}
                    disabled={isSubmitting}
                    maxLength={5}
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    className="pr-10"
                  />
                  <input
                    ref={monthInputRef}
                    type="month"
                    tabIndex={-1}
                    className="sr-only"
                    onChange={handleMonthPickerChange}
                    min={new Date().toISOString().slice(0, 7)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={openMonthPicker}
                    disabled={isSubmitting}
                    className="absolute right-0 h-full px-3 text-muted-foreground hover:text-foreground"
                    title="Choisir via calendrier"
                  >
                    <Calendar className="size-4" />
                  </Button>
                </div>
                {fieldErrors.expiryDate && (
                  <p className="text-xs text-destructive">{fieldErrors.expiryDate}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="card-cvc">CVC</Label>
                <Input
                  id="card-cvc"
                  placeholder="421"
                  value={cvc}
                  onChange={(e) => handleCvcChange(e.target.value)}
                  disabled={isSubmitting}
                  maxLength={4}
                  inputMode="numeric"
                  autoComplete="cc-csc"
                />
                {fieldErrors.cvc && <p className="text-xs text-destructive">{fieldErrors.cvc}</p>}
              </div>
            </div>
          </CardContent>

          <CardFooter className="py-4 px-6 flex justify-end gap-2 border-t border-border bg-muted/10">
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Autorisation en cours...
                </>
              ) : (
                <>
                  <CreditCard className="size-4" />
                  Autoriser le paiement ({amount} €)
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="border-border shadow-xs flex flex-col justify-between">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
              <Receipt className="size-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Reçu d'Autorisation Bancaire</CardTitle>
              <CardDescription>
                Traçabilité temps réel de la décision renvoyée par la passerelle.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col justify-center">
          {receipt ? (
            <div className="space-y-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="size-5" />
                  <span>Paiement Autorisé</span>
                </div>
                <Badge className="bg-emerald-600 text-white font-mono text-xs">
                  {receipt.status}
                </Badge>
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm pt-2 border-t border-border/60">
                <div>
                  <dt className="text-xs text-muted-foreground">Code d'autorisation</dt>
                  <dd className="font-mono font-semibold text-xs break-all">
                    {receipt.authorizationCode}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Identifiant transaction</dt>
                  <dd className="font-mono text-xs break-all">{receipt.transactionId}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Montant validé</dt>
                  <dd className="font-bold text-base">
                    {Number(receipt.amount).toFixed(2)} {receipt.currency}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Référence</dt>
                  <dd className="font-mono font-medium">{receipt.reference}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted-foreground">Horodatage & Règle appliquée</dt>
                  <dd className="font-mono text-xs">
                    {receipt.timestamp} ({receipt.rule})
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm space-y-2">
              <Receipt className="size-8 mx-auto opacity-40" />
              <p>Aucun paiement soumis pour le moment.</p>
              <p className="text-xs">
                Validez le formulaire pour interroger la passerelle bancaire et générer un reçu.
              </p>
            </div>
          )}
        </CardContent>

        {receipt && (
          <CardFooter className="pt-2 justify-end border-t border-border">
            <Button variant="outline" size="sm" onClick={resetSimulation} className="gap-1.5">
              <RotateCcw className="size-3.5" />
              Nouvelle simulation
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
