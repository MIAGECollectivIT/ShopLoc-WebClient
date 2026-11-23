import * as React from 'react';
import type { AdminPartnerDetail, AdminPartnerSummary } from '@/types/partner';
import type { Store } from '@/types/store';
import {
  getStoreById,
  getStores,
  addStoreToPartner,
  updateAdminPartner,
  getAdminPartners,
  removeStoreFromPartner,
  revokeStore,
  reactivateStore,
  patchStore,
} from '@/lib/api';
import { ROUTES } from '@/config/routes';
import { isValidRibOrIban } from '@/lib/validation/store';
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
  Link2,
  Loader2,
  AlertCircle,
  Check,
  Search,
  Pencil,
  Unlink,
  Users,
  AlertTriangle,
  Ban,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react';

interface AdminPartnerDetailViewProps {
  partner: AdminPartnerDetail;
  initialStores?: Store[];
}

export function AdminPartnerDetailView({
  partner,
  initialStores = [],
}: AdminPartnerDetailViewProps) {
  const [currentPartner, setCurrentPartner] = React.useState<AdminPartnerDetail>(partner);
  const [stores, setStores] = React.useState<Store[]>(() => initialStores);
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

  // Modal dialog state for editing partner profile
  const [isEditPartnerOpen, setIsEditPartnerOpen] = React.useState<boolean>(false);
  const [editFirstName, setEditFirstName] = React.useState<string>(partner.firstName || '');
  const [editLastName, setEditLastName] = React.useState<string>(partner.lastName || '');
  const [editBirthDate, setEditBirthDate] = React.useState<string>(partner.birthDate || '');
  const [isSubmittingEdit, setIsSubmittingEdit] = React.useState<boolean>(false);
  const [editError, setEditError] = React.useState<string | null>(null);

  // Modal dialog state for detaching/reassigning store
  const [isDesaffectOpen, setIsDesaffectOpen] = React.useState<boolean>(false);
  const [storeToDesaffect, setStoreToDesaffect] = React.useState<Store | null>(null);
  const [reassignPartners, setReassignPartners] = React.useState<AdminPartnerSummary[]>([]);
  const [reassignSearchQuery, setReassignSearchQuery] = React.useState<string>('');
  const [selectedTargetPartnerId, setSelectedTargetPartnerId] = React.useState<string>('');
  const [isLoadingReassignPartners, setIsLoadingReassignPartners] = React.useState<boolean>(false);
  const [isSubmittingDesaffect, setIsSubmittingDesaffect] = React.useState<boolean>(false);
  const [desaffectError, setDesaffectError] = React.useState<string | null>(null);

  // Modal dialog state for revoking partner store
  const [isRevokeStoreOpen, setIsRevokeStoreOpen] = React.useState<boolean>(false);
  const [storeToRevoke, setStoreToRevoke] = React.useState<Store | null>(null);
  const [isSubmittingRevoke, setIsSubmittingRevoke] = React.useState<boolean>(false);
  const [revokeError, setRevokeError] = React.useState<string | null>(null);
  const [revokeSuccessMessage, setRevokeSuccessMessage] = React.useState<string | null>(null);

  // Modal dialog state for reactivating partner store
  const [isReactivateStoreOpen, setIsReactivateStoreOpen] = React.useState<boolean>(false);
  const [storeToReactivate, setStoreToReactivate] = React.useState<Store | null>(null);
  const [reactivateRib, setReactivateRib] = React.useState<string>('');
  const [isSubmittingReactivate, setIsSubmittingReactivate] = React.useState<boolean>(false);
  const [reactivateError, setReactivateError] = React.useState<string | null>(null);
  const [reactivateSuccessMessage, setReactivateSuccessMessage] = React.useState<string | null>(
    null
  );

  // Load store details for affiliated store IDs if not provided in SSR
  React.useEffect(() => {
    let isCancelled = false;

    async function loadStores() {
      if (!currentPartner.storeIds || currentPartner.storeIds.length === 0) {
        setStores([]);
        setLoadingStores(false);
        return;
      }

      if (initialStores.length >= currentPartner.storeIds.length) {
        setLoadingStores(false);
        return;
      }

      setLoadingStores(true);
      try {
        const storePromises = currentPartner.storeIds.map(async (storeId) => {
          try {
            return await getStoreById(storeId);
          } catch {
            return {
              id: storeId,
              name: 'Commerce affilié',
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
  }, [currentPartner.storeIds, initialStores]);

  // Open dialog and fetch municipal stores not yet affiliated
  const handleOpenAddStoreDialog = async () => {
    setIsAddStoreOpen(true);
    setAddStoreError(null);
    setStoreSearchQuery('');
    setSelectedStoreId('');
    setIsLoadingAvailableStores(true);

    try {
      const allStores = await getStores(true);
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
      await addStoreToPartner(currentPartner.publicId || currentPartner.id, storeIdNum);

      // Add to local state
      const targetStore = availableStores.find((s) => s.id === storeIdNum);
      if (targetStore) {
        setStores((prev) => [...prev, targetStore]);
      } else {
        const fetched = await getStoreById(storeIdNum).catch(() => null);
        if (fetched) setStores((prev) => [...prev, fetched]);
      }

      setCurrentPartner((prev) => {
        const existingIds = prev.storeIds ? [...prev.storeIds] : [];
        if (!existingIds.includes(storeIdNum)) {
          existingIds.push(storeIdNum);
        }
        return { ...prev, storeIds: existingIds };
      });

      setIsAddStoreOpen(false);
    } catch (err: unknown) {
      setAddStoreError(
        err instanceof Error ? err.message : "Erreur lors du rattachement de l'établissement."
      );
    } finally {
      setIsSubmittingStore(false);
    }
  };

  // Open dialog to edit partner coordinates
  const handleOpenEditPartner = () => {
    setEditFirstName(currentPartner.firstName || '');
    setEditLastName(currentPartner.lastName || '');
    setEditBirthDate(currentPartner.birthDate || '');
    setEditError(null);
    setIsEditPartnerOpen(true);
  };

  // Submit partner update
  const handleConfirmEditPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFirstName.trim() || !editLastName.trim() || !editBirthDate) {
      setEditError('Tous les champs requis doivent être renseignés.');
      return;
    }

    setIsSubmittingEdit(true);
    setEditError(null);
    try {
      const updated = await updateAdminPartner(currentPartner.publicId || currentPartner.id, {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        birthDate: editBirthDate,
      });
      setCurrentPartner((prev) => ({
        ...prev,
        firstName: updated.firstName,
        lastName: updated.lastName,
        birthDate: updated.birthDate,
        updatedAt: updated.updatedAt || new Date().toISOString(),
      }));
      setIsEditPartnerOpen(false);
    } catch (err: unknown) {
      setEditError(
        err instanceof Error ? err.message : 'Impossible de mettre à jour le compte partenaire.'
      );
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Open dialog to detach/reassign an affiliated store
  const handleOpenDesaffectStore = async (store: Store) => {
    setStoreToDesaffect(store);
    setIsDesaffectOpen(true);
    setDesaffectError(null);
    setReassignSearchQuery('');
    setSelectedTargetPartnerId('');
    setIsLoadingReassignPartners(true);
    try {
      const allPartners = await getAdminPartners('', 100);
      // Exclude current partner
      const targets = allPartners.filter(
        (p) => String(p.id) !== String(currentPartner.id) && p.publicId !== currentPartner.publicId
      );
      setReassignPartners(targets);
      if (targets.length > 0) {
        setSelectedTargetPartnerId(targets[0].publicId || String(targets[0].id));
      }
    } catch (err: unknown) {
      console.warn('Impossible de charger la liste des partenaires pour réassignation:', err);
    } finally {
      setIsLoadingReassignPartners(false);
    }
  };

  // Confirm unlinking or reassignment of store (mandatory reassignment)
  const handleConfirmDesaffectStore = async () => {
    if (!storeToDesaffect || !storeToDesaffect.id) return;

    if (!selectedTargetPartnerId) {
      setDesaffectError('Veuillez sélectionner un commerçant partenaire repreneur.');
      return;
    }

    const targetPartner = reassignPartners.find(
      (p) => (p.publicId || String(p.id)) === selectedTargetPartnerId
    );
    const targetUserId = targetPartner?.id ? Number(targetPartner.id) : undefined;
    if (!targetUserId) {
      setDesaffectError('Impossible de déterminer le compte partenaire cible.');
      return;
    }

    setIsSubmittingDesaffect(true);
    setDesaffectError(null);

    const storeIdNum = storeToDesaffect.id;
    try {
      // 1. Mettre à jour la propriété dans Store-Service
      await patchStore(storeIdNum, { userId: targetUserId });

      // 2. Synchroniser le rattachement dans Users-Service
      await addStoreToPartner(selectedTargetPartnerId, storeIdNum);
      await removeStoreFromPartner(currentPartner.publicId || currentPartner.id, storeIdNum).catch(
        () => {}
      );

      // Remove from current partner's store list in local state
      setStores((prev) => prev.filter((s) => s.id !== storeIdNum));
      setCurrentPartner((prev) => ({
        ...prev,
        storeIds: (prev.storeIds || []).filter((id) => id !== storeIdNum),
      }));

      setIsDesaffectOpen(false);
      setStoreToDesaffect(null);
    } catch (err: unknown) {
      setDesaffectError(
        err instanceof Error ? err.message : "Erreur lors de la réaffectation de l'établissement."
      );
    } finally {
      setIsSubmittingDesaffect(false);
    }
  };

  const handleOpenRevokeStore = (store: Store) => {
    setStoreToRevoke(store);
    setRevokeError(null);
    setRevokeSuccessMessage(null);
    setIsRevokeStoreOpen(true);
  };

  const handleConfirmRevokeStore = async () => {
    if (!storeToRevoke || (!storeToRevoke.id && !storeToRevoke.uid)) return;
    setIsSubmittingRevoke(true);
    setRevokeError(null);

    const storeIdentifier = storeToRevoke.uid || storeToRevoke.id!;
    try {
      await revokeStore(storeIdentifier);
      setStores((prev) =>
        prev.map((s) =>
          s.id === storeToRevoke.id || (s.uid && s.uid === storeToRevoke.uid)
            ? { ...s, status: 'REVOKED' }
            : s
        )
      );
      setRevokeSuccessMessage(`Le commerce "${storeToRevoke.name}" a été révoqué avec succès.`);
      setTimeout(() => {
        setIsRevokeStoreOpen(false);
        setStoreToRevoke(null);
      }, 1500);
    } catch (err: unknown) {
      setRevokeError(
        err instanceof Error ? err.message : 'Erreur lors de la révocation du commerce partenaire.'
      );
    } finally {
      setIsSubmittingRevoke(false);
    }
  };

  const handleOpenReactivateStore = (store: Store) => {
    setStoreToReactivate(store);
    setReactivateRib('');
    setReactivateError(null);
    setReactivateSuccessMessage(null);
    setIsReactivateStoreOpen(true);
  };

  const handleConfirmReactivateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeToReactivate || (!storeToReactivate.id && !storeToReactivate.uid)) return;
    const trimmedRib = reactivateRib.trim().toUpperCase();
    if (!trimmedRib) {
      setReactivateError('Le nouveau RIB / IBAN est obligatoire pour réactiver le commerce.');
      return;
    }
    if (!isValidRibOrIban(trimmedRib)) {
      setReactivateError(
        'Le format ou la clé algorithmique du RIB/IBAN est invalide (RIB français 23 car. ou IBAN valide).'
      );
      return;
    }

    setIsSubmittingReactivate(true);
    setReactivateError(null);

    const storeIdentifier = storeToReactivate.uid || storeToReactivate.id!;
    const partnerIdNum = typeof currentPartner.id === 'number' ? currentPartner.id : undefined;
    try {
      const reactivated = await reactivateStore(storeIdentifier, trimmedRib, partnerIdNum);
      if (storeToReactivate.id && (currentPartner.publicId || currentPartner.id)) {
        await addStoreToPartner(
          currentPartner.publicId || currentPartner.id,
          storeToReactivate.id
        ).catch(() => {});
      }
      setStores((prev) =>
        prev.map((s) =>
          s.id === storeToReactivate.id || (s.uid && s.uid === storeToReactivate.uid)
            ? {
                ...s,
                status: 'ACTIVE',
                rib: reactivated.rib || trimmedRib,
                url: reactivated.url ?? s.url,
                revokedAt: undefined,
                revokedBy: undefined,
              }
            : s
        )
      );
      setCurrentPartner((prev) => ({
        ...prev,
        storeIds:
          storeToReactivate.id && !prev.storeIds?.includes(storeToReactivate.id)
            ? [...(prev.storeIds || []), storeToReactivate.id]
            : prev.storeIds,
      }));
      setReactivateSuccessMessage(
        `Le commerce "${storeToReactivate.name}" a été réactivé avec succès dans le programme.`
      );
      setTimeout(() => {
        setIsReactivateStoreOpen(false);
        setStoreToReactivate(null);
      }, 1500);
    } catch (err: unknown) {
      setReactivateError(
        err instanceof Error
          ? err.message
          : 'Erreur lors de la réactivation du commerce partenaire.'
      );
    } finally {
      setIsSubmittingReactivate(false);
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

  const filteredReassignPartners = React.useMemo(() => {
    if (!reassignSearchQuery.trim()) return reassignPartners;
    const q = reassignSearchQuery.toLowerCase();
    return reassignPartners.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.companyName && p.companyName.toLowerCase().includes(q))
    );
  }, [reassignPartners, reassignSearchQuery]);

  const selectedTargetPartner = React.useMemo(() => {
    return reassignPartners.find((p) => (p.publicId || String(p.id)) === selectedTargetPartnerId);
  }, [reassignPartners, selectedTargetPartnerId]);

  const fullName =
    currentPartner.firstName && currentPartner.lastName
      ? `${currentPartner.firstName} ${currentPartner.lastName}`
      : currentPartner.firstName ||
        currentPartner.lastName ||
        currentPartner.companyName ||
        currentPartner.email;

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
    if (currentPartner.firstName && currentPartner.lastName) {
      return (currentPartner.firstName[0] + currentPartner.lastName[0]).toUpperCase();
    }
    return (fullName || 'P').slice(0, 2).toUpperCase();
  }, [currentPartner.firstName, currentPartner.lastName, fullName]);

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
            onClick={handleOpenEditPartner}
            className="gap-1.5 text-xs border-muted-foreground/30 hover:bg-muted/50"
          >
            <Pencil className="size-3.5" />
            <span>Modifier le partenaire</span>
          </Button>

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
                    {currentPartner.role === 'MERCHANT'
                      ? 'Commerçant Partenaire'
                      : currentPartner.role}
                  </Badge>
                </div>
                {currentPartner.companyName && (
                  <CardDescription className="flex items-center gap-1.5 text-sm font-medium text-foreground/80">
                    <Building className="size-4 shrink-0 text-muted-foreground" />
                    <span>{currentPartner.companyName}</span>
                  </CardDescription>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 2-Column Grid: Identity details & Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal & Commercial Details Card */}
        <Card>
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <User className="size-4 text-primary" />
              <span>Informations d'identification</span>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenEditPartner}
              className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
            >
              <Pencil className="size-3" />
              <span>Modifier</span>
            </Button>
          </CardHeader>
          <CardContent className="p-6 space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-muted-foreground block">Prénom</span>
                <span className="font-medium text-foreground">
                  {currentPartner.firstName || 'Non renseigné'}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Nom</span>
                <span className="font-medium text-foreground">
                  {currentPartner.lastName || 'Non renseigné'}
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs text-muted-foreground block">Adresse email</span>
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Mail className="size-4 text-muted-foreground shrink-0" />
                <span className="truncate">{currentPartner.email}</span>
              </div>
            </div>

            <div>
              <span className="text-xs text-muted-foreground block">Raison sociale / Enseigne</span>
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Building className="size-4 text-muted-foreground shrink-0" />
                <span>{currentPartner.companyName || 'Aucune enseigne renseignée'}</span>
              </div>
            </div>

            <div>
              <span className="text-xs text-muted-foreground block">Date de naissance</span>
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Calendar className="size-4 text-muted-foreground shrink-0" />
                <span>{formatDate(currentPartner.birthDate)}</span>
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
                {formatDateTime(currentPartner.createdAt)}
              </span>
            </div>

            <div>
              <span className="text-xs text-muted-foreground block">Dernière mise à jour</span>
              <span className="font-medium text-foreground">
                {formatDateTime(currentPartner.updatedAt)}
              </span>
            </div>

            <div>
              <span className="text-xs text-muted-foreground block">Établissements affiliés</span>
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
              const imageUrl = resolveStoreImageUrl(store.url, store.uid || store.id);
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
                        <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                          {store.status === 'REVOKED' ? (
                            <Badge
                              variant="destructive"
                              className="text-[10px] shrink-0 font-semibold gap-1"
                            >
                              <Ban className="size-3" />
                              <span>Révoqué</span>
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] shrink-0 font-semibold text-emerald-700 bg-emerald-50 border-emerald-300"
                            >
                              Actif
                            </Badge>
                          )}
                          {store.category && (
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                              {store.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CardDescription className="flex items-center gap-1.5 text-xs mt-1">
                        <MapPin className="size-3.5 shrink-0 text-primary" />
                        <span className="truncate">{store.address}</span>
                      </CardDescription>

                      {store.rib && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono mt-1.5">
                          <CreditCard className="size-3 shrink-0 text-muted-foreground/70" />
                          <span className="truncate">{store.rib}</span>
                        </div>
                      )}
                    </CardHeader>
                  </div>

                  <CardFooter className="p-3 pt-2.5 border-t bg-muted/10 flex items-center justify-center gap-2 flex-wrap">
                    {store.status !== 'REVOKED' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenRevokeStore(store)}
                        className="gap-1 text-xs h-7 px-2.5 text-rose-700 border-rose-300 hover:bg-rose-50 hover:text-rose-800 dark:text-rose-400 dark:border-rose-900/50"
                        title="Révoquer ce commerce partenaire"
                      >
                        <ShieldAlert className="size-3" />
                        <span>Révoquer</span>
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenReactivateStore(store)}
                        className="gap-1 text-xs h-7 px-2.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-400 dark:border-emerald-900/50"
                        title="Réactiver ce commerce partenaire avec un nouveau RIB"
                      >
                        <RotateCcw className="size-3" />
                        <span>Réactiver</span>
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDesaffectStore(store)}
                      className="gap-1 text-xs h-7 px-2.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                      title="Désaffecter et réaffecter obligatoirement ce commerce à un autre commerçant"
                    >
                      <Unlink className="size-3" />
                      <span>Désaffecter</span>
                    </Button>

                    {(store.uid || store.id) && (
                      <Button
                        variant="outline"
                        size="sm"
                        render={<a href={ROUTES.storeDetail(store.uid || store.id!)} />}
                        className="gap-1 text-xs h-7 px-2.5"
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

      {/* Dialog for editing partner details */}
      <Dialog open={isEditPartnerOpen} onOpenChange={setIsEditPartnerOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleConfirmEditPartner}>
            <DialogHeader>
              <DialogTitle>Modifier le profil partenaire</DialogTitle>
              <DialogDescription>
                Mettez à jour les coordonnées administratives du commerçant partenaire.
              </DialogDescription>
            </DialogHeader>

            {editError && (
              <div className="mt-3 p-3 text-xs rounded-md bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <label htmlFor="edit-firstname" className="text-xs font-medium text-foreground">
                  Prénom <span className="text-destructive">*</span>
                </label>
                <Input
                  id="edit-firstname"
                  type="text"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  placeholder="Jean"
                  required
                  maxLength={100}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-lastname" className="text-xs font-medium text-foreground">
                  Nom <span className="text-destructive">*</span>
                </label>
                <Input
                  id="edit-lastname"
                  type="text"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  placeholder="Dupont"
                  required
                  maxLength={100}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-birthdate" className="text-xs font-medium text-foreground">
                  Date de naissance <span className="text-destructive">*</span>
                </label>
                <Input
                  id="edit-birthdate"
                  type="date"
                  value={editBirthDate}
                  onChange={(e) => setEditBirthDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditPartnerOpen(false)}
                disabled={isSubmittingEdit}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={isSubmittingEdit}
                className="gap-1.5"
              >
                {isSubmittingEdit ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <>
                    <Check className="size-3.5" />
                    <span>Enregistrer</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog for linking an existing store */}
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
                            {store.status === 'REVOKED' ? (
                              <Badge
                                variant="destructive"
                                className="text-[10px] px-1.5 py-0 h-4 bg-destructive/15 text-destructive border-destructive/30"
                              >
                                Révoqué
                              </Badge>
                            ) : store.category ? (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                {store.category}
                              </Badge>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="size-3 shrink-0 text-primary" />
                            <span className="truncate">{store.address}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
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
                  <span className="font-medium text-foreground">{selectedStore.name}</span>
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

      {/* Dialog for detaching an affiliated store (with optional reassignment) */}
      <Dialog open={isDesaffectOpen} onOpenChange={setIsDesaffectOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Unlink className="size-5" />
              <span>Désaffecter l'établissement</span>
            </DialogTitle>
            <DialogDescription>
              Voulez-vous désaffecter l'établissement <strong>{storeToDesaffect?.name}</strong> du
              compte partenaire de <strong>{fullName}</strong> ?
            </DialogDescription>
          </DialogHeader>

          {desaffectError && (
            <div className="p-3 text-xs rounded-md bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{desaffectError}</span>
            </div>
          )}

          <div className="space-y-4 py-2">
            {/* Reassignment notice */}
            <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
              <span className="text-xs font-semibold text-foreground block">
                Réaffectation obligatoire à un commerçant partenaire
              </span>
              <span className="text-[11px] text-muted-foreground block">
                Conformément aux règles de gestion (aucun commerce orphelin), la désaffectation
                exige la sélection immédiate d&apos;un nouveau commerçant repreneur.
              </span>
            </div>

            {/* Target Partner Selector */}
            <div className="space-y-3 pt-1">
              {isLoadingReassignPartners ? (
                <div className="py-6 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="size-5 animate-spin text-primary" />
                  <span className="text-xs">Chargement des comptes partenaires disponibles...</span>
                </div>
              ) : reassignPartners.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  Aucun autre compte partenaire disponible pour la réassignation.
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher par nom, enseigne ou email..."
                      value={reassignSearchQuery}
                      onChange={(e) => setReassignSearchQuery(e.target.value)}
                      className="pl-8 text-xs h-8"
                    />
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {filteredReassignPartners.map((targetPartner) => {
                      const targetIdentifier = targetPartner.publicId || String(targetPartner.id);
                      const isSelected = selectedTargetPartnerId === targetIdentifier;
                      return (
                        <div
                          key={targetIdentifier}
                          onClick={() => setSelectedTargetPartnerId(targetIdentifier)}
                          className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-3 text-left ${
                            isSelected
                              ? 'border-primary bg-primary/5 ring-1 ring-primary'
                              : 'border-border hover:border-muted-foreground/40 bg-card hover:bg-muted/30'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`p-1.5 rounded-md shrink-0 ${
                                isSelected
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              <Users className="size-3.5" />
                            </div>
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-xs text-foreground truncate">
                                  {targetPartner.name}
                                </span>
                                {targetPartner.companyName && (
                                  <span className="text-[10px] text-muted-foreground truncate">
                                    ({targetPartner.companyName})
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <Mail className="size-3 shrink-0 text-muted-foreground" />
                                <span className="truncate">{targetPartner.email}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
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

                  {selectedTargetPartner && (
                    <div className="p-2 rounded-md bg-muted/40 border text-xs text-muted-foreground flex items-center justify-between">
                      <span>Nouveau partenaire assigné :</span>
                      <span className="font-medium text-foreground">
                        {selectedTargetPartner.name}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDesaffectOpen(false)}
              disabled={isSubmittingDesaffect}
            >
              Annuler
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleConfirmDesaffectStore}
              disabled={
                isSubmittingDesaffect || !selectedTargetPartnerId || reassignPartners.length === 0
              }
              className="gap-1.5"
            >
              {isSubmittingDesaffect ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Traitement en cours...</span>
                </>
              ) : (
                <>
                  <Unlink className="size-3.5" />
                  <span>
                    {selectedTargetPartner
                      ? `Réaffecter à ${selectedTargetPartner.name}`
                      : 'Confirmer la réaffectation'}
                  </span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog for Revoking Store Partnership */}
      <Dialog open={isRevokeStoreOpen} onOpenChange={setIsRevokeStoreOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5 shrink-0" />
              <DialogTitle>Révoquer le commerce partenaire</DialogTitle>
            </div>
            <DialogDescription className="text-left pt-2 space-y-2">
              <span>
                Vous êtes sur le point de révoquer l'adhésion de{' '}
                <strong className="text-foreground">{storeToRevoke?.name}</strong> au programme
                d'animation locale ShopLoc.
              </span>
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-foreground space-y-1.5">
                <p className="font-semibold text-destructive flex items-center gap-1.5">
                  <ShieldAlert className="size-3.5" />
                  Effets immédiats de la révocation :
                </p>
                <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                  <li>
                    <strong>Ventes & Commandes :</strong> Les ventes physiques et le Click & Collect
                    sont immédiatement bloqués.
                  </li>
                  <li>
                    <strong>Visibilité publique :</strong> Le commerce et ses produits sont retirés
                    de l'annuaire et des recherches publiques.
                  </li>
                  <li>
                    <strong>Données sensibles :</strong> Le RIB conventionnel et la photo de vitrine
                    sont neutralisés.
                  </li>
                  <li>
                    <strong>Protection des clients :</strong> L'historique des commandes passées et
                    les points de fidélité acquis par les clients restent intégralement préservés.
                  </li>
                </ul>
              </div>
            </DialogDescription>
          </DialogHeader>

          {revokeError && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/40 p-3 text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{revokeError}</span>
            </div>
          )}

          {revokeSuccessMessage && (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/40 p-3 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <Check className="size-4 shrink-0" />
              <span>{revokeSuccessMessage}</span>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRevokeStoreOpen(false)}
              disabled={isSubmittingRevoke}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmRevokeStore}
              disabled={isSubmittingRevoke || !!revokeSuccessMessage}
              className="gap-2 font-medium"
            >
              {isSubmittingRevoke ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Révocation en cours...</span>
                </>
              ) : (
                <>
                  <Ban className="size-4" />
                  <span>Confirmer la révocation</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog: Reactivate Partner Store */}
      <Dialog open={isReactivateStoreOpen} onOpenChange={setIsReactivateStoreOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleConfirmReactivateStore}>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
                  <RotateCcw className="size-6" />
                </div>
                <div>
                  <DialogTitle className="text-base font-semibold">
                    Réactiver le commerce partenaire
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Programme d'animation locale ShopLoc
                  </p>
                </div>
              </div>
              <DialogDescription className="pt-2 text-left">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Vous êtes sur le point de réactiver le commerce{' '}
                  <strong className="text-foreground">{storeToReactivate?.name}</strong>. Cette
                  action réintègre l'établissement dans le réseau actif et le rend à nouveau visible
                  auprès des citoyens.
                </p>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-4">
              <label htmlFor="reactivate-rib" className="text-xs font-medium text-foreground">
                Nouveau RIB ou IBAN <span className="text-destructive">*</span>
              </label>
              <Input
                id="reactivate-rib"
                type="text"
                value={reactivateRib}
                onChange={(e) => setReactivateRib(e.target.value)}
                placeholder="FR76 3000 6000 0112 3456 7890 189"
                required
                disabled={isSubmittingReactivate}
                className="font-mono text-xs uppercase"
              />
              <p className="text-[11px] text-muted-foreground">
                Format IBAN français (27 caractères) ou RIB classique (23 chiffres).
              </p>
            </div>

            {reactivateError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/40 p-3 text-xs text-destructive flex items-center gap-2 mb-4">
                <AlertCircle className="size-4 shrink-0" />
                <span>{reactivateError}</span>
              </div>
            )}

            {reactivateSuccessMessage && (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/40 p-3 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2 mb-4">
                <Check className="size-4 shrink-0" />
                <span>{reactivateSuccessMessage}</span>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsReactivateStoreOpen(false)}
                disabled={isSubmittingReactivate}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={isSubmittingReactivate || !!reactivateSuccessMessage}
                className="gap-2 font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSubmittingReactivate ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Réactivation en cours...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="size-4" />
                    <span>Confirmer la réactivation</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
