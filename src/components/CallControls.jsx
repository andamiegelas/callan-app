import React from 'react';
import { Mic, MicOff, Volume2, VolumeX, Shield, ShieldOff, PhoneOff, Timer, Plus, Bell } from 'lucide-react';

export default function CallControls({
  isMuted,
  onToggleMute,
  isSpeaker,
  onToggleSpeaker,
  isNsActive,
  onToggleNs,
  onEndCall,
  onOpenTimerModal,
  timerState,
  remainingSeconds
}) {
  const formatTimer = (totalSec) => {
    if (totalSec === null || totalSec === undefined || totalSec <= 0) return '00:00';
    const m = Math.floor(totalSec / 60);
    const s = Math.floor(totalSec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const hasActiveTimer = timerState && timerState.endAtMs;

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center gap-4 py-2">
      
      {/* Timer Display Card & Quick Preset Button */}
      <div className="w-full glass-card p-3 rounded-2xl flex items-center justify-between border border-slate-700/80 shadow-lg">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${hasActiveTimer ? 'bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-400/30' : 'bg-slate-800 text-slate-400'}`}>
            <Timer className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              Timer Auto-Cut Off
            </div>
            <div className="text-xl font-extrabold font-mono text-cyan-300">
              {hasActiveTimer ? formatTimer(remainingSeconds) : 'Tidak Ada Timer'}
            </div>
          </div>
        </div>

        <button
          onClick={onOpenTimerModal}
          className="touch-btn-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-2 rounded-2xl shadow-lg shadow-cyan-950/60 active:scale-95 transition-all flex items-center gap-1.5"
          style={{ minHeight: '52px', minWidth: '110px' }}
        >
          <Plus className="w-5 h-5" />
          <span>{hasActiveTimer ? 'Ubah' : 'Set Timer'}</span>
        </button>
      </div>

      {/* Rider Touch Control Grid (Minimum 72dp Touch Targets) */}
      <div className="grid grid-cols-4 gap-3 w-full justify-items-center">
        
        {/* 1. Mute Button */}
        <button
          onClick={onToggleMute}
          className={`touch-btn-lg w-full flex flex-col items-center justify-center p-3 transition-all border ${
            isMuted
              ? 'bg-rose-600/90 text-white border-rose-400 glow-rose'
              : 'glass-button text-slate-200 hover:text-white border-slate-700/80 hover:border-slate-500'
          }`}
          title={isMuted ? 'Mikrofon Mati (Mute)' : 'Mikrofon Aktif'}
        >
          {isMuted ? <MicOff className="w-7 h-7 mb-1 text-white" /> : <Mic className="w-7 h-7 mb-1 text-cyan-400" />}
          <span className="text-[10px] uppercase font-bold tracking-wider">
            {isMuted ? 'Muted' : 'Mic'}
          </span>
        </button>

        {/* 2. Speaker Button */}
        <button
          onClick={onToggleSpeaker}
          className={`touch-btn-lg w-full flex flex-col items-center justify-center p-3 transition-all border ${
            isSpeaker
              ? 'bg-cyan-600/90 text-white border-cyan-400 glow-cyan'
              : 'glass-button text-slate-200 hover:text-white border-slate-700/80 hover:border-slate-500'
          }`}
          title={isSpeaker ? 'Loudspeaker (Speaker)' : 'Earpiece / Bluetooth'}
        >
          {isSpeaker ? <Volume2 className="w-7 h-7 mb-1 text-white" /> : <VolumeX className="w-7 h-7 mb-1 text-slate-400" />}
          <span className="text-[10px] uppercase font-bold tracking-wider">
            {isSpeaker ? 'Speaker' : 'Normal'}
          </span>
        </button>

        {/* 3. Noise Suppression Toggle */}
        <button
          onClick={onToggleNs}
          className={`touch-btn-lg w-full flex flex-col items-center justify-center p-3 transition-all border ${
            isNsActive
              ? 'bg-emerald-600/90 text-white border-emerald-400 glow-emerald'
              : 'glass-button text-slate-400 border-slate-700/80 hover:border-slate-500'
          }`}
          title={isNsActive ? 'Noise Suppression Aktif (Membersihkan Angin & Motor)' : 'Noise Suppression Mati'}
        >
          {isNsActive ? <Shield className="w-7 h-7 mb-1 text-white" /> : <ShieldOff className="w-7 h-7 mb-1 text-slate-400" />}
          <span className="text-[10px] uppercase font-bold tracking-wider">
            {isNsActive ? 'NS On' : 'NS Off'}
          </span>
        </button>

        {/* 4. End Call Button */}
        <button
          onClick={onEndCall}
          className="touch-btn-lg w-full bg-gradient-to-tr from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white border border-red-400/40 glow-rose flex flex-col items-center justify-center p-3 active:scale-95 transition-all shadow-xl"
          title="Tutup Panggilan"
        >
          <PhoneOff className="w-7 h-7 mb-1" />
          <span className="text-[10px] uppercase font-bold tracking-wider">Tutup</span>
        </button>

      </div>
    </div>
  );
}
