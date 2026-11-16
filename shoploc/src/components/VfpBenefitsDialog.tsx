import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Crown,
  Sparkles,
  Car,
  Bus,
  Gift,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { ROUTES } from '@/config/routes';
import type { VfpRevocationForecast } from '@/lib/vfp';

interface VfpBenefitsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isVfp?: boolean;
  currentTransactionCount?: number;
  threshold?: number;
  revocationForecast?: VfpRevocationForecast | null;
}

/**
 * Modal dialog detailing advantages and privileges tied to the Very Faithful Person (VFP) status (SLE-50 / SLE-237).
 * Outlines parking privileges (SLE-48), free public transit (SLE-47), exclusive gift catalog (SLE-49),
 * dynamic sliding window qualification rules (SLE-44 / SLE-45), and countdown to potential revocation (SLE-51).
 */
export function VfpBenefitsDialog({
  isOpen,
  onClose,
  isVfp = false,
  currentTransactionCount,
  threshold = 10,
  revocationForecast,
}: VfpBenefitsDialogProps) {
  const remainingTransactions =
    currentTransactionCount !== undefined ? Math.max(0, threshold - currentTransactionCount) : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3 pb-2 border-b">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`p-2 rounded-xl flex items-center justify-center shadow-xs ${
                  isVfp
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                    : 'bg-primary/10 text-primary'
                }`}
              >
                {isVfp ? (
                  <Crown className="size-5 shrink-0 fill-amber-500/20" />
                ) : (
                  <Sparkles className="size-5 shrink-0" />
                )}
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  Statut Very Faithful Person (VFP)
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Avantages et privilèges exclusifs pour les usagers les plus fidèles.
                </DialogDescription>
              </div>
            </div>

            {isVfp ? (
              <Badge className="bg-amber-600 text-white font-semibold text-xs gap-1.5 px-2.5 py-1 shrink-0">
                <CheckCircle2 className="size-3.5" />
                <span>Statut Actif</span>
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-xs gap-1.5 px-2.5 py-1 shrink-0 text-muted-foreground border-muted-foreground/30"
              >
                <Clock className="size-3.5 text-muted-foreground/70" />
                <span>Statut Standard</span>
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Status Callout Banner */}
        <div
          className={`p-3.5 rounded-xl border text-xs space-y-1 ${
            isVfp
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
              : 'bg-muted/40 border-border text-muted-foreground'
          }`}
        >
          {isVfp ? (
            <div className="space-y-1">
              <p className="font-medium flex items-center gap-1.5">
                <Sparkles className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  Félicitations ! Votre statut VFP est <strong>actuellement actif</strong>. Vous
                  pouvez profiter immédiatement de tous les privilèges ci-dessous.
                </span>
              </p>
              {revocationForecast && (
                <p className="text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1 pt-0.5">
                  <Clock className="size-3 shrink-0" />
                  <span>
                    Révocation prévisionnelle sans nouvel achat : dans{' '}
                    <strong>
                      {revocationForecast.daysRemaining} jour
                      {revocationForecast.daysRemaining > 1 ? 's' : ''}
                    </strong>{' '}
                    (le{' '}
                    {revocationForecast.revocationDate.toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                    ).
                  </span>
                </p>
              )}
            </div>
          ) : (
            <p className="flex items-center gap-1.5">
              <TrendingUp className="size-4 text-primary shrink-0" />
              <span>
                {remainingTransactions !== null && remainingTransactions > 0 ? (
                  <>
                    Plus que <strong className="text-foreground">{remainingTransactions}</strong>{' '}
                    transaction{remainingTransactions > 1 ? 's' : ''} sur les 15 derniers jours pour
                    débloquer automatiquement vos privilèges VFP.
                  </>
                ) : (
                  <>
                    Effectuez au moins <strong>10 transactions</strong> sur les 15 derniers jours
                    glissants chez nos commerçants adhérents pour activer vos avantages.
                  </>
                )}
              </span>
            </p>
          )}
        </div>

        {/* Benefits Grid */}
        <div className="space-y-3 py-1">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Vos privilèges institutionnels et commerciaux
          </h4>

          {/* Advantage 1: Parking */}
          <div className="flex items-start gap-3 p-3 rounded-xl border bg-card hover:bg-muted/20 transition-colors">
            <div className="size-9 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
              <Car className="size-4.5" />
            </div>
            <div className="space-y-1">
              <h5 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span>Stationnement gratuit (20 min)</span>
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-4 bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20"
                >
                  SLE-48
                </Badge>
              </h5>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Bénéficiez d&apos;une franchise de{' '}
                <strong>20 minutes de stationnement offertes</strong> sur les parkings municipaux et
                voiries de votre commune adhérente pour faciliter vos courses en centre-ville.
              </p>
            </div>
          </div>

          {/* Advantage 2: Transport */}
          <div className="flex items-start gap-3 p-3 rounded-xl border bg-card hover:bg-muted/20 transition-colors">
            <div className="size-9 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <Bus className="size-4.5" />
            </div>
            <div className="space-y-1">
              <h5 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span>Transports en commun offerts</span>
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                >
                  SLE-47
                </Badge>
              </h5>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Profitez de la{' '}
                <strong>gratuité sur le réseau de transports collectifs urbains</strong> (bus,
                tramway) de la collectivité pour vos déplacements vers les commerces locaux
                partenaires.
              </p>
            </div>
          </div>

          {/* Advantage 3: Exclusive Gift Catalog & Reductions */}
          <div className="flex items-start gap-3 p-3 rounded-xl border bg-card hover:bg-muted/20 transition-colors">
            <div className="size-9 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
              <Gift className="size-4.5" />
            </div>
            <div className="space-y-1">
              <h5 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span>Catalogue cadeaux &amp; Réductions réservées</span>
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-4 bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20"
                >
                  SLE-49
                </Badge>
              </h5>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Accédez à une sélection exclusive de{' '}
                <strong>cadeaux de fidélité dédiés aux membres VFP</strong> et bénéficiez de remises
                immédiates négociées auprès des commerçants du réseau ShopLoc.
              </p>
            </div>
          </div>
        </div>

        {/* Eligibility Rule Reminder */}
        <div className="p-3 rounded-xl border bg-muted/20 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <ShieldCheck className="size-4 text-primary shrink-0" />
            <span>Règle d&apos;attribution et maintien</span>
          </div>
          <p className="text-muted-foreground leading-relaxed text-[11px]">
            Le statut VFP est évalué dynamiquement : il s&apos;active automatiquement dès{' '}
            <strong>10 transactions validées</strong> sur une fenêtre glissante de{' '}
            <strong>15 jours</strong> (achats physiques en magasin ou commandes Click &amp;
            Collect). Si votre nombre de transactions sur les 15 derniers jours repasse sous ce
            seuil, le statut repasse automatiquement au niveau standard.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="w-full sm:w-auto text-xs"
          >
            Fermer
          </Button>
          <Button
            variant="default"
            size="sm"
            className="w-full sm:w-auto text-xs gap-1.5"
            render={<a href={ROUTES.profile.path} onClick={onClose} />}
          >
            <span>Voir mon suivi d&apos;activité</span>
            <ArrowRight className="size-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
