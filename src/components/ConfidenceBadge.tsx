import React from 'react';
import { ConfidenceCategory } from '../types.js';
import { AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';

interface ConfidenceBadgeProps {
  score?: number; // 0.00 to 1.00
  category?: ConfidenceCategory;
  showPercent?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  score,
  category,
  showPercent = true,
  size = 'md',
}) => {
  const finalCategory: ConfidenceCategory =
    category || (score !== undefined ? (score >= 0.85 ? 'HIGH' : score >= 0.60 ? 'MEDIUM' : 'LOW') : 'MEDIUM');

  const percent = score !== undefined ? Math.round(score * 100) : null;

  const sizeClasses = {
    sm: 'text-[9px] px-1.5 py-0.2 font-bold tracking-tight',
    md: 'text-[10px] px-2 py-0.5 font-bold tracking-tight',
    lg: 'text-xs px-2.5 py-1 font-bold',
  };

  if (finalCategory === 'HIGH') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-300 font-mono ${sizeClasses[size]}`}
      >
        <CheckCircle className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
        <span>HIGH {percent !== null && showPercent ? `${percent}%` : ''}</span>
      </span>
    );
  }

  if (finalCategory === 'MEDIUM') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded bg-amber-50 text-amber-800 border border-amber-300 font-mono ${sizeClasses[size]}`}
      >
        <HelpCircle className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
        <span>MED {percent !== null && showPercent ? `${percent}%` : ''}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded bg-rose-50 text-rose-700 border border-rose-300 font-mono animate-pulse ${sizeClasses[size]}`}
    >
      <AlertTriangle className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      <span>LOW {percent !== null && showPercent ? `${percent}%` : ''}</span>
    </span>
  );
};
