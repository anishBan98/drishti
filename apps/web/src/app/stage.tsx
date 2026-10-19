import { useEffect, type ReactNode } from 'react';
import { useTheme } from './theme';

// The frame is a fixed 1440 × 900 stage scaled to the window and letterboxed with --bg (docs/09 §4).
export function Stage({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  useEffect(() => {
    const fit = () => {
      const zoom = Math.min(window.innerWidth / 1440, window.innerHeight / 900);
      document.documentElement.style.setProperty('--stage-zoom', String(Math.round(zoom * 1000) / 1000));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return (
    <div className="stage-outer dr-root" data-theme={theme}>
      <div className="stage">{children}</div>
    </div>
  );
}
