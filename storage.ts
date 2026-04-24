// ─────────────────────────────────────────────
// RyCal.AI — localStorage Wrapper
// All reads return null / empty defaults when called server-side.
// ─────────────────────────────────────────────

import { UserProfile, DayLog, MealEntry, WorkoutType } from './types';

const PROFILE_KEY = 'rycal_profile';
const LOGS_KEY = 'rycal_logs';

const isBrowser = typeof window !== 'undefined';

// ── Profile ──────────────────────────────────

export function getProfile(): UserProfile | null {
  if (!isBrowser) return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

export function saveProfile(profile: UserProfile): void {
  if (!isBrowser) return;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function clearProfile(): void {
  if (!isBrowser) return;
  localStorage.removeItem(PROFILE_KEY);
}

// ── Day Logs ─────────────────────────────────

export function getTodayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getAllLogs(): Record<string, DayLog> {
  if (!isBrowser) return {};
  try {
    const raw = localStorage.getItem(LOGS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, DayLog>) : {};
  } catch {
    return {};
  }
}

function saveAllLogs(logs: Record<string, DayLog>): void {
  if (!isBrowser) return;
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

export function getDayLog(date: string): DayLog {
  const logs = getAllLogs();
  return logs[date] ?? { date, meals: [], workout: null };
}

export function saveDayLog(log: DayLog): void {
  const logs = getAllLogs();
  logs[log.date] = log;
  saveAllLogs(logs);
}

// ── Meals ─────────────────────────────────────

export function addMeal(meal: MealEntry, date?: string): void {
  const d = date ?? getTodayDate();
  const log = getDayLog(d);
  log.meals = [...log.meals, meal];
  saveDayLog(log);
}

export function removeMeal(mealId: string, date?: string): void {
  const d = date ?? getTodayDate();
  const log = getDayLog(d);
  log.meals = log.meals.filter((m) => m.id !== mealId);
  saveDayLog(log);
}

// ── Workout ───────────────────────────────────

export function setWorkout(date: string, workout: WorkoutType | null): void {
  const log = getDayLog(date);
  log.workout = workout;
  saveDayLog(log);
}

// ── Weekly View ───────────────────────────────

/** Returns the last 7 days (oldest first, today last). */
export function getLast7Days(): DayLog[] {
  const logs = getAllLogs();
  const result: DayLog[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    result.push(logs[dateStr] ?? { date: dateStr, meals: [], workout: null });
  }
  return result;
}

// ── Nuclear Reset ─────────────────────────────

export function clearAll(): void {
  if (!isBrowser) return;
  localStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem(LOGS_KEY);
}
