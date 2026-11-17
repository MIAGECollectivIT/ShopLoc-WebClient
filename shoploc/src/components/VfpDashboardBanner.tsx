import * as React from 'react';
import { useAuth } from '@/lib/auth';
import { getUserVfpProgress } from '@/lib/api';
import type { UserVfpProgress } from '@/types/loyalty';
import { Badge } from '@/components/ui/badge';
import { ROUTES } from '@/config/routes';
import { Sparkles, CalendarClock, ArrowRight, TrendingUp } from 'lucide-react';

/**
 * Dashboard indicator component showing VFP status, maintenance targets,
 * and countdown before status expiration for authenticated citizens (SLE-51 / SLE-240).
 */
export function VfpDashboardBanner() {
  const { user, isAuthenticated, role } = useAuth();
  const [progress, setProgress] = React.useState<UserVfpProgress | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;
    if (!isAuthenticated || !user?.id || (role !== 'CLIENT' && role !== 'ADMIN')) {
      setIsLoading(false);
      return;
    }

    getUserVfpProgress(user.id)
      .then((data) => {
        if (isMounted) setProgress(data);
      })
      .catch(() => {
        // Graceful degradation when loyalty service is unreachable
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user?.id, isAuthenticated, role]);

  if (isLoading || !progress || (role !== 'CLIENT' && role !== 'ADMIN')) {
    return null;
  }

  // Active VFP Customer Banner with Countdown (SLE-51 / SLE-240)
  if (progress.isVfp) {
    const days = progress.daysRemainingBeforeRevocation ?? 0;
    const hours = progress.hoursRemainingBeforeRevocation ?? 0;
    const isUrgent = days <= 3;

    return (
      <div className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-emerald-500/10 p-4 sm:p-5 shadow-xs transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs gap-1.5 px-2.5 py-0.5">
                <Sparkles className="size-3.5" />
                <span>Membre VFP Actif</span>
              </Badge>
              {progress.daysRemainingBeforeRevocation !== null && (
                <Badge
                  variant={isUrgent ? 'destructive' : 'secondary'}
                  className="text-[11px] gap-1 px-2 py-0 font-medium"
                >
                  <CalendarClock className="size-3" />
                  <span>
                    Expiration dans {days > 0 ? `${days} j` : ''} {hours > 0 ? `${hours} h` : ''}
                    {days === 0 && hours === 0 ? "moins d'1 h" : ''}
                  </span>
                </Badge>
              )}
            </div>

            <p className="text-xs sm:text-sm text-foreground/90 font-medium">
              {progress.remainingTransactionsToMaintain > 0 ? (
                <span>
                  Plus que{' '}
                  <strong className="text-foreground font-bold">
                    {progress.remainingTransactionsToMaintain} achat
                    {progress.remainingTransactionsToMaintain > 1 ? 's' : ''}
                  </strong>{' '}
                  à réaliser lors des prochains jours pour conserver vos privilèges VFP.
                </span>
              ) : (
                <span>Votre statut VFP est pleinement sécurisé pour les prochains jours !</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={ROUTES.profile.path}
              data-astro-reload=""
              className="inline-flex items-center justify-center text-xs font-medium rounded-md px-3 py-1.5 border border-amber-500/40 bg-background/80 hover:bg-amber-500/10 text-amber-900 dark:text-amber-200 transition-colors gap-1.5"
            >
              <span>Suivre mon statut</span>
              <ArrowRight className="size-3.5" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Non-VFP Citizen: Progression indicator towards VFP threshold (SLE-51 / SLE-239)
  const remaining = progress.remainingTransactionsToQualify;
  const current = progress.currentTransactionCount;
  const threshold = progress.threshold;
  const percent = Math.min(100, Math.round((current / threshold) * 100));

  return (
    <div className="rounded-xl border border-primary/20 bg-muted/30 p-4 sm:p-5 shadow-xs transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1 max-w-xl">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-xs gap-1 px-2 py-0.5 border-primary/30 text-primary"
            >
              <TrendingUp className="size-3" />
              <span>Progression VFP</span>
            </Badge>
            <span className="text-xs text-muted-foreground">
              {current} / {threshold} achats ({percent}%)
            </span>
          </div>

          <p className="text-xs sm:text-sm text-foreground/90">
            Plus que{' '}
            <strong>
              {remaining} achat{remaining > 1 ? 's' : ''}
            </strong>{' '}
            sur les 15 prochains jours pour débloquer le statut{' '}
            <strong>Very Faithful Person</strong> et ses privilèges.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={ROUTES.stores.path}
            className="inline-flex items-center justify-center text-xs font-medium rounded-md px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors gap-1.5"
          >
            <span>Faire des achats</span>
            <ArrowRight className="size-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
