import React, { useState, useRef, useEffect } from 'react';
import { cn } from './utils';

export interface SplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
  initialRatio?: number; // 0 to 1, default 0.5
  minLeftWidth?: number;
  minRightWidth?: number;
  className?: string;
}

export const SplitPane: React.FC<SplitPaneProps> = ({
  left,
  right,
  initialRatio = 0.5,
  minLeftWidth = 250,
  minRightWidth = 250,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(initialRatio);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const totalWidth = rect.width;

      if (totalWidth <= 0) return;

      const newRatio = Math.max(
        minLeftWidth / totalWidth,
        Math.min((totalWidth - minRightWidth) / totalWidth, offsetX / totalWidth)
      );
      setRatio(newRatio);
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, minLeftWidth, minRightWidth]);

  return (
    <div
      ref={containerRef}
      className={cn('relative flex w-full h-full overflow-hidden select-none', className)}
    >
      <div
        className="h-full overflow-auto"
        style={{ width: `${ratio * 100}%` }}
      >
        {left}
      </div>

      {/* Draggable Divider */}
      <div
        onMouseDown={() => setIsDragging(true)}
        className={cn(
          'relative w-1.5 h-full cursor-col-resize shrink-0 transition-colors group z-20 flex items-center justify-center',
          isDragging ? 'bg-emerald-500' : 'bg-zinc-800 hover:bg-zinc-700'
        )}
      >
        <div className="w-0.5 h-6 bg-zinc-600 rounded-full group-hover:bg-zinc-400" />
      </div>

      <div
        className="h-full overflow-auto flex-1"
        style={{ width: `${(1 - ratio) * 100}%` }}
      >
        {right}
      </div>
    </div>
  );
};

