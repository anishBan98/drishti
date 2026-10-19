import { t } from '@drishti/shared';
import { useEffect, useRef, useState } from 'react';
import ui from './ui.module.css';
import css from './frame.module.css';

export interface PillOption {
  value: string;
  label: string;
}

/** Header filter pill (docs/09 §5 Header): a real menu; a single-option menu explains what more appears later. */
export function PillMenu({
  label,
  options,
  value,
  onChange,
  what,
}: {
  label: string;
  options: PillOption[];
  value: string;
  onChange?: (v: string) => void;
  what?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button type="button" className={ui.pill} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {label} ▾
      </button>
      {open && (
        <div role="menu" className={css.menu} style={{ left: 'auto', right: 0 }}>
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="menuitemradio"
              aria-checked={o.value === value}
              className={css.menuItem}
              onClick={() => {
                onChange?.(o.value);
                setOpen(false);
              }}
            >
              {o.value === value ? '✓ ' : ''}
              {o.label}
            </button>
          ))}
          {options.length === 1 && what && <p className={css.menuNote}>{t('ui.menu.only_option', { what })}</p>}
        </div>
      )}
    </div>
  );
}
