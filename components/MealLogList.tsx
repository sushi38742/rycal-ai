'use client';
import { MealEntry } from '@/lib/types';
import { Trash2 } from 'lucide-react';

interface Props { meals: MealEntry[]; onDelete?: (id: string) => void; }

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function MealCard({ meal, onDelete }: { meal: MealEntry; onDelete?: (id: string) => void }) {
  return (
    <div className="bg-white/5 rounded-2xl px-4 py-4 border border-white/5 group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-white text-sm truncate">{meal.name}</p>
            {meal.sourceType === 'estimate' && (
              <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/20">EST</span>
            )}
          </div>
          {meal.servingDescription && <p className="text-xs text-gray-600 mb-2">{meal.servingDescription}</p>}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-orange-400">{meal.calories} kcal</span>
            <span className="w-px h-3 bg-white/10" />
            <span className="text-xs text-emerald-400">{meal.protein}g P</span>
            <span className="text-xs text-blue-400">{meal.carbs}g C</span>
            <span className="text-xs text-amber-400">{meal.fat}g F</span>
          </div>
        </div>
        <div className="flex items-start gap-3 shrink-0">
          <span className="text-[11px] text-gray-600 mt-0.5">{formatTime(meal.timestamp)}</span>
          {onDelete && (
            <button type="button" onClick={() => onDelete(meal.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 -mr-1 text-gray-600 hover:text-rose-400">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MealLogList({ meals, onDelete }: Props) {
  if (meals.length === 0) return (
    <div className="px-6">
      <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center">
        <p className="text-gray-600 text-sm">No meals logged yet today.</p>
        <p className="text-gray-700 text-xs mt-1">Tap the camera button to snap your first meal.</p>
      </div>
    </div>
  );
  return (
    <div className="px-6 space-y-3">
      {meals.map((meal) => <MealCard key={meal.id} meal={meal} onDelete={onDelete} />)}
    </div>
  );
}
