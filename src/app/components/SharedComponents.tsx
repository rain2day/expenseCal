import React, { useEffect, useRef, useState } from 'react';
import {
  Utensils, Train, BedDouble, Ticket, ShoppingBag, Package,
  CheckCircle2, XCircle, Info,
} from 'lucide-react';
import { Member, CategoryType, CATEGORY_CONFIG } from '../data/sampleData';
import { useApp } from '../context/AppContext';
import { useT } from '../i18n/I18nContext';
import { hapticLight } from '../hooks/useHaptic';
import { motion, AnimatePresence } from 'motion/react';

// ── Category Icon Map ─────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  Utensils, Train, BedDouble, Ticket, ShoppingBag, Package,
};

// ── MemberAvatar ──────────────────────────────────────────────────────────────
interface AvatarProps {
  member: Member;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  checked?: boolean;
  onClick?: () => void;
  stacked?: boolean;
}

const AVATAR_SIZES = {
  sm:  'w-8 h-8 text-xs',
  md:  'w-10 h-10 text-sm',
  lg:  'w-12 h-12 text-base',
  xl:  'w-16 h-16 text-xl',
};

export function MemberAvatar({ member, size = 'md', checked, onClick, stacked }: AvatarProps) {
  return (
    <button
      onClick={onClick ? () => { hapticLight(); onClick(); } : undefined}
      disabled={!onClick}
      className={`relative flex-shrink-0 rounded-full flex items-center justify-center font-bold text-white select-none
        ${AVATAR_SIZES[size]}
        ${stacked ? '-ml-2 first:ml-0 ring-2 ring-background' : ''}
        ${onClick ? 'cursor-pointer active:scale-95 transition-transform' : 'cursor-default'}
      `}
      style={{ background: member.color }}
    >
      <span style={{ fontFamily: 'Noto Sans TC, sans-serif' }}>{member.initials}</span>
      {checked !== undefined && (
        <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px]
          ${checked ? 'bg-primary' : 'bg-switch-background'}`}
        >
          {checked ? '✓' : ''}
        </span>
      )}
    </button>
  );
}

// ── AvatarGroup ────────────────────────────────────────────────────────────────
export function AvatarGroup({ members, max = 5 }: { members: Member[]; max?: number }) {
  const visible = members.slice(0, max);
  const rest = members.length - max;
  return (
    <div className="flex items-center">
      {visible.map((m, i) => (
        <div
          key={m.id}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ring-2 ring-background"
          style={{ background: m.color, marginLeft: i === 0 ? 0 : -8, zIndex: i }}
        >
          {m.initials}
        </div>
      ))}
      {rest > 0 && (
        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs text-muted-foreground font-bold ring-2 ring-background"
          style={{ marginLeft: -8 }}>
          +{rest}
        </div>
      )}
    </div>
  );
}

// ── CategoryBadge ─────────────────────────────────────────────────────────────
export function CategoryBadge({ category, selected, onClick }: { category: CategoryType; selected?: boolean; onClick?: () => void }) {
  const cfg = CATEGORY_CONFIG[category];
  const { t } = useT();
  const IconComp = ICON_MAP[cfg.iconKey] ?? Package;
  return (
    <motion.button
      onClick={onClick ? () => { hapticLight(); onClick(); } : undefined}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'tween', duration: 0.15 }}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all
        ${selected
          ? 'text-white shadow-md'
          : 'bg-secondary text-muted-foreground'
        }`}
      style={selected ? { background: cfg.color } : {}}
    >
      <IconComp size={13} strokeWidth={2} />
      <span>{t.categories[category]}</span>
    </motion.button>
  );
}

// ── CategoryIcon ──────────────────────────────────────────────────────────────
export function CategoryIcon({ category, size = 'md' }: { category: CategoryType; size?: 'sm' | 'md' | 'lg' }) {
  const cfg = CATEGORY_CONFIG[category];
  const IconComp = ICON_MAP[cfg.iconKey] ?? Package;
  const sizeMap = {
    sm: { wrap: 'w-8 h-8',   icon: 14 },
    md: { wrap: 'w-10 h-10', icon: 16 },
    lg: { wrap: 'w-12 h-12', icon: 20 },
  };
  const s = sizeMap[size];
  return (
    <div
      className={`${s.wrap} rounded-xl flex items-center justify-center flex-shrink-0`}
      style={{ background: cfg.bg }}
    >
      <IconComp size={s.icon} strokeWidth={2} style={{ color: cfg.color } as React.CSSProperties} />
    </div>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────
export function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-card rounded-2xl p-4 border border-border">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="tabular-nums font-bold text-base" style={{ color: accent || 'var(--foreground)' }}>
        {value}
      </p>
    </div>
  );
}

