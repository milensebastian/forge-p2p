import React from 'react';
import { cn } from './utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
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
    'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:opacity-40 disabled:pointer-events-none select-none rounded-lg';

  const variants = {
    primary:
      'bg-zinc-100 hover:bg-white text-zinc-950 font-medium active:scale-[0.99] shadow-sm',
    secondary:
      'bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border border-zinc-800 hover:border-zinc-700 active:scale-[0.99]',
    ghost:
      'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850/80 active:scale-[0.99]',
    danger:
      'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 active:scale-[0.99]',
    outline:
      'border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white bg-transparent active:scale-[0.99]',
  };

  const sizes = {
    xs: 'text-xs px-2 py-1 gap-1',
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-3.5 py-2 gap-2',
    lg: 'text-sm px-5 py-2.5 gap-2.5',
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
