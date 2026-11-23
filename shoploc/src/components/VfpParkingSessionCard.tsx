import * as React from 'react';
import { activateVfpParkingSession, getVfpDailyEligibility } from '@/lib/api';
import type { ParkingSessionAcknowledgment } from '@/types/loyalty';
import { FrenchLicensePlateBadge } from './FrenchLicensePlateBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertCircle,
  Bus,
  Car,
  Check,
  Copy,
  Crown,
  Loader2,
  Lock,
  ParkingSquare,
  Plus,
  RefreshCw,
} from 'lucide-react';

interface VfpParkingSessionCardProps {
  userId: string;
  isVfp: boolean;
  licensePlates: string[];
  onManageVehicles: () => void;
}

type BenefitId = 'parking' | 'transit';
type FeedbackDialogKind = 'vfp-required' | 'transit-soon' | 'benefit-used' | null;

const STORAGE_KEY_PREFIX = 'shoploc_vfp_parking_';

const BENEFIT_OPTIONS: ReadonlyArray<{
  id: BenefitId;
  title: string;
  subtitle: string;
  perkBadge: string;
  icon: typeof ParkingSquare;
}> = [
  {
    id: 'parking',
    title: 'Stationnement gratuit',
    subtitle: '20 min offertes en voirie',
    perkBadge: '20 min / jour',
    icon: ParkingSquare,
  },
  {
    id: 'transit',
    title: 'Transports en commun',
    subtitle: 'Titre urbain offert',
    perkBadge: 'Bientôt',
    icon: Bus,
  },
];

function getStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

function clearPersistedSession(userId: string): void {
  if (typeof window === 'undefined' || !userId) {
    return;
  }
  try {
    window.localStorage.removeItem(getStorageKey(userId));
  } catch {
    // Ignore storage access errors in private browsing
  }
}

function readPersistedSession(userId: string): ParkingSessionAcknowledgment | null {
  if (typeof window === 'undefined' || !userId) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ParkingSessionAcknowledgment;
    if (!parsed.expiresAt || Date.parse(parsed.expiresAt) <= Date.now()) {
      clearPersistedSession(userId);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function persistSession(userId: string, session: ParkingSessionAcknowledgment): void {
  if (typeof window === 'undefined' || !userId) {
    return;
  }
  try {
    window.localStorage.setItem(getStorageKey(userId), JSON.stringify(session));
  } catch {
    // Ignore storage quota errors in private browsing
  }
}

function formatParisTime(isoTimestamp: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Paris',
    }).format(new Date(isoTimestamp));
  } catch {
    return '—';
  }
}

