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
import { getPublicGifts, getUserPointsBalance } from '@/lib/api';
import type { LoyaltyGift } from '@/types/gift';
import { InteractiveGiftCard, InteractiveGiftCardSkeleton } from './InteractiveGiftCard';
import { Gift, Coins, RefreshCw, AlertCircle } from 'lucide-react';

export interface StoreClientGiftsCatalogProps {
  storeId: number | string;
  storeName?: string;
}

export function StoreClientGiftsCatalog({ storeId, storeName }: StoreClientGiftsCatalogProps) {
  const { user, token, isAuthenticated } = useAuth();

  const [gifts, setGifts] = React.useState<LoyaltyGift[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // User loyalty points balance
  const [userPoints, setUserPoints] = React.useState<number | null>(null);
  const [isLoadingPoints, setIsLoadingPoints] = React.useState(false);

  // Fetch user loyalty points if authenticated
  React.useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setUserPoints(null);
      return;
    }

    let isMounted = true;
    setIsLoadingPoints(true);

    getUserPointsBalance(user.id, token || undefined)
      .then((res) => {
        if (isMounted) {
          const balance = typeof res.balance === 'number' ? res.balance : (res.points ?? 0);
          setUserPoints(balance);
        }
      })
      .catch(() => {
        if (isMounted) setUserPoints(0);
      })
      .finally(() => {
        if (isMounted) setIsLoadingPoints(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user?.id, token]);

  // Load active gifts for this store
  const loadGifts = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await getPublicGifts({ storeId });
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
  }, [storeId]);

  React.useEffect(() => {
    loadGifts();
  }, [loadGifts]);

  return (
    <div className="space-y-6">
      {/* Header toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Gift className="size-5 text-primary" />
              <span>Cadeaux Fidélité</span>
            </h2>
            <Badge variant="secondary" className="font-mono text-xs">
              {gifts.length} {gifts.length > 1 ? 'lots' : 'lot'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Échangez vos points contre ces récompenses offertes par{' '}
            <strong className="text-foreground">{storeName || 'ce commerce'}</strong>.
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
      ) : gifts.length === 0 ? (
        <Empty className="border border-border rounded-xl bg-card p-12">
          <EmptyHeader>
            <EmptyMedia>
              <Gift className="size-10 text-muted-foreground stroke-1" />
            </EmptyMedia>
            <EmptyTitle>Aucun cadeau pour le moment</EmptyTitle>
            <EmptyDescription>
              {storeName || 'Ce commerce'} n'a pas encore configuré de catalogue de récompenses
              fidélité.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {gifts.map((gift) => (
            <InteractiveGiftCard
              key={gift.id}
              gift={gift}
              userPoints={userPoints}
              isAuthenticated={isAuthenticated}
              isLoadingUserPoints={isLoadingPoints}
            />
          ))}
        </div>
      )}
    </div>
  );
}
