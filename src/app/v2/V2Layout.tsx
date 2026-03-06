import React from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { ArrowLeftRight, ArrowUpRight, LayoutDashboard, Receipt, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useT } from '../i18n/I18nContext';
import { getV2Copy } from './copy';
import './v2.css';

function RailItem({
  to,
  label,
  icon: Icon,
  external,
}: {
  to: string;
  label: string;
  icon: React.ElementType;
  external?: boolean;
}) {
  const sharedClassName = 'v2-link-card text-sm';

  if (external) {
    return (
      <Link to={to} className={sharedClassName}>
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-white/88">
            <Icon size={18} strokeWidth={2} />
          </span>
          <span>{label}</span>
        </span>
        <ArrowUpRight size={16} className="text-white/55" />
      </Link>
    );
  }

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `${sharedClassName} ${isActive ? 'border-[#f8ac75]/25 bg-white/[0.07]' : ''}`
      }
    >
      <span className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-white/88">
          <Icon size={18} strokeWidth={2} />
        </span>
        <span>{label}</span>
      </span>
      <span className="v2-chip v2-chip-cool">v2</span>
    </NavLink>
  );
}

export function V2Layout() {
  const location = useLocation();
  const { groupName, members, expenses, totalSpent, fmt } = useApp();
  const { locale, t } = useT();
  const copy = getV2Copy(locale);

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

          <div className="space-y-3">
            <div>
              <p className="v2-kicker mb-3">{copy.overview}</p>
              <RailItem to="/v2/dashboard" label={copy.overview} icon={LayoutDashboard} />
            </div>

            <div className="pt-2">
              <p className="v2-kicker mb-3">{copy.currentApp}</p>
              <div className="space-y-2">
                <RailItem to="/app/dashboard" label={copy.currentDashboard} icon={LayoutDashboard} external />
                <RailItem to="/app/expenses" label={t.nav.expenseRecords} icon={Receipt} external />
                <RailItem to="/app/settlement" label={t.nav.settlement} icon={ArrowLeftRight} external />
                <RailItem to="/app/members" label={t.nav.members} icon={Users} external />
              </div>
            </div>
          </div>
        </div>

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
      </aside>

      <div className="v2-stage">
        <header className="v2-mobile-head lg:hidden">
          <div className="min-w-0">
            <p className="v2-kicker">{copy.previewBadge}</p>
            <p className="truncate text-base font-black text-white/92">{groupName || t.nav.appName}</p>
          </div>
          <Link to="/app/dashboard" className="v2-action-button text-sm">
            <ArrowUpRight size={15} strokeWidth={2.2} />
            v1
          </Link>
        </header>

        <main className="v2-main">
          <div key={location.pathname}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
