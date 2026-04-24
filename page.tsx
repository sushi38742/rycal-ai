'use client';

// ─────────────────────────────────────────────
// RyCal.AI — First-Launch Setup
// Shown once. After completion, saved to localStorage and never shown again.
// ─────────────────────────────────────────────

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ActivityLevel, Goal, Sex } from '@/lib/types';
import { calculateProfile } from '@/lib/calculations';
import { saveProfile } from '@/lib/storage';
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react';

// ── Types ─────────────────────────────────────

interface FormData {
  weightLbs: string;
  heightFt: string;
  heightIn: string;
  age: string;
  sex: Sex | '';
  activityLevel: ActivityLevel | '';
  goal: Goal | '';
}

const TOTAL_STEPS = 5;

// ── Option components ─────────────────────────

function OptionCard({
  label,
  sublabel,
  selected,
  onClick,
}: {
  label: string;
  sublabel?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-5 py-4 rounded-2xl border transition-all duration-150 active:scale-[0.98] ${
        selected
          ? 'border-orange-500 bg-orange-500/10 text-white'
          : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/25'
      }`}
    >
      <div className="font-semibold text-sm">{label}</div>
      {sublabel && <div className="text-xs text-gray-500 mt-0.5">{sublabel}</div>}
    </button>
  );
}

// ── Main component ────────────────────────────

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({
    weightLbs: '',
    heightFt: '',
    heightIn: '',
    age: '',
    sex: '',
    activityLevel: '',
    goal: '',
  });
  const [error, setError] = useState('');

  // ── Helpers ───────────────────────────────────

  const set = (key: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
  };

  const canAdvance = (): boolean => {
    if (step === 1) return form.weightLbs !== '' && form.heightFt !== '' && Number(form.weightLbs) > 0;
    if (step === 2) return form.age !== '' && Number(form.age) > 0 && Number(form.age) < 120;
    if (step === 3) return form.sex !== '';
    if (step === 4) return form.activityLevel !== '';
    if (step === 5) return form.goal !== '';
    return false;
  };

  const next = () => {
    if (!canAdvance()) {
      setError('Please fill in all fields before continuing.');
      return;
    }
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    } else {
      finish();
    }
  };

  const finish = () => {
    const heightInches =
      parseInt(form.heightFt || '0') * 12 + parseInt(form.heightIn || '0');

    const profile = calculateProfile({
      weight: parseFloat(form.weightLbs),
      height: heightInches,
      age: parseInt(form.age),
      sex: form.sex as Sex,
      activityLevel: form.activityLevel as ActivityLevel,
      goal: form.goal as Goal,
    });

    saveProfile({ ...profile, setupComplete: true });
    router.push('/');
  };

  // ── Progress bar ──────────────────────────────

  const progress = (step / TOTAL_STEPS) * 100;

  // ── Render ────────────────────────────────────

  return (
    <div className="min-h-screen bg-black flex flex-col px-6 py-10 text-white">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center">
          <Flame className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-black tracking-tight">RyCal.AI</span>
      </div>

      {/* Progress */}
      <div className="w-full h-1 bg-white/10 rounded-full mb-8">
        <div
          className="h-1 bg-gradient-to-r from-orange-400 to-rose-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step content */}
      <div className="flex-1">
        {step === 1 && (
          <StepBodyMetrics form={form} set={set} />
        )}
        {step === 2 && (
          <StepAge form={form} set={set} />
        )}
        {step === 3 && (
          <StepSex form={form} set={set} />
        )}
        {step === 4 && (
          <StepActivity form={form} set={set} />
        )}
        {step === 5 && (
          <StepGoal form={form} set={set} />
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-rose-400 text-sm text-center mb-4">{error}</p>
      )}

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <button
          type="button"
          onClick={next}
          className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg shadow-orange-500/20"
        >
          {step === TOTAL_STEPS ? 'Calculate My Targets' : 'Continue'}
          {step < TOTAL_STEPS && <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Step counter */}
      <p className="text-center text-xs text-gray-600 mt-4">
        Step {step} of {TOTAL_STEPS}
      </p>
    </div>
  );
}

// ── Step 1: Body metrics ──────────────────────

function StepBodyMetrics({
  form,
  set,
}: {
  form: FormData;
  set: (k: keyof FormData, v: string) => void;
}) {
  return (
    <div>
      <h1 className="text-3xl font-black mb-1">Your stats</h1>
      <p className="text-gray-500 text-sm mb-8">Used to calculate your calorie target.</p>

      <div className="space-y-5">
        {/* Weight */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
            Weight (lbs)
          </label>
          <input
            type="number"
            inputMode="decimal"
            placeholder="175"
            value={form.weightLbs}
            onChange={(e) => set('weightLbs', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white text-lg font-semibold placeholder:text-gray-600 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>

        {/* Height */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
            Height
          </label>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="number"
                inputMode="numeric"
                placeholder="5"
                value={form.heightFt}
                onChange={(e) => set('heightFt', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white text-lg font-semibold placeholder:text-gray-600 focus:outline-none focus:border-orange-500 transition-colors"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">ft</span>
            </div>
            <div className="flex-1 relative">
              <input
                type="number"
                inputMode="numeric"
                placeholder="10"
                value={form.heightIn}
                onChange={(e) => set('heightIn', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white text-lg font-semibold placeholder:text-gray-600 focus:outline-none focus:border-orange-500 transition-colors"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">in</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Age ───────────────────────────────

function StepAge({
  form,
  set,
}: {
  form: FormData;
  set: (k: keyof FormData, v: string) => void;
}) {
  return (
    <div>
      <h1 className="text-3xl font-black mb-1">How old are you?</h1>
      <p className="text-gray-500 text-sm mb-8">Age affects your metabolic rate.</p>

      <input
        type="number"
        inputMode="numeric"
        placeholder="18"
        value={form.age}
        onChange={(e) => set('age', e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-5 text-white text-4xl font-black text-center placeholder:text-gray-700 focus:outline-none focus:border-orange-500 transition-colors"
      />
    </div>
  );
}

// ── Step 3: Sex ───────────────────────────────

function StepSex({
  form,
  set,
}: {
  form: FormData;
  set: (k: keyof FormData, v: string) => void;
}) {
  return (
    <div>
      <h1 className="text-3xl font-black mb-1">Biological sex</h1>
      <p className="text-gray-500 text-sm mb-8">
        Used only for Mifflin-St Jeor BMR calculation.
      </p>

      <div className="flex gap-4">
        {(['male', 'female'] as Sex[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => set('sex', s)}
            className={`flex-1 py-8 rounded-2xl border text-lg font-bold capitalize transition-all active:scale-[0.97] ${
              form.sex === s
                ? 'border-orange-500 bg-orange-500/10 text-white'
                : 'border-white/10 bg-white/5 text-gray-400'
            }`}
          >
            {s === 'male' ? '♂ Male' : '♀ Female'}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Step 4: Activity ──────────────────────────

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; sublabel: string }[] = [
  { value: 'sedentary',   label: 'Sedentary',   sublabel: 'Desk job, little to no exercise' },
  { value: 'light',       label: 'Light',        sublabel: 'Exercise 1–3 days/week' },
  { value: 'moderate',    label: 'Moderate',     sublabel: 'Exercise 3–5 days/week' },
  { value: 'active',      label: 'Active',       sublabel: 'Hard exercise 6–7 days/week' },
  { value: 'very_active', label: 'Very Active',  sublabel: 'Athlete or physical job + daily training' },
];

function StepActivity({
  form,
  set,
}: {
  form: FormData;
  set: (k: keyof FormData, v: string) => void;
}) {
  return (
    <div>
      <h1 className="text-3xl font-black mb-1">Activity level</h1>
      <p className="text-gray-500 text-sm mb-8">How active are you on a typical week?</p>

      <div className="space-y-3">
        {ACTIVITY_OPTIONS.map((opt) => (
          <OptionCard
            key={opt.value}
            label={opt.label}
            sublabel={opt.sublabel}
            selected={form.activityLevel === opt.value}
            onClick={() => set('activityLevel', opt.value)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Step 5: Goal ──────────────────────────────

const GOAL_OPTIONS: { value: Goal; label: string; sublabel: string; emoji: string }[] = [
  { value: 'cut',      emoji: '🔥', label: 'Cut',      sublabel: 'Lose fat — 500 kcal daily deficit' },
  { value: 'maintain', emoji: '⚖️', label: 'Maintain', sublabel: 'Stay lean — maintenance calories' },
  { value: 'bulk',     emoji: '💪', label: 'Bulk',     sublabel: 'Build muscle — 300 kcal surplus' },
];

function StepGoal({
  form,
  set,
}: {
  form: FormData;
  set: (k: keyof FormData, v: string) => void;
}) {
  return (
    <div>
      <h1 className="text-3xl font-black mb-1">Your goal</h1>
      <p className="text-gray-500 text-sm mb-8">This sets your daily calorie target.</p>

      <div className="space-y-3">
        {GOAL_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => set('goal', opt.value)}
            className={`w-full text-left px-5 py-5 rounded-2xl border transition-all duration-150 active:scale-[0.98] ${
              form.goal === opt.value
                ? 'border-orange-500 bg-orange-500/10 text-white'
                : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/25'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{opt.emoji}</span>
              <div>
                <div className="font-bold">{opt.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{opt.sublabel}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
