import React from 'react';
import { cn } from '../../utils/cn';
import { DocumentStatus } from '../../types';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: DocumentStatus;
  progress?: number;
  className?: string;
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, progress, className, label }) => {
  if (status === 'ready') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60',
          className
        )}
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
        {label || 'Ready'}
      </span>
    );
  }

  if (status === 'processing') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/60 processing-glow',
          className
        )}
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
        Processing {progress !== undefined ? `${progress}%` : ''}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200/60',
        className
      )}
    >
      <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
      Failed
    </span>
  );
};

export const TagBadge: React.FC<{ label: string; className?: string }> = ({ label, className }) => {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors',
        className
      )}
    >
      #{label}
    </span>
  );
};
