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
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getPartners } from '@/lib/api';
import type { PartnerAccount } from '@/types/store';
import {
  UserCheck,
  Search,
  Building,
  Mail,
  Loader2,
  Store,
  UserPlus,
  ExternalLink,
} from 'lucide-react';

interface PartnerSelectProps {
  value: number | '';
  onValueChange: (userId: number) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/**
 * Autocompletion dropdown component for searching and linking an existing partner account (SLE-87).
 * Implements real-time debounced query filtering across partner name, company, and email.
 */
export function PartnerSelect({
  value,
  onValueChange,
  disabled = false,
  className,
}: PartnerSelectProps) {
  const [partners, setPartners] = React.useState<PartnerAccount[]>([]);
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [selectedPartner, setSelectedPartner] = React.useState<PartnerAccount | null>(null);

  // Debounce search query input by 250ms
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 250);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch matching partners whenever the debounced query updates
  React.useEffect(() => {
    let isCancelled = false;

    async function loadPartners() {
      setIsLoading(true);
      try {
        const results = await getPartners(debouncedQuery, 20);
        if (!isCancelled) {
          setPartners(results);

          // If a value is selected, keep its reference cached if not in the result set
          if (value && !selectedPartner) {
            const found = results.find((p) => p.id === Number(value));
            if (found) setSelectedPartner(found);
          }
        }
      } catch {
        if (!isCancelled) {
          setPartners([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadPartners();

    return () => {
      isCancelled = true;
    };
  }, [debouncedQuery, value, selectedPartner]);

  // Sync selected partner if value prop changes externally
  React.useEffect(() => {
    if (value && (!selectedPartner || selectedPartner.id !== Number(value))) {
      const match = partners.find((p) => p.id === Number(value));
      if (match) {
        setSelectedPartner(match);
      }
    } else if (!value) {
      setSelectedPartner(null);
    }
  }, [value, partners, selectedPartner]);

  return (
    <div className="space-y-1.5">
      <Select
        value={value ? String(value) : ''}
        onValueChange={(val) => {
          if (val) {
            const numId = Number(val);
            const found = partners.find((p) => p.id === numId) || null;
            setSelectedPartner(found);
            onValueChange(numId);
          }
        }}
        disabled={disabled}
      >
        <SelectTrigger className={className ?? 'w-full'}>
          <div className="flex items-center gap-2 truncate">
            {isLoading ? (
              <Loader2 className="size-3.5 animate-spin text-muted-foreground shrink-0" />
            ) : (
              <UserCheck className="size-4 text-primary shrink-0" />
            )}
            <SelectValue placeholder="Sélectionner le compte partenaire">
              {selectedPartner ? (
                <span className="truncate font-medium text-foreground">
                  {selectedPartner.name}
                  {selectedPartner.companyName ? ` (${selectedPartner.companyName})` : ''}
                </span>
              ) : (
                'Sélectionner le compte partenaire propriétaire'
              )}
            </SelectValue>
          </div>
        </SelectTrigger>

        <SelectContent
          side="bottom"
          align="start"
          alignItemWithTrigger={false}
          sideOffset={6}
          className="max-h-80 w-[var(--anchor-width)] min-w-full"
        >
          {/* Autocompletion search input */}
          <div className="p-2 border-b sticky top-0 bg-popover z-10">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                name="search-partner-filter"
                autoComplete="off"
                data-1p-ignore="true"
                data-lpignore="true"
                data-bwignore="true"
                spellCheck={false}
                autoCorrect="off"
                placeholder="Rechercher par nom, enseigne ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                className="h-8 pl-8 pr-7 text-xs"
                autoFocus
              />
              {isLoading && (
                <Loader2 className="absolute right-2.5 top-2.5 size-3.5 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          <SelectGroup>
            <div className="flex items-center justify-between px-2 py-1.5">
              <SelectLabel className="text-xs font-semibold text-muted-foreground">
                Partenaires disponibles ({partners.length})
              </SelectLabel>
            </div>

            {/* Empty state when no partners match the query */}
            {!isLoading && partners.length === 0 && (
              <div className="p-4 space-y-2 text-center">
                <p className="text-xs text-muted-foreground">
                  Aucun compte partenaire trouvé {searchQuery ? `pour « ${searchQuery} »` : ''}.
                </p>
                <div className="pt-1">
                  <a
                    href="/register"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline bg-primary/10 hover:bg-primary/15 px-2.5 py-1.5 rounded-md transition-colors"
                  >
                    <UserPlus className="size-3.5" />
                    <span>Créer un nouveau compte partenaire</span>
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              </div>
            )}

            {/* Matching partners list */}
            {partners.map((partner) => (
              <SelectItem
                key={partner.id}
                value={String(partner.id)}
                className="cursor-pointer py-2 text-xs"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <span>{partner.name}</span>
                    {partner.companyName && (
                      <span className="text-muted-foreground font-normal flex items-center gap-1">
                        <Building className="size-3" />
                        {partner.companyName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1 truncate">
                      <Mail className="size-3" />
                      {partner.email}
                    </span>
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 shrink-0 gap-1">
                      <Store className="size-2.5" />
                      <span>
                        {partner.existingStoresCount === 0
                          ? 'Nouveau'
                          : `${partner.existingStoresCount} commerce${partner.existingStoresCount > 1 ? 's' : ''}`}
                      </span>
                    </Badge>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      {/* Helper text stating multi-store ownership business rule (SLE-69) */}
      <p className="text-[11px] text-muted-foreground">
        Règle ShopLoc : Un même compte partenaire peut être propriétaire de plusieurs
        établissements.
      </p>
    </div>
  );
}
