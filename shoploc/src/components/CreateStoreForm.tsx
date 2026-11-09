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
import { PartnerSelect } from '@/components/PartnerSelect';
import {
  createStoreZodSchema,
  STORE_CATEGORIES,
  formatRibOrIban,
  cleanRibOrIban,
  ACCEPTED_STORE_IMAGE_TYPES,
  isValidStoreImageType,
  isValidStoreImageSize,
  type CreateStoreFormData,
} from '@/lib/validation/store';
import { createStore } from '@/lib/api';
import { resolveStoreImageUrl } from '@/lib/image';
import { ROUTES } from '@/config/routes';
import type { StoreResponse } from '@/types/store';
import {
  Store,
  MapPin,
  Tag,
  CreditCard,
  Globe,
  Loader2,
  AlertCircle,
  CheckCircle2,
  PlusCircle,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react';

/**
 * Custom hook managing store image selection, size/MIME validation, and preview lifecycle.
 */
function useStoreImageUpload() {
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [imageError, setImageError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

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
      setImageError('Format non supporté (JPEG, PNG, WebP, GIF ou SVG uniquement)');
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
  const resolvedImageUrl = resolveStoreImageUrl(store.url);

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
              <span className="text-muted-foreground block">Adresse</span>
              <span className="font-medium flex items-center gap-1 mt-0.5">
                <MapPin className="size-3 text-muted-foreground" />
                {store.address}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Compte propriétaire</span>
              <span className="font-medium mt-0.5 block">Partenaire #{store.userId}</span>
            </div>
            {store.url && (
              <div className="sm:col-span-2 space-y-2 pt-1">
                <span className="text-muted-foreground block font-medium">
                  Devanture de l'établissement
                </span>
                {resolvedImageUrl ? (
                  <div className="overflow-hidden rounded-lg border border-border bg-muted/20">
                    <img
                      src={resolvedImageUrl}
                      alt={store.name}
                      className="w-full h-44 sm:h-52 object-cover"
                    />
                  </div>
                ) : (
                  <a
                    href={store.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 text-xs truncate"
                  >
                    <Globe className="size-3" />
                    {store.url}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col sm:flex-row gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onReset} className="w-full sm:w-auto">
          <RotateCcw className="size-4 mr-1.5" />
          Ajouter un autre établissement
        </Button>
        <a href={ROUTES.stores.path} className={buttonVariants({ className: 'w-full sm:w-auto' })}>
          Voir la liste des boutiques
          <ArrowRight className="size-4 ml-1.5" />
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
            <p className="text-xs sm:text-sm font-medium truncate">{imageFile?.name}</p>
            <p className="text-[11px] text-muted-foreground">
              {imageFile ? `${(imageFile.size / (1024 * 1024)).toFixed(2)} Mo` : ''}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isSubmitting}
            onClick={onRemoveImage}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
            title="Supprimer l'image"
            aria-label="Supprimer l'image"
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
          <span className="text-xs text-muted-foreground">
            PNG, JPG, WebP, GIF ou SVG jusqu'à 10 Mo
          </span>
        </div>
      )}

      {imageError && <FieldError>{imageError}</FieldError>}
    </Field>
  );
}

/**
 * Creation form component for partner establishments (SLE-69, SLE-85).
 * Validates fields in real-time and links the new store to an existing partner account.
 * Powered by React Hook Form, Base UI Field primitives, and Zod validation.
 */
export function CreateStoreForm() {
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [createdStore, setCreatedStore] = React.useState<StoreResponse | null>(null);

  const {
    imageFile,
    imagePreview,
    imageError,
    fileInputRef,
    handleImageChange,
    handleRemoveImage,
  } = useStoreImageUpload();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting, isValid },
  } = useForm<CreateStoreFormData>({
    resolver: zodResolver(createStoreZodSchema),
    defaultValues: {
      name: '',
      category: '',
      address: '',
      url: '',
      rib: '',
      userId: '',
    },
    mode: 'onTouched',
  });

  const watchedRib = watch('rib') || '';

  const onSubmit = async (values: CreateStoreFormData) => {
    setErrorMessage(null);
    try {
      const payload = {
        name: values.name.trim(),
        category: values.category.trim(),
        address: values.address.trim(),
        url: values.url?.trim() || undefined,
        rib: cleanRibOrIban(values.rib),
        userId: Number(values.userId),
      };

      const response = await createStore(payload, imageFile);
      setCreatedStore(response);
      handleRemoveImage();
      reset();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Une erreur inattendue est survenue lors de la création de l'établissement."
      );
    }
  };

  const handleResetConfirmation = () => {
    setCreatedStore(null);
    handleRemoveImage();
  };

  if (createdStore) {
    return <StoreCreationSuccessCard store={createdStore} onReset={handleResetConfirmation} />;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider mb-1">
          <Store className="size-4" />
          <span>Administration ShopLoc</span>
        </div>
        <CardTitle className="text-xl sm:text-2xl font-bold">
          Créer un nouvel établissement
        </CardTitle>
        <CardDescription>
          Renseignez les informations du commerce et associez-le obligatoirement à un compte
          partenaire préexistant.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-5 pb-6">
          {/* Global error alert */}
          {errorMessage && (
            <div className="border border-destructive/50 bg-destructive/10 p-3 rounded-lg flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Partner user account selection (SLE-87) */}
          <Field>
            <FieldLabel htmlFor="userId">
              <span>Compte partenaire propriétaire</span>
              <span className="text-destructive">*</span>
            </FieldLabel>
            <Controller
              name="userId"
              control={control}
              render={({ field }) => (
                <PartnerSelect
                  id="userId"
                  value={field.value}
                  onValueChange={(val) => field.onChange(val)}
                  disabled={isSubmitting}
                />
              )}
            />
            <FieldError>{errors.userId?.message}</FieldError>
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
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
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
              <Input
                id="address"
                type="text"
                placeholder="Ex: 12 Rue Nationale, 59000 Lille"
                disabled={isSubmitting}
                className={
                  errors.address ? 'border-destructive focus-visible:ring-destructive' : ''
                }
                {...register('address')}
              />
            </div>
            <FieldError>{errors.address?.message}</FieldError>
          </Field>

          {/* Website / Showcase URL (optional) */}
          <Field>
            <FieldLabel htmlFor="url">
              <span>Site web ou vitrine en ligne</span>
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

          {/* Store Image Upload (MinIO / S3) - Optional */}
          <StoreImageUploadField
            imageFile={imageFile}
            imagePreview={imagePreview}
            imageError={imageError}
            fileInputRef={fileInputRef}
            isSubmitting={isSubmitting}
            onImageChange={handleImageChange}
            onRemoveImage={handleRemoveImage}
          />

          {/* Bank RIB / IBAN (SLE-86) */}
          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="rib">
                <span>Coordonnées bancaires (RIB / IBAN)</span>
                <span className="text-destructive">*</span>
              </FieldLabel>
              <span className="text-[11px] text-muted-foreground font-normal flex items-center gap-1">
                <ShieldCheck className="size-3 text-primary" />
                Contrôle modulo 97
              </span>
            </div>
            <div className="relative">
              <Input
                id="rib"
                type="text"
                placeholder="Ex: FR76 3000 6000 0112 3456 7890 189 ou RIB 23 car."
                disabled={isSubmitting}
                className={
                  errors.rib
                    ? 'border-destructive focus-visible:ring-destructive font-mono text-xs'
                    : 'font-mono text-xs'
                }
                {...register('rib')}
              />
              <CreditCard className="absolute right-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
            </div>

            {/* Live formatting preview */}
            {watchedRib.trim().length > 0 && !errors.rib && (
              <p className="text-[11px] text-green-600 dark:text-green-400 flex items-center gap-1 mt-1 font-mono">
                <CheckCircle2 className="size-3 shrink-0" />
                <span>Format valide : {formatRibOrIban(watchedRib)}</span>
              </p>
            )}

            <FieldError>{errors.rib?.message}</FieldError>
          </Field>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-3 justify-end pt-6 mt-2 border-t">
          <a
            href={ROUTES.stores.path}
            className={buttonVariants({ variant: 'outline', className: 'w-full sm:w-auto' })}
          >
            Annuler
          </a>
          <Button type="submit" disabled={isSubmitting || !isValid} className="w-full sm:w-auto">
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin mr-1.5" />
                <span>Création en cours...</span>
              </>
            ) : (
              <>
                <PlusCircle className="size-4 mr-1.5" />
                <span>Enregistrer l'établissement</span>
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
