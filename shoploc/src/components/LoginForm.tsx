import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import { PasswordInput } from './PasswordInput';
import { loginZodSchema, type LoginFormData } from '@/lib/validation/login';
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
  PlusCircle,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';

export function LoginForm() {
  const { isAuthenticated, user: authUser, logout } = useAuth();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [loggedInUser, setLoggedInUser] = React.useState<UserResponse | null>(null);

  const currentUser = loggedInUser || (isAuthenticated && authUser ? authUser : null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginZodSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onTouched',
  });

  const onSubmit = async (values: LoginFormData) => {
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
    }
  };

  if (currentUser) {
    const welcomeDescription =
      currentUser.role === 'ADMIN'
        ? "Vous êtes connecté à l'espace d'administration ShopLoc."
        : currentUser.role === 'MERCHANT'
          ? 'Vous êtes connecté à votre espace commerçant ShopLoc.'
          : 'Vous êtes connecté à votre profil citoyen ShopLoc.';

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
          <CardDescription className="text-sm">{welcomeDescription}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pb-6">
          <div className="rounded-xl border bg-background/80 p-4 space-y-3">
            {currentUser.role === 'CLIENT' && currentUser.clientCode && (
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

            {currentUser.role === 'CLIENT' &&
              currentUser.clientCode &&
              (currentUser.pickupLocation ? (
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
              ))}
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
            <span>
              Votre session sécurisée est active. Vous pouvez naviguer sur la plateforme et accéder
              à tous vos services locaux.
            </span>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2 pt-2">
          <a
            href={ROUTES.stores.path}
            className={buttonVariants({
              variant: 'default',
              size: 'default',
              className: 'w-full gap-2',
            })}
          >
            <StoreIcon className="size-4" />
            <span>Découvrir les commerces de ma ville</span>
          </a>

          {currentUser.role === 'ADMIN' && (
            <a
              href={ROUTES.createStore.path}
              className={buttonVariants({
                variant: 'outline',
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

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-4 pb-6">
          {errorMessage && (
            <div className="flex items-center gap-2.5 p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <Field>
            <FieldLabel htmlFor="email">Adresse email</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="camille.martin@example.fr"
              autoComplete="email"
              disabled={isSubmitting}
              className={errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
              {...register('email')}
            />
            <FieldError>{errors.email?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={isSubmitting}
              error={Boolean(errors.password)}
              className={errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}
              {...register('password')}
            />
            <FieldError>{errors.password?.message}</FieldError>
          </Field>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 border-t pt-4">
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
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
