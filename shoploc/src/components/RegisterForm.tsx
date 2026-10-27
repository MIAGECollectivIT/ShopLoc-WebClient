import * as React from 'react';
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
  const [formData, setFormData] = React.useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    email: '',
    password: '',
    confirmPassword: '',
    pickupLocation: DEFAULT_MUNICIPALITY_LOCATION,
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [registeredUser, setRegisteredUser] = React.useState<UserResponse | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLocationChange = (value: string) => {
    setFormData((prev) => ({ ...prev, pickupLocation: value }));
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    // Initial client check for mandatory fields and matching passwords
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setErrorMessage('Veuillez renseigner votre nom et prénom.');
      return;
    }

    if (!formData.birthDate) {
      setErrorMessage('Veuillez sélectionner votre date de naissance.');
      return;
    }

    if (!formData.email.trim()) {
      setErrorMessage('Veuillez saisir une adresse email.');
      return;
    }

    if (!formData.password) {
      setErrorMessage('Veuillez saisir un mot de passe.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Les mots de passe saisis ne correspondent pas.');
      return;
    }

    setIsSubmitting(true);

    try {
      const user = await registerUser({
        firstName: formData.firstName,
        lastName: formData.lastName,
        birthDate: formData.birthDate,
        email: formData.email,
        password: formData.password,
        pickupLocation: formData.pickupLocation,
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
      setIsSubmitting(false);
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

      <form onSubmit={handleSubmit}>
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
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="ex. Martin"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="birthDate">Date de naissance</Label>
              <Input
                id="birthDate"
                name="birthDate"
                type="date"
                required
                value={formData.birthDate}
                onChange={handleChange}
                disabled={isSubmitting}
              />
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
                required
                value={formData.email}
                onChange={handleChange}
                disabled={isSubmitting}
              />
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
                  required
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
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
                value={formData.pickupLocation}
                onValueChange={handleLocationChange}
                stores={initialStores}
                disabled={isSubmitting}
              />
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
        </CardFooter>
      </form>
    </Card>
  );
}
