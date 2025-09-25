import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

export interface DroppableZoneProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  acceptTypes?: string[];
}

export function DroppableZone({
  id,
  children,
  className,
  disabled = false,
  acceptTypes = [],
}: DroppableZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    disabled,
    data: {
      acceptTypes,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'transition-colors',
        isOver && 'bg-accent/50 border-accent',
        disabled && 'opacity-60',
        className
      )}
    >
      {children}
    </div>
  );
}
