import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Crown, Sparkles } from 'lucide-react';

interface VfpBadgeProps {
  isVfp: boolean;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  showInactive?: boolean;
  label?: string;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  interactive?: boolean;
}

/**
 * Reusable distinctive UI badge highlighting Very Faithful Person (VFP) status.
 * Supports explicit labeling (e.g. 'Membre VFP'), standard inactive status, and interactive click trigger.
 */
export function VfpBadge({
  isVfp,
  size = 'sm',
  showText = true,
  showInactive = false,
  label,
  className = '',
  onClick,
  interactive = false,
}: VfpBadgeProps) {
  if (!isVfp && !showInactive) {
    return null;
  }

  const isClickable = Boolean(onClick || interactive);

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

  const interactiveClasses = isClickable
    ? 'cursor-pointer hover:opacity-90 hover:scale-[1.03] active:scale-[0.98] transition-all select-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500/50'
    : '';

  const defaultVfpLabel = label || (size === 'sm' ? 'Membre VFP' : 'Membre VFP');
  const defaultStandardLabel = label || 'Standard';

  if (isVfp) {
    return (
      <Badge
        variant="secondary"
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onClick={onClick}
        onKeyDown={(e) => {
          if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick?.(e as unknown as React.MouseEvent<HTMLElement>);
          }
        }}
        className={`inline-flex items-center font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/40 shadow-xs ${sizeClasses} ${interactiveClasses} ${className}`}
        title={
          isClickable
            ? 'Statut Membre VFP actif : Cliquez pour voir le détail des avantages (Stationnement, Transports, Réductions)'
            : 'Statut Membre VFP actif : Transports en commun et stationnement gratuit accordés'
        }
      >
        <Crown
          className={`${iconSizes} text-amber-600 dark:text-amber-400 shrink-0 fill-amber-500/20`}
        />
        {showText && <span>{defaultVfpLabel}</span>}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick?.(e as unknown as React.MouseEvent<HTMLElement>);
        }
      }}
      className={`inline-flex items-center text-muted-foreground border-muted-foreground/30 ${sizeClasses} ${interactiveClasses} ${className}`}
      title={
        isClickable
          ? 'Statut standard : Cliquez pour voir les critères et avantages du statut VFP'
          : 'Statut standard (seuil de 10 transactions sur 15 jours non atteint)'
      }
    >
      <Sparkles className={`${iconSizes} text-muted-foreground/60 shrink-0`} />
      {showText && <span>{defaultStandardLabel}</span>}
    </Badge>
  );
}
