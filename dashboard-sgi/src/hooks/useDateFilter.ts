import { useState, useEffect } from 'react';
import type { DateRange } from '../components/ui/DateRangePicker';

const STORAGE_KEY = 'sgi_date_filter';

export const useDateFilter = () => {
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          start: parsed.start ? new Date(parsed.start) : null,
          end: parsed.end ? new Date(parsed.end) : null,
        };
      }
    } catch {
      // Ignorar erros
    }
    return { start: null, end: null };
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          start: dateRange.start?.toISOString() || null,
          end: dateRange.end?.toISOString() || null,
        }),
      );
    } catch {
      // Ignorar erros
    }
  }, [dateRange]);

  const filterByDate = <T extends { dataPrevista?: string; dataAbertura?: string; dataLimite?: string; data?: string }>(
    items: T[],
  ): T[] => {
    if (!dateRange.start && !dateRange.end) return items;

    return items.filter((item) => {
      const itemDate = item.dataPrevista || item.dataAbertura || item.dataLimite || item.data;
      if (!itemDate) return true;

      const date = new Date(itemDate);
      date.setHours(0, 0, 0, 0);

      if (dateRange.start && date < dateRange.start) return false;
      if (dateRange.end && date > dateRange.end) return false;

      return true;
    });
  };

  return {
    dateRange,
    setDateRange,
    filterByDate,
  };
};











