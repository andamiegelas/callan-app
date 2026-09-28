import React from 'react';
import { History, PhoneIncoming, PhoneOutgoing, Clock, ShieldCheck } from 'lucide-react';

export default function CallHistory({ history }) {
  if (!history || history.length === 0) {
    return (
      <div className="glass-card p-4 rounded-2xl text-center text-slate-500 text-xs my-3">
        Belum ada riwayat panggilan
      </div>
    );
  }

  const formatDuration = (sec) => {
    if (!sec) return '0s';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="w-full glass-card p-4 rounded-3xl border border-slate-800 my-4">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
        <History className="w-4 h-4 text-cyan-400" />
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Riwayat Panggilan Terakhir
        </h4>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {history.map((log) => (
          <div 
            key={log.id} 
            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg ${log.direction === 'outgoing' ? 'bg-cyan-950 text-cyan-400' : 'bg-emerald-950 text-emerald-400'}`}>
                {log.direction === 'outgoing' ? <PhoneOutgoing className="w-4 h-4" /> : <PhoneIncoming className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-200">
                  {log.peerId || 'Pasangan/Teman'}
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>•</span>
                  <span>{formatDuration(log.durationSec)}</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                log.reason === 'timer'
                  ? 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60'
                  : log.reason === 'user_hangup'
                  ? 'bg-slate-800 text-slate-400 border-slate-700'
                  : 'bg-rose-950/80 text-rose-300 border-rose-800/60'
              }`}>
                {log.reason === 'timer' && <Clock className="w-3 h-3 text-cyan-400" />}
                {log.reason === 'timer' ? 'Timer End' : log.reason === 'user_hangup' ? 'Tutup Manual' : 'Terputus'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
