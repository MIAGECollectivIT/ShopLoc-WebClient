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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    const targetId = order.uid || order.orderReference;
    try {
      setDownloadingId(targetId);
      setDownloadError(null);
      const { blob, filename } = await downloadOrderReceiptPdf(targetId, token || undefined);
      triggerBlobDownload(blob, filename);
    } catch (err) {
      console.error('Erreur téléchargement reçu PDF:', err);
      setDownloadError({
        id: targetId,
        message:
          err instanceof Error
            ? err.message
            : 'Erreur lors du téléchargement de la preuve d’achat.',
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
    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Mes Commandes Click & Collect</CardTitle>
              <CardDescription>
                Consultez l’historique de vos achats locaux et téléchargez vos preuves d’achat
                officielles
              </CardDescription>
            </div>
          </div>
          {!isLoading && orders.length > 0 && (
            <Badge variant="secondary" className="font-semibold text-xs px-2.5 py-1">
              {orders.length} {orders.length > 1 ? 'commandes' : 'commande'}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {/* Loading state */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3"
              >
                <div className="flex justify-between items-center">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-6 w-28 rounded-full" />
                </div>
                <Skeleton className="h-4 w-64" />
                <div className="flex justify-between items-center pt-2">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-9 w-36 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {!isLoading && error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-800 dark:text-red-300 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-sm">
              <p className="font-semibold">Erreur de chargement</p>
              <p className="mt-0.5">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchOrders}
                className="mt-3 bg-white dark:bg-slate-900 hover:bg-slate-50 text-xs gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Réessayer
              </Button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && orders.length === 0 && (
          <div className="text-center py-10 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Aucune commande pour le moment
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Composez votre panier parmi les commerces de proximité partenaires et profitez du
              Click & Collect !
            </p>
            <a
              href={ROUTES.catalog.path}
              className={buttonVariants({
                variant: 'default',
                size: 'sm',
                className: 'gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white',
              })}
            >
              Découvrir le catalogue
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        )}

        {/* Orders list */}
        {!isLoading && !error && orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((order) => {
              const orderKey = order.uid || order.orderReference;
              const isPaid = (order.status || '').toUpperCase() === 'PAID';
              const isPending = (order.status || '').toUpperCase() === 'PENDING_PAYMENT';
              const isDownloading = downloadingId === orderKey;
              const isResending = resendingId === orderKey;
              const resendSuccess = resendSuccessId === orderKey;
              const currentError =
                downloadError && downloadError.id === orderKey ? downloadError.message : null;

              return (
                <div
                  key={orderKey}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 transition-all hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60 shadow-sm"
                >
                  {/* Top row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                        {order.orderReference}
                      </span>
                    </div>
                    {renderStatusBadge(order.status)}
                  </div>

                  {/* Metadata & store details */}
                  <div className="py-3 text-sm grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1 text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-2 text-xs">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Commandé le {formatDate(order.createdAt)}</span>
                      </div>
                      {order.clientCode && (
                        <div className="text-xs font-mono text-slate-500">
                          Code fidélité :{' '}
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {order.clientCode}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 sm:text-right">
                      <div className="text-xs text-slate-500">Montant total</div>
                      <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {Number(order.totalAmount || 0).toFixed(2)} €
                      </div>
                    </div>
                  </div>

                  {/* Stores breakdown */}
                  {order.storeSummaries && order.storeSummaries.length > 0 && (
                    <div className="pt-2 pb-3 border-t border-slate-100 dark:border-slate-800/60">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-slate-400" />
                        Commerces partenaires ({order.storeSummaries.length})
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {order.storeSummaries.map((summary) => (
                          <div
                            key={summary.storeId}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                          >
                            <span className="font-semibold">{summary.storeName}</span>
                            <span className="text-slate-400">•</span>
                            <span>{summary.itemCount} art.</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              {Number(summary.subtotal || 0).toFixed(2)} €
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Error notice if download/resend failed */}
                  {currentError && (
                    <div className="mb-3 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{currentError}</span>
                    </div>
                  )}

                  {/* Success notice for email resend */}
                  {resendSuccess && (
                    <div className="mb-3 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      <span>Preuve d’achat renvoyée par email avec succès !</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    {isPaid && (
                      <>
                        <div className="text-xs text-slate-500 italic">
                          Présentez votre QR Code ou le PDF en boutique pour le retrait
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isResending}
                            onClick={() => handleResendEmail(order)}
                            className="gap-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900"
                            title="Renvoyer la preuve d’achat par email avec la pièce jointe PDF"
                          >
                            {isResending ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Mail className="w-3.5 h-3.5 text-slate-500" />
                            )}
                            Renvoyer par email
                          </Button>

                          <Button
                            size="sm"
                            disabled={isDownloading}
                            onClick={() => handleDownload(order)}
                            className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
                          >
                            {isDownloading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <FileDown className="w-3.5 h-3.5" />
                            )}
                            Télécharger la preuve d'achat (PDF)
                          </Button>
                        </div>
                      </>
                    )}

                    {isPending && (
                      <>
                        <div className="text-xs text-amber-700 dark:text-amber-400">
                          Commande réservée (stocks verrouillés pendant 30 min)
                        </div>
                        <a
                          href={ROUTES.checkout.detail(order.uid || order.orderReference)}
                          className={buttonVariants({
                            size: 'sm',
                            className:
                              'ml-auto gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium',
                          })}
                        >
                          Finaliser le paiement
                          <ArrowRight className="w-3.5 h-3.5" />
                        </a>
                      </>
                    )}

                    {!isPaid && !isPending && (
                      <div className="text-xs text-slate-400 italic">
                        Commande clôturée — Preuve d'achat non disponible
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
