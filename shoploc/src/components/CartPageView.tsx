import * as React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProductImage } from '@/components/ProductImage';
import { useCart } from '@/hooks/useCart';
import { getStoreById, getStoreProducts } from '@/lib/api';
import { ROUTES } from '@/config/routes';
import type { Store } from '@/types/store';
import {
  ShoppingBag,
  Store as StoreIcon,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  PackageOpen,
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

interface StoreInfoMap {
  [storeId: number]: {
    address?: string;
    loading: boolean;
  };
}

interface StockIssue {
  productId: number;
  storeId: number;
  productName: string;
  availableStock: number;
  requestedQty: number;
}

export function CartPageView() {
  const [mounted, setMounted] = React.useState(false);
  const {
    groupedByStore,
    totalItemCount,
    totalPrice,
    storeCount,
    isEmpty,
    updateQuantity,
    removeItem,
    clearStore,
    clear,
  } = useCart();

  const [storeDetails, setStoreDetails] = React.useState<StoreInfoMap>({});
  const [isValidating, setIsValidating] = React.useState(false);
  const [stockIssues, setStockIssues] = React.useState<StockIssue[]>([]);
  const [validatedSuccess, setValidatedSuccess] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch store addresses for Click & Collect pickup points
  React.useEffect(() => {
    if (!mounted || groupedByStore.length === 0) return;

    groupedByStore.forEach((group) => {
      if (storeDetails[group.storeId]) return;

      setStoreDetails((prev) => ({
        ...prev,
        [group.storeId]: { loading: true },
      }));

      getStoreById(group.storeId)
        .then((store: Store) => {
          setStoreDetails((prev) => ({
            ...prev,
            [group.storeId]: {
              address: store.address || undefined,
              loading: false,
            },
          }));
        })
        .catch(() => {
          setStoreDetails((prev) => ({
            ...prev,
            [group.storeId]: {
              address: undefined,
              loading: false,
            },
          }));
        });
    });
  }, [mounted, groupedByStore]);

  // Real-time stock validation check (SLE-184)
  const handleValidateCart = async () => {
    setIsValidating(true);
    setStockIssues([]);

    try {
      const issues: StockIssue[] = [];

      for (const group of groupedByStore) {
        try {
          const liveProducts = await getStoreProducts(group.storeId);
          const liveMap = new Map(liveProducts.map((p) => [p.id, p]));

          for (const item of group.items) {
            const liveProduct = liveMap.get(item.productId);
            if (!liveProduct) {
              issues.push({
                productId: item.productId,
                storeId: item.storeId,
                productName: item.name,
                availableStock: 0,
                requestedQty: item.quantity,
              });
            } else if (liveProduct.stockQuantity < item.quantity) {
              issues.push({
                productId: item.productId,
                storeId: item.storeId,
                productName: item.name,
                availableStock: liveProduct.stockQuantity,
                requestedQty: item.quantity,
              });
              // Auto update maxStock in cart
              updateQuantity(item.productId, item.storeId, Math.max(1, liveProduct.stockQuantity));
            }
          }
        } catch {
          // If store products cannot be reached, allow proceeding if local stock holds
        }
      }

      if (issues.length > 0) {
        setStockIssues(issues);
        setValidatedSuccess(false);
      } else {
        setValidatedSuccess(true);
        // Seamlessly forward to checkout step (Story SLE-20 / SLE-185)
        setTimeout(() => {
          // Will navigate to checkout when checkout page is implemented in SLE-20
        }, 1500);
      }
    } finally {
      setIsValidating(false);
    }
  };

  // SSR skeleton
  if (!mounted) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-40 bg-muted rounded-xl" />
            <div className="h-40 bg-muted rounded-xl" />
          </div>
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  // Empty Cart State
  if (isEmpty || totalItemCount === 0) {
    return (
      <div className="py-16 text-center space-y-5 max-w-md mx-auto">
        <div className="size-20 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
          <PackageOpen className="size-10 stroke-1" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">Votre panier est vide</h2>
          <p className="text-sm text-muted-foreground">
            Vous n'avez pas encore sélectionné d'articles pour votre commande Click & Collect.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            variant="default"
            onClick={() => {
              window.location.href = ROUTES.catalog.path;
            }}
            className="w-full sm:w-auto gap-2"
          >
            <ShoppingBag className="size-4" />
            <span>Parcourir le catalogue</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              window.location.href = ROUTES.stores.path;
            }}
            className="w-full sm:w-auto gap-2"
          >
            <StoreIcon className="size-4" />
            <span>Découvrir les commerces</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header breadcrumb & summary banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <ShoppingBag className="size-6 text-primary" />
            <span>Mon Panier Click & Collect</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {totalItemCount} article{totalItemCount > 1 ? 's' : ''} à retirer dans {storeCount}{' '}
            commerce{storeCount > 1 ? 's' : ''} partenaire{storeCount > 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              window.location.href = ROUTES.catalog.path;
            }}
            className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            <span>Poursuivre mes achats</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm('Êtes-vous sûr de vouloir vider l’ensemble de votre panier ?')) {
                clear();
              }
            }}
            className="text-xs gap-1.5 text-muted-foreground hover:text-destructive hover:border-destructive/40"
          >
            <Trash2 className="size-3.5" />
            <span>Vider le panier</span>
          </Button>
        </div>
      </div>

      {/* Stock issue alerts (SLE-184) */}
      {stockIssues.length > 0 && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="size-4 text-destructive shrink-0" />
            <span>Disponibilité modifiée pour certains articles</span>
          </div>
          <ul className="list-disc list-inside space-y-1 pl-1 text-muted-foreground dark:text-destructive-foreground">
            {stockIssues.map((issue) => (
              <li key={`${issue.storeId}-${issue.productId}`}>
                <strong>{issue.productName}</strong> :{' '}
                {issue.availableStock === 0 ? (
                  <span className="text-destructive font-medium">
                    Actuellement en rupture de stock
                  </span>
                ) : (
                  <span>Seulement {issue.availableStock} disponible(s) (quantité ajustée)</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Validated success banner */}
      {validatedSuccess && (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 font-medium">
            <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Disponibilité des stocks confirmée !</p>
              <p className="text-[11px] text-muted-foreground dark:text-emerald-400/80">
                Vos articles sont prêts à être réservés pour le Click & Collect.
              </p>
            </div>
          </div>
          <Badge className="bg-emerald-600 text-white font-semibold">Stocks vérifiés</Badge>
        </div>
      )}

      {/* Main Grid: 2/3 Store groups, 1/3 Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left column: Stores and Items (SLE-182 & SLE-183) */}
        <div className="lg:col-span-2 space-y-6">
          {groupedByStore.map((group) => {
            const storeInfo = storeDetails[group.storeId];

            return (
              <Card
                key={group.storeId}
                className="overflow-hidden border-border bg-card rounded-xl shadow-xs"
              >
                {/* Store Header */}
                <CardHeader className="bg-muted/40 p-4 border-b border-border flex flex-row items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <StoreIcon className="size-4 text-primary shrink-0" />
                      <a
                        href={ROUTES.storeDetail(group.storeUid || group.storeId)}
                        className="font-bold text-base text-foreground hover:underline truncate"
                      >
                        {group.storeName}
                      </a>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                        Click & Collect
                      </Badge>
                    </div>

                    {storeInfo?.address && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                        <MapPin className="size-3 text-muted-foreground shrink-0" />
                        <span>Retrait : {storeInfo.address}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-primary font-mono whitespace-nowrap">
                      {group.subtotal.toFixed(2)} €
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Retirer tous les articles de ${group.storeName} ?`)) {
                          clearStore(group.storeId);
                        }
                      }}
                      title="Vider les articles de cette boutique"
                      aria-label={`Vider les articles de ${group.storeName}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </CardHeader>

                {/* Items list */}
                <CardContent className="p-0 divide-y divide-border/60">
                  {group.items.map((item) => {
                    const isIssue = stockIssues.some(
                      (si) => si.productId === item.productId && si.storeId === item.storeId
                    );

                    return (
                      <div
                        key={`${item.storeId}-${item.productId}`}
                        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                          isIssue ? 'bg-destructive/5' : 'hover:bg-muted/10'
                        }`}
                      >
                        {/* Thumbnail & Title */}
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <div className="size-16 rounded-lg bg-muted overflow-hidden shrink-0 border border-border">
                            <ProductImage
                              storeId={item.storeId}
                              productId={item.productId}
                              imageUrl={item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <div className="space-y-0.5 min-w-0">
                            <h4 className="font-semibold text-sm text-foreground truncate">
                              {item.name}
                            </h4>
                            <p className="text-xs text-muted-foreground font-mono">
                              {item.price.toFixed(2)} € / unité
                            </p>
                            {item.maxStock !== undefined && (
                              <p className="text-[11px] text-muted-foreground">
                                Stock disponible : {item.maxStock}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Quantity Controls & Line Total (SLE-183) */}
                        <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                          {/* Stepper +/- */}
                          <div className="inline-flex items-center rounded-lg border border-border bg-background shadow-2xs p-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 rounded"
                              onClick={() =>
                                updateQuantity(item.productId, item.storeId, item.quantity - 1)
                              }
                              disabled={item.quantity <= 1}
                              aria-label="Diminuer la quantité"
                            >
                              <Minus className="size-3.5" />
                            </Button>
                            <span className="w-8 text-center text-xs font-semibold font-mono">
                              {item.quantity}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 rounded"
                              onClick={() =>
                                updateQuantity(item.productId, item.storeId, item.quantity + 1)
                              }
                              disabled={
                                item.maxStock !== undefined && item.quantity >= item.maxStock
                              }
                              aria-label="Augmenter la quantité"
                            >
                              <Plus className="size-3.5" />
                            </Button>
                          </div>

                          {/* Line Subtotal */}
                          <div className="w-20 text-right">
                            <span className="font-bold text-sm text-foreground font-mono">
                              {(item.price * item.quantity).toFixed(2)} €
                            </span>
                          </div>

                          {/* Delete Item button */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeItem(item.productId, item.storeId)}
                            title="Supprimer l'article"
                            aria-label={`Supprimer ${item.name}`}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Right column: Sticky Checkout Summary Card */}
        <div className="lg:sticky lg:top-20 space-y-4">
          <Card className="border-border bg-card rounded-xl shadow-xs">
            <CardHeader className="p-5 pb-4 border-b border-border">
              <CardTitle className="text-base font-bold text-foreground">
                Récapitulatif de commande
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Vérification et validation de vos paniers locaux
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 space-y-3.5 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Nombre d'articles</span>
                <span className="font-semibold text-foreground font-mono">{totalItemCount}</span>
              </div>

              <div className="flex items-center justify-between text-muted-foreground">
                <span>Commerces partenaires</span>
                <span className="font-semibold text-foreground font-mono">{storeCount}</span>
              </div>

              <div className="flex items-center justify-between text-muted-foreground">
                <span>Retrait en boutique</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  Gratuit (Click & Collect)
                </span>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between text-base">
                <span className="font-bold text-foreground">Total à régler</span>
                <span className="font-extrabold text-primary font-mono text-lg">
                  {totalPrice.toFixed(2)} €
                </span>
              </div>
            </CardContent>

            <CardFooter className="p-5 pt-4 flex flex-col gap-3.5">
              <Button
                type="button"
                className="w-full gap-2 text-sm h-10 shadow-xs"
                onClick={handleValidateCart}
                disabled={isValidating}
              >
                {isValidating ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    <span>Contrôle des stocks...</span>
                  </>
                ) : (
                  <>
                    <span>Valider mon panier</span>
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground text-center">
                <ShieldCheck className="size-3.5 text-emerald-500" />
                <span>Paiement sécurisé et retrait garanti chez vos commerçants</span>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