// ── BalanceBadge ──────────────────────────────────────────────────────────────
export function BalanceBadge({ amount }: { amount: number }) {
  const { fmt } = useApp();
  const isPos = amount > 0;
  const isNeg = amount < 0;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold tabular-nums whitespace-nowrap
      ${isPos ? 'bg-success-bg text-success' : isNeg ? 'bg-destructive/20 text-destructive' : 'bg-secondary text-muted-foreground'}`}>
      {isPos ? '+' : ''}{fmt(amount)}
    </span>
  );
}

// ── RoleBadge ─────────────────────────────────────────────────────────────────
export function RoleBadge({ role }: { role: 'admin' | 'member' }) {
  const { t } = useT();
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs
      ${role === 'admin' ? 'bg-accent-bg text-primary' : 'bg-secondary text-muted-foreground'}`}>
      {role === 'admin' ? t.members.admin : t.members.member}
    </span>
  );
}

// ── CountUp ───────────────────────────────────────────────────────────────────
export function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [target, duration]);

  return value;
}

// ── DonutGauge ────────────────────────────────────────────────────────────────
export function DonutGauge({ percentage }: { percentage: number }) {
  const [current, setCurrent] = useState(0);
  const { t } = useT();
  const R = 70;
  const circumference = 2 * Math.PI * R;
  const color = current > 50 ? '#72A857' : current > 20 ? '#C8914A' : '#D05242';
  const offset = circumference - (current / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setCurrent(percentage), 200);
    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div className="flex flex-col items-center">
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r={R} fill="none" stroke="var(--switch-background)" strokeWidth="14" />
        <circle
          cx="90" cy="90" r={R}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 90 90)"
          style={{ transition: 'stroke-dashoffset 1.5s ease-out, stroke 0.8s' }}
        />
        <text x="90" y="84" textAnchor="middle" fontSize="30" fontWeight="800" fill={color}>{current}%</text>
        <text x="90" y="105" textAnchor="middle" fontSize="12" fill="var(--muted-foreground)">{t.dashboard.fundHealthLabel}</text>
      </svg>
    </div>
  );
}

// ── ToastContainer ────────────────────────────────────────────────────────────
export function ToastContainer() {
  const { toasts } = useApp();
  return (
    <div className="fixed bottom-24 right-3 z-[9999] flex flex-col gap-2 pointer-events-none md:bottom-6">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22, mass: 0.8 }}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm pointer-events-auto min-w-[200px]
              ${t.type === 'success' ? 'bg-success' : t.type === 'error' ? 'bg-destructive' : 'bg-primary'}`}
          >
            {t.type === 'success' ? <CheckCircle2 size={16} /> : t.type === 'error' ? <XCircle size={16} /> : <Info size={16} />}
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── BudgetBar ─────────────────────────────────────────────────────────────────
export function BudgetBar({ spent, budget }: { spent: number; budget: number }) {
  const { fmt } = useApp();
  const { t } = useT();
  const pct = Math.min((spent / budget) * 100, 100);
  const color = pct < 60 ? '#DD843C' : pct < 85 ? '#C8914A' : '#D05242';
  const remaining = budget - spent;
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-muted-foreground">{t.dashboard.usedLabel} {fmt(spent)}</span>
        <span className="text-xs text-muted-foreground">{fmt(budget)}</span>
      </div>
      <div className="h-2 bg-switch-background rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs" style={{ color }}>{t.dashboard.usedPercent(Math.round(pct))}</span>
        <span className={`text-xs ${remaining >= 0 ? 'text-success' : 'text-destructive'}`}>
          {remaining >= 0 ? t.dashboard.remaining : t.dashboard.overspent} {fmt(Math.abs(remaining))}
        </span>
      </div>
    </div>
  );
}

// ── SkeletonRow ───────────────────────────────────────────────────────────────
export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="w-10 h-10 rounded-full bg-secondary animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-secondary rounded animate-pulse w-3/4" />
        <div className="h-2 bg-secondary rounded animate-pulse w-1/2" />
      </div>
      <div className="h-4 bg-secondary rounded animate-pulse w-16" />
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle, cta, onCta }: {
  icon: React.ReactNode; title: string; subtitle?: string; cta?: string; onCta?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4 text-muted-foreground">
        {icon}
      </div>
      <p className="font-bold text-foreground mb-1">{title}</p>
      {subtitle && <p className="text-sm text-muted-foreground mb-6">{subtitle}</p>}
      {cta && onCta && (
        <button onClick={onCta}
          className="bg-primary text-white px-6 py-3 rounded-xl text-sm font-bold glass-btn">
          {cta}
        </button>
      )}
    </div>
  );
}

// ── Stagger Animation (fast subtle fade-up) ──────────────────────────────────
const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.035,
      delayChildren: 0,
    },
  },
};

const staggerItem = {
  initial: { y: 6 },
  animate: {
    y: 0,
    transition: {
      type: 'spring' as const,
      damping: 20,
      mass: 0.4,
      stiffness: 300,
    },
  },
};

export function StaggerContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}
