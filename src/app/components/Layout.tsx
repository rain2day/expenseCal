import React, { useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate, Outlet } from 'react-router';
import {
  Home, Receipt, ArrowLeftRight, Users,
  Settings, BarChart2, Plus, ScanLine,
  BookOpen,
} from 'lucide-react';
import { ToastContainer } from './SharedComponents';
import { RandomGeoBackground } from './RandomGeoBackground';
import { useApp } from '../context/AppContext';
import { useT } from '../i18n/I18nContext';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { AddExpense } from '../screens/AddExpense';
import { Translations } from '../i18n/types';

function getBottomNav(t: Translations) {
  return [
    { to: '/app/dashboard',   icon: Home,           label: t.nav.home },
    { to: '/app/expenses',    icon: Receipt,        label: t.nav.expenses },
    { to: '/app/settlement',  icon: ArrowLeftRight, label: t.nav.settlement },
    { to: '/app/analytics',   icon: BarChart2,      label: t.nav.analytics },
    { to: '/app/members',     icon: Users,          label: t.nav.members },
    { to: '/app/settings',    icon: Settings,       label: t.nav.settings },
  ];
}

function getSidebarNav(t: Translations) {
  return [
    { to: '/app/dashboard',  icon: Home,           label: t.nav.home },
    { to: '/app/expenses',   icon: Receipt,        label: t.nav.expenseRecords },
    { to: '/app/settlement', icon: ArrowLeftRight, label: t.nav.settlement },
    { to: '/app/analytics',  icon: BarChart2,      label: t.nav.analytics },
    { to: '/app/members',    icon: Users,          label: t.nav.members },
    { to: '/app/scan',       icon: ScanLine,       label: t.nav.scanReceipt },
    { to: '/app/settings',   icon: Settings,       label: t.nav.settings },
    { to: '/components',     icon: BookOpen,       label: t.nav.components },
  ];
}

function NeuTab({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);

  return (
    <NavLink
      to={to}
      className="flex flex-col items-center gap-0.5 min-w-[52px] relative"
    >
      <motion.div
        className={`p-2 neu-tab ${isActive ? 'neu-tab-active bg-accent-bg' : ''}`}
        whileTap={isActive ? {} : { scale: 0.88 }}
        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
      >
        {isActive && (
          <motion.div
            layoutId="nav-indicator"
            className="absolute inset-0 rounded-[var(--neu-radius)] bg-accent-bg neu-tab-active"
            transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.8 }}
            style={{ zIndex: -1 }}
          />
        )}
        <Icon
          size={20}
          strokeWidth={isActive ? 2.5 : 2}
          className={isActive ? 'text-primary' : 'text-subtle'}
        />
      </motion.div>
      <span className={`text-[10px] font-medium ${isActive ? 'text-primary' : 'text-subtle'}`}>
        {label}
      </span>
    </NavLink>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { groupName } = useApp();
  const { t, locale } = useT();
  const showFAB = !location.pathname.startsWith('/components');
  const BOTTOM_NAV = getBottomNav(t);
  const SIDEBAR_NAV = getSidebarNav(t);
  const leftNav = BOTTOM_NAV.slice(0, 3);
  const rightNav = BOTTOM_NAV.slice(3);

  // AddExpense is a full-screen fixed overlay with its own slide-up animation.
  // It CANNOT live inside AnimatePresence — the parent motion.div's opacity:0
  // makes fixed-position children invisible (confirmed via DOM inspection).
  // Solution: render AddExpense as a sibling OUTSIDE <main>, and keep the
  // underlying page visible by freezing the AnimatePresence key.
  const isAddExpense = location.pathname === '/app/add-expense';
  // Full-screen overlay routes that should hide bottom nav & FAB
  const isFullOverlay = isAddExpense || location.pathname.startsWith('/app/group-buy');
  const prevPageRef = useRef(location.pathname);
  // Remember last "real" page path (anything except add-expense)
  if (!isAddExpense) prevPageRef.current = location.pathname;

  return (
    <div className="bg-transparent min-h-screen flex overflow-hidden max-w-[100vw]">
      {/* ── Random Geometric Background Layer ──────────────────── */}
      <RandomGeoBackground />

      {/* ── Desktop Sidebar ─────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-60 bg-sidebar border-r border-border fixed top-0 left-0 h-full z-30">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}icon-dark.svg`} alt="app icon" className="w-9 h-9 rounded-xl shadow" />
            <div>
              <p className="font-black text-sm text-foreground">{t.nav.appName}</p>
              <p className="text-xs text-muted-foreground truncate max-w-[120px]">{groupName}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {SIDEBAR_NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all
                ${isActive
                  ? 'bg-accent-bg text-primary font-bold'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`
              }
            >
              <Icon size={17} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Add button */}
        <div className="px-4 py-4 border-t border-border">
          <NavLink
            to="/app/add-expense"
            className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl py-3 flex items-center justify-center gap-2 font-bold transition-colors shadow-lg shadow-primary/25 active:scale-95"
          >
            <Plus size={17} strokeWidth={2.5} />
            {t.nav.addExpense}
          </NavLink>
        </div>
      </aside>

      {/* ── Main Content ───────────────────────────────────────────── */}
      <ScrollToTop />
      <main className="flex-1 lg:ml-60 pb-[72px] lg:pb-6 min-h-screen w-full min-w-0 overflow-hidden">
        <div key={location.pathname} className="h-full w-full overflow-x-hidden">
          {!isAddExpense && <Outlet />}
        </div>
      </main>

      {/* ── AddExpense Overlay (OUTSIDE main/AnimatePresence) ──────── */}
      <AnimatePresence>
        {isAddExpense && <AddExpense key="add-expense-overlay" />}
      </AnimatePresence>

      {/* ── Mobile Bottom Nav ──────────────────────────────────────── */}
      {!isFullOverlay && (
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-sidebar neu-nav-bar flex items-center justify-around px-1"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)', paddingTop: '10px' }}
      >
        <LayoutGroup>
          <div className="w-full max-w-2xl mx-auto flex items-end">
            <div className="flex-1 flex items-center justify-around">
              {leftNav.map((item) => (
                <NeuTab key={item.to} {...item} />
              ))}
            </div>
            <div className="w-[84px] shrink-0 pointer-events-none" aria-hidden />
            <div className="flex-1 flex items-center justify-around">
              {rightNav.map((item) => (
                <NeuTab key={item.to} {...item} />
              ))}
            </div>
          </div>
        </LayoutGroup>
      </nav>
      )}

      {/* ── FAB (mobile only) ─────────────────────────────────────── */}
      {showFAB && !isFullOverlay && (
        <button
          type="button"
          aria-label={t.nav.addExpense}
          onClick={() => navigate('/app/add-expense')}
          className="lg:hidden fixed z-40 rounded-full bg-primary text-white flex items-center justify-center border border-white/24 active:bg-primary/90 active:scale-90 transition-transform"
          style={{
            bottom: 'calc(max(env(safe-area-inset-bottom, 0px), 8px) + 14px)',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '68px',
            height: '68px',
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation',
            boxShadow: '0 12px 30px rgba(221,132,60,0.46), 0 2px 10px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.34)',
          }}
        >
          <Plus size={30} strokeWidth={2.5} />
        </button>
      )}

      <ToastContainer />
    </div>
  );
}
