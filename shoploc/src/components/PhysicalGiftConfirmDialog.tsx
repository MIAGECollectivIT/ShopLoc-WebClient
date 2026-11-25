import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { LoyaltyGift } from '@/types/gift';
import { Gift, CheckCircle2, Loader2 } from 'lucide-react';

export interface SelectedGiftLineItem {
  gift: LoyaltyGift;
  quantity: number;
  subtotalPoints: number;
}

export interface PhysicalGiftConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerDisplayName: string;
  clientCode: string;
  selectedItems: SelectedGiftLineItem[];
  availablePoints: number;
  totalSelectedPoints: number;
  projectedRemainingPoints: number;
  isSubmitting: boolean;
  onConfirm: () => void;
}

/**
 * Confirmation modal summarizing selected physical gifts and projected points deduction (SLE-43).
 */
export function PhysicalGiftConfirmDialog({
  open,
  onOpenChange,
  customerDisplayName,
  clientCode,
  selectedItems,
  availablePoints,
  totalSelectedPoints,
  projectedRemainingPoints,
  isSubmitting,
  onConfirm,
}: PhysicalGiftConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="size-5 text-muted-foreground" />
            <span>Confirmer la remise de cadeaux</span>
          </DialogTitle>
          <DialogDescription>
            Vérifiez le récapitulatif avant de débiter les points de{' '}
            <strong className="text-foreground">{customerDisplayName}</strong> (
            <span className="font-mono">{clientCode}</span>).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="divide-y divide-border rounded-lg border border-border bg-muted/20 p-3 text-xs space-y-2">
            {selectedItems.map((item) => (
              <div
                key={item.gift.uid}
                className="flex items-center justify-between gap-2 pt-2 first:pt-0"
              >
                <span className="font-medium text-foreground">
                  {item.quantity}× {item.gift.name}
                </span>
                <span className="font-mono font-semibold text-muted-foreground">
                  {item.subtotalPoints} pts
                </span>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border bg-background p-3 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Solde actuel vérifié</span>
              <span className="font-semibold">{availablePoints.toFixed(1)} pts</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-foreground font-medium">Total à débiter</span>
              <span className="text-red-600 dark:text-red-400 font-bold">
                -{totalSelectedPoints} pts
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-1.5">
              <span className="text-foreground font-medium">Solde restant après validation</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                {projectedRemainingPoints.toFixed(1)} pts
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Débit en cours...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                <span>Confirmer et débiter ({totalSelectedPoints} pts)</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
