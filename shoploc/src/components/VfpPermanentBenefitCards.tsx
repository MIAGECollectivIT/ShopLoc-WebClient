import * as React from 'react';
import { Button } from '@/components/ui/button';
import { CatalogItemCard } from '@/components/CatalogItemCard';
import {
  activateVfpParkingSession,
  activateVfpTransitTicket,
  getCurrentUserProfile,
  getVfpDailyEligibility,
} from '@/lib/api';
import { ROUTES } from '@/config/routes';
import type { VfpDailyEligibility } from '@/types/loyalty';
import {
  Bus,
  Car,
  CheckCircle2,
  Clock,
  Crown,
  Loader2,
  Lock,
  ParkingSquare,
  Ticket,
} from 'lucide-react';

export interface VfpPermanentBenefitCardsProps {
  isAuthenticated: boolean;
  isVfp: boolean;
  licensePlates?: string[];
}

/**
 * Renders the 2 permanent daily VFP privileges (Free Parking 20 min/day OR Free Transit Ticket/day,
 * mutually exclusive once per day) using the shared CatalogItemCard base.
 */
export function VfpPermanentBenefitCards({
  isAuthenticated,
  isVfp,
  licensePlates = [],
}: VfpPermanentBenefitCardsProps) {
  const [eligibility, setEligibility] = React.useState<VfpDailyEligibility | null>(null);
  const [livePlates, setLivePlates] = React.useState<string[] | null>(null);
  const [selectedPlate, setSelectedPlate] = React.useState<string>('');
  const [submitting, setSubmitting] = React.useState<'parking' | 'transit' | null>(null);
  const [parkingError, setParkingError] = React.useState<string | null>(null);
  const [transitError, setTransitError] = React.useState<string | null>(null);

  const effectivePlates = livePlates ?? licensePlates;

  React.useEffect(() => {
    if (effectivePlates.length > 0 && !effectivePlates.includes(selectedPlate)) {
      setSelectedPlate(effectivePlates[0]);
    } else if (effectivePlates.length === 0 && selectedPlate) {
      setSelectedPlate('');
    }
  }, [effectivePlates, selectedPlate]);

  const loadEligibility = React.useCallback(async () => {
    if (!isAuthenticated || !isVfp) {
      setEligibility(null);
      return;
    }
    try {
      const data = await getVfpDailyEligibility();
      setEligibility(data);
    } catch {
      // Graceful fallback
    }
  }, [isAuthenticated, isVfp]);

  React.useEffect(() => {
    loadEligibility();
  }, [loadEligibility]);

  React.useEffect(() => {
    let isMounted = true;
    if (!isAuthenticated || !isVfp) {
      setLivePlates(null);
      return;
    }
    getCurrentUserProfile()
      .then((profile) => {
        if (isMounted && Array.isArray(profile.licensePlates)) {
          setLivePlates(profile.licensePlates);
        }
      })
      .catch(() => {
        // Fallback to licensePlates prop
      });
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, isVfp]);

  const parkingUsedToday = Boolean(eligibility?.parkingUsedToday);
  const transitUsedToday = Boolean(eligibility?.transitUsedToday);
  const isEligibleToday = eligibility ? eligibility.eligible : true;

  const handleActivateParking = async () => {
    const plate = selectedPlate || effectivePlates[0];
    if (!plate) {
      window.location.href = ROUTES.profile.path;
      return;
    }
    setSubmitting('parking');
    setParkingError(null);
    try {
      await activateVfpParkingSession(plate);
      await loadEligibility();
    } catch (err: unknown) {
      setParkingError(
        err instanceof Error ? err.message : "Impossible d'activer le stationnement."
      );
    } finally {
      setSubmitting(null);
    }
  };

  const handleActivateTransit = async () => {
    setSubmitting('transit');
    setTransitError(null);
    try {
      await activateVfpTransitTicket();
      await loadEligibility();
    } catch (err: unknown) {
      setTransitError(
        err instanceof Error ? err.message : "Impossible d'activer le ticket de transport."
      );
    } finally {
      setSubmitting(null);
    }
  };

  const dailyBadge = (
    <span className="bg-amber-600/95 text-white font-medium text-[11px] px-2.5 py-0.5 rounded-full shadow-xs backdrop-blur-xs flex items-center gap-1">
      <Clock className="size-3" />1 fois / jour
    </span>
  );

  const eyebrow = (
    <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 font-medium">
      <Crown className="size-3 shrink-0" />
      <span>Avantage permanent VFP</span>
    </span>
  );

  const freeBadge = (
    <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0">
      Offert
    </span>
  );

  const lockedButton = (
    <Button
      type="button"
      variant="outline"
      disabled
      className="w-full h-8 text-xs gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 opacity-90 cursor-not-allowed"
    >
      <Lock className="size-3.5 shrink-0" />
      <span>Réservé VFP</span>
    </Button>
  );

  const renderParkingAction = () => {
    if (!isVfp) return lockedButton;
    if (!isEligibleToday) {
      return (
        <Button
          type="button"
          variant="secondary"
          disabled
          className="w-full h-8 text-xs gap-1.5 cursor-not-allowed"
        >
          <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
          <span>
            {parkingUsedToday ? "Activé aujourd'hui" : 'Indisponible (transport utilisé)'}
          </span>
        </Button>
      );
    }
    if (effectivePlates.length === 0) {
      return (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            window.location.href = ROUTES.profile.path;
          }}
          className="w-full h-8 text-xs gap-1.5 cursor-pointer"
        >
          <Car className="size-3.5" />
          <span>Ajouter une plaque sur mon profil</span>
        </Button>
      );
    }
    const activePlate = selectedPlate || effectivePlates[0];
    return (
      <Button
        type="button"
        onClick={handleActivateParking}
        disabled={submitting !== null}
        className="w-full h-8 text-xs gap-1.5 font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
      >
        {submitting === 'parking' ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <ParkingSquare className="size-3.5" />
        )}
        <span>Activer 20 min ({activePlate})</span>
      </Button>
    );
  };

  const renderTransitAction = () => {
    if (!isVfp) return lockedButton;
    if (!isEligibleToday) {
      return (
        <Button
          type="button"
          variant="secondary"
          disabled
          className="w-full h-8 text-xs gap-1.5 cursor-not-allowed"
        >
          <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
          <span>
            {transitUsedToday
              ? "Ticket activé aujourd'hui"
              : 'Indisponible (stationnement utilisé)'}
          </span>
        </Button>
      );
    }
    return (
      <Button
        type="button"
        onClick={handleActivateTransit}
        disabled={submitting !== null}
        className="w-full h-8 text-xs gap-1.5 font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
      >
        {submitting === 'transit' ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Ticket className="size-3.5" />
        )}
        <span>Activer mon ticket du jour</span>
      </Button>
    );
  };

  return (
    <>
      <CatalogItemCard
        className="border-amber-500/40 ring-1 ring-amber-500/15"
        media={
          <div className="w-full h-full bg-gradient-to-br from-amber-500/15 via-primary/10 to-muted/40 flex items-center justify-center">
            <ParkingSquare
              className={`size-16 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform duration-300 ${
                !isVfp ? 'opacity-65' : ''
              }`}
            />
          </div>
        }
        topRightBadge={dailyBadge}
        eyebrow={eyebrow}
        title="Stationnement gratuit"
        valueSlot={freeBadge}
        description="20 min de stationnement offertes en voirie (1 avantage au choix par jour : stationnement ou transport)."
        extraBody={
          <div className="space-y-1.5">
            {isVfp && isEligibleToday && effectivePlates.length > 1 && (
              <select
                aria-label="Sélectionner une plaque d'immatriculation"
                value={selectedPlate || effectivePlates[0]}
                onChange={(e) => setSelectedPlate(e.target.value)}
                className="w-full h-7 text-[11px] px-2 rounded-md border border-border bg-background text-foreground focus:ring-1 focus:ring-ring outline-none"
              >
                {effectivePlates.map((plate) => (
                  <option key={plate} value={plate}>
                    Plaque : {plate}
                  </option>
                ))}
              </select>
            )}
            {parkingError && submitting !== 'parking' && (
              <p className="text-[11px] text-destructive pt-0.5">{parkingError}</p>
            )}
          </div>
        }
        footer={renderParkingAction()}
      />

      <CatalogItemCard
        className="border-amber-500/40 ring-1 ring-amber-500/15"
        media={
          <div className="w-full h-full bg-gradient-to-br from-amber-500/15 via-sky-500/10 to-muted/40 flex items-center justify-center">
            <Bus
              className={`size-16 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform duration-300 ${
                !isVfp ? 'opacity-65' : ''
              }`}
            />
          </div>
        }
        topRightBadge={dailyBadge}
        eyebrow={eyebrow}
        title="Ticket de transport offert"
        valueSlot={freeBadge}
        description="1 titre de transport en commun offert par jour (1 avantage au choix par jour : transport ou stationnement)."
        extraBody={
          transitError && submitting !== 'transit' ? (
            <p className="text-[11px] text-destructive pt-1">{transitError}</p>
          ) : undefined
        }
        footer={renderTransitAction()}
      />
    </>
  );
}
