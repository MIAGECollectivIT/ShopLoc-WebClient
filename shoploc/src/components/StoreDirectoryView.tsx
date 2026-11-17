import * as React from 'react';
import { Store as StoreIcon, AlertCircle, Search } from 'lucide-react';
import type { Store } from '@/types/store';
import { searchStores } from '@/lib/api';
import { StoreCard } from '@/components/StoreCard';
import { StoreSearchBar } from '@/components/StoreSearchBar';
import { Button } from '@/components/ui/button';

export interface StoreDirectoryViewProps {
  initialStores: Store[];
  initialError?: string | null;
}

/**
 * Interactive store directory component (SLE-216).
 * Toolbar and states are strictly ISO to GlobalProductCatalog.
 */
export function StoreDirectoryView({
  initialStores = [],
  initialError = null,
}: StoreDirectoryViewProps) {
  const [stores, setStores] = React.useState<Store[]>(initialStores);
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('ALL');
  const [sortBy, setSortBy] = React.useState<'default' | 'name-asc' | 'name-desc' | 'category'>(
    'default'
  );
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

  const hasActiveFilters =
    searchQuery.trim().length > 0 || selectedCategory !== 'ALL' || sortBy !== 'default';

  // Hybrid search execution: Backend API first with graceful client-side fallback
  React.useEffect(() => {
    if (searchQuery.trim().length === 0 && selectedCategory === 'ALL') {
      setStores(initialStores);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const executeSearch = async () => {
      try {
        const categoriesParam = selectedCategory !== 'ALL' ? [selectedCategory] : [];
        const results = await searchStores({
          query: searchQuery,
          categories: categoriesParam,
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
              selectedCategory === 'ALL' ||
              (store.category &&
                store.category.trim().toLowerCase() === selectedCategory.toLowerCase());

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
  }, [searchQuery, selectedCategory, initialStores]);

  // Apply sorting
  const sortedStores = React.useMemo(() => {
    const list = [...stores];
    if (sortBy === 'name-asc') {
      list.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
    } else if (sortBy === 'name-desc') {
      list.sort((a, b) => b.name.localeCompare(a.name, 'fr', { sensitivity: 'base' }));
    } else if (sortBy === 'category') {
      list.sort((a, b) =>
        (a.category || '').localeCompare(b.category || '', 'fr', { sensitivity: 'base' })
      );
    }
    return list;
  }, [stores, sortBy]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSortBy('default');
  };

  return (
    <div className="space-y-6">
      {/* Toolbar ISO to GlobalProductCatalog (SLE-215) */}
      <StoreSearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        availableCategories={availableCategories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        onResetFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Global error banner if initial data fetch failed completely */}
      {error && (
        <div className="p-8 text-center bg-card border border-destructive/20 rounded-xl space-y-2">
          <AlertCircle className="size-8 text-destructive mx-auto" />
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      )}

      {/* Loading Skeletons ISO to GlobalProductCatalog */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="border border-border rounded-xl p-4 space-y-3 bg-card animate-pulse"
            >
              <div className="aspect-4/3 bg-muted rounded-lg" />
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
              <div className="h-9 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : !error && initialStores.length === 0 ? (
        /* Empty Catalog ISO to GlobalProductCatalog */
        <div className="p-12 text-center bg-card border border-border rounded-xl space-y-4">
          <StoreIcon className="size-10 text-muted-foreground mx-auto stroke-1" />
          <h3 className="text-base font-semibold text-foreground">Aucun commerçant disponible</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Il n'y a pour le moment aucun commerce partenaire enregistré dans votre municipalité.
          </p>
        </div>
      ) : !error && sortedStores.length === 0 ? (
        /* Empty Filter Mismatch ISO to GlobalProductCatalog */
        <div className="p-10 text-center bg-card border border-border rounded-xl space-y-2">
          <Search className="size-8 text-muted-foreground mx-auto" />
          <h4 className="text-sm font-medium text-foreground">Aucun commerce ne correspond</h4>
          <p className="text-xs text-muted-foreground">
            Ajustez vos filtres de recherche ou sélectionnez une autre catégorie.
          </p>
          <Button variant="outline" size="sm" onClick={handleResetFilters}>
            Réinitialiser les filtres
          </Button>
        </div>
      ) : (
        /* Responsive Store Grid (SLE-216) */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {sortedStores.map((store) => (
            <StoreCard key={store.uid || store.id || store.name} store={store} />
          ))}
        </div>
      )}
    </div>
  );
}
