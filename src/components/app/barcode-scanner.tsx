'use client';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CameraOff, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getProductByBarcode, type ScannedProduct } from '@/app/actions/get-product-by-barcode';

type BarcodeScannerProps = {
  onScan: (product: ScannedProduct, barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [detectedBarcode, setDetectedBarcode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const getCameraPermission = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError("Camera access is not supported by this browser.");
          setHasCameraPermission(false);
          return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasCameraPermission(true);
      } catch (err) {
        console.error("Camera access error:", err);
        setError("Camera permission denied.");
        setHasCameraPermission(false);
      }
    };

    getCameraPermission();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    let detectionInterval: NodeJS.Timeout;

    if (hasCameraPermission && videoRef.current && !detectedBarcode && !isLoading) {
      if (!('BarcodeDetector' in window)) {
        setError("Barcode scanning is not supported by this browser.");
        return;
      }
      const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['ean_13', 'upc_a', 'ean_8'] });

      const detectBarcode = async () => {
        if (videoRef.current && videoRef.current.readyState === 4) {
          try {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes.length > 0 && !isLoading) {
              setDetectedBarcode(barcodes[0].rawValue);
            }
          } catch (e) {
            console.error('Barcode detection failed:', e);
          }
        }
      };

      detectionInterval = setInterval(detectBarcode, 500);
    }

    return () => {
      if (detectionInterval) {
        clearInterval(detectionInterval);
      }
    };
  }, [hasCameraPermission, detectedBarcode, isLoading]);

  useEffect(() => {
    if (detectedBarcode) {
      setIsLoading(true);
      setError(null);

      const fetchProduct = async () => {
        const result = await getProductByBarcode(detectedBarcode);
        if (result.product) {
          onScan(result.product, detectedBarcode);
        } else {
          setError(result.error || "Product not found.");
          setDetectedBarcode(null);
        }
        setIsLoading(false);
      };

      fetchProduct();
    }
  }, [detectedBarcode, onScan]);

  return (
    <div className="relative h-64 w-full overflow-hidden rounded-lg border-2 border-primary/20 bg-black">
      {hasCameraPermission === false && (
           <div className="absolute inset-0 flex flex-col items-center justify-center bg-background p-4 text-center">
               <CameraOff className="h-8 w-8 text-destructive mb-2" />
               <p className="text-sm font-bold">Camera Access Required</p>
           </div>
      )}
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        autoPlay
        playsInline
        muted
      />
      {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
      )}
      {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-4 text-center">
              <Alert variant="destructive" className="bg-destructive/10 text-destructive-foreground">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
              </Alert>
              <Button variant="outline" size="sm" className="mt-2 text-white border-white hover:bg-white/20" onClick={() => setError(null)}>
                  Try Again
              </Button>
          </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-48 h-32 border-2 border-dashed border-white/50 rounded-lg" />
      </div>
      <Button variant="ghost" size="sm" className="absolute top-2 right-2 text-white hover:bg-white/20" onClick={onClose}>
          Close
      </Button>
    </div>
  );
}
