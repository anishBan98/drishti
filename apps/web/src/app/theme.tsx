import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

// Theme (docs/09 §2): stored in localStorage["drishti-theme"] (wrapped in try/catch); default follows the system.
export type Theme = 'light' | 'dark';
const KEY = 'drishti-theme';

function initial(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* storage unavailable */
  }
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const ThemeContext = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({ theme: 'light', setTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, set] = useState<Theme>(initial);
  const setTheme = useCallback((t: Theme) => {
    set(t);
    try {
      localStorage.setItem(KEY, t);
    } catch {
      /* storage unavailable */
    }
  }, []);
  useEffect(() => {
    document.body.dataset.theme = theme;
  }, [theme]);
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
