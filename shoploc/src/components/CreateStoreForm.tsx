import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import { AddressAutocompleteInput } from '@/components/AddressAutocompleteInput';
import { StoreOwnerSelector } from '@/components/StoreOwnerSelectionModal';
import { RibInputField } from '@/components/RibInputField';
import {
  createStoreZodSchema,
  STORE_CATEGORIES,
  cleanRibOrIban,
  ACCEPTED_STORE_IMAGE_TYPES,
  isValidStoreImageType,
  isValidStoreImageSize,
  type CreateStoreFormData,
} from '@/lib/validation/store';
import {
  createStore,
  patchStore,
  reactivateStore,
  updateStoreImage,
  addStoreToPartner,
} from '@/lib/api';
import { resolveStoreImageUrl } from '@/lib/image';
import { getAuthUser } from '@/lib/auth';
import { ROUTES } from '@/config/routes';
import type { StoreResponse, Store as StoreType, StorePatchRequest } from '@/types/store';
import {
  Store,
  Tag,
  Loader2,
  AlertCircle,
  CheckCircle2,
  PlusCircle,
  Edit,
  ArrowRight,
  Upload,
  X,
  RotateCcw,
} from 'lucide-react';

/**
 * Custom hook managing store image selection, size/MIME validation, and preview lifecycle.
 */
