import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GiftStockControl } from '@/components/GiftStockControl';
import { GiftFormDialog } from '@/components/GiftFormDialog';
import { GiftImage } from '@/components/GiftImage';
import { getStoreGifts, deleteGift } from '@/lib/api';
import { type LoyaltyGift, type GiftStockStatus, getGiftStockStatus } from '@/types/gift';
import {
  Gift,
  Coins,
  PackagePlus,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Pencil,
  Trash2,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
  X,
} from 'lucide-react';

interface MerchantGiftsDashboardProps {
  storeUid: string;
  storeName?: string;
}

export function MerchantGiftsDashboard({
  storeUid,
  storeName: _storeName,
}: MerchantGiftsDashboardProps) {
  const [gifts, setGifts] = React.useState<LoyaltyGift[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = React.useState('');
  const [stockFilter, setStockFilter] = React.useState<'ALL' | GiftStockStatus>('ALL');

  // Modal dialog states
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [selectedGift, setSelectedGift] = React.useState<LoyaltyGift | null>(null);

  // Delete dialog state
  const [giftToDelete, setGiftToDelete] = React.useState<LoyaltyGift | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Notification message
  const [feedback, setFeedback] = React.useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fetchGifts = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await getStoreGifts(storeUid, true);
      setGifts(items);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de charger le catalogue des cadeaux fidélité.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [storeUid]);

  React.useEffect(() => {
    fetchGifts();
  }, [fetchGifts]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  const handleOpenCreate = () => {
    setSelectedGift(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (gift: LoyaltyGift) => {
    setSelectedGift(gift);
    setIsFormOpen(true);
  };

  const handleGiftSaved = (savedGift: LoyaltyGift) => {
    setGifts((prev) => {
      const exists = prev.some((g) => g.uid === savedGift.uid);
      if (exists) {
        return prev.map((g) => (g.uid === savedGift.uid ? savedGift : g));
      }
      return [savedGift, ...prev];
    });
    showNotification(
      selectedGift
        ? `Article cadeau "${savedGift.name}" mis à jour avec succès`
        : `Article cadeau "${savedGift.name}" créé avec succès`
    );
  };

  const handleStockUpdated = (updatedGift: LoyaltyGift) => {
    setGifts((prev) => prev.map((g) => (g.uid === updatedGift.uid ? updatedGift : g)));
    showNotification(`Stock de "${updatedGift.name}" mis à jour (${updatedGift.stock} unités)`);
  };

  const handleConfirmDelete = async () => {
    if (!giftToDelete) return;
    setIsDeleting(true);
    try {
      await deleteGift(storeUid, giftToDelete.uid);
      setGifts((prev) => prev.filter((g) => g.uid !== giftToDelete.uid));
      showNotification(`Article cadeau "${giftToDelete.name}" supprimé`);
      setGiftToDelete(null);
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : 'Échec de la suppression', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Metrics
  const totalCount = gifts.length;
  const inStockCount = gifts.filter((g) => getGiftStockStatus(g.stock) === 'IN_STOCK').length;
  const lowStockCount = gifts.filter((g) => getGiftStockStatus(g.stock) === 'LOW_STOCK').length;
  const outOfStockCount = gifts.filter(
    (g) => getGiftStockStatus(g.stock) === 'OUT_OF_STOCK'
  ).length;

  // Filtered gifts list
  const filteredGifts = gifts.filter((g) => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.description && g.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (stockFilter === 'ALL') return true;
    return getGiftStockStatus(g.stock) === stockFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Gift className="size-5 text-primary" />
              Catalogue de Cadeaux Fidélité
            </h2>
            <Badge variant="secondary" className="font-mono text-xs">
              {totalCount} {totalCount > 1 ? 'cadeaux' : 'cadeau'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gérez vos récompenses en points et ajustez les stocks dédiés aux cadeaux fidélité.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchGifts}
            disabled={isLoading}
            title="Rafraîchir les cadeaux"
            className="gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualiser</span>
          </Button>

          <Button type="button" size="sm" onClick={handleOpenCreate} className="gap-1.5 shadow-xs">
            <PackagePlus className="size-4" />
            <span>Ajouter un cadeau</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards (identical to MerchantCatalogDashboard) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-card border border-border p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total cadeaux</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{totalCount}</p>
          </div>
          <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Gift className="size-4" />
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

      {/* Notification Feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-lg border text-xs sm:text-sm flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
              : 'bg-destructive/10 border-destructive/20 text-destructive'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="size-4 shrink-0" />
            ) : (
              <AlertTriangle className="size-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs underline hover:opacity-80"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-muted/40 p-3 rounded-xl border border-border">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Rechercher par nom de cadeau..."
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
          <Button variant="outline" size="sm" onClick={fetchGifts} className="gap-1.5">
            <RefreshCw className="size-3.5" /> Réessayer
          </Button>
        </div>
      ) : gifts.length === 0 ? (
        /* Empty State: No gifts at all */
        <div className="p-12 text-center bg-card border border-dashed border-border rounded-xl space-y-4">
          <div className="size-14 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
            <Gift className="size-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">
              Aucun cadeau dans votre catalogue
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Ajoutez vos premiers lots et récompenses fidélité avec leurs coûts en points et stocks
              dédiés pour récompenser vos clients réguliers.
            </p>
          </div>
          <Button onClick={handleOpenCreate} className="gap-2">
            <PackagePlus className="size-4" />
            Créer mon premier cadeau
          </Button>
        </div>
      ) : filteredGifts.length === 0 ? (
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
        /* Gifts Grid (matching Products Grid design!) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGifts.map((gift) => {
            const status = getGiftStockStatus(gift.stock);

            return (
              <Card
                key={gift.uid}
                className="group relative flex flex-col justify-between overflow-hidden border-border hover:shadow-md transition-shadow bg-card"
              >
                <div>
                  {/* Gift Image with overlays */}
                  <div className="relative aspect-4/3 w-full bg-muted/60 overflow-hidden flex items-center justify-center border-b border-border">
                    <GiftImage
                      storeUid={gift.storeUid || storeUid}
                      giftUid={gift.uid}
                      imageUrl={gift.imageUrl}
                      alt={gift.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      fallbackText="Aucun visuel"
                    />

                    {/* Points Overlay Badge (Top Left) */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="bg-background/90 backdrop-blur-xs text-foreground font-mono text-[10px] font-semibold px-2 py-0.5 rounded shadow-xs border border-border flex items-center gap-1">
                        <Coins className="size-3 text-amber-500" />
                        <span>{gift.pointsCost} pts</span>
                      </span>
                    </div>

                    {/* Stock Status Badge Overlay (Top Right) */}
                    <div className="absolute top-2.5 right-2.5">
                      {status === 'IN_STOCK' && (
                        <span className="bg-emerald-500/90 text-white font-medium text-[11px] px-2 py-0.5 rounded-full shadow-xs backdrop-blur-xs">
                          En stock ({gift.stock})
                        </span>
                      )}
                      {status === 'LOW_STOCK' && (
                        <span className="bg-amber-500/90 text-white font-medium text-[11px] px-2 py-0.5 rounded-full shadow-xs backdrop-blur-xs">
                          Faible ({gift.stock})
                        </span>
                      )}
                      {status === 'OUT_OF_STOCK' && (
                        <span className="bg-rose-600/90 text-white font-medium text-[11px] px-2 py-0.5 rounded-full shadow-xs backdrop-blur-xs">
                          Rupture
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Header / Info: Points replaces Price on the right! */}
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-semibold text-foreground line-clamp-1">
                        {gift.name}
                      </CardTitle>
                      <span className="font-bold text-base text-primary whitespace-nowrap flex items-center gap-1">
                        <Coins className="size-4 text-amber-500" />
                        <span>{gift.pointsCost} pts</span>
                      </span>
                    </div>
                    {gift.description && (
                      <CardDescription className="text-xs line-clamp-2 mt-1">
                        {gift.description}
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
                    <GiftStockControl gift={gift} onStockUpdated={handleStockUpdated} />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => handleOpenEdit(gift)}
                      title="Modifier les détails du cadeau"
                    >
                      <Pencil className="size-3.5" />
                      Modifier
                    </Button>

                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => setGiftToDelete(gift)}
                      title="Supprimer définitivement ce cadeau"
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

      {/* Modal Dialog: Add / Edit Gift */}
      <GiftFormDialog
        storeUid={storeUid}
        gift={selectedGift}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedGift(null);
        }}
        onSuccess={handleGiftSaved}
      />

      {/* Delete Confirmation Modal */}
      <Dialog
        open={Boolean(giftToDelete)}
        onOpenChange={(open) => {
          if (!open) setGiftToDelete(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
                <Trash2 className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  Supprimer l'article cadeau ?
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Cette action est irréversible. L'article sera définitivement retiré de votre
                  catalogue de cadeaux fidélité.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {giftToDelete && (
            <div className="p-3 bg-muted/40 border border-border rounded-lg text-xs space-y-1">
              <p className="font-semibold text-foreground">{giftToDelete.name}</p>
              <p className="text-muted-foreground">
                Valeur : {giftToDelete.pointsCost} points • Stock restant : {giftToDelete.stock}{' '}
                unités
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setGiftToDelete(null)}
              disabled={isDeleting}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="gap-1.5"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Suppression...</span>
                </>
              ) : (
                <>
                  <Trash2 className="size-3.5" />
                  <span>Confirmer la suppression</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
