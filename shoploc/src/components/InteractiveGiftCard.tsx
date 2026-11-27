import * as React from 'react';
import { Button } from '@/components/ui/button';
import { GiftImage } from '@/components/GiftImage';
import {
  CatalogItemCard,
  CatalogItemCardSkeleton,
  CatalogStockBadge,
} from '@/components/CatalogItemCard';
import { useCart } from '@/hooks/useCart';
import { ROUTES } from '@/config/routes';
import { type LoyaltyGift, getGiftStockStatus } from '@/types/gift';
import { Coins, Store as StoreIcon, LogIn, ShoppingBag, Check, Lock } from 'lucide-react';

export interface InteractiveGiftCardProps {
  gift: LoyaltyGift;
  userPoints: number | null;
  isAuthenticated: boolean;
  isLoadingUserPoints?: boolean;
  isVfp?: boolean;
  hasPriorPurchase?: boolean;
}

export function InteractiveGiftCard({
  gift,
  userPoints,
  isAuthenticated,
  isLoadingUserPoints: _isLoadingUserPoints = false,
  isVfp = false,
  hasPriorPurchase = true,
}: InteractiveGiftCardProps) {
  const { addItem, totalPointsCost } = useCart();
  const [justAdded, setJustAdded] = React.useState(false);

  const stockStatus = getGiftStockStatus(gift.stock);
  const isOutOfStock = stockStatus === 'OUT_OF_STOCK';
  const isVfpLocked = Boolean(gift.vfpExclusive) && !isVfp;

  const hasUserPoints = isAuthenticated && userPoints !== null;
  const availableAfterCart = hasUserPoints ? Math.max(0, (userPoints ?? 0) - totalPointsCost) : 0;
  const isAffordable = hasUserPoints && availableAfterCart >= gift.pointsCost;
  const missingPoints = hasUserPoints ? Math.max(0, gift.pointsCost - availableAfterCart) : 0;

  const handleAddGiftToCart = () => {
    const res = addItem({
      productUid: gift.uid,
      storeUid: gift.storeUid,
      storeName: gift.storeName || undefined,
      name: gift.name,
      price: 0,
      imageUrl: gift.imageUrl,
      quantity: 1,
      maxStock: gift.stock,
      itemType: 'GIFT',
      pointsCost: gift.pointsCost,
    });
    if (res.success) {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1800);
    }
  };

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
        ) : !hasPriorPurchase ? (
          <Button
            type="button"
            variant="outline"
            disabled
            className="w-full h-8 text-xs gap-1.5 opacity-80 cursor-not-allowed"
            title="Un achat antérieur chez ce commerçant est requis pour commander ce cadeau"
          >
            <Lock className="size-3.5 shrink-0" />
            <span>Achat antérieur requis</span>
          </Button>
        ) : isAffordable ? (
          <Button
            type="button"
            className="w-full h-8 text-xs gap-1.5 font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
            onClick={handleAddGiftToCart}
          >
            {justAdded ? (
              <>
                <Check className="size-3.5" />
                <span>Ajouté au panier</span>
              </>
            ) : (
              <>
                <ShoppingBag className="size-3.5" />
                <span>Ajouter au panier — {gift.pointsCost} pts</span>
              </>
            )}
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
