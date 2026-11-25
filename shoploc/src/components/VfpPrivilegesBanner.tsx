import { Button } from '@/components/ui/button';
import { VfpBadge } from '@/components/VfpBadge';
import { Crown, Lock, Sparkles, Info } from 'lucide-react';

export interface VfpPrivilegesBannerProps {
  isVfp: boolean;
  isAuthenticated: boolean;
  currentTransactionCount?: number;
  onOpenVfpDialog: () => void;
}

/**
 * Contextual banner shown on the "Privilèges VFP" gift catalog tab.
 * Celebrates active VFP status or explains how non-VFP users can unlock VFP privileges.
 */
export function VfpPrivilegesBanner({
  isVfp,
  isAuthenticated,
  currentTransactionCount,
  onOpenVfpDialog,
}: VfpPrivilegesBannerProps) {
  if (isVfp) {
    return (
      <div className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
            <Crown className="size-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground">
                Vos récompenses exclusives VFP sont débloquées
              </h3>
              <VfpBadge isVfp size="sm" />
            </div>
            <p className="text-xs text-muted-foreground">
              En tant que Membre VFP, vous pouvez échanger vos points contre ces cadeaux
              d&apos;exception chez nos commerçants partenaires.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpenVfpDialog}
          className="h-8 text-xs gap-1.5 border-amber-500/40 hover:bg-amber-500/10 shrink-0 cursor-pointer"
        >
          <Sparkles className="size-3.5 text-amber-600 dark:text-amber-400" />
          <span>Mes avantages VFP</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
          <Lock className="size-5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground">
              Comment débloquer les cadeaux exclusifs VFP ?
            </h3>
            {isAuthenticated && typeof currentTransactionCount === 'number' && (
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-background/80 border border-amber-500/30 text-amber-800 dark:text-amber-300">
                {currentTransactionCount} / 10 achats
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
            Réalisez <strong className="text-foreground">10 achats sur 15 jours glissants</strong>{' '}
            chez vos commerçants locaux pour obtenir le statut{' '}
            <strong className="text-amber-700 dark:text-amber-300">Membre VFP</strong> et débloquer
            l&apos;accès à cette sélection exclusive (ainsi que les transports et le stationnement
            offerts).
          </p>
        </div>
      </div>

      <Button
        type="button"
        size="sm"
        onClick={onOpenVfpDialog}
        className="h-8 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white shrink-0 cursor-pointer"
      >
        <Info className="size-3.5" />
        <span>Comment devenir VFP ?</span>
      </Button>
    </div>
  );
}
