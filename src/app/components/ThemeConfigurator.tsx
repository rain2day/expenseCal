import React, { useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import {
  useTheme,
  ACCENT_COLORS, ACCENT_SWATCHES,
  GRAY_COLORS, GRAY_SWATCHES,
  RADIUS_OPTIONS, SCALING_OPTIONS, PANEL_BG_OPTIONS,
  BG_PRESETS,
  type AccentColor, type RadiusOption, type ScalingOption, type PanelBgOption,
} from '../context/ThemeContext';
import { useApp } from '../context/AppContext';

// ── Radius visual preview ────────────────────────────────────────────────
const RADIUS_LABELS: Record<RadiusOption, string> = {
  none: '無', small: '小', medium: '中', large: '大', full: '圓',
};

const RADIUS_PREVIEW: Record<RadiusOption, string> = {
  none: 'rounded-none', small: 'rounded-sm', medium: 'rounded-md', large: 'rounded-lg', full: 'rounded-full',
};

// ── Scaling labels ────────────────────────────────────────────────────────
const SCALING_LABELS: Record<ScalingOption, string> = {
  '90%': '90%', '95%': '95%', '100%': '100%', '105%': '105%', '110%': '110%',
};

export function ThemeConfigurator() {
  const { config, setAccentColor, setCustomAccentHex, setGrayColor, setRadius, setScaling, setPanelBackground, setBgPreset, setCustomBg, resetTheme } = useTheme();
  const { darkMode, toggleDarkMode, showToast } = useApp();
  const [showCustom, setShowCustom] = useState(config.accentColor === 'custom');
  const [hexInput, setHexInput] = useState(config.customAccentHex);
  const [showCustomBg, setShowCustomBg] = useState(config.bgPreset === 'custom');
  const [bgLightInput, setBgLightInput] = useState(config.customBgLight);
  const [bgDarkInput, setBgDarkInput] = useState(config.customBgDark);

  function handleCustomHex() {
    const hex = hexInput.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      setCustomAccentHex(hex);
      showToast('success', `Accent 已設為 ${hex}`);
    } else {
      showToast('error', '請輸入有效嘅 HEX 色碼（如 #DD843C）');
    }
  }

  function handleCustomBg() {
    const light = bgLightInput.trim();
    const dark = bgDarkInput.trim();
    const hexRegex = /^#[0-9a-fA-F]{6}$/;
    if (!hexRegex.test(light) || !hexRegex.test(dark)) {
      showToast('error', '請輸入有效嘅 HEX 色碼');
      return;
    }
    setCustomBg(light, dark);
    showToast('success', '自訂背景已套用');
  }

  return (
    <div className="space-y-5">
      {/* ── Accent Color ──────────────────────────────────────────── */}
      <div>
        <p className="text-xs text-subtle uppercase tracking-wider mb-2">Accent 主色</p>
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex flex-wrap gap-2">
            {ACCENT_COLORS.map(color => (
              <button
                key={color}
                onClick={() => { setAccentColor(color); setShowCustom(false); }}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-90 ring-offset-2 ring-offset-background"
                style={{
                  background: ACCENT_SWATCHES[color],
                  boxShadow: config.accentColor === color ? `0 0 0 2px var(--background), 0 0 0 4px ${ACCENT_SWATCHES[color]}` : undefined,
                }}
                title={color}
              >
                {config.accentColor === color && (
                  <Check size={14} className="text-white drop-shadow-sm" strokeWidth={3} />
                )}
              </button>
            ))}
            {/* Custom color button */}
            <button
              onClick={() => setShowCustom(v => !v)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-transform active:scale-90 border-2 border-dashed border-muted-foreground text-muted-foreground"
              style={
                config.accentColor === 'custom'
                  ? { background: config.customAccentHex, borderStyle: 'solid', borderColor: config.customAccentHex, color: '#fff' }
                  : {}
              }
            >
              {config.accentColor === 'custom' ? <Check size={14} strokeWidth={3} /> : '#'}
            </button>
          </div>
          {/* Custom hex input */}
          {showCustom && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
              <div
                className="w-8 h-8 rounded-lg flex-shrink-0 border border-border"
                style={{ background: hexInput }}
              />
              <input
                value={hexInput}
                onChange={e => setHexInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCustomHex(); }}
                placeholder="#DD843C"
                maxLength={7}
                className="flex-1 bg-input-background rounded-lg px-3 py-1.5 text-sm text-foreground outline-none border border-border font-mono min-w-0"
              />
              <button
                onClick={handleCustomHex}
                className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg active:scale-95 transition-transform flex-shrink-0"
              >
                套用
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Background Color ────────────────────────────────────── */}
      <div>
        <p className="text-xs text-subtle uppercase tracking-wider mb-2">背景色</p>
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="grid grid-cols-3 gap-2">
            {BG_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => { setBgPreset(preset.id); setShowCustomBg(false); }}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${
                  config.bgPreset === preset.id ? 'ring-2 ring-primary bg-secondary' : 'hover:bg-secondary'
                }`}
              >
                <div
                  className="w-full h-8 rounded-lg overflow-hidden"
                  style={{ background: preset.darkGradient }}
                />
                <span className={`text-[10px] ${config.bgPreset === preset.id ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                  {preset.label}
                </span>
              </button>
            ))}
            {/* Custom bg button */}
            <button
              onClick={() => setShowCustomBg(v => !v)}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${
                config.bgPreset === 'custom' ? 'ring-2 ring-primary bg-secondary' : 'hover:bg-secondary'
              }`}
            >
              <div className="w-full h-8 rounded-lg overflow-hidden flex border-2 border-dashed border-muted-foreground">
                {config.bgPreset === 'custom' ? (
                  <>
                    <div className="flex-1" style={{ background: config.customBgLight }} />
                    <div className="flex-1" style={{ background: config.customBgDark }} />
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground text-[10px] font-bold">#</div>
                )}
              </div>
              <span className={`text-[10px] ${config.bgPreset === 'custom' ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                自訂
              </span>
            </button>
          </div>
          {/* Custom bg inputs */}
          {showCustomBg && (
            <div className="mt-3 pt-3 border-t border-border space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex-shrink-0 border border-border" style={{ background: bgLightInput }} />
                <span className="text-xs text-muted-foreground w-8 flex-shrink-0">淺色</span>
                <input
                  type="color"
                  value={bgLightInput}
                  onChange={e => setBgLightInput(e.target.value)}
                  className="w-8 h-8 rounded-lg border-0 cursor-pointer flex-shrink-0 bg-transparent"
                />
                <input
                  value={bgLightInput}
                  onChange={e => setBgLightInput(e.target.value)}
                  placeholder="#F5EEE8"
                  maxLength={7}
                  className="flex-1 bg-input-background rounded-lg px-3 py-1.5 text-sm text-foreground outline-none border border-border font-mono min-w-0"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex-shrink-0 border border-border" style={{ background: bgDarkInput }} />
                <span className="text-xs text-muted-foreground w-8 flex-shrink-0">深色</span>
                <input
                  type="color"
                  value={bgDarkInput}
                  onChange={e => setBgDarkInput(e.target.value)}
                  className="w-8 h-8 rounded-lg border-0 cursor-pointer flex-shrink-0 bg-transparent"
                />
                <input
                  value={bgDarkInput}
                  onChange={e => setBgDarkInput(e.target.value)}
                  placeholder="#3A1212"
                  maxLength={7}
                  className="flex-1 bg-input-background rounded-lg px-3 py-1.5 text-sm text-foreground outline-none border border-border font-mono min-w-0"
                />
              </div>
              <button
                onClick={handleCustomBg}
                className="w-full py-2 bg-primary text-white text-xs font-bold rounded-lg active:scale-95 transition-transform"
              >
                套用自訂背景
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Gray Color ────────────────────────────────────────────── */}
      <div>
        <p className="text-xs text-subtle uppercase tracking-wider mb-2">字體顏色</p>
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex gap-3">
            {GRAY_COLORS.map(color => (
              <button
                key={color}
                onClick={() => setGrayColor(color)}
                className="flex flex-col items-center gap-1.5 group"
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-90"
                  style={{
                    background: GRAY_SWATCHES[color],
                    boxShadow: config.grayColor === color ? `0 0 0 2px var(--background), 0 0 0 4px ${GRAY_SWATCHES[color]}` : undefined,
                  }}
                >
                  {config.grayColor === color && (
                    <Check size={14} className="text-white drop-shadow-sm" strokeWidth={3} />
                  )}
                </div>
                <span className={`text-[10px] ${config.grayColor === color ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
                  {color === 'auto' ? '自動' : color}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Appearance ────────────────────────────────────────────── */}
      <div>
        <p className="text-xs text-subtle uppercase tracking-wider mb-2">外觀</p>
        <div className="bg-card border border-border rounded-2xl p-1.5 flex gap-1.5">
          <button
            onClick={() => { if (darkMode) toggleDarkMode(); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
              !darkMode ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-secondary'
            }`}
          >
            淺色
          </button>
          <button
            onClick={() => { if (!darkMode) toggleDarkMode(); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
              darkMode ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-secondary'
            }`}
          >
            深色
          </button>
        </div>
      </div>

      {/* ── Radius ────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs text-subtle uppercase tracking-wider mb-2">圓角</p>
        <div className="bg-card border border-border rounded-2xl p-1.5 flex gap-1.5">
          {RADIUS_OPTIONS.map(r => (
            <button
              key={r}
              onClick={() => setRadius(r)}
              className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-xs transition-all ${
                config.radius === r ? 'bg-primary text-white shadow-md font-bold' : 'text-muted-foreground hover:bg-secondary'
              }`}
            >
              <div
                className={`w-6 h-6 border-2 ${RADIUS_PREVIEW[r]} ${
                  config.radius === r ? 'border-white' : 'border-muted-foreground'
                }`}
              />
              <span>{RADIUS_LABELS[r]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Scaling ───────────────────────────────────────────────── */}
      <div>
        <p className="text-xs text-subtle uppercase tracking-wider mb-2">縮放</p>
        <div className="bg-card border border-border rounded-2xl p-1.5 flex gap-1.5">
          {SCALING_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => setScaling(s)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                config.scaling === s ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-secondary'
              }`}
            >
              {SCALING_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Panel Background ──────────────────────────────────────── */}
      <div>
        <p className="text-xs text-subtle uppercase tracking-wider mb-2">面板背景</p>
        <div className="bg-card border border-border rounded-2xl p-1.5 flex gap-1.5">
          {PANEL_BG_OPTIONS.map(p => (
            <button
              key={p}
              onClick={() => setPanelBackground(p)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                config.panelBackground === p ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-secondary'
              }`}
            >
              {p === 'solid' ? '實色' : '半透明'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Reset ─────────────────────────────────────────────────── */}
      <button
        onClick={() => { resetTheme(); showToast('success', '主題已重置'); }}
        className="flex items-center justify-center gap-2 w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <RotateCcw size={14} />
        重置為預設
      </button>
    </div>
  );
}
