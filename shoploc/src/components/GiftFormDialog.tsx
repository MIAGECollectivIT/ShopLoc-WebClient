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
import { Switch } from '@/components/ui/switch';
import { giftSchema } from '@/lib/validation/gift';
import { calculatePointsEuroEquivalent } from '@/lib/validation/loyalty';
import { createGift, getStoreLoyaltyRate, updateGift } from '@/lib/api';
import { resolveGiftImageUrl } from '@/lib/image';
import type { LoyaltyGift, GiftCreateRequest, GiftUpdateRequest } from '@/types/gift';
import type { MerchantLoyaltyRate } from '@/types/loyalty';
import {
  Coins,
  PackagePlus,
  Edit,
  Upload,
  Loader2,
  AlertCircle,
  Check,
  Trash2,
  RefreshCw,
  Image as ImageIcon,
  Crown,
} from 'lucide-react';

interface GiftFormDialogProps {
  storeUid: string;
  gift?: LoyaltyGift | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedGift: LoyaltyGift) => void;
}

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 Mo

export function GiftFormDialog({
  storeUid,
  gift,
  isOpen,
  onClose,
  onSuccess,
}: GiftFormDialogProps) {
  const isEditing = Boolean(gift);

  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [pointsCost, setPointsCost] = React.useState('');
  const [stock, setStock] = React.useState('0');
  const [imageUrl, setImageUrl] = React.useState('');
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isImageRemoved, setIsImageRemoved] = React.useState(false);
  const [vfpExclusive, setVfpExclusive] = React.useState(false);

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [loyaltyRate, setLoyaltyRate] = React.useState<MerchantLoyaltyRate | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    getStoreLoyaltyRate(storeUid)
      .then((rate) => {
        if (isMounted) setLoyaltyRate(rate);
      })
      .catch(() => {
        if (isMounted) setLoyaltyRate(null);
      });
    return () => {
      isMounted = false;
    };
  }, [isOpen, storeUid]);

  const parsedPoints = Number(pointsCost);
  const equivalentEuros = React.useMemo(() => {
    if (!loyaltyRate || !Number.isFinite(parsedPoints) || parsedPoints <= 0) {
      return 0;
    }
    return calculatePointsEuroEquivalent(
      loyaltyRate.euroAmount,
      loyaltyRate.pointsReward,
      parsedPoints
    );
  }, [loyaltyRate, parsedPoints]);

  // Initialize or reset form when modal opens or gift changes
  React.useEffect(() => {
    if (gift) {
      setName(gift.name);
      setDescription(gift.description || '');
      setPointsCost(String(gift.pointsCost));
      setStock(String(gift.stock));
      setImageUrl(gift.imageUrl || '');
      setIsImageRemoved(false);
      setVfpExclusive(Boolean(gift.vfpExclusive));

      const initialPreview = gift.imageUrl?.trim()
        ? resolveGiftImageUrl({
            storeUid,
            giftUid: gift.uid,
            imageUrl: gift.imageUrl,
          })
        : null;
      setPreviewUrl(initialPreview);
    } else {
      setName('');
      setDescription('');
      setPointsCost('');
      setStock('0');
      setImageUrl('');
      setPreviewUrl(null);
      setIsImageRemoved(false);
      setVfpExclusive(false);
    }
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setErrors({});
    setServerError(null);
  }, [gift, isOpen, storeUid]);

  // Revoke object URL when unmounting or replacing
  React.useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const processFile = (file: File) => {
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

    if (previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setIsImageRemoved(false);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setImageUrl('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = () => {
    if (previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setImageUrl('');
    setIsImageRemoved(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    const rawValues = {
      name,
      description: description.trim() || undefined,
      pointsCost,
      stock,
      imageUrl: selectedFile || isImageRemoved ? undefined : imageUrl.trim() || undefined,
      vfpExclusive,
    };

    const result = giftSchema.safeParse(rawValues);
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
      let saved: LoyaltyGift;
      if (isEditing && gift) {
        const payload: GiftUpdateRequest = {
          name: validated.name,
          description: validated.description || undefined,
          pointsCost: validated.pointsCost,
          vfpExclusive: validated.vfpExclusive,
        };
        if (selectedFile) {
          saved = await updateGift(storeUid, gift.uid, payload, selectedFile);
        } else if (isImageRemoved) {
          saved = await updateGift(storeUid, gift.uid, {
            ...payload,
            imageUrl: '',
          });
        } else {
          saved = await updateGift(storeUid, gift.uid, {
            ...payload,
            imageUrl: gift.imageUrl || undefined,
          });
        }
      } else {
        const payload: GiftCreateRequest = {
          name: validated.name,
          description: validated.description || undefined,
          pointsCost: validated.pointsCost,
          stock: validated.stock,
          imageUrl: selectedFile ? undefined : validated.imageUrl || undefined,
          vfpExclusive: validated.vfpExclusive,
        };
        saved = await createGift(storeUid, payload, selectedFile || undefined);
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
                {isEditing ? "Modifier l'article cadeau" : 'Ajouter un article cadeau'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {isEditing
                  ? 'Mettez à jour les informations, la photo, le coût en points ou l’inventaire de cet article.'
                  : 'Renseignez les détails du cadeau fidélité pour l’ajouter à votre vitrine récompenses.'}
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
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="gift-name" className="text-xs font-semibold">
              Nom de l'article cadeau <span className="text-destructive">*</span>
            </Label>
            <Input
              id="gift-name"
              placeholder="Ex: Mug ShopLoc en céramique artisanale"
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

          {/* Description */}
          <div className="space-y-1.5">
            <Label
              htmlFor="gift-description"
              className="text-xs font-semibold flex items-center justify-between"
            >
              <span>Description</span>
              <span className="text-muted-foreground font-normal">(Optionnelle)</span>
            </Label>
            <textarea
              id="gift-description"
              rows={2}
              placeholder="Caractéristiques, conditions d'échange, modèle..."
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

          {/* Points Cost & Stock (Points replaces Price!) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="gift-points" className="text-xs font-semibold">
                Coût en points fidélité <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="gift-points"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Ex: 50"
                  value={pointsCost}
                  onChange={(e) => setPointsCost(e.target.value)}
                  disabled={isSubmitting}
                  className={`pr-14 ${errors.pointsCost ? 'border-destructive ring-destructive' : ''}`}
                />
                <span className="absolute right-2.5 top-2 text-xs font-semibold text-muted-foreground pointer-events-none flex items-center gap-1">
                  <Coins className="size-3.5 text-amber-500" />
                  <span>pts</span>
                </span>
              </div>
              {errors.pointsCost && (
                <p className="text-[11px] text-destructive flex items-center gap-1">
                  <AlertCircle className="size-3 shrink-0" /> {errors.pointsCost}
                </p>
              )}
              {loyaltyRate && equivalentEuros > 0 && (
                <p className="pt-1 text-left text-base font-normal text-foreground">
                  ➔ équivalent à{' '}
                  <span className="text-primary font-semibold">{equivalentEuros.toFixed(2)} €</span>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gift-stock" className="text-xs font-semibold">
                {isEditing ? 'Stock actuel' : 'Stock initial (Unités)'}{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="gift-stock"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                disabled={isSubmitting || isEditing}
                className={errors.stock ? 'border-destructive ring-destructive' : ''}
              />
              {isEditing ? (
                <p className="text-[11px] text-muted-foreground">
                  Utilisez les boutons d'ajustement (+ / -) sur le tableau pour faire évoluer le
                  stock.
                </p>
              ) : errors.stock ? (
                <p className="text-[11px] text-destructive flex items-center gap-1">
                  <AlertCircle className="size-3 shrink-0" /> {errors.stock}
                </p>
              ) : null}
            </div>
          </div>

          {/* VFP Exclusive Toggle */}
          <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
                <Crown className="size-4" />
              </div>
              <div className="space-y-0.5">
                <Label
                  htmlFor="gift-vfp-exclusive"
                  className="text-xs font-semibold text-foreground cursor-pointer"
                >
                  Réservé aux membres VFP
                </Label>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Ce cadeau sera mis en avant dans l&apos;onglet Privilèges VFP et uniquement
                  accessible aux clients disposant du statut VFP.
                </p>
              </div>
            </div>
            <Switch
              id="gift-vfp-exclusive"
              checked={vfpExclusive}
              onCheckedChange={setVfpExclusive}
              disabled={isSubmitting}
              aria-label="Réserver ce cadeau aux membres VFP"
            />
          </div>

          {/* Photo Management */}
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs font-semibold flex items-center justify-between">
              <span>Photo du cadeau</span>
              <span className="text-[11px] text-muted-foreground font-normal">
                Image d'illustration
              </span>
            </Label>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              id="gift-file-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
              disabled={isSubmitting}
            />

            {/* Preview Box with Actions */}
            {previewUrl ? (
              <div className="space-y-2">
                <div className="relative rounded-lg overflow-hidden border border-border h-40 bg-muted/30 flex items-center justify-center group">
                  <img
                    src={previewUrl}
                    alt="Aperçu du cadeau"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />

                  {/* Hover action overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-8 text-xs gap-1.5 shadow"
                      onClick={triggerFileSelect}
                      disabled={isSubmitting}
                    >
                      <RefreshCw className="size-3.5" />
                      Changer l'image
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="h-8 text-xs gap-1.5 shadow"
                      onClick={handleRemoveImage}
                      disabled={isSubmitting}
                    >
                      <Trash2 className="size-3.5" />
                      Supprimer
                    </Button>
                  </div>
                </div>

                {/* Status bar */}
                <div className="flex items-center justify-between gap-2 px-0.5">
                  <div className="text-xs truncate">
                    {selectedFile ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 truncate">
                        <Check className="size-3.5 shrink-0" />
                        <span className="truncate">
                          Prête : {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} Ko)
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <ImageIcon className="size-3.5 shrink-0" />
                        Visuel configuré
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={triggerFileSelect}
                      disabled={isSubmitting}
                    >
                      <Upload className="size-3" />
                      Changer
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                      onClick={handleRemoveImage}
                      disabled={isSubmitting}
                    >
                      <Trash2 className="size-3" />
                      Supprimer
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* Dropzone when no preview exists */
              <div
                role="button"
                tabIndex={0}
                onClick={triggerFileSelect}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    triggerFileSelect();
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    processFile(file);
                  }
                }}
                className="border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 rounded-lg p-5 flex flex-col items-center justify-center cursor-pointer transition-colors"
              >
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                  <Upload className="size-5" />
                </div>
                <p className="text-xs font-medium text-foreground">
                  Glissez une image ou{' '}
                  <span className="text-primary underline">parcourez vos fichiers</span>
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  JPEG, PNG ou WebP (max 10 Mo)
                </p>
              </div>
            )}

            {errors.file && (
              <p className="text-[11px] text-destructive flex items-center gap-1">
                <AlertCircle className="size-3 shrink-0" /> {errors.file}
              </p>
            )}
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
            <Button type="submit" size="sm" disabled={isSubmitting} className="gap-1.5">
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <Check className="size-3.5" />
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
