import { useEffect, useState } from 'react';
import { subscribeToApiLoading } from '../api/api.js';

export default function GlobalApiLoader() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return subscribeToApiLoading((isLoading) => {
      setLoading(isLoading);
    });
  }, []);

  if (!loading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      {/* Top Animated Progress Bar */}
      <div className="h-1 w-full bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600 animate-pulse shadow-md" />
      
      {/* Floating Top Sync Indicator Badge */}
      <div className="absolute top-3 right-4 bg-ink-900/90 text-white backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-extrabold shadow-xl flex items-center gap-2 border border-white/20 animate-fade-in pointer-events-auto">
        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
        <span className="text-[11px] tracking-wide text-orange-200">Processing Server Request...</span>
      </div>
    </div>
  );
}
