'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import type { Product, UserProfile } from '@/lib/types';
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
import { collection, doc } from 'firebase/firestore';
import { triggerHapticFeedback } from '@/lib/haptics';

const productSchema = z.object({
  name: z.string().min(2, { message: 'Product name must be at least 2 characters.' }),
  brand: z.string().min(2, { message: 'Brand name must be at least 2 characters.' }),
  caloriesPer100g: z.coerce.number().min(0, { message: 'Calories must be a positive number.' }),
  proteinPer100g: z.coerce.number().min(0, { message: 'Protein must be a positive number.' }),
  fatPer100g: z.coerce.number().min(0, { message: 'Fat must be a positive number.' }),
  carbsPer100g: z.coerce.number().min(0, { message: 'Carbs must be a positive number.' }),
});

type ProductFormSheetProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  product: Product | null;
  userProfile: UserProfile;
};

export function ProductFormSheet({ isOpen, setIsOpen, product, userProfile }: ProductFormSheetProps) {
  const { firestore } = useFirebase();
  const isMobile = useIsMobile();

  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      brand: '',
      caloriesPer100g: 0,
      proteinPer100g: 0,
      fatPer100g: 0,
      carbsPer100g: 0,
    },
  });

  useEffect(() => {
    if (product) {
      form.reset(product);
    } else {
      form.reset({
        name: '',
        brand: '',
        caloriesPer100g: 0,
        proteinPer100g: 0,
        fatPer100g: 0,
        carbsPer100g: 0,
      });
    }
  }, [product, form]);
  
  const onSubmit = (values: z.infer<typeof productSchema>) => {
    if (!firestore || !userProfile?.username) return;
    
    const productsCollection = collection(firestore, `products`);
    
    if(product) {
        // Update existing product
        const productDoc = doc(productsCollection, product.id);
        updateDocumentNonBlocking(productDoc, values);
    } else {
        // Add new product
        const newProduct = {
            ...values,
            creatorId: userProfile.id,
            creatorUsername: userProfile.username,
            likes: 0,
            likedBy: [],
            source: 'manual' as const,
        }
        addDocumentNonBlocking(productsCollection, newProduct);
    }

    triggerHapticFeedback();
    setIsOpen(false);
  };

  return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side={isMobile ? 'bottom' : 'right'} className="flex flex-col gap-0 p-0">
          <SheetHeader className="p-6 pb-2">
            <SheetTitle>{product ? 'Edit Product' : 'Add New Product'}</SheetTitle>
            <SheetDescription>
                Enter the nutritional information per 100g. This will be visible to all users.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <Form {...form}>
              <form className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Chicken Breast" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Coca-Cola" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="caloriesPer100g"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calories / 100g</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="165" {...field} onFocus={(e) => e.target.select()} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="proteinPer100g"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Protein (g)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="31" {...field} onFocus={(e) => e.target.select()} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fatPer100g"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fat (g)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="3.6" {...field} onFocus={(e) => e.target.select()} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="carbsPer100g"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Carbs (g)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} onFocus={(e) => e.target.select()} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </form>
            </Form>
          </div>
          <SheetFooter className="bg-card p-6 mt-4 border-t">
            <Button onClick={form.handleSubmit(onSubmit)} type="submit" className="w-full">
              {product ? 'Save Changes' : 'Add Product'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
  );
}
