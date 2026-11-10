import React from 'react';
import { cn } from './utils';

export interface AvatarProps {
  name: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  isLocal?: boolean;
  className?: string;
  active?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  color = '#10b981',
  size = 'md',
  isLocal = false,
  className,
  active = true,
}) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-7 h-7 text-xs',
    lg: 'w-9 h-9 text-sm',
  };

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full font-semibold select-none ring-1 transition-transform',
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        borderColor: color,
      }}
      title={`${name} ${isLocal ? '(You)' : ''}`}
    >
      <span>{initials}</span>
      {isLocal && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-zinc-900 bg-emerald-400"
          title="Local User"
        />
      )}
      {active && !isLocal && (
        <span
          className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-zinc-900"
          style={{ backgroundColor: color }}
        />
      )}
    </div>
  );
};

