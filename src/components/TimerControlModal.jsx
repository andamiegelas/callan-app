import React, { useState } from 'react';
import { Timer, Clock, X, Check, RefreshCw, AlertCircle, Plus } from 'lucide-react';

export default function TimerControlModal({ 
  isOpen, 
  onClose, 
  onSetTimer, 
  onCancelTimer, 
  currentEndAtMs 
}) {
  const [selectedPreset, setSelectedPreset] = useState(30); // default 30 mins
  const [customClockTime, setCustomClockTime] = useState('22:00');
  const [mode, setMode] = useState('duration'); // 'duration' | 'clock'

  if (!isOpen) return null;

  const handleApplyPreset = (minutes) => {
    onSetTimer({
      mode: 'duration',
      durationMinutes: minutes
    });
    onClose();
  };

  const handleApplyClockTime = () => {
    if (!customClockTime) return;
    onSetTimer({
      mode: 'clock',
      clockTime: customClockTime
    });
    onClose();
  };

  const handleQuickExtend = (minutes) => {
    onSetTimer({
      mode: 'extend',
      extensionMinutes: minutes
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel p-6 rounded-3xl max-w-md w-full border border-cyan-500/30 shadow-2xl animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Timer className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Timer Auto-Cut Off</h3>
              <p className="text-xs text-slate-400">Sinkronisasi P2P Real-Time</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Info Banner */}
        <div className="bg-cyan-950/60 border border-cyan-800/60 rounded-2xl p-3 mb-5 flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <p className="text-xs text-cyan-200 leading-relaxed">
            Timer yang kamu atur akan otomatis tersinkron ke HP lawan bicara dalam &lt; 1 detik.
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex bg-slate-900/90 p-1 rounded-2xl mb-5 border border-slate-800">
          <button
            onClick={() => setMode('duration')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'duration' 
                ? 'bg-cyan-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Durasi (Menit)
          </button>
          <button
            onClick={() => setMode('clock')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'clock' 
                ? 'bg-cyan-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sampai Jam Berapa
          </button>
        </div>

        {/* Duration Presets Tab */}
        {mode === 'duration' ? (
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-2 block uppercase tracking-wider">
              Pilih Durasi Panggilan:
            </label>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[15, 30, 45, 60, 90, 120].map((mins) => (
                <button
                  key={mins}
                  onClick={() => handleApplyPreset(mins)}
                  className="touch-btn-lg bg-slate-800/90 hover:bg-cyan-600/30 text-slate-100 hover:text-cyan-300 font-extrabold rounded-2xl border border-slate-700/80 hover:border-cyan-500/50 transition-all flex flex-col items-center justify-center p-3"
                  style={{ minHeight: '64px' }}
                >
                  <span className="text-lg font-mono text-cyan-400">{mins}</span>
                  <span className="text-[11px] font-normal text-slate-400">Menit</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Specific Clock Time Input Tab */
          <div className="mb-5">
            <label className="text-xs font-semibold text-slate-300 mb-2 block uppercase tracking-wider">
              Atur Jam Mati Panggilan:
            </label>
            <div className="flex items-center gap-3 bg-slate-900 border border-slate-700 rounded-2xl p-3 mb-4">
              <Clock className="w-6 h-6 text-cyan-400" />
              <input
                type="time"
                value={customClockTime}
                onChange={(e) => setCustomClockTime(e.target.value)}
                className="bg-transparent text-2xl font-mono font-bold text-cyan-300 focus:outline-none w-full"
              />
            </div>
            <button
              onClick={handleApplyClockTime}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-2xl shadow-lg shadow-cyan-950/60 active:scale-95 transition-all text-sm"
            >
              Terapkan Jam Mati
            </button>
          </div>
        )}

        {/* Quick Extend Buttons if Timer Already Active */}
        {currentEndAtMs && (
          <div className="pt-4 border-t border-slate-800">
            <label className="text-[11px] font-semibold text-slate-400 mb-2 block uppercase tracking-wider">
              Perpanjang Timer yang Sedang Berjalan:
            </label>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[5, 15, 30].map((ext) => (
                <button
                  key={ext}
                  onClick={() => handleQuickExtend(ext)}
                  className="py-2.5 bg-slate-800/80 hover:bg-emerald-600/30 text-emerald-300 font-bold rounded-xl border border-slate-700 hover:border-emerald-500/50 transition-all text-xs flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+{ext} Min</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                onCancelTimer();
                onClose();
              }}
              className="w-full py-2.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 font-semibold rounded-xl border border-rose-800/60 text-xs transition-colors"
            >
              Batalkan Timer Panggilan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
