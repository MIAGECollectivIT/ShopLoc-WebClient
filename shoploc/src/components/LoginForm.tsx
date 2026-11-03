import * as React from 'react';
import { useFormik } from 'formik';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PasswordInput } from './PasswordInput';
import { loginValidationSchema, type LoginFormData } from '@/lib/validation/login';
import { loginUser } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ROUTES } from '@/config/routes';
import type { UserResponse } from '@/types/user';
import {
  LogIn,
  LogOut,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Store as StoreIcon,
  UserPlus,
  IdCard,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  PlusCircle,
  Smartphone,
} from 'lucide-react';

export function LoginForm() {
  const { isAuthenticated, user: authUser, logout } = useAuth();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [loggedInUser, setLoggedInUser] = React.useState<UserResponse | null>(null);

  const currentUser = loggedInUser || (isAuthenticated && authUser ? authUser : null);

  const formik = useFormik<LoginFormData>({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: loginValidationSchema,
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: async (values, { setSubmitting }) => {
      setErrorMessage(null);
      try {
        const user = await loginUser({
          email: values.email,
          password: values.password,
        });
        setLoggedInUser(user);
      } catch (err: unknown) {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Une erreur inattendue est survenue lors de la connexion.'
        );
      } finally {
        setSubmitting(false);
      }
    },
  });

  if (currentUser) {
    const roleLabel =
      currentUser.role === 'ADMIN'
        ? 'Administrateur'
        : currentUser.role === 'MERCHANT'
          ? 'Commerçant'
          : 'Citoyen';

    const displayName =
      [currentUser.firstName, currentUser.lastName].filter(Boolean).join(' ') || currentUser.email;

    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-md">
        <CardHeader className="text-center pb-3">
          <div className="mx-auto size-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
            <CheckCircle2 className="size-6" />
          </div>
          <CardTitle className="text-xl sm:text-2xl text-foreground">
            Ravi de vous revoir, {currentUser.firstName || displayName} !
          </CardTitle>
          <CardDescription className="text-sm">
            Vous êtes connecté à votre profil citoyen ShopLoc.
          </CardDescription>
          <div className="flex justify-center items-center gap-2 mt-2">
            <Badge
              variant={
                currentUser.role === 'ADMIN'
                  ? 'destructive'
                  : currentUser.role === 'MERCHANT'
                    ? 'secondary'
                    : 'outline'
              }
              className="px-2.5 py-0.5 text-xs font-medium"
            >
              Rôle : {roleLabel}
            </Badge>
            <Badge
              variant="outline"
              className="px-2 py-0.5 text-[11px] font-normal border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
            >
              Session active
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-xl border bg-background/80 p-4 space-y-3">
            {currentUser.clientCode && (
              <div className="flex items-center justify-between border-b pb-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <IdCard className="size-4 text-primary" />
                  <span>Code Client</span>
                </div>
                <span className="font-mono text-sm font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded">
                  {currentUser.clientCode}
                </span>
              </div>
            )}

            <div className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
              <div>
                <span className="text-xs text-muted-foreground block">Nom complet</span>
                <span className="font-medium text-foreground">{displayName}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Adresse email</span>
                <span className="font-medium text-foreground">{currentUser.email}</span>
              </div>
            </div>

            {currentUser.pickupLocation ? (
              <div className="pt-2 border-t text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="size-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs text-muted-foreground block">
                      Point de retrait de votre carte
                    </span>
                    <span className="font-medium text-foreground">
                      {currentUser.pickupLocation}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="pt-2 border-t text-sm">
                <div className="flex items-start gap-2">
                  <Smartphone className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs text-muted-foreground block">
                      Format de votre carte locale
                    </span>
                    <span className="font-medium text-emerald-600">
                      Carte 100% numérique (dématérialisée)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
            <span>
              Votre session sécurisée est active. Vous pouvez naviguer sur la plateforme et accéder
              à tous vos services locaux.
            </span>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2.5 pt-2">
          <div className="flex flex-col sm:flex-row gap-2.5 w-full">
            <a
              href={ROUTES.stores.path}
              className={buttonVariants({
                variant: 'default',
                size: 'default',
                className: 'flex-1',
              })}
            >
              <StoreIcon className="size-4 mr-2" />
              Explorer les commerces
            </a>

            <a
              href={ROUTES.cart.path}
              className={buttonVariants({
                variant: 'outline',
                size: 'default',
                className: 'flex-1',
              })}
            >
              <ShoppingBag className="size-4 mr-2" />
              Mes commandes
            </a>
          </div>

          {(currentUser.role === 'ADMIN' || currentUser.role === 'MERCHANT') && (
            <a
              href={ROUTES.createStore.path}
              className={buttonVariants({
                variant: 'secondary',
                size: 'default',
                className: 'w-full gap-2',
              })}
            >
              <PlusCircle className="size-4 text-primary" />
              <span>Ajouter un établissement</span>
            </a>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 mt-1"
            onClick={() => {
              logout();
              setLoggedInUser(null);
            }}
          >
            <LogOut className="size-4 mr-2" />
            Déconnexion
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <LogIn className="size-5 text-primary" />
          <span>Connexion Citoyenne</span>
        </CardTitle>
        <CardDescription>
          Connectez-vous pour retrouver vos commerces favoris et votre carte de fidélité.
        </CardDescription>
      </CardHeader>

      <form onSubmit={formik.handleSubmit} noValidate>
        <CardContent className="space-y-4">
          {errorMessage && (
            <div className="flex items-center gap-2.5 p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">Adresse email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="camille.martin@example.fr"
              autoComplete="email"
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              disabled={formik.isSubmitting}
              aria-invalid={Boolean(formik.touched.email && formik.errors.email)}
            />
            {formik.touched.email && formik.errors.email && (
              <p className="text-[12px] text-destructive flex items-center gap-1 mt-1">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{formik.errors.email}</span>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Mot de passe</Label>
            <PasswordInput
              id="password"
              name="password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              disabled={formik.isSubmitting}
              error={Boolean(formik.touched.password && formik.errors.password)}
            />
            {formik.touched.password && formik.errors.password && (
              <p className="text-[12px] text-destructive flex items-center gap-1 mt-1">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{formik.errors.password}</span>
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 border-t pt-4">
          <Button type="submit" disabled={formik.isSubmitting} className="w-full">
            {formik.isSubmitting ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Connexion en cours...
              </>
            ) : (
              'Se connecter'
            )}
          </Button>

          <div className="text-center text-xs text-muted-foreground">
            <span>Nouveau sur ShopLoc ? </span>
            <a
              href={ROUTES.register.path}
              className="text-primary font-medium hover:underline inline-flex items-center gap-1"
            >
              <UserPlus className="size-3" />
              Créer un compte
            </a>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
