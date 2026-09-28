import React, { useState } from 'react';
import { PhoneCall, Copy, Check, QrCode, Shield, HelpCircle, Smartphone, Users, Edit2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function Header({ 
  peerId, 
  onShowOnboarding, 
  isDualMode, 
  onToggleDualMode,
  isConnected,
  onCopyNotification,
  onOpenChangeId
}) {
  const [copiedId, setCopiedId] = useState(false);
  const [showQr, setShowQr] = useState(false);

  // Copy pure Peer ID (no localhost URL)
  const handleCopyId = () => {
    if (!peerId) return;
    navigator.clipboard.writeText(peerId);
    setCopiedId(true);
    if (onCopyNotification) {
      onCopyNotification(`ID disalin: ${peerId}`);
    }
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <header className="glass-panel sticky top-0 z-30 px-4 py-3 border-b border-slate-800/80">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        
        {/* App Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-950/50 ring-1 ring-cyan-400/30">
            <PhoneCall className="w-5.5 h-5.5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400">
                CALLAN
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-cyan-950/80 text-cyan-400 border border-cyan-800/50 rounded-full uppercase tracking-widest">
                P2P VoIP
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Motorcycle & Sleep Call • Timer Sync
            </p>
          </div>
        </div>

        {/* Controls & Peer Share */}
        <div className="flex items-center gap-2">
          {/* Dual Simulator Mode Toggle */}
          <button
            onClick={onToggleDualMode}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              isDualMode 
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm' 
                : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
            }`}
            title="Toggle Dual Phone Simulator (Test 2 Users in 1 Tab)"
          >
            {isDualMode ? <Users className="w-4 h-4 text-cyan-400" /> : <Smartphone className="w-4 h-4" />}
            <span>{isDualMode ? 'Mode Simulator Dual HP' : 'Simulasi 2 HP'}</span>
          </button>

          {/* Peer ID Share Button - Pure ID Copy & Edit */}
          {peerId && (
            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-xl p-1 shadow-sm">
              <button
                onClick={handleCopyId}
                className="px-2.5 py-1 text-xs font-mono font-semibold text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors max-w-[130px] truncate flex items-center gap-1.5"
                title="Klik untuk menyalin ID"
              >
                <span>ID: {peerId}</span>
                {copiedId ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-cyan-400 shrink-0" />
                )}
              </button>
              <button
                onClick={onOpenChangeId}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-cyan-400 transition-colors"
                title="Ubah ID Telepon Sendiri"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowQr(!showQr)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-cyan-400 transition-colors"
                title="Tampilkan Kode QR ID"
              >
                <QrCode className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Guide / Onboarding */}
          <button
            onClick={onShowOnboarding}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 border border-slate-700/60 rounded-xl transition-all"
            title="Panduan Berkendara & Fitur"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* QR Code Modal Overlay */}
      {showQr && peerId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl max-w-sm w-full text-center border border-cyan-500/30 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-3">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Kode QR ID Callan</h3>
            <p className="text-xs text-slate-400 mb-4">
              Pindai atau salin ID ini untuk langsung terhubung.
            </p>
            
            <div className="bg-white p-4 rounded-2xl inline-block mb-4 shadow-lg">
              <QRCodeSVG 
                value={peerId} 
                size={180}
              />
            </div>

            <div className="text-sm font-mono font-bold text-cyan-300 bg-slate-900/90 p-3 rounded-2xl mb-4 border border-slate-800 flex items-center justify-between">
              <span className="truncate max-w-[140px]">{peerId}</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => { setShowQr(false); onOpenChangeId?.(); }}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors flex items-center gap-1 text-xs"
                  title="Ubah ID"
                >
                  <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Ubah</span>
                </button>
                <button
                  onClick={handleCopyId}
                  className="p-1.5 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 rounded-lg border border-cyan-800 transition-colors flex items-center gap-1 text-xs"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowQr(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-sm border border-slate-700 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
