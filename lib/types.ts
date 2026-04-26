// RyCal.AI — Core Types

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'cut' | 'maintain' | 'bulk';
export type WorkoutType = 'Push' | 'Pull' | 'Legs' | 'Full Body' | 'Rest';
export type Confidence = 'high' | 'medium' | 'low';

export interface UserProfile {
  weight: number;
  height: number;
  age: number;
  sex: Sex;
  activityLevel: ActivityLevel;
  goal: Goal;
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
  setupComplete: boolean;
}

export interface MacroSources {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

export interface MealEntry {
  id: string;
  name: string;
  brand: string | null;
  servingDescription: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timestamp: number;
  sourceType: 'database' | 'estimate';
  sources: MacroSources;
  photoDataUrl?: string;
}

export interface DayLog {
  date: string;
  meals: MealEntry[];
  workout: WorkoutType | null;
}

export interface FoodAnalysisResult {
  foodName: string;
  brand: string | null;
  servingDescription: string;
  isBranded: boolean;
  confidence: Confidence;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sources: MacroSources;
  notes: string;
}

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}
