import * as React from 'react';
import QRCode from 'qrcode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { QrCode, Copy, Check, Sparkles, Smartphone, IdCard } from 'lucide-react';
import { cn } from 'cn';

export interface ClientQrCodeCardProps {
  clientCode: string;
  userName?: string;
  className?: string;
}

export function ClientQrCodeCard({ clientCode, userName, className }: ClientQrCodeCardProps) {
  const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!clientCode || !clientCode.trim()) {
      setQrDataUrl(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    QRCode.toDataURL(clientCode.trim(), {
      width: 280,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (isMounted) {
          setQrDataUrl(url);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Erreur lors de la génération du QR Code:', err);
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [clientCode]);

  const handleCopyCode = async () => {
    if (!clientCode) return;
    try {
      await navigator.clipboard.writeText(clientCode.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erreur lors de la copie du code:', err);
    }
  };

  const formattedCode = clientCode ? clientCode.trim().toUpperCase() : '-------';

  return (
    <Card
      className={cn(
        'overflow-hidden border border-emerald-500/30 bg-gradient-to-b from-card via-card to-emerald-500/5 shadow-md',
        className
      )}
    >
      <CardHeader className="text-center pb-2">
        <div className="flex items-center justify-between gap-2 mb-1">
          <Badge
            variant="outline"
            className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 gap-1.5 py-0.5 text-xs font-medium"
          >
            <Sparkles className="size-3" />
            <span>Fidélité Citoyenne</span>
          </Badge>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <Smartphone className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Pass Caisse</span>
          </div>
        </div>

        <CardTitle className="text-lg sm:text-xl font-bold flex items-center justify-center gap-2 pt-1 text-foreground">
          <QrCode className="size-5 text-emerald-600 dark:text-emerald-400" />
          <span>Mon Identifiant & QR Code</span>
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm text-muted-foreground">
          {userName
            ? `Titulaire : ${userName}`
            : 'Présentez ce QR Code en caisse chez vos commerçants de proximité.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-4 pt-2">
        {/* Conteneur QR Code à fort contraste */}
        <div className="relative p-3 bg-white rounded-2xl border border-neutral-200 shadow-sm flex items-center justify-center">
          {isLoading ? (
            <div className="size-52 sm:size-60 flex flex-col items-center justify-center gap-2">
              <Skeleton className="size-48 sm:size-56 rounded-xl" />
            </div>
          ) : qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR Code personnel pour le code client ${formattedCode}`}
              className="size-52 sm:size-60 object-contain rounded-lg"
              loading="lazy"
            />
          ) : (
            <div className="size-52 sm:size-60 flex flex-col items-center justify-center text-center p-4 text-muted-foreground text-xs">
              <IdCard className="size-10 mb-2 stroke-1 text-muted-foreground/60" />
              <span>QR Code indisponible</span>
            </div>
          )}
        </div>

        {/* Affichage du code alphanumérique et bouton de copie */}
        <div className="w-full max-w-xs flex flex-col items-center gap-2">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Code client alphanumérique
          </div>

          <div className="flex items-center justify-between w-full p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 dark:bg-emerald-950/20 gap-2">
            <span
              className="font-mono text-xl sm:text-2xl font-extrabold tracking-wider text-emerald-700 dark:text-emerald-300 pl-2 select-all"
              data-testid="client-code-display"
            >
              {formattedCode}
            </span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyCode}
              disabled={!clientCode}
              className="h-8 px-2.5 text-xs font-medium border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 shrink-0 gap-1.5"
              aria-label="Copier le code client"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Copié !</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  <span>Copier</span>
                </>
              )}
            </Button>
          </div>
        </div>

        <p className="text-[11px] text-center text-muted-foreground/80 max-w-xs">
          À scanner directement par le commerçant ou à dicter lors de votre encaissement pour
          valider vos avantages.
        </p>
      </CardContent>
    </Card>
  );
}
