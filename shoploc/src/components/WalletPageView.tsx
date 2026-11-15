import * as React from 'react';
import { useAuth } from '@/lib/auth';
import { getWallet, getWalletTransactions, getUserPointsBalance } from '@/lib/api';
import type { Wallet, WalletTransaction } from '@/types/wallet';
import type { UserPointsBalanceResponse } from '@/types/loyalty';
import { ROUTES } from '@/config/routes';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Wallet as WalletIcon } from 'lucide-react';
import { WalletBalanceCard } from './WalletBalanceCard';
import { WalletConditionsCard } from './WalletConditionsCard';
import { WalletReloadCard } from './WalletReloadCard';
import { WalletHistoryCard } from './WalletHistoryCard';

export function WalletPageView() {
  const { user, token, isAuthenticated } = useAuth();

  const [wallet, setWallet] = React.useState<Wallet | null>(null);
  const [transactions, setTransactions] = React.useState<WalletTransaction[]>([]);
  const [pointsBalance, setPointsBalance] = React.useState<UserPointsBalanceResponse | null>(null);
  const [pointsUnavailable, setPointsUnavailable] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(
    async (refreshOnly = false) => {
      if (!isAuthenticated) {
        setIsLoading(false);
        return;
      }

      if (refreshOnly) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const [walletData, txData, pointsData] = await Promise.all([
          getWallet(token || undefined),
          getWalletTransactions(token || undefined),
          getUserPointsBalance(user?.id, token || undefined).catch(() => null),
        ]);
        setWallet(walletData);
        setTransactions(txData);
        setPointsUnavailable(pointsData === null);
        setPointsBalance(
          pointsData ?? {
            userId: user?.id || '',
            balance: 0,
            updatedAt: new Date().toISOString(),
            transactions: [],
          }
        );
      } catch (err: unknown) {
        console.error('Erreur chargement portefeuille:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Impossible de récupérer les informations de votre porte-monnaie.'
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [isAuthenticated, token, user?.id]
  );

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleReloadSuccess = React.useCallback(
    async (updatedWallet: Wallet) => {
      setWallet(updatedWallet);
      try {
        const updatedTxs = await getWalletTransactions(token || undefined);
        setTransactions(updatedTxs);
      } catch (err: unknown) {
        console.error('Erreur actualisation historique:', err);
      }
    },
    [token]
  );

  if (!isLoading && !isAuthenticated) {
    return (
      <Card className="border-border bg-card rounded-2xl shadow-sm text-center py-12 px-6">
        <div className="mx-auto size-14 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
          <WalletIcon className="size-7" />
        </div>
        <CardTitle className="text-xl font-bold">Portefeuille &amp; Solde Citoyen</CardTitle>
        <CardDescription className="max-w-md mx-auto mt-2 text-sm">
          Connectez-vous à votre compte ShopLoc pour consulter votre solde en temps réel, recharger
          votre porte-monnaie en ligne et suivre vos dépenses locales.
        </CardDescription>
        <div className="flex items-center justify-center gap-3 mt-6">
          <Button render={<a href={ROUTES.login.path} data-astro-reload="" />}>Se connecter</Button>
          <Button variant="outline" render={<a href={ROUTES.register.path} data-astro-reload="" />}>
            Créer un compte
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive flex items-start gap-3">
          <AlertCircle className="size-5 mt-0.5 shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-semibold">Erreur de chargement</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(false)}
              className="mt-3 text-xs gap-1.5 cursor-pointer"
            >
              <RefreshCw className="size-3.5" />
              Réessayer
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-5 flex flex-col">
          <WalletBalanceCard
            wallet={wallet}
            pointsBalance={pointsBalance}
            pointsUnavailable={pointsUnavailable}
            user={user}
            isLoading={isLoading}
            isRefreshing={isRefreshing}
            onRefresh={() => loadData(true)}
          />
        </div>

        <div className="lg:col-span-7 flex flex-col">
          <WalletReloadCard
            user={user}
            token={token}
            weeklyReloadRemaining={wallet?.weeklyReloadRemaining}
            onReloadSuccess={handleReloadSuccess}
          />
        </div>
      </div>

      <WalletConditionsCard />

      <WalletHistoryCard
        transactions={transactions}
        pointsTransactions={pointsBalance?.transactions ?? []}
        isLoading={isLoading}
      />
    </div>
  );
}
