import * as React from 'react';
import { useAuth } from '@/lib/auth';
import type { Store } from '@/types/store';
import { MerchantCatalogDashboard } from '@/components/MerchantCatalogDashboard';
import { ClientProductCatalog } from '@/components/ClientProductCatalog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Eye, Store as StoreIcon } from 'lucide-react';

interface StoreProductsViewProps {
  store: Store;
}

export function StoreProductsView({ store }: StoreProductsViewProps) {
  const { user, role, isAuthenticated, isLoading } = useAuth();
  const [viewMode, setViewMode] = React.useState<'merchant' | 'client'>('merchant');

  // Check if current user is either an ADMIN or the MERCHANT owner of this store
  const isOwnerOrAdmin = React.useMemo(() => {
    if (!isAuthenticated || !user) return false;
    if (role === 'ADMIN') return true;

    if (role === 'MERCHANT') {
      // Compare user.id with store.userId (both as strings to prevent type mismatch)
      if (store.userId && String(user.id) === String(store.userId)) {
        return true;
      }
    }
    return false;
  }, [isAuthenticated, user, role, store.userId]);

  const storeIdNumber = Number(store.id);

  if (isLoading) {
    return (
      <div className="py-8 space-y-4 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/4" />
        <div className="h-40 bg-muted rounded-xl" />
      </div>
    );
  }

  // If citizen or unauthenticated visitor, show the client storefront directly
  if (!isOwnerOrAdmin) {
    return (
      <div className="pt-6">
        <ClientProductCatalog storeId={storeIdNumber} storeName={store.name} />
      </div>
    );
  }

  // If merchant owner or admin: show switcher and corresponding view
  return (
    <div className="space-y-6 pt-6">
      {/* Management Switcher Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl bg-muted/60 border border-border">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 border-primary/30 text-primary bg-background">
            <ShieldCheck className="size-3.5 text-primary" />
            {role === 'ADMIN' ? 'Accès Administrateur' : 'Propriétaire du commerce'}
          </Badge>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Vous pouvez gérer ce catalogue en temps réel ou prévisualiser l'expérience client.
          </span>
        </div>

        <div className="inline-flex items-center p-1 bg-background rounded-lg border border-border shadow-2xs">
          <Button
            type="button"
            variant={viewMode === 'merchant' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('merchant')}
            className="h-7 text-xs gap-1.5 px-3"
          >
            <StoreIcon className="size-3.5" />
            <span>Gestion stock & produits</span>
          </Button>

          <Button
            type="button"
            variant={viewMode === 'client' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('client')}
            className="h-7 text-xs gap-1.5 px-3"
          >
            <Eye className="size-3.5" />
            <span>Aperçu client</span>
          </Button>
        </div>
      </div>

      {/* Render selected view */}
      {viewMode === 'merchant' ? (
        <MerchantCatalogDashboard storeId={storeIdNumber} storeName={store.name} />
      ) : (
        <ClientProductCatalog storeId={storeIdNumber} storeName={store.name} />
      )}
    </div>
  );
}
