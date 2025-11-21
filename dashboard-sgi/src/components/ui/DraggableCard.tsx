import { GripVertical, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Card } from './Card';
import clsx from 'clsx';

interface DraggableCardProps {
  id: string;
  title: string;
  children: ReactNode;
  onRemove?: (id: string) => void;
  className?: string;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent, id: string) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, id: string) => void;
}

export const DraggableCard = ({
  id,
  title,
  children,
  onRemove,
  className,
  isDragging = false,
  onDragStart,
  onDragOver,
  onDrop,
}: DraggableCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={clsx(
        'relative cursor-move transition-all',
        isDragging && 'opacity-50 scale-95',
        isHovered && 'ring-2 ring-brand-500/50',
        className,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      draggable
      onDragStart={(e) => onDragStart?.(e, id)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver?.(e);
      }}
      onDrop={(e) => onDrop?.(e, id)}
    >
      <Card
        title={title}
        actions={
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-slate-400 cursor-grab active:cursor-grabbing" />
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(id)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Remover widget"
              >
                <X className="h-3 w-3 text-slate-400" />
              </button>
            )}
          </div>
        }
      >
        {children}
      </Card>
    </div>
  );
};

