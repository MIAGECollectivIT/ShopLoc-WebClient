import * as React from 'react';
import type { WalletTransaction } from '@/types/wallet';
import type { PointsTransaction } from '@/types/loyalty';
import { formatDateTimeFr, formatMoney, formatPoints } from '@/lib/format';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Award, Receipt, Store } from 'lucide-react';

type CurrencyTab = 'ALL' | 'EUR' | 'PTS';
type EurFilter = 'ALL' | 'TOPUP' | 'DEBIT';
type PointsFilter = 'ALL' | 'EARN' | 'REDEEM';

type UnifiedHistoryEntry =
  | { kind: 'EUR'; sortTime: number; tx: WalletTransaction }
  | { kind: 'PTS'; sortTime: number; tx: PointsTransaction };

interface WalletHistoryCardProps {
  transactions: WalletTransaction[];
  pointsTransactions: PointsTransaction[];
  isLoading: boolean;
}

function getEmptyHistoryMessage(
  currencyTab: CurrencyTab,
  eurFilter: EurFilter,
  ptsFilter: PointsFilter
): { title: string; subtitle: string } {
  if (currencyTab === 'PTS') {
    const title =
      ptsFilter === 'EARN'
        ? 'Aucun gain de points trouvé'
        : ptsFilter === 'REDEEM'
          ? 'Aucune dépense de points trouvée'
          : 'Aucun mouvement de points pour le moment';
    return {
      title,
      subtitle:
        'Effectuez vos achats chez les commerçants locaux adhérents pour cumuler ou utiliser des points fidélité.',
    };
  }

  if (currencyTab === 'EUR' && eurFilter === 'TOPUP') {
    return {
      title: 'Aucun rechargement trouvé',
      subtitle: 'Modifiez votre filtre pour afficher les autres opérations de votre compte.',
    };
  }

  if (currencyTab === 'EUR' && eurFilter === 'DEBIT') {
    return {
      title: 'Aucun achat commerçant trouvé',
      subtitle: 'Modifiez votre filtre pour afficher les autres opérations de votre compte.',
    };
  }

  return {
    title: 'Aucune transaction pour le moment',
    subtitle:
      'Effectuez votre premier rechargement par carte bancaire ci-dessus pour utiliser votre solde dans les commerces locaux.',
  };
}

