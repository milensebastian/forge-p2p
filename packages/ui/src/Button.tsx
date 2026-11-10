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
    'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 disabled:pointer-events-none select-none rounded-md';

  const variants = {
    primary: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-950',
    secondary: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700/60 shadow-sm',
    ghost: 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60',
    danger: 'bg-rose-900/60 hover:bg-rose-900 text-rose-200 border border-rose-700/50',
    outline: 'border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white bg-transparent',
  };

  const sizes = {
    xs: 'text-xs px-2 py-1 gap-1',
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-3 py-1.5 gap-2',
    lg: 'text-sm px-4 py-2 gap-2.5',
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

