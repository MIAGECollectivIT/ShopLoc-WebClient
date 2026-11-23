import * as React from 'react';
import type { Store, StoreResponse, StoreAbsence } from '@/types/store';
import type { StoreTurnoverResponse } from '@/types/sales';
import {
  patchStore,
  updateStoreImage,
  getStoreTurnover,
  deleteStoreAbsence,
  addStoreAbsence,
  updateStoreAbsence,
  getStoreAbsences,
} from '@/lib/api';
import { resolveStoreImageUrl } from '@/lib/image';
import {
  STORE_CATEGORIES,
  storeAddressPatchSchema,
  storeOpeningHoursPatchSchema,
  storeGeneralPatchSchema,
  ACCEPTED_STORE_IMAGE_TYPES,
  isValidStoreImageType,
  isValidStoreImageSize,
} from '@/lib/validation/store';
import {
  type DaySchedule,
  parseOpeningHours,
  formatOpeningHours,
  getDefaultSchedule,
} from '@/lib/opening-hours';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  MapPin,
  Clock,
  Calendar,
  Camera,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Loader2,
  CalendarOff,
  Sparkles,
  ShoppingBag,
  Trash2,
  SlidersHorizontal,
  Plus,
  Pencil,
  PlusCircle,
} from 'lucide-react';

interface MerchantStoreProfileFormProps {
  store: Store;
  onStoreUpdated?: (updatedStore: StoreResponse) => void;
}

