import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateProductStock } from '@/lib/api';
import type { Product } from '@/types/product';
import { Minus, Plus, Loader2, AlertCircle } from 'lucide-react';

interface StockControlProps {
  product: Product;
  onStockUpdated?: (updated: Product) => void;
  className?: string;
}

export function StockControl({ product, onStockUpdated, className = '' }: StockControlProps) {
  const [currentStock, setCurrentStock] = React.useState(product.stockQuantity);
  const [inputValue, setInputValue] = React.useState(String(product.stockQuantity));
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setCurrentStock(product.stockQuantity);
    setInputValue(String(product.stockQuantity));
  }, [product.stockQuantity]);

  const handleDelta = async (delta: number) => {
    if (isUpdating) return;
    if (delta < 0 && currentStock <= 0) return;

    setError(null);
    setIsUpdating(true);
    try {
      const updated = await updateProductStock(product.storeId, product.id, {
        quantityDelta: delta,
      });
      setCurrentStock(updated.stockQuantity);
      setInputValue(String(updated.stockQuantity));
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

    setError(null);
    setIsUpdating(true);
    try {
      const updated = await updateProductStock(product.storeId, product.id, {
        newQuantity: parsed,
      });
      setCurrentStock(updated.stockQuantity);
      setInputValue(String(updated.stockQuantity));
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
          aria-label="Diminuer le stock"
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
            className="w-14 h-7 text-center font-mono font-semibold text-xs px-1 py-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-transparent bg-background shadow-xs focus-visible:ring-1"
            title="Cliquez pour modifier directement la quantité"
          />
          {isUpdating && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded">
              <Loader2 className="size-3 animate-spin text-primary" />
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
          aria-label="Augmenter le stock"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      {error && (
        <p className="text-[10px] text-destructive flex items-center gap-1 font-medium animate-in fade-in duration-200">
          <AlertCircle className="size-3 shrink-0" />
          <span className="truncate max-w-[150px]">{error}</span>
        </p>
      )}
    </div>
  );
}
