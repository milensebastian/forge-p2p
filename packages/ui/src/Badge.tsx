import React from 'react';
import { cn } from './utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'emerald' | 'cyan' | 'amber' | 'rose' | 'indigo' | 'zinc';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'zinc',
  dot = false,
  ...props
}) => {
  const variants = {
    emerald: 'bg-emerald-500/[0.08] text-emerald-400 border-emerald-500/20',
    cyan: 'bg-cyan-500/[0.08] text-cyan-400 border-cyan-500/20',
    amber: 'bg-amber-500/[0.08] text-amber-400 border-amber-500/20',
    rose: 'bg-rose-500/[0.08] text-rose-400 border-rose-500/20',
    indigo: 'bg-indigo-500/[0.08] text-indigo-400 border-indigo-500/20',
    zinc: 'bg-zinc-800/40 text-zinc-300 border-zinc-700/30',
  };

  const dotColors = {
    emerald: 'bg-emerald-400',
    cyan: 'bg-cyan-400',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400',
    indigo: 'bg-indigo-400',
    zinc: 'bg-zinc-400',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-md border tracking-tight',
        variants[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])}
        />
      )}
      {children}
    </span>
  );
};
