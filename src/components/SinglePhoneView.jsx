import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneIncoming, PhoneOff, Mic, MicOff, Volume2, Shield, Timer, Copy, Check, Users, Sparkles, Edit2 } from 'lucide-react';
import AudioWaveform from './AudioWaveform';
import CallControls from './CallControls';
import TimerWarningBanner from './TimerWarningBanner';
import CallHistory from './CallHistory';

export default function SinglePhoneView({
  phoneLabel,
  peerId,
  callState,
  incomingCallerId,
  activeTargetId,
  isMuted,
  isSpeaker,
  isNsActive,
  dspPipeline,
  remoteAudioRef,
  timerState,
  remainingSeconds,
  callDurationSec,
  callHistory,
  onStartCall,
  onAnswerCall,
  onRejectCall,
  onEndCall,
  onToggleMute,
  onToggleSpeaker,
  onToggleNs,
  onOpenTimerModal,
  onExtendTimer,
  onCancelTimer,
  onOpenChangeId
}) {
  const [targetInputId, setTargetInputId] = useState('');

  // Auto-fill target peer ID if URL query param has ?peer=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const peerQuery = params.get('peer');
    if (peerQuery && peerQuery !== peerId) {
      setTargetInputId(peerQuery);
    }
  }, [peerId]);

  const handleCallSubmit = (e) => {
    e.preventDefault();
    const cleanTarget = targetInputId.trim().toLowerCase();
    if (cleanTarget) {
      onStartCall(cleanTarget);
    }
  };

  const formatCallDuration = (totalSec) => {
    const m = Math.floor(totalSec / 60);
    const s = Math.floor(totalSec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const [copiedBadge, setCopiedBadge] = useState(false);

  const handleCopyBadge = () => {
    if (!peerId) return;
    navigator.clipboard.writeText(peerId);
    setCopiedBadge(true);
    setTimeout(() => setCopiedBadge(false), 2000);
  };

  return (
    <div className="w-full max-w-md mx-auto glass-panel rounded-[36px] overflow-hidden border border-slate-800 shadow-2xl flex flex-col relative min-h-[640px]">
      
      {/* Hidden HTML5 Audio element for remote WebRTC stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Top Phone Bar Header */}
      <div className="bg-slate-900/90 px-5 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-bold text-slate-200 tracking-wide">{phoneLabel}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopyBadge}
            className="text-[11px] font-mono text-cyan-400 font-semibold bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 hover:border-cyan-500/50 transition-all flex items-center gap-1.5 active:scale-95"
            title="Klik untuk menyalin ID kamu"
          >
            <span>{peerId ? `ID: ${peerId}` : 'Menghubungkan...'}</span>
            {copiedBadge ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <Copy className="w-3 h-3 text-slate-400 shrink-0" />
            )}
          </button>
          {onOpenChangeId && (
            <button
              onClick={onOpenChangeId}
              className="p-1 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 rounded-lg border border-slate-800 transition-colors"
              title="Ubah ID Telepon"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        
        {/* 1. IDLE / DIALER STATE */}
        {callState === 'IDLE' && (
          <div className="flex-1 flex flex-col justify-center items-center py-4">
            
            {/* User Avatar Circle */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-900 to-blue-900 border-2 border-cyan-500/40 flex items-center justify-center mb-6 shadow-xl relative">
              <Phone className="w-10 h-10 text-cyan-400" />
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 p-1.5 rounded-full text-slate-950" title="Online P2P">
                <Sparkles className="w-3.5 h-3.5 fill-current" />
              </div>
            </div>

            <h2 className="text-xl font-extrabold text-white mb-1">Telepon VoIP P2P</h2>
            <p className="text-xs text-slate-400 mb-6 text-center max-w-xs">
              Masukkan ID HP lawan bicara atau bagikan ID kamu di atas untuk mulai telepon.
            </p>

            {/* Dialer Input Form */}
            <form onSubmit={handleCallSubmit} className="w-full space-y-3 mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Masukkan ID Pasangan / Teman..."
                  value={targetInputId}
                  onChange={(e) => setTargetInputId(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  className="w-full bg-slate-900/90 text-slate-100 text-sm font-mono font-semibold px-4 py-3.5 rounded-2xl border border-slate-700/80 focus:outline-none focus:border-cyan-400 placeholder:text-slate-500 shadow-inner"
                />
              </div>

              <button
                type="submit"
                disabled={!targetInputId.trim() || !peerId}
                className="w-full touch-btn-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-extrabold rounded-2xl shadow-lg shadow-cyan-950/60 active:scale-95 transition-all text-base flex items-center justify-center gap-2"
                style={{ minHeight: '60px' }}
              >
                <Phone className="w-5 h-5 fill-current" />
                <span>Panggil Sekarang</span>
              </button>
            </form>

            {/* Recent History */}
            <CallHistory history={callHistory} />
          </div>
        )}

        {/* 2. CALLING STATE (Outgoing) */}
        {callState === 'CALLING' && (
          <div className="flex-1 flex flex-col justify-center items-center py-6 text-center">
            <div className="relative mb-6">
              <div className="w-28 h-28 rounded-full bg-cyan-950/80 border-2 border-cyan-400/50 flex items-center justify-center ring-pulse-bg">
                <Phone className="w-12 h-12 text-cyan-400 animate-bounce" />
              </div>
            </div>

            <div className="text-xs font-semibold uppercase tracking-widest text-cyan-400 mb-1">
              Memanggil...
            </div>
            <h3 className="text-2xl font-extrabold text-white mb-1 font-mono">
              {activeTargetId}
            </h3>
            <p className="text-xs text-slate-400 mb-8">Menunggu lawan bicara mengangkat...</p>

            <button
              onClick={onEndCall}
              className="touch-btn-lg bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-2xl p-4 shadow-xl glow-rose active:scale-95 transition-all flex items-center justify-center gap-2"
              style={{ minHeight: '64px', width: '100%', maxWidth: '240px' }}
            >
              <PhoneOff className="w-6 h-6" />
              <span>Batalkan</span>
            </button>
          </div>
        )}

        {/* 3. RINGING STATE (Incoming) */}
        {callState === 'RINGING' && (
          <div className="flex-1 flex flex-col justify-center items-center py-6 text-center">
            <div className="relative mb-6">
              <div className="w-28 h-28 rounded-full bg-emerald-950/80 border-2 border-emerald-400/50 flex items-center justify-center ring-pulse-bg">
                <PhoneIncoming className="w-12 h-12 text-emerald-400 animate-bounce" />
              </div>
            </div>

            <div className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-1">
              Panggilan Masuk!
            </div>
            <h3 className="text-2xl font-extrabold text-white mb-2 font-mono">
              {incomingCallerId}
            </h3>
            <p className="text-xs text-slate-400 mb-8">Menghubungkan VoIP P2P...</p>

            {/* Answer / Reject Big Buttons (Rider target >= 72dp) */}
            <div className="grid grid-cols-2 gap-4 w-full">
              <button
                onClick={onRejectCall}
                className="touch-btn-lg bg-rose-600 hover:bg-rose-500 text-white font-extrabold rounded-2xl shadow-xl glow-rose active:scale-95 transition-all flex items-center justify-center gap-2"
                style={{ minHeight: '72px' }}
              >
                <PhoneOff className="w-6 h-6" />
                <span>Tolak</span>
              </button>

              <button
                onClick={onAnswerCall}
                className="touch-btn-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-2xl shadow-xl glow-emerald active:scale-95 transition-all flex items-center justify-center gap-2"
                style={{ minHeight: '72px' }}
              >
                <Phone className="w-6 h-6 fill-current" />
                <span>Jawab</span>
              </button>
            </div>
          </div>
        )}

        {/* 4. ACTIVE CONNECTED CALL STATE */}
        {callState === 'CONNECTED' && (
          <div className="flex-1 flex flex-col justify-between py-2">
            
            {/* Active Header & Timer */}
            <div className="text-center my-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 text-xs font-semibold mb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Panggilan Tersambung P2P</span>
              </div>

              <h3 className="text-xl font-bold text-white font-mono truncate">
                {activeTargetId}
              </h3>
              
              <div className="text-3xl font-extrabold font-mono text-cyan-300 mt-1">
                {formatCallDuration(callDurationSec)}
              </div>
            </div>

            {/* Waveform Canvas */}
            <AudioWaveform 
              dspPipeline={dspPipeline} 
              isActive={true} 
              isNsActive={isNsActive} 
            />

            {/* T-60s Timer Warning Banner */}
            <TimerWarningBanner
              remainingSeconds={remainingSeconds}
              onExtendTimer={onExtendTimer}
              onCancelTimer={onCancelTimer}
            />

            {/* Rider Controls Grid */}
            <CallControls
              isMuted={isMuted}
              onToggleMute={onToggleMute}
              isSpeaker={isSpeaker}
              onToggleSpeaker={onToggleSpeaker}
              isNsActive={isNsActive}
              onToggleNs={onToggleNs}
              onEndCall={onEndCall}
              onOpenTimerModal={onOpenTimerModal}
              timerState={timerState}
              remainingSeconds={remainingSeconds}
            />

          </div>
        )}

        {/* 5. ENDED STATE */}
        {callState === 'ENDED' && (
          <div className="flex-1 flex flex-col justify-center items-center py-6 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center mb-4">
              <PhoneOff className="w-8 h-8 text-slate-400" />
            </div>

            <h3 className="text-xl font-extrabold text-white mb-1">Panggilan Berakhir</h3>
            <p className="text-xs text-slate-400 mb-6">
              Telepon ditutup. Durasi: {formatCallDuration(callDurationSec)}
            </p>

            <button
              onClick={onEndCall} // Resets state to IDLE
              className="py-3 px-6 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl text-sm border border-slate-700 transition-colors"
            >
              Kembali ke Menu Utama
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
