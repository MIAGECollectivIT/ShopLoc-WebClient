import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, MapPin, Loader2, Check, AlertCircle } from 'lucide-react';
import { updateUserProfile } from '@/lib/api';
import {
  userProfileUpdateSchema,
  type UserProfileUpdateFormData,
} from '@/lib/validation/userProfile';
import type { UserResponse, UserRole } from '@/types/user';

export interface EditableProfileUser {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  clientCode?: string;
  pickupLocation?: string;
  birthDate?: string;
  role?: UserRole;
}

export interface UserProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: EditableProfileUser | null;
  isAuthenticated?: boolean;
  title?: string;
  description?: string;
  onSuccess?: (updatedUser: UserResponse) => void;
}

function buildProfileDefaults(user: EditableProfileUser | null): UserProfileUpdateFormData {
  return {
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    pickupLocation: user?.pickupLocation || '',
    birthDate: user?.birthDate ? user.birthDate.slice(0, 10) : '',
  };
}

/**
 * Shared profile edit modal used both in the sidebar ("Modifier mes informations")
 * and in the admin users supervision table ("Modifier l'utilisateur").
 * Enforces runtime Zod validation and cleans up pending timers on unmount.
 */
export function UserProfileEditDialog({
  open,
  onOpenChange,
  user,
  isAuthenticated = true,
  title = 'Mon Profil ShopLoc',
  description,
  onSuccess,
}: UserProfileEditDialogProps) {
  const [profileSuccessMsg, setProfileSuccessMsg] = React.useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = React.useState<string | null>(null);
  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserProfileUpdateFormData>({
    resolver: zodResolver(userProfileUpdateSchema),
    defaultValues: buildProfileDefaults(user),
    mode: 'onChange',
  });

  React.useEffect(() => {
    if (open) {
      reset(buildProfileDefaults(user));
      setProfileErrorMsg(null);
      setProfileSuccessMsg(null);
    }
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [user, open, reset]);

  const onSubmit = async (values: UserProfileUpdateFormData) => {
    if (!user?.id) return;

    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);

    try {
      const updated = await updateUserProfile(user.id, {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        pickupLocation: values.pickupLocation?.trim() || undefined,
        birthDate: values.birthDate.trim(),
      });

      setProfileSuccessMsg('Profil mis à jour avec succès !');
      onSuccess?.(updated);
      closeTimerRef.current = setTimeout(() => {
        setProfileSuccessMsg(null);
        onOpenChange(false);
      }, 900);
    } catch (err: unknown) {
      setProfileErrorMsg(
        err instanceof Error ? err.message : 'Erreur lors de la mise à jour du profil.'
      );
    }
  };

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
    : '';

  const userInitials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() ||
      user.email[0].toUpperCase()
    : 'U';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="size-5 text-primary" />
            <span>{title}</span>
          </DialogTitle>
          <DialogDescription>
            {description ??
              (isAuthenticated
                ? 'Consultez et modifiez les informations du compte utilisateur.'
                : 'Connectez-vous pour accéder à vos informations personnelles.')}
          </DialogDescription>
        </DialogHeader>

        {!isAuthenticated ? (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <User className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold">Espace non connecté</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Veuillez vous connecter ou vous inscrire pour consulter et modifier votre profil.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button size="sm" render={<a href="/login" data-astro-reload="" />}>
                Se connecter
              </Button>
              <Button
                variant="outline"
                size="sm"
                render={<a href="/register" data-astro-reload="" />}
              >
                Créer un compte
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2" noValidate>
            <div className="flex items-center gap-4 p-3 rounded-lg border bg-muted/40">
              <Avatar size="lg" className="border">
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                {user?.clientCode && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-mono font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      {user.clientCode}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prof-firstname">Prénom</Label>
                <Input
                  id="prof-firstname"
                  placeholder="Prénom"
                  disabled={isSubmitting}
                  className={errors.firstName ? 'border-destructive' : ''}
                  {...register('firstName')}
                />
                {errors.firstName && (
                  <p className="text-destructive text-xs">{errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prof-lastname">Nom</Label>
                <Input
                  id="prof-lastname"
                  placeholder="Nom"
                  disabled={isSubmitting}
                  className={errors.lastName ? 'border-destructive' : ''}
                  {...register('lastName')}
                />
                {errors.lastName && (
                  <p className="text-destructive text-xs">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prof-email">Adresse e-mail (identifiant)</Label>
              <Input
                id="prof-email"
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-muted/50 cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prof-pickup">Point de retrait favori</Label>
              <div className="relative">
                <MapPin className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  id="prof-pickup"
                  className={errors.pickupLocation ? 'pl-9 border-destructive' : 'pl-9'}
                  placeholder="Ex. Mairie Centrale, 1 Place de la Mairie"
                  disabled={isSubmitting}
                  {...register('pickupLocation')}
                />
              </div>
              {errors.pickupLocation && (
                <p className="text-destructive text-xs">{errors.pickupLocation.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prof-birthdate">Date de naissance</Label>
              <Input
                id="prof-birthdate"
                type="date"
                disabled={isSubmitting}
                className={errors.birthDate ? 'border-destructive' : ''}
                {...register('birthDate')}
              />
              {errors.birthDate && (
                <p className="text-destructive text-xs">{errors.birthDate.message}</p>
              )}
            </div>

            {profileErrorMsg && (
              <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2.5 rounded-md">
                <AlertCircle className="size-4 shrink-0" />
                <span>{profileErrorMsg}</span>
              </div>
            )}

            {profileSuccessMsg && (
              <div className="flex items-center gap-2 text-xs text-green-600 bg-green-500/10 p-2.5 rounded-md">
                <Check className="size-4 shrink-0" />
                <span>{profileSuccessMsg}</span>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Fermer
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 mr-2 animate-spin" />}
                Enregistrer les modifications
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
