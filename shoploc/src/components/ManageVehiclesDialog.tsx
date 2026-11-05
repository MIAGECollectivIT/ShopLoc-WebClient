import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Car, Plus, Pencil, Trash2, Check, X, AlertCircle, Loader2 } from 'lucide-react';
import { FrenchLicensePlateBadge } from './FrenchLicensePlateBadge';
import { LicensePlateLegalNotice } from './LicensePlateLegalNotice';
import {
  licensePlateSchema,
  normalizeLicensePlate,
  isValidFrenchLicensePlate,
} from '@/lib/validation/licensePlate';

export interface ManageVehiclesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  licensePlates: string[];
  onAddPlate?: (plate: string) => Promise<void> | void;
  onUpdatePlate?: (oldPlate: string, newPlate: string) => Promise<void> | void;
  onDeletePlate?: (plate: string) => Promise<void> | void;
}

export function ManageVehiclesDialog({
  open,
  onOpenChange,
  licensePlates,
  onAddPlate,
  onUpdatePlate,
  onDeletePlate,
}: ManageVehiclesDialogProps) {
  const [inputValue, setInputValue] = React.useState('');
  const [editingPlate, setEditingPlate] = React.useState<string | null>(null);
  const [confirmDeletePlate, setConfirmDeletePlate] = React.useState<string | null>(null);
  const [inputError, setInputError] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Reset form state when dialog opens or closes
  React.useEffect(() => {
    if (!open) {
      setInputValue('');
      setEditingPlate(null);
      setConfirmDeletePlate(null);
      setInputError(null);
      setActionError(null);
      setSuccessMessage(null);
      setIsSubmitting(false);
    }
  }, [open]);

  // Real-time validation and preview
  const trimmedInput = inputValue.trim();
  const normalizedCandidate = trimmedInput ? normalizeLicensePlate(trimmedInput) : '';
  const isValidFormat = trimmedInput.length > 0 && isValidFrenchLicensePlate(trimmedInput);

  const isDuplicate = React.useMemo(() => {
    if (!normalizedCandidate) return false;
    return licensePlates.some((existing) => {
      if (editingPlate && existing.toUpperCase() === editingPlate.toUpperCase()) {
        return false; // Self-match during edit is allowed
      }
      return existing.toUpperCase() === normalizedCandidate.toUpperCase();
    });
  }, [normalizedCandidate, licensePlates, editingPlate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.toUpperCase();
    setInputValue(rawVal);
    setInputError(null);
    setActionError(null);
    setSuccessMessage(null);

    if (rawVal.trim().length > 0) {
      const result = licensePlateSchema.safeParse(rawVal);
      if (!result.success) {
        setInputError(result.error.issues[0]?.message || 'Format invalide');
      } else if (
        licensePlates.some(
          (p) =>
            (!editingPlate || p.toUpperCase() !== editingPlate.toUpperCase()) &&
            p.toUpperCase() === normalizeLicensePlate(rawVal).toUpperCase()
        )
      ) {
        setInputError('Cette plaque est déjà enregistrée sur votre compte');
      }
    }
  };

  const startEditPlate = (plate: string) => {
    setEditingPlate(plate);
    setInputValue(plate);
    setInputError(null);
    setActionError(null);
    setSuccessMessage(null);
    setConfirmDeletePlate(null);
  };

  const cancelEdit = () => {
    setEditingPlate(null);
    setInputValue('');
    setInputError(null);
    setActionError(null);
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!trimmedInput) {
      setInputError("Veuillez saisir un numéro d'immatriculation");
      return;
    }

    const result = licensePlateSchema.safeParse(trimmedInput);
    if (!result.success) {
      setInputError(result.error.issues[0]?.message || 'Format invalide');
      return;
    }

    const finalPlate = normalizeLicensePlate(trimmedInput);

    if (isDuplicate) {
      setInputError('Cette plaque est déjà enregistrée sur votre compte');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    setSuccessMessage(null);

    try {
      if (editingPlate) {
        if (editingPlate.toUpperCase() !== finalPlate.toUpperCase() && onUpdatePlate) {
          await onUpdatePlate(editingPlate, finalPlate);
        }
        setSuccessMessage(`La plaque ${finalPlate} a été mise à jour avec succès.`);
        setEditingPlate(null);
      } else if (onAddPlate) {
        await onAddPlate(finalPlate);
        setSuccessMessage(`La plaque ${finalPlate} a été ajoutée à vos véhicules.`);
      }
      setInputValue('');
      setInputError(null);
    } catch (err: unknown) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue lors de l'enregistrement de la plaque."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (plate: string) => {
    setIsSubmitting(true);
    setActionError(null);
    setSuccessMessage(null);
    try {
      if (onDeletePlate) {
        await onDeletePlate(plate);
      }
      setSuccessMessage(`La plaque ${plate} a été supprimée.`);
      if (editingPlate === plate) {
        cancelEdit();
      }
      setConfirmDeletePlate(null);
    } catch (err: unknown) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue lors de la suppression de la plaque.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Car className="size-5 text-primary" />
            <span>Gestion des Plaques d'Immatriculation</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Ajoutez, modifiez ou retirez vos véhicules pour bénéficier des avantages de
            stationnement.
          </DialogDescription>
        </DialogHeader>

        {/* Mention légale RGPD */}
        <LicensePlateLegalNotice />

        {/* Message de succès */}
        {successMessage && (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs">
            <Check className="size-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Message d'erreur global d'action (API) */}
        {actionError && (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-xs">
            <AlertCircle className="size-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Formulaire d'ajout / de modification */}
        <form onSubmit={handleSubmit} className="p-4 rounded-xl border bg-muted/20 space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="license-plate-input" className="text-xs font-semibold">
              {editingPlate ? (
                <span className="flex items-center gap-1.5 text-primary">
                  <Pencil className="size-3.5" />
                  <span>Modifier la plaque ({editingPlate})</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-foreground">
                  <Plus className="size-3.5" />
                  <span>Ajouter une nouvelle immatriculation</span>
                </span>
              )}
            </Label>
            {editingPlate && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={cancelEdit}
                disabled={isSubmitting}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Annuler la modification
              </Button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 space-y-1">
              <Input
                id="license-plate-input"
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Ex: AA-123-AA ou 1234 AB 75"
                maxLength={12}
                disabled={isSubmitting}
                className="font-mono tracking-wider uppercase h-9 text-sm"
                aria-invalid={!!inputError}
              />
              {inputError && (
                <p className="text-[11px] text-destructive flex items-center gap-1 mt-1">
                  <AlertCircle className="size-3 shrink-0" />
                  <span>{inputError}</span>
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || !trimmedInput || !isValidFormat || isDuplicate}
              size="sm"
              className="h-9 gap-1.5 sm:self-start"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>En cours...</span>
                </>
              ) : editingPlate ? (
                <>
                  <Check className="size-4" />
                  <span>Enregistrer</span>
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  <span>Ajouter</span>
                </>
              )}
            </Button>
          </div>

          {/* Prévisualisation dynamique en direct si le format est valide */}
          {isValidFormat && !isDuplicate && (
            <div className="pt-2 border-t border-muted/40 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Aperçu du format standard :</span>
              <FrenchLicensePlateBadge plate={normalizedCandidate} size="sm" />
            </div>
          )}
        </form>

        {/* Liste des plaques actuellement enregistrées */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Véhicules enregistrés
            </h4>
            <Badge variant="secondary" className="font-mono text-[11px]">
              {licensePlates.length} {licensePlates.length > 1 ? 'véhicules' : 'véhicule'}
            </Badge>
          </div>

          {licensePlates.length > 0 ? (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {licensePlates.map((plate) => {
                const isBeingEdited = editingPlate === plate;
                const isConfirmingDelete = confirmDeletePlate === plate;

                return (
                  <div
                    key={plate}
                    className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                      isBeingEdited
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                        : 'bg-background hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FrenchLicensePlateBadge plate={plate} size="sm" />
                      {isBeingEdited && (
                        <Badge variant="outline" className="text-[10px] text-primary">
                          En cours de modification
                        </Badge>
                      )}
                    </div>

                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                        <span className="text-[11px] text-destructive font-medium mr-1 hidden sm:inline">
                          Supprimer ?
                        </span>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={isSubmitting}
                          onClick={() => handleDelete(plate)}
                          className="h-7 px-2 text-xs gap-1"
                        >
                          {isSubmitting ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Check className="size-3" />
                          )}
                          <span>Oui</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isSubmitting}
                          onClick={() => setConfirmDeletePlate(null)}
                          className="h-7 px-2 text-xs"
                        >
                          <X className="size-3" />
                          <span>Non</span>
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={isSubmitting}
                          onClick={() => startEditPlate(plate)}
                          className="text-muted-foreground hover:text-foreground size-8"
                          title="Modifier la plaque"
                        >
                          <Pencil className="size-3.5" />
                          <span className="sr-only">Modifier</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={isSubmitting}
                          onClick={() => setConfirmDeletePlate(plate)}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 size-8"
                          title="Supprimer la plaque"
                        >
                          <Trash2 className="size-3.5" />
                          <span className="sr-only">Supprimer</span>
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center p-6 border border-dashed rounded-xl bg-muted/10 text-muted-foreground">
              <Car className="size-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-xs font-medium">Aucun véhicule enregistré pour le moment</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Utilisez le formulaire ci-dessus pour associer votre première plaque.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <DialogClose render={<Button variant="outline" size="sm" />}>Fermer</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
