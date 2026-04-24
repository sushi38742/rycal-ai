'use client';

// ─────────────────────────────────────────────
// RyCal.AI — Macro Progress Bars
// Shows protein / carbs / fat consumed vs goal
// ─────────────────────────────────────────────

import { UserProfile, MacroTotals } from '@/lib/types';
import { macroProgress } from '@/lib/calculations';

interface Props {
  profile: UserProfile;
  consumed: MacroTotals;
}

interface MacroRowProps {
  label: string;
  consumed: number;
  goal: number;
  color: string;
  trackColor: string;
}

function MacroRow({ label, consumed, goal, color, trackColor }: MacroRowProps) {
  const pct = macroProgress(consumed, goal);
  const remaining = Math.max(0, goal - consumed);
  const over = consumed > goal;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
        <span className={`text-xs font-bold tabular-nums ${over ? 'text-rose-400' : 'text-gray-300'}`}>
          {over ? `+${consumed - goal}g over` : `${remaining}g left`}
          <span className="text-gray-600 font-normal ml-1">/ {goal}g</span>
        </span>
      </div>
      {/* Track */}
      <div className={`h-2 rounded-full ${trackColor}`}>
        <div
          className={`h-2 rounded-full transition-all duration-500 ${over ? 'bg-rose-500' : color}`}
          style={{ width: `${Math.min(pct * 100, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function MacroBars({ profile, consumed }: Props) {
  return (
    <div className="px-6 space-y-4">
      <MacroRow
        label="Protein"
        consumed={consumed.protein}
        goal={profile.dailyProtein}
        color="bg-emerald-500"
        trackColor="bg-emerald-500/15"
      />
      <MacroRow
        label="Carbs"
        consumed={consumed.carbs}
        goal={profile.dailyCarbs}
        color="bg-blue-500"
        trackColor="bg-blue-500/15"
      />
      <MacroRow
        label="Fat"
        consumed={consumed.fat}
        goal={profile.dailyFat}
        color="bg-amber-400"
        trackColor="bg-amber-400/15"
      />
    </div>
  );
}
