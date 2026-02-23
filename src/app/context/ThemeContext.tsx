import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ── Radix Theme accent colors ──────────────────────────────────────────────
export const ACCENT_COLORS = [
  'gray','gold','bronze','brown',
  'yellow','amber','orange','tomato','red','ruby',
  'crimson','pink','plum','purple','violet',
  'iris','indigo','blue','cyan','teal',
  'jade','green','grass','lime','mint','sky',
] as const;

export type AccentColor = typeof ACCENT_COLORS[number] | 'custom';

// Visual hex preview for each Radix accent color (step 9 in dark mode)
export const ACCENT_SWATCHES: Record<string, string> = {
  gray: '#8B8D98', gold: '#978365', bronze: '#A18072', brown: '#AD7F58',
  yellow: '#F5D90A', amber: '#FFC53D', orange: '#DD843C', tomato: '#EC6142',
  red: '#E5484D', ruby: '#E54666', crimson: '#E93D82', pink: '#D6409F',
  plum: '#AB4ABA', purple: '#8E4EC6', violet: '#6E56CF', iris: '#5B5BD6',
  indigo: '#3E63DD', blue: '#0090FF', cyan: '#00B7D4', teal: '#12A594',
  jade: '#29A383', green: '#30A46C', grass: '#46A758', lime: '#BDEE63',
  mint: '#86EAD4', sky: '#7CE2FE',
};

// ── Radix Theme gray colors ────────────────────────────────────────────────
export const GRAY_COLORS = ['auto', 'gray', 'mauve', 'slate', 'sage', 'olive', 'sand'] as const;
export type GrayColor = typeof GRAY_COLORS[number];

export const GRAY_SWATCHES: Record<string, string> = {
  auto: '#949DFF', gray: '#8B8D98', mauve: '#8E8C99', slate: '#8B8D98',
  sage: '#868E8B', olive: '#8B8D86', sand: '#8B8579',
};

// Gray color → muted-foreground mapping for dark / light
const GRAY_MUTED_DARK: Record<string, string> = {
  auto: '#A3ACFF', gray: '#B4B8C4', mauve: '#AEA0BE', slate: '#9BABB8',
  sage: '#90A89B', olive: '#A0A890', sand: '#C8A090',
};
const GRAY_MUTED_LIGHT: Record<string, string> = {
  auto: '#9A7565', gray: '#666D78', mauve: '#7A6A8A', slate: '#6A7A88',
  sage: '#607A6B', olive: '#6A7A60', sand: '#9A7565',
};

// ── Radius / Scaling ───────────────────────────────────────────────────────
export const RADIUS_OPTIONS = ['none', 'small', 'medium', 'large', 'full'] as const;
export type RadiusOption = typeof RADIUS_OPTIONS[number];

const RADIUS_VALUES: Record<RadiusOption, string> = {
  none: '0px', small: '0.375rem', medium: '0.5rem', large: '0.75rem', full: '9999px',
};

export const SCALING_OPTIONS = ['90%', '95%', '100%', '105%', '110%'] as const;
export type ScalingOption = typeof SCALING_OPTIONS[number];

const SCALING_VALUES: Record<ScalingOption, number> = {
  '90%': 14.4, '95%': 15.2, '100%': 16, '105%': 16.8, '110%': 17.6,
};

export const PANEL_BG_OPTIONS = ['solid', 'translucent'] as const;
export type PanelBgOption = typeof PANEL_BG_OPTIONS[number];

// ── Background color presets ────────────────────────────────────────────────
export interface BgPreset {
  id: string;
  label: string;
  light: string;      // light mode background
  dark: string;        // dark mode gradient base
  darkGradient: string; // dark mode full gradient
  darkThemeColor: string; // dark mode iOS status bar color (blend of gradient top + sidebar)
}

