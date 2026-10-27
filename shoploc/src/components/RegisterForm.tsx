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
import { PickupLocationSelect, DEFAULT_MUNICIPALITY_LOCATION } from './PickupLocationSelect';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import {
  registerValidationSchema,
  calculateAge,
  type RegisterFormData,
} from '@/lib/validation/register';
import { registerUser } from '@/lib/api';
import { ROUTES } from '@/config/routes';
import type { Store } from '@/types/store';
import type { UserResponse } from '@/types/user';
import {
  User,
  Lock,
  MapPin,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Store as StoreIcon,
  ShieldCheck,
  IdCard,
} from 'lucide-react';

interface RegisterFormProps {
  initialStores?: Store[];
}

export function RegisterForm({ initialStores = [] }: RegisterFormProps) {
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [registeredUser, setRegisteredUser] = React.useState<UserResponse | null>(null);

  const formik = useFormik<RegisterFormData>({
    initialValues: {
      firstName: '',
      lastName: '',
      birthDate: '',
      email: '',
      password: '',
      confirmPassword: '',
      pickupLocation: DEFAULT_MUNICIPALITY_LOCATION,
    },
    validationSchema: registerValidationSchema,
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: async (values, { setSubmitting }) => {
      setErrorMessage(null);
      try {
        const user = await registerUser({
          firstName: values.firstName,
          lastName: values.lastName,
          birthDate: values.birthDate,
          email: values.email,
          password: values.password,
          pickupLocation: values.pickupLocation,
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
      } finally {
        setSubmitting(false);
      }
    },
  });

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
            Votre compte citoyen a été créé avec succès et est{' '}
            <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">
              immédiatement actif
            </strong>
            .
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-xl border bg-background/80 p-4 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <IdCard className="size-4" />
                <span>Code Client</span>
              </div>
              <span className="font-mono text-sm font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded">
                {registeredUser.clientCode}
              </span>
            </div>

            <div className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-xs text-muted-foreground block">Nom complet</span>
                <span className="font-medium">
                  {registeredUser.firstName} {registeredUser.lastName}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Adresse email</span>
                <span className="font-medium">{registeredUser.email}</span>
              </div>
            </div>

            <div className="pt-2 border-t text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="size-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs text-muted-foreground block">
                    Point de retrait de votre carte physique
                  </span>
                  <span className="font-medium">
                    {registeredUser.pickupLocation || DEFAULT_MUNICIPALITY_LOCATION}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
            <span>
              Vous pouvez dès à présent cumuler des points et soutenir vos commerçants de proximité.
            </span>
          </div>
        </CardContent>

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
            href={ROUTES.home.path}
            className={buttonVariants({
              variant: 'outline',
              size: 'default',
              className: 'w-full sm:flex-1',
            })}
          >
            Retour à l'accueil
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

      <form onSubmit={formik.handleSubmit} noValidate>
        <CardContent className="space-y-6">
          {errorMessage && (
            <div className="flex items-center gap-2.5 p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section: Personal Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1.5 flex items-center gap-1.5">
              <User className="size-3.5" />
              <span>Informations personnelles</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">Prénom</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="ex. Camille"
                  value={formik.values.firstName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  disabled={formik.isSubmitting}
                  aria-invalid={Boolean(formik.touched.firstName && formik.errors.firstName)}
                />
                {formik.touched.firstName && formik.errors.firstName && (
                  <p className="text-[12px] text-destructive flex items-center gap-1 mt-1">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>{formik.errors.firstName}</span>
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="ex. Martin"
                  value={formik.values.lastName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  disabled={formik.isSubmitting}
                  aria-invalid={Boolean(formik.touched.lastName && formik.errors.lastName)}
                />
                {formik.touched.lastName && formik.errors.lastName && (
                  <p className="text-[12px] text-destructive flex items-center gap-1 mt-1">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>{formik.errors.lastName}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="birthDate">Date de naissance</Label>
              <Input
                id="birthDate"
                name="birthDate"
                type="date"
                value={formik.values.birthDate}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                disabled={formik.isSubmitting}
                aria-invalid={Boolean(formik.touched.birthDate && formik.errors.birthDate)}
              />
              {formik.touched.birthDate && formik.errors.birthDate && (
                <p className="text-[12px] text-destructive flex items-center gap-1 mt-1">
                  <AlertCircle className="size-3.5 shrink-0" />
                  <span>{formik.errors.birthDate}</span>
                </p>
              )}
              {!formik.errors.birthDate && formik.values.birthDate && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                  <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Âge calculé : {calculateAge(formik.values.birthDate)} ans (éligible)</span>
                </p>
              )}
            </div>
          </div>

          {/* Section: Credentials */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1.5 flex items-center gap-1.5">
              <Lock className="size-3.5" />
              <span>Identifiants de connexion</span>
            </h3>

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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={formik.values.password}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  disabled={formik.isSubmitting}
                  aria-invalid={Boolean(formik.touched.password && formik.errors.password)}
                />
                {formik.touched.password && formik.errors.password && (
                  <p className="text-[12px] text-destructive flex items-center gap-1 mt-1">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>{formik.errors.password}</span>
                  </p>
                )}
                {/* Real-time Password Strength Meter */}
                <PasswordStrengthMeter password={formik.values.password} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={formik.values.confirmPassword}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  disabled={formik.isSubmitting}
                  aria-invalid={Boolean(
                    formik.touched.confirmPassword && formik.errors.confirmPassword
                  )}
                />
                {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                  <p className="text-[12px] text-destructive flex items-center gap-1 mt-1">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>{formik.errors.confirmPassword}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section: Card Pickup Location */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1.5 flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              <span>Retrait de la carte physique</span>
            </h3>

            <div className="space-y-1.5">
              <Label htmlFor="pickupLocation">Lieu de retrait souhaité</Label>
              <PickupLocationSelect
                id="pickupLocation"
                value={formik.values.pickupLocation}
                onValueChange={(val) => formik.setFieldValue('pickupLocation', val)}
                stores={initialStores}
                disabled={formik.isSubmitting}
              />
              {formik.touched.pickupLocation && formik.errors.pickupLocation && (
                <p className="text-[12px] text-destructive flex items-center gap-1 mt-1">
                  <AlertCircle className="size-3.5 shrink-0" />
                  <span>{formik.errors.pickupLocation}</span>
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Choisissez entre l'accueil de la mairie ou l'un des commerces partenaires de votre
                ville.
              </p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            En validant, votre compte est activé sans délai.
          </p>

          <Button type="submit" disabled={formik.isSubmitting} className="w-full sm:w-auto">
            {formik.isSubmitting ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Création en cours...
              </>
            ) : (
              'Créer mon compte'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
