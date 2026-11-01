import * as React from 'react';
import { useFormik } from 'formik';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PartnerSelect } from '@/components/PartnerSelect';
import {
  createStoreValidationSchema,
  STORE_CATEGORIES,
  formatRibOrIban,
  cleanRibOrIban,
  type CreateStoreFormData,
} from '@/lib/validation/store';
import { createStore } from '@/lib/api';
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
} from 'lucide-react';

/**
 * Creation form component for partner establishments (SLE-69, SLE-85).
 * Validates fields in real-time and links the new store to an existing partner account.
 */
export function CreateStoreForm() {
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [createdStore, setCreatedStore] = React.useState<StoreResponse | null>(null);

  const formik = useFormik<CreateStoreFormData>({
    initialValues: {
      name: '',
      category: '',
      address: '',
      url: '',
      rib: '',
      userId: '',
    },
    validationSchema: createStoreValidationSchema,
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      setErrorMessage(null);
      try {
        const payload = {
          name: values.name.trim(),
          category: values.category.trim(),
          address: values.address.trim(),
          url: values.url.trim() || undefined,
          rib: cleanRibOrIban(values.rib),
          userId: Number(values.userId),
        };

        const response = await createStore(payload);
        setCreatedStore(response);
        resetForm();
      } catch (err: unknown) {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Une erreur inattendue est survenue lors de la création de l'établissement."
        );
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Success state: display confirmation card
  if (createdStore) {
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
            <div className="flex items-start justify-between border-b pb-2">
              <div>
                <h3 className="font-semibold text-base">{createdStore.name}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Tag className="size-3 text-primary" />
                  {createdStore.category}
                </p>
              </div>
              <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
                ID #{createdStore.id}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground block">Adresse</span>
                <span className="font-medium flex items-center gap-1 mt-0.5">
                  <MapPin className="size-3 text-muted-foreground" />
                  {createdStore.address}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Compte propriétaire</span>
                <span className="font-medium mt-0.5 block">Partenaire #{createdStore.userId}</span>
              </div>
              {createdStore.url && (
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground block">Site vitrine</span>
                  <a
                    href={createdStore.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 mt-0.5 truncate"
                  >
                    <Globe className="size-3" />
                    {createdStore.url}
                  </a>
                </div>
              )}
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-2 justify-end pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCreatedStore(null)}
            className="w-full sm:w-auto"
          >
            <RotateCcw className="size-4 mr-1.5" />
            Ajouter un autre établissement
          </Button>
          <a
            href={ROUTES.stores.path}
            className={buttonVariants({ className: 'w-full sm:w-auto' })}
          >
            Voir la liste des boutiques
            <ArrowRight className="size-4 ml-1.5" />
          </a>
        </CardFooter>
      </Card>
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
          Créer un nouvel établissement
        </CardTitle>
        <CardDescription>
          Renseignez les informations du commerce et associez-le obligatoirement à un compte
          partenaire préexistant.
        </CardDescription>
      </CardHeader>

      <form onSubmit={formik.handleSubmit}>
        <CardContent className="space-y-5 pb-6">
          {/* Global error alert */}
          {errorMessage && (
            <div className="border border-destructive/50 bg-destructive/10 p-3 rounded-lg flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Partner user account selection (SLE-87) */}
          <div className="space-y-1.5">
            <Label htmlFor="userId" className="text-sm font-semibold flex items-center gap-1.5">
              <span>Compte partenaire propriétaire</span>
              <span className="text-destructive">*</span>
            </Label>
            <PartnerSelect
              id="userId"
              value={formik.values.userId}
              onValueChange={(val) => {
                formik.setFieldValue('userId', val);
                formik.setFieldTouched('userId', true, true);
              }}
              disabled={formik.isSubmitting}
            />
            {formik.touched.userId && formik.errors.userId && (
              <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                <AlertCircle className="size-3 shrink-0" />
                <span>{formik.errors.userId}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Store Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-semibold flex items-center gap-1.5">
                <span>Nom de l'établissement</span>
                <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Ex: Boulangerie du Centre"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  disabled={formik.isSubmitting}
                  className={
                    formik.touched.name && formik.errors.name
                      ? 'border-destructive focus-visible:ring-destructive'
                      : ''
                  }
                />
              </div>
              {formik.touched.name && formik.errors.name && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                  <AlertCircle className="size-3 shrink-0" />
                  <span>{formik.errors.name}</span>
                </p>
              )}
            </div>

            {/* Store Category */}
            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-sm font-semibold flex items-center gap-1.5">
                <span>Catégorie d'activité</span>
                <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formik.values.category}
                onValueChange={(val) => {
                  formik.setFieldValue('category', val);
                  formik.setFieldTouched('category', true, true);
                }}
                disabled={formik.isSubmitting}
              >
                <SelectTrigger
                  id="category"
                  className={
                    formik.touched.category && formik.errors.category
                      ? 'border-destructive focus-visible:ring-destructive'
                      : ''
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
              {formik.touched.category && formik.errors.category && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                  <AlertCircle className="size-3 shrink-0" />
                  <span>{formik.errors.category}</span>
                </p>
              )}
            </div>
          </div>

          {/* Physical Address */}
          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-sm font-semibold flex items-center gap-1.5">
              <span>Adresse postale</span>
              <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="address"
                name="address"
                type="text"
                placeholder="Ex: 12 Rue Nationale, 59000 Lille"
                value={formik.values.address}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                disabled={formik.isSubmitting}
                className={
                  formik.touched.address && formik.errors.address
                    ? 'border-destructive focus-visible:ring-destructive'
                    : ''
                }
              />
            </div>
            {formik.touched.address && formik.errors.address && (
              <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                <AlertCircle className="size-3 shrink-0" />
                <span>{formik.errors.address}</span>
              </p>
            )}
          </div>

          {/* Website / Showcase URL (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="url" className="text-sm font-semibold flex items-center gap-1.5">
              <span>Site web ou vitrine en ligne</span>
              <span className="text-xs text-muted-foreground font-normal">(Optionnel)</span>
            </Label>
            <Input
              id="url"
              name="url"
              type="url"
              placeholder="Ex: https://boulangerie-centre-lille.fr"
              value={formik.values.url}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              disabled={formik.isSubmitting}
              className={
                formik.touched.url && formik.errors.url
                  ? 'border-destructive focus-visible:ring-destructive'
                  : ''
              }
            />
            {formik.touched.url && formik.errors.url && (
              <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                <AlertCircle className="size-3 shrink-0" />
                <span>{formik.errors.url}</span>
              </p>
            )}
          </div>

          {/* Bank RIB / IBAN (SLE-86) */}
          <div className="space-y-1.5">
            <Label
              htmlFor="rib"
              className="text-sm font-semibold flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <span>Coordonnées bancaires (RIB / IBAN)</span>
                <span className="text-destructive">*</span>
              </span>
              <span className="text-[11px] text-muted-foreground font-normal flex items-center gap-1">
                <ShieldCheck className="size-3 text-primary" />
                Contrôle modulo 97
              </span>
            </Label>
            <div className="relative">
              <Input
                id="rib"
                name="rib"
                type="text"
                placeholder="Ex: FR76 3000 6000 0112 3456 7890 189 ou RIB 23 car."
                value={formik.values.rib}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                disabled={formik.isSubmitting}
                className={
                  formik.touched.rib && formik.errors.rib
                    ? 'border-destructive focus-visible:ring-destructive font-mono text-xs'
                    : 'font-mono text-xs'
                }
              />
              <CreditCard className="absolute right-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
            </div>

            {/* Live formatting preview */}
            {formik.values.rib.trim().length > 0 && !formik.errors.rib && (
              <p className="text-[11px] text-green-600 dark:text-green-400 flex items-center gap-1 mt-1 font-mono">
                <CheckCircle2 className="size-3 shrink-0" />
                <span>Format valide : {formatRibOrIban(formik.values.rib)}</span>
              </p>
            )}

            {formik.touched.rib && formik.errors.rib && (
              <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                <AlertCircle className="size-3 shrink-0" />
                <span>{formik.errors.rib}</span>
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-3 justify-end pt-6 mt-2 border-t">
          <a
            href={ROUTES.stores.path}
            className={buttonVariants({ variant: 'outline', className: 'w-full sm:w-auto' })}
          >
            Annuler
          </a>
          <Button
            type="submit"
            disabled={formik.isSubmitting || !formik.isValid}
            className="w-full sm:w-auto"
          >
            {formik.isSubmitting ? (
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
