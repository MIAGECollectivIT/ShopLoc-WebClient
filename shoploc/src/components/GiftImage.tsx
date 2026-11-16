import * as React from 'react';
import { Gift } from 'lucide-react';
import { resolveGiftImageUrl, getGiftApiImageUrl } from '@/lib/image';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface GiftImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  storeId?: number | string | null;
  giftId?: number | string | null;
  imageUrl?: string | null;
  alt: string;
  fallbackText?: string;
  fallbackIcon?: React.ReactNode;
  containerClassName?: string;
}

export function GiftImage({
  storeId,
  giftId,
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
}: GiftImageProps) {
  const initialUrl = React.useMemo(() => {
    return resolveGiftImageUrl({
      storeId,
      giftId,
      imageUrl: src || imageUrl,
    });
  }, [storeId, giftId, src, imageUrl]);

  const [currentSrc, setCurrentSrc] = React.useState<string | null>(initialUrl);
  const [hasTriedFallback, setHasTriedFallback] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState<boolean>(Boolean(initialUrl));
  const [hasError, setHasError] = React.useState<boolean>(!initialUrl);

  React.useEffect(() => {
    const nextUrl = resolveGiftImageUrl({
      storeId,
      giftId,
      imageUrl: src || imageUrl,
    });
    setCurrentSrc(nextUrl);
    setHasTriedFallback(false);
    setIsLoading(Boolean(nextUrl));
    setHasError(!nextUrl);
  }, [storeId, giftId, src, imageUrl]);

  const handleLoad: React.ReactEventHandler<HTMLImageElement> = (e) => {
    setIsLoading(false);
    setHasError(false);
    if (onLoad) onLoad(e);
  };

  const handleError: React.ReactEventHandler<HTMLImageElement> = (e) => {
    if (!hasTriedFallback && storeId && giftId) {
      const fallbackUrl = getGiftApiImageUrl(storeId, giftId);
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

  if (hasError || !currentSrc) {
    return (
      <div
        className={cn(
          'w-full h-full flex flex-col items-center justify-center text-muted-foreground/60 gap-1.5 p-4 bg-muted/40 select-none',
          containerClassName
        )}
      >
        {fallbackIcon || <Gift className="size-8 stroke-1" />}
        {fallbackText && <span className="text-[11px] font-medium">{fallbackText}</span>}
      </div>
    );
  }

  return (
    <div className={cn('relative w-full h-full overflow-hidden', containerClassName)}>
      {isLoading && (
        <Skeleton className="absolute inset-0 size-full z-10 bg-muted/70 animate-pulse" />
      )}

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
