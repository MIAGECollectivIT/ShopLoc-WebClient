import * as React from 'react';
import type { AdminPartnerDetail } from '@/types/partner';
import type { Store } from '@/types/store';
import { getStoreById, getStores, addStoreToPartner } from '@/lib/api';
import { ROUTES } from '@/config/routes';
import { resolveStoreImageUrl } from '@/lib/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Building,
  Mail,
  User,
  Calendar,
  Store as StoreIcon,
  MapPin,
  Clock,
  ExternalLink,
  PlusCircle,
  CreditCard,
  Fingerprint,
  Link2,
  Loader2,
  AlertCircle,
  Check,
  Search,
} from 'lucide-react';

interface AdminPartnerDetailViewProps {
  partner: AdminPartnerDetail;
  initialStores?: Store[];
}

export function AdminPartnerDetailView({
  partner,
  initialStores = [],
}: AdminPartnerDetailViewProps) {
  const [stores, setStores] = React.useState<Store[]>(initialStores);
  const [loadingStores, setLoadingStores] = React.useState<boolean>(
    initialStores.length === 0 && (partner.storeIds?.length || 0) > 0
  );

  // Modal dialog state for linking an existing store
  const [isAddStoreOpen, setIsAddStoreOpen] = React.useState<boolean>(false);
  const [availableStores, setAvailableStores] = React.useState<Store[]>([]);
  const [storeSearchQuery, setStoreSearchQuery] = React.useState<string>('');
  const [selectedStoreId, setSelectedStoreId] = React.useState<string>('');
  const [isLoadingAvailableStores, setIsLoadingAvailableStores] = React.useState<boolean>(false);
  const [isSubmittingStore, setIsSubmittingStore] = React.useState<boolean>(false);
  const [addStoreError, setAddStoreError] = React.useState<string | null>(null);

  // Load store details for affiliated store IDs if not provided in SSR
  React.useEffect(() => {
    let isCancelled = false;

    async function loadStores() {
      if (!partner.storeIds || partner.storeIds.length === 0) {
        setStores([]);
        setLoadingStores(false);
        return;
      }

      if (initialStores.length >= partner.storeIds.length) {
        setLoadingStores(false);
        return;
      }

      setLoadingStores(true);
      try {
        const storePromises = partner.storeIds.map(async (storeId) => {
          try {
            return await getStoreById(storeId);
          } catch {
            return {
              id: storeId,
              name: `Commerce #${storeId}`,
              address: 'Informations non disponibles',
            } as Store;
          }
        });

        const results = await Promise.all(storePromises);
        if (!isCancelled) {
          setStores(results);
        }
      } finally {
        if (!isCancelled) {
          setLoadingStores(false);
        }
      }
    }

    loadStores();

    return () => {
      isCancelled = true;
    };
  }, [partner.storeIds, initialStores]);

  // Open dialog and fetch municipal stores not yet affiliated
  const handleOpenAddStoreDialog = async () => {
    setIsAddStoreOpen(true);
    setAddStoreError(null);
    setStoreSearchQuery('');
    setSelectedStoreId('');
    setIsLoadingAvailableStores(true);

    try {
      const allStores = await getStores();
      // Filter out stores already affiliated
      const affiliatedIds = new Set(stores.map((s) => s.id));
      const unlinked = allStores.filter((s) => s.id !== undefined && !affiliatedIds.has(s.id));
      setAvailableStores(unlinked);
      if (unlinked.length > 0 && unlinked[0].id) {
        setSelectedStoreId(String(unlinked[0].id));
      }
    } catch (err: unknown) {
      setAddStoreError(
        err instanceof Error
          ? err.message
          : 'Impossible de charger la liste des commerces municipaux.'
      );
    } finally {
      setIsLoadingAvailableStores(false);
    }
  };

  // Submit linking of selected store
  const handleConfirmAddStore = async () => {
    if (!selectedStoreId) return;

    setIsSubmittingStore(true);
    setAddStoreError(null);

    const storeIdNum = Number(selectedStoreId);
    try {
      await addStoreToPartner(partner.id, storeIdNum);

      // Add to local state
      const targetStore = availableStores.find((s) => s.id === storeIdNum);
      if (targetStore) {
        setStores((prev) => [...prev, targetStore]);
      } else {
        const fetched = await getStoreById(storeIdNum).catch(() => null);
        if (fetched) setStores((prev) => [...prev, fetched]);
      }

      if (!partner.storeIds) partner.storeIds = [];
      if (!partner.storeIds.includes(storeIdNum)) {
        partner.storeIds.push(storeIdNum);
      }

      setIsAddStoreOpen(false);
    } catch (err: unknown) {
      setAddStoreError(
        err instanceof Error ? err.message : "Erreur lors du rattachement de l'établissement."
      );
    } finally {
      setIsSubmittingStore(false);
    }
  };

  const filteredAvailableStores = React.useMemo(() => {
    if (!storeSearchQuery.trim()) return availableStores;
    const q = storeSearchQuery.toLowerCase();
    return availableStores.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q) ||
        (s.category && s.category.toLowerCase().includes(q))
    );
  }, [availableStores, storeSearchQuery]);

  const selectedStore = React.useMemo(() => {
    return availableStores.find((s) => String(s.id) === selectedStoreId);
  }, [availableStores, selectedStoreId]);

  const fullName =
    partner.firstName && partner.lastName
      ? `${partner.firstName} ${partner.lastName}`
      : partner.firstName || partner.lastName || partner.companyName || partner.email;

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Non renseigné';
    try {
      return new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'medium',
      }).format(new Date(isoString));
    } catch {
      return isoString;
    }
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return 'Non renseigné';
    try {
      return new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(isoString));
    } catch {
      return isoString;
    }
  };

  const initials = React.useMemo(() => {
    if (partner.firstName && partner.lastName) {
      return (partner.firstName[0] + partner.lastName[0]).toUpperCase();
    }
    return (fullName || 'P').slice(0, 2).toUpperCase();
  }, [partner.firstName, partner.lastName, fullName]);

  return (
    <div className="space-y-6">
      {/* Back button and quick actions header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          render={<a href={ROUTES.adminPartners.path} />}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          <span>Retour aux comptes partenaires</span>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenAddStoreDialog}
            className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10"
          >
            <Link2 className="size-3.5" />
            <span>Rattacher un commerce existant</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            render={<a href={ROUTES.createStore.path} />}
            className="gap-1.5 text-xs"
          >
            <PlusCircle className="size-3.5 text-primary" />
            <span>Créer un établissement</span>
          </Button>
        </div>
      </div>

      {/* Main Partner Header Card */}
      <Card className="border-border bg-card">
        <CardHeader className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="size-14 sm:size-16 rounded-full bg-primary/10 text-primary font-bold text-xl sm:text-2xl flex items-center justify-center border border-primary/20 shrink-0">
                {initials}
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-xl sm:text-2xl font-bold text-foreground">
                    {fullName}
                  </CardTitle>
                  <Badge variant="default" className="text-xs uppercase font-medium">
                    {partner.role === 'MERCHANT' ? 'Commerçant Partenaire' : partner.role}
                  </Badge>
                </div>
                {partner.companyName && (
                  <CardDescription className="flex items-center gap-1.5 text-sm font-medium text-foreground/80">
                    <Building className="size-4 shrink-0 text-muted-foreground" />
                    <span>{partner.companyName}</span>
                  </CardDescription>
                )}
              </div>
            </div>

            <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-1.5 text-xs text-muted-foreground font-mono">
              <Badge variant="outline" className="font-mono text-xs">
                ID #{partner.id}
              </Badge>
              {partner.publicId && (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Fingerprint className="size-3" />
                  <span>UUID: {partner.publicId}</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 2-Column Grid: Identity details & Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal & Commercial Details Card */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <User className="size-4 text-primary" />
              <span>Informations d'identification</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-muted-foreground block">Prénom</span>
                <span className="font-medium text-foreground">
                  {partner.firstName || 'Non renseigné'}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Nom</span>
                <span className="font-medium text-foreground">
                  {partner.lastName || 'Non renseigné'}
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs text-muted-foreground block">Adresse email</span>
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Mail className="size-4 text-muted-foreground shrink-0" />
                <span className="truncate">{partner.email}</span>
              </div>
            </div>

            <div>
              <span className="text-xs text-muted-foreground block">Raison sociale / Enseigne</span>
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Building className="size-4 text-muted-foreground shrink-0" />
                <span>{partner.companyName || 'Aucune enseigne renseignée'}</span>
              </div>
            </div>

            <div>
              <span className="text-xs text-muted-foreground block">Date de naissance</span>
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Calendar className="size-4 text-muted-foreground shrink-0" />
                <span>{formatDate(partner.birthDate)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Life-cycle & Metadata Card */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="size-4 text-primary" />
              <span>Cycle de vie du compte</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 text-sm">
            <div>
              <span className="text-xs text-muted-foreground block">Date de création</span>
              <span className="font-medium text-foreground">
                {formatDateTime(partner.createdAt)}
              </span>
            </div>

            <div>
              <span className="text-xs text-muted-foreground block">Dernière mise à jour</span>
              <span className="font-medium text-foreground">
                {formatDateTime(partner.updatedAt)}
              </span>
            </div>

            <div>
              <span className="text-xs text-muted-foreground block">Nombre d'établissements</span>
              <div className="flex items-center gap-2 font-medium text-foreground mt-1">
                <Badge variant="secondary" className="font-semibold text-xs">
                  {stores.length} commerce
                  {stores.length > 1 ? 's' : ''} rattaché
                  {stores.length > 1 ? 's' : ''}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Affiliated Stores Section */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <StoreIcon className="size-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">
              Commerces affiliés ({stores.length})
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenAddStoreDialog}
              className="text-xs gap-1.5"
            >
              <Link2 className="size-3.5" />
              <span>Rattacher un commerce existant</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              render={<a href={ROUTES.createStore.path} />}
              className="text-xs gap-1.5"
            >
              <PlusCircle className="size-3.5" />
              <span>Nouveau commerce</span>
            </Button>
          </div>
        </div>

        {/* Loading Stores Skeleton */}
        {loadingStores && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2].map((i) => (
              <Card key={i} className="p-4 space-y-3">
                <Skeleton className="h-32 w-full rounded" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </Card>
            ))}
          </div>
        )}

        {/* Stores List */}
        {!loadingStores && stores.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stores.map((store) => {
              const imageUrl = resolveStoreImageUrl(store.url);
              return (
                <Card
                  key={store.id}
                  className="overflow-hidden flex flex-col justify-between hover:border-primary/50 transition-colors"
                >
                  <div>
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={store.name}
                        className="h-36 w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-36 bg-muted flex flex-col items-center justify-center text-muted-foreground">
                        <StoreIcon className="size-8 opacity-60" />
                        <span className="text-xs mt-1">Pas d'image d'établissement</span>
                      </div>
                    )}

                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base font-semibold leading-tight">
                          {store.name}
                        </CardTitle>
                        {store.id && (
                          <Badge variant="outline" className="font-mono text-[11px] shrink-0">
                            #{store.id}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="flex items-center gap-1.5 text-xs mt-1">
                        <MapPin className="size-3.5 shrink-0 text-primary" />
                        <span className="truncate">{store.address}</span>
                      </CardDescription>
                      {store.category && (
                        <div className="mt-2">
                          <Badge variant="secondary" className="text-[10px]">
                            {store.category}
                          </Badge>
                        </div>
                      )}
                    </CardHeader>
                  </div>

                  <CardFooter className="p-4 pt-2 border-t bg-muted/10 flex items-center justify-between">
                    {store.rib ? (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono truncate max-w-[150px]">
                        <CreditCard className="size-3 shrink-0" />
                        <span className="truncate">{store.rib}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">RIB non renseigné</span>
                    )}
                    {store.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        render={<a href={ROUTES.storeDetail(store.id)} />}
                        className="gap-1 text-xs"
                      >
                        <span>Consulter</span>
                        <ExternalLink className="size-3" />
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {/* Empty Affiliated Stores State */}
        {!loadingStores && stores.length === 0 && (
          <div className="border border-dashed rounded-xl p-8 text-center bg-card/50 space-y-3">
            <StoreIcon className="size-10 text-muted-foreground/60 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                Aucun commerce affilié pour ce partenaire
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Ce compte partenaire n'est actuellement associé à aucun établissement commercial de
                la municipalité.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenAddStoreDialog}
                className="gap-1.5 text-xs"
              >
                <Link2 className="size-3.5" />
                <span>Rattacher un commerce existant</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                render={<a href={ROUTES.createStore.path} />}
                className="gap-1.5 text-xs"
              >
                <PlusCircle className="size-3.5" />
                <span>Créer un nouvel établissement</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Dialog for linking an existing store with rich card preview */}
      <Dialog open={isAddStoreOpen} onOpenChange={setIsAddStoreOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Rattacher un commerce existant</DialogTitle>
            <DialogDescription>
              Sélectionnez un établissement commercial de la municipalité à associer au compte de{' '}
              <strong>{fullName}</strong>.
            </DialogDescription>
          </DialogHeader>

          {addStoreError && (
            <div className="p-3 text-xs rounded-md bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{addStoreError}</span>
            </div>
          )}

          {isLoadingAvailableStores ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="size-6 animate-spin text-primary" />
              <span className="text-xs">Chargement des commerces municipaux...</span>
            </div>
          ) : availableStores.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Tous les commerces enregistrés sont déjà affiliés à ce partenaire.
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {availableStores.length > 3 && (
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Filtrer par nom ou adresse..."
                    value={storeSearchQuery}
                    onChange={(e) => setStoreSearchQuery(e.target.value)}
                    className="pl-8 text-xs h-8"
                  />
                </div>
              )}

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {filteredAvailableStores.map((store) => {
                  const isSelected = selectedStoreId === String(store.id);
                  return (
                    <div
                      key={store.id}
                      onClick={() => setSelectedStoreId(String(store.id))}
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-3 text-left ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border hover:border-muted-foreground/40 bg-card hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-2 rounded-md shrink-0 ${
                            isSelected
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <StoreIcon className="size-4" />
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-foreground truncate">
                              {store.name}
                            </span>
                            {store.category && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                {store.category}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="size-3 shrink-0 text-primary" />
                            <span className="truncate">{store.address}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          #{store.id}
                        </Badge>
                        <div
                          className={`size-4 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-muted-foreground/30'
                          }`}
                        >
                          {isSelected && <Check className="size-2.5 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedStore && (
                <div className="p-2.5 rounded-md bg-muted/40 border text-xs text-muted-foreground flex items-center justify-between">
                  <span>Commerce sélectionné :</span>
                  <span className="font-medium text-foreground">
                    {selectedStore.name} (#{selectedStore.id})
                  </span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddStoreOpen(false)}
              disabled={isSubmittingStore}
            >
              Annuler
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleConfirmAddStore}
              disabled={isSubmittingStore || !selectedStoreId || availableStores.length === 0}
              className="gap-1.5"
            >
              {isSubmittingStore ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Rattachement en cours...</span>
                </>
              ) : (
                <>
                  <Link2 className="size-3.5" />
                  <span>
                    {selectedStore
                      ? `Rattacher ${selectedStore.name}`
                      : 'Confirmer le rattachement'}
                  </span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
