import React from 'react';
import { cn } from './utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'secondary',
  size = 'md',
  icon,
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500/60 disabled:opacity-40 disabled:pointer-events-none select-none rounded-md';

  const variants = {
    primary:
      'bg-zinc-100 hover:bg-white text-zinc-950 font-medium active:scale-[0.98] shadow-xs',
    accent:
      'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/40 active:scale-[0.98] shadow-xs',
    secondary:
      'bg-[#14151b] hover:bg-[#1a1c23] text-zinc-200 border border-[#23252f] hover:border-[#2f323f] active:scale-[0.98]',
    ghost:
      'text-zinc-400 hover:text-zinc-100 hover:bg-[#181920] active:scale-[0.98]',
    danger:
      'bg-rose-950/25 hover:bg-rose-900/40 text-rose-300 border border-rose-800/35 active:scale-[0.98]',
    outline:
      'border border-[#23252f] hover:border-[#2f323f] text-zinc-300 hover:text-white bg-transparent active:scale-[0.98]',
  };

  const sizes = {
    xs: 'text-[11px] px-2 py-1 gap-1',
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-xs px-3.5 py-1.5 gap-2',
    lg: 'text-sm px-4.5 py-2 gap-2.5',
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};