function useStoreImageUpload(initialImageUrl?: string | null) {
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(initialImageUrl || null);
  const [imageError, setImageError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (initialImageUrl && !imageFile) {
      setImagePreview(initialImageUrl);
    }
  }, [initialImageUrl, imageFile]);

  // Automatically revoke in-memory object URL to prevent memory leaks
  React.useEffect(() => {
    return () => {
      if (imagePreview?.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isValidStoreImageType(file.type)) {
      setImageError('Format non supporté (JPEG, PNG, WebP ou GIF uniquement)');
      return;
    }

    if (!isValidStoreImageSize(file.size)) {
      setImageError("L'image dépasse la taille maximale autorisée (10 Mo)");
      return;
    }

    setImageError(null);
    if (imagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    if (imagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview(null);
    setImageError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return {
    imageFile,
    imagePreview,
    imageError,
    fileInputRef,
    handleImageChange,
    handleRemoveImage,
  };
}

/**
 * Confirmation card presented upon successful establishment registration.
 */
interface StoreCreationSuccessCardProps {
  store: StoreResponse;
  onReset: () => void;
}

function StoreCreationSuccessCard({ store, onReset }: StoreCreationSuccessCardProps) {
  const resolvedImageUrl = resolveStoreImageUrl(store.url, store.uid);

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-md border-primary/20">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto size-12 rounded-full bg-green-100 dark:bg-green-950/50 flex items-center justify-center text-green-600 mb-2">
          <CheckCircle2 className="size-6" />
        </div>
        <CardTitle className="text-2xl font-bold">Établissement créé avec succès</CardTitle>
        <CardDescription>
          Le nouveau point de vente est officiellement intégré dans le réseau ShopLoc.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
          <div className="flex items-center justify-between border-b pb-3 gap-2">
            <h3 className="font-bold text-lg sm:text-xl text-foreground truncate">{store.name}</h3>
            <div className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs sm:text-sm font-medium">
              <Tag className="size-3.5 sm:size-4" />
              <span>{store.category}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground block">Identifiant public :</span>
              <span className="font-mono font-semibold text-foreground break-all">
                {String(store.uid || store.id)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Compte propriétaire :</span>
              <span className="font-medium mt-0.5 block font-mono text-[11px]">
                {String(
                  store.ownerUid ||
                    (store.merchantName ? `${store.merchantName} (${store.userId})` : store.userId)
                )}
              </span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-muted-foreground block">Adresse postale :</span>
              <span className="font-medium text-foreground">{store.address}</span>
            </div>
            {store.url && (
              <div className="sm:col-span-2">
                <span className="text-muted-foreground block">URL vitrine :</span>
                <a
                  href={store.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline font-mono truncate block"
                >
                  {store.url}
                </a>
              </div>
            )}
            {store.rib && (
              <div className="sm:col-span-2">
                <span className="text-muted-foreground block">
                  Coordonnées bancaires (RIB / IBAN) :
                </span>
                <span className="font-mono text-muted-foreground">{store.rib}</span>
              </div>
            )}
          </div>

          {resolvedImageUrl && (
            <div className="pt-2 border-t">
              <span className="text-xs text-muted-foreground block mb-1.5">Devanture :</span>
              <img
                src={resolvedImageUrl}
                alt={store.name}
                className="w-full h-36 object-cover rounded-md border"
              />
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onReset}
          className="w-full sm:w-auto flex items-center gap-2"
        >
          <PlusCircle className="size-4" />
          <span>Créer un autre établissement</span>
        </Button>
        <a
          href={ROUTES.stores.path}
          className={buttonVariants({
            variant: 'default',
            className: 'w-full sm:w-auto flex items-center gap-2',
          })}
        >
          <span>Voir l'annuaire des commerces</span>
          <ArrowRight className="size-4" />
        </a>
      </CardFooter>
    </Card>
  );
}

/**
 * Image upload field component with preview thumbnail and removal action.
 */
interface StoreImageUploadFieldProps {
  imageFile: File | null;
  imagePreview: string | null;
  imageError: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isSubmitting: boolean;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
}

function StoreImageUploadField({
  imageFile,
  imagePreview,
  imageError,
  fileInputRef,
  isSubmitting,
  onImageChange,
  onRemoveImage,
}: StoreImageUploadFieldProps) {
  return (
    <Field>
      <FieldLabel htmlFor="store-image">
        <span>Photo de l'établissement (devanture)</span>
        <span className="text-xs text-muted-foreground font-normal">(Optionnel)</span>
      </FieldLabel>

      <input
        ref={fileInputRef}
        id="store-image"
        type="file"
        accept={ACCEPTED_STORE_IMAGE_TYPES.join(',')}
        className="hidden"
        disabled={isSubmitting}
        onChange={onImageChange}
      />

      {imagePreview ? (
        <div className="relative rounded-lg border border-border overflow-hidden bg-muted/40 p-2.5 flex items-center gap-3">
          <img
            src={imagePreview}
            alt="Aperçu de la devanture"
            className="size-16 rounded-md object-cover border shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium truncate">
              {imageFile?.name || 'Photo actuelle de la devanture'}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {imageFile
                ? `${(imageFile.size / (1024 * 1024)).toFixed(2)} Mo`
                : 'Enregistrée sur le serveur'}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isSubmitting}
            onClick={onRemoveImage}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
            title="Supprimer la photo"
            aria-label="Supprimer la photo"
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSubmitting}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2"
          >
            <Upload className="size-4" />
            <span>Choisir une photo</span>
          </Button>
          <span className="text-xs text-muted-foreground">PNG, JPG, WebP ou GIF jusqu'à 10 Mo</span>
        </div>
      )}

      {imageError && <FieldError>{imageError}</FieldError>}
    </Field>
  );
}

export type StoreFormMode = 'create' | 'edit' | 'reactivate';

export interface StoreFormProps {
  mode?: StoreFormMode;
  initialStore?: StoreType | StoreResponse | null;
  onSuccess?: (store: StoreResponse) => void;
  onCancel?: () => void;
  isDialog?: boolean;
}

const STORE_FORM_MODE_CONFIG: Record<
  StoreFormMode,
  {
    dialogTitle: string;
    cardTitle: string;
    cardDescription: string;
    submitLabel: string;
    submittingLabel: string;
    fallbackError: string;
  }
> = {
  create: {
    dialogTitle: 'Créer un nouvel établissement',
    cardTitle: 'Créer un nouvel établissement',
    cardDescription:
      'Renseignez les informations du commerce et associez-le obligatoirement à un compte partenaire préexistant.',
    submitLabel: "Enregistrer l'établissement",
    submittingLabel: 'Création en cours...',
    fallbackError: "Une erreur inattendue est survenue lors de la création de l'établissement.",
  },
  edit: {
    dialogTitle: 'Modifier le commerce partenaire',
    cardTitle: "Modifier l'établissement",
    cardDescription: 'Mettez à jour les coordonnées du commerce et ses paramètres.',
    submitLabel: 'Enregistrer les modifications',
    submittingLabel: 'Enregistrement...',
    fallbackError: 'Une erreur est survenue lors de la mise à jour du commerce.',
  },
  reactivate: {
    dialogTitle: 'Réactiver le commerce partenaire',
    cardTitle: 'Réactiver le commerce partenaire',
    cardDescription: 'Affectez un partenaire et saisissez un RIB/IBAN conventionnel valide.',
    submitLabel: 'Confirmer la réactivation',
    submittingLabel: 'Réactivation en cours...',
    fallbackError: 'Une erreur est survenue lors de la réactivation du commerce.',
  },
};

function buildStoreFormDefaults(store?: StoreType | StoreResponse | null): CreateStoreFormData {
  return {
    name: store?.name || '',
    category: store?.category || '',
    address: store?.address || '',
    url: store?.url || '',
    rib: store?.rib && store.rib !== 'REVOKED' ? store.rib : '',
    ownerUid: store?.ownerUid || '',
  };
}

function buildStorePatchPayload(values: CreateStoreFormData): StorePatchRequest {
  return {
    name: values.name.trim(),
    category: values.category.trim(),
    address: values.address.trim(),
    url: values.url?.trim() || undefined,
    rib: cleanRibOrIban(values.rib),
    ownerUid: values.ownerUid ? values.ownerUid : undefined,
  };
}

async function uploadStoreImageSafe(storeId: string, imageFile: File | null): Promise<void> {
  if (!imageFile) return;
  try {
    await updateStoreImage(storeId, imageFile);
  } catch (imgErr) {
    console.warn("Échec du téléversement de l'image:", imgErr);
  }
}

/**
 * Unified establishment form component supporting creation, edition, and reactivation.
 * Features real-time Zod validation, modulo 97 RIB algorithmic check,
 * and storefront image upload lifecycle.
 */
export function StoreForm({
  mode = 'create',
  initialStore,
  onSuccess,
  onCancel,
  isDialog = false,
}: StoreFormProps) {
  const isEditing = mode === 'edit';
  const isReactivating = mode === 'reactivate';
  const modeConfig = STORE_FORM_MODE_CONFIG[mode];
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [createdStore, setCreatedStore] = React.useState<StoreResponse | null>(null);

  const initialImageUrl = React.useMemo(() => {
    if (
      initialStore?.url &&
      (initialStore.url.startsWith('http') || initialStore.url.startsWith('/'))
    ) {
      const publicId = initialStore.uid || (initialStore.id ? String(initialStore.id) : undefined);
      return resolveStoreImageUrl(initialStore.url, publicId);
    }
    return null;
  }, [initialStore]);

  const {
    imageFile,
    imagePreview,
    imageError,
    fileInputRef,
    handleImageChange,
    handleRemoveImage,
  } = useStoreImageUpload(initialImageUrl);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting, isValid },
  } = useForm<CreateStoreFormData>({
    resolver: zodResolver(createStoreZodSchema),
    defaultValues: buildStoreFormDefaults(initialStore),
    mode: 'onChange',
  });

  const currentUser = React.useMemo(() => getAuthUser(), []);
  const isMerchant = currentUser?.role === 'MERCHANT';

  const watchedAddress = watch('address') || '';
  const [coords, setCoords] = React.useState<{
    latitude?: number | null;
    longitude?: number | null;
  }>({});

  React.useEffect(() => {
    if (initialStore) {
      reset(buildStoreFormDefaults(initialStore));
    } else if (isMerchant && currentUser?.id) {
      setValue('ownerUid', currentUser.id, { shouldValidate: true, shouldDirty: true });
    }
  }, [initialStore, isMerchant, currentUser?.id, reset, setValue]);

  const onSubmit = async (values: CreateStoreFormData) => {
    setErrorMessage(null);
    try {
      if ((isReactivating || isEditing) && initialStore) {
        const storeId = initialStore.uid || String(initialStore.id);
        const cleanedRib = cleanRibOrIban(values.rib);

        if (isReactivating) {
          await reactivateStore(storeId, cleanedRib, values.ownerUid);
        }

        const response = await patchStore(storeId, buildStorePatchPayload(values));

        if (values.ownerUid && (isReactivating || values.ownerUid !== initialStore.ownerUid)) {
          try {
            await addStoreToPartner(values.ownerUid, storeId);
          } catch {
            // best-effort sync
          }
        }
        await uploadStoreImageSafe(storeId, imageFile);
        onSuccess?.(response);
      } else {
        const payload = {
          name: values.name.trim(),
          category: values.category.trim(),
          address: values.address.trim(),
          url: values.url?.trim() || undefined,
          rib: cleanRibOrIban(values.rib),
          ownerUid: values.ownerUid,
          latitude: coords.latitude,
          longitude: coords.longitude,
        };

        const response = await createStore(payload);
        await uploadStoreImageSafe(response.uid || String(response.id), imageFile);
        if (onSuccess) {
          onSuccess(response);
        } else {
          setCreatedStore(response);
        }
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : modeConfig.fallbackError);
    }
  };

  const handleResetConfirmation = () => {
    setCreatedStore(null);
    handleRemoveImage();
  };

  if (createdStore && !isDialog) {
    return <StoreCreationSuccessCard store={createdStore} onReset={handleResetConfirmation} />;
  }

  const formFields = (
    <div className="space-y-4 py-2">
      {/* Global error alert */}
      {errorMessage && (
        <div className="border border-destructive/50 bg-destructive/10 p-3 rounded-lg flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="size-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Partner user account selection */}
      <Field>
        <FieldLabel htmlFor="ownerUid">
          <span>Compte partenaire propriétaire</span>
          <span className="text-destructive">*</span>
        </FieldLabel>
        <Controller
          name="ownerUid"
          control={control}
          render={({ field }) => (
            <StoreOwnerSelector
              id="ownerUid"
              value={field.value}
              onValueChange={(val) => field.onChange(val)}
              disabled={isSubmitting || (isMerchant && !isEditing)}
            />
          )}
        />
        {isMerchant && !isEditing && (
          <p className="text-[11px] text-muted-foreground">
            Connecté en tant que commerçant : ce nouvel établissement sera automatiquement associé à
            votre compte personnel.
          </p>
        )}
        <FieldError>{errors.ownerUid?.message}</FieldError>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Store Name */}
        <Field>
          <FieldLabel htmlFor="name">
            <span>Nom de l'établissement</span>
            <span className="text-destructive">*</span>
          </FieldLabel>
          <div className="relative">
            <Input
              id="name"
              type="text"
              placeholder="Ex: Boulangerie du Centre"
              disabled={isSubmitting}
              className={errors.name ? 'border-destructive focus-visible:ring-destructive' : ''}
              {...register('name')}
            />
          </div>
          <FieldError>{errors.name?.message}</FieldError>
        </Field>

        {/* Store Category */}
        <Field>
          <FieldLabel htmlFor="category">
            <span>Catégorie d'activité</span>
            <span className="text-destructive">*</span>
          </FieldLabel>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
                <SelectTrigger
                  id="category"
                  aria-label="Catégorie d'activité"
                  className={
                    errors.category ? 'border-destructive focus-visible:ring-destructive' : ''
                  }
                >
                  <SelectValue placeholder="Sélectionnez une catégorie" />
                </SelectTrigger>
                <SelectContent
                  side="bottom"
                  align="start"
                  alignItemWithTrigger={false}
                  sideOffset={6}
                >
                  {STORE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError>{errors.category?.message}</FieldError>
        </Field>
      </div>

      {/* Physical Address */}
      <Field>
        <FieldLabel htmlFor="address">
          <span>Adresse postale</span>
          <span className="text-destructive">*</span>
        </FieldLabel>
        <div className="relative">
          <AddressAutocompleteInput
            id="address"
            value={watchedAddress}
            onChange={(val) =>
              setValue('address', val, {
                shouldValidate: true,
                shouldDirty: true,
                shouldTouch: true,
              })
            }
            onSelectAddress={(res) => {
              setValue('address', res.address, {
                shouldValidate: true,
                shouldDirty: true,
                shouldTouch: true,
              });
              setCoords({ latitude: res.latitude, longitude: res.longitude });
            }}
            placeholder="Ex: 12 Rue Nationale, 59000 Lille"
            disabled={isSubmitting}
            className={errors.address ? 'border-destructive focus-visible:ring-destructive' : ''}
          />
        </div>
        <FieldError>{errors.address?.message}</FieldError>
      </Field>

      {/* Website / Showcase URL */}
      <Field>
        <FieldLabel htmlFor="url">
          <span>URL vitrine (Site web ou boutique en ligne)</span>
          <span className="text-xs text-muted-foreground font-normal">(Optionnel)</span>
        </FieldLabel>
        <Input
          id="url"
          type="url"
          placeholder="Ex: https://boulangerie-centre-lille.fr"
          disabled={isSubmitting}
          className={errors.url ? 'border-destructive focus-visible:ring-destructive' : ''}
          {...register('url')}
        />
        <FieldError>{errors.url?.message}</FieldError>
      </Field>

      {/* Store Image Upload (MinIO / S3) */}
      <StoreImageUploadField
        imageFile={imageFile}
        imagePreview={imagePreview}
        imageError={imageError}
        fileInputRef={fileInputRef}
        isSubmitting={isSubmitting}
        onImageChange={handleImageChange}
        onRemoveImage={handleRemoveImage}
      />

      {/* Bank RIB / IBAN via Reusable RibInputField */}
      <Controller
        name="rib"
        control={control}
        render={({ field }) => (
          <RibInputField
            id="rib"
            value={field.value || ''}
            onChange={field.onChange}
            error={errors.rib?.message}
            disabled={isSubmitting}
          />
        )}
      />
    </div>
  );

  if (isDialog) {
    return (
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            {isReactivating ? (
              <RotateCcw className="size-4 text-emerald-600" />
            ) : isEditing ? (
              <Edit className="size-4 text-primary" />
            ) : (
              <Store className="size-4 text-primary" />
            )}
            <span>{modeConfig.dialogTitle}</span>
          </DialogTitle>
          <DialogDescription>
            {isReactivating
              ? `Vérifiez les informations de ${initialStore?.name || "l'établissement"}, réaffectez un partenaire et saisissez un RIB/IBAN conventionnel valide.`
              : isEditing
                ? `Mise à jour des informations administratives et coordonnées de ${initialStore?.name || "l'établissement"}.`
                : "Renseignez les coordonnées de l'établissement et associez-le à un partenaire."}
          </DialogDescription>
        </DialogHeader>

        {formFields}

        <DialogFooter className="pt-4 gap-2 sm:gap-0">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
          )}
          <Button type="submit" size="sm" disabled={isSubmitting || !isValid}>
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin mr-1.5" />
                <span>{modeConfig.submittingLabel}</span>
              </>
            ) : (
              <span>{modeConfig.submitLabel}</span>
            )}
          </Button>
        </DialogFooter>
      </form>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider mb-1">
          <Store className="size-4" />
          <span>Administration ShopLoc</span>
        </div>
        <CardTitle className="text-xl sm:text-2xl font-bold">
          {isEditing ? "Modifier l'établissement" : 'Créer un nouvel établissement'}
        </CardTitle>
        <CardDescription>
          {isEditing
            ? 'Mettez à jour les coordonnées du commerce et ses paramètres.'
            : 'Renseignez les informations du commerce et associez-le obligatoirement à un compte partenaire préexistant.'}
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="pb-6">{formFields}</CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-3 justify-end pt-6 mt-2 border-t">
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
              Annuler
            </Button>
          ) : (
            <a
              href={ROUTES.stores.path}
              className={buttonVariants({ variant: 'outline', className: 'w-full sm:w-auto' })}
            >
              Annuler
            </a>
          )}
          <Button type="submit" disabled={isSubmitting || !isValid} className="w-full sm:w-auto">
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin mr-1.5" />
                <span>{isEditing ? 'Enregistrement...' : 'Création en cours...'}</span>
              </>
            ) : (
              <>
                {isEditing ? (
                  <Edit className="size-4 mr-1.5" />
                ) : (
                  <PlusCircle className="size-4 mr-1.5" />
                )}
                <span>
                  {isEditing ? 'Enregistrer les modifications' : "Enregistrer l'établissement"}
                </span>
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

/**
 * Backwards-compatible export wrapping StoreForm in creation mode.
 */
export function CreateStoreForm(props: StoreFormProps) {
  return <StoreForm {...props} mode="create" />;
}
