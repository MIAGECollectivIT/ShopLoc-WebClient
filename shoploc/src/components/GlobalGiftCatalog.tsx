import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import { useAuth } from '@/lib/auth';
import { getStores, getPublicGifts, getUserPointsBalance } from '@/lib/api';
import { ROUTES } from '@/config/routes';
import type { Store } from '@/types/store';
import type { LoyaltyGift } from '@/types/gift';
import { InteractiveGiftCard, InteractiveGiftCardSkeleton } from './InteractiveGiftCard';
import {
  Gift,
  Search,
  AlertCircle,
  Coins,
  Store as StoreIcon,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

const SELECT_CLASS =
  'h-9 text-xs px-2.5 py-1 rounded-md border border-border bg-background text-foreground shadow-xs focus:ring-1 focus:ring-ring outline-none';

export function GlobalGiftCatalog() {
  const { user, token, isAuthenticated } = useAuth();

  const [stores, setStores] = React.useState<Store[]>([]);
  const [gifts, setGifts] = React.useState<LoyaltyGift[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // User loyalty points state
  const [userPoints, setUserPoints] = React.useState<number | null>(null);
  const [isLoadingPoints, setIsLoadingPoints] = React.useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedStoreId, setSelectedStoreId] = React.useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('ALL');
  const [inStockOnly, setInStockOnly] = React.useState(false);
  const [affordableOnly, setAffordableOnly] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<'default' | 'points-asc' | 'points-desc' | 'name'>(
    'default'
  );

  // Fetch authenticated customer points balance
  React.useEffect(() => {
    let isMounted = true;
    if (!isAuthenticated || !user?.id) {
      setUserPoints(null);
      return;
    }

    setIsLoadingPoints(true);
    getUserPointsBalance(user.id, token || undefined)
      .then((res) => {
        if (isMounted) {
          const balance = typeof res.balance === 'number' ? res.balance : (res.points ?? 0);
          setUserPoints(balance);
        }
      })
      .catch(() => {
        if (isMounted) {
          setUserPoints(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingPoints(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user?.id, token]);

  // Read initial query params from URL if available
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const storeParam = params.get('storeId');
      const categoryParam = params.get('category');
      if (storeParam) setSelectedStoreId(storeParam);
      if (categoryParam) setSelectedCategory(categoryParam);
    }
  }, []);

  // Fetch stores on mount for filter dropdowns
  React.useEffect(() => {
    let isMounted = true;
    async function loadStores() {
      try {
        const fetchedStores = await getStores();
        if (isMounted) setStores(fetchedStores);
      } catch {
        // Fallback gracefully
      }
    }
    loadStores();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load public gifts whenever storeId or category filter changes
  const loadGifts = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedGifts = await getPublicGifts({
        storeId: selectedStoreId !== 'ALL' ? selectedStoreId : undefined,
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
      });
      setGifts(fetchedGifts);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erreur lors du chargement du catalogue des cadeaux fidélité'
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedStoreId, selectedCategory]);

  React.useEffect(() => {
    loadGifts();
  }, [loadGifts]);

  // Extract unique categories from stores (KISS)
  const categories = React.useMemo(() => {
    const set = new Set<string>();
    stores.forEach((s) => {
      if (s.category?.trim()) {
        set.add(s.category.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [stores]);

  // Count gifts currently affordable with user points
  const accessibleGiftsCount = React.useMemo(() => {
    if (userPoints === null) return 0;
    return gifts.filter((g) => g.pointsCost <= userPoints && g.stock > 0).length;
  }, [gifts, userPoints]);

  const hasActiveFilters =
    selectedStoreId !== 'ALL' ||
    selectedCategory !== 'ALL' ||
    inStockOnly ||
    affordableOnly ||
    Boolean(searchQuery.trim()) ||
    sortBy !== 'default';

  // Client-side filtering (search query, stock, affordability, and sorting)
  const filteredGifts = React.useMemo(() => {
    return gifts
      .filter((gift) => {
        if (inStockOnly && gift.stock <= 0) return false;
        if (affordableOnly && userPoints !== null && gift.pointsCost > userPoints) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = gift.name.toLowerCase().includes(q);
          const matchDesc = gift.description?.toLowerCase().includes(q) ?? false;
          const matchStore = gift.storeName?.toLowerCase().includes(q) ?? false;
          const matchCategory = gift.category?.toLowerCase().includes(q) ?? false;
          if (!matchName && !matchDesc && !matchStore && !matchCategory) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'points-asc') return a.pointsCost - b.pointsCost;
        if (sortBy === 'points-desc') return b.pointsCost - a.pointsCost;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return 0;
      });
  }, [gifts, inStockOnly, affordableOnly, userPoints, searchQuery, sortBy]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedStoreId('ALL');
    setSelectedCategory('ALL');
    setInStockOnly(false);
    setAffordableOnly(false);
    setSortBy('default');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Points Balance for logged-in users */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 p-6 sm:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <Badge
              variant="outline"
              className="bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-semibold gap-1.5 px-2.5 py-1"
            >
              <Sparkles className="size-3.5" />
              <span>Récompenses & Fidélité locale</span>
            </Badge>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Échangez vos points contre des cadeaux
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Découvrez tous les lots physiques et cadeaux offerts par vos commerçants de proximité.
              Cumulez des points lors de vos achats pour débloquer ces récompenses exclusives.
            </p>
          </div>

          {/* User Points Balance Card (if authenticated) */}
          {isAuthenticated && (
            <Card className="shrink-0 p-4 bg-card/80 border-amber-500/30 shadow-xs backdrop-blur-xs flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="size-11 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Coins className="size-6" />
              </div>
              <div className="space-y-0.5">
                <span className="text-xs text-muted-foreground font-medium">
                  Votre solde actuel
                </span>
                <div className="text-2xl font-bold text-foreground">
                  {isLoadingPoints ? (
                    <span className="text-base text-muted-foreground animate-pulse">
                      Chargement...
                    </span>
                  ) : (
                    <span>
                      {userPoints ?? 0}{' '}
                      <span className="text-xs font-normal text-muted-foreground">points</span>
                    </span>
                  )}
                </div>
              </div>
              <a
                href={ROUTES.wallet.path}
                className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline sm:ml-2"
              >
                <span>Mon portefeuille</span>
                <ArrowRight className="size-3" />
              </a>
            </Card>
          )}
        </div>
      </div>

      {/* Filter and search toolbar matching GlobalProductCatalog style */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-muted/40 p-4 rounded-xl border border-border">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Rechercher un cadeau, un commerce, une catégorie..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 bg-background h-9 text-xs"
          />
        </div>

        {/* Filters and selectors toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Partner Store Selector */}
          <select
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            className={`${SELECT_CLASS} min-w-[180px]`}
            title="Filtrer par commerce"
          >
            <option value="ALL">Tous les commerces ({stores.length})</option>
            {stores.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Category Selector */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={`${SELECT_CLASS} min-w-[160px]`}
            title="Filtrer par catégorie"
          >
            <option value="ALL">Toutes catégories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* In stock filter */}
          <Button
            type="button"
            variant={inStockOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setInStockOnly((v) => !v)}
            className="h-9 text-xs gap-1.5"
          >
            <span
              className={`size-2 rounded-full ${inStockOnly ? 'bg-background' : 'bg-emerald-500'}`}
            />
            <span>En stock</span>
          </Button>

          {/* Affordable with my points filter (available for logged-in users) */}
          {isAuthenticated && userPoints !== null && (
            <Button
              type="button"
              variant={affordableOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAffordableOnly((v) => !v)}
              className="h-9 text-xs gap-1.5"
            >
              <Sparkles
                className={`size-3.5 ${affordableOnly ? 'text-background' : 'text-amber-500'}`}
              />
              <span>Accessibles ({accessibleGiftsCount})</span>
            </Button>
          )}

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as 'default' | 'points-asc' | 'points-desc' | 'name')
            }
            className={SELECT_CLASS}
            title="Trier"
          >
            <option value="default">Tri par défaut</option>
            <option value="points-asc">Points croissants</option>
            <option value="points-desc">Points décroissants</option>
            <option value="name">Nom (A-Z)</option>
          </select>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-9 text-xs text-muted-foreground hover:text-foreground"
            >
              Réinitialiser
            </Button>
          )}
        </div>
      </div>

      {/* Gifts Grid with co-located InteractiveGiftCardSkeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <InteractiveGiftCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <Card className="p-8 text-center border-destructive/20 space-y-3">
          <AlertCircle className="size-8 text-destructive mx-auto" />
          <p className="text-sm font-medium text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={loadGifts}>
            Réessayer
          </Button>
        </Card>
      ) : gifts.length === 0 ? (
        <Empty className="bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Gift className="size-6 text-amber-500" />
            </EmptyMedia>
            <EmptyTitle>Catalogue en cours d'alimentation</EmptyTitle>
            <EmptyDescription>
              Les commerçants partenaires n'ont pas encore publié de lots physiques dans cette
              sélection.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <a
              href={ROUTES.stores.path}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <StoreIcon className="size-3.5" /> Découvrir les boutiques partenaires
            </a>
          </EmptyContent>
        </Empty>
      ) : filteredGifts.length === 0 ? (
        <Empty className="bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search className="size-6 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>Aucun cadeau ne correspond</EmptyTitle>
            <EmptyDescription>
              {affordableOnly
                ? "Vous n'avez pas encore assez de points pour ces cadeaux avec les filtres sélectionnés."
                : 'Ajustez vos filtres de recherche ou sélectionnez un autre commerce ou une autre catégorie.'}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" size="sm" onClick={handleResetFilters}>
              Réinitialiser les filtres
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGifts.map((gift) => (
            <InteractiveGiftCard
              key={gift.id}
              gift={gift}
              userPoints={userPoints}
              isAuthenticated={isAuthenticated}
              isLoadingUserPoints={isLoadingPoints}
            />
          ))}
        </div>
      )}
    </div>
  );
}
