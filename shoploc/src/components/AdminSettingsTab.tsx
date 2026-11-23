import * as React from 'react';
import { getCitizenCardEmailSetting, updateCitizenCardEmailSetting } from '@/lib/api';
import type { CitizenCardEmailSettingResponse } from '@/types/settings';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Save,
  Clock,
  User,
  ShieldAlert,
  Info,
} from 'lucide-react';

const EMAIL_REGEX = /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export function AdminSettingsTab() {
  const [setting, setSetting] = React.useState<CitizenCardEmailSettingResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isSaving, setIsSaving] = React.useState<boolean>(false);
  const [emailInput, setEmailInput] = React.useState<string>('');
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const fetchSetting = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCitizenCardEmailSetting();
      setSetting(data);
      setEmailInput(data.effectiveEmail);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Impossible de charger les paramètres.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchSetting();
  }, [fetchSetting]);

  const isValidEmail = Boolean(emailInput.trim() && EMAIL_REGEX.test(emailInput.trim()));
  const isChanged = setting ? emailInput.trim() !== setting.effectiveEmail : false;

  const handleSave = async (emailToSave: string) => {
    const trimmed = emailToSave.trim();
    if (!EMAIL_REGEX.test(trimmed)) {
      setError('Format d’adresse e-mail invalide.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const updated = await updateCitizenCardEmailSetting(trimmed);
      setSetting(updated);
      setEmailInput(updated.effectiveEmail);
      setSuccessMessage('L’adresse e-mail du service citoyen a été mise à jour avec succès.');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de l’enregistrement de l’adresse.';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!setting) return;
    await handleSave(setting.defaultEmail);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card/40 backdrop-blur-sm">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Configuration Générale du Système
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Paramètres applicatifs et adresses des services municipaux instructeurs.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchSetting}
          disabled={isLoading || isSaving}
          className="gap-1.5 h-8 text-xs self-start sm:self-auto"
        >
          <RotateCcw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Actualiser</span>
        </Button>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-destructive flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="h-7 px-2 text-xs hover:bg-destructive/10"
          >
            Fermer
          </Button>
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-600 dark:text-emerald-400 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSuccessMessage(null)}
            className="h-7 px-2 text-xs hover:bg-emerald-500/10"
          >
            Fermer
          </Button>
        </div>
      )}

      {/* Setting Card */}
      {isLoading && !setting ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-48" />
          </CardContent>
        </Card>
      ) : (
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-muted/20 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <Mail className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">
                    Service Citoyen Numérique — Cartes Physiques
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Adresse e-mail destinataire pour les commandes et renouvellements de cartes
                    physiques.
                  </CardDescription>
                </div>
              </div>

              {setting && (
                <div className="self-start sm:self-auto">
                  {setting.customized ? (
                    <Badge
                      variant="default"
                      className="text-xs gap-1.5 py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <span className="size-1.5 rounded-full bg-white animate-pulse" />
                      Adresse personnalisée
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs gap-1.5 py-1 px-2.5">
                      Valeur par défaut
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Description Info Banner */}
            <div className="flex items-start gap-3 p-3.5 rounded-lg border bg-muted/40 text-xs text-muted-foreground">
              <Info className="size-4 shrink-0 text-primary mt-0.5" />
              <div className="space-y-1 leading-relaxed">
                <p>
                  Lorsqu&apos;un citoyen finalise son inscription en demandant une carte de fidélité
                  physique, ou lorsqu&apos;il formule une demande de réémission, une notification
                  automatique contenant ses coordonnées postales complètes est transmise à cette
                  adresse pour expédition postale.
                </p>
              </div>
            </div>

            {/* Current State Details */}
            {setting && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-lg border bg-card/60 space-y-1">
                  <span className="text-muted-foreground font-medium">
                    Adresse active actuelle :
                  </span>
                  <p className="font-mono text-sm font-semibold text-foreground break-all">
                    {setting.effectiveEmail}
                  </p>
                </div>

                <div className="p-3 rounded-lg border bg-card/60 space-y-1">
                  <span className="text-muted-foreground font-medium">
                    Adresse initiale par défaut :
                  </span>
                  <p className="font-mono text-sm text-muted-foreground break-all">
                    {setting.defaultEmail}
                  </p>
                </div>
              </div>
            )}

            {/* Last update tracking */}
            {setting?.customized && setting.updatedAt && (
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground border-t pt-3">
                <div className="flex items-center gap-1.5">
                  <Clock className="size-3.5 text-muted-foreground" />
                  <span>Dernière mise à jour : {formatDate(setting.updatedAt)}</span>
                </div>
                {setting.updatedBy && (
                  <div className="flex items-center gap-1.5">
                    <User className="size-3.5 text-muted-foreground" />
                    <span>
                      Par :{' '}
                      <strong className="font-medium text-foreground">{setting.updatedBy}</strong>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Form */}
            <div className="space-y-3 border-t pt-4">
              <label
                htmlFor="citizen-card-email-input"
                className="block text-xs font-medium text-foreground"
              >
                Nouvelle adresse e-mail du service citoyen
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Mail className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    id="citizen-card-email-input"
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="service-citoyen@ville-collectivite.fr"
                    disabled={isSaving}
                    className="pl-9 text-sm"
                  />
                </div>

                <Button
                  onClick={() => handleSave(emailInput)}
                  disabled={!isValidEmail || !isChanged || isSaving}
                  className="gap-2 shrink-0 text-xs h-10"
                >
                  <Save className={`size-3.5 ${isSaving ? 'animate-spin' : ''}`} />
                  <span>{isSaving ? 'Enregistrement...' : 'Enregistrer'}</span>
                </Button>
              </div>

              {emailInput.trim() && !isValidEmail && (
                <p className="text-xs text-destructive flex items-center gap-1.5">
                  <ShieldAlert className="size-3.5" />
                  <span>Veuillez saisir une adresse e-mail valide (ex: contact@ville.fr).</span>
                </p>
              )}
            </div>
          </CardContent>

          {/* Footer with Reset option */}
          {setting?.customized && (
            <CardFooter className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/10 border-t p-4 text-xs">
              <span className="text-muted-foreground">
                Vous pouvez réinitialiser l&apos;adresse sur la valeur initiale par défaut (
                {setting.defaultEmail}).
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetToDefault}
                disabled={isSaving}
                className="gap-1.5 text-xs h-8"
              >
                <RotateCcw className="size-3" />
                <span>Rétablir la valeur par défaut</span>
              </Button>
            </CardFooter>
          )}
        </Card>
      )}
    </div>
  );
}
