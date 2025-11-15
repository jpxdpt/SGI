import { useContext } from 'react';
import { ThemeContext } from './context';

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser utilizado dentro do ThemeProvider');
  }
  return context;
};

