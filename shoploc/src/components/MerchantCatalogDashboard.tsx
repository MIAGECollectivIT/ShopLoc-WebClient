import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StockControl } from '@/components/StockControl';
import { ProductFormDialog } from '@/components/ProductFormDialog';
import { getStoreProducts, deleteProduct } from '@/lib/api';
import { type Product, type StockStatus, getStockStatus } from '@/types/product';
import {
  PackagePlus,
  Search,
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Pencil,
  Trash2,
  Loader2,
  RefreshCw,
  ShoppingBag,
  SlidersHorizontal,
  X,
} from 'lucide-react';

interface MerchantCatalogDashboardProps {
  storeId: number;
  storeName?: string;
}

export function MerchantCatalogDashboard({
  storeId,
  storeName: _storeName,
}: MerchantCatalogDashboardProps) {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = React.useState('');
  const [stockFilter, setStockFilter] = React.useState<'ALL' | StockStatus>('ALL');

  // Modal dialog states
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);

  // Delete dialog state
  const [productToDelete, setProductToDelete] = React.useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Notification message
  const [feedback, setFeedback] = React.useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fetchCatalog = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await getStoreProducts(storeId);
      setProducts(items);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Impossible de charger les produits du magasin'
      );
    } finally {
      setIsLoading(false);
    }
  }, [storeId]);

  React.useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  // Stock updated in StockControl
  const handleStockUpdated = (updated: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    showNotification(`Stock mis à jour pour "${updated.name}" (${updated.stockQuantity} ex.)`);
  };

  // Product created or updated via ProductFormDialog
  const handleProductSaved = (saved: Product) => {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === saved.id);
      if (exists) {
        return prev.map((p) => (p.id === saved.id ? saved : p));
      }
      return [saved, ...prev];
    });
    setIsFormOpen(false);
    setSelectedProduct(null);
    showNotification(
      selectedProduct
        ? `Produit "${saved.name}" mis à jour avec succès`
        : `Produit "${saved.name}" ajouté au catalogue Click & Collect !`
    );
  };

  // Confirm delete
  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await deleteProduct(storeId, productToDelete.id);
      setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
      showNotification(`Produit "${productToDelete.name}" supprimé`);
      setProductToDelete(null);
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : 'Échec de la suppression', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Computed metrics
  const totalCount = products.length;
  const inStockCount = products.filter(
    (p) => getStockStatus(p.stockQuantity) === 'IN_STOCK'
  ).length;
  const lowStockCount = products.filter(
    (p) => getStockStatus(p.stockQuantity) === 'LOW_STOCK'
  ).length;
  const outOfStockCount = products.filter(
    (p) => getStockStatus(p.stockQuantity) === 'OUT_OF_STOCK'
  ).length;

  // Filtered products list
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (stockFilter === 'ALL') return true;
    return getStockStatus(p.stockQuantity) === stockFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ShoppingBag className="size-5 text-primary" />
              Catalogue Click & Collect
            </h2>
            <Badge variant="secondary" className="font-mono text-xs">
              {totalCount} {totalCount > 1 ? 'articles' : 'article'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gérez vos stocks en temps réel et proposez vos articles en retrait immédiat.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchCatalog}
            disabled={isLoading}
            title="Rafraîchir les produits"
            className="gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualiser</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => {
              setSelectedProduct(null);
              setIsFormOpen(true);
            }}
            className="gap-1.5 shadow-xs"
          >
            <PackagePlus className="size-4" />
            <span>Ajouter un produit</span>
          </Button>
        </div>
      </div>

      {/* Realtime Feedback Banner */}
      {feedback && (
        <div
          className={`p-3 rounded-lg text-sm flex items-center justify-between transition-all duration-200 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-destructive/10 text-destructive border-destructive/20'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="size-4 text-destructive shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total produits</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{totalCount}</p>
          </div>
          <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Package className="size-4" />
          </div>
        </div>

        <div className="bg-card border border-border p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">En stock</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {inStockCount}
            </p>
          </div>
          <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="size-4" />
          </div>
        </div>

        <div className="bg-card border border-border p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Stock faible (≤ 5)</p>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
              {lowStockCount}
            </p>
          </div>
          <div className="size-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <AlertTriangle className="size-4" />
          </div>
        </div>

        <div className="bg-card border border-border p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">En rupture (0)</p>
            <p className="text-xl font-bold text-destructive mt-0.5">{outOfStockCount}</p>
          </div>
          <div className="size-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
            <XCircle className="size-4" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-muted/40 p-3 rounded-xl border border-border">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Rechercher par nom, réf..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 bg-background h-9 text-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <SlidersHorizontal className="size-3.5 text-muted-foreground mr-1 hidden sm:inline" />
          <Button
            type="button"
            variant={stockFilter === 'ALL' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setStockFilter('ALL')}
            className="h-8 text-xs px-2.5 rounded-md"
          >
            Tous ({totalCount})
          </Button>

          <Button
            type="button"
            variant={stockFilter === 'IN_STOCK' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setStockFilter('IN_STOCK')}
            className="h-8 text-xs px-2.5 rounded-md"
          >
            <span className="size-2 rounded-full bg-emerald-500 mr-1.5" />
            En stock ({inStockCount})
          </Button>

          <Button
            type="button"
            variant={stockFilter === 'LOW_STOCK' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setStockFilter('LOW_STOCK')}
            className="h-8 text-xs px-2.5 rounded-md"
          >
            <span className="size-2 rounded-full bg-amber-500 mr-1.5" />
            Faible ({lowStockCount})
          </Button>

          <Button
            type="button"
            variant={stockFilter === 'OUT_OF_STOCK' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setStockFilter('OUT_OF_STOCK')}
            className="h-8 text-xs px-2.5 rounded-md"
          >
            <span className="size-2 rounded-full bg-rose-500 mr-1.5" />
            Rupture ({outOfStockCount})
          </Button>
        </div>
      </div>

      {/* Catalog Listing */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="border border-border rounded-xl p-4 space-y-3 animate-pulse bg-card"
            >
              <div className="h-40 bg-muted rounded-lg" />
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
              <div className="h-8 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-card border border-destructive/20 rounded-xl space-y-3">
          <AlertTriangle className="size-8 text-destructive mx-auto" />
          <p className="text-sm font-medium text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchCatalog}>
            Réessayer
          </Button>
        </div>
      ) : products.length === 0 ? (
        /* Empty State: No products at all */
        <div className="p-12 text-center bg-card border border-dashed border-border rounded-xl space-y-4">
          <div className="size-14 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
            <Package className="size-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">
              Aucun produit dans votre catalogue
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Ajoutez vos premiers produits avec photos et quantités disponibles pour permettre à
              vos clients de commander en Click & Collect dès aujourd'hui.
            </p>
          </div>
          <Button
            onClick={() => {
              setSelectedProduct(null);
              setIsFormOpen(true);
            }}
            className="gap-2"
          >
            <PackagePlus className="size-4" />
            Créer mon premier produit
          </Button>
        </div>
      ) : filteredProducts.length === 0 ? (
        /* Empty State: Filter or Search returned 0 results */
        <div className="p-10 text-center bg-card border border-border rounded-xl space-y-3">
          <Search className="size-7 text-muted-foreground mx-auto" />
          <h4 className="text-sm font-medium text-foreground">Aucun résultat trouvé</h4>
          <p className="text-xs text-muted-foreground">
            Modifiez votre recherche "{searchQuery}" ou ajustez les filtres de stock.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setStockFilter('ALL');
            }}
          >
            Réinitialiser les filtres
          </Button>
        </div>
      ) : (
        /* Products Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => {
            const status = getStockStatus(product.stockQuantity);

            return (
              <Card
                key={product.id}
                className="group relative flex flex-col justify-between overflow-hidden border-border hover:shadow-md transition-shadow bg-card"
              >
                <div>
                  {/* Product Image */}
                  <div className="relative aspect-4/3 w-full bg-muted/60 overflow-hidden flex items-center justify-center border-b border-border">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground/60 gap-1.5 p-4">
                        <Package className="size-10 stroke-1" />
                        <span className="text-[11px] font-medium">Aucun visuel</span>
                      </div>
                    )}

                    {/* Reference & Stock Status Badge overlays */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="bg-background/90 backdrop-blur-xs text-foreground font-mono text-[10px] font-semibold px-2 py-0.5 rounded shadow-xs border border-border">
                        #{product.reference}
                      </span>
                    </div>

                    <div className="absolute top-2.5 right-2.5">
                      {status === 'IN_STOCK' && (
                        <span className="bg-emerald-500/90 text-white font-medium text-[11px] px-2 py-0.5 rounded-full shadow-xs backdrop-blur-xs">
                          En stock ({product.stockQuantity})
                        </span>
                      )}
                      {status === 'LOW_STOCK' && (
                        <span className="bg-amber-500/90 text-white font-medium text-[11px] px-2 py-0.5 rounded-full shadow-xs backdrop-blur-xs">
                          Faible ({product.stockQuantity})
                        </span>
                      )}
                      {status === 'OUT_OF_STOCK' && (
                        <span className="bg-rose-600/90 text-white font-medium text-[11px] px-2 py-0.5 rounded-full shadow-xs backdrop-blur-xs">
                          Rupture
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Header / Info */}
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-semibold text-foreground line-clamp-1">
                        {product.name}
                      </CardTitle>
                      <span className="font-bold text-base text-primary whitespace-nowrap">
                        {product.price.toFixed(2)} €
                      </span>
                    </div>
                    {product.description && (
                      <CardDescription className="text-xs line-clamp-2 mt-1">
                        {product.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                </div>

                {/* Footer Controls: Quick Stock +/- and Actions */}
                <div className="p-4 pt-2 border-t border-border/60 bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Ajuster le stock :
                    </span>
                    <StockControl product={product} onStockUpdated={handleStockUpdated} />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => {
                        setSelectedProduct(product);
                        setIsFormOpen(true);
                      }}
                      title="Modifier les détails du produit"
                    >
                      <Pencil className="size-3.5" />
                      Modifier
                    </Button>

                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => setProductToDelete(product)}
                      title="Supprimer définitivement ce produit"
                    >
                      <Trash2 className="size-3.5" />
                      Supprimer
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Product Form Dialog (Create / Edit) */}
      <ProductFormDialog
        storeId={storeId}
        product={selectedProduct}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedProduct(null);
        }}
        onSuccess={handleProductSaved}
      />

      {/* Delete Confirmation Modal */}
      <Dialog
        open={Boolean(productToDelete)}
        onOpenChange={(open) => {
          if (!open) setProductToDelete(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="size-5" />
              Supprimer le produit ?
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir retirer <strong>"{productToDelete?.name}"</strong> (Réf.{' '}
              {productToDelete?.reference}) du catalogue ?
            </DialogDescription>
          </DialogHeader>

          <p className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
            Cette action est définitive. Les clients ne pourront plus commander cet article en Click
            & Collect.
          </p>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setProductToDelete(null)}
              disabled={isDeleting}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
