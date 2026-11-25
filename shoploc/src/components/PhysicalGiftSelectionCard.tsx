import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GiftImage } from '@/components/GiftImage';
import type { LoyaltyGift } from '@/types/gift';
import { Coins, Check, Plus, Minus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PhysicalGiftSelectionCardProps {
  gift: LoyaltyGift;
  quantity: number;
  onIncrement: (gift: LoyaltyGift) => void;
  onDecrement: (gift: LoyaltyGift) => void;
  onRemove?: (gift: LoyaltyGift) => void;
  disabled?: boolean;
}

/**
 * Replicated gift card from the store gift catalog for in-store merchant selection.
 * Intentionally omits stock badges and stock checks since physical redemption uses on-site stock.
 */
export function PhysicalGiftSelectionCard({
  gift,
  quantity,
  onIncrement,
  onDecrement,
  onRemove,
  disabled = false,
}: PhysicalGiftSelectionCardProps) {
  const isSelected = quantity > 0;
  const subtotalPoints = gift.pointsCost * quantity;

  return (
    <Card
      className={cn(
        'group flex flex-col justify-between overflow-hidden transition-all duration-200 bg-card rounded-xl',
        isSelected
          ? 'border-2 border-zinc-400 dark:border-zinc-500 ring-2 ring-zinc-400/20 shadow-md'
          : 'border-border hover:shadow-lg'
      )}
    >
      <div>
        {/* Image container aligned with Store Gift Cards (no stock badge for physical redemption) */}
        <div className="relative aspect-4/3 w-full bg-muted/60 overflow-hidden flex items-center justify-center border-b border-border">
          <GiftImage
            storeUid={gift.storeUid}
            giftUid={gift.uid}
            imageUrl={gift.imageUrl}
            alt={gift.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            fallbackText="Visuel cadeau indisponible"
          />

          {isSelected && (
            <div className="absolute top-2.5 right-2.5">
              <Badge className="bg-zinc-700 text-white border-none font-semibold text-xs px-2.5 py-0.5 shadow-sm gap-1">
                <Check className="size-3" />
                <span>×{quantity}</span>
              </Badge>
            </div>
          )}
        </div>

        {/* Body Content aligned with Store Gift Cards */}
        <CardHeader className="p-4 pb-2 space-y-1">
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

      {/* Footer selection controls */}
      <div className="p-4 pt-2 border-t border-border/50 bg-muted/20 space-y-2">
        {!isSelected ? (
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => onIncrement(gift)}
            className="w-full h-9 text-xs gap-1.5 font-semibold hover:bg-zinc-700 hover:text-white hover:border-zinc-700 transition-colors cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>Sélectionner ({gift.pointsCost} pts)</span>
          </Button>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center rounded-lg border border-zinc-400/50 dark:border-zinc-600 bg-background p-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled}
                onClick={() => onDecrement(gift)}
                className="size-7 text-foreground hover:bg-muted"
                aria-label={`Retirer un exemplaire de ${gift.name}`}
              >
                <Minus className="size-3.5" />
              </Button>
              <span className="min-w-8 text-center text-xs font-bold tabular-nums">{quantity}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled || quantity >= 100}
                onClick={() => onIncrement(gift)}
                className="size-7 text-foreground hover:bg-muted"
                aria-label={`Ajouter un exemplaire de ${gift.name}`}
              >
                <Plus className="size-3.5" />
              </Button>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-red-600 dark:text-red-400 tabular-nums">
                -{subtotalPoints} pts
              </span>
              {onRemove && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={disabled}
                  onClick={() => onRemove(gift)}
                  className="size-7 text-muted-foreground hover:text-destructive"
                  title="Retirer ce lot de la sélection"
                  aria-label={`Retirer ${gift.name}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
