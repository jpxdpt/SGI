import { Moon, SunMedium } from 'lucide-react';
import { useTheme } from '../../theme/useTheme';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      aria-label="Alternar tema"
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-medium shadow-sm bg-[var(--color-card)] hover:border-brand-500 hover:shadow-md transition-colors"
    >
      {theme === 'light' ? (
        <>
          <Moon className="h-4 w-4" /> Escuro
        </>
      ) : (
        <>
          <SunMedium className="h-4 w-4" /> Claro
        </>
      )}
    </button>
  );
};

