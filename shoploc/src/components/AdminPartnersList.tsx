import * as React from 'react';
import type { AdminPartnerSummary } from '@/types/partner';
import { getAdminPartners } from '@/lib/api';
import { ROUTES } from '@/config/routes';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import {
  Search,
  Building,
  Mail,
  Store,
  ChevronRight,
  AlertCircle,
  X,
  Users,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

interface AdminPartnersListProps {
  initialPartners?: AdminPartnerSummary[];
}

export function AdminPartnersList({ initialPartners = [] }: AdminPartnersListProps) {
  const [partners, setPartners] = React.useState<AdminPartnerSummary[]>(initialPartners);
  const [query, setQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Debounce search input by 300ms
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch partners whenever debounced query updates
  const fetchPartners = React.useCallback(async (searchQuery: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAdminPartners(searchQuery);
      setPartners(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de récupérer la liste des partenaires administratifs.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    // If we have an initial list and query is empty, only re-fetch if we didn't have initialPartners
    if (debouncedQuery !== '' || initialPartners.length === 0) {
      fetchPartners(debouncedQuery);
    } else {
      setPartners(initialPartners);
    }
  }, [debouncedQuery, initialPartners, fetchPartners]);

  // Calculations for quick metrics
  const totalStores = React.useMemo(() => {
    return partners.reduce((acc, p) => acc + (p.existingStoresCount || 0), 0);
  }, [partners]);

  const partnersWithStores = React.useMemo(() => {
    return partners.filter((p) => (p.existingStoresCount || 0) > 0).length;
  }, [partners]);

  const handleClear = () => {
    setQuery('');
  };

  const getInitials = (name: string) => {
    if (!name) return 'CP';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Search Bar & Quick Metrics */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Rechercher par nom, enseigne ou email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full"
              aria-label="Effacer la recherche"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Global summary chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-card text-card-foreground">
            <Users className="size-3.5 text-primary shrink-0" />
            <span className="text-muted-foreground">Partenaires :</span>
            <span className="font-semibold">{partners.length}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-card text-card-foreground">
            <Store className="size-3.5 text-blue-500 shrink-0" />
            <span className="text-muted-foreground">Commerces :</span>
            <span className="font-semibold">{totalStores}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-card text-card-foreground">
            <ShieldCheck className="size-3.5 text-emerald-500 shrink-0" />
            <span className="text-muted-foreground">Actifs :</span>
            <span className="font-semibold">{partnersWithStores}</span>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertCircle className="size-5 shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchPartners(debouncedQuery)}
            className="gap-1.5 shrink-0 text-destructive border-destructive/30 hover:bg-destructive/20"
          >
            <RefreshCw className="size-3.5" />
            Réessayer
          </Button>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-11 rounded-full" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-4 w-full" />
              <div className="flex justify-between items-center pt-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-8 w-24" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Partners Cards Grid */}
      {!isLoading && !error && partners.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {partners.map((partner) => (
            <Card
              key={partner.id}
              className="flex flex-col justify-between hover:border-primary/50 transition-colors shadow-sm"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm border border-primary/20 shrink-0">
                      {getInitials(partner.name)}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base font-semibold truncate leading-snug">
                        {partner.name || 'Partenaire sans nom'}
                      </CardTitle>
                      <Badge variant="outline" className="mt-1 text-[11px] font-mono">
                        ID #{partner.id}
                      </Badge>
                    </div>
                  </div>
                  <Badge
                    variant={partner.role === 'MERCHANT' ? 'default' : 'secondary'}
                    className="text-[10px] shrink-0 uppercase tracking-wide font-medium"
                  >
                    {partner.role === 'MERCHANT' ? 'Commerçant' : partner.role}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-2.5 text-xs text-muted-foreground pb-4">
                {partner.companyName && (
                  <div className="flex items-center gap-2 text-foreground font-medium truncate">
                    <Building className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{partner.companyName}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 truncate">
                  <Mail className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{partner.email}</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Store className="size-4 shrink-0 text-muted-foreground" />
                  <span>
                    <strong className="text-foreground font-semibold">
                      {partner.existingStoresCount}
                    </strong>{' '}
                    commerce{partner.existingStoresCount > 1 ? 's' : ''} affilié
                    {partner.existingStoresCount > 1 ? 's' : ''}
                  </span>
                </div>
              </CardContent>

              <CardFooter className="pt-2 border-t bg-muted/20 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground font-mono truncate max-w-[140px]">
                  {partner.publicId ? `${partner.publicId.slice(0, 8)}...` : ''}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  render={<a href={ROUTES.adminPartnerDetail(partner.id)} />}
                  className="gap-1 text-xs"
                >
                  <span>Voir la fiche</span>
                  <ChevronRight className="size-3.5" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Empty Search Result State */}
      {!isLoading && !error && partners.length === 0 && (
        <Empty className="py-12 border rounded-xl bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users className="size-8 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>Aucun partenaire trouvé</EmptyTitle>
            <EmptyDescription>
              {query
                ? `Aucun compte partenaire ne correspond au terme "${query}".`
                : 'Aucun compte partenaire commerçant enregistré dans le système.'}
            </EmptyDescription>
          </EmptyHeader>
          {query && (
            <div className="pt-4 flex justify-center">
              <Button variant="secondary" size="sm" onClick={handleClear} className="gap-1.5">
                <X className="size-3.5" />
                Effacer la recherche
              </Button>
            </div>
          )}
        </Empty>
      )}
    </div>
  );
}
