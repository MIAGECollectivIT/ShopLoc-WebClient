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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Heart,
  HelpCircle,
  LogOut,
  Moon,
  Sun,
  Laptop,
  Check,
  ShoppingBag,
  Wallet,
  CreditCard,
  ArrowUpRight,
} from 'lucide-react';

interface AppSidebarProps {
  currentPath?: string;
}

export function AppSidebar({ currentPath: _currentPath = '/' }: AppSidebarProps) {
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isWalletOpen, setIsWalletOpen] = React.useState(false);
  const [walletBalance, setWalletBalance] = React.useState(42.5);
  const [topUpAmount, setTopUpAmount] = React.useState('20');
  const [topUpSuccessToast, setTopUpSuccessToast] = React.useState(false);

  // Mock editable profile data
  const [profile, setProfile] = React.useState({
    name: 'Camille Martin',
    email: 'camille.martin@collectivit.fr',
    city: 'Lyon',
    loyaltyPoints: 340,
    role: 'Citoyen éco-responsable',
  });

  const [editProfileForm, setEditProfileForm] = React.useState(profile);
  const [profileSavedToast, setProfileSavedToast] = React.useState(false);

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

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfile(editProfileForm);
    setProfileSavedToast(true);
    setTimeout(() => {
      setProfileSavedToast(false);
      setIsProfileOpen(false);
    }, 1200);
  };

  return (
    <>
      <Sidebar collapsible="offcanvas" className="border-r">
        {/* Sidebar Header with avatar and user info */}
        <SidebarHeader className="p-4 border-b">
          <div className="flex items-center gap-3">
            <Avatar size="lg" className="border">
              <AvatarImage
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                alt={profile.name}
              />
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xs">
                CM
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold truncate leading-tight">{profile.name}</span>
              <span className="text-xs text-muted-foreground truncate">{profile.email}</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                  {profile.loyaltyPoints} pts fidélité
                </span>
              </div>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          {/* Profile & Account section */}
          <SidebarGroup>
            <SidebarGroupLabel>Mon Compte</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => {
                      setEditProfileForm(profile);
                      setIsProfileOpen(true);
                    }}
                  >
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
                      <span>Portefeuille</span>
                      <span className="text-xs font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        {walletBalance.toFixed(2)} €
                      </span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => {
                      setEditProfileForm(profile);
                      setIsProfileOpen(true);
                    }}
                  >
                    <Heart className="size-4 text-muted-foreground" />
                    <span>Commerces favoris</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => {
                      setEditProfileForm(profile);
                      setIsProfileOpen(true);
                    }}
                  >
                    <MapPin className="size-4 text-muted-foreground" />
                    <span>Adresses de retrait</span>
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
                  <SidebarMenuButton render={<a href="/shops" />}>
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
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => {
              if (window.confirm('Voulez-vous vous déconnecter de ShopLoc ?')) {
                window.location.reload();
              }
            }}
          >
            <LogOut className="size-4 mr-2" />
            <span>Déconnexion</span>
          </Button>
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
              Consultez et modifiez les informations de votre compte citoyen.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProfile} className="space-y-4 py-2">
            <div className="flex items-center gap-4 p-3 rounded-lg border bg-muted/40">
              <Avatar size="lg">
                <AvatarImage
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                  alt={profile.name}
                />
                <AvatarFallback>CM</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-semibold">{profile.name}</p>
                <p className="text-xs text-muted-foreground">{profile.role}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-medium text-primary">
                    ⭐ {profile.loyaltyPoints} points fidélité
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prof-name">Nom complet</Label>
              <Input
                id="prof-name"
                value={editProfileForm.name}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prof-email">Adresse e-mail</Label>
              <Input
                id="prof-email"
                type="email"
                value={editProfileForm.email}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prof-city">Ville / Municipalité</Label>
              <Input
                id="prof-city"
                value={editProfileForm.city}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, city: e.target.value })}
                required
              />
            </div>

            {profileSavedToast && (
              <div className="flex items-center gap-2 text-xs text-green-600 bg-green-500/10 p-2 rounded-md">
                <Check className="size-4 shrink-0" />
                <span>Profil mis à jour avec succès !</span>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsProfileOpen(false)}>
                Fermer
              </Button>
              <Button type="submit">Enregistrer les modifications</Button>
            </DialogFooter>
          </form>
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

      {/* Wallet Dialog */}
      <Dialog open={isWalletOpen} onOpenChange={setIsWalletOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="size-5 text-primary" />
              <span>Mon Portefeuille Local</span>
            </DialogTitle>
            <DialogDescription>
              Gérez votre solde et réglez facilement vos achats chez les commerçants partenaires de
              votre commune.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Balance Card */}
            <div className="rounded-xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Solde disponible
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-primary text-primary-foreground">
                  Collectiv'Pay
                </span>
              </div>
              <div>
                <p className="text-3xl font-extrabold tracking-tight">
                  {walletBalance.toFixed(2)} €
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  + {profile.loyaltyPoints} points fidélité échangeables en remises
                </p>
              </div>
            </div>

            {/* Wallet top up */}
            <div className="space-y-2 border rounded-lg p-3 bg-muted/20">
              <Label className="text-xs font-semibold">Recharger mon compte</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="5"
                  step="5"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  placeholder="Montant en €"
                  className="h-9"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    const amount = parseFloat(topUpAmount);
                    if (!isNaN(amount) && amount > 0) {
                      setWalletBalance((prev) => prev + amount);
                      setTopUpSuccessToast(true);
                      setTimeout(() => setTopUpSuccessToast(false), 2000);
                    }
                  }}
                  className="shrink-0"
                >
                  <CreditCard className="size-4 mr-1.5" />
                  Recharger
                </Button>
              </div>

              {topUpSuccessToast && (
                <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium pt-1">
                  <Check className="size-3.5" />
                  <span>Rechargement de {topUpAmount} € effectué avec succès !</span>
                </div>
              )}
            </div>

            {/* Mock recent transaction history */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Dernières opérations
              </Label>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between p-2 rounded-md bg-muted/40">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="size-4 text-primary" />
                    <div>
                      <p className="font-medium">Boulangerie Le Moulin</p>
                      <p className="text-[10px] text-muted-foreground">Paiement sans contact</p>
                    </div>
                  </div>
                  <span className="font-semibold text-foreground">- 4,80 €</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-md bg-muted/40">
                  <div className="flex items-center gap-2">
                    <Check className="size-4 text-green-600" />
                    <div>
                      <p className="font-medium">Rechargement CB</p>
                      <p className="text-[10px] text-muted-foreground">Carte bancaire **** 4242</p>
                    </div>
                  </div>
                  <span className="font-semibold text-green-600">+ 30,00 €</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsWalletOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
