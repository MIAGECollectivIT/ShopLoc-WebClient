import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import { useAuth } from '@/lib/auth';
import { getPublicGifts } from '@/lib/api';
import { useCustomerLoyaltyStatus } from '@/hooks/useCustomerLoyaltyStatus';
import type { LoyaltyGift } from '@/types/gift';
import { InteractiveGiftCard, InteractiveGiftCardSkeleton } from './InteractiveGiftCard';
import { VfpPrivilegesBanner } from './VfpPrivilegesBanner';
import { VfpBenefitsDialog } from './VfpBenefitsDialog';
import { Gift, Coins, RefreshCw, AlertCircle, Crown } from 'lucide-react';

export interface StoreClientGiftsCatalogProps {
  storeUid: string;
  storeName?: string;
  catalogMode?: 'standard' | 'vfp';
}

export function StoreClientGiftsCatalog({
  storeUid,
  storeName,
  catalogMode = 'standard',
}: StoreClientGiftsCatalogProps) {
  const { user, token, isAuthenticated } = useAuth();
  const isVfpTab = catalogMode === 'vfp';

  const [gifts, setGifts] = React.useState<LoyaltyGift[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // User loyalty points & VFP status
  const { userPoints, availablePoints, isLoadingPoints, vfpStatus, isVfp, eligibleStoreUids } =
    useCustomerLoyaltyStatus(isAuthenticated, user?.id, token);
  const [isVfpDialogOpen, setIsVfpDialogOpen] = React.useState(false);

  // Load active gifts for this store
  const loadGifts = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await getPublicGifts({ storeUid });
      setGifts(items);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de charger les cadeaux fidélité de ce commerce.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [storeUid]);

  React.useEffect(() => {
    loadGifts();
  }, [loadGifts]);

  const displayedGifts = React.useMemo(
    () => gifts.filter((g) => (isVfpTab ? Boolean(g.vfpExclusive) : !g.vfpExclusive)),
    [gifts, isVfpTab]
  );

  return (
    <div className="space-y-6">
      {/* Header toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              {isVfpTab ? (
                <Crown className="size-5 text-amber-600 dark:text-amber-400" />
              ) : (
                <Gift className="size-5 text-primary" />
              )}
              <span>{isVfpTab ? 'Privilèges VFP' : 'Cadeaux'}</span>
            </h2>
            <Badge variant="secondary" className="font-mono text-xs">
              {displayedGifts.length} {displayedGifts.length > 1 ? 'lots' : 'lot'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isVfpTab
              ? `Sélection exclusive réservée aux membres VFP chez ${storeName || 'ce commerce'}.`
              : `Échangez vos points contre ces récompenses offertes par ${storeName || 'ce commerce'}.`}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* User balance pill if authenticated */}
          {isAuthenticated && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 font-medium">
              <Coins className="size-3.5 text-amber-500" />
              <span>Votre solde :</span>
              <strong>{isLoadingPoints ? '...' : `${userPoints ?? 0} pts`}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Contextual VFP banner when viewing VFP-exclusive gifts */}
      {isVfpTab && (
        <VfpPrivilegesBanner
          isVfp={isVfp}
          isAuthenticated={isAuthenticated}
          currentTransactionCount={vfpStatus?.currentTransactionCount}
          onOpenVfpDialog={() => setIsVfpDialogOpen(true)}
        />
      )}

      {/* Gifts Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <InteractiveGiftCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-card border border-destructive/20 rounded-xl space-y-3">
          <AlertCircle className="size-8 text-destructive mx-auto" />
          <p className="text-sm font-medium text-destructive">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadGifts}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className="size-3.5" />
            <span>Réessayer</span>
          </Button>
        </div>
      ) : displayedGifts.length === 0 ? (
        <Empty className="border border-border rounded-xl bg-card p-12">
          <EmptyHeader>
            <EmptyMedia>
              {isVfpTab ? (
                <Crown className="size-10 text-amber-500 stroke-1" />
              ) : (
                <Gift className="size-10 text-muted-foreground stroke-1" />
              )}
            </EmptyMedia>
            <EmptyTitle>
              {isVfpTab
                ? 'Aucun cadeau exclusif VFP pour le moment'
                : 'Aucun cadeau pour le moment'}
            </EmptyTitle>
            <EmptyDescription>
              {isVfpTab
                ? `${storeName || 'Ce commerce'} n'a pas encore publié de récompenses réservées aux membres VFP.`
                : `${storeName || 'Ce commerce'} n'a pas encore configuré de catalogue de récompenses fidélité.`}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedGifts.map((gift) => (
            <InteractiveGiftCard
              key={gift.uid}
              gift={gift}
              userPoints={availablePoints}
              isAuthenticated={isAuthenticated}
              isLoadingUserPoints={isLoadingPoints}
              isVfp={isVfp}
              hasPriorPurchase={eligibleStoreUids.includes(gift.storeUid)}
            />
          ))}
        </div>
      )}

      <VfpBenefitsDialog
        isOpen={isVfpDialogOpen}
        onClose={() => setIsVfpDialogOpen(false)}
        isVfp={isVfp}
        currentTransactionCount={vfpStatus?.currentTransactionCount}
      />
    </div>
  );
}
