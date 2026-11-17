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
import { Skeleton } from '@/components/ui/skeleton';
import { GiftImage } from '@/components/GiftImage';
import { ROUTES } from '@/config/routes';
import { type LoyaltyGift, getGiftStockStatus } from '@/types/gift';
import {
  Coins,
  Store as StoreIcon,
  ExternalLink,
  Layers,
  CheckCircle2,
  Clock,
  LogIn,
  Sparkles,
} from 'lucide-react';

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
  isLoadingUserPoints = false,
}: InteractiveGiftCardProps) {
  const stockStatus = getGiftStockStatus(gift.stock);
  const isOutOfStock = stockStatus === 'OUT_OF_STOCK';

  // DRY: Centralized stock badge presentation
  const stockConfig = {
    IN_STOCK: { label: `En stock (${gift.stock})`, bg: 'bg-emerald-600/90' },
    LOW_STOCK: { label: `Plus que ${gift.stock}`, bg: 'bg-amber-500/90' },
    OUT_OF_STOCK: { label: 'Rupture', bg: 'bg-neutral-600/90' },
  }[stockStatus];

  // KISS & DRY: Points comparison
  const hasUserPoints = isAuthenticated && userPoints !== null;
  const currentPoints = userPoints ?? 0;
  const isAffordable = hasUserPoints && currentPoints >= gift.pointsCost;
  const missingPoints = hasUserPoints ? Math.max(0, gift.pointsCost - currentPoints) : 0;
  const remainingPoints = isAffordable ? currentPoints - gift.pointsCost : 0;
  const progressPercent = hasUserPoints
    ? Math.min(100, Math.round((currentPoints / gift.pointsCost) * 100))
    : 0;

  return (
    <Card
      className={`group flex flex-col justify-between overflow-hidden transition-all duration-200 ${
        isAffordable
          ? 'border-emerald-500/40 hover:border-emerald-500/70 hover:shadow-md hover:shadow-emerald-500/5'
          : 'border-border/80 hover:border-amber-500/40 hover:shadow-md'
      }`}
    >
      <div>
        {/* Photo with Stock & Category Badges */}
        <div className="relative aspect-4/3 w-full bg-muted overflow-hidden border-b border-border/60">
          <GiftImage
            storeId={gift.storeId}
            giftId={gift.id}
            imageUrl={gift.imageUrl}
            alt={gift.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />

          {/* Stock Status Badge */}
          <div className="absolute top-2.5 right-2.5 z-10">
            <Badge
              variant="secondary"
              className={`${stockConfig.bg} text-white font-medium text-[11px] shadow-xs`}
            >
              {stockConfig.label}
            </Badge>
          </div>

          {/* Category Pill */}
          {gift.category && (
            <div className="absolute bottom-2.5 left-2.5 z-10">
              <Badge
                variant="outline"
                className="bg-background/90 text-foreground border-border/70 text-[10px] backdrop-blur-xs"
              >
                <Layers className="size-3 mr-1 text-muted-foreground" />
                {gift.category}
              </Badge>
            </div>
          )}

          {/* Accessible Tag */}
          {isAffordable && (
            <div className="absolute top-2.5 left-2.5 z-10">
              <Badge className="bg-emerald-500 text-white font-semibold text-[10px] shadow-xs border border-white/20 gap-1 px-2 py-0.5">
                <Sparkles className="size-3" />
                Accessible
              </Badge>
            </div>
          )}
        </div>

        {/* Card Header with store and title */}
        <CardHeader className="p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <StoreIcon className="size-3.5 text-primary shrink-0" />
            <a
              href={ROUTES.storeDetail(gift.storeId)}
              className="truncate hover:text-primary hover:underline"
              title={gift.storeName || `Commerce #${gift.storeId}`}
            >
              {gift.storeName || `Commerce #${gift.storeId}`}
            </a>
          </div>

          <CardTitle className="text-base font-semibold leading-snug line-clamp-1 group-hover:text-primary transition-colors">
            {gift.name}
          </CardTitle>

          {gift.description && (
            <CardDescription className="text-xs line-clamp-2 leading-relaxed">
              {gift.description}
            </CardDescription>
          )}
        </CardHeader>
      </div>

      {/* CardContent: Points cost & Interactive Gauge */}
      <CardContent className="p-4 pt-0 space-y-3">
        <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-lg">
              <Coins className="size-5 fill-amber-500/20 text-amber-500" />
              <span>{gift.pointsCost}</span>
              <span className="text-xs font-medium text-muted-foreground">pts requis</span>
            </div>

            {/* Comparison Badge */}
            {isLoadingUserPoints ? (
              <span className="text-[11px] text-muted-foreground animate-pulse">Calcul...</span>
            ) : hasUserPoints ? (
              isAffordable ? (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-medium text-[11px] gap-1 px-2 py-0.5">
                  <CheckCircle2 className="size-3 shrink-0" />
                  <span>Solde suffisant</span>
                </Badge>
              ) : (
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-medium text-[11px] gap-1 px-2 py-0.5">
                  <Clock className="size-3 shrink-0" />
                  <span>Manque {missingPoints} pts</span>
                </Badge>
              )
            ) : (
              <a
                href={`/login?redirect=${encodeURIComponent('/gifts')}`}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
                title="Connectez-vous pour voir votre progression"
              >
                <LogIn className="size-3" />
                <span>Se connecter</span>
              </a>
            )}
          </div>

          {/* Interactive Progress Gauge */}
          <div className="space-y-1">
            <div
              className="w-full h-2 rounded-full bg-muted/60 overflow-hidden"
              role="progressbar"
              aria-label={`Progression points pour ${gift.name}`}
              aria-valuenow={hasUserPoints ? currentPoints : 0}
              aria-valuemin={0}
              aria-valuemax={gift.pointsCost}
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  !hasUserPoints
                    ? 'bg-muted-foreground/20 w-0'
                    : isAffordable
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              {hasUserPoints ? (
                <>
                  <span>
                    Votre solde : <strong className="text-foreground">{currentPoints} pts</strong>
                  </span>
                  <span>{progressPercent}%</span>
                </>
              ) : (
                <span className="text-[10px] text-muted-foreground">
                  Connectez-vous pour comparer vos points fidélité
                </span>
              )}
            </div>
          </div>

          {/* Hint */}
          {hasUserPoints && (
            <p className="text-[10px] text-muted-foreground leading-tight pt-0.5">
              {isAffordable ? (
                <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                  ✓ Vous pouvez obtenir ce lot ! (Reste {remainingPoints} pts après échange)
                </span>
              ) : (
                <span>
                  Cumulez encore <strong className="text-foreground">{missingPoints} points</strong>{' '}
                  lors de vos prochains achats.
                </span>
              )}
            </p>
          )}
        </div>
      </CardContent>

      {/* CardFooter: Action button & Location */}
      <CardFooter className="p-4 pt-0 border-t-0 bg-transparent flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {isOutOfStock ? (
            <span className="text-destructive font-medium">Stock indisponible</span>
          ) : (
            'Retrait chez le commerçant'
          )}
        </span>

        <Button
          variant={isAffordable && !isOutOfStock ? 'default' : 'outline'}
          size="sm"
          disabled={isOutOfStock}
          className={`h-8 text-xs gap-1.5 transition-colors ${
            isAffordable && !isOutOfStock
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'hover:bg-primary hover:text-primary-foreground'
          }`}
          onClick={() => {
            window.location.href = `/stores/${gift.storeId}?tab=client`;
          }}
        >
          <span>{isAffordable && !isOutOfStock ? 'Obtenir le cadeau' : "Voir l'offre"}</span>
          <ExternalLink className="size-3" />
        </Button>
      </CardFooter>
    </Card>
  );
}

/**
 * Co-located skeleton component for loading states (DRY principle).
 */
export function InteractiveGiftCardSkeleton() {
  return (
    <Card className="group flex flex-col justify-between overflow-hidden border-border bg-card rounded-xl">
      <div>
        <Skeleton className="aspect-4/3 w-full rounded-none" />
        <CardHeader className="p-4 space-y-2">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3.5 w-full" />
        </CardHeader>
      </div>
      <CardContent className="p-4 pt-0 space-y-2">
        <Skeleton className="h-20 w-full rounded-lg" />
      </CardContent>
      <CardFooter className="p-4 pt-0 border-t-0 bg-transparent flex items-center justify-between">
        <Skeleton className="h-3.5 w-1/4" />
        <Skeleton className="h-8 w-28 rounded-md" />
      </CardFooter>
    </Card>
  );
}
