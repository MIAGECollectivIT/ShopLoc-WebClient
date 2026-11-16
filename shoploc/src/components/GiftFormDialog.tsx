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
import { giftSchema } from '@/lib/validation/gift';
import { createGift, updateGift } from '@/lib/api';
import type { LoyaltyGift, GiftCreateRequest, GiftUpdateRequest } from '@/types/gift';
import { Gift, Edit, Loader2, AlertCircle } from 'lucide-react';

interface GiftFormDialogProps {
  storeId: number;
  gift?: LoyaltyGift | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedGift: LoyaltyGift) => void;
}

export function GiftFormDialog({ storeId, gift, isOpen, onClose, onSuccess }: GiftFormDialogProps) {
  const isEditing = Boolean(gift);

  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [pointsCost, setPointsCost] = React.useState('');
  const [stock, setStock] = React.useState('0');
  const [imageUrl, setImageUrl] = React.useState('');

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Initialize or reset form when modal opens or gift changes
  React.useEffect(() => {
    if (gift) {
      setName(gift.name);
      setDescription(gift.description || '');
      setPointsCost(String(gift.pointsCost));
      setStock(String(gift.stock));
      setImageUrl(gift.imageUrl || '');
    } else {
      setName('');
      setDescription('');
      setPointsCost('');
      setStock('0');
      setImageUrl('');
    }
    setErrors({});
    setServerError(null);
  }, [gift, isOpen]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    const rawValues = {
      name,
      description: description.trim() || undefined,
      pointsCost,
      stock,
      imageUrl: imageUrl.trim() || undefined,
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
          imageUrl: validated.imageUrl || undefined,
        };
        saved = await updateGift(storeId, gift.id, payload);
      } else {
        const payload: GiftCreateRequest = {
          name: validated.name,
          description: validated.description || undefined,
          pointsCost: validated.pointsCost,
          stock: validated.stock,
          imageUrl: validated.imageUrl || undefined,
        };
        saved = await createGift(storeId, payload);
      }
      onSuccess(saved);
      onClose();
    } catch (err: unknown) {
      setServerError(
        err instanceof Error ? err.message : 'Une erreur est survenue lors de l’enregistrement.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              {isEditing ? <Edit className="size-5" /> : <Gift className="size-5" />}
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                {isEditing ? "Modifier l'article cadeau" : 'Ajouter un article cadeau'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {isEditing
                  ? 'Modifiez les informations et le coût en points de cet article.'
                  : 'Proposez un nouveau cadeau que vos clients pourront obtenir avec leurs points.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {serverError && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg flex items-start gap-2 text-xs">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="gift-name" className="text-xs font-medium">
              Nom du cadeau <span className="text-destructive">*</span>
            </Label>
            <Input
              id="gift-name"
              placeholder="Ex: Mug ShopLoc en céramique"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gift-description" className="text-xs font-medium">
              Description (facultative)
            </Label>
            <textarea
              id="gift-description"
              rows={3}
              placeholder="Ex: Mug de collection en céramique fabriqué localement."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              className={`w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
                errors.description ? 'border-destructive' : ''
              }`}
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="gift-points" className="text-xs font-medium">
                Coût en points fidélité <span className="text-destructive">*</span>
              </Label>
              <Input
                id="gift-points"
                type="number"
                min="1"
                step="1"
                placeholder="Ex: 50"
                value={pointsCost}
                onChange={(e) => setPointsCost(e.target.value)}
                disabled={isSubmitting}
                className={errors.pointsCost ? 'border-destructive' : ''}
              />
              {errors.pointsCost && <p className="text-xs text-destructive">{errors.pointsCost}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gift-stock" className="text-xs font-medium">
                {isEditing ? 'Stock actuel' : 'Stock initial'}{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="gift-stock"
                type="number"
                min="0"
                step="1"
                placeholder="Ex: 10"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                disabled={isSubmitting || isEditing}
                className={errors.stock ? 'border-destructive' : ''}
              />
              {isEditing ? (
                <p className="text-[11px] text-muted-foreground">
                  Utilisez les boutons d'ajustement (+ / -) sur le tableau pour faire évoluer le
                  stock.
                </p>
              ) : errors.stock ? (
                <p className="text-xs text-destructive">{errors.stock}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gift-image" className="text-xs font-medium">
              URL de l'image (facultative)
            </Label>
            <Input
              id="gift-image"
              type="url"
              placeholder="https://cdn.example.com/gifts/mug.png"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              disabled={isSubmitting}
              className={errors.imageUrl ? 'border-destructive' : ''}
            />
            {errors.imageUrl && <p className="text-xs text-destructive">{errors.imageUrl}</p>}
          </div>

          {imageUrl.trim() && (
            <div className="flex items-center gap-3 p-2 bg-muted/40 rounded-lg border border-border">
              <img
                src={imageUrl.trim()}
                alt="Aperçu du cadeau"
                className="size-14 rounded object-cover border border-border shrink-0 bg-background"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground block">Aperçu visuel</span>
                <span>L'image sera affichée dans le catalogue de récompenses.</span>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
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
                  <Gift className="size-3.5" />
                  <span>{isEditing ? 'Enregistrer les modifications' : 'Créer le cadeau'}</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
