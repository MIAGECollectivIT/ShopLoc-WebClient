import * as React from 'react';
import { useAuth } from '@/lib/auth';
import {
  getCurrentUserProfile,
  getAdminUserById,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  getUserVfpStatus,
  getUserPointsBalance,
} from '@/lib/api';
import { ROUTES } from '@/config/routes';
import { formatPoints } from '@/lib/format';
import { UUID_REGEX } from '@/lib/validation/store';
import type { UserResponse } from '@/types/user';
import type { UserPointsBalanceResponse, UserVfpStatus } from '@/types/loyalty';
import { ClientQrCodeCard } from './ClientQrCodeCard';
import { FrenchLicensePlateBadge } from './FrenchLicensePlateBadge';
import { UserActivityGaugeCard } from './UserActivityGaugeCard';
import { VfpBadge } from './VfpBadge';
import { VfpParkingSessionCard } from './VfpParkingSessionCard';

const ManageVehiclesDialog = React.lazy(() =>
  import('./ManageVehiclesDialog').then((m) => ({ default: m.ManageVehiclesDialog }))
);
const VfpBenefitsDialog = React.lazy(() =>
  import('./VfpBenefitsDialog').then((m) => ({ default: m.VfpBenefitsDialog }))
);
import type { VfpRevocationForecast } from '@/lib/vfp';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  User,
  Mail,
  Calendar,
  Car,
  MapPin,
  LogOut,
  Store,
  ShoppingBag,
  ShieldCheck,
  AlertCircle,
  LogIn,
  IdCard,
  Plus,
  Settings2,
  Wallet,
  Award,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

export interface ClientProfileViewProps {
  targetUserId?: string | number;
}

