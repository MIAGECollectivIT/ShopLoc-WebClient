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
import { getOrderByReference, updateOrderStatus, getWallet, debitWallet } from '@/lib/api';
import { PaymentSimulatorCard } from '@/components/PaymentSimulatorCard';
import { ROUTES } from '@/config/routes';
import type { OrderResponse } from '@/types/order';
import type { PaymentAuthorizationResponse } from '@/types/payment';
import {
  CreditCard,
  Wallet,
  AlertTriangle,
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
  Clock,
} from 'lucide-react';

type SettlementMode = 'EUROS' | 'WALLET' | 'MIXED';

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

  const [walletBalance, setWalletBalance] = React.useState<number | null>(null);
  const [loadingWallet, setLoadingWallet] = React.useState(true);
  const [settlementMode, setSettlementMode] = React.useState<SettlementMode>('EUROS');
  const [customWalletPart, setCustomWalletPart] = React.useState<number | null>(null);

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

  // Fetch order and wallet balance
  React.useEffect(() => {
    if (!mounted || !orderReference) {
      if (mounted && !orderReference) {
        setLoadingOrder(false);
        setLoadingWallet(false);
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

        // Fetch citizen wallet balance
        if (user?.id) {
          try {
            const walletData = await getWallet(token || undefined);
            setWalletBalance(walletData.balance);
          } catch {
            setWalletBalance(0);
          } finally {
            setLoadingWallet(false);
          }
        } else {
          setLoadingWallet(false);
        }
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : 'Impossible de récupérer la commande');
        setLoadingWallet(false);
      })
      .finally(() => {
        setLoadingOrder(false);
      });
  }, [mounted, orderReference, token, user?.id]);

  const totalAmount = order?.totalAmount ?? 0;
  const currentWalletBalance = walletBalance ?? 0;

  // 100% wallet payment is possible if wallet balance covers entire total
  const canUseWallet = walletBalance !== null && currentWalletBalance >= totalAmount;

  // Mixed payment (wallet + credit card) is possible as long as wallet has a positive balance
  const canUseMixed = walletBalance !== null && currentWalletBalance > 0;

  // Maximum debit on wallet for mixed mode (leaving at least 0.01 € for card payment if totalAmount > 0.01)
  const maxWalletDebit =
    totalAmount > 0.01
      ? Math.min(currentWalletBalance, Math.round((totalAmount - 0.01) * 100) / 100)
      : Math.min(currentWalletBalance, totalAmount);

  // Default wallet portion when selecting MIXED mode:
  // If balance < totalAmount: take full balance
  // If balance >= totalAmount: default to 50% rounded
  const defaultWalletPart =
    currentWalletBalance < totalAmount
      ? currentWalletBalance
      : Math.round((totalAmount / 2) * 100) / 100;

  const effectiveWalletPart =
    customWalletPart !== null
      ? Math.min(maxWalletDebit, Math.max(0.01, customWalletPart))
      : defaultWalletPart;

  const walletPart =
    settlementMode === 'WALLET'
      ? totalAmount
      : settlementMode === 'MIXED'
        ? effectiveWalletPart
        : 0;

  const cardPart = Math.max(0, Math.round((totalAmount - walletPart) * 100) / 100);

  // Handle mode selection
  const handleSelectMode = (mode: SettlementMode) => {
    setSettlementMode(mode);
    setPaymentError(null);
    if (mode === 'MIXED' && customWalletPart === null) {
      setCustomWalletPart(defaultWalletPart);
    }
  };

  // Finalize payment by digital wallet (100% wallet)
  const handleWalletPayment = async () => {
    if (!order) return;
    setIsProcessingPayment(true);
    setPaymentError(null);

    try {
      const primaryStore = order.storeSummaries?.[0];
      const storeName =
        order.storeSummaries?.length === 1
          ? primaryStore?.storeName
          : 'Commandes ShopLoc multi-commerces';

      // 1. Debit wallet on backend
      const updatedWallet = await debitWallet(
        {
          amount: totalAmount,
          storeId: primaryStore?.storeId,
          storeName: storeName || 'Commerce ShopLoc',
          orderReference: order.orderReference,
          description: `Règlement commande ${order.orderReference}`,
        },
        token || undefined
      );

      // 2. Mark order status to PAID on backend
      await updateOrderStatus(order.orderReference, 'PAID', token || undefined);

      // 3. Clear validated cart
      clear();

      // 4. Save receipt and settlement breakdown in sessionStorage for confirmation view
      const receipt: PaymentAuthorizationResponse = {
        transactionId: `TX-WAL-${Date.now()}`,
        authorizationCode: `WAL-${Date.now().toString(36).toUpperCase()}`,
        status: 'TRANSACTION_APPROVED',
        amount: totalAmount,
        currency: 'EUR',
        rule: 'WALLET_DEBIT',
        paymentMethod: 'WALLET',
        reference: order.orderReference,
        timestamp: new Date().toISOString(),
      };

      sessionStorage.setItem(`order_receipt_${order.orderReference}`, JSON.stringify(receipt));
      sessionStorage.setItem(
        `order_settlement_${order.orderReference}`,
        JSON.stringify({
          settlementMode: 'WALLET',
          walletPaid: totalAmount,
          eurosPaid: 0,
          totalAmount: totalAmount,
          newWalletBalance: updatedWallet.balance,
        })
      );

      // 5. Redirect to final order confirmation view
      const orderUid = order.uid || order.orderReference;
      window.location.href = ROUTES.orderConfirmation.detail(orderUid);
    } catch (err: unknown) {
      setPaymentError(
        err instanceof Error ? err.message : 'Erreur lors du règlement avec votre portefeuille'
      );
      setIsProcessingPayment(false);
    }
  };

  // Finalize payment by credit card (100% CB) or mixed (wallet + CB)
  const handlePaymentApproved = async (receipt?: PaymentAuthorizationResponse) => {
    if (!order) return;
    setIsProcessingPayment(true);
    setPaymentError(null);

    try {
      let updatedWalletBalance: number | undefined;

      // 1. In MIXED mode, automatically debit the wallet part first
      if (settlementMode === 'MIXED' && walletPart > 0) {
        const primaryStore = order.storeSummaries?.[0];
        const storeName =
          order.storeSummaries?.length === 1
            ? primaryStore?.storeName
            : 'Commandes ShopLoc multi-commerces';

        const updatedWallet = await debitWallet(
          {
            amount: walletPart,
            storeId: primaryStore?.storeId,
            storeName: storeName || 'Commerce ShopLoc',
            orderReference: order.orderReference,
            description: `Règlement mixte (part portefeuille) commande ${order.orderReference}`,
          },
          token || undefined
        );
        updatedWalletBalance = updatedWallet.balance;
      }

      // 2. Update order status to PAID on backend
      await updateOrderStatus(order.orderReference, 'PAID', token || undefined);

      // 3. Clear validated cart
      clear();

      // 4. Save receipt and settlement breakdown in sessionStorage for the confirmation view
      if (receipt) {
        sessionStorage.setItem(`order_receipt_${order.orderReference}`, JSON.stringify(receipt));
      }
      sessionStorage.setItem(
        `order_settlement_${order.orderReference}`,
        JSON.stringify({
          settlementMode,
          walletPaid: settlementMode === 'MIXED' ? walletPart : 0,
          eurosPaid: cardPart,
          totalAmount: totalAmount,
          newWalletBalance: updatedWalletBalance,
        })
      );

      // 5. Redirect to the final order confirmation & recap view
      const orderUid = order.uid || order.orderReference;
      window.location.href = ROUTES.orderConfirmation.detail(orderUid);
    } catch (err: unknown) {
      setPaymentError(
        err instanceof Error ? err.message : 'Erreur lors de la validation finale du règlement'
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

      {/* Payment method selection */}
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
            {/* Mode 1: Credit Card (100% CB) */}
            <button
              type="button"
              onClick={() => handleSelectMode('EUROS')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                settlementMode === 'EUROS'
                  ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary'
                  : 'border-border hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <CreditCard className="size-4 text-primary" />
                <Badge variant="outline" className="text-[10px]">
                  CB
                </Badge>
              </div>
              <div className="font-semibold text-xs text-foreground">Carte Bancaire</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                100% ({totalAmount.toFixed(2)} €)
              </div>
            </button>

            {/* Mode 2: ShopLoc Digital Wallet (100% Portefeuille) */}
            <button
              type="button"
              onClick={() => canUseWallet && handleSelectMode('WALLET')}
              disabled={!canUseWallet}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                settlementMode === 'WALLET'
                  ? 'border-emerald-500 bg-emerald-500/10 shadow-xs ring-1 ring-emerald-500'
                  : 'border-border hover:bg-muted/50'
              } ${!canUseWallet ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <Wallet className="size-4 text-emerald-600 dark:text-emerald-400" />
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                >
                  {loadingWallet ? '...' : `${currentWalletBalance.toFixed(2)} €`}
                </Badge>
              </div>
              <div className="font-semibold text-xs text-foreground">Portefeuille ShopLoc</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {canUseWallet
                  ? `100% (${totalAmount.toFixed(2)} €)`
                  : 'Solde insuffisant pour 100%'}
              </div>
            </button>

            {/* Mode 3: Mixed (Portefeuille + Carte Bancaire) */}
            <button
              type="button"
              onClick={() => canUseMixed && handleSelectMode('MIXED')}
              disabled={!canUseMixed}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                settlementMode === 'MIXED'
                  ? 'border-indigo-500 bg-indigo-500/10 shadow-xs ring-1 ring-indigo-500'
                  : 'border-border hover:bg-muted/50'
              } ${!canUseMixed ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                  <Wallet className="size-3.5" />
                  <span className="text-[10px] font-bold">+</span>
                  <CreditCard className="size-3.5" />
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] border-indigo-500/30 text-indigo-600 dark:text-indigo-400"
                >
                  MIXTE
                </Badge>
              </div>
              <div className="font-semibold text-xs text-foreground">Mixte (Portefeuille + CB)</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {canUseMixed ? 'Répartir avec curseur' : 'Solde portefeuille vide'}
              </div>
            </button>
          </div>

          {/* Wallet insufficient balance alert with quick reload link */}
          {walletBalance !== null && !canUseWallet && !canUseMixed && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/40 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Wallet className="size-3.5 text-muted-foreground shrink-0" />
                <span>
                  Solde portefeuille insuffisant ({currentWalletBalance.toFixed(2)} € disponibles
                  pour une commande de {totalAmount.toFixed(2)} €).
                </span>
              </span>
              <a
                href={ROUTES.wallet.path}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary hover:underline shrink-0"
              >
                Recharger mon portefeuille →
              </a>
            </div>
          )}

          {/* Interactive slider for mixed mode */}
          {settlementMode === 'MIXED' && (
            <div className="p-4 bg-muted/40 rounded-xl space-y-3 border border-border/60">
              <div className="flex justify-between items-center text-xs">
                <Label
                  htmlFor="wallet-slider"
                  className="font-semibold flex items-center gap-1.5 text-foreground"
                >
                  <Wallet className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Répartition du paiement mixte</span>
                </Label>
                <span className="text-[11px] text-muted-foreground font-mono">
                  Solde disponible :{' '}
                  <strong className="text-foreground">{currentWalletBalance.toFixed(2)} €</strong>
                </span>
              </div>

              {/* 2 pills displaying live breakdown */}
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                    <Wallet className="size-3 text-emerald-600 dark:text-emerald-400" />
                    <span>Débit Portefeuille</span>
                  </div>
                  <div className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {walletPart.toFixed(2)} €
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                    <CreditCard className="size-3 text-primary" />
                    <span>Reste Carte Bancaire</span>
                  </div>
                  <div className="font-mono font-bold text-base text-primary mt-0.5">
                    {cardPart.toFixed(2)} €
                  </div>
                </div>
              </div>

              {/* Interactive slider */}
              <div className="space-y-1.5 pt-1">
                <input
                  id="wallet-slider"
                  type="range"
                  min="0.10"
                  max={maxWalletDebit.toFixed(2)}
                  step="0.10"
                  value={walletPart}
                  onChange={(e) => setCustomWalletPart(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
                  <span>0.10 €</span>
                  <span className="text-xs text-foreground font-medium">
                    Glissez le curseur pour ajuster
                  </span>
                  <span>{maxWalletDebit.toFixed(2)} € max</span>
                </div>
              </div>
            </div>
          )}

          {/* Breakdown summary */}
          <div className="p-3.5 bg-muted/50 rounded-xl text-xs space-y-2 border border-border/50">
            <div className="flex justify-between text-muted-foreground">
              <span>Montant total commande</span>
              <span className="font-mono font-semibold text-foreground">
                {totalAmount.toFixed(2)} €
              </span>
            </div>

            {settlementMode === 'WALLET' && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                <span>
                  Débit intégral du portefeuille (solde restant :{' '}
                  {Math.max(0, currentWalletBalance - totalAmount).toFixed(2)} €)
                </span>
                <span className="font-mono">-{totalAmount.toFixed(2)} €</span>
              </div>
            )}

            {settlementMode === 'MIXED' && (
              <>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>Part débitée du portefeuille ShopLoc (automatique)</span>
                  <span className="font-mono">-{walletPart.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-indigo-600 dark:text-indigo-400 font-medium">
                  <span>Part restante à régler par Carte Bancaire</span>
                  <span className="font-mono">{cardPart.toFixed(2)} €</span>
                </div>
              </>
            )}

            <div className="flex justify-between font-bold text-sm text-foreground pt-2 border-t border-border">
              <span>
                {settlementMode === 'WALLET'
                  ? 'Montant à débiter'
                  : 'Montant à régler par Carte Bancaire'}
              </span>
              <span className="font-mono text-primary">
                {settlementMode === 'WALLET'
                  ? `${totalAmount.toFixed(2)} €`
                  : `${cardPart.toFixed(2)} €`}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment execution */}
      {settlementMode === 'WALLET' ? (
        <Card className="border-emerald-500/40 bg-emerald-500/5 shadow-xs">
          <CardHeader className="pb-3 text-center">
            <div className="size-12 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-1">
              <Wallet className="size-6" />
            </div>
            <CardTitle className="text-base font-bold">
              Règlement par Portefeuille ShopLoc
            </CardTitle>
            <CardDescription className="text-xs">
              Votre commande de {totalAmount.toFixed(2)} € sera débitée de votre porte-monnaie
              virtuel.
              <span className="block mt-1 text-muted-foreground">
                Solde actuel :{' '}
                <strong className="font-mono">{currentWalletBalance.toFixed(2)} €</strong> → Nouveau
                solde :{' '}
                <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                  {Math.max(0, currentWalletBalance - totalAmount).toFixed(2)} €
                </strong>
              </span>
            </CardDescription>
          </CardHeader>
          <CardFooter className="pt-2 flex flex-col gap-2">
            <Button
              size="lg"
              onClick={handleWalletPayment}
              disabled={isProcessingPayment || !canUseWallet}
              className="w-full gap-2 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              {isProcessingPayment ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  Débit du portefeuille en cours...
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4" />
                  Payer avec mon portefeuille ({totalAmount.toFixed(2)} €)
                </>
              )}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1">
              <ShieldCheck className="size-3.5 text-emerald-500" />
              Paiement instantané garanti et sécurisé sans frais
            </p>
          </CardFooter>
        </Card>
      ) : (
        <PaymentSimulatorCard
          hidePresets={true}
          hideReceipt={true}
          hideReference={true}
          initialAmount={cardPart.toFixed(2)}
          initialReference={order.uid || order.orderReference}
          onPaymentSuccess={handlePaymentApproved}
        />
      )}
    </div>
  );
}
