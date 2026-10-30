import React from 'react';

export default function StatusBadge({ label, status = 'success', pulse = false }) {
  const statusStyles = {
    success: 'bg-forest-subtle text-forest border-forest-border',
    warning: 'bg-amberState-subtle text-amberState border-amberState-border',
    info: 'bg-surface-subtle text-ink-secondary border-surface-border',
    neutral: 'bg-surface-subtle text-ink-muted border-surface-border',
  }[status] || 'bg-surface-subtle text-ink-secondary border-surface-border';

  const dotColor = {
    success: 'bg-forest',
    warning: 'bg-amberState',
    info: 'bg-ink-muted',
    neutral: 'bg-ink-faint',
  }[status] || 'bg-ink-muted';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${statusStyles}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{label}</span>
    </span>
  );
}