export function ClientProfileView({ targetUserId: propTargetUserId }: ClientProfileViewProps = {}) {
  const { user: authUser, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const queryUserId = React.useMemo(() => {
    const raw =
      propTargetUserId ||
      (typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('userId')
        : null);
    const trimmed = raw != null ? String(raw).trim() : undefined;
    return trimmed && UUID_REGEX.test(trimmed) ? trimmed : undefined;
  }, [propTargetUserId, mounted]);

  const isAdminConsultation = Boolean(
    queryUserId && authUser?.role === 'ADMIN' && String(queryUserId) !== String(authUser?.id)
  );

  const [profile, setProfile] = React.useState<UserResponse | null>(null);
  const [vfpStatus, setVfpStatus] = React.useState<UserVfpStatus | null>(null);
  const [pointsBalance, setPointsBalance] = React.useState<UserPointsBalanceResponse | null>(null);
  const [pointsUnavailable, setPointsUnavailable] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isManageVehiclesOpen, setIsManageVehiclesOpen] = React.useState(false);
  const [isBenefitsModalOpen, setIsBenefitsModalOpen] = React.useState(false);
  const [revocationForecast, setRevocationForecast] = React.useState<VfpRevocationForecast | null>(
    null
  );

  React.useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      if (!isAuthenticated && !authLoading) {
        setIsLoading(false);
        return;
      }

      try {
        setError(null);
        const data =
          isAdminConsultation && queryUserId
            ? await getAdminUserById(queryUserId)
            : await getCurrentUserProfile();
        if (isMounted) {
          setProfile(data);
          if (data?.id) {
            getUserVfpStatus(data.id)
              .then((vfp) => {
                if (isMounted) setVfpStatus(vfp);
              })
              .catch(() => {});
            if (data.role === 'CLIENT') {
              getUserPointsBalance(data.id)
                .then((points) => {
                  if (isMounted) {
                    setPointsBalance(points);
                    setPointsUnavailable(false);
                  }
                })
                .catch(() => {
                  if (isMounted) setPointsUnavailable(true);
                });
            }
          }
        }
      } catch (err) {
        if (isAdminConsultation) {
          if (isMounted) {
            setError(
              err instanceof Error
                ? err.message
                : 'Impossible de récupérer le profil de cet utilisateur.'
            );
          }
        } else {
          console.warn('Impossible de charger le profil via API, fallback sur la session:', err);
          // Fallback to local token/session data if the API is temporarily unreachable
          if (isMounted && authUser) {
            setProfile({
              id: authUser.id,
              email: authUser.email,
              role: authUser.role,
              firstName: authUser.firstName || '',
              lastName: authUser.lastName || '',
              birthDate: authUser.birthDate || '',
              clientCode: authUser.clientCode,
              pickupLocation: authUser.pickupLocation,
              licensePlates: authUser.licensePlates || [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          } else if (isMounted) {
            setError(
              err instanceof Error
                ? err.message
                : 'Une erreur est survenue lors de la récupération de votre profil.'
            );
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (!authLoading) {
      loadProfile();
    }

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, authLoading, authUser, isAdminConsultation, queryUserId]);

  // Initial loading state
  if (authLoading || (isLoading && !profile)) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-72" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Unauthenticated user
  if (!mounted || authLoading) {
    return null;
  }

  if (!isAuthenticated && !profile) {
    return (
      <Card className="max-w-lg mx-auto border-dashed text-center p-6">
        <CardHeader className="flex flex-col items-center">
          <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-2 text-muted-foreground">
            <User className="size-6" />
          </div>
          <CardTitle className="text-xl">Connexion requise</CardTitle>
          <CardDescription>
            Vous devez être connecté à votre compte ShopLoc pour consulter votre profil.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center pt-2">
          <a
            href="/login?logout=1"
            data-astro-reload=""
            className={buttonVariants({
              variant: 'default',
              size: 'default',
              className: 'gap-2',
            })}
          >
            <LogIn className="size-4" />
            <span>Se connecter</span>
          </a>
        </CardFooter>
      </Card>
    );
  }

  const effectiveUser = profile || authUser;
  if (!effectiveUser) {
    return null;
  }

  const isClient = effectiveUser.role === 'CLIENT';

  const fullName =
    [effectiveUser.firstName, effectiveUser.lastName].filter(Boolean).join(' ') ||
    'Utilisateur ShopLoc';

  const formatBirthDate = (dateStr?: string) => {
    if (!dateStr) return 'Non renseignée';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const licensePlates = effectiveUser.licensePlates || [];

  const handlePlateAdded = async (newPlate: string) => {
    const res = await addVehicle(newPlate);
    const addedPlate = res.licensePlate || newPlate;
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            licensePlates: [
              ...(prev.licensePlates || []).filter(
                (p) => p.toUpperCase() !== addedPlate.toUpperCase()
              ),
              addedPlate,
            ],
          }
        : prev
    );
  };

  const handlePlateUpdated = async (oldPlate: string, newPlate: string) => {
    const res = await updateVehicle(oldPlate, newPlate);
    const updatedPlate = res.licensePlate || newPlate;
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            licensePlates: (prev.licensePlates || []).map((p) =>
              p.toUpperCase() === oldPlate.toUpperCase() ? updatedPlate : p
            ),
          }
        : prev
    );
  };

  const handlePlateDeleted = async (deletedPlate: string) => {
    await deleteVehicle(deletedPlate);
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            licensePlates: (prev.licensePlates || []).filter(
              (p) => p.toUpperCase() !== deletedPlate.toUpperCase()
            ),
          }
        : prev
    );
  };

  return (
    <div className="space-y-6">
      {isAdminConsultation && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-primary/10 border border-primary/20 rounded-xl text-foreground">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="size-5 text-primary shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                Mode Consultation Administrateur
              </p>
              <p className="text-xs text-muted-foreground">
                Consultation de la fiche profil de{' '}
                <strong className="text-foreground">{fullName}</strong> (ID #{effectiveUser.id}{' '}
                &bull; {effectiveUser.email}).
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            render={<a href={`${ROUTES.adminDashboard.path}?tab=users`} />}
            className="h-8 text-xs gap-1.5 shrink-0 bg-background"
          >
            <ArrowLeft className="size-3.5" />
            <span>Retour à l&apos;administration</span>
          </Button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2.5 p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Profile header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border bg-gradient-to-r from-emerald-500/10 via-background to-background shadow-xs">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-2xl bg-emerald-600 text-white font-bold text-xl flex items-center justify-center shadow-md">
            {effectiveUser.firstName?.[0] || 'U'}
            {effectiveUser.lastName?.[0] || 'S'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {fullName}
              </h2>
              {effectiveUser.role === 'CLIENT' && (
                <VfpBadge
                  isVfp={Boolean(vfpStatus?.isVfp)}
                  showInactive={true}
                  size="md"
                  interactive={true}
                  onClick={() => setIsBenefitsModalOpen(true)}
                />
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Mail className="size-3.5" />
              <span>{effectiveUser.email}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {isAdminConsultation ? (
            <Button
              variant="outline"
              size="sm"
              render={<a href={`${ROUTES.adminDashboard.path}?tab=users`} />}
              className="text-muted-foreground hover:text-foreground gap-1.5"
            >
              <ArrowLeft className="size-4" />
              <span>Retour administration</span>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                logout();
                window.location.href = ROUTES.login.path;
              }}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5"
              title="Se déconnecter"
            >
              <LogOut className="size-4" />
              <span>Déconnexion</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main grid: Personal Info & License Plates vs QR Code */}
      <div className={isClient ? 'grid grid-cols-1 lg:grid-cols-3 gap-6' : 'max-w-3xl space-y-6'}>
        {/* Main column: Personal Info & Vehicles */}
        <div className={isClient ? 'lg:col-span-2 space-y-6' : 'space-y-6'}>
          {/* Personal Information Card */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <User className="size-5 text-primary" />
                <span>Informations Personnelles</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Vos coordonnées personnelles enregistrées sur le réseau de commerce local.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg border bg-muted/20">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                  <User className="size-3.5" />
                  <span>Prénom</span>
                </span>
                <span className="font-semibold text-foreground text-sm">
                  {effectiveUser.firstName || '—'}
                </span>
              </div>

              <div className="p-3 rounded-lg border bg-muted/20">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                  <User className="size-3.5" />
                  <span>Nom</span>
                </span>
                <span className="font-semibold text-foreground text-sm">
                  {effectiveUser.lastName || '—'}
                </span>
              </div>

              <div className="p-3 rounded-lg border bg-muted/20">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                  <Mail className="size-3.5" />
                  <span>Adresse email</span>
                </span>
                <span className="font-semibold text-foreground text-sm break-all">
                  {effectiveUser.email}
                </span>
              </div>

              <div className="p-3 rounded-lg border bg-muted/20">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                  <Calendar className="size-3.5" />
                  <span>Date de naissance</span>
                </span>
                <span className="font-semibold text-foreground text-sm">
                  {formatBirthDate(effectiveUser.birthDate)}
                </span>
              </div>

              {/* Role displayed for merchants and admins */}
              {!isClient && (
                <div className="sm:col-span-2 p-3 rounded-lg border bg-muted/20">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                    <ShieldCheck className="size-3.5 text-primary" />
                    <span>Rôle sur la plateforme</span>
                  </span>
                  <span className="font-semibold text-foreground text-sm">
                    {effectiveUser.role === 'ADMIN'
                      ? 'Administrateur ShopLoc'
                      : effectiveUser.role === 'MERCHANT'
                        ? 'Commerçant Adhérent'
                        : effectiveUser.role}
                  </span>
                </div>
              )}

              {isClient && effectiveUser.pickupLocation && (
                <div className="sm:col-span-2 p-3 rounded-lg border bg-muted/20">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                    <MapPin className="size-3.5 text-primary" />
                    <span>Point de retrait de votre carte physique</span>
                  </span>
                  <span className="font-semibold text-foreground text-sm">
                    {effectiveUser.pickupLocation}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {isClient && (
            <VfpParkingSessionCard
              userId={effectiveUser.id}
              isVfp={Boolean(vfpStatus?.isVfp)}
              licensePlates={licensePlates}
              onManageVehicles={
                isAdminConsultation ? () => {} : () => setIsManageVehiclesOpen(true)
              }
            />
          )}

          {/* License Plates Card (displayed only for clients) */}
          {isClient && (
            <Card className="shadow-xs">
              <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Car className="size-5 text-primary" />
                    <span>Plaques d'Immatriculation</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Véhicules associés au compte pour la reconnaissance en caisse et les avantages
                    de stationnement.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono text-xs">
                    {licensePlates.length} {licensePlates.length > 1 ? 'plaques' : 'plaque'}
                  </Badge>
                  {!isAdminConsultation && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsManageVehiclesOpen(true)}
                      className="h-8 gap-1.5 text-xs"
                    >
                      <Settings2 className="size-3.5" />
                      <span>Gérer mes plaques</span>
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-4">
                {licensePlates.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {licensePlates.map((plate) => (
                      <div
                        key={plate}
                        className="flex items-center justify-between p-3 rounded-xl border bg-muted/10 hover:bg-muted/30 transition-colors"
                      >
                        <FrenchLicensePlateBadge plate={plate} />
                        <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
                          Enregistrée
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed rounded-xl bg-muted/20 text-muted-foreground">
                    <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <Car className="size-6 text-muted-foreground/60" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      Aucune plaque d'immatriculation enregistrée
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mb-4">
                      L'ajout de vos plaques facilitera la détection de votre véhicule lors de vos
                      passages en drive ou pour bénéficier de vos avantages de stationnement
                      municipal.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setIsManageVehiclesOpen(true)}
                      className="gap-1.5 text-xs"
                    >
                      <Plus className="size-3.5" />
                      <span>Ajouter une plaque</span>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* License plates management dialog */}
          {isClient && isManageVehiclesOpen && (
            <React.Suspense fallback={null}>
              <ManageVehiclesDialog
                open={isManageVehiclesOpen}
                onOpenChange={setIsManageVehiclesOpen}
                licensePlates={licensePlates}
                onAddPlate={handlePlateAdded}
                onUpdatePlate={handlePlateUpdated}
                onDeletePlate={handlePlateDeleted}
              />
            </React.Suspense>
          )}

          {/* Navigation shortcuts */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {!isClient && effectiveUser.role === 'MERCHANT' && (
              <a
                href="/stores/my-stores"
                className={buttonVariants({
                  variant: 'default',
                  size: 'default',
                  className: 'flex-1 gap-2',
                })}
              >
                <Store className="size-4" />
                <span>Mes commerces</span>
              </a>
            )}

            <a
              href={ROUTES.stores.path}
              className={buttonVariants({
                variant: 'outline',
                size: 'default',
                className: 'flex-1 gap-2',
              })}
            >
              <Store className="size-4 text-primary" />
              <span>Explorer les commerces</span>
            </a>

            <a
              href={ROUTES.orders.path}
              className={buttonVariants({
                variant: 'outline',
                size: 'default',
                className: 'flex-1 gap-2 cursor-pointer',
              })}
            >
              <ShoppingBag className="size-4 text-primary" />
              <span>Mes commandes</span>
            </a>

            <a
              href={ROUTES.wallet.path}
              className={buttonVariants({
                variant: 'outline',
                size: 'default',
                className: 'flex-1 gap-2 cursor-pointer',
              })}
            >
              <Wallet className="size-4 text-primary" />
              <span>Mon portefeuille</span>
            </a>
          </div>
        </div>

        {/* Right column: QR Code & 7-character Client Code (displayed only for clients) */}
        {isClient && (
          <div className="space-y-6">
            {effectiveUser.clientCode ? (
              <ClientQrCodeCard clientCode={effectiveUser.clientCode} userName={fullName} />
            ) : (
              <Card className="border-dashed text-center p-6">
                <CardHeader className="flex flex-col items-center">
                  <IdCard className="size-8 text-muted-foreground/60 mb-2" />
                  <CardTitle className="text-base">Pass Fidélité en cours d'attribution</CardTitle>
                  <CardDescription className="text-xs">
                    Votre code client à 7 caractères sera généré lors de la validation complète de
                    votre inscription.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            {/* Compact Loyalty Points Balance Card */}
            <Card className="border-border bg-gradient-to-br from-card via-card to-emerald-500/5 rounded-2xl shadow-sm border-l-4 border-l-emerald-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Award className="size-4 text-emerald-600 dark:text-emerald-400" />
                  Solde Points Fidélité
                </CardTitle>
                <CardDescription className="text-xs">
                  {pointsUnavailable
                    ? 'Service fidélité temporairement indisponible.'
                    : 'Points cumulés chez les commerçants locaux.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-1 pb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold tracking-tight text-foreground">
                    {pointsUnavailable ? '—' : formatPoints(pointsBalance?.balance)}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    PTS
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-between mt-4 text-xs cursor-pointer"
                  render={<a href={ROUTES.wallet.path} data-astro-reload="" />}
                >
                  <span>Consulter le portefeuille &amp; l&apos;historique</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              </CardContent>
            </Card>

            {/* Dynamic Activity Gauge & VFP Status */}
            <UserActivityGaugeCard
              userId={effectiveUser.id}
              initialVfpStatus={vfpStatus}
              onOpenBenefitsModal={() => setIsBenefitsModalOpen(true)}
              onForecastChange={setRevocationForecast}
            />

            {/* Security & benefits reminder */}
            <div className="p-4 rounded-xl border bg-muted/30 text-xs text-muted-foreground space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Avantages Citoyen ShopLoc</span>
                </div>
                <Button
                  variant="ghost"
                  size="xs"
                  className="text-xs text-primary hover:underline h-auto p-0 cursor-pointer"
                  onClick={() => setIsBenefitsModalOpen(true)}
                >
                  Voir mes privilèges VFP
                </Button>
              </div>
              <p className="leading-relaxed">
                Présentez votre QR code ou votre code client de 7 caractères à chaque passage chez
                les commerçants adhérents de votre commune pour cumuler des points fidélité et
                bénéficier de réductions exclusives.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal d'explication des avantages et privilèges VFP */}
      {isBenefitsModalOpen && (
        <React.Suspense fallback={null}>
          <VfpBenefitsDialog
            isOpen={isBenefitsModalOpen}
            onClose={() => setIsBenefitsModalOpen(false)}
            isVfp={Boolean(vfpStatus?.isVfp)}
            currentTransactionCount={vfpStatus?.currentTransactionCount}
            threshold={vfpStatus?.threshold ?? 10}
            revocationForecast={revocationForecast}
          />
        </React.Suspense>
      )}
    </div>
  );
}
