// ─────────────────────────────────────────────
// RyCal.AI — Calorie & Macro Calculations
// Formula: Mifflin-St Jeor BMR × Activity Multiplier ± Goal Adjustment
// ─────────────────────────────────────────────

import { UserProfile, MacroTotals, ActivityLevel, Goal, Sex } from './types';

// ── Constants ─────────────────────────────────

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,    // Desk job, little to no exercise
  light: 1.375,      // Light exercise 1–3 days/week
  moderate: 1.55,    // Moderate exercise 3–5 days/week
  active: 1.725,     // Hard exercise 6–7 days/week
  very_active: 1.9,  // Hard daily exercise + physical job
};

const GOAL_KCAL_DELTA: Record<Goal, number> = {
  cut: -500,      // ~1 lb/week deficit
  maintain: 0,
  bulk: 300,      // Lean surplus
};

/**
 * Macro split as % of total calories per goal.
 * Protein and carbs = 4 kcal/g, fat = 9 kcal/g.
 */
const MACRO_SPLITS: Record<Goal, { protein: number; carbs: number; fat: number }> = {
  cut:      { protein: 0.40, carbs: 0.30, fat: 0.30 },
  maintain: { protein: 0.30, carbs: 0.40, fat: 0.30 },
  bulk:     { protein: 0.25, carbs: 0.50, fat: 0.25 },
};

// ── Core Calculation ──────────────────────────

interface SetupInputs {
  weight: number;       // lbs
  height: number;       // total inches
  age: number;
  sex: Sex;
  activityLevel: ActivityLevel;
  goal: Goal;
}

export function calculateProfile(inputs: SetupInputs): Omit<UserProfile, 'setupComplete'> {
  const weightKg = inputs.weight * 0.453592;
  const heightCm = inputs.height * 2.54;

  // Mifflin-St Jeor BMR
  const bmr =
    inputs.sex === 'male'
      ? 10 * weightKg + 6.25 * heightCm - 5 * inputs.age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * inputs.age - 161;

  const tdee = bmr * ACTIVITY_MULTIPLIERS[inputs.activityLevel];
  const dailyCalories = Math.round(tdee + GOAL_KCAL_DELTA[inputs.goal]);

  const split = MACRO_SPLITS[inputs.goal];
  const dailyProtein = Math.round((dailyCalories * split.protein) / 4);
  const dailyCarbs   = Math.round((dailyCalories * split.carbs) / 4);
  const dailyFat     = Math.round((dailyCalories * split.fat) / 9);

  return {
    weight: inputs.weight,
    height: inputs.height,
    age: inputs.age,
    sex: inputs.sex,
    activityLevel: inputs.activityLevel,
    goal: inputs.goal,
    dailyCalories,
    dailyProtein,
    dailyCarbs,
    dailyFat,
  };
}

// ── Aggregation Helpers ───────────────────────

export function sumMacros(meals: Array<{ calories: number; protein: number; carbs: number; fat: number }>): MacroTotals {
  return meals.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.calories || 0),
      protein:  acc.protein  + (m.protein  || 0),
      carbs:    acc.carbs    + (m.carbs    || 0),
      fat:      acc.fat      + (m.fat      || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export function getRemainingMacros(profile: UserProfile, consumed: MacroTotals): MacroTotals {
  return {
    calories: profile.dailyCalories - consumed.calories,
    protein:  profile.dailyProtein  - consumed.protein,
    carbs:    profile.dailyCarbs    - consumed.carbs,
    fat:      profile.dailyFat      - consumed.fat,
  };
}

/** Clamp a progress percentage between 0 and 1. */
export function macroProgress(consumed: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(1, Math.max(0, consumed / goal));
}

// ── Display Helpers ───────────────────────────

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary:   'Sedentary (desk job, little exercise)',
  light:       'Light (exercise 1–3 days/week)',
  moderate:    'Moderate (exercise 3–5 days/week)',
  active:      'Active (exercise 6–7 days/week)',
  very_active: 'Very Active (athlete / physical job)',
};

export const GOAL_LABELS: Record<Goal, string> = {
  cut:      'Cut — lose fat',
  maintain: 'Maintain — stay lean',
  bulk:     'Bulk — build muscle',
};
