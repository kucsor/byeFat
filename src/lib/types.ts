export type UserProfile = {
  id: string;
  email: string;
  name: string;
  username?: string;
  gender?: 'male' | 'female';
  age?: number;
  weight?: number;
  height?: number;
  goal?: 'lose' | 'maintain' | 'gain';
  dailyCalories?: number;
  dailyProtein?: number;
  dailyCarbs?: number;
  dailyFat?: number;
};

export type Product = {
  id: string;
  name: string;
  brand: string;
  caloriesPer100g: number;
  fatPer100g: number;
  carbsPer100g: number;
  proteinPer100g: number;
  creatorId: string;
  creatorUsername: string;
  likes: number;
  likedBy: string[];
  barcode?: string;
  source?: 'manual' | 'scanned';
};

export type DailyLogItem = {
  id: string;
  productId: string;
  productName: string;
  grams: number;
  calories: number;
  fat: number;
  carbs: number;
  protein: number;
  createdAt: any;
}

export type DailyLogActivity = {
    id: string;
    name: string;
    calories: number;
    createdAt: any;
}

export type DailyLog = {
  id: string; // YYYY-MM-DD
  date: string; // YYYY-MM-DD
  // Optional goals snapshotted for the day
  goalCalories?: number;
  goalProtein?: number;
  goalCarbs?: number;
  goalFat?: number;
  consumedCalories?: number;
};

export type WeightEntry = {
    id: string;
    date: string; // YYYY-MM-DD
    weight: number;
}
    

    