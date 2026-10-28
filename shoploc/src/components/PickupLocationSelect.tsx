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
import { Building2, Store as StoreIcon, Loader2, AlertCircle, RotateCw } from 'lucide-react';

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

  const fetchStores = React.useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const data = await getStores();
      setStores(data);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    // If stores are already populated (e.g. from SSR), avoid redundant client-side fetching
    if (initialStores.length > 0) {
      setStores(initialStores);
      setIsLoading(false);
      return;
    }

    fetchStores();
  }, [initialStores, fetchStores]);

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
            <div className="flex items-center justify-between gap-2 px-2.5 py-2 text-xs text-muted-foreground bg-muted/40 rounded-md my-1">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="size-3.5 shrink-0 text-amber-500" />
                <span>Commerces indisponibles</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  fetchStores();
                }}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline p-1 rounded hover:bg-muted cursor-pointer"
              >
                <RotateCw className="size-3" />
                <span>Réessayer</span>
              </button>
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
