import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getStores } from '@/lib/api';
import type { Store } from '@/types/store';
import { Building2, Store as StoreIcon, Loader2, AlertCircle } from 'lucide-react';

export const DEFAULT_MUNICIPALITY_LOCATION = "Mairie — Hôtel de Ville (Point d'accueil principal)";

interface PickupLocationSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  stores?: Store[];
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function PickupLocationSelect({
  value,
  onValueChange,
  stores: initialStores = [],
  disabled = false,
  className,
}: PickupLocationSelectProps) {
  const [stores, setStores] = React.useState<Store[]>(initialStores);
  const [isLoading, setIsLoading] = React.useState<boolean>(initialStores.length === 0);
  const [hasError, setHasError] = React.useState<boolean>(false);

  React.useEffect(() => {
    // If stores are already populated (e.g. from SSR), avoid redundant client-side fetching
    if (initialStores.length > 0) {
      setStores(initialStores);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setHasError(false);

    getStores()
      .then((data) => {
        if (isMounted) {
          setStores(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [initialStores]);

  return (
    <Select
      value={value}
      onValueChange={(val) => {
        if (val) {
          onValueChange(val);
        }
      }}
      disabled={disabled}
    >
      <SelectTrigger className={className ?? 'w-full'}>
        <div className="flex items-center gap-2 truncate">
          {isLoading && (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground shrink-0" />
          )}
          <SelectValue placeholder="Sélectionnez un point de retrait" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {/* Primary municipality pickup point */}
        <SelectGroup>
          <SelectLabel>Services municipaux</SelectLabel>
          <SelectItem value={DEFAULT_MUNICIPALITY_LOCATION}>
            <Building2 className="size-4 shrink-0 text-primary" />
            <span>{DEFAULT_MUNICIPALITY_LOCATION}</span>
          </SelectItem>
        </SelectGroup>

        {/* Dynamic partner stores list */}
        <SelectGroup>
          <SelectLabel>
            Commerces partenaires {stores.length > 0 ? `(${stores.length})` : ''}
          </SelectLabel>

          {isLoading && (
            <div className="flex items-center gap-2 px-2.5 py-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin shrink-0 text-primary" />
              <span>Chargement des commerces partenaires...</span>
            </div>
          )}

          {hasError && !isLoading && stores.length === 0 && (
            <div className="flex items-center gap-2 px-2.5 py-2 text-xs text-muted-foreground">
              <AlertCircle className="size-3.5 shrink-0 text-amber-500" />
              <span>Commerces temporairement indisponibles</span>
            </div>
          )}

          {!isLoading &&
            stores.map((store) => {
              const label = `${store.name} — ${store.address}`;
              return (
                <SelectItem key={store.id ?? store.name} value={label}>
                  <StoreIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span>{label}</span>
                </SelectItem>
              );
            })}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
