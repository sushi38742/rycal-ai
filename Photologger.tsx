'use client';

// ─────────────────────────────────────────────
// RyCal.AI — Photo Logger
//
// Flow:
//   Capture → Analyzing → Confirmation (with source breakdown) → Logged
//
// On confirmation screen every macro line shows exactly where
// the number came from. User can retake to send a second photo.
// ─────────────────────────────────────────────

import { useState, useRef, useCallback } from 'react';
import { X, RotateCcw, Check, AlertCircle, Loader2 } from 'lucide-react';
import { FoodAnalysisResult } from '@/lib/types';
import { addMeal } from '@/lib/storage';

type Stage = 'capture' | 'analyzing' | 'confirm' | 'error';

interface Props {
  onClose: () => void;
  onMealLogged: () => void;
}

// ── Image compression ─────────────────────────

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1024;
      let { width, height } = img;
      if (width > height && width > MAX) {
        height = Math.round((height * MAX) / width);
        width = MAX;
      } else if (height > MAX) {
        width = Math.round((width * MAX) / height);
        height = MAX;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ── Confidence badge ──────────────────────────

function ConfidenceBadge({ confidence }: { confidence: 'high' | 'medium' | 'low' }) {
  const map = {
    high:   { label: 'High confidence', class: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
    medium: { label: 'Medium confidence', class: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
    low:    { label: 'Low confidence', class: 'bg-rose-500/15 text-rose-400 border-rose-500/20' },
  };
  const { label, class: cls } = map[confidence];
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${cls}`}>{label}</span>
  );
}

// ── Source row for confirmation screen ────────

function SourceRow({
  emoji,
  label,
  value,
  unit,
  source,
  color,
}: {
  emoji: string;
  label: string;
  value: number;
  unit: string;
  source: string;
  color: string;
}) {
  return (
    <div className="py-3 border-b border-white/5 last:border-0">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-base">{emoji}</span>
          <span className="text-sm font-semibold text-white">{label}</span>
        </div>
        <span className={`text-base font-black tabular-nums ${color}`}>
          {value}
          <span className="text-xs font-normal text-gray-500 ml-0.5">{unit}</span>
        </span>
      </div>
      <p className="text-[11px] text-gray-500 leading-snug pl-7">{source}</p>
    </div>
  );
}

// ── Confirmation sheet ────────────────────────

function ConfirmationSheet({
  result,
  photos,
  onConfirm,
  onRetake,
}: {
  result: FoodAnalysisResult;
  photos: string[];
  onConfirm: () => void;
  onRetake: () => void;
}) {
  return (
    <div className="absolute inset-0 flex flex-col animate-fade-in">
      {/* Photo header */}
      <div className="relative h-52 shrink-0">
        <img
          src={photos[photos.length - 1]}
          alt="Food preview"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black" />

        {/* Second photo indicator */}
        {photos.length === 2 && (
          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-lg">
            <span className="text-[11px] text-white font-semibold">2 photos used</span>
          </div>
        )}
      </div>

      {/* Scrollable results pane */}
      <div className="flex-1 overflow-y-auto bg-[#0c0c0c] rounded-t-3xl -mt-4 relative">
        <div className="px-6 pt-6 pb-32">
          {/* Food name + confidence */}
          <div className="mb-1 flex items-start justify-between gap-2">
            <h2 className="text-xl font-black text-white leading-tight">
              {result.foodName}
            </h2>
            <ConfidenceBadge confidence={result.confidence} />
          </div>

          {/* Serving description */}
          {result.servingDescription && (
            <p className="text-sm text-gray-500 mb-5">{result.servingDescription}</p>
          )}

          {/* Notes */}
          {result.notes && (
            <div className="flex items-start gap-2 mb-5 p-3 rounded-xl bg-amber-500/8 border border-amber-500/15">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300 leading-snug">{result.notes}</p>
            </div>
          )}

          {/* Source breakdown — the main event */}
          <div className="mb-6">
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3">
              Source Breakdown
            </p>
            <div className="bg-white/4 rounded-2xl px-4 border border-white/5">
              <SourceRow
                emoji="🔥"
                label="Calories"
                value={result.calories}
                unit="kcal"
                source={result.sources.calories}
                color="text-orange-400"
              />
              <SourceRow
                emoji="💪"
                label="Protein"
                value={result.protein}
                unit="g"
                source={result.sources.protein}
                color="text-emerald-400"
              />
              <SourceRow
                emoji="🌾"
                label="Carbs"
                value={result.carbs}
                unit="g"
                source={result.sources.carbs}
                color="text-blue-400"
              />
              <SourceRow
                emoji="🥑"
                label="Fat"
                value={result.fat}
                unit="g"
                source={result.sources.fat}
                color="text-amber-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sticky action buttons */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0c0c0c] via-[#0c0c0c] to-transparent px-6 pb-10 pt-8">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onRetake}
            className="flex-1 h-13 rounded-2xl border border-white/15 flex items-center justify-center gap-2 text-sm font-semibold text-gray-300 active:scale-[0.97] transition-transform"
          >
            <RotateCcw className="w-4 h-4" />
            {photos.length === 1 ? 'Retake' : 'New Photo'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-[2] h-13 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-orange-500/25 active:scale-[0.97] transition-transform"
          >
            <Check className="w-4 h-4" />
            Log This Meal
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main PhotoLogger ──────────────────────────

export default function PhotoLogger({ onClose, onMealLogged }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('capture');
  const [photos, setPhotos] = useState<string[]>([]);   // base64 data URLs
  const [result, setResult] = useState<FoodAnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Trigger the file input (camera on mobile)
  const triggerCamera = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Reset input so the same file can be selected again if needed
      e.target.value = '';

      setStage('analyzing');

      try {
        const compressed = await compressImage(file);
        const allPhotos = [...photos, compressed];
        setPhotos(allPhotos);

        const response = await fetch('/api/analyze-food', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: allPhotos }),
        });

        const data = await response.json() as { success: boolean; result?: FoodAnalysisResult; error?: string };

        if (!data.success || !data.result) {
          throw new Error(data.error ?? 'Analysis failed');
        }

        setResult(data.result);
        setStage('confirm');
      } catch (err) {
        console.error(err);
        setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Try again.');
        setStage('error');
      }
    },
    [photos]
  );

  const handleConfirm = useCallback(() => {
    if (!result) return;

    addMeal({
      id: crypto.randomUUID(),
      name: result.foodName,
      brand: result.brand,
      servingDescription: result.servingDescription,
      calories: result.calories,
      protein: result.protein,
      carbs: result.carbs,
      fat: result.fat,
      timestamp: Date.now(),
      sourceType: result.confidence === 'high' ? 'database' : 'estimate',
      sources: result.sources,
      photoDataUrl: photos[0],
    });

    onMealLogged();
  }, [result, photos, onMealLogged]);

  const handleRetake = useCallback(() => {
    // Keep existing photos — next shot will be appended and both sent together
    setStage('capture');
    setResult(null);
  }, []);

  const handleReset = useCallback(() => {
    setStage('capture');
    setPhotos([]);
    setResult(null);
    setErrorMsg('');
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col animate-fade-in">
      {/* Hidden file input — opens camera on mobile */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── Stage: Capture ── */}
      {stage === 'capture' && (
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-12 right-6 p-2 rounded-full bg-white/10 text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center mb-12">
            <h2 className="text-2xl font-black mb-2">
              {photos.length > 0 ? 'Take another photo' : 'Snap your food'}
            </h2>
            <p className="text-sm text-gray-500">
              {photos.length > 0
                ? 'Send a second angle — both photos will be analyzed together.'
                : 'Point at your plate, Gemini AI does the rest.'}
            </p>
          </div>

          {/* Big camera trigger */}
          <button
            type="button"
            onClick={triggerCamera}
            className="relative group focus:outline-none"
          >
            <span className="absolute inset-0 rounded-full bg-orange-500/25 animate-ping [animation-duration:2s]" />
            <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-orange-400 via-orange-500 to-rose-600 flex items-center justify-center shadow-2xl shadow-orange-500/40 group-active:scale-95 transition-transform duration-150">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-14 h-14"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
          </button>

          <p className="mt-6 text-sm text-gray-500">Tap to open camera</p>
          <p className="text-xs text-gray-700 mt-1">Or select from your photo library</p>
        </div>
      )}

      {/* ── Stage: Analyzing ── */}
      {stage === 'analyzing' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <Loader2 className="w-12 h-12 text-orange-400 animate-spin" />
          <div className="text-center">
            <p className="text-lg font-bold">Analyzing your food…</p>
            <p className="text-sm text-gray-500 mt-1">Gemini AI is reading your plate</p>
          </div>
        </div>
      )}

      {/* ── Stage: Confirm ── */}
      {stage === 'confirm' && result && (
        <ConfirmationSheet
          result={result}
          photos={photos}
          onConfirm={handleConfirm}
          onRetake={handleRetake}
        />
      )}

      {/* ── Stage: Error ── */}
      {stage === 'error' && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-6">
          <AlertCircle className="w-12 h-12 text-rose-400" />
          <div className="text-center">
            <p className="text-lg font-bold mb-2">Couldn't analyze photo</p>
            <p className="text-sm text-gray-500">{errorMsg}</p>
          </div>
          <div className="flex gap-3 w-full max-w-sm">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 rounded-2xl border border-white/15 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 h-12 rounded-2xl bg-orange-500 text-sm font-bold"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Close button for non-capture stages */}
      {stage !== 'capture' && stage !== 'confirm' && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-12 right-6 p-2 rounded-full bg-white/10 text-gray-300"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Close on confirmation screen */}
      {stage === 'confirm' && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-12 right-6 p-2 rounded-full bg-black/60 backdrop-blur-sm text-gray-300 z-10"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
