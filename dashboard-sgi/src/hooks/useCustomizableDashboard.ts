import { useState, useEffect } from 'react';

export type WidgetType = 'welcome' | 'kpi_cards' | 'alerts' | 'internal_audits_chart' | 'external_audits_chart' | 'actions_chart' | 'occurrences_chart' | 'evolution_chart' | 'scheduled_reports';

interface Widget {
  id: string;
  type: WidgetType;
  visible: boolean;
  order: number;
}

const STORAGE_KEY = 'sgi_dashboard_layout';
const DEFAULT_WIDGETS: Widget[] = [
  { id: 'welcome', type: 'welcome', visible: true, order: 0 },
  { id: 'kpi_cards', type: 'kpi_cards', visible: true, order: 1 },
  { id: 'alerts', type: 'alerts', visible: true, order: 2 },
  { id: 'internal_audits_chart', type: 'internal_audits_chart', visible: true, order: 3 },
  { id: 'external_audits_chart', type: 'external_audits_chart', visible: true, order: 4 },
  { id: 'actions_chart', type: 'actions_chart', visible: true, order: 5 },
  { id: 'occurrences_chart', type: 'occurrences_chart', visible: true, order: 6 },
  { id: 'evolution_chart', type: 'evolution_chart', visible: true, order: 7 },
  { id: 'scheduled_reports', type: 'scheduled_reports', visible: true, order: 8 },
];

export const useCustomizableDashboard = () => {
  const [widgets, setWidgets] = useState<Widget[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignorar erros
    }
    return DEFAULT_WIDGETS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
    } catch {
      // Ignorar erros
    }
  }, [widgets]);

  const toggleWidget = (id: string) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)),
    );
  };

  const reorderWidgets = (fromIndex: number, toIndex: number) => {
    setWidgets((prev) => {
      const updated = [...prev];
      const [removed] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, removed);
      return updated.map((w, index) => ({ ...w, order: index }));
    });
  };

  const resetLayout = () => {
    setWidgets(DEFAULT_WIDGETS);
  };

  const getVisibleWidgets = () => {
    return widgets
      .filter((w) => w.visible)
      .sort((a, b) => a.order - b.order);
  };

  return {
    widgets,
    setWidgets,
    toggleWidget,
    reorderWidgets,
    resetLayout,
    getVisibleWidgets,
  };
};





