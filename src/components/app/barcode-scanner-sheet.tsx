'use client';
import { useState, useRef, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScanLine, Loader2, Plus, CameraOff, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { getProductByBarcode, type ScannedProduct } from '@/app/actions/get-product-by-barcode';
import { useFirebase, setDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, where, getDocs, addDoc, serverTimestamp, increment } from 'firebase/firestore';
import { Input } from '../ui/input';
import type { DailyLog, UserProfile } from '@/lib/types';
import { triggerHapticFeedback } from '@/lib/haptics';

// Polyfill for BarcodeDetector if it doesn't exist
const initializeBarcodeDetector = () => {
  if (typeof window !== 'undefined' && !('BarcodeDetector' in window)) {
    console.warn("BarcodeDetector API not supported in this browser. Barcode scanning will not be available.");
  }
}
initializeBarcodeDetector();

type BarcodeScannerSheetProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  selectedDate: string;
  userProfile: UserProfile;
  selectedLog: DailyLog | null;
}

export function BarcodeScannerSheet({ isOpen, setIsOpen, selectedDate, userProfile, selectedLog }: BarcodeScannerSheetProps) {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [detectedBarcode, setDetectedBarcode] = useState<string | null>(null);
  const [scannedProduct, setScannedProduct] = useState<ScannedProduct | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grams, setGrams] = useState(100);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { firestore, user } = useFirebase();

  const resetState = () => {
    setHasCameraPermission(null);
    setDetectedBarcode(null);
    setScannedProduct(null);
    setError(null);
    setIsLoading(false);
    setIsSaving(false);
    setGrams(100);
  }

  useEffect(() => {
    if (isOpen) {
      const getCameraPermission = async () => {
        resetState();

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
          setError("Camera permission denied. Please enable it in your browser settings.");
          setHasCameraPermission(false);
        }
      };

      getCameraPermission();
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  }, [isOpen]);

  useEffect(() => {
    let detectionInterval: NodeJS.Timeout;

    if (isOpen && hasCameraPermission && videoRef.current && !detectedBarcode && !isLoading) {
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
            setError('Barcode detection failed.');
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
  }, [isOpen, hasCameraPermission, detectedBarcode, isLoading]);

  useEffect(() => {
    if (detectedBarcode) {
      setIsLoading(true);
      setError(null);
      setScannedProduct(null);

      const fetchProduct = async () => {
        const result = await getProductByBarcode(detectedBarcode);
        if (result.product) {
          setScannedProduct(result.product);
        } else {
          setError(result.error || "Product not found.");
        }
        setIsLoading(false);
      };

      fetchProduct();
    }
  }, [detectedBarcode]);

  const handleAddToLog = async () => {
    if (!scannedProduct || !user || !firestore || !userProfile?.username || !detectedBarcode || isSaving) return;

    setIsSaving(true);
    try {
        const ratio = grams / 100;
        const calculatedMacros = {
            calories: Math.round(scannedProduct.caloriesPer100g * ratio),
            protein: Math.round(scannedProduct.proteinPer100g * ratio),
            fat: Math.round(scannedProduct.fatPer100g * ratio),
            carbs: Math.round(scannedProduct.carbsPer100g * ratio),
        }

        const productsRef = collection(firestore, 'products');
        const q = query(productsRef, where('barcode', '==', detectedBarcode));
        const querySnapshot = await getDocs(q);

        let productId: string;
        let productToLogName = scannedProduct.name;

        if (querySnapshot.empty) {
            // Product doesn't exist, create it in the global list
            const newProductData = {
                name: scannedProduct.name,
                brand: scannedProduct.brand,
                caloriesPer100g: scannedProduct.caloriesPer100g,
                proteinPer100g: scannedProduct.proteinPer100g,
                fatPer100g: scannedProduct.fatPer100g,
                carbsPer100g: scannedProduct.carbsPer100g,
                creatorId: user.uid,
                creatorUsername: userProfile.username,
                likes: 1, // Start with one like from the user who scanned it
                likedBy: [user.uid],
                source: 'scanned' as const,
                barcode: detectedBarcode,
            };
            const docRef = await addDoc(productsRef, newProductData);
            productId = docRef.id;
        } else {
            // Product exists, use its ID
            const existingDoc = querySnapshot.docs[0];
            productId = existingDoc.id;
            productToLogName = existingDoc.data().name || productToLogName;
        }

        const dailyLogRef = doc(firestore, `users/${user.uid}/dailyLogs`, selectedDate);
        
        const logDataToSet: Partial<DailyLog> = { id: selectedDate, date: selectedDate };

        if (!selectedLog && userProfile.dailyCalories) {
            logDataToSet.goalCalories = userProfile.dailyCalories;
            logDataToSet.goalProtein = userProfile.dailyProtein;
            logDataToSet.goalCarbs = userProfile.dailyCarbs;
            logDataToSet.goalFat = userProfile.dailyFat;
        }

        setDocumentNonBlocking(dailyLogRef, logDataToSet, { merge: true });

        const logItemsCollection = collection(dailyLogRef, 'items');

        const newLogItem = {
          productId: productId,
          productName: productToLogName,
          grams: grams,
          ...calculatedMacros,
          createdAt: serverTimestamp(),
        };

        addDocumentNonBlocking(logItemsCollection, newLogItem);
        updateDocumentNonBlocking(dailyLogRef, { consumedCalories: increment(newLogItem.calories) });
        
        triggerHapticFeedback();
        setIsOpen(false);
    } catch (e) {
        console.error("Failed to save or log product:", e);
        toast({
            variant: 'destructive',
            title: 'Save Failed',
            description: 'Could not add item to log or global products list.',
        });
    } finally {
        setIsSaving(false);
    }
  };

  const handleSheetOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetState();
    }
  }

  const renderContent = () => {
    if (isLoading) {
      return (
          <div className="flex flex-col items-center justify-center text-center p-8 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground">Searching for barcode: <br/> <span className="font-mono">{detectedBarcode}</span></p>
          </div>
      );
    }

    if (error) {
        return (
             <div className="p-4 space-y-4">
                <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Scan Failed</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                <Button variant="outline" className="w-full" onClick={() => { setDetectedBarcode(null); setError(null); }}>
                    Try Scanning Again
                </Button>
            </div>
        )
    }

    if (scannedProduct) {
        const ratio = grams / 100;
        const calculatedMacros = {
            calories: Math.round(scannedProduct.caloriesPer100g * ratio),
            protein: Math.round(scannedProduct.proteinPer100g * ratio),
            fat: Math.round(scannedProduct.fatPer100g * ratio),
            carbs: Math.round(scannedProduct.carbsPer100g * ratio),
        }
        return (
            <div className="p-4 space-y-4">
                <div>
                    <h3 className="font-bold">{scannedProduct.name}</h3>
                    <p className="text-sm text-muted-foreground">{scannedProduct.brand}</p>
                </div>
                <div className="space-y-2">
                    <label htmlFor="grams" className="text-sm font-medium">Weight (grams)</label>
                    <Input id="grams" type="number" value={grams} onChange={(e) => setGrams(Number(e.target.value))} placeholder="100" onFocus={(e) => e.target.select()} />
                </div>
                <div className="space-y-2 rounded-md bg-muted p-4 text-sm">
                    <h4 className="font-medium text-foreground">Calculated Nutrition</h4>
                    <div className="flex justify-between"><span>Calories:</span> <span>{calculatedMacros.calories} kcal</span></div>
                    <div className="flex justify-between"><span>Protein:</span> <span>{calculatedMacros.protein} g</span></div>
                    <div className="flex justify-between"><span>Fat:</span> <span>{calculatedMacros.fat} g</span></div>
                    <div className="flex justify-between"><span>Carbs:</span> <span>{calculatedMacros.carbs} g</span></div>
                </div>
                 <Button onClick={handleAddToLog} className="w-full" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add to Log
                </Button>
                 <Button variant="outline" className="w-full" onClick={() => { setDetectedBarcode(null); setError(null); setScannedProduct(null) }} disabled={isSaving}>
                    Scan Another Item
                </Button>
            </div>
        )
    }
    
    return (
      <div className="relative h-full w-full">
        {hasCameraPermission === false && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-background p-4 text-center">
                 <CameraOff className="h-12 w-12 text-destructive mb-4" />
                 <h3 className="text-lg font-bold">Camera Access Required</h3>
                 <p className="text-muted-foreground">Please grant camera permission to scan barcodes.</p>
             </div>
        )}
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          autoPlay
          playsInline
          muted
        />
         <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4/5 h-1/3 border-4 border-dashed border-primary/50 rounded-lg bg-black/20" />
        </div>
        <div className="absolute bottom-4 left-4 right-4 text-center text-white bg-black/50 p-2 rounded-md">
            <p>Point your camera at a barcode</p>
        </div>
      </div>
    );
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={handleSheetOpenChange}>
      <SheetContent side={isMobile ? 'bottom' : 'right'} className="p-0 flex flex-col">
        <SheetHeader className="p-6 pb-2">
          <SheetTitle>Scan Barcode</SheetTitle>
          <SheetDescription>
            {scannedProduct ? `Add ${scannedProduct.name} to your log.` : 'Find a product using its barcode.'}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 min-h-0">
          {renderContent()}
        </div>
      </SheetContent>
    </Sheet>
  );
}

    