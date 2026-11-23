import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GiftImage } from '@/components/GiftImage';
import { ROUTES } from '@/config/routes';
import { type LoyaltyGift, getGiftStockStatus } from '@/types/gift';
import { Coins, Store as StoreIcon, CheckCircle2, LogIn, Gift } from 'lucide-react';

export interface InteractiveGiftCardProps {
  gift: LoyaltyGift;
  userPoints: number | null;
  isAuthenticated: boolean;
  isLoadingUserPoints?: boolean;
}

export function InteractiveGiftCard({
  gift,
  userPoints,
  isAuthenticated,
  isLoadingUserPoints: _isLoadingUserPoints = false,
}: InteractiveGiftCardProps) {
  const stockStatus = getGiftStockStatus(gift.stock);
  const isOutOfStock = stockStatus === 'OUT_OF_STOCK';

  const hasUserPoints = isAuthenticated && userPoints !== null;
  const currentPoints = userPoints ?? 0;
  const isAffordable = hasUserPoints && currentPoints >= gift.pointsCost;
  const missingPoints = hasUserPoints ? Math.max(0, gift.pointsCost - currentPoints) : 0;

  return (
    <Card className="group flex flex-col justify-between overflow-hidden border-border hover:shadow-lg transition-all duration-200 bg-card rounded-xl">
      <div>
        {/* Image container aligned with Product Cards */}
        <div className="relative aspect-4/3 w-full bg-muted/60 overflow-hidden flex items-center justify-center border-b border-border">
          <GiftImage
            storeId={gift.storeId}
            giftId={gift.id}
            imageUrl={gift.imageUrl}
            alt={gift.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            fallbackText="Visuel cadeau indisponible"
          />

          {/* Stock status badge aligned with Product Cards */}
          <div className="absolute top-2.5 right-2.5">
            {stockStatus === 'IN_STOCK' && (
              <span className="bg-emerald-500/95 text-white font-medium text-[11px] px-2.5 py-0.5 rounded-full shadow-xs backdrop-blur-xs flex items-center gap-1">
                <CheckCircle2 className="size-3" />
                En stock
              </span>
            )}
            {stockStatus === 'LOW_STOCK' && (
              <span className="bg-amber-500/95 text-white font-medium text-[11px] px-2.5 py-0.5 rounded-full shadow-xs backdrop-blur-xs">
                Plus que {gift.stock} dispo !
              </span>
            )}
            {stockStatus === 'OUT_OF_STOCK' && (
              <span className="bg-rose-600/95 text-white font-medium text-[11px] px-2.5 py-0.5 rounded-full shadow-xs backdrop-blur-xs">
                Rupture
              </span>
            )}
          </div>
        </div>

        {/* Body Content aligned with Product Cards */}
        <CardHeader className="p-4 pb-2 space-y-1">
          {gift.storeName && (
            <a
              href={ROUTES.storeDetail(gift.storeId)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors line-clamp-1 mb-0.5"
              title={gift.storeName}
            >
              <StoreIcon className="size-3 shrink-0" />
              <span>{gift.storeName}</span>
            </a>
          )}

          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base font-semibold text-foreground line-clamp-1">
              {gift.name}
            </CardTitle>
            <span className="font-bold text-base text-amber-600 dark:text-amber-400 whitespace-nowrap flex items-center gap-1 shrink-0">
              <Coins className="size-4 text-amber-500 fill-amber-500/20" />
              {gift.pointsCost} pts
            </span>
          </div>

          {gift.description && (
            <CardDescription className="text-xs line-clamp-2 text-muted-foreground pt-1">
              {gift.description}
            </CardDescription>
          )}
        </CardHeader>
      </div>

      {/* Footer action area aligned with Product Cards */}
      <div className="p-4 pt-2 border-t border-border/50 bg-muted/20 space-y-2">
        {isOutOfStock ? (
          <Button
            type="button"
            variant="secondary"
            disabled
            className="w-full h-8 text-xs opacity-60 cursor-not-allowed"
          >
            Victime de son succès (Rupture)
          </Button>
        ) : !isAuthenticated ? (
          <Button
            type="button"
            variant="outline"
            className="w-full h-8 text-xs gap-1.5 hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
            onClick={() => {
              window.location.href = `/login?redirect=${encodeURIComponent('/gifts')}`;
            }}
          >
            <LogIn className="size-3.5" />
            <span>Se connecter pour débloquer</span>
          </Button>
        ) : isAffordable ? (
          <Button
            type="button"
            className="w-full h-8 text-xs gap-1.5 font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
            onClick={() => {
              window.location.href = ROUTES.storeDetail(gift.storeId);
            }}
          >
            <Gift className="size-3.5" />
            <span>Échanger chez le commerçant</span>
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled
            className="w-full h-8 text-xs gap-1.5 opacity-80 cursor-not-allowed"
          >
            <Coins className="size-3.5 text-amber-500" />
            <span>Il vous manque {missingPoints} pts</span>
          </Button>
        )}
      </div>
    </Card>
  );
}

/**
 * Co-located skeleton component for loading states (DRY principle).
 */
export function InteractiveGiftCardSkeleton() {
  return (
    <div className="border border-border rounded-xl p-4 space-y-3 bg-card animate-pulse">
      <div className="aspect-4/3 bg-muted rounded-lg" />
      <div className="h-4 bg-muted rounded w-2/3" />
      <div className="h-3 bg-muted rounded w-1/3" />
      <div className="h-8 bg-muted rounded" />
    </div>
  );
}
