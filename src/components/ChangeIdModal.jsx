import React, { useState } from 'react';
import { User, Check, X, Sparkles, AlertCircle, Edit3, Server, Globe } from 'lucide-react';
import { peerService } from '../services/peerService';

export default function ChangeIdModal({ isOpen, onClose, currentId, onUpdateId, onUpdateServer }) {
  const [newIdInput, setNewIdInput] = useState(currentId || '');
  const [serverHostInput, setServerHostInput] = useState(() => peerService.getServerHost() || '');
  const [error, setError] = useState('');
  const [showServerSection, setShowServerSection] = useState(false);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const sanitized = e.target.value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]/g, '')
      .slice(0, 24);
    
    setNewIdInput(sanitized);
    if (error) setError('');
  };

  const handleServerChange = (e) => {
    const clean = e.target.value
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/.*$/, '');
    setServerHostInput(clean);
  };

  const handleGenerateRandom = () => {
    const prefixes = ['rider', 'biker', 'callan', 'echo', 'speed', 'turbo', 'moto'];
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const randomId = `${prefixes[Math.floor(Math.random() * prefixes.length)]}-${randomNum}`;
    setNewIdInput(randomId);
    if (error) setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanId = newIdInput.trim();

    if (!cleanId) {
      setError('ID tidak boleh kosong.');
      return;
    }

    if (cleanId.length < 3) {
      setError('ID minimal 3 karakter.');
      return;
    }

    // Update Server Host
    if (onUpdateServer) {
      onUpdateServer(serverHostInput.trim() || null);
    } else {
      peerService.setServerHost(serverHostInput.trim() || null);
    }

    // Update ID
    if (onUpdateId) {
      onUpdateId(cleanId);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel p-6 rounded-3xl max-w-sm w-full border border-cyan-500/30 shadow-2xl animate-in fade-in zoom-in duration-200">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Pengaturan Profil & Server</h3>
              <p className="text-xs text-slate-400">Atur ID dan Server Signaling</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Input */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              ID Telepon Kamu
            </label>
            <div className="relative">
              <input
                type="text"
                value={newIdInput}
                onChange={handleInputChange}
                placeholder="misal: fajar-rider / callan-01"
                className="w-full bg-slate-900/90 text-cyan-300 font-mono font-bold text-sm px-4 py-3 rounded-2xl border border-slate-700 focus:outline-none focus:border-cyan-400 placeholder:text-slate-600 transition-colors"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{error}</span>
              </p>
            )}
            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-slate-400">
                Gunakan huruf kecil & strip (-).
              </p>
              <button
                type="button"
                onClick={handleGenerateRandom}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium py-0.5 px-2 rounded-lg hover:bg-cyan-950/50 transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                <span>Acak ID</span>
              </button>
            </div>
          </div>

          {/* Collapsible Server Section */}
          <div className="border-t border-slate-800 pt-3">
            <button
              type="button"
              onClick={() => setShowServerSection(!showServerSection)}
              className="w-full flex items-center justify-between text-xs font-bold text-slate-300 hover:text-cyan-400 py-1 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-400" />
                <span>Server WebRTC (Render.com)</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400">
                {serverHostInput ? 'Custom' : 'Default'}
              </span>
            </button>

            {showServerSection && (
              <div className="mt-2.5 space-y-2 bg-slate-900/60 p-3 rounded-2xl border border-slate-800 animate-in fade-in duration-150">
                <label className="block text-[11px] font-medium text-slate-400">
                  Domain Render.com:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={serverHostInput}
                    onChange={handleServerChange}
                    placeholder="misal: callan-server.onrender.com"
                    className="w-full bg-slate-950 text-slate-200 font-mono text-xs px-3 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-400 placeholder:text-slate-600"
                  />
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Masukkan domain web service dari Render.com (tanpa https://). Kosongkan jika ingin memakai server default bawaan.
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-sm border border-slate-700 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!newIdInput.trim()}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold rounded-xl text-sm shadow-lg shadow-cyan-950/50 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Simpan</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
