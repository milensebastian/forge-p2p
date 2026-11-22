import React from 'react';
import { cn } from './utils';

export interface AvatarProps {
  name: string;
  color?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLocal?: boolean;
  className?: string;
  active?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  color = '#818cf8',
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
    xs: 'w-4.5 h-4.5 text-[8px]',
    sm: 'w-5 h-5 text-[9px]',
    md: 'w-6 h-6 text-[10px]',
    lg: 'w-8 h-8 text-xs',
  };

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full font-medium select-none border transition-transform shrink-0',
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: `${color}18`,
        color: color,
        borderColor: `${color}40`,
      }}
      title={`${name} ${isLocal ? '(You)' : ''}`}
    >
      <span>{initials}</span>
      {isLocal && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-[#0c0d10] bg-indigo-400"
          title="Local User"
        />
      )}
      {active && !isLocal && (
        <span
          className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-[#0c0d10]"
          style={{ backgroundColor: color }}
        />
      )}
    </div>
  );
};
