import * as React from 'react';
import type { UserActivityEvaluation } from '@/types/loyalty';
import { getUserActivityEvaluation } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Award, Sparkles, Info, TrendingUp, CheckCircle2, Clock } from 'lucide-react';

interface UserActivityGaugeCardProps {
  userId: string;
  initialData?: UserActivityEvaluation | null;
}

export function UserActivityGaugeCard({ userId, initialData }: UserActivityGaugeCardProps) {
  const [evaluation, setEvaluation] = React.useState<UserActivityEvaluation | null>(
    initialData || null
  );
  const [isLoading, setIsLoading] = React.useState(!initialData);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    async function loadActivity() {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        setError(null);
        const data = await getUserActivityEvaluation(userId);
        if (isMounted) {
          setEvaluation(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Impossible de récupérer l'évaluation d'activité."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadActivity();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  if (isLoading) {
    return (
      <Card className="shadow-xs border-primary/20">
        <CardHeader className="pb-3 border-b">
          <Skeleton className="h-5 w-48 mb-2" />
          <Skeleton className="h-3.5 w-64" />
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <Skeleton className="h-4 w-full rounded-full" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-28" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !evaluation) {
    return (
      <Card className="shadow-xs border-dashed text-muted-foreground">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-foreground">
            <Award className="size-4 text-primary" />
            <span>Activité Récente & Statut VFP</span>
          </CardTitle>
          <CardDescription className="text-xs">
            {error || 'Activité non disponible actuellement.'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { transactionCount, threshold, isEligibleVfp, windowStart, windowEnd } = evaluation;
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((transactionCount / threshold) * 100))
  );
  const remaining = Math.max(0, threshold - transactionCount);

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <Card
      className={`shadow-xs transition-all overflow-hidden ${
        isEligibleVfp
          ? 'border-amber-500/40 bg-gradient-to-br from-amber-500/5 via-background to-emerald-500/5'
          : 'border-border/80'
      }`}
    >
      <CardHeader className="pb-3 border-b bg-muted/10">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div
                className={`size-8 rounded-lg flex items-center justify-center ${
                  isEligibleVfp
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                    : 'bg-primary/10 text-primary'
                }`}
              >
                {isEligibleVfp ? (
                  <Sparkles className="size-4" />
                ) : (
                  <TrendingUp className="size-4" />
                )}
              </div>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <span>Activité & Statut VFP</span>
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Évaluation dynamique de vos achats sur fenêtre glissante de 15 jours.
            </CardDescription>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                type="button"
                className="size-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label="En savoir plus sur le calcul du statut VFP"
              >
                <Info className="size-4" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs p-3 leading-relaxed">
                Le statut <strong>VFP (Very Faithful Person)</strong> est accordé dès 10
                transactions réalisées sur les 15 derniers jours glissants (J-15 à J). Toutes vos
                transactions validées (achats physiques en magasin ou commandes Click &amp; Collect)
                sont comptabilisées sans aucune limitation quotidienne.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Status banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            {isEligibleVfp ? (
              <Badge className="bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs gap-1.5 px-2.5 py-1">
                <CheckCircle2 className="size-3.5" />
                <span>Statut VFP Qualifié</span>
              </Badge>
            ) : (
              <Badge variant="secondary" className="font-medium text-xs gap-1 px-2 py-0.5">
                <Clock className="size-3" />
                <span>En progression</span>
              </Badge>
            )}

            <span className="text-sm font-semibold text-foreground">
              {transactionCount} / {threshold} transactions
            </span>
          </div>

          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="font-medium text-foreground/80">{progressPercent}%</span>
            <span>atteint</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="w-full h-3 rounded-full bg-muted/60 overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                isEligibleVfp
                  ? 'bg-gradient-to-r from-amber-500 to-emerald-500 shadow-xs'
                  : 'bg-primary'
              }`}
              style={{ width: `${progressPercent}%` }}
              role="progressbar"
              aria-valuenow={transactionCount}
              aria-valuemin={0}
              aria-valuemax={threshold}
            />
          </div>

          <div className="flex justify-between text-[11px] text-muted-foreground px-0.5">
            <span>0</span>
            <span className="font-medium">Seuil VFP : {threshold} tx</span>
          </div>
        </div>

        {/* Informative text & Window interval */}
        <div className="p-3 rounded-xl border bg-muted/20 text-xs space-y-1.5">
          {isEligibleVfp ? (
            <p className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5">
              <Sparkles className="size-3.5 shrink-0" />
              <span>
                Félicitations ! Vous avez atteint le seuil d'éligibilité pour les avantages Very
                Faithful Person.
              </span>
            </p>
          ) : (
            <p className="text-muted-foreground">
              Plus que <strong className="text-foreground font-semibold">{remaining}</strong>{' '}
              transaction{remaining > 1 ? 's' : ''} sur les 15 prochains jours pour débloquer le
              statut VFP.
            </p>
          )}

          <div className="text-[11px] text-muted-foreground/80 pt-1 border-t border-border/40 flex flex-wrap items-center justify-between gap-1">
            <span>Fenêtre glissante (J-15 à J) :</span>
            <span className="font-medium text-foreground/90">
              {formatDate(windowStart)} — {formatDate(windowEnd)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
