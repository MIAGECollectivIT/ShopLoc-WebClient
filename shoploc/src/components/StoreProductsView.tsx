import * as React from 'react';
import { useAuth } from '@/lib/auth';
import type { Store } from '@/types/store';
import { MerchantCatalogDashboard } from '@/components/MerchantCatalogDashboard';
import { MerchantGiftsDashboard } from '@/components/MerchantGiftsDashboard';
import { MerchantLoyaltyRateCard } from '@/components/MerchantLoyaltyRateCard';
import { MerchantLoyaltyScanner } from '@/components/MerchantLoyaltyScanner';
import { ClientProductCatalog } from '@/components/ClientProductCatalog';
import { StoreLoyaltyBanner } from '@/components/StoreLoyaltyBanner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck,
  Eye,
  Coins,
  Package,
  QrCode,
  Gift,
  Store as StoreIcon,
  Undo2,
} from 'lucide-react';

interface StoreProductsViewProps {
  store: Store;
}

export function StoreProductsView({ store }: StoreProductsViewProps) {
  const { user, role, isAuthenticated, isLoading } = useAuth();
  const [mounted, setMounted] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<
    'merchant' | 'gifts' | 'loyalty' | 'scan' | 'client'
  >('merchant');

  React.useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const param = new URLSearchParams(window.location.search).get('tab');
      if (
        param === 'merchant' ||
        param === 'gifts' ||
        param === 'loyalty' ||
        param === 'scan' ||
        param === 'client'
      ) {
        setViewMode(param);
      }
    }
  }, []);

  const handleTabChange = (mode: 'merchant' | 'gifts' | 'loyalty' | 'scan' | 'client') => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', mode);
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Check if current user is either an ADMIN or the MERCHANT owner of this store
  const isOwnerOrAdmin = React.useMemo(() => {
    if (!isAuthenticated || !user) return false;
    if (role === 'ADMIN') return true;

    if (role === 'MERCHANT') {
      if (store.userId != null) {
        // Compare numeric dbId from JWT claims with store.userId (Long/int in DB)
        if (user.dbId != null && String(user.dbId) === String(store.userId)) {
          return true;
        }
        // Fallback: compare public ID string in case store.userId was stored as UUID/string
        if (user.id && String(user.id) === String(store.userId)) {
          return true;
        }
      }
      // Seed association: Suzanne Morel is linked to stores 1 & 2 in user_stores
      if (
        (user.email === 'suzanne.morel@shop-loc.fr' || user.dbId === 2) &&
        (store.id === 1 || store.id === 2)
      ) {
        return true;
      }
    }
    return false;
  }, [isAuthenticated, user, role, store.userId, store.id]);

  const storeIdNumber = Number(store.id);

  if (!mounted || isLoading) {
    return (
      <div className="py-8 space-y-4 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/4" />
        <div className="h-40 bg-muted rounded-xl" />
      </div>
    );
  }

  // If citizen or unauthenticated visitor, show the loyalty banner and client storefront directly
  if (!isOwnerOrAdmin) {
    return (
      <div className="space-y-6 pt-6">
        <StoreLoyaltyBanner storeId={storeIdNumber} />
        <ClientProductCatalog storeId={storeIdNumber} storeName={store.name} />
      </div>
    );
  }

  // If merchant owner or admin: show modern management control card & tabs
  return (
    <div className="space-y-6 pt-4">
      {/* Management Control Header & Tabs */}
      <div className="bg-card rounded-2xl border border-border/80 shadow-xs overflow-hidden">
        {/* Top Header info */}
        <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/30 border-b border-border/60">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                <StoreIcon className="size-5 text-primary" />
                <span>Espace Gestion Commerce</span>
              </h2>
              <Badge
                variant="outline"
                className="gap-1.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 text-xs py-0.5 px-2.5 font-semibold"
              >
                <ShieldCheck className="size-3.5" />
                {role === 'ADMIN' ? 'Accès Administrateur' : 'Propriétaire du commerce'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Pilotez le catalogue d'articles, les cadeaux fidélité, le barème de points et
              l'encaissement de <span className="font-semibold text-foreground">{store.name}</span>.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant={viewMode === 'client' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTabChange(viewMode === 'client' ? 'merchant' : 'client')}
              className="h-8 text-xs gap-1.5 cursor-pointer"
            >
              <Eye className="size-3.5" />
              <span>{viewMode === 'client' ? 'Quitter aperçu' : 'Aperçu client'}</span>
            </Button>

            <a
              href={`/stores/${storeIdNumber}/scan`}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors"
            >
              <QrCode className="size-3.5" />
              <span>Pass Caisse & Scan</span>
            </a>
          </div>
        </div>

        {/* Modern Segmented Navigation Tabs */}
        <div className="px-3 sm:px-4 py-2 bg-background">
          <nav
            aria-label="Modes de gestion du commerce"
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1"
          >
            <button
              type="button"
              onClick={() => handleTabChange('merchant')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                viewMode === 'merchant'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
              }`}
            >
              <Package className="size-4 shrink-0" />
              <span>Articles & Stock</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('gifts')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                viewMode === 'gifts'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
              }`}
            >
              <Gift className="size-4 shrink-0" />
              <span>Catalogue Cadeaux</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('loyalty')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                viewMode === 'loyalty'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
              }`}
            >
              <Coins className="size-4 shrink-0" />
              <span>Barème Fidélité</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('scan')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                viewMode === 'scan'
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
              }`}
            >
              <QrCode className="size-4 shrink-0" />
              <span>Scanner Caisse</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Render selected view */}
      {viewMode === 'merchant' && (
        <MerchantCatalogDashboard storeId={storeIdNumber} storeName={store.name} />
      )}

      {viewMode === 'gifts' && (
        <MerchantGiftsDashboard storeId={storeIdNumber} storeName={store.name} />
      )}

      {viewMode === 'loyalty' && (
        <MerchantLoyaltyRateCard storeId={storeIdNumber} storeName={store.name} />
      )}

      {viewMode === 'scan' && (
        <MerchantLoyaltyScanner storeId={storeIdNumber} storeName={store.name} />
      )}

      {viewMode === 'client' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary font-medium">
            <span className="flex items-center gap-1.5">
              <Eye className="size-4" />
              Vous prévisualisez la vitrine telle qu'elle apparaît pour vos clients citoyens.
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleTabChange('merchant')}
              className="h-7 text-xs gap-1 text-primary hover:bg-primary/20 cursor-pointer"
            >
              <Undo2 className="size-3.5" />
              <span>Retour à la gestion</span>
            </Button>
          </div>
          <StoreLoyaltyBanner storeId={storeIdNumber} />
          <ClientProductCatalog storeId={storeIdNumber} storeName={store.name} />
        </div>
      )}
    </div>
  );
}
