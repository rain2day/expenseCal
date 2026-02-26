import { useEffect, useRef, useCallback } from 'react';

/**
 * Generates random geometric gradient shapes on mount.
 * Colors are derived from the app's primary (accent) and background colors
 * so the geometric background always matches the selected theme.
 *
 * Bright shapes  → --primary (accent color)
 * Deep shapes    → --bg-dark (background color)
 * Blend shapes   → midpoint of both
 */

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  if (h.length < 6) return [128, 100, 80];
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgba(rgb: [number, number, number], a: number): string {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a})`;
}

function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/** Lighten a color by mixing toward white */
function lighten(rgb: [number, number, number], amount: number): [number, number, number] {
  return mixRgb(rgb, [255, 255, 255], amount);
}

interface Palette {
  accent: [number, number, number];     // --primary (bright highlight)
  accentSoft: [number, number, number]; // lighter accent for variety
  bgDeep: [number, number, number];     // --bg-dark (background depth)
  blend: [number, number, number];      // midpoint of accent + bg
}

function readPalette(): Palette {
  const styles = getComputedStyle(document.documentElement);
  const primary = styles.getPropertyValue('--primary').trim() || '#DD843C';
  const bgDark = styles.getPropertyValue('--bg-dark').trim() || '#20232C';

  const accent = hexToRgb(primary);
  const bgDeep = hexToRgb(bgDark);

  return {
    accent,
    accentSoft: lighten(accent, 0.3),
    bgDeep,
    blend: mixRgb(accent, bgDeep, 0.5),
  };
}

function generateShapes(palette: Palette): string {
  const count = 12 + Math.floor(Math.random() * 5); // 12–16 shapes
  const gradients: string[] = [];

  // Color distribution:
  // ~40% accent (bright pops), ~25% accentSoft, ~20% blend, ~15% bgDeep
  const colorPool: { rgb: [number, number, number]; alphaRange: [number, number] }[] = [
    { rgb: palette.accent,     alphaRange: [0.18, 0.38] },
    { rgb: palette.accentSoft, alphaRange: [0.12, 0.28] },
    { rgb: palette.blend,      alphaRange: [0.15, 0.30] },
    { rgb: palette.bgDeep,     alphaRange: [0.20, 0.40] },
  ];

  for (let i = 0; i < count; i++) {
    // Weighted color selection: accent-heavy
    const roll = Math.random();
    const pick = roll < 0.4 ? 0 : roll < 0.65 ? 1 : roll < 0.85 ? 2 : 3;
    const { rgb, alphaRange } = colorPool[pick];
    const alpha = alphaRange[0] + Math.random() * (alphaRange[1] - alphaRange[0]);
    const color = rgba(rgb, +alpha.toFixed(2));

    const x = Math.floor(Math.random() * 100);
    const y = Math.floor(Math.random() * 100);

    if (Math.random() > 0.3) {
      // Conic gradient — angular wedge
      const angle = Math.floor(Math.random() * 360);
      const start = Math.floor(5 + Math.random() * 25);
      const end = start + Math.floor(25 + Math.random() * 55);
      gradients.push(
        `conic-gradient(from ${angle}deg at ${x}% ${y}%, transparent 0deg ${start}deg, ${color} ${start}deg ${end}deg, transparent ${end}deg 360deg)`,
      );
    } else {
      // Radial gradient — soft blob
      const w = 25 + Math.floor(Math.random() * 50);
      const h = 20 + Math.floor(Math.random() * 40);
      gradients.push(
        `radial-gradient(ellipse ${w}% ${h}% at ${x}% ${y}%, ${color}, transparent 65%)`,
      );
    }
  }

  return gradients.join(', ');
}

export function RandomGeoBackground() {
  const ref = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    if (!ref.current) return;
    const palette = readPalette();
    ref.current.style.background = generateShapes(palette);
  }, []);

  useEffect(() => {
    // Generate on mount (slight delay so CSS variables are resolved)
    const id = requestAnimationFrame(refresh);

    // Re-generate when theme preset or accent changes
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (
          m.type === 'attributes' &&
          (m.attributeName === 'data-bg-preset' ||
           m.attributeName === 'class' ||
           m.attributeName === 'style')
        ) {
          requestAnimationFrame(refresh);
          break;
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-bg-preset', 'class', 'style'],
    });

    return () => {
      cancelAnimationFrame(id);
      observer.disconnect();
    };
  }, [refresh]);

  return <div ref={ref} className="geo-random-layer" />;
}
