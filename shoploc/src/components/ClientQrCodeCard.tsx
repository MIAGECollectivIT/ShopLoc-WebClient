import * as React from 'react';
import QRCode from 'qrcode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { QrCode, Copy, Check, Sparkles, Smartphone, IdCard, Maximize2 } from 'lucide-react';
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
  const [isZoomOpen, setIsZoomOpen] = React.useState(false);

  React.useEffect(() => {
    if (!clientCode || !clientCode.trim()) {
      setQrDataUrl(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    QRCode.toDataURL(clientCode.trim(), {
      width: 512,
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
    <>
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
          {/* High-contrast QR Code container (clickable to zoom) */}
          {isLoading ? (
            <div className="relative p-3 bg-white rounded-2xl border border-neutral-200 shadow-sm flex items-center justify-center">
              <div className="size-52 sm:size-60 flex flex-col items-center justify-center gap-2">
                <Skeleton className="size-48 sm:size-56 rounded-xl" />
              </div>
            </div>
          ) : qrDataUrl ? (
            <button
              type="button"
              onClick={() => setIsZoomOpen(true)}
              className="group relative p-3 bg-white rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md hover:border-emerald-500/50 transition-all duration-200 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              aria-label="Agrandir le QR code"
              title="Cliquer pour agrandir le QR code"
            >
              <img
                src={qrDataUrl}
                alt={`QR Code personnel pour le code client ${formattedCode}`}
                className="size-52 sm:size-60 object-contain rounded-lg transition-transform duration-200 group-hover:scale-[1.02]"
                loading="lazy"
              />
              {/* Indicateur visuel permanent d'agrandissement */}
              <div
                className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-neutral-100/90 text-neutral-600 group-hover:bg-emerald-500/10 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors shadow-xs"
                aria-hidden="true"
                title="Agrandir"
              >
                <Maximize2 className="size-3.5" />
              </div>
              {/* Badge overlay au survol ou focus */}
              <span className="absolute bottom-3 inset-x-5 py-1 px-2.5 rounded-lg bg-neutral-900/80 backdrop-blur-xs text-white text-[11px] font-medium flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity pointer-events-none shadow-sm">
                <Maximize2 className="size-3 text-emerald-400" />
                <span>Cliquer pour agrandir</span>
              </span>
            </button>
          ) : (
            <div className="relative p-3 bg-white rounded-2xl border border-neutral-200 shadow-sm flex items-center justify-center">
              <div className="size-52 sm:size-60 flex flex-col items-center justify-center text-center p-4 text-muted-foreground text-xs">
                <IdCard className="size-10 mb-2 stroke-1 text-muted-foreground/60" />
                <span>QR Code indisponible</span>
              </div>
            </div>
          )}

          {/* Alphanumeric code display and copy button */}
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
            valider vos avantages. Cliquez sur le QR code pour l&apos;agrandir.
          </p>
        </CardContent>
      </Card>

      {/* Modale d'agrandissement du QR Code */}
      <Dialog open={isZoomOpen} onOpenChange={setIsZoomOpen}>
        <DialogContent className="sm:max-w-md flex flex-col items-center text-center p-6 gap-4">
          <DialogHeader className="flex flex-col items-center text-center gap-1.5 w-full">
            <DialogTitle className="text-xl font-bold flex items-center justify-center gap-2 pt-1 text-foreground">
              <QrCode className="size-5 text-emerald-600 dark:text-emerald-400" />
              <span>Mon QR Code Client</span>
            </DialogTitle>

            <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
              {userName
                ? `Titulaire : ${userName}`
                : 'Présentez ce QR Code en caisse chez vos commerçants de proximité.'}
            </DialogDescription>
          </DialogHeader>

          {/* Grand affichage du QR Code haute résolution */}
          {qrDataUrl && (
            <div className="p-4 sm:p-5 bg-white rounded-2xl border border-neutral-200 shadow-md flex items-center justify-center my-1">
              <img
                src={qrDataUrl}
                alt={`QR Code grand format pour le code client ${formattedCode}`}
                className="size-64 sm:size-72 max-w-full aspect-square object-contain rounded-lg"
              />
            </div>
          )}

          {/* Rappel du code alphanumérique et bouton de copie */}
          <div className="w-full max-w-xs flex flex-col items-center gap-2">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Code client alphanumérique
            </div>

            <div className="flex items-center justify-between w-full p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 dark:bg-emerald-950/20 gap-2">
              <span
                className="font-mono text-xl sm:text-2xl font-extrabold tracking-wider text-emerald-700 dark:text-emerald-300 pl-2 select-all"
                data-testid="client-code-dialog-display"
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
            Conseil : augmentez la luminosité de votre smartphone si le scanner optique en caisse a
            des difficultés de lecture.
          </p>

          <DialogFooter className="w-full sm:justify-center pt-2">
            <DialogClose
              render={
                <Button variant="outline" size="sm" className="w-full sm:w-auto px-6">
                  Fermer
                </Button>
              }
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
