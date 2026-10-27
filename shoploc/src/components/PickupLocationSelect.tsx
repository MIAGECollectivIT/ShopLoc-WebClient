import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Store } from '@/types/store';
import { Building2, Store as StoreIcon } from 'lucide-react';

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
  stores = [],
  disabled = false,
  className,
}: PickupLocationSelectProps) {
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
        <SelectValue placeholder="Sélectionnez un point de retrait" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Services municipaux</SelectLabel>
          <SelectItem value={DEFAULT_MUNICIPALITY_LOCATION}>
            <Building2 className="size-4 shrink-0 text-primary" />
            <span>{DEFAULT_MUNICIPALITY_LOCATION}</span>
          </SelectItem>
        </SelectGroup>

        {stores.length > 0 && (
          <SelectGroup>
            <SelectLabel>Commerces partenaires</SelectLabel>
            {stores.map((store) => {
              const label = `${store.name} — ${store.address}`;
              return (
                <SelectItem key={store.id ?? store.name} value={label}>
                  <StoreIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span>{label}</span>
                </SelectItem>
              );
            })}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
}
