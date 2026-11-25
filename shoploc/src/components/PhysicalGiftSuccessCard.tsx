import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { CustomerIdentificationResponse } from '@/types/user';
import type { PhysicalGiftRedemptionResponse } from '@/types/gift';
import { Gift, Coins, QrCode, RotateCcw, Store, UserCheck, Calendar, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PhysicalGiftSuccessCardProps {
  receipt: PhysicalGiftRedemptionResponse;
  customer: CustomerIdentificationResponse;
  storeName?: string;
  onNewOperation: () => void;
  onReset: () => void;
  className?: string;
}

/**
 * Confirmation receipt card displayed after successful physical gift redemption (Story SLE-43).
 */
export function PhysicalGiftSuccessCard({
  receipt,
  customer,
  storeName,
  onNewOperation,
  onReset,
  className,
}: PhysicalGiftSuccessCardProps) {
  const customerDisplayName = `${customer.firstName} ${customer.lastNameMasked}`.trim();

  return (
    <Card
      className={cn(
        'w-full max-w-lg border-2 border-zinc-400/40 dark:border-zinc-600/50 bg-gradient-to-b from-card via-card to-muted/30 shadow-xl',
        className
      )}
    >
      <CardHeader className="text-center pb-3">
        {(storeName || receipt.storeName) && (
          <div className="flex items-center justify-center gap-2 text-lg font-bold text-foreground mb-2">
            <Store className="size-5 text-muted-foreground shrink-0" />
            <span className="truncate max-w-[260px]">{storeName || receipt.storeName}</span>
          </div>
        )}

        <div className="size-16 rounded-full bg-muted text-muted-foreground mx-auto flex items-center justify-center border border-border mb-2">
          <Gift className="size-8 stroke-[1.75]" />
        </div>

        <CardTitle className="text-2xl font-bold text-foreground">Points Débités</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          La remise physique des cadeaux a été enregistrée et le solde fidélité a été mis à jour.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {/* Points Deducted & Remaining Balance */}
        <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-background/80 border border-border/80 text-center">
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
              Points Débités
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-red-600 dark:text-red-400 flex items-center justify-center gap-1">
              -{Number(receipt.pointsDeducted).toFixed(1)}
            </span>
          </div>

          <div className="space-y-0.5 border-l border-border/60 pl-3">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
              Nouveau Solde
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
              <Coins className="size-5 text-amber-500 shrink-0" />
              {Number(receipt.remainingBalance).toFixed(1)}
            </span>
          </div>
        </div>

        {/* Redeemed Items List */}
        <div className="divide-y divide-border/60 rounded-xl border border-border/80 bg-background/50 p-3.5 text-xs space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
            Lots remis en boutique
          </span>
          {receipt.items.map((item) => (
            <div key={item.giftUid} className="flex items-center justify-between pt-2">
              <span className="font-medium text-foreground">
                {item.quantity}× {item.name}
              </span>
              <span className="font-mono font-semibold text-muted-foreground">
                {item.totalPointsCost} pts
              </span>
            </div>
          ))}
        </div>

        {/* Audit Info */}
        <div className="divide-y divide-border/60 rounded-xl border border-border/80 bg-background/50 p-3.5 text-xs space-y-2.5">
          <div className="flex items-center justify-between pt-1">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <UserCheck className="size-3.5 text-primary" />
              <span>Client</span>
            </span>
            <span className="font-semibold text-foreground">{customerDisplayName}</span>
          </div>

          <div className="flex items-center justify-between pt-2.5">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <QrCode className="size-3.5 text-primary" />
              <span>Code fidélité</span>
            </span>
            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
              {receipt.clientCode || customer.clientCode}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2.5">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Receipt className="size-3.5 text-primary" />
              <span>Référence</span>
            </span>
            <span className="font-mono text-[11px] font-medium text-foreground">
              {receipt.transactionReference}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2.5">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Calendar className="size-3.5 text-primary" />
              <span>Date</span>
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {new Date(receipt.redeemedAt).toLocaleString('fr-FR')}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col sm:flex-row gap-2 pt-2 pb-6 border-t border-border bg-muted/10">
        <Button
          type="button"
          variant="outline"
          onClick={onNewOperation}
          className="w-full sm:w-1/2 h-10 gap-1.5 text-xs font-semibold"
        >
          <Gift className="size-3.5 text-muted-foreground" />
          <span>Autre opération client</span>
        </Button>

        <Button
          type="button"
          variant="default"
          onClick={onReset}
          className="w-full sm:w-1/2 h-10 gap-1.5 text-xs font-semibold bg-primary text-primary-foreground"
        >
          <RotateCcw className="size-3.5" />
          <span>Client suivant (Scanner)</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
