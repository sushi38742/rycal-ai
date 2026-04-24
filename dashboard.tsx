'use client';

// ─────────────────────────────────────────────
// RyCal.AI — Main Dashboard
// The entire app lives here. Setup redirects here after completion.
// ─────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { Flame, Settings } from 'lucide-react';
import { UserProfile, DayLog } from '@/lib/types';
import { getProfile, getDayLog, getTodayDate, removeMeal } from '@/lib/storage';
import { sumMacros, getRemainingMacros } from '@/lib/calculations';
import MacroBars from './MacroBars';
import WorkoutTracker from './WorkoutTracker';
import MealLogList from './MealLogList';
import PhotoLogger from './PhotoLogger';

// ── Date helpers ──────────────────────────────

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// ── Calorie hero number ───────────────────────

function CalorieHero({ remaining, total }: { remaining: number; total: number }) {
  const isOver = remaining < 0;
  const isNearLimit = remaining >= 0 && remaining < total * 0.1;

  let colorClass = 'text-white';
  if (isOver) colorClass = 'text-rose-400';
  else if (isNearLimit) colorClass = 'text-amber-400';

  return (
    <div className="flex flex-col items-center py-10">
      {/* The hero number */}
      <div
        className={`text-[88px] leading-none font-black tabular-nums tracking-tighter transition-colors duration-300 ${colorClass}`}
        style={{ textShadow: isOver ? '0 0 60px rgba(244,63,94,0.3)' : '0 0 80px rgba(249,115,22,0.15)' }}
      >
        {Math.abs(remaining)}
      </div>
      <p className="text-gray-500 text-sm font-medium mt-2 tracking-wide">
        {isOver ? 'calories over' : 'calories remaining'}
      </p>

      {/* Eaten / goal summary */}
      <div className="flex items-center gap-2 mt-4 text-xs text-gray-600">
        <span>{total - remaining < 0 ? 0 : total - remaining} eaten</span>
        <span className="text-gray-700">·</span>
        <span>{total} goal</span>
      </div>
    </div>
  );
}

// ── Camera button ─────────────────────────────

function CameraButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex flex-col items-center py-8">
      <button
        type="button"
        onClick={onClick}
        className="relative group focus:outline-none"
        aria-label="Log a meal with photo"
      >
        {/* Outer pulse rings */}
        <span className="absolute inset-0 rounded-full bg-orange-500/20 animate-ping [animation-duration:2s]" />
        <span className="absolute inset-[-8px] rounded-full bg-orange-500/10 animate-ping [animation-duration:2.6s]" />

        {/* Main button */}
        <div className="relative w-[88px] h-[88px] rounded-full bg-gradient-to-br from-orange-400 via-orange-500 to-rose-600 flex items-center justify-center shadow-2xl shadow-orange-500/40 group-active:scale-95 transition-transform duration-150">
          {/* Camera icon SVG — custom so it looks intentional */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-10 h-10"
          >
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </div>
      </button>

      <p className="mt-4 text-sm font-semibold text-gray-400 tracking-wide">Snap &amp; Log</p>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────

export default function Dashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dayLog, setDayLog] = useState<DayLog>({ date: '', meals: [], workout: null });
  const [showLogger, setShowLogger] = useState(false);
  const [mounted, setMounted] = useState(false);
  const today = getTodayDate();

  const refresh = useCallback(() => {
    const p = getProfile();
    const d = getDayLog(today);
    setProfile(p);
    setDayLog(d);
  }, [today]);

  useEffect(() => {
    setMounted(true);
    refresh();
  }, [refresh]);

  // Avoid SSR flash
  if (!mounted || !profile) return null;

  const consumed = sumMacros(dayLog.meals);
  const remaining = getRemainingMacros(profile, consumed);

  const handleDeleteMeal = (id: string) => {
    removeMeal(id, today);
    refresh();
  };

  const handleWorkoutUpdate = () => {
    refresh();
  };

  const handleMealLogged = () => {
    refresh();
    setShowLogger(false);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-6 pt-12 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center">
            <Flame className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-black tracking-tight">RyCal.AI</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-600">{formatDate(today)}</span>
          <button
            type="button"
            onClick={() => {
              if (confirm('Reset all data and redo setup?')) {
                localStorage.clear();
                window.location.href = '/setup';
              }
            }}
            className="p-1.5 rounded-xl text-gray-700 hover:text-gray-400 transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── Calories remaining (hero) ── */}
      <CalorieHero remaining={remaining.calories} total={profile.dailyCalories} />

      {/* ── Macro bars ── */}
      <div className="mb-6">
        <MacroBars profile={profile} consumed={consumed} />
      </div>

      {/* ── Camera button ── */}
      <CameraButton onClick={() => setShowLogger(true)} />

      {/* ── Workout tracker ── */}
      <div className="mb-8">
        <WorkoutTracker date={today} dayLog={dayLog} onUpdate={handleWorkoutUpdate} />
      </div>

      {/* ── Today's meals ── */}
      <div className="mb-10">
        <div className="flex items-center justify-between px-6 mb-4">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Today's Meals</h2>
          {dayLog.meals.length > 0 && (
            <span className="text-xs text-gray-600">{dayLog.meals.length} logged</span>
          )}
        </div>
        <MealLogList meals={dayLog.meals} onDelete={handleDeleteMeal} />
      </div>

      {/* ── Photo Logger overlay ── */}
      {showLogger && (
        <PhotoLogger
          onClose={() => setShowLogger(false)}
          onMealLogged={handleMealLogged}
        />
      )}
    </div>
  );
}
