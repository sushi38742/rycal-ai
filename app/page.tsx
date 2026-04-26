'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProfile } from '@/lib/storage';
import Dashboard from '@/components/Dashboard';
import { Flame } from 'lucide-react';

export default function RootPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const profile = getProfile();
    if (!profile || !profile.setupComplete) { router.replace('/setup'); }
    else { setReady(true); }
  }, [router]);

  if (!ready) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center shadow-2xl shadow-orange-500/30">
          <Flame className="w-7 h-7 text-white" />
        </div>
        <p className="text-gray-700 text-sm">Loading…</p>
      </div>
    </div>
  );
  return <Dashboard />;
}
