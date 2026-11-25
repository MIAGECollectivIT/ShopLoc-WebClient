import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import { InteractiveGiftCardSkeleton } from '@/components/InteractiveGiftCard';
import { PhysicalGiftSelectionCard } from '@/components/PhysicalGiftSelectionCard';
import { PhysicalGiftConfirmDialog } from '@/components/PhysicalGiftConfirmDialog';
import { getStoreGifts, getCustomerPointsBalanceForMerchant, redeemPhysicalGifts } from '@/lib/api';
import type { CustomerIdentificationResponse } from '@/types/user';
import type { LoyaltyGift, PhysicalGiftRedemptionResponse } from '@/types/gift';
import {
  Gift,
  Coins,
  UserCheck,
  QrCode,
  ShieldCheck,
  Store,
  ArrowLeft,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PhysicalGiftRedemptionViewProps {
  storeUid: string;
  storeName?: string;
  customer: CustomerIdentificationResponse;
  onCancel: () => void;
  onSuccess: (receipt: PhysicalGiftRedemptionResponse) => void;
  className?: string;
}

/**
 * Merchant physical gift redemption view (Story SLE-43).
 * Displays all active store gifts (without stock display/check), live customer points balance,
 * multi-gift selection with quantities, live total points accumulation, and pre-confirmation
 * balance re-verification before atomic deduction.
 */
export function PhysicalGiftRedemptionView({
  storeUid,
  storeName,
  customer,
  onCancel,
  onSuccess,
  className,
}: PhysicalGiftRedemptionViewProps) {
  const [gifts, setGifts] = React.useState<LoyaltyGift[]>([]);
  const [isLoadingGifts, setIsLoadingGifts] = React.useState(true);
  const [giftsError, setGiftsError] = React.useState<string | null>(null);

  const [customerPoints, setCustomerPoints] = React.useState<number | null>(null);
  const [isLoadingPoints, setIsLoadingPoints] = React.useState(true);
  const [pointsError, setPointsError] = React.useState<string | null>(null);

  const [selectedQuantities, setSelectedQuantities] = React.useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = React.useState('');

  const [isVerifyingBalance, setIsVerifyingBalance] = React.useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const idempotencyKeyRef = React.useRef<string | null>(null);

  const customerLookupId = customer.publicId || customer.clientCode;
  const customerDisplayName = `${customer.firstName} ${customer.lastNameMasked}`.trim();

  const loadGifts = React.useCallback(async () => {
    setIsLoadingGifts(true);
    setGiftsError(null);
    try {
      const items = await getStoreGifts(storeUid, false);
      setGifts(items);
    } catch (err: unknown) {
      setGiftsError(
        err instanceof Error
          ? err.message
          : 'Impossible de charger les cadeaux fidélité du commerce.'
      );
    } finally {
      setIsLoadingGifts(false);
    }
  }, [storeUid]);

  const loadCustomerPoints = React.useCallback(async () => {
    setIsLoadingPoints(true);
    setPointsError(null);
    try {
      const balance = await getCustomerPointsBalanceForMerchant(customerLookupId);
      setCustomerPoints(balance);
    } catch (err: unknown) {
      setPointsError(
        err instanceof Error ? err.message : 'Impossible de récupérer le solde de points du client.'
      );
    } finally {
      setIsLoadingPoints(false);
    }
  }, [customerLookupId]);

  React.useEffect(() => {
    loadGifts();
    loadCustomerPoints();
  }, [loadGifts, loadCustomerPoints]);

  const handleIncrement = (gift: LoyaltyGift) => {
    setValidationError(null);
    idempotencyKeyRef.current = null;
    setSelectedQuantities((prev) => {
      const current = prev[gift.uid] ?? 0;
      if (current >= 100) return prev;
      return { ...prev, [gift.uid]: current + 1 };
    });
  };

  const handleDecrement = (gift: LoyaltyGift) => {
    setValidationError(null);
    idempotencyKeyRef.current = null;
    setSelectedQuantities((prev) => {
      const current = prev[gift.uid] ?? 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[gift.uid];
        return next;
      }
      return { ...prev, [gift.uid]: current - 1 };
    });
  };

  const handleRemove = (gift: LoyaltyGift) => {
    setValidationError(null);
    idempotencyKeyRef.current = null;
    setSelectedQuantities((prev) => {
      const next = { ...prev };
      delete next[gift.uid];
      return next;
    });
  };

  const selectedItems = React.useMemo(() => {
    return gifts
      .filter((g) => (selectedQuantities[g.uid] ?? 0) > 0)
      .map((gift) => {
        const quantity = selectedQuantities[gift.uid] ?? 0;
        return {
          gift,
          quantity,
          subtotalPoints: gift.pointsCost * quantity,
        };
      });
  }, [gifts, selectedQuantities]);

  const totalUnits = React.useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.quantity, 0),
    [selectedItems]
  );

  const totalSelectedPoints = React.useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.subtotalPoints, 0),
    [selectedItems]
  );

  const availablePoints = customerPoints ?? 0;
  const projectedRemainingPoints = availablePoints - totalSelectedPoints;
  const hasInsufficientPoints = customerPoints !== null && totalSelectedPoints > customerPoints;

  const filteredGifts = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return gifts;
    return gifts.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.description && g.description.toLowerCase().includes(q))
    );
  }, [gifts, searchQuery]);

  /**
   * Queries the live customer points balance and verifies it covers the current selection.
   */
  const verifyFreshBalance = async (): Promise<boolean> => {
    const freshBalance = await getCustomerPointsBalanceForMerchant(customerLookupId);
    setCustomerPoints(freshBalance);
    setPointsError(null);

    if (freshBalance < totalSelectedPoints) {
      const missing = (totalSelectedPoints - freshBalance).toFixed(1);
      setValidationError(
        `Solde insuffisant au moment de la vérification : le client dispose de ${freshBalance.toFixed(1)} pts pour un total de ${totalSelectedPoints} pts (il manque ${missing} pts).`
      );
      return false;
    }

    return true;
  };

  /**
   * Re-verifies the customer's live balance right before opening the final confirmation dialog,
   * ensuring the customer still has enough points at validation time.
   */
  const handleRequestValidation = async () => {
    if (selectedItems.length === 0) return;

    setValidationError(null);
    setIsVerifyingBalance(true);

    try {
      const hasEnoughPoints = await verifyFreshBalance();
      if (!hasEnoughPoints) return;

      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current =
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      }
      setIsConfirmDialogOpen(true);
    } catch (err: unknown) {
      setValidationError(
        err instanceof Error
          ? err.message
          : 'Impossible de vérifier le solde du client avant confirmation.'
      );
    } finally {
      setIsVerifyingBalance(false);
    }
  };

  const handleConfirmRedemption = async () => {
    if (isSubmitting || selectedItems.length === 0) return;

    setValidationError(null);
    setIsSubmitting(true);

    try {
      const hasEnoughPoints = await verifyFreshBalance();
      if (!hasEnoughPoints) {
        setIsConfirmDialogOpen(false);
        return;
      }

      const response = await redeemPhysicalGifts(storeUid, {
        customerId: customer.publicId,
        clientCode: customer.clientCode,
        idempotencyKey: idempotencyKeyRef.current ?? undefined,
        items: selectedItems.map((item) => ({
          giftUid: item.gift.uid,
          quantity: item.quantity,
        })),
      });

      idempotencyKeyRef.current = null;
      setIsConfirmDialogOpen(false);
      onSuccess(response);
    } catch (err: unknown) {
      setValidationError(
        err instanceof Error ? err.message : 'Erreur lors de la validation de la remise de lots.'
      );
      setIsConfirmDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn('w-full space-y-6', className)}>
      {/* Top Context Card: Customer + Available Points + Running Total */}
      <Card className="border-border bg-card shadow-lg">
        <CardHeader className="pb-4">
          {storeName && (
            <div className="flex items-center gap-2 text-lg sm:text-xl font-bold text-foreground mb-1">
              <Store className="size-5 text-muted-foreground shrink-0" />
              <span className="truncate">{storeName}</span>
            </div>
          )}

          <CardTitle className="text-xl sm:text-2xl font-bold">
            Sélection des lots à remettre
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-muted-foreground">
            Sélectionnez un ou plusieurs cadeaux du magasin. Les points seront débités directement
            du solde fidélité du client lors de la validation.
          </CardDescription>

          {/* Customer Banner + Live Points Balance */}
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-10 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <UserCheck className="size-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-foreground flex items-center gap-1.5 truncate">
                    <span className="truncate">{customerDisplayName}</span>
                    <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="font-mono text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1">
                      <QrCode className="size-3" />
                      {customer.clientCode}
                    </span>
                  </div>
                </div>
              </div>
              <Badge
                variant="outline"
                className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/5 text-[10px] shrink-0"
              >
                Client vérifié
              </Badge>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="size-10 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Coins className="size-5" />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground font-medium block">
                    Points disponibles du client
                  </span>
                  {isLoadingPoints ? (
                    <span className="text-sm font-semibold text-muted-foreground animate-pulse">
                      Chargement du solde...
                    </span>
                  ) : pointsError ? (
                    <span className="text-xs font-semibold text-destructive">{pointsError}</span>
                  ) : (
                    <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
                      {availablePoints.toFixed(1)}{' '}
                      <span className="text-xs font-semibold">pts</span>
                    </span>
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={loadCustomerPoints}
                disabled={isLoadingPoints}
                className="size-8 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                title="Actualiser le solde du client"
                aria-label="Actualiser le solde"
              >
                <RefreshCw className={cn('size-4', isLoadingPoints && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Live Accumulation & Validation Bar */}
        <CardContent className="pt-0 space-y-3">
          {validationError && (
            <div
              className="p-3 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-xs flex items-start gap-2"
              role="alert"
            >
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          <div
            className={cn(
              'p-4 rounded-xl border flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors',
              hasInsufficientPoints
                ? 'bg-destructive/5 border-destructive/30'
                : 'bg-muted/30 border-border'
            )}
          >
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium block">
                  Lots sélectionnés
                </span>
                <span className="text-lg font-bold text-foreground tabular-nums">
                  {totalUnits} {totalUnits > 1 ? 'articles' : 'article'}
                </span>
              </div>

              <div className="h-8 w-px bg-border hidden sm:block" />

              <div>
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium block">
                  Total à débiter
                </span>
                <span className="text-lg font-extrabold tabular-nums flex items-center gap-1 text-red-600 dark:text-red-400">
                  <Coins className="size-4" />-{totalSelectedPoints} pts
                </span>
              </div>

              {customerPoints !== null && (
                <>
                  <div className="h-8 w-px bg-border hidden sm:block" />
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium block">
                      {hasInsufficientPoints ? 'Points manquants' : 'Solde après remise'}
                    </span>
                    <span
                      className={cn(
                        'text-lg font-bold tabular-nums',
                        hasInsufficientPoints
                          ? 'text-destructive'
                          : 'text-emerald-600 dark:text-emerald-400'
                      )}
                    >
                      {hasInsufficientPoints
                        ? `-${Math.abs(projectedRemainingPoints).toFixed(1)} pts`
                        : `${projectedRemainingPoints.toFixed(1)} pts`}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={isVerifyingBalance || isSubmitting}
                className="text-xs gap-1.5"
              >
                <ArrowLeft className="size-3.5" />
                <span>Retour client</span>
              </Button>

              <Button
                type="button"
                disabled={
                  selectedItems.length === 0 ||
                  hasInsufficientPoints ||
                  isLoadingPoints ||
                  pointsError !== null ||
                  isVerifyingBalance ||
                  isSubmitting
                }
                onClick={handleRequestValidation}
                className="h-10 px-5 gap-2 text-xs sm:text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
              >
                {isVerifyingBalance ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Vérification du solde...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4" />
                    <span>Valider la transaction ({totalSelectedPoints} pts)</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search filter */}
      {!isLoadingGifts && gifts.length > 0 && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Filtrer les cadeaux du magasin..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card h-9 text-xs"
          />
        </div>
      )}

      {/* Gifts Grid */}
      {isLoadingGifts ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <InteractiveGiftCardSkeleton key={i} />
          ))}
        </div>
      ) : giftsError ? (
        <Card className="p-8 text-center border-destructive/20 space-y-3">
          <AlertCircle className="size-8 text-destructive mx-auto" />
          <p className="text-sm font-medium text-destructive">{giftsError}</p>
          <Button type="button" variant="outline" size="sm" onClick={loadGifts} className="gap-1.5">
            <RefreshCw className="size-3.5" />
            <span>Réessayer</span>
          </Button>
        </Card>
      ) : gifts.length === 0 ? (
        <Empty className="border border-border rounded-xl bg-card p-12">
          <EmptyHeader>
            <EmptyMedia>
              <Gift className="size-10 text-muted-foreground stroke-1" />
            </EmptyMedia>
            <EmptyTitle>Aucun cadeau configuré</EmptyTitle>
            <EmptyDescription>
              Ce commerce ne dispose d'aucun cadeau actif à remettre pour le moment.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : filteredGifts.length === 0 ? (
        <Empty className="border border-border rounded-xl bg-card p-10">
          <EmptyHeader>
            <EmptyMedia>
              <Search className="size-8 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>Aucun lot trouvé</EmptyTitle>
            <EmptyDescription>Aucun cadeau ne correspond à votre recherche.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGifts.map((gift) => (
            <PhysicalGiftSelectionCard
              key={gift.uid}
              gift={gift}
              quantity={selectedQuantities[gift.uid] ?? 0}
              onIncrement={handleIncrement}
              onDecrement={handleDecrement}
              onRemove={handleRemove}
              disabled={isSubmitting || isVerifyingBalance}
            />
          ))}
        </div>
      )}

      {/* Confirmation Dialog */}
      <PhysicalGiftConfirmDialog
        open={isConfirmDialogOpen}
        onOpenChange={setIsConfirmDialogOpen}
        customerDisplayName={customerDisplayName}
        clientCode={customer.clientCode}
        selectedItems={selectedItems}
        availablePoints={availablePoints}
        totalSelectedPoints={totalSelectedPoints}
        projectedRemainingPoints={projectedRemainingPoints}
        isSubmitting={isSubmitting}
        onConfirm={handleConfirmRedemption}
      />
    </div>
  );
}
