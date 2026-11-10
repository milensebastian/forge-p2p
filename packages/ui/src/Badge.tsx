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
    emerald: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60',
    cyan: 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60',
    amber: 'bg-amber-950/80 text-amber-300 border-amber-800/60',
    rose: 'bg-rose-950/80 text-rose-300 border-rose-800/60',
    indigo: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/60',
    zinc: 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60',
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
        'inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full border',
        variants[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full shrink-0 animate-pulse', dotColors[variant])}
        />
      )}
      {children}
    </span>
  );
};

