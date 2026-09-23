import React from 'react';
import { LucideIcon, ArrowUpRight } from 'lucide-react';
import { cn } from '../../utils/cn';

interface MetricsCardProps {
  label: string;
  value: string | number;
  subtext: string;
  icon: LucideIcon;
  iconColor?: string;
  bgColor?: string;
  trend?: string;
  onClick?: () => void;
}

export const MetricsCard: React.FC<MetricsCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  iconColor = 'text-indigo-600',
  bgColor = 'bg-indigo-50',
  trend,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs transition-all relative overflow-hidden',
        onClick && 'cursor-pointer hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500">{label}</span>
        <div className={cn('p-2 rounded-xl flex items-center justify-center', bgColor, iconColor)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{value}</h3>
        {trend && (
          <span className="text-[11px] font-semibold text-emerald-600 flex items-center">
            <ArrowUpRight className="w-3 h-3" />
            {trend}
          </span>
        )}
      </div>

      <p className="text-xs text-slate-400 leading-normal">{subtext}</p>
    </div>
  );
};