function formatRemainingCountdown(expiresAtIso: string, nowMs: number): string {
  const remainingSeconds = Math.max(0, Math.floor((Date.parse(expiresAtIso) - nowMs) / 1000));
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function VfpParkingSessionCard({
  userId,
  isVfp,
  licensePlates,
  onManageVehicles,
}: VfpParkingSessionCardProps) {
  const [selectedPlate, setSelectedPlate] = React.useState<string>(licensePlates[0] ?? '');
  const [acknowledgment, setAcknowledgment] = React.useState<ParkingSessionAcknowledgment | null>(
    () => readPersistedSession(userId)
  );
  const [nowMs, setNowMs] = React.useState<number>(() => Date.now());
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [copiedReference, setCopiedReference] = React.useState(false);
  const [isParkingDialogOpen, setIsParkingDialogOpen] = React.useState(false);
  const [feedbackDialog, setFeedbackDialog] = React.useState<FeedbackDialogKind>(null);
  const [consumedToday, setConsumedToday] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;
    if (!userId || !isVfp) {
      setConsumedToday(false);
      return undefined;
    }
    getVfpDailyEligibility()
      .then((eligibility) => {
        if (!isMounted) return;
        const used = eligibility.parkingUsedToday || eligibility.transitUsedToday;
        setConsumedToday(used);
        if (
          eligibility.activeParkingSession &&
          Date.parse(eligibility.activeParkingSession.expiresAt) > Date.now()
        ) {
          setAcknowledgment(eligibility.activeParkingSession);
          persistSession(userId, eligibility.activeParkingSession);
        } else {
          setAcknowledgment(null);
          clearPersistedSession(userId);
        }
      })
      .catch(() => {
        // Non-blocking: activation endpoint still enforces daily eligibility
      });
    return () => {
      isMounted = false;
    };
  }, [userId, isVfp]);

  React.useEffect(() => {
    if (licensePlates.length > 0 && !licensePlates.includes(selectedPlate)) {
      setSelectedPlate(licensePlates[0]);
    } else if (licensePlates.length === 0) {
      setSelectedPlate('');
    }
  }, [licensePlates, selectedPlate]);

  React.useEffect(() => {
    if (!acknowledgment) {
      return undefined;
    }
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [acknowledgment]);

  const isSessionActive = acknowledgment !== null && Date.parse(acknowledgment.expiresAt) > nowMs;
  const isBenefitLockedToday = isVfp && !isSessionActive && consumedToday;

  function handleBenefitClick(benefitId: BenefitId) {
    if (!isVfp) {
      setFeedbackDialog('vfp-required');
      return;
    }
    if (isBenefitLockedToday) {
      setFeedbackDialog('benefit-used');
      return;
    }
    if (benefitId === 'transit') {
      setFeedbackDialog('transit-soon');
      return;
    }
    setErrorMessage(null);
    setIsParkingDialogOpen(true);
  }

  async function handleActivate() {
    if (!selectedPlate || isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await activateVfpParkingSession(selectedPlate);
      setAcknowledgment(result);
      setConsumedToday(true);
      setNowMs(Date.now());
      persistSession(userId, result);
      setIsParkingDialogOpen(false);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue lors de la demande de stationnement.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopyReference(reference: string) {
    try {
      await navigator.clipboard.writeText(reference);
      setCopiedReference(true);
      window.setTimeout(() => setCopiedReference(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {BENEFIT_OPTIONS.map((benefit) => {
          const Icon = benefit.icon;
          const isParkingActive = benefit.id === 'parking' && isSessionActive;
          const isDisabledState = !isVfp || isBenefitLockedToday;

          return (
            <Button
              key={benefit.id}
              type="button"
              variant="outline"
              // Keep button clickable when locked so feedback dialog can still open
              aria-disabled={isDisabledState}
              onClick={() => handleBenefitClick(benefit.id)}
              className={`h-auto w-full justify-between px-4 py-3 text-left whitespace-normal ${
                isDisabledState
                  ? 'border-dashed opacity-60 text-muted-foreground hover:opacity-80'
                  : isParkingActive
                    ? 'border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/15'
                    : ''
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`size-4 shrink-0 ${
                    isParkingActive ? 'text-emerald-600 dark:text-emerald-400' : ''
                  }`}
                />
                <div className="min-w-0">
                  <span className="block text-sm font-semibold truncate">{benefit.title}</span>
                  <span className="block text-[11px] font-normal text-muted-foreground truncate">
                    {!isVfp
                      ? 'Seulement pour les membres VFP'
                      : isBenefitLockedToday
                        ? 'Déjà utilisé aujourd’hui'
                        : benefit.subtitle}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {isDisabledState && <Lock className="size-3.5 text-muted-foreground" />}
                <Badge
                  variant={isParkingActive ? 'default' : 'secondary'}
                  className={`text-[11px] font-semibold ${
                    isParkingActive ? 'bg-emerald-600 text-white' : ''
                  }`}
                >
                  {isParkingActive && acknowledgment
                    ? formatRemainingCountdown(acknowledgment.expiresAt, nowMs)
                    : benefit.perkBadge}
                </Badge>
              </div>
            </Button>
          );
        })}
      </div>

      {isSessionActive && acknowledgment && (
        <Card
          className="border-emerald-500/50 bg-gradient-to-br from-emerald-500/10 via-card to-card shadow-sm"
          role="status"
          aria-live="polite"
        >
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="rounded-lg bg-background/80 border p-2.5 flex flex-col items-center justify-center text-center">
                <span className="block text-[11px] text-muted-foreground mb-1">
                  Début / Expiration
                </span>
                <span className="font-mono font-bold text-lg sm:text-xl tracking-wide text-foreground whitespace-nowrap">
                  {formatParisTime(acknowledgment.startedAt)} →{' '}
                  <span className="text-emerald-700 dark:text-emerald-400">
                    {formatParisTime(acknowledgment.expiresAt)}
                  </span>
                </span>
              </div>

              <div className="rounded-lg bg-background/80 border p-2.5 flex items-center justify-between sm:justify-start gap-2">
                <div>
                  <span className="block text-[11px] text-muted-foreground mb-0.5">Véhicule</span>
                  <FrenchLicensePlateBadge plate={acknowledgment.licensePlate} />
                </div>
              </div>

              <div className="rounded-lg bg-background/80 border p-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="block text-[11px] text-muted-foreground">Référence ticket</span>
                  <span className="block font-mono text-xs font-semibold text-foreground break-all">
                    {acknowledgment.ticketReference}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyReference(acknowledgment.ticketReference)}
                  className="shrink-0 min-h-8 gap-1 text-xs"
                  aria-label="Copier la référence du ticket"
                >
                  {copiedReference ? (
                    <Check className="size-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isParkingDialogOpen} onOpenChange={setIsParkingDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ParkingSquare className="size-5 text-primary" />
              <span>Activer le stationnement gratuit (20 min)</span>
            </DialogTitle>
            <DialogDescription>
              {isSessionActive
                ? 'Votre session de stationnement gratuit est déjà active.'
                : 'Sélectionnez le véhicule à couvrir pour lancer immédiatement votre session.'}
            </DialogDescription>
          </DialogHeader>

          {isSessionActive && acknowledgment ? (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-xs space-y-2">
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                Ticket actif jusqu’à {formatParisTime(acknowledgment.expiresAt)}
              </p>
              <p className="font-mono text-foreground break-all">
                Réf. : {acknowledgment.ticketReference}
              </p>
            </div>
          ) : licensePlates.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-center space-y-3">
              <Car className="size-6 mx-auto text-muted-foreground/70" />
              <p className="text-xs text-muted-foreground">
                Ajoutez une plaque d’immatriculation pour activer votre stationnement gratuit.
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setIsParkingDialogOpen(false);
                  onManageVehicles();
                }}
                className="w-full min-h-11 gap-1.5 text-xs"
              >
                <Plus className="size-4" />
                <span>Ajouter un véhicule</span>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2">
                {licensePlates.map((plate) => {
                  const isSelected = selectedPlate === plate;
                  return (
                    <button
                      key={plate}
                      type="button"
                      onClick={() => setSelectedPlate(plate)}
                      aria-pressed={isSelected}
                      className={`flex items-center justify-between min-h-11 px-3 py-2 rounded-xl border text-left transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-border bg-background hover:bg-muted/30'
                      }`}
                    >
                      <FrenchLicensePlateBadge plate={plate} />
                      <span className="text-xs font-medium text-primary">
                        {isSelected ? 'Sélectionné' : 'Choisir'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"
                >
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1.5">
                    <p>{errorMessage}</p>
                    <button
                      type="button"
                      onClick={handleActivate}
                      className="inline-flex items-center gap-1 font-semibold underline"
                    >
                      <RefreshCw className="size-3" />
                      <span>Réessayer</span>
                    </button>
                  </div>
                </div>
              )}

              <Button
                type="button"
                onClick={handleActivate}
                disabled={!selectedPlate || isSubmitting}
                className="w-full min-h-11 gap-2 text-sm font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Activation en cours…</span>
                  </>
                ) : (
                  <>
                    <ParkingSquare className="size-4" />
                    <span>Activer mes 20 min gratuites</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={feedbackDialog !== null}
        onOpenChange={(open) => {
          if (!open) setFeedbackDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {feedbackDialog === 'vfp-required' ? (
                <>
                  <Crown className="size-5 text-amber-500" />
                  <span>Réservé aux membres VFP</span>
                </>
              ) : feedbackDialog === 'benefit-used' ? (
                <>
                  <Lock className="size-5 text-muted-foreground" />
                  <span>Avantage journalier déjà utilisé</span>
                </>
              ) : (
                <>
                  <Bus className="size-5 text-primary" />
                  <span>Transports en commun VFP</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {feedbackDialog === 'vfp-required'
                ? 'Cet avantage est réservé aux clients disposant du statut Very Faithful Person (VFP) actif. Effectuez au moins 10 achats sur 15 jours glissants pour le débloquer.'
                : feedbackDialog === 'benefit-used'
                  ? 'Vous avez déjà bénéficié de votre avantage gratuit aujourd’hui. Un nouvel avantage sera disponible demain.'
                  : 'L’activation des titres de transport en commun gratuits sera disponible prochainement.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" className="w-full" />}>
              Compris
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
