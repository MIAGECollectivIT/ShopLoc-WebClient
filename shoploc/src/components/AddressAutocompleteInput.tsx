import * as React from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AddressSuggestion {
  label: string;
  name: string;
  postcode: string;
  city: string;
  context: string;
  latitude: number;
  longitude: number;
}

interface AddressAutocompleteInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onSelectAddress?: (result: { address: string; latitude: number; longitude: number }) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
}

export function AddressAutocompleteInput({
  id = 'address-input',
  value,
  onChange,
  onSelectAddress,
  placeholder = 'Ex: 14 Place Rihour, 59000 Lille',
  disabled = false,
  className,
  required = false,
}: AddressAutocompleteInputProps) {
  const [suggestions, setSuggestions] = React.useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!val || val.trim().length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(val)}&limit=5`
        );
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data.features)) {
            const mapped: AddressSuggestion[] = data.features.map(
              (f: {
                properties: {
                  label: string;
                  name: string;
                  postcode: string;
                  city: string;
                  context: string;
                };
                geometry: { coordinates: [number, number] };
              }) => ({
                label: f.properties.label,
                name: f.properties.name,
                postcode: f.properties.postcode,
                city: f.properties.city,
                context: f.properties.context,
                latitude: f.geometry.coordinates[1],
                longitude: f.geometry.coordinates[0],
              })
            );
            setSuggestions(mapped);
            setIsOpen(mapped.length > 0);
          }
        }
      } catch {
        // Fallback gracieux en cas d'erreur réseau
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  };

  const handleSelect = (item: AddressSuggestion) => {
    onChange(item.label);
    setIsOpen(false);
    if (onSelectAddress) {
      onSelectAddress({
        address: item.label,
        latitude: item.latitude,
        longitude: item.longitude,
      });
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <Input
          id={id}
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={cn('pr-9', className)}
          autoComplete="off"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          {isLoading ? (
            <Loader2 className="size-4 animate-spin text-primary" />
          ) : (
            <MapPin className="size-4" />
          )}
        </div>
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
          {suggestions.map((item, index) => (
            <li
              key={`${item.label}-${index}`}
              onClick={() => handleSelect(item)}
              className="flex cursor-pointer select-none items-center gap-2 rounded-sm px-2.5 py-2 text-xs hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <MapPin className="size-3.5 shrink-0 text-primary" />
              <div className="flex flex-col truncate">
                <span className="font-medium truncate">{item.name || item.label}</span>
                <span className="text-[10px] text-muted-foreground truncate">
                  {item.postcode} {item.city} ({item.context})
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
