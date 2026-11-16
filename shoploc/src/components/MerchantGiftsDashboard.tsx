import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
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
import { GiftFormDialog } from '@/components/GiftFormDialog';
import { getStoreGifts, deleteGift, adjustGiftStock } from '@/lib/api';
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
  Plus,
  Minus,
} from 'lucide-react';

interface MerchantGiftsDashboardProps {
  storeId: number;
  storeName?: string;
}

export function MerchantGiftsDashboard({
  storeId,
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

  // Stock adjustment loading map
  const [adjustingStockIds, setAdjustingStockIds] = React.useState<Record<number, boolean>>({});

  // Notification message
  const [feedback, setFeedback] = React.useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fetchGifts = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await getStoreGifts(storeId, true);
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
  }, [storeId]);

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

  const handleSaveSuccess = (savedGift: LoyaltyGift) => {
    setGifts((prev) => {
      const exists = prev.some((g) => g.id === savedGift.id);
      if (exists) {
        return prev.map((g) => (g.id === savedGift.id ? savedGift : g));
      }
      return [savedGift, ...prev];
    });
    showNotification(
      selectedGift
        ? `Article cadeau "${savedGift.name}" mis à jour`
        : `Article cadeau "${savedGift.name}" ajouté avec succès`
    );
  };

  const handleConfirmDelete = async () => {
    if (!giftToDelete) return;
    setIsDeleting(true);
    try {
      await deleteGift(storeId, giftToDelete.id);
      setGifts((prev) => prev.filter((g) => g.id !== giftToDelete.id));
      showNotification(`Article cadeau "${giftToDelete.name}" supprimé`);
      setGiftToDelete(null);
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : 'Échec de la suppression', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleQuickAdjustStock = async (giftId: number, delta: number) => {
    setAdjustingStockIds((prev) => ({ ...prev, [giftId]: true }));
    try {
      const updated = await adjustGiftStock(storeId, giftId, delta);
      setGifts((prev) => prev.map((g) => (g.id === giftId ? updated : g)));
      showNotification(
        `Stock de "${updated.name}" ajusté (${delta > 0 ? `+${delta}` : delta}) : nouveau stock = ${updated.stock}`
      );
    } catch (err: unknown) {
      showNotification(
        err instanceof Error ? err.message : "Erreur d'ajustement du stock",
        'error'
      );
    } finally {
      setAdjustingStockIds((prev) => ({ ...prev, [giftId]: false }));
    }
  };

  // Metrics
  const totalCount = gifts.length;
  const inStockCount = gifts.filter((g) => getGiftStockStatus(g.stock) === 'IN_STOCK').length;
  const lowStockCount = gifts.filter((g) => getGiftStockStatus(g.stock) === 'LOW_STOCK').length;
  const outOfStockCount = gifts.filter(
    (g) => getGiftStockStatus(g.stock) === 'OUT_OF_STOCK'
  ).length;

  // Filtered gifts
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
      {/* Top Banner & Header */}
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 sm:p-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
                <Gift className="size-5" />
              </div>
              <CardTitle className="text-xl font-bold">Catalogue de Cadeaux Fidélité</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              Proposez et gérez les articles récompenses que vos clients peuvent échanger avec leurs
              points de fidélité.
            </CardDescription>
          </div>
          <Button onClick={handleOpenCreate} size="sm" className="gap-1.5 self-start sm:self-auto">
            <PackagePlus className="size-4" />
            <span>Nouveau cadeau</span>
          </Button>
        </CardHeader>
      </Card>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 border-border bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total cadeaux</p>
              <p className="text-2xl font-bold mt-1 text-foreground">{totalCount}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <Gift className="size-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-border bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">En stock</p>
              <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                {inStockCount}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-border bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Stock faible</p>
              <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
                {lowStockCount}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-border bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Épuisés</p>
              <p className="text-2xl font-bold mt-1 text-destructive">{outOfStockCount}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive">
              <XCircle className="size-5" />
            </div>
          </div>
        </Card>
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

      {/* Search and Filters Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un cadeau par nom ou description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs sm:text-sm"
          />
        </div>

        <div className="inline-flex items-center p-1 bg-muted/60 rounded-lg border border-border self-start sm:self-auto overflow-x-auto">
          <Button
            type="button"
            variant={stockFilter === 'ALL' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setStockFilter('ALL')}
            className="h-7 text-xs px-2.5"
          >
            Tous ({totalCount})
          </Button>
          <Button
            type="button"
            variant={stockFilter === 'IN_STOCK' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setStockFilter('IN_STOCK')}
            className="h-7 text-xs px-2.5"
          >
            En stock ({inStockCount})
          </Button>
          <Button
            type="button"
            variant={stockFilter === 'LOW_STOCK' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setStockFilter('LOW_STOCK')}
            className="h-7 text-xs px-2.5"
          >
            Faible ({lowStockCount})
          </Button>
          <Button
            type="button"
            variant={stockFilter === 'OUT_OF_STOCK' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setStockFilter('OUT_OF_STOCK')}
            className="h-7 text-xs px-2.5"
          >
            Épuisé ({outOfStockCount})
          </Button>
        </div>
      </div>

      {/* Catalog Grid / List */}
      {isLoading ? (
        <div className="py-16 text-center space-y-3">
          <Loader2 className="size-8 animate-spin mx-auto text-primary" />
          <p className="text-xs text-muted-foreground">Chargement des cadeaux fidélité...</p>
        </div>
      ) : error ? (
        <div className="py-12 text-center space-y-3 bg-card border border-destructive/20 rounded-xl p-6">
          <AlertTriangle className="size-8 text-destructive mx-auto" />
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchGifts} className="gap-1.5">
            <RefreshCw className="size-3.5" /> Réessayer
          </Button>
        </div>
      ) : filteredGifts.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-card border border-dashed border-border rounded-xl p-6">
          <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Gift className="size-6" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Aucun article cadeau trouvé</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {searchQuery || stockFilter !== 'ALL'
              ? 'Aucun cadeau ne correspond à vos critères de recherche.'
              : 'Vous n’avez pas encore configuré de cadeaux fidélité pour vos clients.'}
          </p>
          {!searchQuery && stockFilter === 'ALL' && (
            <Button onClick={handleOpenCreate} size="sm" className="gap-1.5 mt-2">
              <PackagePlus className="size-4" />
              <span>Créer mon premier cadeau</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGifts.map((gift) => {
            const stockStatus = getGiftStockStatus(gift.stock);
            const isAdjusting = Boolean(adjustingStockIds[gift.id]);

            return (
              <Card key={gift.id} className="flex flex-col border-border bg-card overflow-hidden">
                {/* Gift Visual */}
                <div className="relative h-40 bg-muted flex items-center justify-center overflow-hidden border-b border-border">
                  {gift.imageUrl ? (
                    <img
                      src={gift.imageUrl}
                      alt={gift.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground/60">
                      <Gift className="size-12 stroke-1 mb-1 text-muted-foreground/40" />
                      <span className="text-[11px]">Pas d'image</span>
                    </div>
                  )}

                  {/* Points Cost Overlay Badge */}
                  <div className="absolute top-2.5 right-2.5">
                    <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-semibold gap-1 text-xs shadow-xs">
                      <Coins className="size-3.5" />
                      <span>{gift.pointsCost} pts</span>
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-sm text-foreground line-clamp-1">
                        {gift.name}
                      </h4>
                      {stockStatus === 'OUT_OF_STOCK' && (
                        <Badge variant="destructive" className="text-[10px] shrink-0">
                          Épuisé
                        </Badge>
                      )}
                      {stockStatus === 'LOW_STOCK' && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] shrink-0 border-amber-500/30 text-amber-600 dark:text-amber-400"
                        >
                          Stock bas
                        </Badge>
                      )}
                      {stockStatus === 'IN_STOCK' && (
                        <Badge
                          variant="outline"
                          className="text-[10px] shrink-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                        >
                          En stock
                        </Badge>
                      )}
                    </div>

                    {gift.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {gift.description}
                      </p>
                    )}
                  </div>

                  {/* Stock Controls & Actions */}
                  <div className="pt-2 border-t border-border/60 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">Stock disponible :</span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-6 text-xs"
                          disabled={gift.stock <= 0 || isAdjusting}
                          onClick={() => handleQuickAdjustStock(gift.id, -1)}
                          title="Retirer 1 unité de stock"
                        >
                          <Minus className="size-3" />
                        </Button>
                        <span className="font-semibold w-8 text-center text-foreground">
                          {isAdjusting ? (
                            <Loader2 className="size-3 animate-spin mx-auto" />
                          ) : (
                            gift.stock
                          )}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-6 text-xs"
                          disabled={isAdjusting}
                          onClick={() => handleQuickAdjustStock(gift.id, 1)}
                          title="Ajouter 1 unité de stock"
                        >
                          <Plus className="size-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs gap-1"
                        onClick={() => handleOpenEdit(gift)}
                      >
                        <Pencil className="size-3.5" />
                        <span>Modifier</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setGiftToDelete(gift)}
                      >
                        <Trash2 className="size-3.5" />
                        <span>Supprimer</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Dialog: Add / Edit Gift */}
      <GiftFormDialog
        storeId={storeId}
        gift={selectedGift}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleSaveSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(giftToDelete)} onOpenChange={(open) => !open && setGiftToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-destructive/10 text-destructive rounded-lg">
                <Trash2 className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">
                  Supprimer l'article cadeau ?
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Cette action retirera définitivement ce cadeau de votre catalogue.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {giftToDelete && (
            <div className="p-3 bg-muted/40 border border-border rounded-lg text-xs space-y-1">
              <p className="font-medium text-foreground">{giftToDelete.name}</p>
              <p className="text-muted-foreground">
                Coût : {giftToDelete.pointsCost} points • Stock restant : {giftToDelete.stock}
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
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
