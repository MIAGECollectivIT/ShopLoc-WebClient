import { MapPin, Store as StoreIcon, ShieldCheck, Ban } from 'lucide-react';
import type { Store } from '@/types/store';
import { resolveStoreImageUrl } from '@/lib/image';
import { computeStoreOpenStatus } from '@/lib/opening-hours';
import { useAuth } from '@/lib/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';

interface StoreCardProps {
  store: Store;
}

export function StoreCard({ store }: StoreCardProps) {
  const { user, role } = useAuth();
  const resolvedImageUrl = resolveStoreImageUrl(store.url, store.uid || store.id);
  const openStatus = computeStoreOpenStatus(
    store.openingHours,
    store.absenceStartDate,
    store.absenceEndDate,
    store.absences
  );

  const isMyStore =
    role === 'MERCHANT' &&
    ((store.userId != null &&
      ((user?.dbId != null && String(user.dbId) === String(store.userId)) ||
        (user?.id != null && String(user.id) === String(store.userId)))) ||
      ((user?.email === 'suzanne.morel@shop-loc.fr' || user?.dbId === 2) &&
        (store.id === 1 || store.id === 2)));

  return (
    <Card className={isMyStore ? 'ring-2 ring-primary/40 border-primary/50' : undefined}>
      <div className="relative overflow-hidden">
        {resolvedImageUrl ? (
          <img
            src={resolvedImageUrl}
            alt={store.name}
            className="h-40 w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-40 bg-muted flex flex-col items-center justify-center text-muted-foreground">
            <StoreIcon className="size-8" />
            <span className="text-xs">Pas d'image</span>
          </div>
        )}

        {(store.openingHours ||
          store.absenceStartDate ||
          (store.absences && store.absences.length > 0)) &&
          openStatus.badgeVariant === 'open' && (
            <div className="absolute top-2.5 right-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-600/95 text-white shadow-md backdrop-blur-md border border-emerald-400/40">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                Ouvert actuellement
              </span>
            </div>
          )}
      </div>

      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-1.5 leading-snug">
          <span className="break-words font-semibold">{store.name}</span>
          <div className="flex items-center gap-1">
            {store.status === 'REVOKED' ? (
              <Badge
                variant="destructive"
                className="text-[10px] shrink-0 gap-1 font-semibold whitespace-nowrap"
              >
                <Ban className="size-3" />
                Partenariat révoqué
              </Badge>
            ) : isMyStore ? (
              <Badge
                variant="secondary"
                className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[10px] shrink-0 gap-1 font-semibold whitespace-nowrap"
              >
                <ShieldCheck className="size-3" />
                Votre commerce
              </Badge>
            ) : null}
          </div>
        </CardTitle>
        <CardDescription className="flex items-start gap-1">
          <MapPin className="size-3.5 shrink-0 mt-0.5" />
          <span className="break-words leading-tight">{store.address}</span>
        </CardDescription>

        {store.status === 'REVOKED' ? (
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs pt-1.5 leading-normal">
            <span className="size-2 rounded-full shrink-0 bg-destructive" />
            <span className="font-semibold text-destructive break-words">
              Commerce neutralisé — Partenariat clôturé
            </span>
          </div>
        ) : (
          (store.openingHours ||
            store.absenceStartDate ||
            (store.absences && store.absences.length > 0)) && (
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs pt-1.5 leading-normal">
              <span
                className={`size-2 rounded-full shrink-0 ${
                  openStatus.badgeVariant === 'open'
                    ? 'bg-emerald-500 animate-pulse'
                    : openStatus.badgeVariant === 'absent'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                }`}
              />
              <span className="font-semibold text-foreground break-words">
                {openStatus.badgeVariant === 'open'
                  ? 'Ouvert actuellement'
                  : openStatus.badgeVariant === 'absent'
                    ? 'Fermé pour absence'
                    : 'Fermé actuellement'}
              </span>
              {openStatus.statusText && (
                <span className="text-muted-foreground text-[11px] break-words">
                  &bull; {openStatus.statusText}
                </span>
              )}
            </div>
          )
        )}
      </CardHeader>

      <CardFooter className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {store.category && (
            <Badge
              variant="outline"
              className="bg-primary/5 text-primary border-primary/20 text-xs font-normal"
            >
              {store.category}
            </Badge>
          )}
          {store.status === 'REVOKED' ? (
            <Badge variant="destructive" className="text-xs">
              Révoqué
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              Partenaire
            </Badge>
          )}
        </div>
        {(store.uid || store.id) && (
          <Button
            variant={isMyStore && store.status !== 'REVOKED' ? 'default' : 'outline'}
            size="sm"
            render={<a href={ROUTES.storeDetail(store.uid || store.id!)} />}
          >
            {isMyStore
              ? store.status === 'REVOKED'
                ? 'Consulter (révoqué)'
                : 'Gérer mon commerce'
              : 'Détails'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
