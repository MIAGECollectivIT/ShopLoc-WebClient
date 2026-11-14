import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import {
  getOrderByReference,
  getStoreById,
  downloadOrderReceiptPdf,
  triggerBlobDownload,
} from '@/lib/api';
import { ROUTES } from '@/config/routes';
import type { OrderResponse } from '@/types/order';
import type { Store } from '@/types/store';
import type { PaymentAuthorizationResponse } from '@/types/payment';
import {
  CheckCircle2,
  MapPin,
  Store as StoreIcon,
  AlertTriangle,
  Receipt,
  ArrowRight,
  ShoppingBag,
  Home,
  FileDown,
  Mail,
  Loader2,
} from 'lucide-react';

interface SettlementBreakdown {
  settlementMode: string;
  pointsUsed: number;
  pointsDeductionEuro: number;
  eurosPaid: number;
}

export interface OrderConfirmationPageViewProps {
  initialOrderReference?: string;
}

export function OrderConfirmationPageView({
  initialOrderReference,
}: OrderConfirmationPageViewProps = {}) {
  const [mounted, setMounted] = React.useState(false);
  const { isAuthenticated, token, isLoading: authLoading } = useAuth();

  const [orderReference, setOrderReference] = React.useState<string | null>(
    initialOrderReference || null
  );
  const [order, setOrder] = React.useState<OrderResponse | null>(null);
  const [loadingOrder, setLoadingOrder] = React.useState(true);
  const [orderError, setOrderError] = React.useState<string | null>(null);

  const [storeAddresses, setStoreAddresses] = React.useState<Record<number, string>>({});
  const [paymentReceipt, setPaymentReceipt] = React.useState<PaymentAuthorizationResponse | null>(
    null
  );
  const [settlementInfo, setSettlementInfo] = React.useState<SettlementBreakdown | null>(null);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [downloadError, setDownloadError] = React.useState<string | null>(null);

  const handleDownloadPdf = async () => {
    if (!order) return;
    const targetId = order.orderReference || order.uid;
    try {
      setIsDownloading(true);
      setDownloadError(null);
      const { blob, filename } = await downloadOrderReceiptPdf(
        targetId,
        token || undefined,
        order.orderReference,
        order.status
      );
      triggerBlobDownload(blob, filename);
    } catch (err) {
      console.error('Erreur téléchargement PDF:', err);
      setDownloadError(
        err instanceof Error
          ? err.message
          : order.status === 'COMPLETED'
            ? 'Impossible de télécharger la facture.'
            : 'Impossible de télécharger le bon de retrait.'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  React.useEffect(() => {
    setMounted(true);
    // Resolve reference from prop, path /order-confirmation/:id or fallback query params
    const pathname = window.location.pathname;
    const parts = pathname.split('/').filter(Boolean);
    let refFromPath: string | null = null;
    if (parts.length >= 2 && parts[0] === 'order-confirmation') {
      refFromPath = decodeURIComponent(parts[1]);
    }

    const params = new URLSearchParams(window.location.search);
    const ref =
      initialOrderReference ||
      refFromPath ||
      params.get('uid') ||
      params.get('orderRef') ||
      params.get('id');
    setOrderReference(ref);

    if (ref) {
      try {
        const storedReceipt = sessionStorage.getItem(`order_receipt_${ref}`);
        if (storedReceipt) {
          setPaymentReceipt(JSON.parse(storedReceipt));
        }
        const storedSettlement = sessionStorage.getItem(`order_settlement_${ref}`);
        if (storedSettlement) {
          setSettlementInfo(JSON.parse(storedSettlement));
        }
      } catch {
        // Ignore sessionStorage parse errors
      }
    }
  }, [initialOrderReference]);

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
            addresses[summary.storeId] = 'Adresse communiquée sur le ticket de caisse';
          }
        }
        setStoreAddresses(addresses);
      })
      .catch((err: unknown) => {
        setOrderError(err instanceof Error ? err.message : 'Impossible de récupérer la commande');
      })
      .finally(() => {
        setLoadingOrder(false);
      });
  }, [mounted, orderReference, token]);

  if (!mounted || authLoading || loadingOrder) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto py-10 animate-pulse">
        <div className="h-20 bg-muted rounded-xl" />
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
          Vous devez être connecté pour consulter le récapitulatif de votre commande.
        </p>
        <Button
          onClick={() => {
            const confirmationTarget = orderReference
              ? ROUTES.orderConfirmation.detail(orderReference)
              : ROUTES.orderConfirmation.path;
            window.location.href = `${ROUTES.login.path}?redirect=${encodeURIComponent(confirmationTarget)}`;
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
            window.location.href = ROUTES.catalog.path;
          }}
          className="w-full gap-2"
        >
          <ShoppingBag className="size-4" />
          <span>Retourner au catalogue</span>
        </Button>
      </div>
    );
  }

  const orderDate = new Date(order.createdAt).toLocaleString('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      {/* 1. Hero Confirmation Card */}
      <Card className="border-emerald-500/40 bg-card shadow-sm overflow-hidden">
        <div className="p-6 text-center border-b border-border bg-emerald-500/5">
          <div className="size-16 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="size-9 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            {order.status === 'COMPLETED'
              ? 'Articles récupérés en boutique !'
              : 'Commande confirmée et réglée !'}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Passée le {orderDate} • Réf :{' '}
            <span className="font-mono font-bold text-primary">{order.orderReference}</span>
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <Badge
              className={
                order.status === 'COMPLETED'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-emerald-600 text-white font-semibold'
              }
            >
              Statut :{' '}
              {order.status === 'PAID'
                ? 'PAYÉE'
                : order.status === 'COMPLETED'
                  ? 'ARTICLES RÉCUPÉRÉS'
                  : order.status}
            </Badge>
            <Badge variant="outline" className="font-mono">
              Click & Collect
            </Badge>
          </div>
          {order.status === 'COMPLETED' && order.updatedAt && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium">
              Articles récupérés le{' '}
              {new Date(order.updatedAt).toLocaleString('fr-FR', {
                dateStyle: 'long',
                timeStyle: 'short',
              })}
            </p>
          )}

          {/* Email notice & proof of purchase / invoice (SLE-21) */}
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 text-left flex items-start gap-3">
            <Mail className="size-4 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                {order.status === 'COMPLETED'
                  ? 'Facture d’achat disponible'
                  : 'Bon de retrait envoyé par email'}
              </p>
              <p className="text-emerald-700 dark:text-emerald-300 leading-relaxed">
                {order.status === 'COMPLETED' ? (
                  <>
                    Votre <strong>facture officielle d’achat (PDF)</strong>
                    {order.customerEmail
                      ? ` a été transmise à ${order.customerEmail}`
                      : ' est disponible'}
                    . Vos articles ont déjà été récupérés auprès de nos commerçants partenaires.
                  </>
                ) : (
                  <>
                    Un email de confirmation avec votre{' '}
                    <strong>bon de retrait officiel en pièce jointe (PDF)</strong>
                    {order.customerEmail
                      ? ` a été envoyé à ${order.customerEmail}`
                      : ' a été généré'}
                    . Présentez votre QR Code ou votre carte physique pour le retrait en boutique.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* 2. Financial breakdown of the transaction */}
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
            <Receipt className="size-4 text-primary" />
            <span>Détail financier de l’opération</span>
          </div>

          <div className="p-4 bg-muted/40 rounded-xl space-y-2.5 text-xs border border-border/60">
            <div className="flex justify-between font-semibold text-sm">
              <span>Montant total de la commande</span>
              <span className="font-mono text-primary font-bold">
                {order.totalAmount.toFixed(2)} €
              </span>
            </div>

            {settlementInfo && (
              <>
                <div className="flex justify-between text-muted-foreground">
                  <span>Mode de règlement</span>
                  <span className="font-semibold text-foreground">
                    {settlementInfo.settlementMode === 'POINTS'
                      ? '100% Points de fidélité'
                      : settlementInfo.settlementMode === 'WALLET'
                        ? '100% Portefeuille ShopLoc'
                        : settlementInfo.settlementMode === 'MIXED'
                          ? 'Mixte (CB + Points)'
                          : 'Carte Bancaire'}
                  </span>
                </div>

                {settlementInfo.pointsUsed > 0 && (
                  <div className="flex justify-between text-amber-600 dark:text-amber-400">
                    <span>Points de fidélité débités</span>
                    <span className="font-mono font-medium">
                      -{settlementInfo.pointsUsed} pts (
                      {settlementInfo.pointsDeductionEuro.toFixed(2)} €)
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-muted-foreground">
                  <span>
                    {settlementInfo.settlementMode === 'WALLET'
                      ? 'Montant débité du portefeuille'
                      : 'Montant réglé par Carte Bancaire'}
                  </span>
                  <span className="font-mono font-semibold text-foreground">
                    {settlementInfo.eurosPaid.toFixed(2)} €
                  </span>
                </div>
              </>
            )}

            {paymentReceipt && (
              <div className="pt-2 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                <div>
                  <span className="block text-[10px] uppercase font-bold text-muted-foreground/80">
                    {paymentReceipt.paymentMethod === 'WALLET'
                      ? 'Référence Portefeuille'
                      : 'Autorisation bancaire'}
                  </span>
                  <span className="font-mono font-semibold text-foreground">
                    {paymentReceipt.authorizationCode}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-muted-foreground/80">
                    ID Transaction
                  </span>
                  <span className="font-mono text-foreground">{paymentReceipt.transactionId}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3. Store breakdown & Click & Collect pickup details */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StoreIcon className="size-4 text-primary" />
            <h2 className="text-base font-bold text-foreground">
              Détail de l’opération par commerce ({order.storeSummaries.length})
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">
            {order.items.length} article{order.items.length > 1 ? 's' : ''} au total
          </span>
        </div>

        {order.storeSummaries.map((summary) => {
          const storeItems = order.items.filter((item) => item.storeId === summary.storeId);
          const address =
            storeAddresses[summary.storeId] || 'Adresse disponible chez le commerçant';

          return (
            <Card key={summary.storeId} className="border-border shadow-xs">
              <CardHeader className="p-4 pb-3 border-b border-border/50 bg-muted/20">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <StoreIcon className="size-4 text-primary shrink-0" />
                      <span>{summary.storeName}</span>
                    </CardTitle>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="size-3.5 text-rose-500 shrink-0" />
                      <span>Point de retrait : {address}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-mono font-bold text-xs shrink-0">
                    {summary.subtotal.toFixed(2)} €
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-3">
                <div className="divide-y divide-border/40 text-xs">
                  {storeItems.map((item) => (
                    <div
                      key={item.id}
                      className="py-2 flex items-center justify-between gap-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="size-5 rounded-md bg-muted flex items-center justify-center font-mono font-semibold text-[11px] shrink-0">
                          {item.quantity}×
                        </span>
                        <span className="font-medium text-foreground">{item.productName}</span>
                      </div>
                      <div className="text-right font-mono shrink-0">
                        <span className="font-bold text-foreground">
                          {item.totalPrice.toFixed(2)} €
                        </span>
                        <span className="block text-[10px] text-muted-foreground">
                          ({item.unitPrice.toFixed(2)} € / u)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Error alert if download fails */}
      {downloadError && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{downloadError}</span>
        </div>
      )}

      {/* 4. Actions bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            size="sm"
            disabled={isDownloading}
            onClick={handleDownloadPdf}
            className="cursor-pointer gap-2 text-xs !bg-emerald-600 hover:!bg-emerald-700 !text-white font-medium shadow-xs w-full sm:w-auto"
          >
            {isDownloading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <FileDown className="size-3.5" />
            )}
            <span>
              {order.status === 'COMPLETED'
                ? 'Télécharger la facture (PDF)'
                : 'Télécharger le bon de retrait (PDF)'}
            </span>
          </Button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              window.location.href = ROUTES.home.path;
            }}
            className="cursor-pointer gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Home className="size-3.5" />
            <span>Accueil</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              window.location.href = ROUTES.catalog.path;
            }}
            className="gap-1.5 text-xs font-semibold"
          >
            <span>Continuer mes achats</span>
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
