import { useEffect, useRef, useCallback } from 'react';

/**
 * Generates random geometric gradient shapes on mount using theme tone colors.
 * Each page load produces a unique background pattern.
 * Listens for theme preset changes to regenerate with new colors.
 */

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  if (h.length < 6) return `rgba(128, 100, 80, ${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function generateShapes(tones: string[]): string {
  const count = 12 + Math.floor(Math.random() * 5); // 12–16 shapes
  const gradients: string[] = [];

  for (let i = 0; i < count; i++) {
    const tone = tones[i % 3];
    const alpha = 0.2 + Math.random() * 0.25;
    const color = hexToRgba(tone, alpha);
    const x = Math.floor(Math.random() * 100);
    const y = Math.floor(Math.random() * 100);

    if (Math.random() > 0.3) {
      // Conic gradient — angular wedge
      const angle = Math.floor(Math.random() * 360);
      const start = Math.floor(5 + Math.random() * 25);
      const end = start + Math.floor(25 + Math.random() * 55);
      gradients.push(
        `conic-gradient(from ${angle}deg at ${x}% ${y}%, transparent 0deg ${start}deg, ${color} ${start}deg ${end}deg, transparent ${end}deg 360deg)`
      );
    } else {
      // Radial gradient — soft blob
      const w = 25 + Math.floor(Math.random() * 50);
      const h = 20 + Math.floor(Math.random() * 40);
      gradients.push(
        `radial-gradient(ellipse ${w}% ${h}% at ${x}% ${y}%, ${color}, transparent 65%)`
      );
    }
  }

  return gradients.join(', ');
}

function readTones(): string[] {
  const styles = getComputedStyle(document.documentElement);
  return [
    styles.getPropertyValue('--geo-tone-a').trim() || '#98653F',
    styles.getPropertyValue('--geo-tone-b').trim() || '#5E463E',
    styles.getPropertyValue('--geo-tone-c').trim() || '#25283E',
  ];
}

export function RandomGeoBackground() {
  const ref = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    if (!ref.current) return;
    const tones = readTones();
    ref.current.style.background = generateShapes(tones);
  }, []);

  useEffect(() => {
    // Generate on mount (slight delay so CSS variables are resolved)
    const id = requestAnimationFrame(refresh);

    // Re-generate when theme preset changes
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (
          m.type === 'attributes' &&
          (m.attributeName === 'data-bg-preset' || m.attributeName === 'class')
        ) {
          // Wait a tick for CSS variables to update
          requestAnimationFrame(refresh);
          break;
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-bg-preset', 'class'],
    });

    return () => {
      cancelAnimationFrame(id);
      observer.disconnect();
    };
  }, [refresh]);

  return <div ref={ref} className="geo-random-layer" />;
}
