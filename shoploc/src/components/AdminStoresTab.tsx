import * as React from 'react';
import type { Store as StoreType } from '@/types/store';
import type { AdminPartnerSummary } from '@/types/partner';
import type { UserResponse } from '@/types/user';
import {
  getStores,
  revokeStore,
  reactivateStore,
  getAdminPartners,
  getAdminUserById,
  addStoreToPartner,
} from '@/lib/api';
import { isValidRibOrIban } from '@/lib/validation/store';
import { PartnerSelect } from '@/components/PartnerSelect';
import { StoreForm } from '@/components/CreateStoreForm';
import { RibInputField } from '@/components/RibInputField';
import { ROUTES } from '@/config/routes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import {
  Search,
  Store,
  Tag,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit,
  User,
  Loader2,
} from 'lucide-react';

interface AdminStoresTabProps {
  initialStores?: StoreType[];
}

export function AdminStoresSkeleton() {
  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden space-y-0">
      <div className="p-3.5 border-b bg-muted/30 flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="divide-y divide-border/60">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Skeleton className="size-9 rounded-lg shrink-0" />
              <div className="space-y-1.5 flex-1 max-w-xs">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-6 w-24 hidden md:block" />
            <Skeleton className="h-6 w-28 hidden sm:block" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminStoresTab({ initialStores = [] }: AdminStoresTabProps) {
  const [stores, setStores] = React.useState<StoreType[]>(initialStores);
  const [query, setQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('ALL');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = React.useState<string | null>(null);

  // Pagination state (Client-side, 10 items per page)
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 10;

  // Revoke Dialog State
  const [revokingStore, setRevokingStore] = React.useState<StoreType | null>(null);
  const [isSubmittingRevoke, setIsSubmittingRevoke] = React.useState(false);

  // Reactivate Dialog State
  const [reactivatingStore, setReactivatingStore] = React.useState<StoreType | null>(null);
  const [reactivateRib, setReactivateRib] = React.useState('');
  const [reactivateRibError, setReactivateRibError] = React.useState<string | null>(null);
  const [reactivateUserId, setReactivateUserId] = React.useState<string>('');
  const [reactivatePartnerError, setReactivatePartnerError] = React.useState<string | null>(null);
  const [isSubmittingReactivate, setIsSubmittingReactivate] = React.useState(false);

  // Edit Store Dialog State
  const [editingStore, setEditingStore] = React.useState<StoreType | null>(null);

  // Partner merchants list (for owner resolution and reassignment)
  const [partners, setPartners] = React.useState<AdminPartnerSummary[]>([]);

  // Inspect User Modal State
  const [inspectingUserId, setInspectingUserId] = React.useState<string | null>(null);
  const [inspectingUser, setInspectingUser] = React.useState<UserResponse | null>(null);
  const [isLoadingUserDetails, setIsLoadingUserDetails] = React.useState(false);
  const [userDetailError, setUserDetailError] = React.useState<string | null>(null);

  // Load partners on mount
  React.useEffect(() => {
    async function loadPartners() {
      try {
        const data = await getAdminPartners('', 100);
        setPartners(data);
      } catch {
        // Silently ignore
      }
    }
    loadPartners();
  }, []);

  const partnerMap = React.useMemo(() => {
    const map = new Map<string, AdminPartnerSummary>();
    partners.forEach((p) => {
      map.set(p.publicId, p);
    });
    return map;
  }, [partners]);

  const handleOpenUserDetail = async (userId: string) => {
    setInspectingUserId(userId);
    setIsLoadingUserDetails(true);
    setUserDetailError(null);
    setInspectingUser(null);
    try {
      const user = await getAdminUserById(userId);
      setInspectingUser(user);
    } catch (err: unknown) {
      setUserDetailError(
        err instanceof Error
          ? err.message
          : 'Impossible de récupérer les informations de cet utilisateur.'
      );
    } finally {
      setIsLoadingUserDetails(false);
    }
  };

  const getUserInitials = (firstName?: string, lastName?: string) => {
    const f = firstName?.trim() ? firstName.trim()[0].toUpperCase() : '';
    const l = lastName?.trim() ? lastName.trim()[0].toUpperCase() : '';
    return f || l ? `${f}${l}` : 'U';
  };

  // Debounce search input by 300ms
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Reset pagination to page 1 on filter or search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQuery, statusFilter, categoryFilter]);

  // Fetch all stores (including revoked ones)
  const fetchStores = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getStores(true);
      setStores(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Impossible de récupérer la liste des commerces.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (initialStores.length === 0) {
      fetchStores();
    }
  }, [fetchStores, initialStores]);

  // Success message auto-dismiss
  React.useEffect(() => {
    if (actionSuccessMessage) {
      const timer = setTimeout(() => setActionSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [actionSuccessMessage]);

  // Unique categories for filter dropdown
  const availableCategories = React.useMemo(() => {
    const set = new Set<string>();
    stores.forEach((s) => {
      if (s.category && s.category.trim()) {
        set.add(s.category.trim());
      }
    });
    return Array.from(set).sort();
  }, [stores]);

  // Filtered list
  const filteredStores = React.useMemo(() => {
    return stores.filter((store) => {
      // Query filter
      if (debouncedQuery.trim()) {
        const q = debouncedQuery.trim().toLowerCase();
        const matchesName = store.name?.toLowerCase().includes(q);
        const matchesAddress = store.address?.toLowerCase().includes(q);
        const matchesCategory = store.category?.toLowerCase().includes(q);
        const matchesRib = store.rib?.toLowerCase().includes(q);
        if (!matchesName && !matchesAddress && !matchesCategory && !matchesRib) {
          return false;
        }
      }

      // Status filter
      if (statusFilter === 'ACTIVE' && store.status !== 'ACTIVE') {
        return false;
      }
      if (statusFilter === 'REVOKED' && store.status !== 'REVOKED') {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'ALL' && store.category !== categoryFilter) {
        return false;
      }

      return true;
    });
  }, [stores, debouncedQuery, statusFilter, categoryFilter]);

  // Sliced paginated list
  const totalPages = Math.max(1, Math.ceil(filteredStores.length / pageSize));
  const paginatedStores = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStores.slice(start, start + pageSize);
  }, [filteredStores, currentPage, pageSize]);

  const handleClearFilters = () => {
    setQuery('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
  };

  // Confirm Revocation
  const handleConfirmRevoke = async () => {
    if (!revokingStore) return;
    const storeUid = revokingStore.uid;
    if (!storeUid) return;

    setIsSubmittingRevoke(true);
    try {
      await revokeStore(storeUid);
      setActionSuccessMessage(
        `Le commerce "${revokingStore.name}" a été révoqué avec succès du programme d'animation.`
      );
      setRevokingStore(null);
      await fetchStores();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la révocation du commerce.');
    } finally {
      setIsSubmittingRevoke(false);
    }
  };

  // Confirm Reactivation
  const handleConfirmReactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reactivatingStore) return;
    const storeUid = reactivatingStore.uid;
    if (!storeUid) return;

    if (!reactivateUserId) {
      setReactivatePartnerError(
        'Veuillez sélectionner un commerçant partenaire à qui affecter le commerce réactivé.'
      );
      return;
    }

    const trimmedRib = reactivateRib.trim().toUpperCase();
    if (!trimmedRib) {
      setReactivateRibError('Le RIB ou IBAN est obligatoire pour réactiver le commerce.');
      return;
    }
    if (!isValidRibOrIban(trimmedRib)) {
      setReactivateRibError(
        'Le format ou la clé algorithmique du RIB/IBAN est invalide (RIB français 23 car. ou IBAN valide).'
      );
      return;
    }

    setIsSubmittingReactivate(true);
    setReactivateRibError(null);
    setReactivatePartnerError(null);
    try {
      await reactivateStore(storeUid, trimmedRib, reactivateUserId);
      try {
        await addStoreToPartner(reactivateUserId, storeUid);
      } catch {
        // Backend store-service synchronise déjà avec users-service
      }
      setActionSuccessMessage(
        `Le commerce "${reactivatingStore.name}" a été réactivé avec succès et réaffecté au commerçant partenaire.`
      );
      setReactivatingStore(null);
      setReactivateRib('');
      setReactivateUserId('');
      setReactivateRibError(null);
      setReactivatePartnerError(null);
      await fetchStores();
    } catch (err: unknown) {
      setReactivateRibError(
        err instanceof Error ? err.message : 'Erreur lors de la réactivation du commerce.'
      );
    } finally {
      setIsSubmittingReactivate(false);
    }
  };

  // Open Store Edit Dialog
  const handleOpenEdit = (store: StoreType) => {
    setEditingStore(store);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {actionSuccessMessage && (
        <div className="p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-sm flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMessage(null)}
            className="text-emerald-700 dark:text-emerald-300 hover:opacity-75"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Rechercher par raison sociale, adresse, catégorie..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full"
              aria-label="Effacer la recherche"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Dropdowns Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs bg-muted/60 p-1 rounded-lg border">
            <span className="text-muted-foreground ml-1">Statut :</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-foreground border-none text-xs focus:outline-none pr-2 py-0.5 cursor-pointer font-medium"
              aria-label="Filtrer par statut"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="ACTIVE">Actifs uniquement</option>
              <option value="REVOKED">Révoqués uniquement</option>
            </select>
          </div>

          {/* Category Filter */}
          {availableCategories.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs bg-muted/60 p-1 rounded-lg border">
              <Tag className="size-3.5 text-muted-foreground ml-1" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent text-foreground border-none text-xs focus:outline-none pr-2 py-0.5 cursor-pointer font-medium max-w-[140px] truncate"
                aria-label="Filtrer par catégorie"
              >
                <option value="ALL">Toutes les catégories</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(query || statusFilter !== 'ALL' || categoryFilter !== 'ALL') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-xs h-8 text-muted-foreground hover:text-foreground gap-1"
            >
              <X className="size-3" />
              Réinitialiser
            </Button>
          )}
        </div>
      </div>

      {/* Error Banner with Retry */}
      {error && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchStores()} className="h-8 gap-1.5">
            <RefreshCw className="size-3.5" />
            Réessayer
          </Button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && <AdminStoresSkeleton />}

      {/* Stores Data Table */}
      {!isLoading && !error && filteredStores.length > 0 && (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b border-border/60">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Commerce
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold hidden md:table-cell">
                    Catégorie
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Propriétaire
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Statut
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedStores.map((store) => (
                  <tr
                    key={store.uid}
                    className={`hover:bg-muted/40 transition-colors ${
                      store.status === 'REVOKED' ? 'bg-destructive/5' : ''
                    }`}
                  >
                    {/* Commerce Identity */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`size-9 rounded-lg flex items-center justify-center text-sm font-bold border shrink-0 ${
                            store.status === 'REVOKED'
                              ? 'bg-destructive/10 text-destructive border-destructive/20'
                              : 'bg-primary/10 text-primary border-primary/20'
                          }`}
                        >
                          <Store className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <a
                            href={ROUTES.storeDetail(store.uid)}
                            className="font-semibold text-foreground hover:text-primary hover:underline transition-colors flex items-center gap-1.5 truncate max-w-[220px] group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm"
                            title={`Consulter la vitrine de ${store.name}`}
                          >
                            <span className="truncate">{store.name}</span>
                            <ExternalLink className="size-3 text-muted-foreground opacity-60 group-hover:opacity-100 group-hover:text-primary transition-opacity shrink-0" />
                          </a>
                          <p className="text-xs text-muted-foreground md:hidden truncate max-w-[180px]">
                            {store.category || 'Catégorie non spécifiée'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      {store.category ? (
                        <Badge variant="outline" className="text-xs font-normal">
                          {store.category}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>

                    {/* Propriétaire */}
                    <td className="px-4 py-3">
                      {store.ownerUid ? (
                        (() => {
                          const partner = partnerMap.get(store.ownerUid);
                          return (
                            <button
                              type="button"
                              onClick={() => handleOpenUserDetail(store.ownerUid)}
                              className="text-xs font-medium text-foreground hover:text-primary hover:underline flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded group text-left"
                              title="Cliquer pour afficher la fiche de cet utilisateur"
                            >
                              <User className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                              <span className="truncate max-w-[160px]">
                                {partner ? partner.name : store.ownerUid}
                              </span>
                            </button>
                          );
                        })()
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1">
                        {store.status === 'REVOKED' ? (
                          <Badge
                            variant="destructive"
                            className="text-[10px] uppercase font-semibold"
                          >
                            Révoqué
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] uppercase font-semibold"
                          >
                            Actif
                          </Badge>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {store.status === 'ACTIVE' ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEdit(store)}
                              className="h-8 px-2.5 text-xs gap-1 hover:bg-muted"
                              title="Modifier les informations du commerce"
                            >
                              <Edit className="size-3.5 text-primary" />
                              <span>Modifier</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setRevokingStore(store)}
                              className="h-8 px-2.5 text-xs gap-1 text-destructive hover:bg-destructive/10 border-destructive/30"
                              title="Révoquer ce commerce partenaire"
                            >
                              <AlertTriangle className="size-3.5" />
                              <span>Révoquer</span>
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled
                              className="h-8 px-2.5 text-xs gap-1 opacity-50 cursor-not-allowed"
                              title="Un commerce révoqué ne peut pas être modifié directement. Réactivez-le d'abord."
                            >
                              <Edit className="size-3.5" />
                              <span>Modifier</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setReactivatingStore(store);
                                setReactivateRib('');
                                setReactivateRibError(null);
                                setReactivateUserId(store.ownerUid ?? '');
                                setReactivatePartnerError(null);
                              }}
                              className="h-8 px-2.5 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 border-emerald-500/30"
                              title="Réactiver ce commerce révoqué"
                            >
                              <RotateCcw className="size-3.5" />
                              <span>Réactiver</span>
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
            <div>
              Affichage de{' '}
              <span className="font-medium text-foreground">{paginatedStores.length}</span> sur{' '}
              <span className="font-medium text-foreground">{filteredStores.length}</span> commerce
              {filteredStores.length > 1 ? 's' : ''}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-7 px-2.5 text-xs gap-1"
                >
                  <ChevronLeft className="size-3.5" />
                  Précédent
                </Button>
                <span>
                  Page <strong className="text-foreground">{currentPage}</strong> sur{' '}
                  <strong className="text-foreground">{totalPages}</strong>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-7 px-2.5 text-xs gap-1"
                >
                  Suivant
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredStores.length === 0 && (
        <Empty className="py-12 border rounded-xl bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Store className="size-8 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>Aucun commerce trouvé</EmptyTitle>
            <EmptyDescription>
              {query || statusFilter !== 'ALL' || categoryFilter !== 'ALL'
                ? 'Aucun commerce partenaire ne correspond aux filtres sélectionnés.'
                : 'Aucun commerce partenaire enregistré dans le système.'}
            </EmptyDescription>
          </EmptyHeader>
          {(query || statusFilter !== 'ALL' || categoryFilter !== 'ALL') && (
            <div className="pt-4 flex justify-center">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleClearFilters}
                className="gap-1.5"
              >
                <X className="size-3.5" />
                Effacer les filtres
              </Button>
            </div>
          )}
        </Empty>
      )}

      {/* Revocation Warning Dialog */}
      <Dialog open={!!revokingStore} onOpenChange={(open) => !open && setRevokingStore(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="size-5" />
              Révoquer le commerce partenaire
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <p>
                Vous vous apprêtez à révoquer définitivement l&apos;établissement{' '}
                <strong className="text-foreground">{revokingStore?.name}</strong> du programme
                ShopLoc.
              </p>
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive space-y-1">
                <p className="font-semibold">Conséquences immédiates :</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Disparition immédiate de l&apos;annuaire public et du catalogue.</li>
                  <li>Blocage strict des nouvelles commandes et encaissements en caisse.</li>
                  <li>Anonymisation des coordonnées bancaires (RIB).</li>
                  <li>
                    Conservation intégrale des données d&apos;historique et bilans économiques.
                  </li>
                </ul>
              </div>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRevokingStore(null)}
              disabled={isSubmittingRevoke}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmRevoke}
              disabled={isSubmittingRevoke}
            >
              {isSubmittingRevoke ? 'Révocation en cours...' : 'Confirmer la révocation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reactivation Dialog with new RIB and partner assignment */}
      <Dialog
        open={!!reactivatingStore}
        onOpenChange={(open) => {
          if (!open) {
            setReactivatingStore(null);
            setReactivateUserId('');
            setReactivateRibError(null);
            setReactivatePartnerError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <RotateCcw className="size-5 text-emerald-600" />
              Réactiver le commerce partenaire
            </DialogTitle>
            <DialogDescription>
              Pour réactiver <strong className="text-foreground">{reactivatingStore?.name}</strong>,
              veuillez affecter le commerçant partenaire responsable et saisir des coordonnées
              bancaires à jour (nouveau RIB/IBAN).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmReactivate} className="space-y-4 py-2">
            {reactivateRibError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs">
                {reactivateRibError}
              </div>
            )}
            {reactivatePartnerError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs">
                {reactivatePartnerError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium flex items-center justify-between">
                <span>Commerçant partenaire affecté</span>
                <span className="text-[11px] text-destructive font-normal">* Obligatoire</span>
              </label>
              <PartnerSelect
                value={reactivateUserId}
                onValueChange={(val) => {
                  setReactivateUserId(val);
                  setReactivatePartnerError(null);
                }}
                disabled={isSubmittingReactivate}
              />
              <p className="text-[11px] text-muted-foreground">
                Recherchez et sélectionnez le compte commerçant auquel rattacher ce commerce
                réactivé.
              </p>
            </div>

            <RibInputField
              id="reactivate-rib"
              label="Nouveau RIB ou IBAN conventionnel"
              value={reactivateRib}
              onChange={(val) => {
                setReactivateRib(val);
                setReactivateRibError(null);
              }}
              error={reactivateRibError || undefined}
              disabled={isSubmittingReactivate}
            />

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setReactivatingStore(null);
                  setReactivateUserId('');
                  setReactivateRibError(null);
                  setReactivatePartnerError(null);
                }}
                disabled={isSubmittingReactivate}
              >
                Annuler
              </Button>
              <Button type="submit" size="sm" disabled={isSubmittingReactivate}>
                {isSubmittingReactivate ? 'Réactivation en cours...' : 'Confirmer la réactivation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Store Dialog using unified StoreForm */}
      <Dialog open={!!editingStore} onOpenChange={(open) => !open && setEditingStore(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {editingStore && (
            <StoreForm
              mode="edit"
              initialStore={editingStore}
              isDialog
              onSuccess={(updatedStore) => {
                setActionSuccessMessage(
                  `Le commerce "${updatedStore.name}" a été mis à jour avec succès.`
                );
                setEditingStore(null);
                fetchStores();
              }}
              onCancel={() => setEditingStore(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* User Details Dialog */}
      <Dialog
        open={inspectingUserId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setInspectingUserId(null);
            setInspectingUser(null);
            setUserDetailError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <User className="size-4 text-primary" />
              Fiche utilisateur
            </DialogTitle>
            <DialogDescription>
              Détails du compte et statut dans l&apos;écosystème ShopLoc.
            </DialogDescription>
          </DialogHeader>

          {isLoadingUserDetails && (
            <div className="py-8 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="size-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Chargement des informations...</p>
            </div>
          )}

          {userDetailError && (
            <div className="p-3.5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{userDetailError}</span>
            </div>
          )}

          {!isLoadingUserDetails && !userDetailError && inspectingUser && (
            <div className="space-y-4 py-2">
              {/* Header profile */}
              <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl border">
                <div className="size-11 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm border border-primary/20 shrink-0">
                  {getUserInitials(inspectingUser.firstName, inspectingUser.lastName)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground text-sm truncate">
                      {inspectingUser.firstName} {inspectingUser.lastName}
                    </h3>
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase font-semibold shrink-0"
                    >
                      {inspectingUser.role === 'ADMIN'
                        ? 'Administrateur'
                        : inspectingUser.role === 'MERCHANT'
                          ? 'Commerçant'
                          : 'Citoyen'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{inspectingUser.email}</p>
                </div>
              </div>

              {/* Information list */}
              <div className="divide-y divide-border/60 text-xs rounded-xl border bg-card">
                <div className="px-3.5 py-2.5 flex items-center justify-between">
                  <span className="text-muted-foreground">Sécurité & Connexion</span>
                  {inspectingUser.isLocked ? (
                    <Badge variant="destructive" className="text-[10px] font-semibold">
                      Compte verrouillé
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-semibold"
                    >
                      Actif
                    </Badge>
                  )}
                </div>

                {inspectingUser.clientCode && (
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <span className="text-muted-foreground">Code client citoyen</span>
                    <span className="font-mono font-semibold text-foreground bg-muted px-1.5 py-0.5 rounded">
                      {inspectingUser.clientCode}
                    </span>
                  </div>
                )}

                {inspectingUser.birthDate && (
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <span className="text-muted-foreground">Date de naissance</span>
                    <span className="text-foreground">
                      {new Date(inspectingUser.birthDate).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                )}

                {inspectingUser.pickupLocation && (
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <span className="text-muted-foreground">Point de retrait carte</span>
                    <span className="text-foreground truncate max-w-[200px]">
                      {inspectingUser.pickupLocation}
                    </span>
                  </div>
                )}

                {inspectingUser.licensePlates && inspectingUser.licensePlates.length > 0 && (
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <span className="text-muted-foreground">Immatriculation(s)</span>
                    <div className="flex flex-wrap gap-1">
                      {inspectingUser.licensePlates.map((plate) => (
                        <span
                          key={plate}
                          className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded"
                        >
                          {plate}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {inspectingUser.createdAt && (
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <span className="text-muted-foreground">Date d&apos;inscription</span>
                    <span className="text-foreground">
                      {new Date(inspectingUser.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setInspectingUserId(null);
                setInspectingUser(null);
                setUserDetailError(null);
              }}
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
