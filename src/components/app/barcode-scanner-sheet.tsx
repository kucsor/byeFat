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
import { type ScannedProduct } from '@/app/actions/get-product-by-barcode';
import { useFirebase, setDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, where, getDocs, addDoc, serverTimestamp, increment } from 'firebase/firestore';
import { Input } from '../ui/input';
import type { DailyLog, UserProfile } from '@/lib/types';
import { triggerHapticFeedback } from '@/lib/haptics';
import { BarcodeScanner } from './barcode-scanner';
import { updateUserXP } from '@/firebase/xp-actions';

type BarcodeScannerSheetProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  selectedDate: string;
  userProfile: UserProfile;
  selectedLog: DailyLog | null;
  isLogLoading?: boolean;
}

export function BarcodeScannerSheet({ isOpen, setIsOpen, selectedDate, userProfile, selectedLog, isLogLoading }: BarcodeScannerSheetProps) {
  const [detectedBarcode, setDetectedBarcode] = useState<string | null>(null);
  const [scannedProduct, setScannedProduct] = useState<ScannedProduct | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [grams, setGrams] = useState(100);

  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { firestore, user } = useFirebase();

  const resetState = () => {
    setDetectedBarcode(null);
    setScannedProduct(null);
    setIsSaving(false);
    setGrams(100);
  }

  const handleScan = (product: ScannedProduct, barcode: string) => {
    setScannedProduct(product);
    setDetectedBarcode(barcode);
    triggerHapticFeedback();
  };

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
            logDataToSet.maintenanceCalories = userProfile.maintenanceCalories;
            logDataToSet.deficitTarget = userProfile.deficitTarget;
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
        
        // XP Update:
        const maintenanceXP = (!selectedLog && userProfile.maintenanceCalories) ? userProfile.maintenanceCalories : 0;
        updateUserXP(firestore, user.uid, maintenanceXP - newLogItem.calories);

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
                 <Button onClick={handleAddToLog} className="w-full" disabled={isSaving || isLogLoading}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add to Log
                </Button>
                 <Button variant="outline" className="w-full" onClick={() => { setDetectedBarcode(null); setScannedProduct(null) }} disabled={isSaving}>
                    Scan Another Item
                </Button>
            </div>
        )
    }
    
    return (
      <div className="p-4 flex-1">
        <BarcodeScanner onScan={handleScan} onClose={() => setIsOpen(false)} />
        <div className="mt-4 text-center text-muted-foreground">
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

    