import * as React from 'react';
import { Package } from 'lucide-react';
import { resolveProductImageUrl, getProductApiImageUrl } from '@/lib/image';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface ProductImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  storeUid?: string | null;
  productUid?: string | null;
  imageUrl?: string | null;
  alt: string;
  fallbackText?: string;
  fallbackIcon?: React.ReactNode;
  containerClassName?: string;
}

export function ProductImage({
  storeUid,
  productUid,
  imageUrl,
  src,
  alt,
  fallbackText = 'Aucun visuel',
  fallbackIcon,
  className,
  containerClassName,
  loading = 'lazy',
  onLoad,
  onError,
  ...props
}: ProductImageProps) {
  const initialUrl = React.useMemo(() => {
    return resolveProductImageUrl({
      storeUid,
      productUid,
      imageUrl: src || imageUrl,
    });
  }, [storeUid, productUid, src, imageUrl]);

  const [currentSrc, setCurrentSrc] = React.useState<string | null>(initialUrl);
  const [hasTriedFallback, setHasTriedFallback] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState<boolean>(Boolean(initialUrl));
  const [hasError, setHasError] = React.useState<boolean>(!initialUrl);

  // Sync if prop URL changes
  React.useEffect(() => {
    const nextUrl = resolveProductImageUrl({
      storeUid,
      productUid,
      imageUrl: src || imageUrl,
    });
    setCurrentSrc(nextUrl);
    setHasTriedFallback(false);
    setIsLoading(Boolean(nextUrl));
    setHasError(!nextUrl);
  }, [storeUid, productUid, src, imageUrl]);

  const handleLoad: React.ReactEventHandler<HTMLImageElement> = (e) => {
    setIsLoading(false);
    setHasError(false);
    if (onLoad) onLoad(e);
  };

  const handleError: React.ReactEventHandler<HTMLImageElement> = (e) => {
    // If the primary URL failed and we haven't yet tried the direct backend stream endpoint
    if (!hasTriedFallback && storeUid && productUid) {
      const fallbackUrl = getProductApiImageUrl(storeUid, productUid);
      if (fallbackUrl && fallbackUrl !== currentSrc) {
        setHasTriedFallback(true);
        setCurrentSrc(fallbackUrl);
        setIsLoading(true);
        return;
      }
    }

    setIsLoading(false);
    setHasError(true);
    if (onError) onError(e);
  };

  // If error or no URL could be resolved, display fallback
  if (hasError || !currentSrc) {
    return (
      <div
        className={cn(
          'w-full h-full flex flex-col items-center justify-center text-muted-foreground/60 gap-1.5 p-4 bg-muted/40 select-none',
          containerClassName
        )}
      >
        {fallbackIcon || <Package className="size-8 stroke-1" />}
        {fallbackText && <span className="text-[11px] font-medium">{fallbackText}</span>}
      </div>
    );
  }

  return (
    <div className={cn('relative w-full h-full overflow-hidden', containerClassName)}>
      {/* Loading Skeleton */}
      {isLoading && (
        <Skeleton className="absolute inset-0 size-full z-10 bg-muted/70 animate-pulse" />
      )}

      {/* Rendered Product Image */}
      <img
        src={currentSrc}
        alt={alt}
        loading={loading}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          className
        )}
        {...props}
      />
    </div>
  );
}
