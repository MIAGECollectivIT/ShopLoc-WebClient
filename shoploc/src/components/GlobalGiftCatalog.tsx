import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import { useAuth } from '@/lib/auth';
import { getStores, getPublicGifts } from '@/lib/api';
import { useCustomerLoyaltyStatus } from '@/hooks/useCustomerLoyaltyStatus';
import { ROUTES } from '@/config/routes';
import type { Store } from '@/types/store';
import type { LoyaltyGift } from '@/types/gift';
import { InteractiveGiftCard, InteractiveGiftCardSkeleton } from './InteractiveGiftCard';
import { VfpPrivilegesBanner } from './VfpPrivilegesBanner';
import { VfpBenefitsDialog } from './VfpBenefitsDialog';
import { VfpPermanentBenefitCards } from './VfpPermanentBenefitCards';
import {
  Gift,
  Search,
  AlertCircle,
  Coins,
  Store as StoreIcon,
  Sparkles,
  ArrowRight,
  Crown,
} from 'lucide-react';

const SELECT_CLASS =
  'h-9 text-xs px-2.5 py-1 rounded-md border border-border bg-background text-foreground shadow-xs focus:ring-1 focus:ring-ring outline-none';

export function GlobalGiftCatalog() {
  const { user, token, isAuthenticated } = useAuth();

  const [stores, setStores] = React.useState<Store[]>([]);
  const [gifts, setGifts] = React.useState<LoyaltyGift[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // User loyalty points & VFP state
  const { userPoints, isLoadingPoints, vfpStatus, isVfp } = useCustomerLoyaltyStatus(
    isAuthenticated,
    user?.id,
    token
  );
  const [isVfpDialogOpen, setIsVfpDialogOpen] = React.useState(false);
  const [activeCatalogTab, setActiveCatalogTab] = React.useState<'standard' | 'vfp'>('standard');

  // Filters
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedStoreId, setSelectedStoreId] = React.useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('ALL');
  const [inStockOnly, setInStockOnly] = React.useState(false);
  const [affordableOnly, setAffordableOnly] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<'default' | 'points-asc' | 'points-desc' | 'name'>(
    'default'
  );

  // Read initial query params from URL if available
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const storeParam = params.get('storeUid');
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
        if (isMounted) {
          setStores(fetchedStores);
          setSelectedStoreId((current) => {
            if (current && current !== 'ALL') {
              const matched = fetchedStores.find((s) => s.uid === current);
              if (matched?.uid) {
                return matched.uid;
              }
            }
            return current;
          });
        }
      } catch {
        // Fallback gracefully
      }
    }
    loadStores();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load public gifts whenever storeUid or category filter changes
  const loadGifts = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedGifts = await getPublicGifts({
        storeUid: selectedStoreId !== 'ALL' ? selectedStoreId : undefined,
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

  const standardGiftsCount = React.useMemo(
    () => gifts.filter((g) => !g.vfpExclusive).length,
    [gifts]
  );

  const vfpGiftsCount = React.useMemo(
    () => gifts.filter((g) => Boolean(g.vfpExclusive)).length,
    [gifts]
  );

  // Client-side filtering (tab exclusivity, search query, stock, affordability, and sorting)
  const filteredGifts = React.useMemo(() => {
    return gifts
      .filter((gift) => {
        if (activeCatalogTab === 'vfp' && !gift.vfpExclusive) return false;
        if (activeCatalogTab === 'standard' && gift.vfpExclusive) return false;
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
  }, [gifts, activeCatalogTab, inStockOnly, affordableOnly, userPoints, searchQuery, sortBy]);

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
              <span>Récompenses locale</span>
            </Badge>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Échangez vos points contre des cadeaux
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Découvrez les cadeaux offerts par vos commerçants de proximité. Cumulez des points et
              récupérez votre cadeau lors de votre prochain achat.
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
                    <Skeleton className="h-7 w-24 my-0.5" />
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

      {/* Catalog Separation Tabs: Standard vs Exclusive VFP */}
      <div
        role="tablist"
        aria-label="Catégories du catalogue de cadeaux"
        className="inline-flex items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeCatalogTab === 'standard'}
          onClick={() => setActiveCatalogTab('standard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            activeCatalogTab === 'standard'
              ? 'bg-background text-foreground font-semibold shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Gift className="size-3.5 text-primary" />
          <span>Cadeaux Fidélité</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono">
            {standardGiftsCount}
          </Badge>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeCatalogTab === 'vfp'}
          onClick={() => setActiveCatalogTab('vfp')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            activeCatalogTab === 'vfp'
              ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 font-semibold shadow-xs border border-amber-500/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Crown className="size-3.5 text-amber-600 dark:text-amber-400" />
          <span>Privilèges VFP</span>
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 h-4 font-mono border-amber-500/40 text-amber-700 dark:text-amber-300"
          >
            {vfpGiftsCount}
          </Badge>
        </button>
      </div>

      {/* VFP Contextual Banner (How to become VFP / Active VFP status) */}
      {activeCatalogTab === 'vfp' && (
        <VfpPrivilegesBanner
          isVfp={isVfp}
          isAuthenticated={isAuthenticated}
          currentTransactionCount={vfpStatus?.currentTransactionCount}
          onOpenVfpDialog={() => setIsVfpDialogOpen(true)}
        />
      )}

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
              <option key={s.uid} value={s.uid}>
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
      ) : activeCatalogTab === 'standard' && gifts.length === 0 ? (
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
      ) : activeCatalogTab === 'standard' && filteredGifts.length === 0 ? (
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
          {activeCatalogTab === 'vfp' && (
            <VfpPermanentBenefitCards
              isAuthenticated={isAuthenticated}
              isVfp={isVfp}
              licensePlates={user?.licensePlates || []}
            />
          )}
          {filteredGifts.map((gift) => (
            <InteractiveGiftCard
              key={gift.uid}
              gift={gift}
              userPoints={userPoints}
              isAuthenticated={isAuthenticated}
              isLoadingUserPoints={isLoadingPoints}
              isVfp={isVfp}
            />
          ))}
        </div>
      )}

      <VfpBenefitsDialog
        isOpen={isVfpDialogOpen}
        onClose={() => setIsVfpDialogOpen(false)}
        isVfp={isVfp}
        currentTransactionCount={vfpStatus?.currentTransactionCount}
      />
    </div>
  );
}
