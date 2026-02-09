'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirebase, useCollection, addDocumentNonBlocking, useMemoFirebase, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import type { Product, DailyLog, UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { collection, doc, query, serverTimestamp, increment, where, getDocs, addDoc } from 'firebase/firestore';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { triggerHapticFeedback } from '@/lib/haptics';
import { AiScanner } from '@/components/app/ai-scanner';
import { BarcodeScanner } from '@/components/app/barcode-scanner';
import { MdCameraAlt, MdQrCodeScanner } from 'react-icons/md';
import { getProductByBarcode } from '@/app/actions/get-product-by-barcode';
import { useToast } from '@/hooks/use-toast';

const logItemSchema = z.object({
  productId: z.string().min(1, { message: "Please select a product."}),
  grams: z.coerce.number().min(1, { message: 'Grams must be greater than 0.' }),
});

type AddFoodSheetProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  selectedDate: string;
  userProfile: UserProfile;
  selectedLog: DailyLog | null;
  isLogLoading?: boolean;
}

type ScanMode = 'none' | 'ai' | 'barcode';

export function AddFoodSheet({ isOpen, setIsOpen, selectedDate, userProfile, selectedLog, isLogLoading }: AddFoodSheetProps) {
  const [searchValue, setSearchValue] = useState('');
  const [scanMode, setScanMode] = useState<ScanMode>('none');
  const { firestore, user } = useFirebase();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  const productsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, `products`));
  }, [firestore]);

  const { data: products } = useCollection<Product>(productsQuery);

  const form = useForm<z.infer<typeof logItemSchema>>({
    resolver: zodResolver(logItemSchema),
    defaultValues: {
      productId: '',
      grams: 100,
    },
  });

  const selectedProductId = form.watch('productId');
  const selectedProduct = useMemo(() => {
      return products?.find(p => p.id === selectedProductId);
  }, [products, selectedProductId]);

  const grams = form.watch('grams');
  const calculatedMacros = useMemo(() => {
    if (!selectedProduct || !grams) return null;
    const ratio = grams / 100;
    return {
        calories: Math.round(selectedProduct.caloriesPer100g * ratio),
        protein: Math.round(selectedProduct.proteinPer100g * ratio),
        fat: Math.round(selectedProduct.fatPer100g * ratio),
        carbs: Math.round(selectedProduct.carbsPer100g * ratio),
    }
  }, [selectedProduct, grams]);

  const onSubmit = async (values: z.infer<typeof logItemSchema>) => {
    if (!user || !selectedProduct || !calculatedMacros || !userProfile) return;
    
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
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        grams: values.grams,
        ...calculatedMacros,
        createdAt: serverTimestamp(),
    }

    addDocumentNonBlocking(logItemsCollection, newLogItem);
    updateDocumentNonBlocking(dailyLogRef, { consumedCalories: increment(newLogItem.calories) });
    
    triggerHapticFeedback();
    
    setIsOpen(false);
  };
  
  const handleSheetOpen = (open: boolean) => {
    if(!open) {
      form.reset({ productId: '', grams: 100 });
      setSearchValue('');
      setScanMode('none');
    }
    setIsOpen(open);
  }

  // Handle scanned product from AI
  const handleAiScanComplete = async (scannedProduct: Product) => {
      if (!firestore) return;

      const { detectedGrams, ...productToSave } = scannedProduct as any;
      const newProductRef = doc(collection(firestore, 'products'));
      productToSave.id = newProductRef.id;

      setDocumentNonBlocking(newProductRef, productToSave, { merge: true });

      form.setValue('productId', newProductRef.id);
      if (detectedGrams) {
          form.setValue('grams', detectedGrams);
      }

      setScanMode('none');
      triggerHapticFeedback();
  };

  // Handle barcode scan
  const handleBarcodeScan = async (detectedProduct: any, barcode: string) => {
      // Note: 'detectedProduct' here is the minimal info from the barcode scanner component if it does lookup,
      // but typically we use the server action to get details.

      triggerHapticFeedback();

      if (!firestore || !user) return;

      try {
          // 1. Check if we already have this product in Firestore by barcode
          const productsRef = collection(firestore, 'products');
          const q = query(productsRef, where('barcode', '==', barcode));
          const querySnapshot = await getDocs(q);

          let productId: string;

          if (!querySnapshot.empty) {
              // Found existing product
              const doc = querySnapshot.docs[0];
              productId = doc.id;
              toast({ title: 'Product Found', description: `Found ${doc.data().name} in database.` });
          } else {
              // 2. Fetch from OpenFoodFacts
              toast({ title: 'Searching...', description: 'Looking up barcode in global database.' });
              const { product: offProduct, error } = await getProductByBarcode(barcode);

              if (error || !offProduct) {
                  toast({ variant: 'destructive', title: 'Not Found', description: error || 'Product not found.' });
                  return; // Keep scanner open to try again?
              }

              // 3. Create new product in Firestore
              const newProductData = {
                name: offProduct.name,
                brand: offProduct.brand,
                caloriesPer100g: offProduct.caloriesPer100g,
                proteinPer100g: offProduct.proteinPer100g,
                fatPer100g: offProduct.fatPer100g,
                carbsPer100g: offProduct.carbsPer100g,
                creatorId: user.uid,
                creatorUsername: userProfile.username || 'User',
                likes: 0,
                likedBy: [],
                source: 'scanned',
                barcode: barcode,
              };

              // We use addDoc here (via standard SDK or non-blocking wrapper, but we need ID immediately)
              // Let's use setDocument with a new ID
              const newRef = doc(productsRef);
              productId = newRef.id;
              setDocumentNonBlocking(newRef, { ...newProductData, id: productId }, { merge: true });

              toast({ title: 'Product Added', description: `Added ${offProduct.name} to library.` });
          }

          // 4. Select the product in the form
          form.setValue('productId', productId);
          setScanMode('none');

      } catch (e) {
          console.error("Barcode lookup failed", e);
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to process barcode.' });
      }
  };

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!searchValue) return products;
    return products.filter((product) => 
        product.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        product.brand.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [products, searchValue]);

  return (
      <Sheet open={isOpen} onOpenChange={handleSheetOpen}>
        <SheetContent side={isMobile ? 'bottom' : 'right'} className="flex flex-col gap-0 p-0">
          <SheetHeader className="p-6 pb-2">
            <SheetTitle>Log Food Item</SheetTitle>
            <SheetDescription>
              Search for a product, scan with AI/Barcode, or enter manually.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">

            {scanMode === 'none' ? (
                <>
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <Button
                            variant="outline"
                            className="h-20 flex flex-col gap-2 border-dashed border-2"
                            onClick={() => setScanMode('ai')}
                        >
                            <MdCameraAlt className="text-2xl text-primary" />
                            <span className="font-semibold text-xs text-primary">Snap & Scan (AI)</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-20 flex flex-col gap-2 border-dashed border-2"
                            onClick={() => setScanMode('barcode')}
                        >
                            <MdQrCodeScanner className="text-2xl text-blue-600" />
                            <span className="font-semibold text-xs text-blue-600">Scan Barcode</span>
                        </Button>
                    </div>

                    <Form {...form}>
                    <form className="space-y-6">
                        <FormField
                        control={form.control}
                        name="productId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Product</FormLabel>
                            {!selectedProduct ? (
                                <Command shouldFilter={false}>
                                <CommandInput
                                    placeholder="Search product by name or brand..."
                                    value={searchValue}
                                    onValueChange={setSearchValue}
                                />
                                <ScrollArea className="h-48 rounded-md border">
                                    <CommandList>
                                    {filteredProducts.length === 0 && <CommandEmpty>No product found.</CommandEmpty>}
                                    <CommandGroup>
                                        {filteredProducts.map((product) => (
                                        <CommandItem
                                            key={product.id}
                                            value={product.id}
                                            onSelect={() => {
                                            form.setValue("productId", product.id);
                                            }}
                                        >
                                            <div>
                                            <p>{product.name}</p>
                                            <p className="text-xs text-muted-foreground">{product.brand}</p>
                                            </div>
                                        </CommandItem>
                                        ))}
                                    </CommandGroup>
                                    </CommandList>
                                </ScrollArea>
                                </Command>
                            ) : (
                                <div className="flex items-center justify-between rounded-md border bg-muted p-3">
                                    <div>
                                        <p className="font-medium">{selectedProduct.name}</p>
                                        <p className="text-sm text-muted-foreground">{selectedProduct.brand}</p>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => form.setValue('productId', '')}>Change</Button>
                                </div>
                            )}
                            <FormMessage />
                            </FormItem>
                        )}
                        />

                        {selectedProduct && (
                            <>
                                <FormField
                                control={form.control}
                                name="grams"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Weight (grams)</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="150" {...field} onFocus={(e) => e.target.select()} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                                {calculatedMacros && (
                                    <div className="space-y-2 rounded-md bg-muted p-4 text-sm">
                                        <h4 className="font-medium text-foreground">Calculated Nutrition</h4>
                                        <div className="flex justify-between"><span>Calories:</span> <span>{calculatedMacros.calories} kcal</span></div>
                                        <div className="flex justify-between"><span>Protein:</span> <span>{calculatedMacros.protein} g</span></div>
                                        <div className="flex justify-between"><span>Fat:</span> <span>{calculatedMacros.fat} g</span></div>
                                        <div className="flex justify-between"><span>Carbs:</span> <span>{calculatedMacros.carbs} g</span></div>
                                    </div>
                                )}
                            </>
                        )}
                    </form>
                    </Form>
                </>
            ) : scanMode === 'ai' ? (
                <div className="h-full flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-medium">AI Food Scanner</h3>
                        <Button variant="ghost" size="sm" onClick={() => setScanMode('none')}>Cancel</Button>
                    </div>
                    <AiScanner
                        onScanComplete={handleAiScanComplete}
                        onClose={() => setScanMode('none')}
                    />
                </div>
            ) : (
                <div className="h-full flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-medium">Barcode Scanner</h3>
                        <Button variant="ghost" size="sm" onClick={() => setScanMode('none')}>Cancel</Button>
                    </div>
                    {/* Reuse BarcodeScanner component directly */}
                    <div className="flex-1 overflow-hidden rounded-xl border relative">
                        <BarcodeScanner
                            onScan={(detected, barcode) => handleBarcodeScan(detected, barcode)}
                            onClose={() => setScanMode('none')}
                        />
                    </div>
                    <p className="text-center text-xs text-muted-foreground mt-4">
                        Point camera at a barcode to search OpenFoodFacts.
                    </p>
                </div>
            )}
          </div>
          {scanMode === 'none' && (
            <SheetFooter className="bg-card p-6 mt-4 border-t">
                <Button onClick={form.handleSubmit(onSubmit)} type="submit" className="w-full" disabled={!selectedProduct || isLogLoading}>
                Add to Log
                </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
  );
}
