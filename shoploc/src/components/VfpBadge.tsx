import { Badge } from '@/components/ui/badge';
import { Crown, Sparkles } from 'lucide-react';

interface VfpBadgeProps {
  isVfp: boolean;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  showInactive?: boolean;
  className?: string;
}

/**
 * Reusable distinctive UI badge highlighting Very Faithful Person (VFP) status (SLE-45 / SLE-204).
 */
export function VfpBadge({
  isVfp,
  size = 'sm',
  showText = true,
  showInactive = false,
  className = '',
}: VfpBadgeProps) {
  if (!isVfp && !showInactive) {
    return null;
  }

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0 h-4 gap-1',
    md: 'text-xs px-2.5 py-0.5 h-5 gap-1.5',
    lg: 'text-sm px-3 py-1 h-6 gap-2',
  }[size];

  const iconSizes = {
    sm: 'size-2.5',
    md: 'size-3.5',
    lg: 'size-4',
  }[size];

  if (isVfp) {
    return (
      <Badge
        variant="secondary"
        className={`inline-flex items-center font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/40 shadow-xs ${sizeClasses} ${className}`}
        title="Statut Very Faithful Person (VFP) actif : Transports en commun et stationnement gratuit accordés"
      >
        <Crown
          className={`${iconSizes} text-amber-600 dark:text-amber-400 shrink-0 fill-amber-500/20`}
        />
        {showText && <span>VFP</span>}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center text-muted-foreground border-muted-foreground/30 ${sizeClasses} ${className}`}
      title="Statut standard (seuil de 10 transactions sur 15 jours non atteint)"
    >
      <Sparkles className={`${iconSizes} text-muted-foreground/60 shrink-0`} />
      {showText && <span>Standard</span>}
    </Badge>
  );
}
