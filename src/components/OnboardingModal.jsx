import React from 'react';
import { ShieldCheck, Wind, Headphones, Battery, Timer, Check, X } from 'lucide-react';

export default function OnboardingModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel p-6 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-cyan-500/30 shadow-2xl animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Panduan Aplikasi Callan</h3>
              <p className="text-xs text-slate-400">VoIP Motor & Sleep Call P2P</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feature Highlights */}
        <div className="space-y-4 mb-6">
          
          {/* 1. Synced Timer */}
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="p-2 rounded-xl bg-cyan-950 text-cyan-400 shrink-0">
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-cyan-300">Timer Auto-Cut Off Tersinkron</h4>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                Pengatur atau lawan bicara dapat menentukan jam/durasi telepon mati. Timer secara otomatis tersinkron ke kedua HP dalam &lt; 1 detik dan menutup telepon bersamaan.
              </p>
            </div>
          </div>

          {/* 2. Noise Suppression */}
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="p-2 rounded-xl bg-emerald-950 text-emerald-400 shrink-0">
              <Wind className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-300">Active Noise Suppression (Motor & Wind)</h4>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                Filter DSP internal menghapus gemuruh angin dan suara mesin motor di bawah 130 Hz sehingga suara pembicara tetap terdengar jernih di earphone/intercom helm.
              </p>
            </div>
          </div>

          {/* 3. Rider Hands-free */}
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="p-2 rounded-xl bg-sky-950 text-sky-400 shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-sky-300">Hands-Free & Tombol Kontras Tinggi</h4>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                Tombol kontrol berukuran besar (72dp) didesain agar mudah ditekan saat HP di holder motor atau saat memakai sarung tangan.
              </p>
            </div>
          </div>

          {/* 4. Battery Optimizer Advice */}
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-950/40 border border-amber-800/50">
            <div className="p-2 rounded-xl bg-amber-900/50 text-amber-400 shrink-0">
              <Battery className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-300">Tips Hemat Baterai & Latar Belakang</h4>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                Di HP Xiaomi, Oppo, Vivo, & Samsung: Aktifkan izin "Autostart" dan atur Penghemat Baterai menjadi "Tanpa Pembatasan" agar panggilan masuk dapat berdering saat HP terkunci.
              </p>
            </div>
          </div>

        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-cyan-950/60 active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          <span>Saya Mengerti & Siap Menggunakan</span>
        </button>

      </div>
    </div>
  );
}
