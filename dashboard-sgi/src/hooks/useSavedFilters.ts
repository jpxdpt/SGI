import { useState, useEffect, useCallback } from 'react';

/**
 * Hook para gerir filtros guardados
 */
export interface SavedFilter<T> {
  id: string;
  name: string;
  filters: T;
  createdAt: string;
}

const STORAGE_KEY_PREFIX = 'sgi_saved_filters_';

export const useSavedFilters = <T extends Record<string, unknown>>(
  filterKey: string, // Ex: 'internalAudits', 'externalAudits', etc.
) => {
  const storageKey = `${STORAGE_KEY_PREFIX}${filterKey}`;

  const [savedFilters, setSavedFilters] = useState<SavedFilter<T>[]>([]);

  // Carregar filtros guardados do localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as SavedFilter<T>[];
        setSavedFilters(parsed);
      }
    } catch (error) {
      console.error('Erro ao carregar filtros guardados:', error);
    }
  }, [storageKey]);

  // Guardar um novo filtro
  const saveFilter = useCallback(
    (name: string, filters: T) => {
      const newFilter: SavedFilter<T> = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        filters,
        createdAt: new Date().toISOString(),
      };

      const updated = [...savedFilters, newFilter];
      setSavedFilters(updated);

      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (error) {
        console.error('Erro ao guardar filtro:', error);
        throw error;
      }

      return newFilter;
    },
    [savedFilters, storageKey],
  );

  // Eliminar um filtro
  const deleteFilter = useCallback(
    (id: string) => {
      const updated = savedFilters.filter((f) => f.id !== id);
      setSavedFilters(updated);

      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (error) {
        console.error('Erro ao eliminar filtro:', error);
        throw error;
      }
    },
    [savedFilters, storageKey],
  );

  // Aplicar um filtro guardado
  const applyFilter = useCallback(
    (id: string): T | null => {
      const filter = savedFilters.find((f) => f.id === id);
      return filter ? filter.filters : null;
    },
    [savedFilters],
  );

  return {
    savedFilters,
    saveFilter,
    deleteFilter,
    applyFilter,
  };
};





