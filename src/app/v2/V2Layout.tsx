import React from 'react';
import { AnimatePresence } from 'motion/react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  ArrowLeftRight,
  ArrowUpRight,
  BarChart2,
  Home,
  LayoutDashboard,
  Plus,
  Receipt,
  ScanLine,
  Settings,
  Users,
} from 'lucide-react';
import { ToastContainer } from '../components/SharedComponents';
import { useApp } from '../context/AppContext';
import { useT } from '../i18n/I18nContext';
import { useAppPaths } from '../routing/appPaths';
import { AddExpenseV2 } from './AddExpenseV2';
import { getV2Copy } from './copy';
import './v2.css';

type NavItem = {
  to: string;
  label: string;
  icon: React.ElementType;
};

function RailItem({
  item,
  chip,
  external,
}: {
  item: NavItem;
  chip?: string;
  external?: boolean;
}) {
  const sharedClassName = 'v2-link-card text-sm';
  const content = (
    <>
      <span className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-white/88">
          <item.icon size={18} strokeWidth={2} />
        </span>
        <span>{item.label}</span>
      </span>
      {external ? (
        <ArrowUpRight size={16} className="text-white/55" />
      ) : (
        <span className="v2-chip v2-chip-cool">{chip ?? 'v2'}</span>
      )}
    </>
  );

  if (external) {
    return (
      <Link to={item.to} className={sharedClassName}>
        {content}
      </Link>
    );
  }

  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `${sharedClassName} ${isActive ? 'border-[#f8ac75]/25 bg-white/[0.07]' : ''}`
      }
    >
      {content}
    </NavLink>
  );
}

function BottomNavItem({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `v2-bottom-item ${isActive ? 'v2-bottom-item-active' : ''}`
      }
    >
      <item.icon size={18} strokeWidth={2.1} />
      <span>{item.label}</span>
    </NavLink>
  );
}

export function V2Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { groupName, members, expenses, totalSpent, fmt } = useApp();
  const { locale, t } = useT();
  const { appPath, v1Path } = useAppPaths();
  const copy = getV2Copy(locale);

  const primaryNav: NavItem[] = [
    { to: appPath('/dashboard'), label: t.nav.home, icon: Home },
    { to: appPath('/expenses'), label: t.nav.expenseRecords, icon: Receipt },
    { to: appPath('/settlement'), label: t.nav.settlement, icon: ArrowLeftRight },
    { to: appPath('/analytics'), label: t.nav.analytics, icon: BarChart2 },
    { to: appPath('/members'), label: t.nav.members, icon: Users },
    { to: appPath('/scan'), label: t.nav.scanReceipt, icon: ScanLine },
    { to: appPath('/settings'), label: t.nav.settings, icon: Settings },
  ];

  const compareNav: NavItem[] = [
    { to: v1Path('/dashboard'), label: copy.currentDashboard, icon: LayoutDashboard },
    { to: v1Path('/expenses'), label: t.nav.expenseRecords, icon: Receipt },
    { to: v1Path('/settlement'), label: t.nav.settlement, icon: ArrowLeftRight },
    { to: v1Path('/members'), label: t.nav.members, icon: Users },
  ];

  const bottomNav = [
    { to: appPath('/dashboard'), label: t.nav.home, icon: Home },
    { to: appPath('/expenses'), label: t.nav.expenses, icon: Receipt },
    { to: appPath('/settlement'), label: t.nav.settlement, icon: ArrowLeftRight },
    { to: appPath('/analytics'), label: t.nav.analytics, icon: BarChart2 },
    { to: appPath('/members'), label: t.nav.members, icon: Users },
    { to: appPath('/settings'), label: t.nav.settings, icon: Settings },
  ];

  const isAddExpense = location.pathname === appPath('/add-expense');
  const isFullOverlay = isAddExpense || location.pathname.startsWith(appPath('/group-buy'));

  return (
    <div className="v2-shell">
      <aside className="v2-rail hidden lg:flex lg:flex-col lg:justify-between">
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img
                src={`${import.meta.env.BASE_URL}icon-dark.svg`}
                alt="ExpenseCal"
                className="h-11 w-11 rounded-2xl border border-white/10 shadow-lg"
              />
              <div className="min-w-0">
                <p className="text-sm font-black tracking-[0.18em] text-white/92 uppercase">ExpenseCal</p>
                <p className="text-sm text-white/56">{copy.currentGroup}</p>
              </div>
            </div>

            <div className="v2-panel p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="v2-chip v2-chip-warm">{copy.previewBadge}</span>
                <span className="v2-chip">{copy.overview}</span>
              </div>
              <p className="mt-4 text-base font-bold text-white/92">{groupName || t.nav.appName}</p>
              <p className="mt-1 text-sm text-white/58">{copy.groupMeta(members.length, expenses.length)}</p>
              <p className="mt-4 text-sm leading-6 text-white/72">{copy.previewNote}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <p className="v2-kicker mb-3">{copy.overview}</p>
              <div className="space-y-2">
                {primaryNav.map((item) => (
                  <RailItem key={item.to} item={item} />
                ))}
              </div>
            </div>

            <div>
              <p className="v2-kicker mb-3">{copy.compareTitle}</p>
              <div className="space-y-2">
                {compareNav.map((item) => (
                  <RailItem key={item.to} item={item} external />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Link to={appPath('/add-expense')} className="v2-action-button v2-action-button-primary w-full">
            <Plus size={16} strokeWidth={2.4} />
            {t.nav.addExpense}
          </Link>

          <div className="v2-panel p-4">
            <p className="v2-kicker mb-3">{copy.budgetRunway}</p>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-2xl font-black text-white v2-number">{fmt(totalSpent)}</p>
                <p className="mt-1 text-sm text-white/58">{t.dashboard.totalSpent}</p>
              </div>
              <span className="v2-chip">{copy.groupMeta(members.length, expenses.length)}</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="v2-stage">
        <header className="v2-mobile-head lg:hidden">
          <div className="min-w-0">
            <p className="v2-kicker">{copy.previewBadge}</p>
            <p className="truncate text-base font-black text-white/92">{groupName || t.nav.appName}</p>
          </div>
          <Link to={v1Path('/dashboard')} className="v2-action-button text-sm">
            <ArrowUpRight size={15} strokeWidth={2.2} />
            v1
          </Link>
        </header>

        <main className="v2-main pb-[104px] lg:pb-10">
          {!isAddExpense && (
            <div key={location.pathname}>
              <Outlet />
            </div>
          )}
        </main>

        <AnimatePresence>
          {isAddExpense && <AddExpenseV2 key="v2-add-expense-overlay" />}
        </AnimatePresence>

        {!isFullOverlay && (
          <nav className="v2-mobile-nav lg:hidden">
            {bottomNav.map((item) => (
              <BottomNavItem key={item.to} item={item} />
            ))}
          </nav>
        )}

        {!isFullOverlay && (
          <button
            type="button"
            aria-label={t.nav.addExpense}
            onClick={() => navigate(appPath('/add-expense'))}
            className="v2-mobile-fab lg:hidden"
          >
            <Plus size={28} strokeWidth={2.5} />
          </button>
        )}

        <ToastContainer />
      </div>
    </div>
  );
}
