import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

export interface DraggableItemProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function DraggableItem({
  id,
  children,
  className,
  disabled = false,
}: DraggableItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id,
      disabled,
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'cursor-grab transition-transform',
        isDragging && 'opacity-50 cursor-grabbing',
        disabled && 'cursor-not-allowed opacity-60',
        className
      )}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  );
}
