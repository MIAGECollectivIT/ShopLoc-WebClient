import * as React from 'react';
import { Search, X, Filter, RotateCcw, Loader2, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface StoreSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  availableCategories: string[];
  selectedCategories: string[];
  onCategoryToggle: (category: string) => void;
  onClearCategories: () => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
  totalResults: number;
  isLoading?: boolean;
}

/**
 * Interactive search and filter component for store directory (SLE-215).
 * Features real-time search with 300ms debounce, category multi-selection chips, and filter reset.
 */
export function StoreSearchBar({
  searchQuery,
  onSearchChange,
  availableCategories,
  selectedCategories,
  onCategoryToggle,
  onClearCategories,
  onResetFilters,
  hasActiveFilters,
  totalResults,
  isLoading = false,
}: StoreSearchBarProps) {
  const [inputValue, setInputValue] = React.useState(searchQuery);

  // Sync internal input value if prop changes externally (e.g. after reset)
  React.useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  // 300ms debounce for text input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue !== searchQuery) {
        onSearchChange(inputValue);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, searchQuery, onSearchChange]);

  const handleClearInput = () => {
    setInputValue('');
    onSearchChange('');
  };

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4 sm:p-5 shadow-xs">
      {/* Search Input Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Rechercher par nom de commerce (ex: Boulangerie, Café...)"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="pl-9 pr-9 h-11 text-sm bg-background"
            aria-label="Rechercher un commerce"
          />
          {inputValue && (
            <button
              type="button"
              onClick={handleClearInput}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Effacer le texte de recherche"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onResetFilters}
            className="h-11 shrink-0 text-muted-foreground hover:text-foreground gap-1.5"
          >
            <RotateCcw className="size-3.5" />
            <span className="text-xs font-medium">Réinitialiser</span>
          </Button>
        )}
      </div>

      {/* Category Filter Chips */}
      {availableCategories.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-border/50">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium">
              <Filter className="size-3.5 text-primary" />
              Filtrer par type d'activité :
            </span>
            {selectedCategories.length > 0 && (
              <button
                type="button"
                onClick={onClearCategories}
                className="text-xs text-primary hover:underline transition-colors"
              >
                Effacer les catégories ({selectedCategories.length})
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {/* "Toutes" Chip */}
            <Badge
              variant={selectedCategories.length === 0 ? 'default' : 'outline'}
              className={`cursor-pointer px-3 py-1.5 text-xs transition-all select-none ${
                selectedCategories.length === 0
                  ? 'shadow-xs font-medium'
                  : 'hover:bg-muted text-muted-foreground'
              }`}
              onClick={onClearCategories}
            >
              Toutes les catégories
            </Badge>

            {/* Individual Category Chips */}
            {availableCategories.map((category) => {
              const isSelected = selectedCategories.some(
                (c) => c.toLowerCase() === category.toLowerCase()
              );
              return (
                <Badge
                  key={category}
                  variant={isSelected ? 'default' : 'outline'}
                  className={`cursor-pointer px-3 py-1.5 text-xs transition-all gap-1.5 select-none ${
                    isSelected
                      ? 'shadow-xs font-medium bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-muted-foreground'
                  }`}
                  onClick={() => onCategoryToggle(category)}
                >
                  {isSelected && <Check className="size-3 shrink-0" />}
                  {category}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Status Bar: Results count & Loading spinner */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
        <span className="font-medium">
          {isLoading ? (
            <span className="flex items-center gap-1.5 text-primary">
              <Loader2 className="size-3.5 animate-spin" />
              Recherche en cours...
            </span>
          ) : (
            <span>
              {totalResults} commerce{totalResults > 1 ? 's' : ''} disponible
              {totalResults > 1 ? 's' : ''}
              {hasActiveFilters ? ' correspondant à vos critères' : ''}
            </span>
          )}
        </span>

        {selectedCategories.length > 0 && (
          <span className="hidden sm:inline text-[11px] text-muted-foreground/80">
            {selectedCategories.length} filtre{selectedCategories.length > 1 ? 's' : ''} actif
            {selectedCategories.length > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}
