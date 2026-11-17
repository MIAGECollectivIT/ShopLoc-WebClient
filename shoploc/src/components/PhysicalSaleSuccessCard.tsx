import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { CustomerIdentificationResponse } from '@/types/user';
import type { PhysicalSaleResponse } from '@/types/sales';
import {
  CheckCircle2,
  Receipt,
  Coins,
  QrCode,
  RotateCcw,
  Sparkles,
  Store,
  UserCheck,
  Calendar,
  CreditCard,
} from 'lucide-react';
import { cn } from 'cn';

export interface PhysicalSaleSuccessCardProps {
  receipt: PhysicalSaleResponse;
  customer: CustomerIdentificationResponse;
  storeName?: string;
  onNewSale: () => void;
  onReset: () => void;
  className?: string;
}

/**
 * Receipt & Confirmation card displayed after successful in-store physical checkout.
 * Confirms payment recording, transaction reference, and awarded loyalty points.
 */
export function PhysicalSaleSuccessCard({
  receipt,
  customer,
  storeName,
  onNewSale,
  onReset,
  className,
}: PhysicalSaleSuccessCardProps) {
  const customerDisplayName = `${customer.firstName} ${customer.lastNameMasked}`.trim();

  return (
    <Card
      className={cn(
        'w-full max-w-lg border-2 border-emerald-500/40 bg-gradient-to-b from-card via-card to-emerald-500/5 shadow-xl',
        className
      )}
    >
      <CardHeader className="text-center pb-3">
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <Badge
            variant="outline"
            className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 gap-1.5 py-1 px-3 text-xs font-semibold"
          >
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            <span>Paiement & Vente Enregistrés</span>
          </Badge>
        </div>

        {storeName && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground font-medium mb-1">
            <Store className="size-3.5 text-primary" />
            <span className="truncate max-w-[200px]">{storeName}</span>
          </div>
        )}

        <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/20 mb-2">
          <Receipt className="size-8 stroke-[1.75]" />
        </div>

        <CardTitle className="text-2xl font-bold text-foreground">Encaissement Validé</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          La transaction physique a été enregistrée et les points de fidélité ont été crédités.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {/* Prominent Amount & Points Hero Section */}
        <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-background/80 border border-border/80 text-center">
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
              Montant Encaissé
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {Number(receipt.amount).toFixed(2)} €
            </span>
          </div>

          <div className="space-y-0.5 border-l border-border/60 pl-3">
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider block flex items-center justify-center gap-1">
              <Sparkles className="size-3 text-amber-500" />
              Points Crédités
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
              <Coins className="size-6 text-amber-500 shrink-0" />+
              {Number(receipt.pointsEarned).toFixed(1)}
            </span>
          </div>
        </div>

        {/* Detailed Receipt Audit Info */}
        <div className="divide-y divide-border/60 rounded-xl border border-border/80 bg-background/50 p-3.5 text-xs space-y-2.5">
          {/* Customer */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <UserCheck className="size-3.5 text-primary" />
              <span>Client bénéficiaire</span>
            </span>
            <span className="font-semibold text-foreground">{customerDisplayName}</span>
          </div>

          {/* Client Code */}
          <div className="flex items-center justify-between pt-2.5">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <QrCode className="size-3.5 text-primary" />
              <span>Code fidélité</span>
            </span>
            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
              {receipt.clientCode}
            </span>
          </div>

          {/* Transaction Reference */}
          <div className="flex items-center justify-between pt-2.5">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Receipt className="size-3.5 text-primary" />
              <span>Référence ticket</span>
            </span>
            <span className="font-mono text-[11px] font-medium text-foreground">
              {receipt.transactionReference}
            </span>
          </div>

          {/* Applied Store Rate */}
          <div className="flex items-center justify-between pt-2.5">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Store className="size-3.5 text-primary" />
              <span>Barème appliqué</span>
            </span>
            <span className="font-mono text-xs text-foreground/90 font-medium">
              {receipt.pointsRateApplied}
            </span>
          </div>

          {/* Timestamp */}
          <div className="flex items-center justify-between pt-2.5">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Calendar className="size-3.5 text-primary" />
              <span>Horodatage UTC</span>
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {new Date(receipt.timestamp).toLocaleString('fr-FR')}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col sm:flex-row gap-2 pt-2 pb-6 border-t border-border bg-muted/10">
        <Button
          type="button"
          variant="outline"
          onClick={onNewSale}
          className="w-full sm:w-1/2 h-10 gap-1.5 text-xs font-semibold"
        >
          <CreditCard className="size-3.5 text-primary" />
          <span>Autre vente pour ce client</span>
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
