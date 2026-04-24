// ─────────────────────────────────────────────
// RyCal.AI — Core Types
// ─────────────────────────────────────────────

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'cut' | 'maintain' | 'bulk';
export type WorkoutType = 'Push' | 'Pull' | 'Legs' | 'Full Body' | 'Rest';
export type Confidence = 'high' | 'medium' | 'low';

export interface UserProfile {
  // Raw inputs
  weight: number;        // lbs
  height: number;        // total inches
  age: number;
  sex: Sex;
  activityLevel: ActivityLevel;
  goal: Goal;

  // Calculated targets
  dailyCalories: number;
  dailyProtein: number;  // grams
  dailyCarbs: number;    // grams
  dailyFat: number;      // grams

  setupComplete: boolean;
}

/** Source string for a single macro value — shown prominently on the confirmation screen */
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
  protein: number;  // grams
  carbs: number;    // grams
  fat: number;      // grams
  timestamp: number;
  /** 'database' = Nutritionix lookup, 'estimate' = Gemini visual */
  sourceType: 'database' | 'estimate';
  sources: MacroSources;
  /** base64 data URL of the photo, stored for reference */
  photoDataUrl?: string;
}

export interface DayLog {
  date: string;           // YYYY-MM-DD
  meals: MealEntry[];
  workout: WorkoutType | null;
}

/** Result returned from the /api/analyze-food route */
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
