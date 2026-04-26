'use client';
import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { WorkoutType, DayLog } from '@/lib/types';
import { setWorkout, getLast7Days } from '@/lib/storage';

const WORKOUT_OPTIONS: WorkoutType[] = ['Push', 'Pull', 'Legs', 'Full Body', 'Rest'];
const COLORS: Record<WorkoutType, { pill: string; selector: string; dot: string }> = {
  Push:        { pill: 'bg-orange-500/20 text-orange-300 border-orange-500/30',  selector: 'border-orange-500 bg-orange-500/15 text-white',  dot: 'bg-orange-500' },
  Pull:        { pill: 'bg-blue-500/20 text-blue-300 border-blue-500/30',        selector: 'border-blue-500 bg-blue-500/15 text-white',        dot: 'bg-blue-500' },
  Legs:        { pill: 'bg-purple-500/20 text-purple-300 border-purple-500/30',  selector: 'border-purple-500 bg-purple-500/15 text-white',    dot: 'bg-purple-500' },
  'Full Body': { pill: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', selector: 'border-emerald-500 bg-emerald-500/15 text-white', dot: 'bg-emerald-500' },
  Rest:        { pill: 'bg-gray-500/20 text-gray-400 border-gray-500/30',        selector: 'border-gray-500 bg-gray-500/15 text-white',        dot: 'bg-gray-500' },
};
const EMOJI: Record<WorkoutType, string> = { Push: '🔺', Pull: '🔹', Legs: '🦵', 'Full Body': '⚡', Rest: '😴' };

function pad2(n: number) { return String(n).padStart(2,'0'); }

function WeeklyStrip({ today }: { today: string }) {
  const [days, setDays] = useState<DayLog[]>([]);
  useEffect(() => { setDays(getLast7Days()); }, [today]);
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-none px-6 pb-1">
      {days.map((day) => {
        const parts = day.date.split('-');
        const isToday = day.date === today;
        const c = day.workout ? COLORS[day.workout] : null;
        return (
          <div key={day.date} className={'shrink-0 flex flex-col items-center gap-1.5 rounded-xl px-3 py-2.5 border min-w-[52px] transition-all ' + (isToday ? 'border-white/20 bg-white/8' : 'border-white/5 bg-white/3')}>
            <span className={'text-[10px] font-bold uppercase tracking-wide ' + (isToday ? 'text-white' : 'text-gray-600')}>
              {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
            </span>
            <span className={'text-xs font-semibold tabular-nums ' + (isToday ? 'text-orange-400' : 'text-gray-600')}>
              {parseInt(parts[2])}
            </span>
            <div className="mt-0.5">
              {day.workout ? (
                <div className="flex flex-col items-center gap-1">
                  <div className={'w-2 h-2 rounded-full ' + c!.dot} />
                  <span className="text-[9px] text-gray-500 text-center leading-tight max-w-[44px]">{day.workout}</span>
                </div>
              ) : <div className="w-2 h-2 rounded-full bg-white/10" />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WorkoutSelector({ current, onSelect, onClose }: { current: WorkoutType | null; onSelect: (w: WorkoutType) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end animate-fade-in">
      <div className="w-full bg-[#111] rounded-t-3xl px-6 pt-6 pb-12 animate-slide-up">
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black">Today's Session</h3>
          <button type="button" onClick={onClose} className="p-1 text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          {WORKOUT_OPTIONS.map((w) => {
            const sel = current === w;
            return (
              <button key={w} type="button" onClick={() => onSelect(w)}
                className={'w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all duration-150 active:scale-[0.98] ' + (sel ? COLORS[w].selector : 'border-white/8 bg-white/4 text-gray-300')}>
                <span className="text-2xl">{EMOJI[w]}</span>
                <span className="text-base font-bold">{w}</span>
                {sel && <span className="ml-auto text-xs font-semibold text-gray-400">selected</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface Props { date: string; dayLog: DayLog; onUpdate: () => void; }

export default function WorkoutTracker({ date, dayLog, onUpdate }: Props) {
  const [showSelector, setShowSelector] = useState(false);
  const workout = dayLog.workout;
  const colors = workout ? COLORS[workout] : null;
  const handleSelect = useCallback((w: WorkoutType) => { setWorkout(date, w); setShowSelector(false); onUpdate(); }, [date, onUpdate]);
  return (
    <div>
      <div className="flex items-center justify-between px-6 mb-4">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Today's Workout</h2>
        <button type="button" onClick={() => setShowSelector(true)}
          className={'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all active:scale-95 ' + (workout && colors ? colors.pill : 'border-white/10 bg-white/5 text-gray-500 hover:border-white/20')}>
          {workout ? (<><span>{EMOJI[workout]}</span><span>{workout}</span></>) : <span>+ Set workout</span>}
        </button>
      </div>
      <WeeklyStrip today={date} />
      {showSelector && <WorkoutSelector current={workout} onSelect={handleSelect} onClose={() => setShowSelector(false)} />}
    </div>
  );
}
