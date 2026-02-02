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
import { motion } from 'framer-motion';

type BarcodeScannerSheetProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  selectedDate: string;
  userProfile: UserProfile;
  selectedLog: DailyLog | null;
}

export function BarcodeScannerSheet({ isOpen, setIsOpen, selectedDate, userProfile, selectedLog }: BarcodeScannerSheetProps) {
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
            <div className="p-6 space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                    <h3 className="text-xl font-black text-primary-foreground">{scannedProduct.name}</h3>
                    <p className="text-sm font-bold uppercase tracking-wider opacity-60">{scannedProduct.brand}</p>
                </motion.div>

                <div className="space-y-2">
                    <label htmlFor="grams" className="text-xs font-black uppercase tracking-widest opacity-60">Greutate (grame)</label>
                    <Input
                      id="grams"
                      type="number"
                      value={grams}
                      onChange={(e) => setGrams(Number(e.target.value))}
                      placeholder="100"
                      onFocus={(e) => e.target.select()}
                      className="h-14 rounded-2xl border-2 border-primary/20 bg-white/50 text-xl font-black text-center focus-visible:ring-primary/30"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'CALORII', value: `${calculatedMacros.calories} kcal`, color: 'bg-primary/20' },
                    { label: 'PROTEINE', value: `${calculatedMacros.protein} g`, color: 'bg-blue-100' },
                    { label: 'CARBS', value: `${calculatedMacros.carbs} g`, color: 'bg-accent/20' },
                    { label: 'GRĂSIMI', value: `${calculatedMacros.fat} g`, color: 'bg-secondary/20' },
                  ].map((macro) => (
                    <div key={macro.label} className={`${macro.color} p-4 rounded-3xl text-center border-2 border-white/50`}>
                      <div className="text-[10px] font-black opacity-50 mb-1">{macro.label}</div>
                      <div className="text-lg font-black">{macro.value}</div>
                    </div>
                  ))}
                </div>

                 <div className="space-y-3">
                    <Button
                      onClick={handleAddToLog}
                      className="w-full h-14 rounded-2xl text-lg font-black shadow-lg shadow-primary/20 bouncy-hover"
                      disabled={isSaving}
                    >
                        {isSaving && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                        Adaugă în Jurnal
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full h-12 rounded-2xl font-bold hover:bg-primary/10"
                      onClick={() => { setDetectedBarcode(null); setScannedProduct(null) }}
                      disabled={isSaving}
                    >
                        Scanează altul
                    </Button>
                 </div>
            </div>
        )
    }
    
    return (
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex-1 rounded-[2rem] overflow-hidden border-4 border-primary/20 bg-black relative">
          <BarcodeScanner onScan={handleScan} onClose={() => setIsOpen(false)} />
        </div>
        <div className="mt-6 text-center">
            <p className="font-bold opacity-60">Așează codul de bare în centrul ecranului</p>
        </div>
      </div>
    );
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={handleSheetOpenChange}>
      <SheetContent side={isMobile ? 'bottom' : 'right'} className="p-0 flex flex-col rounded-t-[2.5rem] md:rounded-l-[2.5rem] md:rounded-tr-none border-none glass overflow-hidden min-h-[80vh]">
        <SheetHeader className="p-6 pb-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-primary/20 p-2 rounded-2xl">
              <ScanLine className="h-6 w-6 text-primary-foreground" />
            </div>
            <SheetTitle className="text-2xl font-black text-primary-foreground">Scanare Cod Bare</SheetTitle>
          </div>
          <SheetDescription className="font-bold opacity-70">
            {scannedProduct ? `Adaugă ${scannedProduct.name} în jurnalul tău.` : 'Găsește un produs folosind codul de bare.'}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {renderContent()}
        </div>
      </SheetContent>
    </Sheet>
  );
}