function PointsTransactionRow({ tx }: { tx: PointsTransaction }) {
  const isEarn = tx.type === 'EARN';

  return (
    <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/15 transition-colors">
      <div className="flex items-start gap-3.5">
        <div
          className={`size-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
            isEarn
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
          }`}
        >
          <Award className="size-5" />
        </div>

        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-foreground">
              {tx.description || (isEarn ? 'Points fidélité gagnés' : 'Points fidélité utilisés')}
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 font-medium ${
                isEarn
                  ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                  : 'text-amber-700 dark:text-amber-300 border-amber-500/30 bg-amber-500/10'
              }`}
            >
              {isEarn ? '+ GAIN PTS' : '- DÉPENSE PTS'}
            </Badge>
          </div>

          {tx.storeName && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground bg-muted/40 px-2 py-0.5 rounded-md w-fit border border-border/40">
              <Store className="size-3.5 text-primary shrink-0" />
              <span>Commerce : {tx.storeName}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{formatDateTimeFr(tx.createdAt)}</span>
            <span>•</span>
            <span className="font-mono text-[11px]">Réf: {tx.transactionReference}</span>
            {tx.sourceType && (
              <>
                <span>•</span>
                <span className="font-mono text-[11px] uppercase">{tx.sourceType}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="sm:text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-border/30">
        <div
          className={`text-base sm:text-lg font-extrabold ${
            isEarn ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-300'
          }`}
        >
          {isEarn ? '+' : '-'} {formatPoints(tx.points)} PTS
        </div>
        <div className="text-[11px] text-muted-foreground font-mono">
          Solde après : {formatPoints(tx.balanceAfter)} PTS
        </div>
      </div>
    </div>
  );
}

function EuroTransactionRow({ tx }: { tx: WalletTransaction }) {
  const isFailed = tx.status === 'FAILED';
  const isTopup = tx.type === 'TOPUP';

  return (
    <div
      className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/15 transition-colors ${
        isFailed ? 'bg-destructive/5' : ''
      }`}
    >
      <div className="flex items-start gap-3.5">
        <div
          className={`size-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
            isFailed
              ? 'bg-destructive/10 text-destructive border border-destructive/20'
              : isTopup
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
          }`}
        >
          {isFailed ? (
            <AlertTriangle className="size-5" />
          ) : isTopup ? (
            <ArrowUpRight className="size-5" />
          ) : (
            <ArrowDownLeft className="size-5" />
          )}
        </div>

        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-foreground">
              {isFailed
                ? 'Rechargement échoué'
                : isTopup
                  ? 'Rechargement Carte Bancaire'
                  : 'Paiement en commerce'}
            </span>
            <Badge
              variant={isFailed ? 'destructive' : isTopup ? 'outline' : 'secondary'}
              className={`text-[10px] px-1.5 py-0 font-medium ${
                isFailed
                  ? 'bg-destructive/15 text-destructive border-destructive/30'
                  : isTopup
                    ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                    : 'text-indigo-600 dark:text-indigo-400 border-indigo-500/30 bg-indigo-500/10'
              }`}
            >
              {isFailed ? 'ÉCHEC' : isTopup ? '+ TOPUP' : '- DÉBIT'}
            </Badge>
          </div>

          {!isTopup && !isFailed && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground bg-muted/40 px-2 py-0.5 rounded-md w-fit border border-border/40">
              <Store className="size-3.5 text-primary shrink-0" />
              <span>Commerce : {tx.storeName || 'Commerce partenaire ShopLoc'}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{formatDateTimeFr(tx.createdAt)}</span>
            <span>•</span>
            <span className="font-mono text-[11px]">Réf: {tx.transactionReference}</span>
            {tx.orderReference && (
              <>
                <span>•</span>
                <span className="font-mono text-[11px] text-primary">Cmd: {tx.orderReference}</span>
              </>
            )}
            {isFailed && (
              <>
                <span>•</span>
                <span className="text-destructive font-medium">{tx.description}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="sm:text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-border/30">
        <div
          className={`text-base sm:text-lg font-extrabold ${
            isFailed
              ? 'text-muted-foreground line-through'
              : isTopup
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-foreground font-semibold'
          }`}
        >
          {isFailed ? '' : isTopup ? '+' : '-'} {formatMoney(tx.amount)}
        </div>
        <div className="text-[11px] text-muted-foreground font-mono">
          {isFailed ? 'Solde inchangé' : `Solde après : ${formatMoney(tx.balanceAfter)}`}
        </div>
      </div>
    </div>
  );
}

export function WalletHistoryCard({
  transactions,
  pointsTransactions,
  isLoading,
}: WalletHistoryCardProps) {
  const [historyCurrencyTab, setHistoryCurrencyTab] = React.useState<CurrencyTab>('ALL');
  const [filterType, setFilterType] = React.useState<EurFilter>('ALL');
  const [pointsFilterType, setPointsFilterType] = React.useState<PointsFilter>('ALL');

  const totalHistoryCount = transactions.length + pointsTransactions.length;

  const displayedHistoryEntries: UnifiedHistoryEntry[] = React.useMemo(() => {
    const eurEntries: UnifiedHistoryEntry[] =
      historyCurrencyTab === 'PTS'
        ? []
        : transactions
            .filter((tx) => {
              if (historyCurrencyTab === 'ALL') return true;
              return filterType === 'ALL' ? true : tx.type === filterType;
            })
            .map((tx) => ({
              kind: 'EUR' as const,
              sortTime: Date.parse(tx.createdAt) || 0,
              tx,
            }));

    const ptsEntries: UnifiedHistoryEntry[] =
      historyCurrencyTab === 'EUR'
        ? []
        : pointsTransactions
            .filter((tx) => {
              if (historyCurrencyTab === 'ALL') return true;
              return pointsFilterType === 'ALL' ? true : tx.type === pointsFilterType;
            })
            .map((tx) => ({
              kind: 'PTS' as const,
              sortTime: Date.parse(tx.createdAt) || 0,
              tx,
            }));

    return [...eurEntries, ...ptsEntries].sort((a, b) => b.sortTime - a.sortTime);
  }, [historyCurrencyTab, transactions, pointsTransactions, filterType, pointsFilterType]);

  const emptyState = getEmptyHistoryMessage(historyCurrencyTab, filterType, pointsFilterType);

  return (
    <Card className="border-border bg-card rounded-2xl shadow-sm overflow-hidden">
      <CardHeader className="border-b border-border/50 pb-4 space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Receipt className="size-5 text-primary shrink-0" />
              Historique des transactions du portefeuille
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Consultez en temps réel tous vos rechargements, achats commerçants ainsi que vos gains
              et dépenses de points fidélité.
            </CardDescription>
          </div>

          <div className="inline-flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/40 text-xs w-fit max-w-full overflow-x-auto shrink-0">
            <Button
              variant={historyCurrencyTab === 'ALL' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs px-2.5 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
              onClick={() => setHistoryCurrencyTab('ALL')}
            >
              Tout ({totalHistoryCount})
            </Button>
            <Button
              variant={historyCurrencyTab === 'EUR' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs px-2.5 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
              onClick={() => setHistoryCurrencyTab('EUR')}
            >
              Euros ({transactions.length})
            </Button>
            <Button
              variant={historyCurrencyTab === 'PTS' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs px-2.5 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
              onClick={() => setHistoryCurrencyTab('PTS')}
            >
              Points Fidélité ({pointsTransactions.length})
            </Button>
          </div>
        </div>

        {historyCurrencyTab === 'EUR' && (
          <div className="inline-flex items-center gap-1 bg-muted/25 p-1 rounded-xl border border-border/40 text-xs w-fit max-w-full overflow-x-auto">
            <Button
              variant={filterType === 'ALL' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs px-2.5 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
              onClick={() => setFilterType('ALL')}
            >
              Toutes ({transactions.length})
            </Button>
            <Button
              variant={filterType === 'TOPUP' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs px-2.5 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
              onClick={() => setFilterType('TOPUP')}
            >
              Rechargements
            </Button>
            <Button
              variant={filterType === 'DEBIT' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs px-2.5 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
              onClick={() => setFilterType('DEBIT')}
            >
              Achats commerçants
            </Button>
          </div>
        )}

        {historyCurrencyTab === 'PTS' && (
          <div className="inline-flex items-center gap-1 bg-emerald-500/5 p-1 rounded-xl border border-emerald-500/20 text-xs w-fit max-w-full overflow-x-auto">
            <Button
              variant={pointsFilterType === 'ALL' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs px-2.5 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
              onClick={() => setPointsFilterType('ALL')}
            >
              Tous ({pointsTransactions.length})
            </Button>
            <Button
              variant={pointsFilterType === 'EARN' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs px-2.5 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
              onClick={() => setPointsFilterType('EARN')}
            >
              Gains (+ pts)
            </Button>
            <Button
              variant={pointsFilterType === 'REDEEM' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs px-2.5 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
              onClick={() => setPointsFilterType('REDEEM')}
            >
              Dépenses (- pts)
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        ) : displayedHistoryEntries.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-3">
            <div className="mx-auto size-12 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground">
              {historyCurrencyTab === 'PTS' ? (
                <Award className="size-6" />
              ) : (
                <Receipt className="size-6" />
              )}
            </div>
            <h4 className="text-sm font-semibold text-foreground">{emptyState.title}</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">{emptyState.subtitle}</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {displayedHistoryEntries.map((entry) =>
              entry.kind === 'PTS' ? (
                <PointsTransactionRow key={`pts-${entry.tx.uid}`} tx={entry.tx} />
              ) : (
                <EuroTransactionRow key={`eur-${entry.tx.uid}`} tx={entry.tx} />
              )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
