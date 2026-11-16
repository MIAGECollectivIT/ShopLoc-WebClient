import * as React from 'react';
import { Store as StoreIcon, AlertCircle, RotateCcw, SearchX } from 'lucide-react';
import type { Store } from '@/types/store';
import { searchStores } from '@/lib/api';
import { StoreCard } from '@/components/StoreCard';
import { StoreSearchBar } from '@/components/StoreSearchBar';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import { Button } from '@/components/ui/button';

export interface StoreDirectoryViewProps {
  initialStores: Store[];
  initialError?: string | null;
}

/**
 * Interactive store directory page component (SLE-216, SLE-215).
 * Implements a hybrid search: fetches from /v1/stores/search with debounce
 * and gracefully falls back to client-side filtering if backend is unreachable.
 */
export function StoreDirectoryView({
  initialStores = [],
  initialError = null,
}: StoreDirectoryViewProps) {
  const [stores, setStores] = React.useState<Store[]>(initialStores);
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const error = initialError;

  // Extract distinct, sorted categories from available stores
  const availableCategories = React.useMemo(() => {
    const categorySet = new Set<string>();
    for (const s of initialStores) {
      if (s.category && s.category.trim()) {
        categorySet.add(s.category.trim());
      }
    }
    return Array.from(categorySet).sort((a, b) =>
      a.localeCompare(b, 'fr', { sensitivity: 'base' })
    );
  }, [initialStores]);

  const hasActiveFilters = searchQuery.trim().length > 0 || selectedCategories.length > 0;

  // Hybrid search execution: Backend API first with graceful client-side fallback
  React.useEffect(() => {
    // If no filter is applied, reset to initialStores immediately
    if (!hasActiveFilters) {
      setStores(initialStores);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const executeSearch = async () => {
      try {
        const results = await searchStores({
          query: searchQuery,
          categories: selectedCategories,
        });
        if (isMounted) {
          setStores(results);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        console.warn(
          '[StoreDirectoryView] Backend search endpoint unreachable, falling back to client-side filtering:',
          err
        );
        // Hybrid fallback: filter in-memory from initialStores
        if (isMounted) {
          const q = searchQuery.trim().toLowerCase();
          const filtered = initialStores.filter((store) => {
            const matchesName =
              !q ||
              store.name.toLowerCase().includes(q) ||
              (store.address && store.address.toLowerCase().includes(q));

            const matchesCategory =
              selectedCategories.length === 0 ||
              (store.category &&
                selectedCategories.some(
                  (c) => c.toLowerCase() === store.category!.trim().toLowerCase()
                ));

            return matchesName && matchesCategory;
          });
          setStores(filtered);
          setIsLoading(false);
        }
      }
    };

    executeSearch();

    return () => {
      isMounted = false;
    };
  }, [searchQuery, selectedCategories, hasActiveFilters, initialStores]);

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) => {
      const exists = prev.some((c) => c.toLowerCase() === category.toLowerCase());
      if (exists) {
        return prev.filter((c) => c.toLowerCase() !== category.toLowerCase());
      }
      return [...prev, category];
    });
  };

  const handleClearCategories = () => {
    setSelectedCategories([]);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
  };

  return (
    <div className="space-y-6">
      {/* Search Bar & Multi-category Filter (SLE-215) */}
      <StoreSearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        availableCategories={availableCategories}
        selectedCategories={selectedCategories}
        onCategoryToggle={handleCategoryToggle}
        onClearCategories={handleClearCategories}
        onResetFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
        totalResults={stores.length}
        isLoading={isLoading}
      />

      {/* Global error banner if initial data fetch failed completely */}
      {error && (
        <div className="border border-destructive/50 bg-destructive/10 p-4 text-destructive space-y-1 rounded-lg">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="size-4 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Responsive Store Grid (SLE-216) */}
      {!error && stores.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {stores.map((store) => (
            <StoreCard key={store.uid || store.id || store.name} store={store} />
          ))}
        </div>
      )}

      {/* Empty State: Filter mismatch */}
      {!error && stores.length === 0 && hasActiveFilters && (
        <Empty className="py-12 border rounded-xl bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX className="size-8 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>Aucun commerce trouvé</EmptyTitle>
            <EmptyDescription>
              Aucun commerce ne correspond à vos critères de recherche
              {searchQuery ? ` « ${searchQuery} »` : ''}
              {selectedCategories.length > 0 ? ` (${selectedCategories.join(', ')})` : ''}.
            </EmptyDescription>
            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={handleResetFilters} className="gap-1.5">
                <RotateCcw className="size-3.5" />
                Effacer les filtres
              </Button>
            </div>
          </EmptyHeader>
        </Empty>
      )}

      {/* Empty State: Initial catalog empty */}
      {!error && stores.length === 0 && !hasActiveFilters && (
        <Empty className="py-12 border rounded-xl bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <StoreIcon className="size-8 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>Aucune boutique trouvée</EmptyTitle>
            <EmptyDescription>
              Il n'y a pour le moment aucun commerçant enregistré dans votre zone.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
