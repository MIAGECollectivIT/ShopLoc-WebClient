import { Button } from '@/components/ui/button';
import { GiftImage } from '@/components/GiftImage';
import {
  CatalogItemCard,
  CatalogItemCardSkeleton,
  CatalogStockBadge,
} from '@/components/CatalogItemCard';
import { ROUTES } from '@/config/routes';
import { type LoyaltyGift, getGiftStockStatus } from '@/types/gift';
import { Coins, Store as StoreIcon, LogIn, Gift, Lock } from 'lucide-react';

export interface InteractiveGiftCardProps {
  gift: LoyaltyGift;
  userPoints: number | null;
  isAuthenticated: boolean;
  isLoadingUserPoints?: boolean;
  isVfp?: boolean;
}

export function InteractiveGiftCard({
  gift,
  userPoints,
  isAuthenticated,
  isLoadingUserPoints: _isLoadingUserPoints = false,
  isVfp = false,
}: InteractiveGiftCardProps) {
  const stockStatus = getGiftStockStatus(gift.stock);
  const isOutOfStock = stockStatus === 'OUT_OF_STOCK';
  const isVfpLocked = Boolean(gift.vfpExclusive) && !isVfp;

  const hasUserPoints = isAuthenticated && userPoints !== null;
  const currentPoints = userPoints ?? 0;
  const isAffordable = hasUserPoints && currentPoints >= gift.pointsCost;
  const missingPoints = hasUserPoints ? Math.max(0, gift.pointsCost - currentPoints) : 0;

  return (
    <CatalogItemCard
      className={gift.vfpExclusive ? 'border-amber-500/40 ring-1 ring-amber-500/15' : ''}
      media={
        <GiftImage
          storeUid={gift.storeUid}
          giftUid={gift.uid}
          imageUrl={gift.imageUrl}
          alt={gift.name}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
            isVfpLocked ? 'opacity-75 grayscale-[25%]' : ''
          }`}
          fallbackText="Visuel cadeau indisponible"
        />
      }
      topRightBadge={<CatalogStockBadge status={stockStatus} stock={gift.stock} />}
      eyebrow={
        gift.storeName ? (
          <a
            href={ROUTES.storeDetail(gift.storeUid)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-primary hover:underline transition-colors line-clamp-1"
            title={gift.storeName}
          >
            <StoreIcon className="size-3 text-primary shrink-0" />
            <span className="truncate max-w-[200px]">{gift.storeName}</span>
          </a>
        ) : undefined
      }
      title={gift.name}
      valueSlot={
        <span className="font-bold text-base text-amber-600 dark:text-amber-400 whitespace-nowrap flex items-center gap-1 shrink-0">
          <Coins className="size-4 text-amber-500 fill-amber-500/20" />
          {gift.pointsCost} pts
        </span>
      }
      description={gift.description}
      footer={
        isVfpLocked ? (
          <Button
            type="button"
            variant="outline"
            disabled
            className="w-full h-8 text-xs gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 opacity-90 cursor-not-allowed"
          >
            <Lock className="size-3.5 shrink-0" />
            <span>Réservé VFP</span>
          </Button>
        ) : isOutOfStock ? (
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
              window.location.href = ROUTES.storeDetail(gift.storeUid);
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
        )
      }
    />
  );
}

export { CatalogItemCardSkeleton as InteractiveGiftCardSkeleton };
