import * as React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export interface StoreSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  availableCategories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  sortBy: 'default' | 'name-asc' | 'name-desc' | 'category';
  onSortByChange: (sort: 'default' | 'name-asc' | 'name-desc' | 'category') => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
}

/**
 * Filter and search toolbar ISO to GlobalProductCatalog (SLE-215).
 * Features real-time search with debounce, category select dropdown, sorting, and filter reset.
 */
export function StoreSearchBar({
  searchQuery,
  onSearchChange,
  availableCategories,
  selectedCategory,
  onCategoryChange,
  sortBy,
  onSortByChange,
  onResetFilters,
  hasActiveFilters,
}: StoreSearchBarProps) {
  const [inputValue, setInputValue] = React.useState(searchQuery);

  // Synchronize input value with external prop changes (e.g. after reset)
  React.useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  // 300ms debounce
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue !== searchQuery) {
        onSearchChange(inputValue);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, searchQuery, onSearchChange]);

  return (
    <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-muted/40 p-4 rounded-xl border border-border">
      {/* Search input */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Rechercher un commerce par nom, adresse..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="pl-8 bg-background h-9 text-xs"
          aria-label="Rechercher un commerce"
        />
      </div>

      {/* Category selector & Filters ISO to catalog */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="h-9 text-xs px-2.5 py-1 rounded-md border border-border bg-background text-foreground shadow-xs focus:ring-1 focus:ring-ring outline-none"
          title="Filtrer par catégorie"
        >
          <option value="ALL">Toutes les catégories ({availableCategories.length})</option>
          {availableCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) =>
            onSortByChange(e.target.value as 'default' | 'name-asc' | 'name-desc' | 'category')
          }
          className="h-9 text-xs px-2.5 py-1 rounded-md border border-border bg-background text-foreground shadow-xs focus:ring-1 focus:ring-ring outline-none"
          title="Trier"
        >
          <option value="default">Tri par défaut</option>
          <option value="name-asc">Nom (A-Z)</option>
          <option value="name-desc">Nom (Z-A)</option>
          <option value="category">Catégorie</option>
        </select>

        {hasActiveFilters && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onResetFilters}
            className="h-9 text-xs"
          >
            Réinitialiser
          </Button>
        )}
      </div>
    </div>
  );
}
