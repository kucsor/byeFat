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
import { collection, doc, query, serverTimestamp, increment } from 'firebase/firestore';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { triggerHapticFeedback } from '@/lib/haptics';
import { AiScanner } from '@/components/app/ai-scanner';
import { MdCameraAlt } from 'react-icons/md';

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

export function AddFoodSheet({ isOpen, setIsOpen, selectedDate, userProfile, selectedLog, isLogLoading }: AddFoodSheetProps) {
  const [searchValue, setSearchValue] = useState('');
  const [showAiScanner, setShowAiScanner] = useState(false);
  const { firestore, user } = useFirebase();
  const isMobile = useIsMobile();
  
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
      setShowAiScanner(false);
    }
    setIsOpen(open);
  }

  // Handle scanned product from AI
  const handleAiScanComplete = async (scannedProduct: Product) => {
      // 1. Add this temporary/scanned product to the 'products' collection or use it directly?
      // For simplicity, let's add it to the products collection so we can reference it by ID.
      // Or, better, if it's AI scanned, we might want to let the user review/edit it first.
      // But here we need to select it in the form.

      // Let's add it to Firestore so it has a real ID
      if (!firestore) return;

      // Remove the temporary props before saving
      const { detectedGrams, ...productToSave } = scannedProduct as any;

      // Use addDocumentNonBlocking but we need the ID immediately.
      // Let's manually create a doc ref.
      const newProductRef = doc(collection(firestore, 'products'));
      productToSave.id = newProductRef.id;

      await setDocumentNonBlocking(newProductRef, productToSave);

      // Set form values
      form.setValue('productId', newProductRef.id);
      if (detectedGrams) {
          form.setValue('grams', detectedGrams);
      }

      setShowAiScanner(false);
      triggerHapticFeedback();
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
              Search for a product, scan with AI, or enter the amount manually.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">

            {!showAiScanner ? (
                <>
                    <div className="mb-6">
                        <Button
                            variant="outline"
                            className="w-full h-12 gap-2 border-dashed border-2"
                            onClick={() => setShowAiScanner(true)}
                        >
                            <MdCameraAlt className="text-xl text-primary" />
                            <span className="font-semibold text-primary">Snap & Scan with Gemini</span>
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
            ) : (
                <div className="h-full flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-medium">AI Food Scanner</h3>
                        <Button variant="ghost" size="sm" onClick={() => setShowAiScanner(false)}>Cancel</Button>
                    </div>
                    <AiScanner
                        onScanComplete={handleAiScanComplete}
                        onClose={() => setShowAiScanner(false)}
                    />
                </div>
            )}
          </div>
          {!showAiScanner && (
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
