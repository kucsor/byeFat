'use server';

import { z } from 'zod';

const OffProductSchema = z.object({
  product: z.object({
    product_name: z.string().optional(),
    product_name_en: z.string().optional(),
    brands: z.string().optional(),
    nutriments: z.object({
      'energy-kcal_100g': z.number().optional(),
      fat_100g: z.number().optional(),
      carbohydrates_100g: z.number().optional(),
      proteins_100g: z.number().optional(),
    }).optional(),
  }).optional(),
  status: z.number(),
});

export type ScannedProduct = {
    name: string;
    brand: string;
    caloriesPer100g: number;
    proteinPer100g: number;
    fatPer100g: number;
    carbsPer100g: number;
}

export async function getProductByBarcode(barcode: string): Promise<{ product: ScannedProduct | null; error?: string }> {
  if (!/^\d+$/.test(barcode)) {
    return { product: null, error: "Invalid barcode format." };
  }

  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`, {
        headers: {
            'User-Agent': 'byeFat-WebApp - Web - Version 1.0',
        }
    });

    if (!response.ok) {
      return { product: null, error: `Product not found (status: ${response.status}).` };
    }
    const data = await response.json();
    const parsed = OffProductSchema.safeParse(data);

    if (!parsed.success || parsed.data.status === 0 || !parsed.data.product) {
      return { product: null, error: 'Product not found in Open Food Facts database.' };
    }
    
    const offProduct = parsed.data.product;
    const nutriments = offProduct.nutriments;

    const name = offProduct.product_name_en || offProduct.product_name;

    if (!name || !nutriments) {
        return { product: null, error: 'Incomplete product data from API.' };
    }

    const product: ScannedProduct = {
      name: name,
      brand: offProduct.brands || 'Unknown Brand',
      caloriesPer100g: nutriments['energy-kcal_100g'] || 0,
      proteinPer100g: nutriments.proteins_100g || 0,
      fatPer100g: nutriments.fat_100g || 0,
      carbsPer100g: nutriments.carbohydrates_100g || 0,
    };
    
    // Basic validation
    if(product.caloriesPer100g === 0 && product.proteinPer100g === 0) {
        return { product: null, error: 'Product found, but nutritional information is missing.' };
    }

    return { product };

  } catch (error) {
    console.error('Error fetching from Open Food Facts:', error);
    return { product: null, error: 'Failed to fetch product data.' };
  }
}
