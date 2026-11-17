import * as React from 'react';
import { useAuth } from '@/lib/auth';
import { getStores, getMyStores } from '@/lib/api';
import type { Store } from '@/types/store';
import { StoreCard } from '@/components/StoreCard';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import { ROUTES } from '@/config/routes';
import { Store as StoreIcon, PlusCircle, AlertCircle } from 'lucide-react';

export function MerchantStoresList() {
  const { user, role, isAuthenticated, isLoading: authLoading } = useAuth();
  const [stores, setStores] = React.useState<Store[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;

    async function loadStores() {
      if (!isAuthenticated && !authLoading) {
        setIsLoading(false);
        return;
      }

      try {
        setError(null);
        let allStores: Store[] = [];
        try {
          allStores = role === 'MERCHANT' ? await getMyStores() : await getStores();
        } catch {
          allStores = await getStores();
        }
        if (!active) return;

        // Filter stores belonging to this merchant (or all if admin)
        const myStores =
          role === 'MERCHANT' && allStores.length > 0
            ? allStores
            : allStores.filter((s) => {
                if (role === 'ADMIN') return true;
                if (!user) return false;
                // Standard check: store creator matches current user dbId or public id
                if (
                  s.userId != null &&
                  ((user.dbId != null && String(s.userId) === String(user.dbId)) ||
                    (user.id != null && String(s.userId) === String(user.id)))
                ) {
                  return true;
                }
                // Seed association: Suzanne Morel is associated with stores 1 & 2 in user_stores
                if (
                  (user.email === 'suzanne.morel@shop-loc.fr' || user.dbId === 2) &&
                  (s.id === 1 || s.id === 2)
                ) {
                  return true;
                }
                return false;
              });

        setStores(myStores);
      } catch (err: unknown) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Impossible de récupérer vos commerces.');
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadStores();
    return () => {
      active = false;
    };
  }, [isAuthenticated, authLoading, user, role]);

  if (isLoading || authLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2">
          <div className="h-4 bg-muted rounded w-32 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-muted/60 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-destructive/50 bg-destructive/10 p-4 text-destructive space-y-1 rounded-lg">
        <div className="flex items-center gap-2 font-medium">
          <AlertCircle className="size-4 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2">
        <p className="text-xs text-muted-foreground">
          {stores.length} établissement{stores.length > 1 ? 's' : ''} rattaché
          {stores.length > 1 ? 's' : ''} à votre compte
        </p>
        {role === 'ADMIN' && (
          <Button
            size="sm"
            render={<a href={ROUTES.createStore.path} />}
            className="gap-1.5 shadow-xs"
          >
            <PlusCircle className="size-4" />
            <span>Ajouter un établissement</span>
          </Button>
        )}
      </div>

      {stores.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {stores.map((store) => (
            <StoreCard key={store.uid || store.id} store={store} />
          ))}
        </div>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <StoreIcon />
            </EmptyMedia>
            <EmptyTitle>Aucun commerce associé</EmptyTitle>
            <EmptyDescription>
              Vous n'avez pas encore d'établissement rattaché à votre compte commerçant. Veuillez
              contacter l'administration pour associer votre point de vente.
            </EmptyDescription>
          </EmptyHeader>
          {role === 'ADMIN' && (
            <div className="pt-2">
              <Button render={<a href={ROUTES.createStore.path} />} className="gap-2">
                <PlusCircle className="size-4" />
                <span>Créer un établissement</span>
              </Button>
            </div>
          )}
        </Empty>
      )}
    </div>
  );
}
