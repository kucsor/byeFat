'use client';
import { useState } from 'react';
import { collection, query, doc, updateDoc, increment, arrayUnion, arrayRemove, limit } from 'firebase/firestore';
import { useFirebase, useCollection, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import type { Product, UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Plus, Trash2, Pencil, Loader2, User as UserIcon, ThumbsUp, ChevronsUpDown } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { FixedSizeList as List } from 'react-window';

const ProductFormSheet = dynamic(() => import('./product-form-sheet').then(mod => mod.ProductFormSheet));

function ProductCard({ product, onEdit, userProfile }: { product: Product, onEdit: (product: Product) => void, userProfile: UserProfile }) {
  const { firestore } = useFirebase();

  const handleDelete = () => {
    if (!userProfile) return;
    const docRef = doc(firestore, `products`, product.id);
    deleteDocumentNonBlocking(docRef);
  };
  
  const handleLike = () => {
    if (!userProfile) return;
    const docRef = doc(firestore, `products`, product.id);
    const isLiked = product.likedBy?.includes(userProfile.id);

    const newLikes = isLiked ? increment(-1) : increment(1);
    const userUpdate = isLiked ? arrayRemove(userProfile.id) : arrayUnion(userProfile.id);

    updateDoc(docRef, {
        likes: newLikes,
        likedBy: userUpdate,
    }).catch(error => {
        errorEmitter.emit(
            'permission-error',
            new FirestorePermissionError({
                path: docRef.path,
                operation: 'update',
                requestResourceData: { 
                    likes: `increment(${isLiked ? -1 : 1})`,
                    likedBy: `array${isLiked ? 'Remove' : 'Union'}`
                },
            })
        )
    });
  };

  const canModify = product.creatorId === userProfile.id;
  const isLiked = product.likedBy?.includes(userProfile.id);
  
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-grow pb-2">
        <CardTitle className="text-base">{product.name}</CardTitle>
        <CardDescription>{product.brand}</CardDescription>
        <CardDescription className="flex items-center gap-1 text-xs pt-1">
          <UserIcon className="h-3 w-3" />
           <Link href={`/u/${product.creatorUsername}`} className="hover:underline">
            {product.creatorUsername}
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-end justify-between text-sm text-muted-foreground">
        <div>
          <p>{product.caloriesPer100g} kcal / 100g</p>
        </div>
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
                {!canModify && (
                    <Button variant="ghost" size="icon" className={`h-8 w-8 ${isLiked ? 'text-primary hover:text-primary' : 'text-muted-foreground'}`} onClick={handleLike}>
                        <ThumbsUp className="h-4 w-4" />
                    </Button>
                )}
                 <span className="font-medium text-sm">{product.likes ?? 0}</span>
            </div>

            {canModify && (
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(product)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                            This will permanently delete the product &quot;{product.name}&quot;. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}


export function ProductsList({ userProfile }: { userProfile: UserProfile }) {
  const { firestore } = useFirebase();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductListOpen, setIsProductListOpen] = useState(false);
  const [limitCount, setLimitCount] = useState(20);

  const productsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, `products`), limit(limitCount));
  }, [firestore, limitCount]);

  const { data: products, isLoading } = useCollection<Product>(productsQuery);

  const handleLoadMore = () => {
    setLimitCount((prev) => prev + 20);
  };

  const onItemsRendered = ({ visibleStopIndex }: { visibleStopIndex: number }) => {
    if (products && visibleStopIndex >= products.length - 1 && !isLoading) {
        if (products.length >= limitCount) {
             handleLoadMore();
        }
    }
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setIsSheetOpen(true);
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsSheetOpen(true);
  }
  
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    if (!products) return null;
    const product = products[index];
    return (
      <div style={style} className="py-1">
        <ProductCard product={product} onEdit={handleEditProduct} userProfile={userProfile} />
      </div>
    );
  };


  return (
    <Card>
      <Collapsible open={isProductListOpen} onOpenChange={setIsProductListOpen}>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Global Products</CardTitle>
              <CardDescription>Products added by all users.</CardDescription>
            </div>
            <div className='flex items-center gap-1'>
              <Button size="sm" onClick={handleAddProduct}>
                <Plus className="mr-2 h-4 w-4" /> Add
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                    <ChevronsUpDown className="h-4 w-4" />
                    <span className="sr-only">Toggle product list</span>
                </Button>
              </CollapsibleTrigger>
            </div>
        </CardHeader>
        <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
                {isLoading && (!products || products.length === 0) && <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
                {!isLoading && !products?.length && isProductListOpen && (
                <div className="text-center text-muted-foreground p-8">
                    <p>No products yet.</p>
                    <p className="text-sm">Click &quot;Add&quot; to create the first one.</p>
                </div>
                )}
                {products && products.length > 0 && isProductListOpen && (
                   <>
                   <List
                        height={400}
                        itemCount={products.length}
                        itemSize={125}
                        width="100%"
                        onItemsRendered={onItemsRendered}
                    >
                        {Row}
                    </List>
                     {isLoading && products.length > 0 && (
                        <div className="flex justify-center py-2 text-xs text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading more...
                        </div>
                    )}
                   </>
                )}
            </CardContent>
        </CollapsibleContent>
      </Collapsible>
      <ProductFormSheet 
        isOpen={isSheetOpen} 
        setIsOpen={setIsSheetOpen}
        product={editingProduct}
        userProfile={userProfile}
      />
    </Card>
  );
}
