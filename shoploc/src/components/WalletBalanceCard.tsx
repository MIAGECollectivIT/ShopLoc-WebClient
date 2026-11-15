import type { Wallet } from '@/types/wallet';
import type { UserPointsBalanceResponse } from '@/types/loyalty';
import type { AuthUser } from '@/types/user';
import { formatMoney, formatPoints } from '@/lib/format';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Award, Clock, RefreshCw, ShieldCheck, Sparkles, User } from 'lucide-react';

interface WalletBalanceCardProps {
  wallet: Wallet | null;
  pointsBalance: UserPointsBalanceResponse | null;
  pointsUnavailable?: boolean;
  user: AuthUser | null;
  isLoading: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
}

const WEEKLY_RELOAD_CAP = 250;

export function WalletBalanceCard({
  wallet,
  pointsBalance,
  pointsUnavailable = false,
  user,
  isLoading,
  isRefreshing,
  onRefresh,
}: WalletBalanceCardProps) {
  const pointsMovementsCount = pointsBalance?.transactions.length ?? 0;

  return (
    <Card className="border-border bg-gradient-to-br from-card via-card to-primary/5 rounded-2xl shadow-sm overflow-hidden relative border-t-4 border-t-primary h-full flex flex-col">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <Badge
            variant="outline"
            className="text-primary border-primary/30 bg-primary/10 gap-1.5 py-0.5"
          >
            <Sparkles className="size-3" />
            Porte-monnaie Actif
          </Badge>
          <CardTitle className="text-lg font-bold mt-2">Solde Disponible</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          disabled={isRefreshing || isLoading}
          title="Actualiser le solde en temps réel"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4 pt-1 flex-1">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : (
          <div>
            <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground flex items-baseline gap-2">
              <span>{formatMoney(wallet?.balance)}</span>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                {wallet?.currency || 'EUR'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
              <Clock className="size-3 text-muted-foreground" />
              Mis à jour en temps réel
            </p>
          </div>
        )}

        {wallet?.weeklyReloadRemaining !== undefined && wallet?.weeklyReloadRemaining !== null && (
          <div className="rounded-xl border bg-muted/20 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="size-3.5 text-primary" />
                Plafond 7j glissants disponible
              </span>
              <span className="font-semibold text-foreground">
                {formatMoney(wallet.weeklyReloadRemaining)} / 250,00 €
              </span>
            </div>
            <div className="w-full bg-muted/60 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary h-1.5 rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(0, (wallet.weeklyReloadRemaining / WEEKLY_RELOAD_CAP) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Loyalty Points Balance Block (SLE-38 / SLE-177) */}
        {isLoading ? (
          <Skeleton className="h-20 w-full rounded-xl" />
        ) : (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Award className="size-4 text-emerald-600 dark:text-emerald-400" />
                Solde Points Fidélité
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold tracking-tight text-foreground">
                {pointsUnavailable ? '—' : formatPoints(pointsBalance?.balance)}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                PTS
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {pointsUnavailable ? (
                <span>Service fidélité temporairement indisponible</span>
              ) : (
                <span>
                  {pointsMovementsCount} {pointsMovementsCount > 1 ? 'mouvements' : 'mouvement'}
                </span>
              )}
            </div>
          </div>
        )}

        <Separator className="my-2" />

        {/* Citizen Card Meta */}
        <div className="rounded-xl border bg-muted/30 p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Titulaire</span>
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <User className="size-3.5 text-primary" />
              {user?.firstName && user?.lastName
                ? `${user.firstName} ${user.lastName}`
                : user?.email}
            </span>
          </div>
          {user?.clientCode && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Code Client Commerçant</span>
              <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                {user.clientCode}
              </span>
            </div>
          )}
          {user?.pickupLocation && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Point de retrait</span>
              <span className="font-medium text-foreground">{user.pickupLocation}</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="bg-muted/15 border-t border-border/50 py-3 px-6 flex items-center justify-between text-xs text-muted-foreground mt-auto">
        <span className="flex items-center gap-1">
          <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          Fonds garantis ShopLoc
        </span>
        <span>Devise : EUR (€)</span>
      </CardFooter>
    </Card>
  );
}
