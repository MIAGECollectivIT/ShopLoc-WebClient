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
import { ShieldCheck, Eye, Coins, Package, QrCode, Gift } from 'lucide-react';

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
  }, []);

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
    }
    return false;
  }, [isAuthenticated, user, role, store.userId]);

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

  // If merchant owner or admin: show switcher and corresponding view
  return (
    <div className="space-y-6 pt-6">
      {/* Management Switcher Banner */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 p-3 rounded-xl bg-muted/60 border border-border">
        <div className="flex items-center gap-2 min-w-0">
          <Badge
            variant="outline"
            className="gap-1 border-primary/30 text-primary bg-background shrink-0"
          >
            <ShieldCheck className="size-3.5 text-primary" />
            {role === 'ADMIN' ? 'Accès Administrateur' : 'Propriétaire du commerce'}
          </Badge>
          <span className="text-xs text-muted-foreground hidden sm:inline truncate">
            Gérez votre commerce : catalogue de produits, cadeaux fidélité, barème et encaissement.
          </span>
        </div>

        <nav
          aria-label="Modes de gestion du commerce"
          className="flex flex-wrap items-center gap-1 p-1 bg-background rounded-lg border border-border shadow-2xs w-full xl:w-auto"
        >
          <Button
            type="button"
            variant={viewMode === 'merchant' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('merchant')}
            className="flex-1 sm:flex-initial h-8 sm:h-7 text-xs gap-1.5 px-3 justify-center whitespace-nowrap"
          >
            <Package className="size-3.5 shrink-0" />
            <span>Catalogue & stock</span>
          </Button>

          <Button
            type="button"
            variant={viewMode === 'gifts' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('gifts')}
            className="flex-1 sm:flex-initial h-8 sm:h-7 text-xs gap-1.5 px-3 justify-center whitespace-nowrap"
          >
            <Gift className="size-3.5 shrink-0 text-amber-500" />
            <span>Cadeaux fidélité</span>
          </Button>

          <Button
            type="button"
            variant={viewMode === 'loyalty' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('loyalty')}
            className="flex-1 sm:flex-initial h-8 sm:h-7 text-xs gap-1.5 px-3 justify-center whitespace-nowrap"
          >
            <Coins className="size-3.5 shrink-0" />
            <span>Barème fidélité</span>
          </Button>

          <Button
            type="button"
            variant={viewMode === 'scan' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('scan')}
            className="flex-1 sm:flex-initial h-8 sm:h-7 text-xs gap-1.5 px-3 justify-center whitespace-nowrap"
          >
            <QrCode className="size-3.5 shrink-0" />
            <span>Pass Caisse & Scan</span>
          </Button>

          <Button
            type="button"
            variant={viewMode === 'client' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('client')}
            className="flex-1 sm:flex-initial h-8 sm:h-7 text-xs gap-1.5 px-3 justify-center whitespace-nowrap"
          >
            <Eye className="size-3.5 shrink-0" />
            <span>Aperçu client</span>
          </Button>
        </nav>
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
          <StoreLoyaltyBanner storeId={storeIdNumber} />
          <ClientProductCatalog storeId={storeIdNumber} storeName={store.name} />
        </div>
      )}
    </div>
  );
}
