import * as React from 'react';
import { Gift } from 'lucide-react';
import { resolveGiftImageUrl, getGiftApiImageUrl } from '@/lib/image';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface GiftImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  storeUid?: string | null;
  giftUid?: string | null;
  imageUrl?: string | null;
  alt: string;
  fallbackText?: string;
  fallbackIcon?: React.ReactNode;
  containerClassName?: string;
}

export function GiftImage({
  storeUid,
  giftUid,
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
      storeUid,
      giftUid,
      imageUrl: src || imageUrl,
    });
  }, [storeUid, giftUid, src, imageUrl]);

  const imgRef = React.useRef<HTMLImageElement | null>(null);
  const [currentSrc, setCurrentSrc] = React.useState<string | null>(initialUrl);
  const [hasTriedFallback, setHasTriedFallback] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState<boolean>(Boolean(initialUrl));
  const [hasError, setHasError] = React.useState<boolean>(!initialUrl);

  React.useEffect(() => {
    setCurrentSrc((prev) => {
      if (prev === initialUrl) {
        return prev;
      }
      setHasTriedFallback(false);
      setIsLoading(Boolean(initialUrl));
      setHasError(!initialUrl);
      return initialUrl;
    });
  }, [initialUrl]);

  // Immediately clear loading state if the browser already served the image from cache
  React.useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete) {
      if (img.naturalWidth > 0) {
        setIsLoading(false);
        setHasError(false);
      } else {
        setIsLoading(false);
      }
    }
  }, [currentSrc]);

  const handleLoad: React.ReactEventHandler<HTMLImageElement> = (e) => {
    setIsLoading(false);
    setHasError(false);
    if (onLoad) onLoad(e);
  };

  const handleError: React.ReactEventHandler<HTMLImageElement> = (e) => {
    if (!hasTriedFallback && storeUid && giftUid) {
      const fallbackUrl = getGiftApiImageUrl(storeUid, giftUid);
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
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        loading={loading}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'w-full h-full object-cover',
          isLoading ? 'opacity-0' : 'opacity-100',
          className
        )}
        {...props}
      />
    </div>
  );
}
