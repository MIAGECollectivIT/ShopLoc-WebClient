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
import {
  getOrderByReference,
  updateOrderStatus,
  getCustomerLoyaltyPoints,
  getStoreById,
} from '@/lib/api';
import { PaymentSimulatorCard } from '@/components/PaymentSimulatorCard';
import { ROUTES } from '@/config/routes';
import type { OrderResponse } from '@/types/order';
import type { Store } from '@/types/store';
import type { PaymentAuthorizationResponse } from '@/types/payment';
import {
  CreditCard,
  Coins,
  CheckCircle2,
  Clock,
  MapPin,
  Store as StoreIcon,
  PackageCheck,
  AlertTriangle,
  ArrowLeft,
  Receipt,
  ShieldCheck,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';

type SettlementMode = 'EUROS' | 'POINTS' | 'MIXED';

export function CheckoutPageView() {
  const [mounted, setMounted] = React.useState(false);
  const { isAuthenticated, user, token, isLoading: authLoading } = useAuth();
  const { clear } = useCart();

  const [orderReference, setOrderReference] = React.useState<string | null>(null);
  const [order, setOrder] = React.useState<OrderResponse | null>(null);
  const [loadingOrder, setLoadingOrder] = React.useState(true);
  const [orderError, setOrderError] = React.useState<string | null>(null);

  const [storeAddresses, setStoreAddresses] = React.useState<Record<number, string>>({});
  const [loyaltyPoints, setLoyaltyPoints] = React.useState<number>(0);

  const [settlementMode, setSettlementMode] = React.useState<SettlementMode>('EUROS');
  const [pointsToUse, setPointsToUse] = React.useState<number>(0);

  const [isProcessingPayment, setIsProcessingPayment] = React.useState(false);
  const [paymentSuccess, setPaymentSuccess] = React.useState(false);
  const [paymentReceipt, setPaymentReceipt] = React.useState<PaymentAuthorizationResponse | null>(
    null
  );

  React.useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('orderRef');
    setOrderReference(ref);
  }, []);

  // Fetch order and loyalty balance
  React.useEffect(() => {
    if (!mounted || !orderReference) {
      if (mounted && !orderReference) {
        setLoadingOrder(false);
      }
      return;
    }

    setLoadingOrder(true);
    setOrderError(null);

    getOrderByReference(orderReference, token || undefined)
      .then(async (fetchedOrder) => {
        setOrder(fetchedOrder);

        // Fetch store addresses for Click & Collect pickup
        const addresses: Record<number, string> = {};
        for (const summary of fetchedOrder.storeSummaries) {
          try {
            const store: Store = await getStoreById(summary.storeId);
            if (store.address) {
              addresses[summary.storeId] = store.address;
            }
          } catch {
            addresses[summary.storeId] = 'Adresse communiquée sur le ticket';
          }
        }
        setStoreAddresses(addresses);

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
        setOrderError(err instanceof Error ? err.message : 'Impossible de récupérer la commande');
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

  // Handle points selection
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

  // Finalize payment callback from simulator or full points
  const handlePaymentApproved = async (receipt?: PaymentAuthorizationResponse) => {
    if (!order) return;
    setIsProcessingPayment(true);

    try {
      // 1. Update order status to PAID on backend
      await updateOrderStatus(order.orderReference, 'PAID', token || undefined);

      // 2. Clear validated cart
      clear();

      setPaymentReceipt(receipt || null);
      setPaymentSuccess(true);
    } catch (err: unknown) {
      setOrderError(
        err instanceof Error ? err.message : 'Erreur lors de la validation finale de la commande'
      );
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (!mounted || authLoading || loadingOrder) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-10 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-muted rounded-xl" />
          <div className="h-64 bg-muted rounded-xl" />
        </div>
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
          Vous devez être connecté pour finaliser votre commande Click & Collect.
        </p>
        <Button
          onClick={() => {
            window.location.href = `${ROUTES.login.path}?redirect=${encodeURIComponent(ROUTES.checkout.path + (orderReference ? `?orderRef=${orderReference}` : ''))}`;
          }}
          className="w-full gap-2"
        >
          Se connecter
        </Button>
      </div>
    );
  }

  // Missing order reference or not found
  if (!orderReference || orderError || !order) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="size-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <AlertTriangle className="size-8" />
        </div>
        <h2 className="text-xl font-bold">Commande introuvable</h2>
        <p className="text-sm text-muted-foreground">
          {orderError || 'Aucune référence de commande valide n’a été fournie.'}
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

  // Success view: Order confirmed & receipt
  if (paymentSuccess) {
    return (
      <div className="max-w-2xl mx-auto py-10 space-y-6">
        <Card className="border-emerald-500/40 bg-card shadow-md">
          <CardHeader className="text-center pb-4 border-b border-border bg-emerald-500/5">
            <div className="size-16 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="size-9 stroke-[2.5]" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Commande confirmée et réglée !
            </CardTitle>
            <CardDescription className="text-sm">
              Référence :{' '}
              <span className="font-mono font-bold text-primary">{order.orderReference}</span>
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="p-4 bg-muted/50 rounded-xl space-y-2 text-sm">
              <div className="flex justify-between font-semibold">
                <span>Montant total réglé</span>
                <span className="font-mono text-primary font-bold">
                  {order.totalAmount.toFixed(2)} €
                </span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Statut de la commande</span>
                <Badge variant="outline" className="text-emerald-600 border-emerald-500/30">
                  PAID (Payée)
                </Badge>
              </div>
              {paymentReceipt && (
                <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t border-border">
                  <span>Autorisation bancaire</span>
                  <span className="font-mono">{paymentReceipt.authorizationCode}</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
                <StoreIcon className="size-4 text-primary" />
                <span>Points de retrait Click & Collect de vos commerçants</span>
              </h3>

              <div className="space-y-3">
                {order.storeSummaries.map((store) => (
                  <div
                    key={store.storeId}
                    className="p-4 border border-border rounded-lg bg-card space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{store.storeName}</span>
                      <span className="text-xs font-mono font-bold">
                        {store.subtotal.toFixed(2)} €
                      </span>
                    </div>

                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <MapPin className="size-3.5 text-primary shrink-0 mt-0.5" />
                      <span>{storeAddresses[store.storeId] || 'Retrait en boutique'}</span>
                    </div>

                    <ul className="text-xs space-y-1 pt-1 text-muted-foreground list-disc list-inside">
                      {store.items.map((it) => (
                        <li key={it.id}>
                          {it.quantity}x {it.productName} ({it.totalPrice.toFixed(2)} €)
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl text-xs space-y-1">
              <div className="font-semibold flex items-center gap-1.5 text-primary">
                <Clock className="size-4" />
                <span>Vos commandes sont en cours de préparation</span>
              </div>
              <p className="text-muted-foreground">
                Présentez votre référence de commande{' '}
                <span className="font-mono font-bold text-foreground">{order.orderReference}</span>{' '}
                ou votre code client lors du retrait chez chaque commerçant.
              </p>
            </div>
          </CardContent>

          <CardFooter className="p-6 pt-0 flex justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => {
                window.location.href = ROUTES.home.path;
              }}
              className="gap-2"
            >
              <ShoppingBag className="size-4" />
              <span>Retour à l'accueil</span>
            </Button>
            <Button
              onClick={() => {
                window.print();
              }}
              variant="secondary"
              className="gap-2"
            >
              <Receipt className="size-4" />
              <span>Imprimer mon reçu</span>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <PackageCheck className="size-6 text-primary" />
            <span>Règlement de commande Click & Collect</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Commande n°{' '}
            <span className="font-mono font-bold text-foreground">{order.orderReference}</span> •
            Montant verrouillé pour 30 minutes
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            window.location.href = ROUTES.cart.path;
          }}
          className="gap-2 text-xs"
        >
          <ArrowLeft className="size-3.5" />
          <span>Modifier le panier</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Order details & Payment mode selection */}
        <div className="lg:col-span-7 space-y-6">
          {/* Multi-Store Breakdown Card */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <StoreIcon className="size-4 text-primary" />
                <span>Détail par commerce ({order.storeSummaries.length})</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Vos articles réservés et points de retrait locaux
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 text-xs">
              {order.storeSummaries.map((summary) => (
                <div
                  key={summary.storeId}
                  className="p-3.5 border border-border rounded-xl bg-card/60 space-y-2.5"
                >
                  <div className="flex items-center justify-between font-semibold text-sm">
                    <span>{summary.storeName}</span>
                    <span className="font-mono font-bold text-primary">
                      {summary.subtotal.toFixed(2)} €
                    </span>
                  </div>

                  <div className="flex items-start gap-1.5 text-muted-foreground text-[11px]">
                    <MapPin className="size-3.5 text-primary shrink-0 mt-0.5" />
                    <span>
                      {storeAddresses[summary.storeId] || 'Adresse de retrait du commerce'}
                    </span>
                  </div>

                  <div className="divide-y divide-border border-t border-border pt-2 space-y-1.5">
                    {summary.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between pt-1.5">
                        <span className="text-muted-foreground">
                          {item.quantity}x {item.productName}
                        </span>
                        <span className="font-mono font-medium">
                          {item.totalPrice.toFixed(2)} €
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Mode of Settlement Selector (SLE-185) */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Coins className="size-4 text-primary" />
                <span>Mode de règlement</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Choisissez comment vous souhaitez régler votre commande
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 100% Euros */}
                <button
                  type="button"
                  onClick={() => handleSelectMode('EUROS')}
                  className={`p-3.5 rounded-xl border text-left transition-all space-y-1 ${
                    settlementMode === 'EUROS'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <CreditCard className="size-4 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      CB
                    </span>
                  </div>
                  <div className="font-bold text-xs">Carte Bancaire</div>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    100% ({totalAmount.toFixed(2)} €)
                  </div>
                </button>

                {/* Loyalty Points */}
                <button
                  type="button"
                  onClick={() => handleSelectMode('POINTS')}
                  disabled={loyaltyPoints <= 0}
                  className={`p-3.5 rounded-xl border text-left transition-all space-y-1 ${
                    settlementMode === 'POINTS'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:bg-muted/40 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Coins className="size-4 text-amber-500" />
                    <Badge variant="secondary" className="text-[10px] py-0 px-1 font-mono">
                      {loyaltyPoints} pts
                    </Badge>
                  </div>
                  <div className="font-bold text-xs">Points Fidélité</div>
                  <div className="text-[11px] text-muted-foreground">
                    Solde: {maxPointsWorthInEuros.toFixed(2)} €
                  </div>
                </button>

                {/* Mixed Split */}
                <button
                  type="button"
                  onClick={() => handleSelectMode('MIXED')}
                  disabled={loyaltyPoints <= 0}
                  className={`p-3.5 rounded-xl border text-left transition-all space-y-1 ${
                    settlementMode === 'MIXED'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:bg-muted/40 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center -space-x-1">
                      <CreditCard className="size-3.5 text-primary" />
                      <Coins className="size-3.5 text-amber-500" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Mixte
                    </span>
                  </div>
                  <div className="font-bold text-xs">Mixte (CB + Pts)</div>
                  <div className="text-[11px] text-muted-foreground">Déduire une partie</div>
                </button>
              </div>

              {/* Mixed settlement slider */}
              {settlementMode === 'MIXED' && (
                <div className="p-3 bg-muted/40 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="pointsRange" className="text-xs">
                      Points à utiliser :
                    </Label>
                    <span className="font-mono font-bold text-primary">
                      {pointsToUse} pts ({pointsWorth.toFixed(2)} €)
                    </span>
                  </div>
                  <input
                    id="pointsRange"
                    type="range"
                    min="0"
                    max={Math.min(loyaltyPoints, Math.round(totalAmount * POINTS_PER_EURO))}
                    step="10"
                    value={pointsToUse}
                    onChange={(e) => setPointsToUse(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>0 pt</span>
                    <span>
                      Max ({Math.min(loyaltyPoints, Math.round(totalAmount * POINTS_PER_EURO))} pts)
                    </span>
                  </div>
                </div>
              )}

              {/* Full points confirmation */}
              {settlementMode === 'POINTS' && remainingEurosToPay === 0 && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-3 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="size-4" />
                    <span>Solde de points suffisant pour régler la totalité !</span>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    Vos {pointsToUse} points de fidélité couvrent l'intégralité du panier de{' '}
                    {totalAmount.toFixed(2)} €.
                  </p>
                  <Button
                    onClick={() => handlePaymentApproved()}
                    disabled={isProcessingPayment}
                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {isProcessingPayment ? (
                      <>
                        <RefreshCw className="size-4 animate-spin" />
                        <span>Validation en cours...</span>
                      </>
                    ) : (
                      <>
                        <Coins className="size-4" />
                        <span>Confirmer le paiement par points ({pointsToUse} pts)</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Payment Simulator Card (SLE-187) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-20 space-y-4">
            <Card className="border-border bg-card shadow-xs">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-base font-bold">Récapitulatif final</CardTitle>
                <CardDescription className="text-xs">
                  Montant à autoriser par carte bancaire
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Total panier</span>
                  <span className="font-mono font-semibold">{totalAmount.toFixed(2)} €</span>
                </div>
                {settlementMode !== 'EUROS' && pointsWorth > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Déduction points ({pointsToUse} pts)</span>
                    <span className="font-mono">- {pointsWorth.toFixed(2)} €</span>
                  </div>
                )}
                <div className="pt-2 border-t border-border flex justify-between items-center text-sm">
                  <span className="font-bold">Reste à payer</span>
                  <span className="font-extrabold text-primary font-mono text-base">
                    {remainingEurosToPay.toFixed(2)} €
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Display Simulator if card payment required */}
            {remainingEurosToPay > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1">
                  <ShieldCheck className="size-4 text-emerald-500" />
                  <span>Passerelle bancaire sécurisée (Simulation RG001)</span>
                </div>
                <PaymentSimulatorCard
                  initialAmount={remainingEurosToPay.toFixed(2)}
                  initialReference={order.orderReference}
                  onPaymentSuccess={handlePaymentApproved}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
