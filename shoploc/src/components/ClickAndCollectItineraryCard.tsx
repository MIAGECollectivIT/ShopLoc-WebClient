import * as React from 'react';
import type { OptimizeItineraryResponse, TransportMode } from '@/types/itinerary';
import { optimizeStoreItinerary, optimizeOrderItinerary } from '@/lib/api';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { AddressAutocompleteInput } from '@/components/AddressAutocompleteInput';
import {
  Navigation,
  MapPin,
  Clock,
  Car,
  Footprints,
  Bike,
  Locate,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Store as StoreIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClickAndCollectItineraryCardProps {
  orderReference?: string;
  storeUids?: string[];
  className?: string;
}

export function ClickAndCollectItineraryCard({
  orderReference,
  storeUids,
  className,
}: ClickAndCollectItineraryCardProps) {
  const [itinerary, setItinerary] = React.useState<OptimizeItineraryResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  // User preferences
  const [transportMode, setTransportMode] = React.useState<TransportMode>('DRIVING');
  const [originAddress, setOriginAddress] = React.useState<string>('');
  const [userCoords, setUserCoords] = React.useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isLocating, setIsLocating] = React.useState<boolean>(false);

  const fetchItinerary = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let res: OptimizeItineraryResponse;
      const originLat = userCoords ? userCoords.latitude : null;
      const originLng = userCoords ? userCoords.longitude : null;
      const originAddr = originAddress.trim() ? originAddress.trim() : null;

      if (orderReference) {
        res = await optimizeOrderItinerary(orderReference, {
          originLatitude: originLat,
          originLongitude: originLng,
          originAddress: originAddr,
          transportMode,
        });
      } else if (storeUids && storeUids.length > 0) {
        res = await optimizeStoreItinerary({
          storeUids,
          originLatitude: originLat,
          originLongitude: originLng,
          originAddress: originAddr,
          transportMode,
        });
      } else {
        setIsLoading(false);
        return;
      }

      setItinerary(res);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Impossible de calculer l'itinéraire de retrait"
      );
    } finally {
      setIsLoading(false);
    }
  }, [orderReference, storeUids, transportMode, userCoords, originAddress]);

  React.useEffect(() => {
    fetchItinerary();
  }, [fetchItinerary]);

  const handleUseCurrentPosition = () => {
    if (!navigator.geolocation) {
      setError('La géolocalisation n’est pas supportée par votre navigateur.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setUserCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setOriginAddress('Ma position actuelle');
      },
      () => {
        setIsLocating(false);
        setError('Impossible de récupérer votre position géographique.');
      },
      { timeout: 8000 }
    );
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Paris',
      });
    } catch {
      return '';
    }
  };

  return (
    <Card className={cn('border-primary/20 shadow-sm overflow-hidden', className)}>
      <CardHeader className="bg-muted/40 p-4 sm:p-5 border-b border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2 font-bold text-foreground">
              <Navigation className="size-5 text-primary shrink-0" />
              <span>Tournée Click & Collect optimisée</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Chemin le plus direct ordonné selon les créneaux d'ouverture et vos retraits (SLE-31,
              SLE-32).
            </CardDescription>
          </div>

          {/* Mode Selector */}
          <div className="flex items-center gap-1 bg-background border border-border p-1 rounded-lg shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setTransportMode('DRIVING')}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors',
                transportMode === 'DRIVING'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Car className="size-3.5" />
              <span className="hidden sm:inline">Voiture</span>
            </button>
            <button
              type="button"
              onClick={() => setTransportMode('WALKING')}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors',
                transportMode === 'WALKING'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Footprints className="size-3.5" />
              <span className="hidden sm:inline">À pied</span>
            </button>
            <button
              type="button"
              onClick={() => setTransportMode('BICYCLE')}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors',
                transportMode === 'BICYCLE'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Bike className="size-3.5" />
              <span className="hidden sm:inline">À vélo</span>
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Departure custom controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center bg-muted/20 p-2.5 rounded-lg border border-border/50 text-xs">
          <div className="sm:col-span-8 flex flex-col gap-1">
            <label
              htmlFor="origin-address-input"
              className="font-medium text-muted-foreground text-[11px]"
            >
              Partir de (facultatif) :
            </label>
            <AddressAutocompleteInput
              id="origin-address-input"
              value={originAddress}
              onChange={(val) => {
                setOriginAddress(val);
                setUserCoords(null);
              }}
              onSelectAddress={(res) => {
                setOriginAddress(res.address);
                setUserCoords({ latitude: res.latitude, longitude: res.longitude });
              }}
              placeholder="Ex: Mon domicile, Place de la République..."
              className="h-8 text-xs"
            />
          </div>

          <div className="sm:col-span-4 flex items-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUseCurrentPosition}
              disabled={isLocating}
              className="w-full h-8 gap-1.5 text-xs text-primary font-medium hover:text-primary mt-auto"
            >
              {isLocating ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Locate className="size-3.5" />
              )}
              <span>Ma position</span>
            </Button>
          </div>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-3 py-6">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-primary" />
              <span>Calcul de la tournée optimale en cours...</span>
            </div>
          </div>
        )}

        {/* Error notice */}
        {error && !isLoading && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Successful calculation result */}
        {!isLoading && itinerary && (
          <div className="space-y-4">
            {/* Top metrics summary */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-primary/5 rounded-lg border border-primary/15 text-center">
              <div>
                <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
                  Distance totale
                </span>
                <span className="text-base sm:text-lg font-bold text-foreground">
                  {itinerary.totalDistanceKm} km
                </span>
              </div>
              <div className="border-x border-border/50">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
                  Durée estimée
                </span>
                <span className="text-base sm:text-lg font-bold text-foreground">
                  {itinerary.estimatedDurationMinutes} min
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
                  Commerces
                </span>
                <span className="text-base sm:text-lg font-bold text-foreground">
                  {itinerary.orderedSteps.length}
                </span>
              </div>
            </div>

            {/* Warnings list if any */}
            {itinerary.warnings && itinerary.warnings.length > 0 && (
              <div className="space-y-1.5">
                {itinerary.warnings.map((warn, i) => (
                  <div
                    key={`warn-${i}`}
                    className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-md text-xs flex items-center gap-2"
                  >
                    <AlertTriangle className="size-3.5 shrink-0" />
                    <span>{warn}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Waypoints cap notice */}
            {itinerary.waypointsTruncated && (
              <p className="text-[11px] text-muted-foreground italic text-center">
                Note : Google Maps limite les itinéraires à 10 arrêts. Les premières étapes sont
                pré-configurées.
              </p>
            )}

            {/* Chronological Steps Timeline */}
            <div className="space-y-2.5 pt-1">
              <span className="text-xs font-semibold text-foreground block">
                Étapes de retrait ordonnées :
              </span>
              <div className="space-y-2">
                {itinerary.orderedSteps.map((step) => {
                  return (
                    <div
                      key={step.storeUid}
                      className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-card hover:bg-muted/30 transition-colors text-xs"
                    >
                      {/* Step index badge */}
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground text-[11px] mt-0.5">
                        {step.stepNumber}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <span className="font-semibold text-foreground text-sm truncate">
                            {step.storeName}
                          </span>
                          {/* Schedule badge */}
                          {step.isClosedAllDay ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                              <AlertTriangle className="size-3" />
                              Fermé toute la journée
                            </span>
                          ) : !step.isOpenAtArrival ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <AlertCircle className="size-3" />
                              Fermé à l'arrivée
                            </span>
                          ) : step.warningAlert ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <Clock className="size-3" />
                              Fermeture imminente
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="size-3" />
                              Ouvert
                            </span>
                          )}
                        </div>

                        {/* Address & colocalization */}
                        <div className="flex items-center gap-1 text-muted-foreground truncate">
                          <MapPin className="size-3 text-primary shrink-0" />
                          <span className="truncate">{step.address}</span>
                          {step.isSameLocationAsPrevious && (
                            <span className="ml-1 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                              Même adresse (retrait groupé)
                            </span>
                          )}
                        </div>

                        {/* Step metrics & arrival estimate */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground pt-0.5">
                          <span>
                            Arrivée estimée :{' '}
                            <strong className="text-foreground">
                              {formatTime(step.estimatedArrivalTime)}
                            </strong>
                          </span>
                          <span>&bull;</span>
                          <span>
                            Trajet : <strong>{step.distanceFromPreviousKm} km</strong> (
                            {step.travelTimeMinutes} min)
                          </span>
                          {step.scheduleInfo && (
                            <>
                              <span>&bull;</span>
                              <span>Plage : {step.scheduleInfo}</span>
                            </>
                          )}
                        </div>

                        {/* Critical warning detail if present */}
                        {step.warningAlert && (
                          <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 pt-0.5">
                            {step.warningAlert}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {!isLoading && itinerary && itinerary.googleMapsUrl && (
        <CardFooter className="p-4 sm:p-5 bg-muted/20 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <StoreIcon className="size-4 text-primary shrink-0" />
            <span>Tous vos commerces sont configurés dans la tournée Google Maps.</span>
          </div>

          <a
            href={itinerary.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({
              variant: 'default',
              size: 'default',
              className: 'w-full sm:w-auto gap-2 text-xs font-semibold shadow-xs',
            })}
          >
            <Navigation className="size-4" />
            <span>Ouvrir l'itinéraire dans Google Maps</span>
            <ExternalLink className="size-3.5 opacity-80" />
          </a>
        </CardFooter>
      )}
    </Card>
  );
}
