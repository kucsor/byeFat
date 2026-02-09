'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { MdCameraAlt, MdClose } from 'react-icons/md';
import { analyzeFoodImage } from '@/app/actions/gemini-food-analysis';
import { Loader2 } from 'lucide-react';
import { Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface AiScannerProps {
  onScanComplete: (product: Product) => void;
  onClose: () => void;
}

export function AiScanner({ onScanComplete, onClose }: AiScannerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          const result = await analyzeFoodImage(base64String);

          if (result) {
            // Map the result to a Product-like structure
            // Note: ID is temporary, will be handled by the form/DB
            const scannedProduct: Product = {
              id: 'temp-ai-' + Date.now(),
              name: result.name || 'Unknown Food',
              brand: 'AI Scanned',
              caloriesPer100g: Math.round((result.calories / result.quantity_g) * 100) || 0,
              proteinPer100g: Math.round((result.protein_g / result.quantity_g) * 100) || 0,
              carbsPer100g: Math.round((result.carbs_g / result.quantity_g) * 100) || 0,
              fatPer100g: Math.round((result.fats_g / result.quantity_g) * 100) || 0,
              creatorId: 'ai',
              creatorUsername: 'Gemini AI',
              likes: 0,
              likedBy: [],
              source: 'scanned',
            };

            // Calculate total calories for the detected quantity to pass to the form if needed
            // But the ProductForm usually works with per100g.
            // We can pass the detected quantity as "default serving" if the form supports it.
            // For now, we return the Product.

            // Hack: Attach the detected total quantity to the product object temporarily
            // so the parent can pre-fill the "grams" field if it wants.
            (scannedProduct as any).detectedGrams = result.quantity_g;

            onScanComplete(scannedProduct);
          }
        } catch (error) {
          console.error("Analysis failed", error);
          toast({
            title: "Analysis Failed",
            description: "Could not identify the food. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (e) {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 items-center justify-center">
        <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
        />

        {isAnalyzing ? (
            <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-slate-500">Analyzing with Gemini AI...</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 gap-3 w-full">
                <Button
                    size="lg"
                    className="w-full h-12 text-lg gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <MdCameraAlt className="text-2xl" />
                    Snap & Scan
                </Button>
                <p className="text-xs text-center text-slate-400">
                    Takes a photo and estimates calories automatically.
                </p>
            </div>
        )}
    </div>
  );
}
