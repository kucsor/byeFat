'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { AppHeader } from '@/components/app/header';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import Loading from '@/app/loading';
import { collection, query, where } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function ProductCard({ product }: { product: Product }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-grow pb-2">
        <CardTitle className="text-base">{product.name}</CardTitle>
        <CardDescription>{product.brand}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        <p>{product.caloriesPer100g} kcal / 100g</p>
      </CardContent>
    </Card>
  );
}


export default function CreatorProfilePage() {
  const { firestore } = useFirebase();
  const params = useParams();
  const username = params.username as string;

  const productsByCreatorQuery = useMemoFirebase(() => {
    if (!firestore || !username) return null;
    return query(
      collection(firestore, 'products'),
      where('creatorUsername', '==', username)
    );
  }, [firestore, username]);

  const { data: products, isLoading } = useCollection<Product>(productsByCreatorQuery);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <AppHeader />
      <main className="container mx-auto max-w-2xl flex-1 p-4 md:p-8">
        <div className="mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-2">
                <UserIcon className="h-8 w-8" />
                {username}
            </h1>
            <p className="text-muted-foreground">Products created by this user.</p>
        </div>
        
        {products && products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <Card className="flex flex-col items-center justify-center p-8 text-center border-dashed">
            <CardHeader>
                <CardTitle>No Products Found</CardTitle>
                <CardDescription>This user hasn't created any products yet.</CardDescription>
            </CardHeader>
          </Card>
        )}
         <Button variant="link" asChild className="mt-8">
            <Link href="/">Back to Dashboard</Link>
        </Button>
      </main>
    </div>
  );
}
