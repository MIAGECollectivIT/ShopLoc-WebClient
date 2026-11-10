import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ProductImage } from '@/components/ProductImage';
import { getStoreProducts } from '@/lib/api';
import { type Product, getStockStatus } from '@/types/product';
import {
  ShoppingBag,
  Search,
  Package,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Check,
} from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import type { CartItem } from '@/types/cart';
import { CART_STORAGE_KEY } from '@/lib/cart';

export type { CartItem };
export { CART_STORAGE_KEY };

interface ClientProductCatalogProps {
  storeId: number;
  storeName?: string;
}

export function ClientProductCatalog({ storeId, storeName }: ClientProductCatalogProps) {
  const { addItem, items: cartItems } = useCart();
  const [products, setProducts] = React.useState<Product[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = React.useState('');
  const [inStockOnly, setInStockOnly] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<'default' | 'price-asc' | 'price-desc' | 'name'>(
    'default'
  );

  // Selected quantities for cart per product id
  const [quantities, setQuantities] = React.useState<Record<number, number>>({});

  // Visual feedback for freshly added product
  const [justAddedId, setJustAddedId] = React.useState<number | null>(null);

  // Toast notification
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    getStoreProducts(storeId)
      .then((items) => {
        if (isMounted) {
          setProducts(items);
          // Initialize quantity state
          const initialQty: Record<number, number> = {};
          items.forEach((p) => {
            initialQty[p.id] = p.stockQuantity > 0 ? 1 : 0;
          });
          setQuantities(initialQty);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : 'Impossible de récupérer les articles du magasin'
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [storeId]);

  const handleQuantityChange = (productId: number, delta: number, maxStock: number) => {
    setQuantities((prev) => {
      const current = prev[productId] || 1;
      const next = Math.max(1, Math.min(maxStock, current + delta));
      return { ...prev, [productId]: next };
    });
  };

  const handleAddToCart = (product: Product, remainingStock: number) => {
    const qty = Math.min(remainingStock, quantities[product.id] || 1);
    if (qty <= 0 || product.stockQuantity <= 0) return;

    const res = addItem({
      productId: product.id,
      storeId,
      storeName: storeName || 'Boutique',
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      quantity: qty,
      maxStock: product.stockQuantity,
    });

    if (res.success) {
      setJustAddedId(product.id);
      setTimeout(() => setJustAddedId(null), 1200);
      setQuantities((prev) => ({ ...prev, [product.id]: 1 }));
      setToastMessage(`${res.quantityAdded ?? qty} × "${product.name}" ajouté au panier !`);
    } else {
      setToastMessage(res.message || 'Article ajouté au panier !');
    }
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered & Sorted products
  const filteredProducts = React.useMemo(() => {
    let result = products.filter((p) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;
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
  }, [products, searchQuery, inStockOnly, sortBy]);

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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ShoppingBag className="size-5 text-primary" />
              Catalogue Click & Collect
            </h2>
            <Badge variant="secondary" className="font-mono text-xs">
              {products.length} {products.length > 1 ? 'articles' : 'article'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Commandez vos produits en ligne et retirez-les directement chez ce commerçant.
          </p>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Rechercher un produit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-background"
            />
          </div>

          <Button
            type="button"
            variant={inStockOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setInStockOnly((v) => !v)}
            className="h-8 text-xs gap-1.5"
          >
            <span
              className={`size-2 rounded-full ${inStockOnly ? 'bg-background' : 'bg-emerald-500'}`}
            />
            <span>En stock uniquement</span>
          </Button>

          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as 'default' | 'price-asc' | 'price-desc' | 'name')
              }
              className="h-8 text-xs px-2.5 py-1 rounded-md border border-border bg-background text-foreground shadow-xs focus:ring-1 focus:ring-ring outline-none"
              title="Trier le catalogue"
            >
              <option value="default">Tri par défaut</option>
              <option value="price-asc">Prix : croissant</option>
              <option value="price-desc">Prix : décroissant</option>
              <option value="name">Nom (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Catalog Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="border border-border rounded-xl p-4 space-y-3 bg-card animate-pulse"
            >
              <div className="aspect-4/3 bg-muted rounded-lg" />
              <div className="h-4 bg-muted rounded w-2/3" />
              <div className="h-3 bg-muted rounded w-1/3" />
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
        <div className="p-12 text-center bg-card border border-border rounded-xl space-y-3">
          <Package className="size-10 text-muted-foreground mx-auto stroke-1" />
          <h3 className="text-base font-semibold text-foreground">
            Aucun produit Click & Collect pour l'instant
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Ce commerçant n'a pas encore publié d'articles pour la commande en ligne. Revenez très
            bientôt !
          </p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-10 text-center bg-card border border-border rounded-xl space-y-2">
          <Search className="size-8 text-muted-foreground mx-auto" />
          <h4 className="text-sm font-medium text-foreground">Aucun produit trouvé</h4>
          <p className="text-xs text-muted-foreground">
            Essayez de modifier votre recherche ou de désactiver le filtre "En stock".
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map((product) => {
            const status = getStockStatus(product.stockQuantity);
            const inCartItem = cartItems.find(
              (i) => i.productId === product.id && i.storeId === storeId
            );
            const inCartQty = inCartItem?.quantity || 0;
            const remainingStock = Math.max(0, product.stockQuantity - inCartQty);
            const isAvailable = product.stockQuantity > 0;
            const isMaxInCart = isAvailable && remainingStock === 0;
            const selectedQty = Math.min(remainingStock || 1, quantities[product.id] || 1);

            return (
              <Card
                key={product.id}
                className="group flex flex-col justify-between overflow-hidden border-border hover:shadow-lg transition-all duration-200 bg-card rounded-xl"
              >
                <div>
                  {/* Image container */}
                  <div className="relative aspect-4/3 w-full bg-muted/60 overflow-hidden flex items-center justify-center border-b border-border">
                    <ProductImage
                      storeId={product.storeId || storeId}
                      productId={product.id}
                      imageUrl={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      fallbackText="Visuel bientôt disponible"
                    />

                    {/* Stock status badge */}
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
                  <CardHeader className="p-4 pb-2 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-semibold text-foreground line-clamp-1">
                        {product.name}
                      </CardTitle>
                      <span className="font-bold text-base text-primary whitespace-nowrap">
                        {product.price.toFixed(2)} €
                      </span>
                    </div>

                    {product.description && (
                      <CardDescription className="text-xs line-clamp-2 text-muted-foreground pt-1">
                        {product.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                </div>

                {/* Footer: Quantity selector and Add to Cart */}
                <div className="p-4 pt-2 border-t border-border/50 bg-muted/20 space-y-2">
                  {!isAvailable ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled
                      className="w-full h-8 text-xs opacity-60 cursor-not-allowed"
                    >
                      Victime de son succès (Rupture)
                    </Button>
                  ) : isMaxInCart ? (
                    <div className="space-y-1">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled
                        className="w-full h-8 text-xs opacity-80 cursor-not-allowed gap-1.5 font-medium border border-border"
                      >
                        <Check className="size-3.5 text-emerald-600" />
                        <span>Stock max au panier ({inCartQty})</span>
                      </Button>
                      <p className="text-[10px] text-center text-muted-foreground">
                        Tout le stock disponible est dans votre panier
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        {/* Quantity decrement / increment */}
                        <div className="inline-flex items-center rounded-lg border border-border bg-background shadow-xs p-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 rounded"
                            onClick={() => handleQuantityChange(product.id, -1, remainingStock)}
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
                            onClick={() => handleQuantityChange(product.id, 1, remainingStock)}
                            disabled={selectedQty >= remainingStock}
                            aria-label="Augmenter la quantité"
                          >
                            <Plus className="size-3.5" />
                          </Button>
                        </div>

                        {/* Add to cart action */}
                        <Button
                          type="button"
                          onClick={() => handleAddToCart(product, remainingStock)}
                          className={`flex-1 h-8 text-xs gap-1.5 shadow-xs transition-all ${
                            justAddedId === product.id
                              ? 'bg-emerald-600 hover:bg-emerald-600 text-white'
                              : ''
                          }`}
                        >
                          {justAddedId === product.id ? (
                            <>
                              <Check className="size-3.5 animate-in zoom-in-50" />
                              <span>Ajouté !</span>
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="size-3.5" />
                              <span>Ajouter ({(product.price * selectedQty).toFixed(2)} €)</span>
                            </>
                          )}
                        </Button>
                      </div>
                      {inCartQty > 0 && (
                        <p className="text-[10px] text-muted-foreground flex items-center justify-between px-0.5">
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            ✓ {inCartQty} déjà au panier
                          </span>
                          <span>Reste {remainingStock} dispo</span>
                        </p>
                      )}
                    </div>
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