export const BG_PRESETS: BgPreset[] = [
  {
    id: 'warm',
    label: '暮藍橙',
    light: '#ECEEF7',
    dark: '#20232C',
    darkGradient: 'linear-gradient(145deg, #2A2C35 0%, #20232C 34%, #1C2233 62%, #372A24 100%)',
    darkThemeColor: '#2A2C35',
  },
  {
    id: 'slate',
    label: '冷灰藍',
    light: '#EEF1F5',
    dark: '#151922',
    darkGradient: 'linear-gradient(145deg, #1E2536 0%, #151922 30%, #111620 60%, #0C0F18 100%)',
    darkThemeColor: '#1A2030',
  },
  {
    id: 'forest',
    label: '森林綠',
    light: '#EDF3ED',
    dark: '#121E14',
    darkGradient: 'linear-gradient(145deg, #1A2E1C 0%, #121E14 30%, #0E1A12 60%, #0A120A 100%)',
    darkThemeColor: '#182818',
  },
  {
    id: 'plum',
    label: '梅紫',
    light: '#F2EDF5',
    dark: '#1E1224',
    darkGradient: 'linear-gradient(145deg, #2E1A38 0%, #1E1224 30%, #18102A 60%, #100C18 100%)',
    darkThemeColor: '#281830',
  },
  {
    id: 'midnight',
    label: '午夜黑',
    light: '#F0F0F0',
    dark: '#111111',
    darkGradient: 'linear-gradient(145deg, #1A1A1A 0%, #111111 30%, #0D0D0D 60%, #080808 100%)',
    darkThemeColor: '#181818',
  },
  {
    id: 'ocean',
    label: '海洋藍',
    light: '#EBF0F5',
    dark: '#0E1620',
    darkGradient: 'linear-gradient(145deg, #142636 0%, #0E1620 30%, #0A1220 60%, #060E18 100%)',
    darkThemeColor: '#102030',
  },
  {
    id: 'rose',
    label: '玫瑰粉',
    light: '#F5ECF0',
    dark: '#2A1018',
    darkGradient: 'linear-gradient(145deg, #3E1828 0%, #2A1018 30%, #201020 60%, #140A10 100%)',
    darkThemeColor: '#381420',
  },
  {
    id: 'amber',
    label: '琥珀金',
    light: '#F5F0E0',
    dark: '#241A08',
    darkGradient: 'linear-gradient(145deg, #3A2A10 0%, #241A08 30%, #1C1408 60%, #120E04 100%)',
    darkThemeColor: '#302008',
  },
  {
    id: 'teal',
    label: '青碧',
    light: '#E8F3F2',
    dark: '#0A1E1C',
    darkGradient: 'linear-gradient(145deg, #143230 0%, #0A1E1C 30%, #081818 60%, #041010 100%)',
    darkThemeColor: '#102A28',
  },
];

// ── Theme Config ───────────────────────────────────────────────────────────
export interface ThemeConfig {
  accentColor: AccentColor;
  customAccentHex: string;
  grayColor: GrayColor;
  radius: RadiusOption;
  scaling: ScalingOption;
  panelBackground: PanelBgOption;
  bgPreset: string; // id from BG_PRESETS or 'custom'
  customBgLight: string;
  customBgDark: string;
}

const DEFAULT_CONFIG: ThemeConfig = {
  accentColor: 'orange',
  customAccentHex: '#DD843C',
  grayColor: 'auto',
  radius: 'large',
  scaling: '100%',
  panelBackground: 'translucent',
  bgPreset: 'warm',
  customBgLight: '#ECEEF7',
  customBgDark: '#20232C',
};

// Generate a simple dark gradient from a base hex color
function makeDarkGradient(hex: string): string {
  // Parse hex
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lighter = `rgb(${Math.min(255, r + 30)}, ${Math.min(255, g + 30)}, ${Math.min(255, b + 30)})`;
  const mid = hex;
  const darker = `rgb(${Math.max(0, r - 10)}, ${Math.max(0, g - 10)}, ${Math.max(0, b - 10)})`;
  const darkest = `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`;
  return `linear-gradient(145deg, ${lighter} 0%, ${mid} 30%, ${darker} 60%, ${darkest} 100%)`;
}

const STORAGE_KEY = 'gcd-theme';

function loadConfig(): ThemeConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_CONFIG;
}

// ── Context ────────────────────────────────────────────────────────────────
interface ThemeContextValue {
  config: ThemeConfig;
  setAccentColor: (c: AccentColor) => void;
  setCustomAccentHex: (hex: string) => void;
  setGrayColor: (c: GrayColor) => void;
  setRadius: (r: RadiusOption) => void;
  setScaling: (s: ScalingOption) => void;
  setPanelBackground: (p: PanelBgOption) => void;
  setBgPreset: (id: string) => void;
  setCustomBg: (light: string, dark: string) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ThemeConfig>(loadConfig);

  // Persist to localStorage whenever config changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  // ── Sync accent color to CSS custom properties ──
  useEffect(() => {
    const root = document.documentElement;
    const hex = config.accentColor === 'custom'
      ? config.customAccentHex
      : ACCENT_SWATCHES[config.accentColor] || '#DD843C';

    root.style.setProperty('--primary', hex);
    root.style.setProperty('--accent', hex);
    root.style.setProperty('--ring', hex);
    root.style.setProperty('--sidebar-primary', hex);
    root.style.setProperty('--sidebar-ring', hex);
    root.style.setProperty('--chart-1', hex);
    root.style.setProperty('--accent-bg', `color-mix(in srgb, ${hex} 20%, var(--background))`);

    // Custom accent class for Radix overrides
    if (config.accentColor === 'custom' && config.customAccentHex) {
      root.style.setProperty('--custom-accent', config.customAccentHex);
      root.classList.add('custom-accent');
    } else {
      root.style.removeProperty('--custom-accent');
      root.classList.remove('custom-accent');
    }
  }, [config.accentColor, config.customAccentHex]);

  // ── Sync gray color to CSS custom properties ──
  useEffect(() => {
    const root = document.documentElement;
    const isDark = root.classList.contains('dark');
    const grayKey = config.grayColor;
    const mutedFg = isDark ? GRAY_MUTED_DARK[grayKey] : GRAY_MUTED_LIGHT[grayKey];
    const swatch = GRAY_SWATCHES[grayKey];

    root.style.setProperty('--muted-foreground', mutedFg);
    root.style.setProperty('--subtle', swatch);
  }, [config.grayColor]);

