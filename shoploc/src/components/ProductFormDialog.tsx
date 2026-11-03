import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { productSchema, ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE_BYTES } from '@/lib/validation/product';
import { createProduct, updateProduct } from '@/lib/api';
import type { Product } from '@/types/product';
import { PackagePlus, Edit, Upload, Loader2, AlertCircle, X, Check } from 'lucide-react';

interface ProductFormDialogProps {
  storeId: number;
  product?: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedProduct: Product) => void;
}

export function ProductFormDialog({
  storeId,
  product,
  isOpen,
  onClose,
  onSuccess,
}: ProductFormDialogProps) {
  const isEditing = Boolean(product);

  const [reference, setReference] = React.useState('');
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [stockQuantity, setStockQuantity] = React.useState('0');
  const [imageUrl, setImageUrl] = React.useState('');

  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Initialize or reset form when modal opens or product changes
  React.useEffect(() => {
    if (product) {
      setReference(product.reference);
      setName(product.name);
      setDescription(product.description || '');
      setPrice(String(product.price));
      setStockQuantity(String(product.stockQuantity));
      setImageUrl(product.imageUrl || '');
      setPreviewUrl(product.imageUrl || null);
    } else {
      setReference('');
      setName('');
      setDescription('');
      setPrice('');
      setStockQuantity('0');
      setImageUrl('');
      setPreviewUrl(null);
    }
    setSelectedFile(null);
    setErrors({});
    setServerError(null);
  }, [product, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        file: 'Format non supporté (JPEG, PNG ou WebP uniquement)',
      }));
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrors((prev) => ({
        ...prev,
        file: 'L’image dépasse la taille maximale autorisée (10 Mo)',
      }));
      return;
    }

    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.file;
      return copy;
    });

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setPreviewUrl(imageUrl || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    // Zod validation
    const rawValues = {
      reference,
      name,
      description,
      price,
      stockQuantity,
      imageUrl: imageUrl.trim() || undefined,
    };

    const result = productSchema.safeParse(rawValues);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0];
        if (path) fieldErrors[String(path)] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    const validated = result.data;
    setIsSubmitting(true);

    try {
      let saved: Product;
      if (isEditing && product) {
        saved = await updateProduct(
          storeId,
          product.id,
          {
            reference: validated.reference,
            name: validated.name,
            description: validated.description || undefined,
            price: validated.price,
            stockQuantity: validated.stockQuantity,
            imageUrl: validated.imageUrl || undefined,
          },
          selectedFile || undefined
        );
      } else {
        saved = await createProduct(
          storeId,
          {
            reference: validated.reference,
            name: validated.name,
            description: validated.description || undefined,
            price: validated.price,
            stockQuantity: validated.stockQuantity,
            imageUrl: validated.imageUrl || undefined,
          },
          selectedFile || undefined
        );
      }

      onSuccess(saved);
      onClose();
    } catch (err: unknown) {
      setServerError(
        err instanceof Error
          ? err.message
          : 'Une erreur inattendue est survenue lors de l’enregistrement.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {isEditing ? <Edit className="size-5" /> : <PackagePlus className="size-5" />}
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                {isEditing ? 'Modifier le produit' : 'Ajouter un produit Click & Collect'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {isEditing
                  ? 'Mettez à jour les informations, le tarif ou l’inventaire de cet article.'
                  : 'Renseignez les détails de l’article pour l’ajouter à votre vitrine locale.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {serverError && (
          <div className="border border-destructive/50 bg-destructive/10 p-3 rounded-lg text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <p>{serverError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Reference & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="reference" className="text-xs font-semibold">
                Référence <span className="text-destructive">*</span>
              </Label>
              <Input
                id="reference"
                placeholder="Ex: REF-001"
                value={reference}
                onChange={(e) => setReference(e.target.value.toUpperCase())}
                disabled={isSubmitting}
                className={`font-mono text-xs ${errors.reference ? 'border-destructive ring-destructive' : ''}`}
              />
              {errors.reference && (
                <p className="text-[11px] text-destructive flex items-center gap-1">
                  <AlertCircle className="size-3 shrink-0" /> {errors.reference}
                </p>
              )}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="name" className="text-xs font-semibold">
                Nom du produit <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Ex: Baguette Tradition"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                className={errors.name ? 'border-destructive ring-destructive' : ''}
              />
              {errors.name && (
                <p className="text-[11px] text-destructive flex items-center gap-1">
                  <AlertCircle className="size-3 shrink-0" /> {errors.name}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label
              htmlFor="description"
              className="text-xs font-semibold flex items-center justify-between"
            >
              <span>Description</span>
              <span className="text-muted-foreground font-normal">(Optionnelle)</span>
            </Label>
            <textarea
              id="description"
              rows={2}
              placeholder="Ingrédients, caractéristiques, conseils de conservation..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              className={`w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                errors.description ? 'border-destructive ring-destructive' : ''
              }`}
            />
            {errors.description && (
              <p className="text-[11px] text-destructive flex items-center gap-1">
                <AlertCircle className="size-3 shrink-0" /> {errors.description}
              </p>
            )}
          </div>

          {/* Price & Stock */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="price" className="text-xs font-semibold">
                Prix unitaire TTC (€) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="price"
                  type="text"
                  placeholder="Ex: 1.20"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={isSubmitting}
                  className={`pr-7 ${errors.price ? 'border-destructive ring-destructive' : ''}`}
                />
                <span className="absolute right-2.5 top-2 text-xs font-semibold text-muted-foreground pointer-events-none">
                  €
                </span>
              </div>
              {errors.price && (
                <p className="text-[11px] text-destructive flex items-center gap-1">
                  <AlertCircle className="size-3 shrink-0" /> {errors.price}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="stockQuantity" className="text-xs font-semibold">
                Stock initial (Unités)
              </Label>
              <Input
                id="stockQuantity"
                type="number"
                min="0"
                placeholder="0"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                disabled={isSubmitting}
                className={errors.stockQuantity ? 'border-destructive ring-destructive' : ''}
              />
              {errors.stockQuantity && (
                <p className="text-[11px] text-destructive flex items-center gap-1">
                  <AlertCircle className="size-3 shrink-0" /> {errors.stockQuantity}
                </p>
              )}
            </div>
          </div>

          {/* Photo Management (Upload MinIO/S3 or URL) */}
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs font-semibold flex items-center justify-between">
              <span>Photo du produit</span>
              <span className="text-[11px] text-muted-foreground font-normal">
                MinIO S3 sécurisé (Max 10 Mo)
              </span>
            </Label>

            {/* Preview Box */}
            {previewUrl ? (
              <div className="relative rounded-lg overflow-hidden border border-border h-36 bg-muted/30 flex items-center justify-center group">
                <img src={previewUrl} alt="Aperçu" className="h-full w-full object-cover" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 size-7 shadow-md opacity-90 group-hover:opacity-100 transition-opacity"
                  onClick={removeSelectedFile}
                  title="Supprimer la photo"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <label
                htmlFor="file-upload"
                className="border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition-colors"
              >
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                  <Upload className="size-5" />
                </div>
                <p className="text-xs font-medium text-foreground">
                  Glissez une image ou <span className="text-primary underline">parcourez</span>
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">JPEG, PNG ou WebP</p>
                <input
                  id="file-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                />
              </label>
            )}

            {errors.file && (
              <p className="text-[11px] text-destructive flex items-center gap-1">
                <AlertCircle className="size-3 shrink-0" /> {errors.file}
              </p>
            )}

            {/* Fallback direct Image URL */}
            <div className="pt-1">
              <div className="flex items-center gap-2">
                <Input
                  id="imageUrl"
                  type="url"
                  placeholder="Ou collez une URL d'image externe (https://...)"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    if (!selectedFile) setPreviewUrl(e.target.value.trim() || null);
                  }}
                  disabled={isSubmitting || Boolean(selectedFile)}
                  className={`text-xs ${errors.imageUrl ? 'border-destructive ring-destructive' : ''}`}
                />
              </div>
              {errors.imageUrl && (
                <p className="text-[11px] text-destructive flex items-center gap-1 mt-1">
                  <AlertCircle className="size-3 shrink-0" /> {errors.imageUrl}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <Check className="size-3.5 mr-1.5" />
                  <span>
                    {isEditing ? 'Enregistrer les modifications' : 'Ajouter au catalogue'}
                  </span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
