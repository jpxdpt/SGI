import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from './Button';
import clsx from 'clsx';

interface InteractiveChartProps {
  title: string;
  children: ReactNode;
  className?: string;
  allowZoom?: boolean;
}

export const InteractiveChart = ({
  title,
  children,
  className,
  allowZoom = true,
}: InteractiveChartProps) => {
  const [zoom, setZoom] = useState(1);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.1, 0.5));
  };

  const handleReset = () => {
    setZoom(1);
  };

  return (
    <div className={clsx('relative group', className)}>
      {allowZoom && (
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" onClick={handleZoomIn} title="Aproximar">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleZoomOut} title="Afastar">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleReset} title="Resetar zoom">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      )}
      <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
        {children}
      </div>
    </div>
  );
};





