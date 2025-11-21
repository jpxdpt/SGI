import { Calendar, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { Button } from './Button';

export type DateRange = {
  start: Date | null | undefined;
  end: Date | null | undefined;
};

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
  placeholder?: string;
}

const formatDate = (date: Date | null): string => {
  if (!date) return '';
  return date.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const quickRanges = [
  { label: 'Hoje', getRange: () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return { start: today, end: today };
  }},
  { label: 'Última semana', getRange: () => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }},
  { label: 'Último mês', getRange: () => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setMonth(start.getMonth() - 1);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }},
  { label: 'Últimos 3 meses', getRange: () => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setMonth(start.getMonth() - 3);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }},
  { label: 'Este ano', getRange: () => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end.getFullYear(), 0, 1);
    return { start, end };
  }},
  { label: 'Ano passado', getRange: () => {
    const end = new Date(new Date().getFullYear() - 1, 11, 31);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end.getFullYear(), 0, 1);
    return { start, end };
  }},
];

export const DateRangePicker = ({
  value,
  onChange,
  className,
  placeholder = 'Selecionar período...',
}: DateRangePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.start) {
      setStartDate(value.start.toISOString().split('T')[0]);
    } else {
      setStartDate('');
    }
    if (value.end) {
      setEndDate(value.end.toISOString().split('T')[0]);
    } else {
      setEndDate('');
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleApply = () => {
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);
    onChange({ start, end });
    setIsOpen(false);
  };

  const handleClear = () => {
    setStartDate('');
    setEndDate('');
    onChange({ start: null, end: null });
    setIsOpen(false);
  };

  const handleQuickRange = (range: { start: Date; end: Date }) => {
    onChange(range);
    setIsOpen(false);
  };

  const displayText = value.start && value.end
    ? `${formatDate(value.start)} - ${formatDate(value.end)}`
    : placeholder;

  return (
    <div className={clsx('relative', className)} ref={pickerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm w-full justify-between"
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
          <span className={clsx(value.start && value.end ? '' : 'text-slate-400')}>
            {displayText}
          </span>
        </div>
        {value.start && value.end && (
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                handleClear();
              }
            }}
            className="p-1 rounded hover:bg-black/10 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1"
            aria-label="Limpar período"
          >
            <X className="h-3 w-3 text-slate-400" />
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl shadow-xl z-50 animate-scale-in p-4">
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Períodos rápidos</p>
            <div className="grid grid-cols-2 gap-2">
              {quickRanges.map((range) => (
                <button
                  key={range.label}
                  type="button"
                  onClick={() => handleQuickRange(range.getRange())}
                  className="px-3 py-2 text-xs rounded-lg border border-[var(--color-border)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-[var(--color-border)] pt-4 mb-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Período personalizado</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Data início</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Data fim</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-transparent text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] pt-4">
            <Button variant="ghost" size="sm" onClick={handleClear}>
              Limpar
            </Button>
            <Button variant="primary" size="sm" onClick={handleApply}>
              Aplicar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};



