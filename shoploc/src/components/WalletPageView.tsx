import * as React from 'react';
import { useAuth } from '@/lib/auth';
import { getWallet, reloadWallet, getWalletTransactions } from '@/lib/api';
import type { Wallet, WalletTransaction } from '@/types/wallet';
import { ROUTES } from '@/config/routes';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Wallet as WalletIcon,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Store,
  Clock,
  ShieldCheck,
  Lock,
  PlusCircle,
  Receipt,
  User,
  Sparkles,
} from 'lucide-react';

const PRESET_AMOUNTS = [10, 20, 50, 100];
const MIN_RELOAD_AMOUNT = 5.0;
const MAX_RELOAD_AMOUNT = 100.0;

export function WalletPageView() {
  const { user, token, isAuthenticated } = useAuth();

  // State for wallet balance & transactions
  const [wallet, setWallet] = React.useState<Wallet | null>(null);
  const [transactions, setTransactions] = React.useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reload form state (SLE-15)
  const [reloadAmountInput, setReloadAmountInput] = React.useState<string>('20.00');
  const [cardHolder, setCardHolder] = React.useState<string>('');
  const [cardNumber, setCardNumber] = React.useState<string>('4111 2222 3333 4444');
  const [expiryDate, setExpiryDate] = React.useState<string>('12/28');
  const [cvc, setCvc] = React.useState<string>('421');
  const [isSubmittingReload, setIsSubmittingReload] = React.useState(false);
  const [reloadSuccessMessage, setReloadSuccessMessage] = React.useState<string | null>(null);
  const [reloadErrorMessage, setReloadErrorMessage] = React.useState<string | null>(null);

  // Transaction filter (SLE-18)
  const [filterType, setFilterType] = React.useState<'ALL' | 'TOPUP' | 'DEBIT'>('ALL');

  // Initialize cardholder from user profile
  React.useEffect(() => {
    if (user?.firstName || user?.lastName) {
      setCardHolder(`${user.firstName || ''} ${user.lastName || ''}`.trim());
    } else if (user?.email) {
      setCardHolder(user.email.split('@')[0]);
    }
  }, [user]);

  // Load wallet & transactions
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
        const [walletData, txData] = await Promise.all([
          getWallet(token || undefined),
          getWalletTransactions(token || undefined),
        ]);
        setWallet(walletData);
        setTransactions(txData);
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
    [isAuthenticated, token]
  );

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Parse and validate reload amount
  const parsedAmount = parseFloat(reloadAmountInput.replace(',', '.'));
  const isAmountValid =
    !isNaN(parsedAmount) && parsedAmount >= MIN_RELOAD_AMOUNT && parsedAmount <= MAX_RELOAD_AMOUNT;

  let amountValidationMessage: string | null = null;
  if (!reloadAmountInput.trim()) {
    amountValidationMessage = 'Veuillez saisir un montant.';
  } else if (isNaN(parsedAmount)) {
    amountValidationMessage = 'Veuillez saisir un montant numérique valide.';
  } else if (parsedAmount < MIN_RELOAD_AMOUNT) {
    amountValidationMessage = `Le montant minimum de rechargement est de ${MIN_RELOAD_AMOUNT.toFixed(2)} €.`;
  } else if (parsedAmount > MAX_RELOAD_AMOUNT) {
    amountValidationMessage = `Le montant maximum de rechargement par opération est de ${MAX_RELOAD_AMOUNT.toFixed(2)} €.`;
  } else if (
    wallet?.weeklyReloadRemaining !== undefined &&
    wallet?.weeklyReloadRemaining !== null &&
    parsedAmount > wallet.weeklyReloadRemaining
  ) {
    amountValidationMessage = `Plafond 7 jours glissants dépassé : il vous reste ${wallet.weeklyReloadRemaining.toFixed(2)} € disponibles sur 250,00 €.`;
  }

  // Handle reload submission (SLE-15)
  const handleReload = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!isAmountValid) return;

    setIsSubmittingReload(true);
    setReloadSuccessMessage(null);
    setReloadErrorMessage(null);

    try {
      const updatedWallet = await reloadWallet(parsedAmount, 'tok_visa_4242', token || undefined);
      setWallet(updatedWallet);
      setReloadSuccessMessage(
        `Votre porte-monnaie a été rechargé de ${parsedAmount.toFixed(2)} € avec succès !`
      );

      // Refresh transactions in the background
      const updatedTxs = await getWalletTransactions(token || undefined);
      setTransactions(updatedTxs);
    } catch (err: unknown) {
      console.error('Erreur rechargement:', err);
      setReloadErrorMessage(
        err instanceof Error
          ? err.message
          : 'Échec du rechargement. Veuillez vérifier vos coordonnées bancaires.'
      );
    } finally {
      setIsSubmittingReload(false);
    }
  };

  // Format currency
  const formatMoney = (val: number | undefined | null) => {
    if (val === undefined || val === null) return '0,00 €';
    return `${val.toFixed(2).replace('.', ',')} €`;
  };

  // Format date with European municipal timezone enforcement
  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Paris',
      }).format(d);
    } catch {
      return isoStr;
    }
  };

  // Filtered transactions (SLE-18)
  const filteredTransactions = transactions.filter((tx) => {
    if (filterType === 'ALL') return true;
    return tx.type === filterType;
  });

  // Not authenticated
  if (!isLoading && !isAuthenticated) {
    return (
      <Card className="border-border bg-card rounded-2xl shadow-sm text-center py-12 px-6">
        <div className="mx-auto size-14 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
          <WalletIcon className="size-7" />
        </div>
        <CardTitle className="text-xl font-bold">Portefeuille & Solde Citoyen</CardTitle>
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
      {/* Error alert */}
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

      {/* Grid: Balance Card (SLE-17) + Online Reload Form (SLE-15) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Real-Time Balance Card (SLE-17) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-border bg-gradient-to-br from-card via-card to-primary/5 rounded-2xl shadow-sm overflow-hidden relative border-t-4 border-t-primary">
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
                onClick={() => loadData(true)}
                disabled={isRefreshing || isLoading}
                title="Actualiser le solde en temps réel"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <RefreshCw
                  className={`size-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`}
                />
              </Button>
            </CardHeader>

            <CardContent className="space-y-4 pt-1">
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

              {wallet?.weeklyReloadRemaining !== undefined &&
                wallet?.weeklyReloadRemaining !== null && (
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
                            Math.max(0, (wallet.weeklyReloadRemaining / 250) * 100)
                          )}%`,
                        }}
                      />
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

            <CardFooter className="bg-muted/15 border-t border-border/50 py-3 px-6 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                Fonds garantis ShopLoc
              </span>
              <span>Devise : EUR (€)</span>
            </CardFooter>
          </Card>

          {/* Quick Informational Notice */}
          <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-2 text-xs text-muted-foreground">
            <div className="font-semibold text-foreground flex items-center gap-2">
              <Lock className="size-3.5 text-primary" />
              Conditions d'utilisation du porte-monnaie
            </div>
            <ul className="space-y-1 list-disc list-inside">
              <li>
                Rechargement en ligne sécurisé par carte bancaire de{' '}
                <strong>5,00 € à 100,00 €</strong>.
              </li>
              <li>
                Plafond anti-blanchiment / sécurité :{' '}
                <strong>250,00 € maximum sur 7 jours glissants</strong>.
              </li>
              <li>
                Protection anti-doublon idempotente (identifiant unique généré par transaction).
              </li>
              <li>
                Utilisable pour régler vos achats Click & Collect ou directement en caisse chez les
                commerçants partenaires.
              </li>
              <li>Aucuns frais de gestion ni date d'expiration sur votre solde.</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Online Reload Form (SLE-15) */}
        <div className="lg:col-span-7">
          <Card className="border-border bg-card rounded-2xl shadow-sm overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <CreditCard className="size-5 text-primary" />
                  Recharger mon porte-monnaie en ligne
                </CardTitle>
                <Badge
                  variant="outline"
                  className="text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                >
                  Norme RG001
                </Badge>
              </div>
              <CardDescription className="text-xs sm:text-sm">
                Créditez immédiatement votre solde par carte bancaire. Montant autorisé : de 5,00 €
                à 100,00 €.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleReload}>
              <CardContent className="space-y-5 pb-6">
                {/* Success alert */}
                {reloadSuccessMessage && (
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-start gap-3">
                    <CheckCircle2 className="size-5 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <div className="text-sm">
                      <p className="font-semibold">Rechargement réussi !</p>
                      <p className="text-xs mt-0.5">{reloadSuccessMessage}</p>
                    </div>
                  </div>
                )}

                {/* Error alert */}
                {reloadErrorMessage && (
                  <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive flex items-start gap-3">
                    <AlertTriangle className="size-5 mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold">Échec du rechargement</p>
                      <p className="text-xs mt-0.5">{reloadErrorMessage}</p>
                    </div>
                  </div>
                )}

                {/* Amount Selection */}
                <div className="space-y-3">
                  <Label htmlFor="reload-amount" className="text-xs font-semibold text-foreground">
                    1. Choisissez le montant à créditer
                  </Label>

                  {/* Quick Preset Buttons */}
                  <div className="grid grid-cols-4 gap-2">
                    {PRESET_AMOUNTS.map((preset) => (
                      <Button
                        key={preset}
                        type="button"
                        variant={parsedAmount === preset ? 'default' : 'outline'}
                        size="sm"
                        className="font-bold text-xs h-9 cursor-pointer transition-all"
                        onClick={() => {
                          setReloadAmountInput(preset.toFixed(2));
                          setReloadSuccessMessage(null);
                          setReloadErrorMessage(null);
                        }}
                      >
                        +{preset} €
                      </Button>
                    ))}
                  </div>

                  {/* Custom Amount Input */}
                  <div className="relative mt-2">
                    <Input
                      id="reload-amount"
                      type="number"
                      step="0.01"
                      min={MIN_RELOAD_AMOUNT}
                      max={MAX_RELOAD_AMOUNT}
                      value={reloadAmountInput}
                      onChange={(e) => {
                        setReloadAmountInput(e.target.value);
                        setReloadSuccessMessage(null);
                        setReloadErrorMessage(null);
                      }}
                      placeholder="Montant (ex: 25.00)"
                      className={`text-base font-semibold pr-10 ${
                        amountValidationMessage
                          ? 'border-destructive focus-visible:ring-destructive'
                          : ''
                      }`}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground font-bold">
                      €
                    </div>
                  </div>

                  {/* Validation feedback */}
                  {amountValidationMessage ? (
                    <p className="text-xs text-destructive flex items-center gap-1.5">
                      <AlertCircle className="size-3.5 shrink-0" />
                      {amountValidationMessage}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Montant strict : minimum 5,00 € — maximum 100,00 €.
                    </p>
                  )}
                </div>

                <Separator />

                {/* Simulated Payment Card Form (RG001) */}
                <div className="space-y-4">
                  <Label className="text-xs font-semibold text-foreground">
                    2. Coordonnées de la carte bancaire
                  </Label>

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="card-holder" className="text-xs text-muted-foreground">
                        Nom sur la carte
                      </Label>
                      <Input
                        id="card-holder"
                        type="text"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        placeholder="Jean Dupont"
                        className="mt-1 text-sm"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="card-number" className="text-xs text-muted-foreground">
                        Numéro de carte bancaire
                      </Label>
                      <div className="relative mt-1">
                        <Input
                          id="card-number"
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="4111 2222 3333 4444"
                          className="font-mono text-sm pl-9"
                          required
                        />
                        <CreditCard className="size-4 text-muted-foreground absolute left-3 top-2.5" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="card-exp" className="text-xs text-muted-foreground">
                          Date d'expiration
                        </Label>
                        <Input
                          id="card-exp"
                          type="text"
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(e.target.value)}
                          placeholder="MM/AA"
                          className="mt-1 font-mono text-sm text-center"
                          maxLength={5}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="card-cvc" className="text-xs text-muted-foreground">
                          Code CVV / CVC
                        </Label>
                        <Input
                          id="card-cvc"
                          type="password"
                          value={cvc}
                          onChange={(e) => setCvc(e.target.value)}
                          placeholder="123"
                          className="mt-1 font-mono text-sm text-center"
                          maxLength={4}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 pb-6 px-6 border-t border-border/50 bg-muted/15">
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 order-2 sm:order-1">
                  <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                  Paiement sécurisé via passerelle bancaire
                </div>
                <Button
                  type="submit"
                  disabled={!isAmountValid || isSubmittingReload}
                  className="w-full sm:w-auto font-semibold gap-2 order-1 sm:order-2 cursor-pointer"
                >
                  {isSubmittingReload ? (
                    <>
                      <RefreshCw className="size-4 animate-spin" />
                      Autorisation bancaire...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="size-4" />
                      Recharger {isAmountValid ? `${parsedAmount.toFixed(2)} €` : ''}
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>

      {/* Bottom Section: Real-time Transaction History (SLE-18) */}
      <Card className="border-border bg-card rounded-2xl shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Receipt className="size-5 text-primary" />
                Historique des transactions du portefeuille
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Consultez en temps réel tous vos rechargements et débits auprès des commerçants
                partenaires.
              </CardDescription>
            </div>

            {/* Filter buttons (SLE-18) */}
            <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-xl border border-border/40 text-xs">
              <Button
                variant={filterType === 'ALL' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs px-2.5 rounded-lg cursor-pointer"
                onClick={() => setFilterType('ALL')}
              >
                Toutes ({transactions.length})
              </Button>
              <Button
                variant={filterType === 'TOPUP' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs px-2.5 rounded-lg cursor-pointer"
                onClick={() => setFilterType('TOPUP')}
              >
                Rechargements
              </Button>
              <Button
                variant={filterType === 'DEBIT' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs px-2.5 rounded-lg cursor-pointer"
                onClick={() => setFilterType('DEBIT')}
              >
                Achats commerçants
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-3 border-b border-border/40"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="mx-auto size-12 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground">
                <Receipt className="size-6" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">
                {filterType === 'ALL'
                  ? 'Aucune transaction pour le moment'
                  : filterType === 'TOPUP'
                    ? 'Aucun rechargement trouvé'
                    : 'Aucun achat commerçant trouvé'}
              </h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {filterType === 'ALL'
                  ? 'Effectuez votre premier rechargement par carte bancaire ci-dessus pour utiliser votre solde dans les commerces locaux.'
                  : 'Modifiez votre filtre pour afficher les autres opérations de votre compte.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filteredTransactions.map((tx) => {
                const isFailed = tx.status === 'FAILED';
                const isTopup = tx.type === 'TOPUP';

                return (
                  <div
                    key={tx.id || tx.transactionReference}
                    className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/15 transition-colors ${
                      isFailed ? 'bg-destructive/5' : ''
                    }`}
                  >
                    {/* Left: Icon, Type, Merchant Name & Meta */}
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

                        {/* Store name display (mandatory requirement for SLE-18 on debits) */}
                        {!isTopup && !isFailed && (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground bg-muted/40 px-2 py-0.5 rounded-md w-fit border border-border/40">
                            <Store className="size-3.5 text-primary shrink-0" />
                            <span>Commerce : {tx.storeName || 'Commerce partenaire ShopLoc'}</span>
                          </div>
                        )}

                        {/* Transaction description & references */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>{formatDate(tx.createdAt)}</span>
                          <span>•</span>
                          <span className="font-mono text-[11px]">
                            Réf: {tx.transactionReference}
                          </span>
                          {tx.orderReference && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-[11px] text-primary">
                                Cmd: {tx.orderReference}
                              </span>
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

                    {/* Right: Amount & Balance After */}
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
                        {isFailed
                          ? 'Solde inchangé'
                          : `Solde après : ${formatMoney(tx.balanceAfter)}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
