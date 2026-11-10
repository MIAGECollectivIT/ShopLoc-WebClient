import * as React from 'react';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProductImage } from '@/components/ProductImage';
import { useCart } from '@/hooks/useCart';
import { ROUTES } from '@/config/routes';
import {
  ShoppingBag,
  Store as StoreIcon,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  PackageOpen,
} from 'lucide-react';

export function CartDrawer() {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const {
    groupedByStore,
    totalItemCount,
    totalPrice,
    storeCount,
    isEmpty,
    updateQuantity,
    removeItem,
    clear,
  } = useCart();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // SSR safety: render neutral button before hydration
  const displayCount = mounted ? totalItemCount : 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="relative gap-1.5 px-2.5 h-9"
            aria-label={`Panier (${displayCount} article${displayCount > 1 ? 's' : ''})`}
          />
        }
      >
        <ShoppingBag className="size-4" />
        <span className="hidden sm:inline text-xs font-medium">Panier</span>
        {displayCount > 0 && (
          <Badge
            variant="default"
            className="h-5 min-w-5 px-1.5 text-[11px] font-bold rounded-full bg-primary text-primary-foreground flex items-center justify-center animate-in zoom-in-75 duration-200"
          >
            {displayCount > 99 ? '99+' : displayCount}
          </Badge>
        )}
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 bg-card">
        {/* Header */}
        <SheetHeader className="p-4 border-b border-border space-y-1">
          <div className="flex items-center justify-between pr-6">
            <SheetTitle className="text-base font-semibold flex items-center gap-2">
              <ShoppingBag className="size-4 text-primary" />
              <span>Mon Panier Click & Collect</span>
            </SheetTitle>
            {displayCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {displayCount} article{displayCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <SheetDescription className="text-xs text-muted-foreground">
            {displayCount > 0
              ? `Articles répartis sur ${storeCount} commerce${storeCount > 1 ? 's' : ''} partenaire${storeCount > 1 ? 's' : ''}`
              : 'Votre panier est actuellement vide'}
          </SheetDescription>
        </SheetHeader>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {isEmpty || displayCount === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="size-16 rounded-full bg-muted/60 flex items-center justify-center">
                <PackageOpen className="size-8 text-muted-foreground stroke-1" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-foreground">Votre panier est vide</h4>
                <p className="text-xs text-muted-foreground max-w-[240px]">
                  Parcourez le catalogue de nos commerçants partenaires pour composer votre panier.
                </p>
              </div>
              <SheetClose
                render={
                  <Button
                    variant="default"
                    size="sm"
                    className="mt-2 text-xs"
                    onClick={() => {
                      window.location.href = ROUTES.catalog.path;
                    }}
                  />
                }
              >
                Explorer le catalogue
              </SheetClose>
            </div>
          ) : (
            groupedByStore.map((group) => (
              <div
                key={group.storeId}
                className="rounded-xl border border-border bg-background/50 overflow-hidden shadow-2xs"
              >
                {/* Store header */}
                <div className="bg-muted/40 px-3.5 py-2.5 border-b border-border flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <StoreIcon className="size-3.5 text-primary shrink-0" />
                    <span className="text-xs font-semibold text-foreground truncate">
                      {group.storeName}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-primary whitespace-nowrap">
                    {group.subtotal.toFixed(2)} €
                  </span>
                </div>

                {/* Store items list */}
                <div className="divide-y divide-border/60">
                  {group.items.map((item) => (
                    <div
                      key={`${item.storeId}-${item.productId}`}
                      className="p-3 flex items-center gap-3 hover:bg-muted/20 transition-colors"
                    >
                      {/* Product thumbnail */}
                      <div className="size-12 rounded-lg bg-muted overflow-hidden shrink-0 border border-border/80">
                        <ProductImage
                          storeId={item.storeId}
                          productId={item.productId}
                          imageUrl={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Product details */}
                      <div className="flex-1 min-w-0">
                        <h5 className="text-xs font-medium text-foreground truncate">
                          {item.name}
                        </h5>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          {item.price.toFixed(2)} € / u.
                        </p>
                        <div className="text-xs font-semibold text-foreground pt-0.5">
                          {(item.price * item.quantity).toFixed(2)} €
                        </div>
                      </div>

                      {/* Quantity Controls & Remove */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="inline-flex items-center rounded-md border border-border bg-background shadow-2xs">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-6 rounded"
                            onClick={() =>
                              updateQuantity(item.productId, item.storeId, item.quantity - 1)
                            }
                            aria-label="Diminuer"
                          >
                            <Minus className="size-3" />
                          </Button>
                          <span className="w-6 text-center text-xs font-mono font-medium">
                            {item.quantity}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-6 rounded"
                            onClick={() =>
                              updateQuantity(item.productId, item.storeId, item.quantity + 1)
                            }
                            disabled={item.maxStock !== undefined && item.quantity >= item.maxStock}
                            aria-label="Augmenter"
                          >
                            <Plus className="size-3" />
                          </Button>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeItem(item.productId, item.storeId)}
                          aria-label="Supprimer l'article"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer actions */}
        {!isEmpty && displayCount > 0 && (
          <SheetFooter className="p-4 border-t border-border bg-muted/20 space-y-2">
            <div className="flex items-center justify-between text-sm pb-1">
              <span className="text-muted-foreground">Total estimé</span>
              <span className="text-base font-bold text-foreground font-mono">
                {totalPrice.toFixed(2)} €
              </span>
            </div>

            <Button
              className="w-full gap-2 shadow-xs"
              onClick={() => {
                setOpen(false);
                window.location.href = ROUTES.cart.path;
              }}
            >
              <span>Voir le panier & Passer commande</span>
              <ArrowRight className="size-4" />
            </Button>

            <div className="flex items-center justify-between pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-[11px] h-7 text-muted-foreground hover:text-destructive"
                onClick={() => {
                  if (confirm('Voulez-vous vraiment vider votre panier ?')) {
                    clear();
                  }
                }}
              >
                Vider le panier
              </Button>

              <SheetClose
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[11px] h-7 text-muted-foreground"
                  />
                }
              >
                Continuer mes achats
              </SheetClose>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