export function MerchantStoreProfileForm({
  store: initialStore,
  onStoreUpdated,
}: MerchantStoreProfileFormProps) {
  const [store, setStore] = React.useState<Store>(initialStore);

  // Section 1: General Info State
  const [name, setName] = React.useState<string>(store.name || '');
  const [category, setCategory] = React.useState<string>(store.category || '');
  const [savingGeneral, setSavingGeneral] = React.useState<boolean>(false);
  const [generalError, setGeneralError] = React.useState<string | null>(null);
  const [generalSuccess, setGeneralSuccess] = React.useState<boolean>(false);

  // Section 2: Address State
  const [address, setAddress] = React.useState<string>(store.address || '');
  const [savingAddress, setSavingAddress] = React.useState<boolean>(false);
  const [addressError, setAddressError] = React.useState<string | null>(null);
  const [addressSuccess, setAddressSuccess] = React.useState<boolean>(false);

  // Section 3: Photo State
  const [selectedImageFile, setSelectedImageFile] = React.useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = React.useState<string | null>(null);
  const [savingPhoto, setSavingPhoto] = React.useState<boolean>(false);
  const [photoError, setPhotoError] = React.useState<string | null>(null);
  const [photoSuccess, setPhotoSuccess] = React.useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Section 4: Opening Hours State (interactive prefilled schedule)
  const [schedule, setSchedule] = React.useState<DaySchedule[]>(() =>
    parseOpeningHours(store.openingHours)
  );
  const [openingHoursText, setOpeningHoursText] = React.useState<string>(
    store.openingHours || formatOpeningHours(parseOpeningHours(store.openingHours))
  );
  const [useFreeTextHours, setUseFreeTextHours] = React.useState<boolean>(false);
  const [savingHours, setSavingHours] = React.useState<boolean>(false);
  const [hoursError, setHoursError] = React.useState<string | null>(null);
  const [hoursSuccess, setHoursSuccess] = React.useState<boolean>(false);

  // Section 5: Absence Periods State (editable list of absences)
  const [absencesList, setAbsencesList] = React.useState<StoreAbsence[]>(() => {
    if (store.absences && store.absences.length > 0) {
      return store.absences;
    }
    if (store.absenceStartDate) {
      return [
        {
          startDate: store.absenceStartDate,
          endDate: store.absenceEndDate,
          reason: store.absenceReason,
          durationDays: store.absenceDurationDays,
        },
      ];
    }
    return [];
  });

  const [editingAbsenceUid, setEditingAbsenceUid] = React.useState<string | null>(null);
  const [formStartDate, setFormStartDate] = React.useState<string>('');
  const [formEndDate, setFormEndDate] = React.useState<string>('');
  const [formReason, setFormReason] = React.useState<string>('');
  const [showAbsenceForm, setShowAbsenceForm] = React.useState<boolean>(false);
  const [savingAbsence, setSavingAbsence] = React.useState<boolean>(false);
  const [deletingAbsenceUid, setDeletingAbsenceUid] = React.useState<string | null>(null);
  const [absenceError, setAbsenceError] = React.useState<string | null>(null);
  const [absenceSuccess, setAbsenceSuccess] = React.useState<string | null>(null);

  // Section 6: Automated Turnover Metrics State
  const [turnover, setTurnover] = React.useState<StoreTurnoverResponse | null>(null);
  const [loadingTurnover, setLoadingTurnover] = React.useState<boolean>(true);
  const [turnoverError, setTurnoverError] = React.useState<string | null>(null);

  const storeUid = store.uid;

  // Load live turnover metrics generated by ShopLoc
  React.useEffect(() => {
    let active = true;
    async function loadTurnover() {
      if (!storeUid) {
        setLoadingTurnover(false);
        return;
      }
      try {
        setTurnoverError(null);
        const data = await getStoreTurnover(storeUid);
        if (active) {
          setTurnover(data);
        }
      } catch (err: unknown) {
        if (active) {
          setTurnoverError(
            err instanceof Error ? err.message : 'Erreur chargement chiffre d’affaires'
          );
        }
      } finally {
        if (active) {
          setLoadingTurnover(false);
        }
      }
    }
    loadTurnover();
    return () => {
      active = false;
    };
  }, [storeUid]);

  // Synchronize state if parent props change
  React.useEffect(() => {
    setStore(initialStore);
    setName(initialStore.name || '');
    setCategory(initialStore.category || '');
    setAddress(initialStore.address || '');

    const parsedSchedule = parseOpeningHours(initialStore.openingHours);
    setSchedule(parsedSchedule);
    setOpeningHoursText(initialStore.openingHours || formatOpeningHours(parsedSchedule));

    if (initialStore.absences && initialStore.absences.length > 0) {
      setAbsencesList(initialStore.absences);
    } else if (initialStore.absenceStartDate) {
      setAbsencesList([
        {
          startDate: initialStore.absenceStartDate,
          endDate: initialStore.absenceEndDate,
          reason: initialStore.absenceReason,
          durationDays: initialStore.absenceDurationDays,
        },
      ]);
    } else {
      setAbsencesList([]);
    }
  }, [initialStore]);

  // Handle unit update: General Info
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setGeneralSuccess(false);

    const validation = storeGeneralPatchSchema.safeParse({ name, category });
    if (!validation.success) {
      setGeneralError(validation.error.issues[0]?.message || 'Données invalides');
      return;
    }

    if (!storeUid) return;
    setSavingGeneral(true);
    try {
      const updated = await patchStore(storeUid, {
        name: validation.data.name,
        category: validation.data.category,
      });
      setStore(updated);
      setGeneralSuccess(true);
      onStoreUpdated?.(updated);
      setTimeout(() => setGeneralSuccess(false), 3000);
    } catch (err: unknown) {
      setGeneralError(err instanceof Error ? err.message : 'Erreur de mise à jour');
    } finally {
      setSavingGeneral(false);
    }
  };

  // Handle unit update: Address
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressError(null);
    setAddressSuccess(false);

    const validation = storeAddressPatchSchema.safeParse({ address });
    if (!validation.success) {
      setAddressError(validation.error.issues[0]?.message || 'Adresse invalide');
      return;
    }

    if (!storeUid) return;
    setSavingAddress(true);
    try {
      const updated = await patchStore(storeUid, {
        address: validation.data.address,
      });
      setStore(updated);
      setAddressSuccess(true);
      onStoreUpdated?.(updated);
      setTimeout(() => setAddressSuccess(false), 3000);
    } catch (err: unknown) {
      setAddressError(err instanceof Error ? err.message : 'Erreur de mise à jour');
    } finally {
      setSavingAddress(false);
    }
  };

  // Handle unit update: Storefront photo
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    setPhotoSuccess(false);
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedImageFile(null);
      setImagePreviewUrl(null);
      return;
    }

    if (!isValidStoreImageType(file.type)) {
      setPhotoError('Format de fichier non supporté. Formats acceptés : JPEG, PNG, WebP, GIF.');
      setSelectedImageFile(null);
      setImagePreviewUrl(null);
      return;
    }

    if (!isValidStoreImageSize(file.size)) {
      setPhotoError('La taille de l’image ne doit pas dépasser 10 Mo.');
      setSelectedImageFile(null);
      setImagePreviewUrl(null);
      return;
    }

    setSelectedImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(previewUrl);
  };

  const handleUploadPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImageFile || !storeUid) return;

    setPhotoError(null);
    setPhotoSuccess(false);
    setSavingPhoto(true);

    try {
      const updated = await updateStoreImage(storeUid, selectedImageFile);
      setStore(updated);
      setPhotoSuccess(true);
      setSelectedImageFile(null);
      setImagePreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onStoreUpdated?.(updated);
      setTimeout(() => setPhotoSuccess(false), 3000);
    } catch (err: unknown) {
      setPhotoError(err instanceof Error ? err.message : 'Erreur de mise à jour de la photo');
    } finally {
      setSavingPhoto(false);
    }
  };

  // Schedule Grid Operations
  const handleDayToggle = (dayName: string) => {
    setSchedule((prev) => {
      const updated = prev.map((item) =>
        item.day === dayName ? { ...item, open: !item.open } : item
      );
      setOpeningHoursText(formatOpeningHours(updated));
      return updated;
    });
  };

  const handleDayTimeChange = (dayName: string, field: 'start' | 'end', value: string) => {
    setSchedule((prev) => {
      const updated = prev.map((item) =>
        item.day === dayName ? { ...item, [field]: value } : item
      );
      setOpeningHoursText(formatOpeningHours(updated));
      return updated;
    });
  };

  const handleApplyPreset = (preset: 'standard' | 'openAll' | 'weekendClose') => {
    let newSchedule = getDefaultSchedule();
    if (preset === 'standard') {
      newSchedule = [
        { day: 'Lundi', shortDay: 'Lun', open: true, start: '09:00', end: '19:00' },
        { day: 'Mardi', shortDay: 'Mar', open: true, start: '09:00', end: '19:00' },
        { day: 'Mercredi', shortDay: 'Mer', open: true, start: '09:00', end: '19:00' },
        { day: 'Jeudi', shortDay: 'Jeu', open: true, start: '09:00', end: '19:00' },
        { day: 'Vendredi', shortDay: 'Ven', open: true, start: '09:00', end: '19:00' },
        { day: 'Samedi', shortDay: 'Sam', open: true, start: '10:00', end: '18:00' },
        { day: 'Dimanche', shortDay: 'Dim', open: false, start: '09:00', end: '12:00' },
      ];
    } else if (preset === 'openAll') {
      newSchedule = newSchedule.map((d) => ({ ...d, open: true, start: '09:00', end: '19:00' }));
    } else if (preset === 'weekendClose') {
      newSchedule = newSchedule.map((d) => {
        if (d.day === 'Samedi' || d.day === 'Dimanche') {
          return { ...d, open: false };
        }
        return { ...d, open: true, start: '09:00', end: '19:00' };
      });
    }
    setSchedule(newSchedule);
    setOpeningHoursText(formatOpeningHours(newSchedule));
  };

  // Section 4 Handler: Save opening hours (standalone)
  const handleSaveHours = async (e: React.FormEvent) => {
    e.preventDefault();
    setHoursError(null);
    setHoursSuccess(false);

    const finalHoursString = useFreeTextHours
      ? openingHoursText.trim()
      : formatOpeningHours(schedule);

    const hoursVal = storeOpeningHoursPatchSchema.safeParse({ openingHours: finalHoursString });
    if (!hoursVal.success) {
      setHoursError(hoursVal.error.issues[0]?.message || 'Horaires invalides');
      return;
    }

    if (!storeUid) return;
    setSavingHours(true);

    try {
      const updated = await patchStore(storeUid, {
        openingHours: hoursVal.data.openingHours || undefined,
      });
      setStore(updated);
      setHoursSuccess(true);
      onStoreUpdated?.(updated);
      setTimeout(() => setHoursSuccess(false), 3000);
    } catch (err: unknown) {
      setHoursError(err instanceof Error ? err.message : 'Erreur de mise à jour des horaires');
    } finally {
      setSavingHours(false);
    }
  };

  // Load live absences list from backend if storeUid exists
  React.useEffect(() => {
    if (!storeUid) return;
    getStoreAbsences(storeUid)
      .then((data) => {
        if (data && Array.isArray(data)) {
          setAbsencesList(data);
        }
      })
      .catch(() => {
        // Fallback to store.absences or current store state
      });
  }, [storeUid]);

  // Section 5 Handler: Open add absence form
  const handleOpenAddAbsence = () => {
    setEditingAbsenceUid(null);
    setFormStartDate('');
    setFormEndDate('');
    setFormReason('');
    setAbsenceError(null);
    setShowAbsenceForm(true);
  };

  // Section 5 Handler: Edit existing absence
  const handleStartEditAbsence = (absence: StoreAbsence) => {
    setEditingAbsenceUid(absence.uid || null);
    setFormStartDate(absence.startDate ? absence.startDate.slice(0, 10) : '');
    setFormEndDate(absence.endDate ? absence.endDate.slice(0, 10) : '');
    setFormReason(absence.reason || '');
    setAbsenceError(null);
    setShowAbsenceForm(true);
  };

  // Section 5 Handler: Cancel absence form
  const handleCancelAbsenceForm = () => {
    setShowAbsenceForm(false);
    setEditingAbsenceUid(null);
    setFormStartDate('');
    setFormEndDate('');
    setFormReason('');
    setAbsenceError(null);
  };

  // Section 5 Handler: Save absence (Add or Edit)
  const handleSaveAbsenceForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setAbsenceError(null);
    setAbsenceSuccess(null);

    if (!formStartDate) {
      setAbsenceError('La date de début est obligatoire.');
      return;
    }
    if (formEndDate && formEndDate < formStartDate) {
      setAbsenceError('La date de fin ne peut pas être antérieure à la date de début.');
      return;
    }

    if (!storeUid) return;
    setSavingAbsence(true);

    try {
      const payload = {
        startDate: `${formStartDate}T00:00:00Z`,
        endDate: formEndDate ? `${formEndDate}T23:59:59Z` : null,
        reason: formReason.trim() || null,
      };

      let updated: StoreResponse;
      if (editingAbsenceUid != null) {
        updated = await updateStoreAbsence(storeUid, editingAbsenceUid, payload);
      } else {
        updated = await addStoreAbsence(storeUid, payload);
      }

      setStore(updated);
      if (updated.absences) {
        setAbsencesList(updated.absences);
      } else {
        const fresh = await getStoreAbsences(storeUid);
        setAbsencesList(fresh);
      }

      setAbsenceSuccess(
        editingAbsenceUid != null
          ? 'Absence mise à jour avec succès.'
          : 'Nouvelle absence planifiée avec succès.'
      );
      handleCancelAbsenceForm();
      onStoreUpdated?.(updated);
      setTimeout(() => setAbsenceSuccess(null), 3500);
    } catch (err: unknown) {
      setAbsenceError(
        err instanceof Error ? err.message : "Erreur lors de l'enregistrement de l'absence"
      );
    } finally {
      setSavingAbsence(false);
    }
  };

  // Section 5 Handler: Delete single absence
  const handleDeleteOneAbsence = async (absenceUid?: string) => {
    if (!storeUid) return;
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette période d'absence ?")) {
      return;
    }

    setAbsenceError(null);
    setAbsenceSuccess(null);
    setDeletingAbsenceUid(absenceUid ?? null);

    try {
      const updated = await deleteStoreAbsence(storeUid, absenceUid);
      setStore(updated);
      if (updated.absences) {
        setAbsencesList(updated.absences);
      } else if (absenceUid != null) {
        setAbsencesList((prev) => prev.filter((a) => a.uid !== absenceUid));
      } else {
        setAbsencesList([]);
      }
      setAbsenceSuccess('Absence supprimée avec succès.');
      onStoreUpdated?.(updated);
      setTimeout(() => setAbsenceSuccess(null), 3500);
    } catch (err: unknown) {
      setAbsenceError(err instanceof Error ? err.message : "Erreur de suppression de l'absence");
    } finally {
      setDeletingAbsenceUid(null);
    }
  };

  // Current store image resolution
  const currentImageUrl = resolveStoreImageUrl(store.url, store.uid);

  // Absence status helper
  const isCurrentlyAbsent =
    store.isCurrentlyAbsent ??
    (absencesList.some((a) => {
      if (!a.startDate) return false;
      const nowMs = Date.now();
      const sMs = new Date(a.startDate).getTime();
      const eMs = a.endDate ? new Date(a.endDate).getTime() : null;
      return nowMs >= sMs && (!eMs || nowMs <= eMs);
    }) ||
      (store.absenceStartDate
        ? Date.now() >= new Date(store.absenceStartDate).getTime() &&
          (!store.absenceEndDate || Date.now() <= new Date(store.absenceEndDate).getTime())
        : false));

  return (
    <div className="space-y-6">
      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: General Information */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="size-4 text-primary" />
              <span>Identité du Commerce</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Renseignez le nom commercial et l'activité principale de votre établissement.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSaveGeneral}>
            <CardContent className="space-y-4 text-xs">
              {generalError && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{generalError}</span>
                </div>
              )}
              {generalSuccess && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>Informations générales enregistrées avec succès.</span>
                </div>
              )}
              <div className="space-y-1.5">
                <label htmlFor="store-name" className="font-semibold text-foreground">
                  Nom du commerce *
                </label>
                <Input
                  id="store-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Boulangerie Moderne"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="store-category" className="font-semibold text-foreground">
                  Catégorie d'activité *
                </label>
                <select
                  id="store-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="">Sélectionnez une catégorie</option>
                  {STORE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
            <CardFooter className="pt-2 justify-end border-t border-border/50">
              <Button type="submit" size="sm" disabled={savingGeneral} className="gap-1.5 text-xs">
                {savingGeneral && <Loader2 className="size-3.5 animate-spin" />}
                <span>Enregistrer l'identité</span>
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Section 2: Postal Address */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="size-4 text-primary" />
              <span>Adresse & Localisation</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Localisation physique de votre boutique présentée aux clients.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSaveAddress}>
            <CardContent className="space-y-4 text-xs">
              {addressError && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{addressError}</span>
                </div>
              )}
              {addressSuccess && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>Adresse mise à jour avec succès.</span>
                </div>
              )}
              <div className="space-y-1.5">
                <label htmlFor="store-address" className="font-semibold text-foreground">
                  Adresse postale complète *
                </label>
                <Input
                  id="store-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ex: 14 Place Rihour, 59000 Lille"
                  className="h-9 text-xs"
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="pt-2 justify-end border-t border-border/50">
              <Button type="submit" size="sm" disabled={savingAddress} className="gap-1.5 text-xs">
                {savingAddress && <Loader2 className="size-3.5 animate-spin" />}
                <span>Enregistrer l'adresse</span>
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Section 3: Storefront Image */}
        <Card className="border-border bg-card lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="size-4 text-primary" />
              <span>Photo de Vitrine</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Photo affichée en haut de votre fiche boutique (Formats acceptés : JPEG, PNG, WebP
              &bull; Max 10 Mo).
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleUploadPhoto}>
            <CardContent className="space-y-4 text-xs">
              {photoError && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{photoError}</span>
                </div>
              )}
              {photoSuccess && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>Photo de vitrine mise à jour avec succès.</span>
                </div>
              )}

              {/* Image Preview */}
              <div className="relative rounded-xl overflow-hidden border border-border h-48 bg-muted/30 flex items-center justify-center">
                {imagePreviewUrl ? (
                  <img
                    src={imagePreviewUrl}
                    alt="Aperçu nouvelle vitrine"
                    className="h-full w-full object-cover"
                  />
                ) : currentImageUrl ? (
                  <img
                    src={currentImageUrl}
                    alt={store.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Camera className="size-8 stroke-1 mb-1" />
                    <span>Aucune photo de vitrine</span>
                  </div>
                )}
                {imagePreviewUrl && (
                  <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px]">
                    Nouvelle sélection
                  </Badge>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="store-photo-input" className="font-semibold text-foreground">
                  Sélectionner un nouveau fichier
                </label>
                <input
                  ref={fileInputRef}
                  id="store-photo-input"
                  type="file"
                  accept={ACCEPTED_STORE_IMAGE_TYPES.join(',')}
                  onChange={handleImageFileChange}
                  className="block w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                />
              </div>
            </CardContent>
            <CardFooter className="pt-2 justify-end border-t border-border/50">
              <Button
                type="submit"
                size="sm"
                disabled={!selectedImageFile || savingPhoto}
                className="gap-1.5 text-xs"
              >
                {savingPhoto && <Loader2 className="size-3.5 animate-spin" />}
                <span>Mettre à jour la photo</span>
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Section 4: Regular Opening Hours (standalone with prefilled grid) */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="size-4 text-primary" />
                <span>Horaires d'ouverture habituels</span>
              </CardTitle>
              <button
                type="button"
                onClick={() => setUseFreeTextHours(!useFreeTextHours)}
                className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <SlidersHorizontal className="size-3" />
                <span>{useFreeTextHours ? 'Grille par jour' : 'Mode texte libre'}</span>
              </button>
            </div>
            <CardDescription className="text-xs">
              Complétez vos créneaux réguliers. Les horaires sont automatiquement pré-remplis si
              déjà définis.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSaveHours}>
            <CardContent className="space-y-4 text-xs">
              {hoursError && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{hoursError}</span>
                </div>
              )}
              {hoursSuccess && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>Horaires d'ouverture enregistrés avec succès.</span>
                </div>
              )}

              {/* Mode 1: Easy Weekly Schedule Grid */}
              {!useFreeTextHours && (
                <div className="space-y-3">
                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-border/50">
                    <span className="text-[11px] text-muted-foreground mr-1">
                      Remplissage rapide :
                    </span>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('standard')}
                      className="px-2 py-0.5 rounded-md bg-muted text-[11px] hover:bg-muted/80 text-foreground transition-colors cursor-pointer"
                    >
                      Lun-Ven 09h-19h + Sam 10h-18h
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('weekendClose')}
                      className="px-2 py-0.5 rounded-md bg-muted text-[11px] hover:bg-muted/80 text-foreground transition-colors cursor-pointer"
                    >
                      Fermé week-end
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('openAll')}
                      className="px-2 py-0.5 rounded-md bg-muted text-[11px] hover:bg-muted/80 text-foreground transition-colors cursor-pointer"
                    >
                      7j / 7
                    </button>
                  </div>

                  {/* Day by Day Rows */}
                  <div className="space-y-2">
                    {schedule.map((item) => (
                      <div
                        key={item.day}
                        className={`p-2 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                          item.open
                            ? 'bg-muted/30 border-border/70'
                            : 'bg-muted/10 border-dashed border-border/40 opacity-75'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-[100px]">
                          <button
                            type="button"
                            onClick={() => handleDayToggle(item.day)}
                            className={`w-7 h-5 flex items-center justify-center rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                              item.open
                                ? 'bg-emerald-600 text-white'
                                : 'bg-muted-foreground/30 text-muted-foreground'
                            }`}
                            title={item.open ? 'Marquer comme fermé' : 'Marquer comme ouvert'}
                          >
                            {item.open ? 'OUI' : 'NON'}
                          </button>
                          <span
                            className={`text-xs font-semibold ${item.open ? 'text-foreground' : 'text-muted-foreground'}`}
                          >
                            {item.day}
                          </span>
                        </div>

                        {item.open ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="time"
                              value={item.start}
                              onChange={(e) =>
                                handleDayTimeChange(item.day, 'start', e.target.value)
                              }
                              className="h-7 w-20 px-1.5 text-xs rounded border border-input bg-background text-foreground text-center"
                            />
                            <span className="text-muted-foreground text-xs">&agrave;</span>
                            <input
                              type="time"
                              value={item.end}
                              onChange={(e) => handleDayTimeChange(item.day, 'end', e.target.value)}
                              className="h-7 w-20 px-1.5 text-xs rounded border border-input bg-background text-foreground text-center"
                            />
                          </div>
                        ) : (
                          <span className="text-[11px] font-medium text-muted-foreground italic pr-2">
                            Fermé
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mode 2: Free Text Input */}
              {useFreeTextHours && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="store-opening-hours-text"
                    className="font-semibold text-foreground"
                  >
                    Texte des horaires d'ouverture
                  </label>
                  <textarea
                    id="store-opening-hours-text"
                    value={openingHoursText}
                    onChange={(e) => setOpeningHoursText(e.target.value)}
                    rows={4}
                    placeholder="Ex: Lun-Ven : 09:00 - 19:00, Sam : 10:00 - 18:00, Dim : Fermé"
                    className="w-full rounded-md border border-input bg-background p-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Vous pouvez saisir librement vos horaires de service ou les séparer par des
                    virgules.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-2 justify-end border-t border-border/50">
              <Button type="submit" size="sm" disabled={savingHours} className="gap-1.5 text-xs">
                {savingHours && <Loader2 className="size-3.5 animate-spin" />}
                <span>Enregistrer les horaires</span>
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Section 5: Absence Periods (standalone with view, edit, delete) */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarOff className="size-4 text-amber-600 dark:text-amber-400" />
                  <span>Gestion des Absences & Congés Temporaires</span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Gérez l'ensemble de vos fermetures exceptionnelles (congés annuels, ponts,
                  inventaires).
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {isCurrentlyAbsent && (
                  <Badge
                    variant="outline"
                    className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[11px] font-semibold"
                  >
                    <CalendarOff className="size-3.5" />
                    <span>En congé actuellement</span>
                  </Badge>
                )}
                {!showAbsenceForm && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleOpenAddAbsence}
                    className="gap-1.5 text-xs cursor-pointer"
                  >
                    <Plus className="size-3.5" />
                    <span>Ajouter une absence</span>
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            {absenceError && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs">
                <AlertCircle className="size-4 shrink-0" />
                <span>{absenceError}</span>
              </div>
            )}
            {absenceSuccess && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>{absenceSuccess}</span>
              </div>
            )}

            {/* Add / Edit Form */}
            {showAbsenceForm && (
              <form
                onSubmit={handleSaveAbsenceForm}
                className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3 animate-in fade-in-50 duration-150"
              >
                <div className="flex items-center justify-between pb-1 border-b border-primary/15">
                  <span className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                    {editingAbsenceUid != null ? (
                      <>
                        <Pencil className="size-3.5 text-primary" />
                        <span>Modifier la période d'absence</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle className="size-3.5 text-primary" />
                        <span>Planifier une nouvelle période d'absence</span>
                      </>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={handleCancelAbsenceForm}
                    className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Annuler
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label
                      htmlFor="absence-form-start"
                      className="text-[11px] font-medium text-muted-foreground"
                    >
                      Date de début *
                    </label>
                    <Input
                      id="absence-form-start"
                      type="date"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className="h-8 text-xs bg-background"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor="absence-form-end"
                      className="text-[11px] font-medium text-muted-foreground"
                    >
                      Date de fin (réouverture) *
                    </label>
                    <Input
                      id="absence-form-end"
                      type="date"
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      className="h-8 text-xs bg-background"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="absence-form-reason"
                    className="text-[11px] font-medium text-muted-foreground"
                  >
                    Motif affiché (optionnel)
                  </label>
                  <Input
                    id="absence-form-reason"
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                    placeholder="Ex: Fermeture estivale, inventaire annuel, rénovation"
                    className="h-8 text-xs bg-background"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCancelAbsenceForm}
                    disabled={savingAbsence}
                    className="text-xs h-8 cursor-pointer"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={savingAbsence || !formStartDate || !formEndDate}
                    className="text-xs h-8 gap-1.5"
                  >
                    {savingAbsence && <Loader2 className="size-3.5 animate-spin" />}
                    <span>
                      {editingAbsenceUid != null
                        ? "Mettre à jour l'absence"
                        : "Enregistrer l'absence"}
                    </span>
                  </Button>
                </div>
              </form>
            )}

            {/* Registered Absences List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium pb-1">
                <span>Absences enregistrées ({absencesList.length})</span>
              </div>

              {absencesList.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-border/80 bg-muted/20 text-center space-y-2">
                  <Calendar className="size-6 text-muted-foreground/60 mx-auto" />
                  <p className="text-xs text-muted-foreground">
                    Aucune période d'absence planifiée pour le moment.
                  </p>
                  {!showAbsenceForm && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleOpenAddAbsence}
                      className="text-xs gap-1.5 cursor-pointer mt-1"
                    >
                      <Plus className="size-3" />
                      <span>Planifier une absence</span>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {absencesList.map((absence, idx) => {
                    const nowMs = Date.now();
                    const startMs = absence.startDate ? new Date(absence.startDate).getTime() : 0;
                    const endMs = absence.endDate ? new Date(absence.endDate).getTime() : 0;
                    const isActive = startMs > 0 && nowMs >= startMs && (!endMs || nowMs <= endMs);
                    const isPast = endMs > 0 && nowMs > endMs;
                    const isUpcoming = startMs > 0 && nowMs < startMs;

                    const startFormatted = absence.startDate
                      ? new Date(absence.startDate).toLocaleDateString('fr-FR')
                      : '';
                    const endFormatted = absence.endDate
                      ? new Date(absence.endDate).toLocaleDateString('fr-FR')
                      : '';
                    const days =
                      absence.durationDays ??
                      (startMs && endMs
                        ? Math.max(0, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)))
                        : null);

                    return (
                      <div
                        key={absence.uid ?? idx}
                        className={`p-3 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isActive
                            ? 'border-amber-500/40 bg-amber-500/10'
                            : isUpcoming
                              ? 'border-border/70 bg-card hover:bg-muted/30'
                              : 'border-border/40 bg-muted/20 opacity-75'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {isActive && (
                              <Badge className="bg-amber-600 text-white text-[10px] font-semibold">
                                En cours
                              </Badge>
                            )}
                            {isUpcoming && (
                              <Badge
                                variant="outline"
                                className="border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10 text-[10px]"
                              >
                                Planifiée
                              </Badge>
                            )}
                            {isPast && (
                              <Badge
                                variant="outline"
                                className="border-border text-muted-foreground text-[10px]"
                              >
                                Passée
                              </Badge>
                            )}

                            <span className="font-semibold text-foreground text-xs">
                              Du {startFormatted} au {endFormatted}
                            </span>
                            {days != null && (
                              <span className="text-[11px] text-muted-foreground">
                                ({days} jour{days > 1 ? 's' : ''})
                              </span>
                            )}
                          </div>

                          {absence.reason && (
                            <p className="text-xs text-muted-foreground pl-0.5">
                              <span className="font-medium text-foreground">Motif :</span>{' '}
                              {absence.reason}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEditAbsence(absence)}
                            className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <Pencil className="size-3" />
                            <span>Modifier</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={Boolean(absence.uid && deletingAbsenceUid === absence.uid)}
                            onClick={() => handleDeleteOneAbsence(absence.uid)}
                            className="h-7 px-2 text-xs gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                          >
                            {absence.uid && deletingAbsenceUid === absence.uid ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Trash2 className="size-3" />
                            )}
                            <span>Supprimer</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 6: Automated Turnover Metrics (Read-only) */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span>Chiffre d'Affaires Généré par ShopLoc</span>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Indicateurs financiers calculés automatiquement à partir des encaissements physiques
                et commandes Click & Collect.
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className="gap-1.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 text-xs py-1 px-3 self-start sm:self-auto font-medium"
            >
              <Sparkles className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Calcul automatisé &bull; Non modifiable</span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingTurnover ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-muted/60 rounded-xl" />
              ))}
            </div>
          ) : turnoverError ? (
            <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs">
              <span>{turnoverError}</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Monthly Turnover */}
              <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Mois en cours
                </span>
                <p className="text-2xl font-extrabold text-foreground">
                  {turnover ? turnover.monthlyTurnover.toFixed(2) : '0.00'}&nbsp;€
                </p>
                <p className="text-[10px] text-muted-foreground">Ventes sur le mois civil actif</p>
              </div>

              {/* Yearly Turnover */}
              <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Année en cours
                </span>
                <p className="text-2xl font-extrabold text-foreground">
                  {turnover ? turnover.annualTurnover.toFixed(2) : '0.00'}&nbsp;€
                </p>
                <p className="text-[10px] text-muted-foreground">Cumul sur l'année calendaire</p>
              </div>

              {/* Total Turnover */}
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  Total Historique
                </span>
                <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">
                  {turnover ? turnover.totalTurnover.toFixed(2) : '0.00'}&nbsp;€
                </p>
                <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80">
                  Total cumulé via l'application
                </p>
              </div>

              {/* Completed Transactions */}
              <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Transactions
                </span>
                <p className="text-2xl font-extrabold text-foreground flex items-center gap-1.5">
                  <ShoppingBag className="size-5 text-primary" />
                  <span>{turnover ? turnover.completedTransactionsCount : 0}</span>
                </p>
                <p className="text-[10px] text-muted-foreground">Commandes & passages caisse</p>
              </div>
            </div>
          )}

          <div className="p-3 rounded-lg bg-muted/40 border border-border/40 text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">Transparence ShopLoc :</span> Ces
            indicateurs reflètent la contribution financière directe de la plateforme ShopLoc à
            l'activité de votre commerce. Ils ne peuvent pas être saisis ou falsifiés manuellement.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
