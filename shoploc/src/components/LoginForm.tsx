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
import { PasswordInput } from './PasswordInput';
import { loginValidationSchema, type LoginFormData } from '@/lib/validation/login';
import { loginUser } from '@/lib/api';
import { ROUTES } from '@/config/routes';
import type { UserResponse } from '@/types/user';
import {
  LogIn,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Store as StoreIcon,
  UserPlus,
} from 'lucide-react';

export function LoginForm() {
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [loggedInUser, setLoggedInUser] = React.useState<UserResponse | null>(null);

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

  if (loggedInUser) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto size-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
            <CheckCircle2 className="size-6" />
          </div>
          <CardTitle className="text-xl sm:text-2xl text-foreground">
            Ravi de vous revoir, {loggedInUser.firstName} !
          </CardTitle>
          <CardDescription className="text-sm">
            Vous êtes connecté avec succès à votre compte citoyen ShopLoc.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 text-center">
          <p className="text-xs text-muted-foreground">
            Accédez à vos avantages commerçants et cumulez vos points fidélité.
          </p>
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
            Explorer les commerces
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
