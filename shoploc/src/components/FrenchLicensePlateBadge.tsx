import { cn } from 'cn';

export interface FrenchLicensePlateBadgeProps {
  plate: string;
  className?: string;
  size?: 'sm' | 'default';
}

export function FrenchLicensePlateBadge({
  plate,
  className,
  size = 'default',
}: FrenchLicensePlateBadgeProps) {
  const isSmall = size === 'sm';
  return (
    <div
      className={cn(
        'inline-flex items-stretch bg-white text-neutral-900 border-2 border-neutral-900 rounded-md shadow-xs overflow-hidden font-mono tracking-wider select-all',
        className
      )}
    >
      <div
        className={cn(
          'bg-blue-600 text-white flex flex-col items-center justify-center font-sans font-bold leading-none select-none',
          isSmall ? 'px-1 py-0.5 text-[8px]' : 'px-1.5 py-1 text-[10px]'
        )}
      >
        <span className={cn('text-amber-300', isSmall ? 'text-[6px]' : 'text-[7px]')}>★</span>
        <span>F</span>
      </div>
      <div
        className={cn(
          'font-extrabold flex items-center tracking-widest font-mono select-all text-neutral-950',
          isSmall ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm sm:text-base'
        )}
      >
        {plate}
      </div>
      <div
        className={cn(
          'bg-blue-600 text-white flex flex-col items-center justify-center font-sans font-bold leading-none select-none',
          isSmall ? 'px-1 py-0.5 text-[7px]' : 'px-1.5 py-1 text-[8px]'
        )}
      >
        <span>FR</span>
      </div>
    </div>
  );
}
