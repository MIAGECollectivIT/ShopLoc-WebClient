import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import { PickupLocationSelect, DEFAULT_MUNICIPALITY_LOCATION } from './PickupLocationSelect';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { PasswordInput } from './PasswordInput';
import { registerZodSchema, calculateAge, type RegisterFormData } from '@/lib/validation/register';
import { registerUser, loginUser } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ROUTES } from '@/config/routes';
import type { Store } from '@/types/store';
import type { UserResponse } from '@/types/user';
import {
  User,
  Lock,
  MapPin,
  IdCard,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Store as StoreIcon,
  LogIn,
  Smartphone,
  CreditCard,
} from 'lucide-react';

interface RegisterFormProps {
  initialStores?: Store[];
}

export function RegisterForm({ initialStores = [] }: RegisterFormProps) {
  const { isAuthenticated, user: authUser, isLoading } = useAuth();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [registeredUser, setRegisteredUser] = React.useState<UserResponse | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerZodSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      birthDate: '',
      email: '',
      password: '',
      confirmPassword: '',
      wantsPhysicalCard: false,
      pickupLocation: DEFAULT_MUNICIPALITY_LOCATION,
    },
    mode: 'onTouched',
  });

  const birthDateValue = watch('birthDate') || '';
  const passwordValue = watch('password') || '';
  const firstNameValue = watch('firstName') || '';
  const lastNameValue = watch('lastName') || '';
  const emailValue = watch('email') || '';
  const wantsPhysicalCardValue = watch('wantsPhysicalCard');

  const onSubmit = async (values: RegisterFormData) => {
    setErrorMessage(null);
    try {
      const user = await registerUser({
        firstName: values.firstName,
        lastName: values.lastName,
        birthDate: values.birthDate,
        email: values.email,
        password: values.password,
        pickupLocation:
          values.wantsPhysicalCard && values.pickupLocation ? values.pickupLocation : undefined,
      });

      // Automatically log the user in immediately after successful registration
      await loginUser({
        email: values.email,
        password: values.password,
      });

      setRegisteredUser(user);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('Email already in use')) {
        setErrorMessage(
          'Cette adresse email est déjà associée à un compte. Veuillez vous connecter ou utiliser un autre email.'
        );
      } else {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Une erreur inattendue est survenue lors de votre inscription.'
        );
      }
    }
  };

  if (registeredUser) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto size-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
            <CheckCircle2 className="size-6" />
          </div>
          <CardTitle className="text-xl sm:text-2xl text-foreground">
            Bienvenue sur ShopLoc, {registeredUser.firstName} !
          </CardTitle>
          <CardDescription className="text-sm">
            Votre compte citoyen a été créé avec succès et vous êtes{' '}
            <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">
              directement connecté
            </strong>
            .
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-xl border bg-background/80 p-4 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Numéro Client
              </span>
              <span className="font-mono text-sm font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded">
                {registeredUser.clientCode}
              </span>
            </div>

            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nom complet :</span>
                <span className="font-medium">
                  {registeredUser.firstName} {registeredUser.lastName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Adresse email :</span>
                <span className="font-medium">{registeredUser.email}</span>
              </div>
            </div>

            {registeredUser.pickupLocation ? (
              <div className="pt-2 border-t text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="size-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs text-muted-foreground block">
                      Point de retrait de votre carte physique
                    </span>
                    <span className="font-medium">{registeredUser.pickupLocation}</span>
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
                    <span className="text-xs text-muted-foreground block mt-0.5">
                      Aucun retrait physique nécessaire. Votre code client est actif immédiatement.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-foreground/90 space-y-1">
            <p className="font-semibold text-emerald-700 dark:text-emerald-300">
              Votre carte de fidélité physique est en cours de préparation.
            </p>
            <p className="text-muted-foreground">
              Présentez votre numéro client lors de votre passage au point de retrait choisi pour la
              récupérer. En attendant, vous pouvez d'ores et déjà explorer vos commerces
              partenaires.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-3 pt-2">
          <a
            href={ROUTES.home.path}
            className={buttonVariants({
              variant: 'outline',
              size: 'default',
              className: 'w-full sm:flex-1',
            })}
          >
            Retour à l'accueil
          </a>
          <a
            href={ROUTES.login.path}
            className={buttonVariants({
              variant: 'secondary',
              size: 'default',
              className: 'w-full sm:flex-1',
            })}
          >
            <User className="size-4 mr-2" />
            Mon profil
          </a>
        </CardFooter>
      </Card>
    );
  }

  if (mounted && !isLoading && isAuthenticated && authUser) {
    const displayName =
      [authUser.firstName, authUser.lastName].filter(Boolean).join(' ') || authUser.email;

    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="text-center pb-3">
          <div className="mx-auto size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
            <CheckCircle2 className="size-6" />
          </div>
          <CardTitle className="text-xl sm:text-2xl text-foreground">
            Vous êtes déjà connecté
          </CardTitle>
          <CardDescription className="text-sm">
            Vous êtes connecté en tant que{' '}
            <strong className="text-foreground">{displayName}</strong>.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col sm:flex-row gap-3 pt-2">
          <a
            href={ROUTES.stores.path}
            className={buttonVariants({
              variant: 'default',
              size: 'default',
              className: 'w-full sm:flex-1',
            })}
          >
            <StoreIcon className="size-4 mr-2" />
            Découvrir les boutiques
          </a>
          <a
            href={ROUTES.login.path}
            className={buttonVariants({
              variant: 'secondary',
              size: 'default',
              className: 'w-full sm:flex-1',
            })}
          >
            <User className="size-4 mr-2" />
            Mon profil
          </a>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Créer un compte client</CardTitle>
        <CardDescription>
          Renseignez vos informations personnelles pour rejoindre le réseau local de fidélité.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-6">
          {errorMessage && (
            <div className="flex items-center justify-between gap-2.5 p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              {errorMessage.includes('déjà associée') && (
                <a
                  href={ROUTES.login.path}
                  className="font-semibold underline hover:opacity-80 shrink-0 text-xs sm:text-sm"
                >
                  Se connecter
                </a>
              )}
            </div>
          )}

          {/* Section: Personal Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1.5 flex items-center gap-1.5">
              <User className="size-3.5" />
              <span>Informations personnelles</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="firstName">Prénom</FieldLabel>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="ex. Camille"
                  disabled={isSubmitting}
                  className={
                    errors.firstName ? 'border-destructive focus-visible:ring-destructive' : ''
                  }
                  {...register('firstName')}
                />
                <FieldError>{errors.firstName?.message}</FieldError>
              </Field>

              <Field>
                <FieldLabel htmlFor="lastName">Nom</FieldLabel>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="ex. Martin"
                  disabled={isSubmitting}
                  className={
                    errors.lastName ? 'border-destructive focus-visible:ring-destructive' : ''
                  }
                  {...register('lastName')}
                />
                <FieldError>{errors.lastName?.message}</FieldError>
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="birthDate">Date de naissance</FieldLabel>
              <Input
                id="birthDate"
                type="date"
                disabled={isSubmitting}
                className={
                  errors.birthDate ? 'border-destructive focus-visible:ring-destructive' : ''
                }
                {...register('birthDate')}
              />
              <FieldError>{errors.birthDate?.message}</FieldError>
              {!errors.birthDate && birthDateValue && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                  <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Âge calculé : {calculateAge(birthDateValue)} ans (éligible)</span>
                </p>
              )}
            </Field>
          </div>

          {/* Section: Credentials */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1.5 flex items-center gap-1.5">
              <Lock className="size-3.5" />
              <span>Identifiants de connexion</span>
            </h3>

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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
                <PasswordInput
                  id="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  error={Boolean(errors.password)}
                  className={
                    errors.password ? 'border-destructive focus-visible:ring-destructive' : ''
                  }
                  {...register('password')}
                />
                <FieldError>{errors.password?.message}</FieldError>
                {/* Real-time Password Strength Meter */}
                <PasswordStrengthMeter
                  password={passwordValue}
                  userInfo={{
                    firstName: firstNameValue,
                    lastName: lastNameValue,
                    email: emailValue,
                  }}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="confirmPassword">Confirmer le mot de passe</FieldLabel>
                <PasswordInput
                  id="confirmPassword"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  error={Boolean(errors.confirmPassword)}
                  className={
                    errors.confirmPassword
                      ? 'border-destructive focus-visible:ring-destructive'
                      : ''
                  }
                  {...register('confirmPassword')}
                />
                <FieldError>{errors.confirmPassword?.message}</FieldError>
              </Field>
            </div>
          </div>

          {/* Section: Loyalty Card Format Choice */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1.5 flex items-center gap-1.5">
              <IdCard className="size-3.5" />
              <span>Format de votre carte de fidélité</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: 100% Digital */}
              <button
                type="button"
                onClick={() => {
                  setValue('wantsPhysicalCard', false, { shouldValidate: true });
                }}
                className={`relative flex flex-col text-left p-3.5 rounded-lg border transition-all cursor-pointer ${
                  !wantsPhysicalCardValue
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border bg-card hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Smartphone className="size-4 text-emerald-600" />
                    <span className="font-semibold text-sm">100% Dématérialisée</span>
                  </div>
                  <span className="text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                    Recommandé
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Active immédiatement sur votre téléphone. Aucun déplacement ni retrait nécessaire.
                </p>
              </button>

              {/* Option 2: Printed physical card */}
              <button
                type="button"
                onClick={() => {
                  setValue('wantsPhysicalCard', true, { shouldValidate: true });
                  const currentLoc = watch('pickupLocation');
                  if (!currentLoc) {
                    setValue('pickupLocation', DEFAULT_MUNICIPALITY_LOCATION, {
                      shouldValidate: true,
                    });
                  }
                }}
                className={`relative flex flex-col text-left p-3.5 rounded-lg border transition-all cursor-pointer ${
                  wantsPhysicalCardValue
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border bg-card hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="size-4 text-primary" />
                  <span className="font-semibold text-sm">Carte physique imprimée</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Carte plastique nominative à retirer en mairie ou chez un commerce partenaire.
                </p>
              </button>
            </div>

            {/* If user chooses physical card, show pickup location selector */}
            {wantsPhysicalCardValue && (
              <Field>
                <FieldLabel htmlFor="pickupLocation">Lieu de retrait souhaité</FieldLabel>
                <Controller
                  name="pickupLocation"
                  control={control}
                  render={({ field }) => (
                    <PickupLocationSelect
                      id="pickupLocation"
                      value={field.value || DEFAULT_MUNICIPALITY_LOCATION}
                      onValueChange={field.onChange}
                      stores={initialStores}
                      disabled={isSubmitting}
                    />
                  )}
                />
                <FieldError>{errors.pickupLocation?.message}</FieldError>
                <p className="text-[11px] text-muted-foreground">
                  Choisissez entre l'accueil de la mairie ou l'un des commerces partenaires de votre
                  ville.
                </p>
              </Field>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 border-t pt-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
            <p className="text-xs text-muted-foreground">
              En validant, votre compte est activé sans délai.
            </p>

            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Création en cours...
                </>
              ) : (
                'Créer mon compte'
              )}
            </Button>
          </div>

          <div className="text-center text-xs text-muted-foreground pt-1">
            <span>Vous avez déjà un compte ? </span>
            <a
              href={ROUTES.login.path}
              className="text-primary font-medium hover:underline inline-flex items-center gap-1"
            >
              <LogIn className="size-3" />
              Se connecter
            </a>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
