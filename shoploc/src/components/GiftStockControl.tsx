import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adjustGiftStock } from '@/lib/api';
import type { LoyaltyGift } from '@/types/gift';
import { Minus, Plus, Loader2, AlertCircle } from 'lucide-react';

interface GiftStockControlProps {
  gift: LoyaltyGift;
  onStockUpdated?: (updated: LoyaltyGift) => void;
  className?: string;
}

export function GiftStockControl({ gift, onStockUpdated, className = '' }: GiftStockControlProps) {
  const [currentStock, setCurrentStock] = React.useState(gift.stock);
  const [inputValue, setInputValue] = React.useState(String(gift.stock));
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setCurrentStock(gift.stock);
    setInputValue(String(gift.stock));
  }, [gift.stock]);

  const handleDelta = async (delta: number) => {
    if (isUpdating) return;
    if (delta < 0 && currentStock <= 0) return;

    setError(null);
    setIsUpdating(true);
    try {
      const updated = await adjustGiftStock(gift.storeUid, gift.uid, delta);
      setCurrentStock(updated.stock);
      setInputValue(String(updated.stock));
      onStockUpdated?.(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur stock');
      setTimeout(() => setError(null), 3500);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDirectCommit = async () => {
    const parsed = parseInt(inputValue, 10);
    if (isNaN(parsed) || parsed < 0) {
      setInputValue(String(currentStock));
      return;
    }
    if (parsed === currentStock) return;

    const delta = parsed - currentStock;
    setError(null);
    setIsUpdating(true);
    try {
      const updated = await adjustGiftStock(gift.storeUid, gift.uid, delta);
      setCurrentStock(updated.stock);
      setInputValue(String(updated.stock));
      onStockUpdated?.(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur stock');
      setInputValue(String(currentStock));
      setTimeout(() => setError(null), 3500);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="inline-flex items-center gap-1 bg-muted/60 dark:bg-muted/30 p-1 rounded-md border border-border shadow-xs">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 rounded text-muted-foreground hover:text-foreground hover:bg-background"
          onClick={() => handleDelta(-1)}
          disabled={isUpdating || currentStock <= 0}
          title="Diminuer le stock de 1"
          aria-label="Diminuer le stock de cadeaux"
        >
          <Minus className="size-3.5" />
        </Button>

        <div className="relative">
          <Input
            type="number"
            min="0"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleDirectCommit}
            onKeyDown={handleKeyDown}
            disabled={isUpdating}
            className="h-7 w-14 text-center text-xs font-semibold px-1 py-0 bg-background border-border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            aria-label="Quantité en stock du cadeau"
          />
          {isUpdating && (
            <div className="absolute inset-0 bg-background/80 rounded flex items-center justify-center">
              <Loader2 className="size-3.5 animate-spin text-primary" />
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 rounded text-muted-foreground hover:text-foreground hover:bg-background"
          onClick={() => handleDelta(1)}
          disabled={isUpdating}
          title="Augmenter le stock de 1"
          aria-label="Augmenter le stock de cadeaux"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      {error && (
        <p className="text-[11px] text-destructive flex items-center gap-1 px-1">
          <AlertCircle className="size-3 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
