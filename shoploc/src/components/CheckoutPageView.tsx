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
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/lib/auth';
import { getOrderByReference, updateOrderStatus, getCustomerLoyaltyPoints } from '@/lib/api';
import { PaymentSimulatorCard } from '@/components/PaymentSimulatorCard';
import { ROUTES } from '@/config/routes';
import type { OrderResponse } from '@/types/order';
import type { PaymentAuthorizationResponse } from '@/types/payment';
import {
  CreditCard,
  Coins,
  AlertTriangle,
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
  Clock,
} from 'lucide-react';

type SettlementMode = 'EUROS' | 'POINTS' | 'MIXED';

export interface CheckoutPageViewProps {
  initialOrderReference?: string;
}

export function CheckoutPageView({ initialOrderReference }: CheckoutPageViewProps = {}) {
  const [mounted, setMounted] = React.useState(false);
  const { isAuthenticated, user, token, isLoading: authLoading } = useAuth();
  const { clear } = useCart();

  const [orderReference, setOrderReference] = React.useState<string | null>(
    initialOrderReference || null
  );
  const [order, setOrder] = React.useState<OrderResponse | null>(null);
  const [loadingOrder, setLoadingOrder] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [paymentError, setPaymentError] = React.useState<string | null>(null);

  const [loyaltyPoints, setLoyaltyPoints] = React.useState<number>(0);
  const [settlementMode, setSettlementMode] = React.useState<SettlementMode>('EUROS');
  const [pointsToUse, setPointsToUse] = React.useState<number>(0);

  const [isProcessingPayment, setIsProcessingPayment] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    if (initialOrderReference) {
      setOrderReference(initialOrderReference);
      return;
    }

    // Resolve reference from path /checkout/:id or query parameters (?uid= or ?orderRef=)
    const pathname = window.location.pathname;
    const parts = pathname.split('/').filter(Boolean);
    let refFromPath: string | null = null;
    if (parts.length >= 2 && parts[0] === 'checkout') {
      refFromPath = decodeURIComponent(parts[1]);
    }

    const params = new URLSearchParams(window.location.search);
    const ref = refFromPath || params.get('uid') || params.get('orderRef') || params.get('id');
    setOrderReference(ref);
  }, [initialOrderReference]);

  // Fetch order and loyalty balance
  React.useEffect(() => {
    if (!mounted || !orderReference) {
      if (mounted && !orderReference) {
        setLoadingOrder(false);
      }
      return;
    }

    setLoadingOrder(true);
    setLoadError(null);

    getOrderByReference(orderReference, token || undefined)
      .then(async (fetchedOrder) => {
        setOrder(fetchedOrder);

        // If order is already PAID, redirect directly to confirmation screen
        if (fetchedOrder.status === 'PAID') {
          const orderUid = fetchedOrder.uid || fetchedOrder.orderReference;
          window.location.href = ROUTES.orderConfirmation.detail(orderUid);
          return;
        }

        // Fetch loyalty points for current user
        if (user?.id) {
          try {
            const points = await getCustomerLoyaltyPoints(user.id, token || undefined);
            setLoyaltyPoints(points);
          } catch {
            setLoyaltyPoints(0);
          }
        }
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : 'Impossible de récupérer la commande');
      })
      .finally(() => {
        setLoadingOrder(false);
      });
  }, [mounted, orderReference, token, user?.id]);

  // Conversion rate: 100 points = 1.00 € (0.01 € per point)
  const POINTS_PER_EURO = 100;
  const maxPointsWorthInEuros = loyaltyPoints / POINTS_PER_EURO;

  const totalAmount = order?.totalAmount ?? 0;
  const pointsWorth = Math.min(pointsToUse / POINTS_PER_EURO, totalAmount);
  const remainingEurosToPay = Math.max(
    0,
    totalAmount - (settlementMode === 'EUROS' ? 0 : pointsWorth)
  );

  // Handle mode selection
  const handleSelectMode = (mode: SettlementMode) => {
    setSettlementMode(mode);
    if (mode === 'POINTS') {
      const requiredPoints = Math.round(totalAmount * POINTS_PER_EURO);
      setPointsToUse(Math.min(loyaltyPoints, requiredPoints));
    } else if (mode === 'MIXED') {
      setPointsToUse(Math.min(loyaltyPoints, Math.floor((totalAmount / 2) * POINTS_PER_EURO)));
    } else {
      setPointsToUse(0);
    }
  };

  // Finalize payment
  const handlePaymentApproved = async (receipt?: PaymentAuthorizationResponse) => {
    if (!order) return;
    setIsProcessingPayment(true);

    try {
      // 1. Update order status to PAID on backend
      await updateOrderStatus(order.orderReference, 'PAID', token || undefined);

      // 2. Clear validated cart
      clear();

      // 3. Save receipt and settlement breakdown in sessionStorage for the confirmation view
      if (receipt) {
        sessionStorage.setItem(`order_receipt_${order.orderReference}`, JSON.stringify(receipt));
      }
      sessionStorage.setItem(
        `order_settlement_${order.orderReference}`,
        JSON.stringify({
          settlementMode,
          pointsUsed: settlementMode === 'EUROS' ? 0 : pointsToUse,
          pointsDeductionEuro: settlementMode === 'EUROS' ? 0 : pointsWorth,
          eurosPaid: remainingEurosToPay,
        })
      );

      // 4. Redirect to the final order confirmation & recap view
      const orderUid = order.uid || order.orderReference;
      window.location.href = ROUTES.orderConfirmation.detail(orderUid);
    } catch (err: unknown) {
      setPaymentError(
        err instanceof Error ? err.message : 'Erreur lors de la validation finale de la commande'
      );
      setIsProcessingPayment(false);
    }
  };

  if (!mounted || authLoading || loadingOrder) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto py-10 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="h-64 bg-muted rounded-xl" />
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  // Not logged in gate
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="size-16 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="size-8" />
        </div>
        <h2 className="text-xl font-bold">Connexion requise</h2>
        <p className="text-sm text-muted-foreground">
          Vous devez être connecté pour procéder au paiement de votre commande.
        </p>
        <Button
          onClick={() => {
            const checkoutTarget = orderReference
              ? ROUTES.checkout.detail(orderReference)
              : ROUTES.checkout.path;
            window.location.href = `${ROUTES.login.path}?redirect=${encodeURIComponent(checkoutTarget)}`;
          }}
          className="w-full gap-2"
        >
          Se connecter
        </Button>
      </div>
    );
  }

  // Missing order reference or load failure
  if (!orderReference || (!order && loadError)) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="size-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <AlertTriangle className="size-8" />
        </div>
        <h2 className="text-xl font-bold">Commande introuvable</h2>
        <p className="text-sm text-muted-foreground">
          {loadError || 'Aucune référence de commande valide n’a été fournie.'}
        </p>
        <Button
          variant="outline"
          onClick={() => {
            window.location.href = ROUTES.cart.path;
          }}
          className="w-full gap-2"
        >
          <ArrowLeft className="size-4" />
          <span>Retourner au panier</span>
        </Button>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  const canUseFullPoints = maxPointsWorthInEuros >= totalAmount;

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      {/* Top navigation & Order Ref */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">Passage au paiement</h2>
            <Badge variant="outline" className="font-mono text-xs">
              {order.orderReference}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <Clock className="size-3.5 text-primary" />
            <span>Montant verrouillé pendant 30 minutes</span>
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            window.location.href = ROUTES.cart.path;
          }}
          className="text-xs text-muted-foreground hover:text-foreground gap-1.5 self-start sm:self-auto"
        >
          <ArrowLeft className="size-3.5" />
          <span>Modifier mon panier</span>
        </Button>
      </div>

      {paymentError && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2 text-sm">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{paymentError}</span>
        </div>
      )}

      {/* Mode de règlement */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CreditCard className="size-4 text-primary" />
              <span>Choix du mode de règlement</span>
            </CardTitle>
            <div className="text-right">
              <span className="text-xs text-muted-foreground block">Total commande</span>
              <span className="text-lg font-extrabold font-mono text-foreground">
                {totalAmount.toFixed(2)} €
              </span>
            </div>
          </div>
          <CardDescription className="text-xs">
            Sélectionnez votre moyen de paiement pour régler vos achats.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Mode 1 : Carte Bancaire */}
            <button
              type="button"
              onClick={() => handleSelectMode('EUROS')}
              className={`p-3 rounded-xl border text-left transition-all ${
                settlementMode === 'EUROS'
                  ? 'border-primary bg-primary/10 shadow-xs'
                  : 'border-border hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <CreditCard className="size-4 text-primary" />
                <Badge variant="outline" className="text-[10px]">
                  CB
                </Badge>
              </div>
              <div className="font-semibold text-xs text-foreground">Carte Bancaire</div>
              <div className="text-[11px] text-muted-foreground">
                100% ({totalAmount.toFixed(2)} €)
              </div>
            </button>

            {/* Mode 2 : Points Fidélité */}
            <button
              type="button"
              onClick={() => canUseFullPoints && handleSelectMode('POINTS')}
              disabled={!canUseFullPoints}
              className={`p-3 rounded-xl border text-left transition-all ${
                settlementMode === 'POINTS'
                  ? 'border-amber-500 bg-amber-500/10 shadow-xs'
                  : 'border-border hover:bg-muted/50'
              } ${!canUseFullPoints ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center justify-between mb-1">
                <Coins className="size-4 text-amber-500" />
                <Badge variant="outline" className="text-[10px]">
                  {loyaltyPoints} pts
                </Badge>
              </div>
              <div className="font-semibold text-xs text-foreground">Points Fidélité</div>
              <div className="text-[11px] text-muted-foreground">
                {canUseFullPoints ? '100% en points' : 'Solde insuffisant'}
              </div>
            </button>

            {/* Mode 3 : Mixte */}
            <button
              type="button"
              onClick={() => loyaltyPoints > 0 && handleSelectMode('MIXED')}
              disabled={loyaltyPoints <= 0}
              className={`p-3 rounded-xl border text-left transition-all ${
                settlementMode === 'MIXED'
                  ? 'border-indigo-500 bg-indigo-500/10 shadow-xs'
                  : 'border-border hover:bg-muted/50'
              } ${loyaltyPoints <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs">🪙💳</span>
                <Badge variant="outline" className="text-[10px]">
                  MIXTE
                </Badge>
              </div>
              <div className="font-semibold text-xs text-foreground">Mixte (CB + Pts)</div>
              <div className="text-[11px] text-muted-foreground">Déduire une partie</div>
            </button>
          </div>

          {/* Slider for mixed mode */}
          {settlementMode === 'MIXED' && loyaltyPoints > 0 && (
            <div className="p-3.5 bg-muted/40 rounded-xl space-y-2 border border-border/60">
              <div className="flex justify-between items-center text-xs">
                <Label htmlFor="points-slider" className="font-medium">
                  Points à utiliser :{' '}
                  <span className="font-mono font-bold text-primary">{pointsToUse}</span> pts (
                  {pointsWorth.toFixed(2)} €)
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  Disponibles : {loyaltyPoints} pts
                </span>
              </div>
              <input
                id="points-slider"
                type="range"
                min="0"
                max={Math.min(loyaltyPoints, Math.round(totalAmount * POINTS_PER_EURO))}
                step="10"
                value={pointsToUse}
                onChange={(e) => setPointsToUse(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
            </div>
          )}

          {/* Breakdown summary */}
          <div className="p-3 bg-muted/50 rounded-xl text-xs space-y-1.5 border border-border/50">
            <div className="flex justify-between text-muted-foreground">
              <span>Montant commande</span>
              <span className="font-mono">{totalAmount.toFixed(2)} €</span>
            </div>
            {settlementMode !== 'EUROS' && pointsWorth > 0 && (
              <div className="flex justify-between text-amber-600 dark:text-amber-400 font-medium">
                <span>Déduction fidélité ({pointsToUse} pts)</span>
                <span className="font-mono">-{pointsWorth.toFixed(2)} €</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm text-foreground pt-1.5 border-t border-border">
              <span>Reste à payer</span>
              <span className="font-mono text-primary">{remainingEurosToPay.toFixed(2)} €</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exécution du paiement */}
      {remainingEurosToPay > 0 ? (
        <PaymentSimulatorCard
          hidePresets={true}
          hideReceipt={true}
          hideReference={true}
          initialAmount={remainingEurosToPay.toFixed(2)}
          initialReference={order.uid || order.orderReference}
          onPaymentSuccess={handlePaymentApproved}
        />
      ) : (
        <Card className="border-emerald-500/40 bg-emerald-500/5 shadow-xs">
          <CardHeader className="pb-3 text-center">
            <div className="size-12 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center mx-auto mb-1">
              <Coins className="size-6" />
            </div>
            <CardTitle className="text-base font-bold">
              Règlement intégral en points de fidélité
            </CardTitle>
            <CardDescription className="text-xs">
              Votre commande de {totalAmount.toFixed(2)} € sera intégralement réglée avec vos{' '}
              {pointsToUse} points de fidélité.
            </CardDescription>
          </CardHeader>
          <CardFooter className="pt-2">
            <Button
              size="lg"
              onClick={() => handlePaymentApproved()}
              disabled={isProcessingPayment}
              className="w-full gap-2 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isProcessingPayment ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  Validation du règlement...
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4" />
                  Confirmer le règlement ({pointsToUse} pts)
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
