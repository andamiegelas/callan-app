import React from 'react';
import { AlertTriangle, Plus, XCircle } from 'lucide-react';

export default function TimerWarningBanner({ 
  remainingSeconds, 
  onExtendTimer, 
  onCancelTimer 
}) {
  if (remainingSeconds === null || remainingSeconds > 60 || remainingSeconds <= 0) {
    return null;
  }

  return (
    <div className="w-full max-w-md mx-auto mb-3 animate-in slide-in-from-top duration-300">
      <div className="glass-panel p-4 rounded-3xl border border-amber-500/50 bg-gradient-to-r from-amber-950/80 via-slate-900/90 to-amber-950/80 shadow-2xl glow-amber">
        
        {/* Header Alert */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 animate-bounce">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-amber-300 uppercase tracking-wide">
                Panggilan Berakhir dalam {remainingSeconds} Detik!
              </h4>
              <p className="text-[11px] text-slate-300">
                Timer tersinkronisasi akan otomatis menutup telepon ini.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Action Extension Buttons */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => onExtendTimer(5)}
            className="py-2.5 bg-emerald-600/90 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+5 Min</span>
          </button>
          
          <button
            onClick={() => onExtendTimer(15)}
            className="py-2.5 bg-emerald-600/90 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+15 Min</span>
          </button>

          <button
            onClick={() => onExtendTimer(30)}
            className="py-2.5 bg-emerald-600/90 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+30 Min</span>
          </button>

          <button
            onClick={onCancelTimer}
            className="py-2.5 bg-rose-900/80 hover:bg-rose-800 text-rose-200 font-bold text-xs rounded-xl border border-rose-700/60 active:scale-95 transition-all flex items-center justify-center gap-1"
            title="Batalkan Timer"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Batal</span>
          </button>
        </div>
      </div>
    </div>
  );
}
