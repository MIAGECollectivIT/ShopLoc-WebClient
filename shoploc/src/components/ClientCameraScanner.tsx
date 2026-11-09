import * as React from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, CameraOff, RefreshCw, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { cn } from 'cn';

export interface ClientCameraScannerProps {
  onScanSuccess: (decodedCode: string) => void;
  isProcessing?: boolean;
  className?: string;
}

/**
 * Camera QR code scanner using html5-qrcode.
 * Supports webcam, mobile environment (rear) and user (front) cameras,
 * and provides clear feedback on camera permission states.
 */
export function ClientCameraScanner({
  onScanSuccess,
  isProcessing = false,
  className,
}: ClientCameraScannerProps) {
  const readerElementId = 'html5qr-reader-viewport';

  const html5QrCodeRef = React.useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [facingMode, setFacingMode] = React.useState<'environment' | 'user'>('environment');
  const [lastScannedCode, setLastScannedCode] = React.useState<string | null>(null);

  // Stop camera tracks cleanly
  const stopCameraStream = React.useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch {
        // Ignore stop notice if stream was already closed
      } finally {
        setIsScanning(false);
      }
    }
  }, []);

  // Initialize and start camera scanner
  const startCameraStream = React.useCallback(
    async (mode: 'environment' | 'user' = facingMode) => {
      setCameraError(null);
      setLastScannedCode(null);

      // Clean up previous instance if any
      await stopCameraStream();

      try {
        const qrInstance = new Html5Qrcode(readerElementId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        html5QrCodeRef.current = qrInstance;

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        await qrInstance.start(
          { facingMode: mode },
          config,
          (decodedText: string) => {
            const sanitized = decodedText.trim();
            setLastScannedCode(sanitized);

            // Temporarily stop scanner upon successful read to prevent duplicate triggers
            qrInstance
              .stop()
              .catch(() => {})
              .finally(() => {
                setIsScanning(false);
                onScanSuccess(sanitized);
              });
          },
          () => {
            // Periodic scan failure (expected between frames), ignore
          }
        );

        setIsScanning(true);
      } catch (err: unknown) {
        setIsScanning(false);
        const errMessage = err instanceof Error ? err.message : String(err);
        if (
          errMessage.includes('Permission') ||
          errMessage.includes('NotAllowedError') ||
          errMessage.includes('denied')
        ) {
          setCameraError(
            "L'accès à la caméra a été refusé. Veuillez autoriser l'accès dans votre navigateur ou utiliser la saisie manuelle ci-dessous."
          );
        } else if (
          errMessage.includes('NotFoundError') ||
          errMessage.includes('DevicesNotFoundError')
        ) {
          setCameraError("Aucune caméra n'a été détectée sur votre terminal.");
        } else {
          setCameraError("Impossible d'activer la caméra. Veuillez utiliser la saisie manuelle.");
        }
      }
    },
    [facingMode, onScanSuccess, readerElementId, stopCameraStream]
  );

  // Toggle camera direction (environment <-> user)
  const handleToggleFacingMode = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (isScanning) {
      await startCameraStream(nextMode);
    }
  };

  // Cleanup on component unmount
  React.useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.stop().then(() => {
              html5QrCodeRef.current?.clear();
            });
          } else {
            html5QrCodeRef.current.clear();
          }
        } catch {
          // Ignore unmount cleanup errors
        }
      }
    };
  }, []);

  return (
    <div className={cn('flex flex-col items-center gap-4 w-full', className)}>
      {/* Scanner Viewport Box */}
      <div className="relative w-full max-w-sm aspect-square bg-neutral-900 rounded-2xl overflow-hidden border-2 border-border shadow-inner flex items-center justify-center">
        {/* html5-qrcode DOM Target Element */}
        <div id={readerElementId} className="w-full h-full overflow-hidden" />

        {/* Viewfinder overlay when scanning */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
            {/* Target corner guides */}
            <div className="relative size-60 rounded-xl border-2 border-dashed border-emerald-400/80 shadow-[0_0_15px_rgba(52,211,153,0.3)] flex items-center justify-center">
              {/* Animated laser line */}
              <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse shadow-[0_0_8px_#34d399]" />
            </div>
            <p className="absolute bottom-4 text-xs font-medium text-white/90 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs">
              Placez le QR code au centre du cadre
            </p>
          </div>
        )}

        {/* Idle / Inactive Overlay */}
        {!isScanning && !cameraError && (
          <div className="absolute inset-0 bg-muted/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center gap-3">
            <div className="p-3.5 rounded-full bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <Camera className="size-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">Caméra inactive</h4>
              <p className="text-xs text-muted-foreground max-w-xs">
                Activez la caméra de votre terminal pour scanner instantanément le pass ou la carte
                client.
              </p>
            </div>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => startCameraStream()}
              disabled={isProcessing}
              className="gap-2 mt-1 shadow-sm"
            >
              <Camera className="size-4" />
              <span>Démarrer le scan caméra</span>
            </Button>
          </div>
        )}

        {/* Error Overlay */}
        {cameraError && (
          <div className="absolute inset-0 bg-destructive/10 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center gap-2 border border-destructive/20">
            <AlertCircle className="size-8 text-destructive" />
            <h4 className="text-sm font-semibold text-destructive">Erreur caméra</h4>
            <p className="text-xs text-muted-foreground max-w-xs">{cameraError}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => startCameraStream()}
              className="mt-2 text-xs"
            >
              <RefreshCw className="size-3.5 mr-1" />
              Réessayer
            </Button>
          </div>
        )}

        {/* Processing badge overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-10">
            <div className="size-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium text-foreground">Identification du compte...</span>
          </div>
        )}
      </div>

      {/* Camera Controls Bar */}
      <div className="flex items-center justify-between w-full max-w-sm gap-2 px-1">
        {isScanning ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={stopCameraStream}
              className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <CameraOff className="size-3.5" />
              <span>Arrêter la caméra</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleToggleFacingMode}
              className="h-8 text-xs gap-1.5"
              title="Basculer entre la caméra arrière et avant"
            >
              <RefreshCw className="size-3.5" />
              <span>{facingMode === 'environment' ? 'Caméra avant' : 'Caméra arrière'}</span>
            </Button>
          </>
        ) : (
          <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
            <Badge variant="outline" className="gap-1 text-[11px] font-normal">
              <Sparkles className="size-3 text-emerald-500" />
              <span>Scan instantané</span>
            </Badge>
            <span>Format QR standard</span>
          </div>
        )}
      </div>

      {lastScannedCode && !isProcessing && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          <CheckCircle2 className="size-3.5" />
          <span>Code détecté : {lastScannedCode}</span>
        </div>
      )}
    </div>
  );
}
