import * as React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  User,
  Settings,
  Bell,
  Shield,
  MapPin,
  HelpCircle,
  LogOut,
  Moon,
  Sun,
  Laptop,
  Check,
  ShoppingBag,
  Wallet,
  UserPlus,
  LogIn,
  PlusCircle,
  Loader2,
  AlertCircle,
  IdCard,
  Store as StoreIcon,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { updateUserProfile } from '@/lib/api';

interface AppSidebarProps {
  currentPath?: string;
}

export function AppSidebar({ currentPath: _currentPath = '/' }: AppSidebarProps) {
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isWalletOpen, setIsWalletOpen] = React.useState(false);

  const { user, isAuthenticated, role, logout } = useAuth();

  // Real profile form state linked to authenticated user
  const [profileForm, setProfileForm] = React.useState({
    firstName: '',
    lastName: '',
    email: '',
    pickupLocation: '',
    birthDate: '',
  });

  const [isSavingProfile, setIsSavingProfile] = React.useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = React.useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        pickupLocation: user.pickupLocation || '',
        birthDate: user.birthDate || '',
      });
    }
  }, [user]);

  // Accessibility / notification settings
  const [settings, setSettings] = React.useState({
    emailNotifs: true,
    promoNotifs: true,
    soundFeedback: false,
    theme: 'system' as 'light' | 'dark' | 'system',
  });

  React.useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setSettings((s) => ({ ...s, theme: 'dark' }));
    } else if (savedTheme === 'light') {
      setSettings((s) => ({ ...s, theme: 'light' }));
    }
  }, []);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setSettings((s) => ({ ...s, theme: newTheme }));
    const isDark =
      newTheme === 'dark' ||
      (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList[isDark ? 'add' : 'remove']('dark');
    if (newTheme === 'system') {
      localStorage.removeItem('theme');
    } else {
      localStorage.setItem('theme', newTheme === 'dark' ? 'dark' : 'light');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.id) return;

    setIsSavingProfile(true);
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);

    try {
      await updateUserProfile(user.id, {
        firstName: profileForm.firstName.trim() || undefined,
        lastName: profileForm.lastName.trim() || undefined,
        pickupLocation: profileForm.pickupLocation.trim() || undefined,
        birthDate: profileForm.birthDate.trim() || undefined,
      });

      setProfileSuccessMsg('Profil mis à jour avec succès !');
      setTimeout(() => {
        setProfileSuccessMsg(null);
        setIsProfileOpen(false);
      }, 1500);
    } catch (err: unknown) {
      setProfileErrorMsg(
        err instanceof Error ? err.message : 'Erreur lors de la mise à jour du profil.'
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
    : '';

  const roleLabel =
    user?.role === 'ADMIN'
      ? 'Administrateur'
      : user?.role === 'MERCHANT'
        ? 'Commerçant'
        : 'Citoyen';

  const userInitials = user
    ? (user.firstName?.[0] || user.email?.[0] || 'U').toUpperCase() +
      (user.lastName?.[0] || '').toUpperCase()
    : 'SL';

  return (
    <>
      <Sidebar collapsible="offcanvas" className="border-r">
        {/* Sidebar Header with avatar and user info */}
        <SidebarHeader className="p-4 border-b">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <Avatar size="lg" className="border">
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold truncate leading-tight">{displayName}</span>
                <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                <div className="flex items-center gap-1.5 mt-1">
                  {user.clientCode && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-primary/10 text-primary">
                      {user.clientCode}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground font-medium">
                    ({roleLabel})
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Avatar size="lg" className="border">
                <AvatarFallback className="bg-muted text-muted-foreground font-semibold text-xs">
                  SL
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold truncate leading-tight">
                  ShopLoc Collectiv'IT
                </span>
                <span className="text-xs text-muted-foreground truncate">Espace non connecté</span>
              </div>
            </div>
          )}
        </SidebarHeader>

        <SidebarContent>
          {/* Profile & Account section */}
          <SidebarGroup>
            <SidebarGroupLabel>Mon Compte</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {!isAuthenticated ? (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton render={<a href="/register" />}>
                        <UserPlus className="size-4 text-muted-foreground" />
                        <span>Créer un compte</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton render={<a href="/login" />}>
                        <LogIn className="size-4 text-muted-foreground" />
                        <span>Se connecter</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                ) : (
                  role === 'ADMIN' && (
                    <SidebarMenuItem>
                      <SidebarMenuButton render={<a href="/stores/new" />}>
                        <PlusCircle className="size-4 text-primary" />
                        <span className="font-medium text-primary">Nouveau commerce</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                )}

                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => setIsProfileOpen(true)}>
                    <User className="size-4 text-muted-foreground" />
                    <span>Afficher mon profil</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton render={<a href="/cart" />}>
                    <ShoppingBag className="size-4 text-muted-foreground" />
                    <span>Mes commandes</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => setIsWalletOpen(true)}>
                    <Wallet className="size-4 text-muted-foreground" />
                    <div className="flex items-center justify-between flex-1">
                      <span>Portefeuille & Fidélité</span>
                      {user?.clientCode && (
                        <span className="text-[10px] font-mono font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          {user.clientCode}
                        </span>
                      )}
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton render={<a href="/stores" />}>
                    <StoreIcon className="size-4 text-muted-foreground" />
                    <span>Commerces partenaires</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          {/* Preferences & Settings section */}
          <SidebarGroup>
            <SidebarGroupLabel>Paramètres</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => setIsSettingsOpen(true)}>
                    <Settings className="size-4 text-muted-foreground" />
                    <span>Préférences générales</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => setIsSettingsOpen(true)}>
                    <Bell className="size-4 text-muted-foreground" />
                    <span>Notifications & Alertes</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => setIsSettingsOpen(true)}>
                    <Shield className="size-4 text-muted-foreground" />
                    <span>Sécurité & Confidentialité</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          {/* Help & Support section */}
          <SidebarGroup>
            <SidebarGroupLabel>Assistance</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton render={<a href="/stores" />}>
                    <HelpCircle className="size-4 text-muted-foreground" />
                    <span>Centre d'aide & FAQ</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Sidebar Footer */}
        <SidebarFooter className="p-3 border-t">
          {isAuthenticated ? (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (window.confirm('Voulez-vous vous déconnecter de ShopLoc ?')) {
                  logout();
                }
              }}
            >
              <LogOut className="size-4 mr-2" />
              <span>Déconnexion</span>
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="w-full justify-start"
              render={<a href="/login" />}
            >
              <LogIn className="size-4 mr-2" />
              <span>Se connecter</span>
            </Button>
          )}
        </SidebarFooter>
      </Sidebar>

      {/* Profile Detail & Edit Dialog */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="size-5 text-primary" />
              <span>Mon Profil ShopLoc</span>
            </DialogTitle>
            <DialogDescription>
              {isAuthenticated
                ? 'Consultez et modifiez les informations de votre compte citoyen.'
                : 'Connectez-vous pour accéder à vos informations personnelles.'}
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
                <Button size="sm" render={<a href="/login" />}>
                  Se connecter
                </Button>
                <Button variant="outline" size="sm" render={<a href="/register" />}>
                  Créer un compte
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} className="space-y-4 py-2">
              <div className="flex items-center gap-4 p-3 rounded-lg border bg-muted/40">
                <Avatar size="lg" className="border">
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {user?.clientCode && (
                      <span className="text-xs font-mono font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        {user.clientCode}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground font-medium">{roleLabel}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="prof-firstname">Prénom</Label>
                  <Input
                    id="prof-firstname"
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                    placeholder="Prénom"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="prof-lastname">Nom</Label>
                  <Input
                    id="prof-lastname"
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                    placeholder="Nom"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prof-email">Adresse e-mail (identifiant)</Label>
                <Input
                  id="prof-email"
                  type="email"
                  value={profileForm.email}
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
                    className="pl-9"
                    value={profileForm.pickupLocation}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, pickupLocation: e.target.value })
                    }
                    placeholder="Ex. Mairie Centrale, 1 Place de la Mairie"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prof-birthdate">Date de naissance</Label>
                <Input
                  id="prof-birthdate"
                  type="date"
                  value={profileForm.birthDate}
                  onChange={(e) => setProfileForm({ ...profileForm, birthDate: e.target.value })}
                />
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
                <Button type="button" variant="outline" onClick={() => setIsProfileOpen(false)}>
                  Fermer
                </Button>
                <Button type="submit" disabled={isSavingProfile}>
                  {isSavingProfile && <Loader2 className="size-4 mr-2 animate-spin" />}
                  Enregistrer les modifications
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="size-5 text-primary" />
              <span>Paramètres de l'application</span>
            </DialogTitle>
            <DialogDescription>
              Configurez vos préférences d'affichage et vos notifications.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Theme selection */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Thème d'affichage
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={settings.theme === 'light' ? 'default' : 'outline'}
                  size="sm"
                  className="w-full flex items-center gap-1.5 text-xs"
                  onClick={() => handleThemeChange('light')}
                >
                  <Sun className="size-3.5" />
                  Clair
                </Button>
                <Button
                  type="button"
                  variant={settings.theme === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  className="w-full flex items-center gap-1.5 text-xs"
                  onClick={() => handleThemeChange('dark')}
                >
                  <Moon className="size-3.5" />
                  Sombre
                </Button>
                <Button
                  type="button"
                  variant={settings.theme === 'system' ? 'default' : 'outline'}
                  size="sm"
                  className="w-full flex items-center gap-1.5 text-xs"
                  onClick={() => handleThemeChange('system')}
                >
                  <Laptop className="size-3.5" />
                  Système
                </Button>
              </div>
            </div>

            <SidebarSeparator />

            {/* Notification preferences */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Notifications
              </Label>

              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Alertes de commandes</p>
                  <p className="text-xs text-muted-foreground">
                    Recevoir les mises à jour sur l'état de préparation et retrait.
                  </p>
                </div>
                <Switch
                  checked={settings.emailNotifs}
                  onCheckedChange={(checked) =>
                    setSettings((s) => ({ ...s, emailNotifs: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Bons plans & Commerces locaux</p>
                  <p className="text-xs text-muted-foreground">
                    Notifications sur les offres fidélité et nouveaux commerçants.
                  </p>
                </div>
                <Switch
                  checked={settings.promoNotifs}
                  onCheckedChange={(checked) =>
                    setSettings((s) => ({ ...s, promoNotifs: checked }))
                  }
                />
              </div>
            </div>

            <SidebarSeparator />

            {/* Privacy & Localization */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Confidentialité
              </Label>
              <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1 text-muted-foreground">
                <p className="font-medium text-foreground">
                  Collectiv'IT & Souveraineté des données
                </p>
                <p>
                  Vos données sont protégées et hébergées localement dans le cadre du réseau de
                  votre commune.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsSettingsOpen(false)}>Terminer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wallet & Loyalty Card Dialog */}
      <Dialog open={isWalletOpen} onOpenChange={setIsWalletOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="size-5 text-primary" />
              <span>Carte Fidélité & Portefeuille Local</span>
            </DialogTitle>
            <DialogDescription>
              Retrouvez votre identifiant citoyen pour vos achats auprès des commerçants adhérents.
            </DialogDescription>
          </DialogHeader>

          {!isAuthenticated || !user ? (
            <div className="py-6 text-center space-y-4">
              <div className="mx-auto size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <Wallet className="size-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold">Portefeuille Citoyen</h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Connectez-vous pour consulter votre carte de fidélité et votre identifiant
                  commerçant.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button size="sm" render={<a href="/login" />}>
                  Se connecter
                </Button>
                <Button variant="outline" size="sm" render={<a href="/register" />}>
                  Créer un compte
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Digital Citizen Card */}
              <div className="rounded-xl border bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IdCard className="size-5 text-primary" />
                    <span className="text-xs font-bold tracking-wider uppercase text-foreground">
                      Collectiv'IT Pass
                    </span>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-primary text-primary-foreground">
                    Fidélité Active
                  </span>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Titulaire de la carte</p>
                  <p className="text-lg font-bold text-foreground leading-tight">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>

                <div className="pt-2 border-t border-primary/20 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                      Code Client Commerçant
                    </span>
                    <span className="font-mono text-base font-extrabold text-primary">
                      {user.clientCode || 'Attribué en mairie'}
                    </span>
                  </div>
                  {user.pickupLocation && (
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                        Point de retrait
                      </span>
                      <span className="text-xs font-medium text-foreground truncate max-w-[140px] inline-block">
                        {user.pickupLocation}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Instructions */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <Check className="size-3.5 text-primary" />
                  Comment utiliser votre carte locale ?
                </p>
                <p>
                  Présentez simplement votre code client lors de votre passage en caisse chez les
                  commerçants partenaires de votre commune pour cumuler et faire valoir vos
                  avantages.
                </p>
              </div>

              <div className="pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  render={<a href="/stores" />}
                >
                  <StoreIcon className="size-4 mr-2" />
                  Découvrir les commerces participants
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsWalletOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
