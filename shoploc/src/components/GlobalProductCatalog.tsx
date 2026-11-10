import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProductImage } from '@/components/ProductImage';
import { getStores, getStoreProducts } from '@/lib/api';
import type { Store } from '@/types/store';
import { type Product, getStockStatus } from '@/types/product';
import { useCart } from '@/hooks/useCart';
import { ROUTES } from '@/config/routes';
import {
  ShoppingBag,
  Search,
  Package,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Check,
  Store as StoreIcon,
  ExternalLink,
} from 'lucide-react';

interface ProductWithStore extends Product {
  storeName: string;
  storeAddress?: string;
  storeUid?: string;
}

export function GlobalProductCatalog() {
  const { addItem } = useCart();
  const [stores, setStores] = React.useState<Store[]>([]);
  const [products, setProducts] = React.useState<ProductWithStore[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedStoreId, setSelectedStoreId] = React.useState<string>('ALL');
  const [inStockOnly, setInStockOnly] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<'default' | 'price-asc' | 'price-desc' | 'name'>(
    'default'
  );

  // Cart quantities per product id
  const [quantities, setQuantities] = React.useState<Record<number, number>>({});
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    async function loadAllProducts() {
      try {
        const fetchedStores = await getStores();
        if (!isMounted) return;
        setStores(fetchedStores);

        const storeProductsPromises = fetchedStores.map(async (st) => {
          if (!st.id) return [];
          try {
            const storeProducts = await getStoreProducts(st.id);
            return storeProducts.map((p) => ({
              ...p,
              storeName: st.name,
              storeAddress: st.address,
              storeUid: st.uid,
            }));
          } catch {
            return [];
          }
        });

        const nested = await Promise.all(storeProductsPromises);
        const flattened = nested.flat();

        if (isMounted) {
          setProducts(flattened);
          const initialQty: Record<number, number> = {};
          flattened.forEach((p) => {
            initialQty[p.id] = p.stockQuantity > 0 ? 1 : 0;
          });
          setQuantities(initialQty);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : 'Erreur lors du chargement du catalogue global'
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadAllProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleQuantityChange = (productId: number, delta: number, maxStock: number) => {
    setQuantities((prev) => {
      const current = prev[productId] || 1;
      const next = Math.max(1, Math.min(maxStock, current + delta));
      return { ...prev, [productId]: next };
    });
  };

  const handleAddToCart = (product: ProductWithStore) => {
    const qty = quantities[product.id] || 1;
    if (qty <= 0 || product.stockQuantity <= 0) return;

    const res = addItem({
      productId: product.id,
      storeId: product.storeId,
      storeUid: product.storeUid,
      storeName: product.storeName,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      quantity: qty,
      maxStock: product.stockQuantity,
    });

    if (res.success) {
      setToastMessage(`${qty} × "${product.name}" ajouté au panier !`);
    } else {
      setToastMessage(res.message || 'Article ajouté au panier !');
    }
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered & sorted
  const filteredProducts = React.useMemo(() => {
    let result = products.filter((p) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;
      if (selectedStoreId !== 'ALL' && String(p.storeId) !== selectedStoreId) return false;
      if (inStockOnly && p.stockQuantity <= 0) return false;
      return true;
    });

    if (sortBy === 'price-asc') {
      result = [...result].sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      result = [...result].sort((a, b) => b.price - a.price);
    } else if (sortBy === 'name') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [products, searchQuery, selectedStoreId, inStockOnly, sortBy]);

  return (
    <div className="space-y-6">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-medium animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="size-4 text-emerald-400" />
          <span>{toastMessage}</span>
          <a
            href="/cart"
            className="underline ml-2 text-primary-foreground hover:opacity-80 font-semibold"
          >
            Voir le panier
          </a>
        </div>
      )}

      {/* Filter and search toolbar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-muted/40 p-4 rounded-xl border border-border">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Rechercher un produit, un magasin..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 bg-background h-9 text-xs"
          />
        </div>

        {/* Store selector & Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            className="h-9 text-xs px-2.5 py-1 rounded-md border border-border bg-background text-foreground shadow-xs focus:ring-1 focus:ring-ring outline-none"
            title="Filtrer par commerce"
          >
            <option value="ALL">Tous les commerces ({stores.length})</option>
            {stores.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name}
              </option>
            ))}
          </select>

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

          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as 'default' | 'price-asc' | 'price-desc' | 'name')
            }
            className="h-9 text-xs px-2.5 py-1 rounded-md border border-border bg-background text-foreground shadow-xs focus:ring-1 focus:ring-ring outline-none"
            title="Trier"
          >
            <option value="default">Tri par défaut</option>
            <option value="price-asc">Prix croissant</option>
            <option value="price-desc">Prix décroissant</option>
            <option value="name">Nom (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
      ) : error ? (
        <div className="p-8 text-center bg-card border border-destructive/20 rounded-xl space-y-2">
          <AlertCircle className="size-8 text-destructive mx-auto" />
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      ) : products.length === 0 ? (
        <div className="p-12 text-center bg-card border border-border rounded-xl space-y-4">
          <Package className="size-10 text-muted-foreground mx-auto stroke-1" />
          <h3 className="text-base font-semibold text-foreground">
            Catalogue en cours d'alimentation
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Les commerçants partenaires n'ont pas encore publié d'articles pour la vente en ligne.
          </p>
          <a
            href="/stores"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <StoreIcon className="size-3.5" /> Découvrir les boutiques partenaires
          </a>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-10 text-center bg-card border border-border rounded-xl space-y-2">
          <Search className="size-8 text-muted-foreground mx-auto" />
          <h4 className="text-sm font-medium text-foreground">Aucun produit ne correspond</h4>
          <p className="text-xs text-muted-foreground">
            Ajustez vos filtres de recherche ou sélectionnez un autre commerce.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setSelectedStoreId('ALL');
              setInStockOnly(false);
            }}
          >
            Réinitialiser les filtres
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map((product) => {
            const status = getStockStatus(product.stockQuantity);
            const isAvailable = product.stockQuantity > 0;
            const selectedQty = quantities[product.id] || 1;

            return (
              <Card
                key={`${product.storeId}-${product.id}`}
                className="group flex flex-col justify-between overflow-hidden border-border hover:shadow-lg transition-all duration-200 bg-card rounded-xl"
              >
                <div>
                  {/* Image container */}
                  <div className="relative aspect-4/3 w-full bg-muted/60 overflow-hidden flex items-center justify-center border-b border-border">
                    <ProductImage
                      storeId={product.storeId}
                      productId={product.id}
                      imageUrl={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      fallbackText="Visuel indisponible"
                    />

                    {/* Stock badge */}
                    <div className="absolute top-2.5 right-2.5">
                      {status === 'IN_STOCK' && (
                        <span className="bg-emerald-500/95 text-white font-medium text-[11px] px-2.5 py-0.5 rounded-full shadow-xs backdrop-blur-xs flex items-center gap-1">
                          <CheckCircle2 className="size-3" />
                          En stock
                        </span>
                      )}
                      {status === 'LOW_STOCK' && (
                        <span className="bg-amber-500/95 text-white font-medium text-[11px] px-2.5 py-0.5 rounded-full shadow-xs backdrop-blur-xs">
                          Plus que {product.stockQuantity} dispo !
                        </span>
                      )}
                      {status === 'OUT_OF_STOCK' && (
                        <span className="bg-rose-600/95 text-white font-medium text-[11px] px-2.5 py-0.5 rounded-full shadow-xs backdrop-blur-xs">
                          Rupture
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <CardHeader className="p-4 pb-2 space-y-1.5">
                    {/* Store Origin Pill */}
                    <a
                      href={ROUTES.storeDetail(product.storeUid || product.storeId)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:underline transition-colors"
                      title="Voir le magasin"
                    >
                      <StoreIcon className="size-3 text-primary" />
                      <span className="truncate max-w-[200px]">{product.storeName}</span>
                      <ExternalLink className="size-2.5 opacity-60" />
                    </a>

                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-semibold text-foreground line-clamp-1">
                        {product.name}
                      </CardTitle>
                      <span className="font-bold text-base text-primary whitespace-nowrap">
                        {product.price.toFixed(2)} €
                      </span>
                    </div>

                    {product.description && (
                      <CardDescription className="text-xs line-clamp-2 text-muted-foreground">
                        {product.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                </div>

                {/* Footer: Quantity selector and Add to Cart */}
                <div className="p-4 pt-2 border-t border-border/50 bg-muted/20 space-y-2.5">
                  {isAvailable ? (
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center rounded-lg border border-border bg-background shadow-xs p-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 rounded"
                          onClick={() =>
                            handleQuantityChange(product.id, -1, product.stockQuantity)
                          }
                          disabled={selectedQty <= 1}
                          aria-label="Diminuer la quantité"
                        >
                          <Minus className="size-3.5" />
                        </Button>
                        <span className="w-8 text-center text-xs font-semibold font-mono">
                          {selectedQty}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 rounded"
                          onClick={() => handleQuantityChange(product.id, 1, product.stockQuantity)}
                          disabled={selectedQty >= product.stockQuantity}
                          aria-label="Augmenter la quantité"
                        >
                          <Plus className="size-3.5" />
                        </Button>
                      </div>

                      <Button
                        type="button"
                        onClick={() => handleAddToCart(product)}
                        className="flex-1 h-8 text-xs gap-1.5 shadow-xs"
                      >
                        <ShoppingBag className="size-3.5" />
                        <span>Commander ({(product.price * selectedQty).toFixed(2)} €)</span>
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled
                      className="w-full h-8 text-xs opacity-60 cursor-not-allowed"
                    >
                      Victime de son succès (Rupture)
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
