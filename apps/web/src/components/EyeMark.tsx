import { useEffect, useRef } from 'react';
import css from './eye.module.css';

/** The lift-eye mark, alive: the red pupil follows the pointer and the eye blinks now and then. */
export function EyeMark({ size = 48 }: { size?: number }) {
  const pupil = useRef<SVGCircleElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const move = (e: PointerEvent) => {
      const box = svg.current?.getBoundingClientRect();
      if (!box || !pupil.current) return;
      const dx = e.clientX - (box.left + box.width / 2);
      const dy = e.clientY - (box.top + box.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      const r = Math.min(14, d / 12);
      pupil.current.setAttribute('transform', `translate(${(dx / d) * r} ${(dy / d) * r * 0.6})`);
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, []);
  return (
    <svg ref={svg} width={size} height={size} viewBox="0 0 200 200" aria-hidden="true" className={css.eye}>
      <g transform="translate(0 -6)" className={css.lid}>
        <path d="M18 108 Q100 26 182 108" fill="none" stroke="#FFFFFF" strokeWidth="20" strokeLinecap="round" />
        <path
          d="M18 108 Q92 168 150 118 L184 80"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="20"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle ref={pupil} cx="100" cy="104" r="25" fill="#FF2E2E" className={css.pupil} />
      </g>
    </svg>
  );
}
