export type UserProfile = {
  id: string;
  email: string;
  name: string;
  username?: string;
  gender?: 'male' | 'female';
  age?: number;
  weight?: number;
  height?: number;
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal?: 'lose' | 'maintain' | 'gain';
  // TDEE and targets
  maintenanceCalories?: number; // BMR * ActivityMultiplier
  deficitTarget?: number; // How much deficit to target (e.g., 500)
  dailyCalories?: number; // maintenanceCalories - deficitTarget
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
  maintenanceCalories?: number;
  deficitTarget?: number;
  consumedCalories?: number;
  activeCalories?: number; // Added to track burned calories denormalized
};

export type WeightEntry = {
    id: string;
    date: string; // YYYY-MM-DD
    weight: number;
}
