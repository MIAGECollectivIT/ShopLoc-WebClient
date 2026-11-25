import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

export interface CatalogItemCardProps {
  media: React.ReactNode;
  topRightBadge?: React.ReactNode;
  eyebrow?: React.ReactNode;
  title: string;
  valueSlot: React.ReactNode;
  description?: string | null;
  extraBody?: React.ReactNode;
  footer: React.ReactNode;
  className?: string;
}

/**
 * Shared base card component ensuring visual and structural consistency
 * across products, loyalty gifts, and VFP permanent benefits.
 */
export function CatalogItemCard({
  media,
  topRightBadge,
  eyebrow,
  title,
  valueSlot,
  description,
  extraBody,
  footer,
  className = '',
}: CatalogItemCardProps) {
  return (
    <Card
      className={`group flex flex-col justify-between overflow-hidden border-border hover:shadow-lg transition-all duration-200 bg-card rounded-xl ${className}`}
    >
      <div>
        <div className="relative aspect-4/3 w-full bg-muted/60 overflow-hidden flex items-center justify-center border-b border-border">
          {media}
          {topRightBadge && <div className="absolute top-2.5 right-2.5">{topRightBadge}</div>}
        </div>

        <CardHeader className="p-4 pb-2 space-y-1.5">
          {eyebrow}

          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base font-semibold text-foreground line-clamp-1">
              {title}
            </CardTitle>
            {valueSlot}
          </div>

          {description && (
            <CardDescription className="text-xs line-clamp-2 text-muted-foreground">
              {description}
            </CardDescription>
          )}

          {extraBody}
        </CardHeader>
      </div>

      <div className="p-4 pt-2 border-t border-border/50 bg-muted/20 space-y-2">{footer}</div>
    </Card>
  );
}

export interface CatalogStockBadgeProps {
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  stock: number;
}

/**
 * Shared stock status pill used in media top-right overlay on both product and gift cards.
 */
export function CatalogStockBadge({ status, stock }: CatalogStockBadgeProps) {
  if (status === 'IN_STOCK') {
    return (
      <span className="bg-emerald-500/95 text-white font-medium text-[11px] px-2.5 py-0.5 rounded-full shadow-xs backdrop-blur-xs flex items-center gap-1">
        <CheckCircle2 className="size-3" />
        En stock
      </span>
    );
  }
  if (status === 'LOW_STOCK') {
    return (
      <span className="bg-amber-500/95 text-white font-medium text-[11px] px-2.5 py-0.5 rounded-full shadow-xs backdrop-blur-xs">
        Plus que {stock} dispo !
      </span>
    );
  }
  return (
    <span className="bg-rose-600/95 text-white font-medium text-[11px] px-2.5 py-0.5 rounded-full shadow-xs backdrop-blur-xs">
      Rupture
    </span>
  );
}

/**
 * Co-located skeleton component for catalog item cards.
 */
export function CatalogItemCardSkeleton() {
  return (
    <div className="border border-border rounded-xl p-4 space-y-3 bg-card animate-pulse">
      <div className="aspect-4/3 bg-muted rounded-lg" />
      <div className="h-4 bg-muted rounded w-2/3" />
      <div className="h-3 bg-muted rounded w-1/3" />
      <div className="h-8 bg-muted rounded" />
    </div>
  );
}
