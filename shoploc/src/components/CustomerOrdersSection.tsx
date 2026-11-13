import * as React from 'react';
import { useAuth } from '@/lib/auth';
import {
  getCustomerOrders,
  downloadOrderReceiptPdf,
  resendOrderReceiptEmail,
  triggerBlobDownload,
} from '@/lib/api';
import type { OrderResponse } from '@/types/order';
import { ROUTES } from '@/config/routes';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ShoppingBag,
  FileDown,
  CheckCircle2,
  Clock,
  XCircle,
  Store,
  Calendar,
  AlertCircle,
  RefreshCw,
  Mail,
  ArrowRight,
  Loader2,
} from 'lucide-react';

export function CustomerOrdersSection() {
  const { token, isAuthenticated } = useAuth();
  const [orders, setOrders] = React.useState<OrderResponse[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);
  const [downloadError, setDownloadError] = React.useState<{ id: string; message: string } | null>(
    null
  );

  const [resendingId, setResendingId] = React.useState<string | null>(null);
  const [resendSuccessId, setResendSuccessId] = React.useState<string | null>(null);

  const fetchOrders = React.useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await getCustomerOrders(token || undefined);
      setOrders(data);
    } catch (err) {
      console.error('Erreur chargement commandes:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de récupérer vos commandes. Veuillez réessayer.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, token]);

  React.useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleDownload = async (order: OrderResponse) => {
    const targetId = order.orderReference || order.uid;
    const isCompleted = (order.status || '').toUpperCase() === 'COMPLETED';
    try {
      setDownloadingId(targetId);
      setDownloadError(null);
      const { blob, filename } = await downloadOrderReceiptPdf(
        targetId,
        token || undefined,
        order.orderReference,
        order.status
      );
      triggerBlobDownload(blob, filename);
    } catch (err) {
      console.error('Erreur téléchargement document PDF:', err);
      setDownloadError({
        id: targetId,
        message:
          err instanceof Error
            ? err.message
            : isCompleted
              ? 'Erreur lors du téléchargement de la facture.'
              : 'Erreur lors du téléchargement du bon de retrait.',
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleResendEmail = async (order: OrderResponse) => {
    const targetId = order.uid || order.orderReference;
    try {
      setResendingId(targetId);
      setDownloadError(null);
      await resendOrderReceiptEmail(targetId, token || undefined);
      setResendSuccessId(targetId);
      setTimeout(() => {
        setResendSuccessId(null);
      }, 4000);
    } catch (err) {
      console.error('Erreur renvoi email:', err);
      setDownloadError({
        id: targetId,
        message:
          err instanceof Error ? err.message : 'Impossible de renvoyer l’email de confirmation.',
      });
    } finally {
      setResendingId(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Date inconnue';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const renderStatusBadge = (status: string) => {
    const normalized = (status || '').toUpperCase();
    if (normalized === 'PAID') {
      return (
        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 px-2.5 py-0.5 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Réglée & Validée
        </Badge>
      );
    }
    if (normalized === 'COMPLETED') {
      return (
        <Badge className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 px-2.5 py-0.5 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Articles récupérés
        </Badge>
      );
    }
    if (normalized === 'PENDING_PAYMENT') {
      return (
        <Badge
          variant="outline"
          className="text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950/30 flex items-center gap-1.5 px-2.5 py-0.5"
        >
          <Clock className="w-3.5 h-3.5" />
          En attente de paiement
        </Badge>
      );
    }
    if (normalized === 'CANCELLED' || normalized === 'EXPIRED') {
      return (
        <Badge
          variant="secondary"
          className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 px-2.5 py-0.5"
        >
          <XCircle className="w-3.5 h-3.5" />
          {normalized === 'EXPIRED' ? 'Expirée' : 'Annulée'}
        </Badge>
      );
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Top summary row: lifted order count */}
      {!isLoading && orders.length > 0 && (
        <div className="flex items-center justify-between gap-4 pb-1">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Historique de vos commandes Click & Collect
          </p>
          <Badge variant="secondary" className="font-mono font-semibold text-xs px-2.5 py-1">
            {orders.length} {orders.length > 1 ? 'commandes' : 'commande'}
          </Badge>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="border-border bg-card rounded-xl shadow-xs overflow-hidden">
              <CardHeader className="p-4 pb-3 border-b border-border/50 bg-muted/20">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-6 w-28 rounded-full" />
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-60" />
                <Skeleton className="h-4 w-48" />
              </CardContent>
              <CardFooter className="p-4 pt-3 border-t border-border/40 bg-muted/10 flex justify-between items-center">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-8 w-36 rounded-md" />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive flex items-start gap-3">
          <AlertCircle className="size-5 mt-0.5 shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-semibold">Erreur de chargement</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchOrders}
              className="mt-3 text-xs gap-1.5 cursor-pointer"
            >
              <RefreshCw className="size-3.5" />
              Réessayer
            </Button>
          </div>
        </div>
      )}

      {/* Not authenticated state */}
      {!isLoading && !isAuthenticated && (
        <Card className="border-dashed border-border bg-card/50 text-center p-8 rounded-xl shadow-xs">
          <div className="size-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <ShoppingBag className="size-6" />
          </div>
          <h3 className="font-semibold text-foreground text-base">Connexion requise</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            Connectez-vous pour consulter l’historique de vos commandes et télécharger vos
            justificatifs officiels.
          </p>
          <a
            href={`${ROUTES.login.path}?redirect=${encodeURIComponent(ROUTES.orders.path)}`}
            className={buttonVariants({
              variant: 'default',
              size: 'sm',
              className: 'gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer',
            })}
          >
            Se connecter
            <ArrowRight className="size-4" />
          </a>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && !error && isAuthenticated && orders.length === 0 && (
        <Card className="border-dashed border-border bg-card/50 text-center p-10 rounded-xl shadow-xs">
          <div className="size-12 rounded-full bg-muted text-muted-foreground flex items-center justify-center mx-auto mb-3">
            <ShoppingBag className="size-6" />
          </div>
          <h3 className="font-semibold text-foreground text-base">
            Aucune commande pour le moment
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            Composez votre panier parmi les commerces de proximité partenaires et profitez du Click
            & Collect !
          </p>
          <a
            href={ROUTES.catalog.path}
            className={buttonVariants({
              variant: 'default',
              size: 'sm',
              className: 'gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer',
            })}
          >
            Découvrir le catalogue
            <ArrowRight className="size-4" />
          </a>
        </Card>
      )}

      {/* Orders list */}
      {!isLoading && !error && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((order) => {
            const orderKey = order.uid || order.orderReference;
            const isPaid = (order.status || '').toUpperCase() === 'PAID';
            const isCompleted = (order.status || '').toUpperCase() === 'COMPLETED';
            const isPending = (order.status || '').toUpperCase() === 'PENDING_PAYMENT';
            const canDownload = isPaid || isCompleted;
            const isDownloading = downloadingId === orderKey;
            const isResending = resendingId === orderKey;
            const resendSuccess = resendSuccessId === orderKey;
            const currentError =
              downloadError && downloadError.id === orderKey ? downloadError.message : null;

            return (
              <Card
                key={orderKey}
                className="border-border bg-card shadow-xs rounded-xl overflow-hidden hover:border-primary/40 transition-colors"
              >
                {/* Header: Reference, Date, Status */}
                <CardHeader className="p-4 pb-3 border-b border-border/60 bg-muted/20">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <ShoppingBag className="size-4" />
                      </div>
                      <div>
                        <CardTitle className="font-mono font-bold text-sm text-foreground tracking-tight">
                          {order.orderReference}
                        </CardTitle>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          <Calendar className="size-3 text-muted-foreground shrink-0" />
                          <span>Commandé le {formatDate(order.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div>{renderStatusBadge(order.status)}</div>
                  </div>
                </CardHeader>

                {/* Content: Details, Loyalty Code, Stores Breakdown, Total */}
                <CardContent className="p-4 space-y-3 text-xs sm:text-sm">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5 text-muted-foreground">
                      {isCompleted && (
                        <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                          <CheckCircle2 className="size-3.5 shrink-0" />
                          <span>
                            Articles récupérés le {formatDate(order.updatedAt || order.createdAt)}
                          </span>
                        </div>
                      )}
                      {order.clientCode && (
                        <div className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
                          <span>Code fidélité :</span>
                          <span className="font-semibold text-foreground bg-muted px-1.5 py-0.5 rounded">
                            {order.clientCode}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-0.5 sm:text-right">
                      <div className="text-xs text-muted-foreground">Montant total</div>
                      <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {Number(order.totalAmount || 0).toFixed(2)} €
                      </div>
                    </div>
                  </div>

                  {/* Stores breakdown */}
                  {order.storeSummaries && order.storeSummaries.length > 0 && (
                    <div className="pt-2 border-t border-border/40">
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Store className="size-3.5 text-muted-foreground shrink-0" />
                        <span>Commerces partenaires ({order.storeSummaries.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {order.storeSummaries.map((summary) => (
                          <div
                            key={summary.storeId}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-muted/60 border border-border/40 text-foreground font-medium"
                          >
                            <span className="font-semibold">{summary.storeName}</span>
                            <span className="text-muted-foreground/60">•</span>
                            <span className="text-muted-foreground">{summary.itemCount} art.</span>
                            <span className="text-muted-foreground/60">•</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                              {Number(summary.subtotal || 0).toFixed(2)} €
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Error notice if download/resend failed */}
                  {currentError && (
                    <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                      <AlertCircle className="size-4 shrink-0" />
                      <span>{currentError}</span>
                    </div>
                  )}

                  {/* Success notice for email resend */}
                  {resendSuccess && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="size-4 shrink-0" />
                      <span>
                        {isCompleted
                          ? 'Facture renvoyée par email avec succès !'
                          : 'Bon de retrait renvoyé par email avec succès !'}
                      </span>
                    </div>
                  )}
                </CardContent>

                {/* Footer: Actions */}
                <CardFooter className="p-4 pt-3 border-t border-border/50 bg-muted/10 flex flex-wrap items-center justify-between gap-2">
                  {canDownload && (
                    <>
                      <div className="text-xs text-muted-foreground italic">
                        {isCompleted
                          ? 'Articles déjà retirés en boutique • Facture disponible'
                          : 'Présentez votre QR Code ou le bon de retrait en boutique'}
                      </div>
                      <div className="flex items-center gap-2 ml-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isResending}
                          onClick={() => handleResendEmail(order)}
                          className="cursor-pointer gap-1.5 text-xs text-foreground hover:bg-muted"
                          title={
                            isCompleted
                              ? 'Renvoyer la facture par email avec la pièce jointe PDF'
                              : 'Renvoyer le bon de retrait par email avec la pièce jointe PDF'
                          }
                        >
                          {isResending ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Mail className="size-3.5 text-muted-foreground" />
                          )}
                          {isCompleted
                            ? 'Envoyer la facture par email'
                            : 'Envoyer le bon par email'}
                        </Button>

                        <Button
                          size="sm"
                          disabled={isDownloading}
                          onClick={() => handleDownload(order)}
                          className="cursor-pointer gap-1.5 text-xs !bg-emerald-600 hover:!bg-emerald-700 !text-white font-medium shadow-xs"
                        >
                          {isDownloading ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <FileDown className="size-3.5" />
                          )}
                          {isCompleted
                            ? 'Télécharger la facture (PDF)'
                            : 'Télécharger le bon de retrait (PDF)'}
                        </Button>
                      </div>
                    </>
                  )}

                  {isPending && (
                    <>
                      <div className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                        Commande réservée (stocks verrouillés pendant 30 min)
                      </div>
                      <a
                        href={ROUTES.checkout.detail(order.uid || order.orderReference)}
                        className="cursor-pointer ml-auto inline-flex items-center justify-center gap-1.5 h-7 px-3 rounded-lg text-xs font-semibold !bg-amber-600 hover:!bg-amber-500 !text-white shadow-xs transition-colors"
                      >
                        <span>Finaliser le paiement</span>
                        <ArrowRight className="size-3.5 text-white" />
                      </a>
                    </>
                  )}

                  {!isPaid && !isPending && (
                    <div className="text-xs text-muted-foreground italic">
                      Commande clôturée — Preuve d'achat non disponible
                    </div>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