  // Re-sync gray when dark mode changes (listen to class changes)
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      const isDark = root.classList.contains('dark');
      const grayKey = config.grayColor;
      const mutedFg = isDark ? GRAY_MUTED_DARK[grayKey] : GRAY_MUTED_LIGHT[grayKey];
      const swatch = GRAY_SWATCHES[grayKey];
      root.style.setProperty('--muted-foreground', mutedFg);
      root.style.setProperty('--subtle', swatch);
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [config.grayColor]);

  // ── Sync radius to CSS custom property ──
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--radius', RADIUS_VALUES[config.radius]);
  }, [config.radius]);

  // ── Sync scaling to root font-size ──
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--font-size', `${SCALING_VALUES[config.scaling]}px`);
  }, [config.scaling]);

  // ── Sync panel background: geo-bg class + card transparency ──
  useEffect(() => {
    const root = document.documentElement;
    // Keep geometric background always on; only panel translucency is toggled.
    root.classList.add('geo-bg');
    if (config.panelBackground === 'translucent') root.classList.add('translucent-panels');
    else root.classList.remove('translucent-panels');
  }, [config.panelBackground]);

  // ── Sync background color preset ──
  useEffect(() => {
    const root = document.documentElement;
    let lightBg: string, darkBg: string, darkGrad: string, darkTheme: string;

    if (config.bgPreset === 'custom') {
      lightBg = config.customBgLight;
      darkBg = config.customBgDark;
      darkGrad = makeDarkGradient(config.customBgDark);
      darkTheme = config.customBgDark; // custom: use base color
      root.setAttribute('data-bg-preset', 'custom');
    } else {
      const preset = BG_PRESETS.find(p => p.id === config.bgPreset) || BG_PRESETS[0];
      lightBg = preset.light;
      darkBg = preset.dark;
      darkGrad = preset.darkGradient;
      darkTheme = preset.darkThemeColor;
      root.setAttribute('data-bg-preset', config.bgPreset);
    }

    root.style.setProperty('--bg-light', lightBg);
    root.style.setProperty('--bg-dark', darkBg);
    root.style.setProperty('--dark-gradient', darkGrad);
    root.style.setProperty('--background-base', lightBg);

    // Keep system color-scheme + status bar/safe-area color in sync.
    const isDark = root.classList.contains('dark');
    const safeAreaColor = isDark ? darkTheme : lightBg;
    root.style.colorScheme = isDark ? 'dark' : 'light';
    root.style.backgroundColor = safeAreaColor;
    // SAFARI FIX: Do NOT set body.style.backgroundColor — it creates an
    // opaque inline style that overrides `.dark body { background: transparent }`
    // in CSS, blocking backdrop-filter from seeing through to geo shapes.
    // html.style.backgroundColor + meta[name="theme-color"] are sufficient
    // for iOS safe-area / bounce-scroll coloring.
    if (document.body) document.body.style.removeProperty('background-color');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', safeAreaColor);
  }, [config.bgPreset, config.customBgLight, config.customBgDark]);

  // Re-sync browser UI hints when dark mode toggles
  useEffect(() => {
    const root = document.documentElement;
    const syncBg = () => {
      const isDark = root.classList.contains('dark');
      let lightBg: string, darkTheme: string;
      if (config.bgPreset === 'custom') {
        lightBg = config.customBgLight;
        darkTheme = config.customBgDark;
      } else {
        const preset = BG_PRESETS.find(p => p.id === config.bgPreset) || BG_PRESETS[0];
        lightBg = preset.light;
        darkTheme = preset.darkThemeColor;
      }
      const safeAreaColor = isDark ? darkTheme : lightBg;
      root.style.colorScheme = isDark ? 'dark' : 'light';
      root.style.backgroundColor = safeAreaColor;
      // Don't set body bg — see comment in bgPreset sync effect above
      if (document.body) document.body.style.removeProperty('background-color');
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', safeAreaColor);
    };
    const observer = new MutationObserver(syncBg);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [config.bgPreset, config.customBgLight, config.customBgDark]);

  const update = useCallback((partial: Partial<ThemeConfig>) => {
    setConfig(prev => ({ ...prev, ...partial }));
  }, []);

  const value: ThemeContextValue = {
    config,
    setAccentColor: (c) => update({ accentColor: c }),
    setCustomAccentHex: (hex) => update({ customAccentHex: hex, accentColor: 'custom' }),
    setGrayColor: (c) => update({ grayColor: c }),
    setRadius: (r) => update({ radius: r }),
    setScaling: (s) => update({ scaling: s }),
    setPanelBackground: (p) => update({ panelBackground: p }),
    setBgPreset: (id) => update({ bgPreset: id }),
    setCustomBg: (light, dark) => update({ bgPreset: 'custom', customBgLight: light, customBgDark: dark }),
    resetTheme: () => setConfig(DEFAULT_CONFIG),
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
