import * as React from 'react';
import { getStoreLoyaltyRate } from '@/lib/api';
import type { MerchantLoyaltyRate } from '@/types/loyalty';
import { Coins, Sparkles, Gift } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface StoreLoyaltyBannerProps {
  storeId: number;
  initialRate?: MerchantLoyaltyRate | null;
}

export function StoreLoyaltyBanner({ storeId, initialRate }: StoreLoyaltyBannerProps) {
  const [rate, setRate] = React.useState<MerchantLoyaltyRate | null>(initialRate || null);
  const [isLoading, setIsLoading] = React.useState(!initialRate);

  React.useEffect(() => {
    if (initialRate) {
      setRate(initialRate);
      return;
    }

    let isMounted = true;
    async function loadRate() {
      try {
        const data = await getStoreLoyaltyRate(storeId);
        if (isMounted) setRate(data);
      } catch {
        // Fallback default
        if (isMounted) {
          setRate({
            storeId,
            euroAmount: 1,
            pointsReward: 1,
          });
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadRate();
    return () => {
      isMounted = false;
    };
  }, [storeId, initialRate]);

  if (isLoading || !rate) {
    return null;
  }

  const euroStr = Number(rate.euroAmount).toFixed(2);
  const points = rate.pointsReward;

  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/25 bg-linear-to-r from-primary/10 via-primary/5 to-transparent p-3.5 sm:p-4 shadow-2xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
            <Gift className="size-5" />
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Programme Fidélité
              </span>
              <Badge
                variant="secondary"
                className="h-4 px-1.5 text-[10px] gap-1 font-normal bg-primary/15 text-primary border-primary/20"
              >
                <Sparkles className="size-2.5 text-amber-500 fill-amber-500" />
                Avantage Client
              </Badge>
            </div>
            <p className="text-sm text-foreground">
              Gagnez{' '}
              <strong className="text-primary font-bold">
                {points} {points > 1 ? 'points' : 'point'}
              </strong>{' '}
              tous les <strong className="font-semibold">{euroStr} €</strong> d'achats dans ce
              commerce !
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 self-center rounded-lg bg-background/80 px-3 py-1.5 border border-border/80 text-xs text-muted-foreground shadow-2xs">
          <Coins className="size-3.5 text-amber-500" />
          <span>Cumulez sur votre cagnotte ShopLoc</span>
        </div>
      </div>
    </div>
  );
}
