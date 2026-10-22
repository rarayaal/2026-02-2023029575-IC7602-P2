import React from 'react';

export default function StatusBadge({ label, status = 'success', pulse = false }) {
  const statusStyles = {
    success: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80',
    warning: 'bg-amber-950/60 text-amber-300 border-amber-800/80',
    info: 'bg-indigo-950/60 text-indigo-300 border-indigo-800/80',
    neutral: 'bg-slate-900/60 text-slate-300 border-slate-700/80',
  }[status] || 'bg-slate-900/60 text-slate-300 border-slate-700/80';

  const dotColor = {
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    info: 'bg-indigo-400',
    neutral: 'bg-slate-400',
  }[status] || 'bg-slate-400';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border backdrop-blur-sm ${statusStyles}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} ${pulse ? 'animate-pulse' : ''}`} />
      <span>{label}</span>
    </span>
  );
}
