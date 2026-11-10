import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClientCameraScanner } from '@/components/ClientCameraScanner';
import { ManualClientCodeForm } from '@/components/ManualClientCodeForm';
import { RecognizedCustomerCard } from '@/components/RecognizedCustomerCard';
import { PhysicalCheckoutForm } from '@/components/PhysicalCheckoutForm';
import { PhysicalSaleSuccessCard } from '@/components/PhysicalSaleSuccessCard';
import { identifyCustomerByCardNumber } from '@/lib/api';
import type { CustomerIdentificationResponse } from '@/types/user';
import type { PhysicalSaleResponse } from '@/types/sales';
import { QrCode, Keyboard, Camera, AlertCircle, Sparkles, Store } from 'lucide-react';
import { cn } from 'cn';

export interface MerchantLoyaltyScannerProps {
  storeId?: number;
  storeName?: string;
  className?: string;
}

type CashierStep = 'scan' | 'customer' | 'checkout' | 'success';

/**
 * Main merchant cashier component.
 * Coordinates:
 * 1. Customer loyalty card scanning (camera QR or manual 7-char code).
 * 2. GDPR-masked customer verification & recognition.
 * 3. In-store physical checkout amount entry with decimal validation and live points simulation.
 * 4. Confirmation receipt displaying total amount and awarded loyalty points.
 */
export function MerchantLoyaltyScanner({
  storeId = 1,
  storeName,
  className,
}: MerchantLoyaltyScannerProps) {
  const [activeTab, setActiveTab] = React.useState<'camera' | 'manual'>('camera');
  const [identifiedCustomer, setIdentifiedCustomer] =
    React.useState<CustomerIdentificationResponse | null>(null);
  const [cashierStep, setCashierStep] = React.useState<CashierStep>('scan');
  const [lastReceipt, setLastReceipt] = React.useState<PhysicalSaleResponse | null>(null);

  const [isLoading, setIsLoading] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);

  const handleIdentifyCode = async (rawCode: string) => {
    const cleanCode = rawCode.trim().toUpperCase();
    if (!cleanCode) return;

    setIsLoading(true);
    setApiError(null);

    try {
      const customer = await identifyCustomerByCardNumber(cleanCode);
      setIdentifiedCustomer(customer);
      setCashierStep('customer');
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Erreur inattendue lors de l'identification du client.";
      setApiError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartCheckout = () => {
    setCashierStep('checkout');
  };

  const handleCheckoutSuccess = (receipt: PhysicalSaleResponse) => {
    setLastReceipt(receipt);
    setCashierStep('success');
  };

  const handleNewSaleForCustomer = () => {
    setLastReceipt(null);
    setCashierStep('checkout');
  };

  const handleReset = () => {
    setIdentifiedCustomer(null);
    setLastReceipt(null);
    setCashierStep('scan');
    setApiError(null);
    setIsLoading(false);
  };

  return (
    <div className={cn('flex flex-col items-center gap-6 w-full max-w-2xl mx-auto', className)}>
      {/* STEP 4: Success confirmation receipt */}
      {cashierStep === 'success' && lastReceipt && identifiedCustomer && (
        <PhysicalSaleSuccessCard
          receipt={lastReceipt}
          customer={identifiedCustomer}
          storeName={storeName}
          onNewSale={handleNewSaleForCustomer}
          onReset={handleReset}
          className="animate-in fade-in zoom-in-95 duration-200"
        />
      )}

      {/* STEP 3: Physical checkout form with decimal validation & live points simulation */}
      {cashierStep === 'checkout' && identifiedCustomer && (
        <PhysicalCheckoutForm
          storeId={storeId}
          storeName={storeName}
          customer={identifiedCustomer}
          onCancel={() => setCashierStep('customer')}
          onSuccess={handleCheckoutSuccess}
          className="animate-in fade-in zoom-in-95 duration-200"
        />
      )}

      {/* STEP 2: Customer recognized card with action shortcuts */}
      {cashierStep === 'customer' && identifiedCustomer && (
        <RecognizedCustomerCard
          customer={identifiedCustomer}
          onReset={handleReset}
          onStartCheckout={handleStartCheckout}
          className="animate-in fade-in zoom-in-95 duration-200"
        />
      )}

      {/* STEP 1: Scan controls and camera / manual input */}
      {cashierStep === 'scan' && (
        <Card className="w-full border-border bg-card shadow-md">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <Badge
                variant="outline"
                className="gap-1.5 border-primary/30 text-primary bg-primary/5 text-xs py-0.5"
              >
                <Sparkles className="size-3 text-primary" />
                <span>Identification Pass Caisse</span>
              </Badge>

              {storeName && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <Store className="size-3.5 text-primary" />
                  <span className="truncate max-w-[180px]">
                    {storeName}
                    {storeId ? ` (#${storeId})` : ''}
                  </span>
                </div>
              )}
            </div>

            <CardTitle className="text-xl sm:text-2xl font-bold flex items-center justify-center gap-2 text-foreground">
              <QrCode className="size-6 text-primary" />
              <span>Scanner la carte fidélité</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
              Scannez le QR code affiché sur le smartphone ou la carte physique du consommateur, ou
              saisissez son identifiant à 7 caractères.
            </CardDescription>

            {/* Input Mode Selector (Camera vs Manual) */}
            <div className="flex items-center justify-center pt-3">
              <div className="inline-flex items-center p-1 bg-muted rounded-xl border border-border">
                <Button
                  type="button"
                  variant={activeTab === 'camera' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setActiveTab('camera');
                    setApiError(null);
                  }}
                  className="h-8 text-xs gap-1.5 px-4 rounded-lg"
                >
                  <Camera className="size-3.5" />
                  <span>Scan Caméra</span>
                </Button>

                <Button
                  type="button"
                  variant={activeTab === 'manual' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setActiveTab('manual');
                    setApiError(null);
                  }}
                  className="h-8 text-xs gap-1.5 px-4 rounded-lg"
                >
                  <Keyboard className="size-3.5" />
                  <span>Saisie Manuelle</span>
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col items-center gap-6 pt-2 pb-6">
            {/* Global API Error Alert */}
            {apiError && (
              <div
                className="w-full max-w-sm p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2.5"
                role="alert"
              >
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold block">Échec de la reconnaissance</span>
                  <span className="text-muted-foreground block text-[11px] leading-relaxed">
                    {apiError}
                  </span>
                </div>
              </div>
            )}

            {/* Tab Viewport */}
            {activeTab === 'camera' ? (
              <ClientCameraScanner
                onScanSuccess={handleIdentifyCode}
                isProcessing={isLoading}
                className="w-full"
              />
            ) : (
              <ManualClientCodeForm
                onSubmitCode={handleIdentifyCode}
                isLoading={isLoading}
                className="w-full"
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
