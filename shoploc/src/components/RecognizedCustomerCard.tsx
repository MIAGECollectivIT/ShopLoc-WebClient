import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { CustomerIdentificationResponse } from '@/types/user';
import {
  ShieldCheck,
  UserCheck,
  Mail,
  QrCode,
  Calendar,
  RotateCcw,
  Coins,
  Gift,
  CheckCircle2,
} from 'lucide-react';
import { cn } from 'cn';

export interface RecognizedCustomerCardProps {
  customer: CustomerIdentificationResponse;
  onReset: () => void;
  className?: string;
}

/**
 * Displays the verified customer identity with GDPR-masked personal data.
 * Confirms customer account recognition to the partner merchant.
 */
export function RecognizedCustomerCard({
  customer,
  onReset,
  className,
}: RecognizedCustomerCardProps) {
  const displayName = `${customer.firstName} ${customer.lastNameMasked}`.trim();

  return (
    <Card
      className={cn(
        'w-full max-w-md overflow-hidden border-2 border-emerald-500/40 bg-gradient-to-b from-card via-card to-emerald-500/5 shadow-lg',
        className
      )}
    >
      <CardHeader className="text-center pb-3">
        {/* Verification Success Badge */}
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <Badge
            variant="outline"
            className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 gap-1.5 py-1 px-3 text-xs font-semibold"
          >
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            <span>Compte client reconnu et vérifié</span>
          </Badge>
        </div>

        <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/20 mb-2">
          <UserCheck className="size-8 stroke-[1.75]" />
        </div>

        <CardTitle className="text-xl sm:text-2xl font-bold text-foreground">
          {displayName}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Données sensibles masquées conformément au RGPD</span>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {/* Customer Identity Information List */}
        <div className="divide-y divide-border/60 rounded-xl border border-border/80 bg-background/60 backdrop-blur-xs p-3.5 text-sm space-y-2.5">
          {/* Client Code */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <QrCode className="size-3.5 text-primary" />
              <span>Code fidélité</span>
            </span>
            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 tracking-wider">
              {customer.clientCode}
            </span>
          </div>

          {/* Masked Email */}
          <div className="flex items-center justify-between pt-2.5">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Mail className="size-3.5 text-primary" />
              <span>Email client</span>
            </span>
            <span className="font-mono text-xs text-foreground/90 font-medium">
              {customer.emailMasked || 'Non renseigné'}
            </span>
          </div>

          {/* Member Since Year */}
          {customer.memberSinceYear && (
            <div className="flex items-center justify-between pt-2.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Calendar className="size-3.5 text-primary" />
                <span>Membre depuis</span>
              </span>
              <span className="text-xs font-semibold text-foreground">
                {customer.memberSinceYear}
              </span>
            </div>
          )}
        </div>

        {/* Future Action Shortcuts */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled
            className="h-9 text-xs gap-1.5 border-dashed"
            title="Fonctionnalité disponible dans la prochaine étape"
          >
            <Coins className="size-3.5 text-amber-500" />
            <span>Créditer points</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled
            className="h-9 text-xs gap-1.5 border-dashed"
            title="Fonctionnalité disponible dans la prochaine étape"
          >
            <Gift className="size-3.5 text-purple-500" />
            <span>Valider un lot</span>
          </Button>
        </div>

        {/* Reset / New Scan Button */}
        <Button
          type="button"
          variant="default"
          onClick={onReset}
          className="w-full h-10 gap-2 mt-2 font-medium"
        >
          <RotateCcw className="size-4" />
          <span>Scanner ou saisir un autre client</span>
        </Button>
      </CardContent>
    </Card>
  );
}
