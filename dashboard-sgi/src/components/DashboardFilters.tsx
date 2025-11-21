import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { Input } from './ui/Input';
import { DateRangePicker, type DateRange } from './ui/DateRangePicker';

interface DashboardFiltersProps {
  onFiltersChange: (filters: DashboardFilters) => void;
  setores?: string[];
}

export interface DashboardFilters {
  dateRange: DateRange | null;
  status: string;
  setor: string;
  ano: string;
}

export const DashboardFiltersPanel = ({ onFiltersChange, setores = [] }: DashboardFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<DashboardFilters>({
    dateRange: null,
    status: 'Todos',
    setor: 'Todos',
    ano: 'Todos',
  });

  const handleFilterChange = (key: keyof DashboardFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleClear = () => {
    const clearedFilters: DashboardFilters = {
      dateRange: null,
      status: 'Todos',
      setor: 'Todos',
      ano: 'Todos',
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const hasActiveFilters =
    filters.dateRange ||
    filters.status !== 'Todos' ||
    filters.setor !== 'Todos' ||
    filters.ano !== 'Todos';

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        icon={<Filter className="h-4 w-4" />}
        onClick={() => setIsOpen(!isOpen)}
        className={hasActiveFilters ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : ''}
      >
        Filtros
        {hasActiveFilters && (
          <span className="ml-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-xs text-white">
            {[filters.dateRange, filters.status !== 'Todos', filters.setor !== 'Todos', filters.ano !== 'Todos'].filter(Boolean).length}
          </span>
        )}
      </Button>

      {isOpen && (
        <Card className="absolute top-full left-0 z-50 mt-2 w-full max-w-2xl shadow-xl animate-slide-in">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--color-foreground)]">Filtros Avançados</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Período
                </label>
                <DateRangePicker
                  value={filters.dateRange || { start: undefined, end: undefined }}
                  onChange={(range) => handleFilterChange('dateRange', range)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Status
                </label>
                <Select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full"
                >
                  <option value="Todos">Todos os status</option>
                  <option value="Planeada">Planeada</option>
                  <option value="Em execução">Em execução</option>
                  <option value="Executada">Executada</option>
                  <option value="Exec+Atraso">Executada com atraso</option>
                  <option value="Atrasada">Atrasada</option>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Setor
                </label>
                <Select
                  value={filters.setor}
                  onChange={(e) => handleFilterChange('setor', e.target.value)}
                  className="w-full"
                >
                  <option value="Todos">Todos os setores</option>
                  {setores.map((setor) => (
                    <option key={setor} value={setor}>
                      {setor}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Ano
                </label>
                <Input
                  type="number"
                  value={filters.ano === 'Todos' ? '' : filters.ano}
                  onChange={(e) => handleFilterChange('ano', e.target.value || 'Todos')}
                  placeholder="Ex: 2025"
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
              <Button variant="ghost" size="sm" onClick={handleClear} disabled={!hasActiveFilters}>
                Limpar Filtros
              </Button>
              <Button size="sm" onClick={() => setIsOpen(false)}>
                Aplicar
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
};
