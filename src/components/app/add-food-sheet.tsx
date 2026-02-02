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
import { DancingApple } from './animated-icons';
import { motion } from 'framer-motion';

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
}

export function AddFoodSheet({ isOpen, setIsOpen, selectedDate, userProfile, selectedLog }: AddFoodSheetProps) {
  const [searchValue, setSearchValue] = useState('');
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
    }
    setIsOpen(open);
  }

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
        <SheetContent side={isMobile ? 'bottom' : 'right'} className="flex flex-col gap-0 p-0 rounded-t-[2.5rem] md:rounded-l-[2.5rem] md:rounded-tr-none border-none glass overflow-hidden">
          <SheetHeader className="p-6 pb-2">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-primary/20 p-2 rounded-2xl">
                <DancingApple />
              </div>
              <SheetTitle className="text-2xl font-black text-primary-foreground">Adaugă Aliment</SheetTitle>
            </div>
            <SheetDescription className="font-bold opacity-70">
              Caută un produs și introdu cantitatea consumată.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <Form {...form}>
              <form className="space-y-6">
                <FormField
                  control={form.control}
                  name="productId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest opacity-60">Produs</FormLabel>
                      {!selectedProduct ? (
                        <Command shouldFilter={false} className="rounded-3xl border-2 border-primary/20 overflow-hidden bg-white/50">
                          <CommandInput 
                            placeholder="Caută după nume sau brand..."
                            value={searchValue}
                            onValueChange={setSearchValue}
                            className="border-none focus:ring-0"
                          />
                          <ScrollArea className="h-48">
                            <CommandList>
                              {filteredProducts.length === 0 && <CommandEmpty className="p-4 text-center font-bold opacity-50">Nu am găsit produsul.</CommandEmpty>}
                              <CommandGroup>
                                {filteredProducts.map((product) => (
                                  <CommandItem
                                    key={product.id}
                                    value={product.id}
                                    onSelect={() => {
                                      form.setValue("productId", product.id);
                                    }}
                                    className="p-3 aria-selected:bg-primary/10 rounded-xl cursor-pointer"
                                  >
                                    <div>
                                      <p className="font-bold">{product.name}</p>
                                      <p className="text-xs text-muted-foreground font-medium">{product.brand}</p>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </ScrollArea>
                        </Command>
                      ) : (
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="flex items-center justify-between rounded-3xl border-2 border-primary/20 bg-primary/10 p-4"
                        >
                            <div>
                                <p className="font-black text-primary-foreground">{selectedProduct.name}</p>
                                <p className="text-xs text-muted-foreground font-bold uppercase">{selectedProduct.brand}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => form.setValue('productId', '')}
                              className="rounded-full hover:bg-primary/20 font-bold"
                            >
                              Schimbă
                            </Button>
                        </motion.div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {selectedProduct && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                        <FormField
                        control={form.control}
                        name="grams"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-xs font-black uppercase tracking-widest opacity-60">Greutate (grame)</FormLabel>
                            <FormControl>
                                <Input
                                  type="number"
                                  placeholder="150"
                                  {...field}
                                  onFocus={(e) => e.target.select()}
                                  className="h-14 rounded-2xl border-2 border-primary/20 bg-white/50 text-xl font-black text-center focus-visible:ring-primary/30"
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        {calculatedMacros && (
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
                        )}
                    </motion.div>
                )}
              </form>
            </Form>
          </div>
          <SheetFooter className="p-6 mt-4 border-t border-primary/10 bg-white/30 backdrop-blur-md">
            <Button
              onClick={form.handleSubmit(onSubmit)}
              type="submit"
              className="w-full h-14 rounded-2xl text-lg font-black shadow-lg shadow-primary/20 bouncy-hover"
              disabled={!selectedProduct}
            >
              Adaugă în Jurnal
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
  );
}
