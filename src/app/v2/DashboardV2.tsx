import React, { useMemo } from 'react';
import { Link } from 'react-router';
import {
  ArrowLeftRight,
  ArrowUpRight,
  BellRing,
  ChartNoAxesColumn,
  CircleAlert,
  Coins,
  HandCoins,
  Receipt,
  ShoppingBag,
  Users,
  Wallet,
} from 'lucide-react';
import { AvatarGroup, CategoryIcon, MemberAvatar } from '../components/SharedComponents';
import { useApp } from '../context/AppContext';
import { useT } from '../i18n/I18nContext';
import { FUND_PAYER_ID, splitAmountEvenly, type Contribution, type Expense, type Settlement } from '../data/sampleData';
import { getV2Copy } from './copy';
import { useAppPaths } from '../routing/appPaths';

type AttentionItem = {
  tone: 'warm' | 'critical' | 'calm';
  title: string;
  detail: string;
  to: string;
};

function toRecentTime(entry: { date: string; createdAt?: string }) {
  return Date.parse(entry.createdAt ?? entry.date) || 0;
}

function formatDisplayDate(dateLike: string | undefined, locale: string) {
  if (!dateLike) return '—';
  const date = new Date(dateLike.length > 10 ? dateLike : `${dateLike}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateLike;
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date);
}

function MetricCard({ label, value, note, accentClassName }: { label: string; value: string; note: string; accentClassName?: string }) {
  return (
    <div className="v2-metric-card p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-white/44">{label}</p>
      <p className={`mt-2 text-2xl font-black v2-number text-white ${accentClassName ?? ''}`}>{value}</p>
      <p className="mt-2 text-sm leading-6 text-white/58">{note}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
        <div className="v2-panel v2-panel-strong animate-pulse p-6">
          <div className="h-4 w-28 rounded-full bg-white/8" />
          <div className="mt-4 h-10 w-56 rounded-full bg-white/8" />
          <div className="mt-3 h-3 w-40 rounded-full bg-white/8" />
          <div className="mt-8 h-3 w-full rounded-full bg-white/8" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-28 rounded-[22px] bg-white/6" />
            ))}
          </div>
        </div>
        <div className="grid gap-4">
          <div className="v2-panel animate-pulse p-6">
            <div className="h-5 w-36 rounded-full bg-white/8" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-20 rounded-[20px] bg-white/6" />
              ))}
            </div>
          </div>
          <div className="v2-panel animate-pulse p-6">
            <div className="h-5 w-28 rounded-full bg-white/8" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-14 rounded-[20px] bg-white/6" />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="v2-panel animate-pulse p-6">
            <div className="h-5 w-32 rounded-full bg-white/8" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, row) => (
                <div key={row} className="h-16 rounded-[18px] bg-white/6" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardV2() {
  const {
    groupName,
    members,
    expenses,
    balances,
    contributions,
    settlements,
    totalSpent,
    totalContributions,
    fundSpent,
    fundBalance,
    budget,
    isLoading,
    fmt,
    getMember,
  } = useApp();
  const { locale, t } = useT();
  const { appPath, v1Path } = useAppPaths();
  const copy = getV2Copy(locale);

  const localeTag = locale === 'zh' ? 'zh-HK' : locale === 'ja' ? 'ja-JP' : 'en-US';

  const sortedExpenses = useMemo(
    () => [...expenses].sort((a, b) => toRecentTime(b) - toRecentTime(a)),
    [expenses],
  );
  const sortedContributions = useMemo(
    () => [...contributions].sort((a, b) => toRecentTime(b) - toRecentTime(a)),
    [contributions],
  );
  const pendingSettlements = useMemo(
    () => settlements.filter((item) => !item.done).sort((a, b) => b.amount - a.amount),
    [settlements],
  );

  const heroBase = budget > 0 ? budget : totalContributions;
  const budgetPct = heroBase > 0 ? Math.min(100, Math.round((totalSpent / heroBase) * 100)) : 0;
  const fundPct = totalContributions > 0 ? Math.min(100, Math.round((fundSpent / totalContributions) * 100)) : 0;
  const fundRemainingPct = totalContributions > 0
    ? Math.max(0, Math.round((fundBalance / totalContributions) * 100))
    : 0;
  const remainingBudget = heroBase - totalSpent;
  const memberAdvance = Math.max(totalSpent - fundSpent, 0);
  const pendingSettlementAmount = pendingSettlements.reduce((sum, item) => sum + item.amount, 0);
  const latestExpense = sortedExpenses[0];
  const biggestExpense = [...expenses].sort((a, b) => b.amount - a.amount)[0];
  const latestTopUp = sortedContributions[0];
  const topContributor = [...balances].sort((a, b) => b.contributed - a.contributed)[0];
  const receiveList = [...balances].filter((item) => item.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 4);
  const payList = [...balances].filter((item) => item.balance < 0).sort((a, b) => a.balance - b.balance).slice(0, 4);

  const contributionTotals = useMemo(() => {
    const latestByMember = new Map<string, Contribution>();
    for (const item of sortedContributions) {
      if (!latestByMember.has(item.memberId)) latestByMember.set(item.memberId, item);
    }
    return [...balances]
      .filter((item) => item.contributed > 0)
      .sort((a, b) => b.contributed - a.contributed)
      .slice(0, 5)
      .map((item) => ({
        member: item.member,
        total: item.contributed,
        latest: latestByMember.get(item.member.id),
      }));
  }, [balances, sortedContributions]);

  const attentionItems: AttentionItem[] = useMemo(() => {
    const items: AttentionItem[] = [];

    if (fundBalance < 0) {
      items.push({
        tone: 'critical',
        title: copy.fundNegative,
        detail: copy.fundNegativeDetail,
        to: appPath('/settlement'),
      });
    } else if (totalContributions > 0 && fundBalance <= totalContributions * 0.35) {
      items.push({
        tone: 'warm',
        title: copy.fundLow,
        detail: copy.fundLowDetail,
        to: appPath('/settlement'),
      });
    }

    if (pendingSettlements.length > 0) {
      items.push({
        tone: 'calm',
        title: copy.pendingTransfers,
        detail: copy.pendingTransfersDetail,
        to: appPath('/settlement'),
      });
    }

    if (memberAdvance > 0) {
      items.push({
        tone: 'warm',
        title: copy.memberAdvance,
        detail: copy.memberAdvanceDetail,
        to: appPath('/settlement'),
      });
    }

    if (expenses.length === 0) {
      items.push({
        tone: 'calm',
        title: copy.addFirstExpense,
        detail: copy.addFirstExpenseDetail,
        to: appPath('/add-expense'),
      });
    }

    return items.slice(0, 3);
  }, [appPath, copy, expenses.length, fundBalance, memberAdvance, pendingSettlements.length, totalContributions]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
        <article className="v2-panel v2-panel-strong p-6 md:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="v2-kicker">{copy.budgetRunway}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <h1 className="min-w-0 text-3xl font-black text-white md:text-[2.55rem]">{groupName}</h1>
                <span className="v2-chip v2-chip-warm">{copy.previewBadge}</span>
              </div>
              <p className="mt-2 text-sm text-white/62">{copy.groupMeta(members.length, expenses.length)}</p>
            </div>

            <div className="flex flex-col items-start gap-3 sm:items-end">
              <AvatarGroup members={members} max={7} />
              <div className="flex flex-wrap gap-2">
                <span className="v2-chip">
                  <Wallet size={14} strokeWidth={2} />
                  {t.dashboard.fundBalance} {fmt(fundBalance)}
                </span>
                <span className="v2-chip v2-chip-cool">
                  <Receipt size={14} strokeWidth={2} />
                  {t.dashboard.expenseCount} {t.dashboard.nItems(expenses.length)}
                </span>
              </div>
            </div>
          </div>

          <div className="v2-soft-card mt-6 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm text-white/58">{heroBase > 0 ? t.dashboard.usedLabel : t.dashboard.totalSpent}</p>
                <div className="mt-2 flex flex-wrap items-end gap-3">
                  <p className="text-4xl font-black text-white v2-number">{fmt(totalSpent)}</p>
                  {heroBase > 0 && (
                    <p className="pb-1 text-sm text-white/58">
                      {remainingBudget >= 0
                        ? `${fmt(remainingBudget)} ${t.dashboard.remaining.toLowerCase()}`
                        : `${fmt(Math.abs(remainingBudget))} ${t.dashboard.overspent.toLowerCase()}`}
                    </p>
                  )}
                </div>
              </div>

              {heroBase > 0 && (
                <div className="min-w-[180px]">
                  <div className="flex items-center justify-between text-sm text-white/58">
                    <span>{heroBase === budget ? copy.budgetRunway : t.dashboard.fund}</span>
                    <span className="v2-number">{budgetPct}%</span>
                  </div>
                  <div className="v2-rail-progress mt-3">
                    <span style={{ width: `${budgetPct}%` }} />
                  </div>
                  <p className="mt-3 text-sm text-white/58">
                    {fmt(totalSpent)} / {fmt(heroBase)}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label={t.dashboard.fundBalance}
              value={fmt(fundBalance)}
              note={fundBalance >= 0 ? `${fundRemainingPct}% ${t.dashboard.remaining.toLowerCase()}` : t.dashboard.overspent}
              accentClassName={fundBalance >= 0 ? 'v2-balance-positive' : 'v2-balance-negative'}
            />
            <MetricCard
              label={copy.fundUsed}
              value={fmt(fundSpent)}
              note={`${fundPct}% ${t.dashboard.usedLabel.toLowerCase()}`}
            />
            <MetricCard
              label={t.dashboard.advanceTotal}
              value={fmt(memberAdvance)}
              note={memberAdvance > 0 ? copy.memberAdvance : copy.allClear}
              accentClassName={memberAdvance > 0 ? 'text-[#f8ac75]' : 'v2-balance-positive'}
            />
            <MetricCard
              label={copy.pendingTransfers}
              value={fmt(pendingSettlementAmount)}
              note={pendingSettlements.length > 0 ? `${pendingSettlements.length} ${t.common.items}` : copy.noPendingTransfers}
              accentClassName={pendingSettlements.length > 0 ? 'text-[#a3acff]' : 'v2-balance-positive'}
            />
          </div>
        </article>

        <div className="grid gap-4">
          <article className="v2-panel p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="v2-kicker">{copy.needsAttention}</p>
                <h2 className="mt-2 text-xl font-black text-white">{copy.needsAttention}</h2>
              </div>
              <span className="v2-chip v2-chip-cool">
                <BellRing size={14} strokeWidth={2.2} />
                {attentionItems.length || 0}
              </span>
            </div>

            {attentionItems.length === 0 ? (
              <div className="v2-soft-card mt-5 p-5">
                <p className="text-base font-bold text-white">{copy.allClear}</p>
                <p className="mt-2 text-sm leading-6 text-white/62">{copy.allClearDetail}</p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {attentionItems.map((item, index) => {
                  const toneClass =
                    item.tone === 'critical'
                      ? 'border-[#ff8c7d]/22 bg-[#ff8c7d]/8'
                      : item.tone === 'warm'
                        ? 'border-[#f8ac75]/18 bg-[#f8ac75]/8'
                        : 'border-[#a3acff]/18 bg-[#a3acff]/8';
                  return (
                    <Link key={`${item.title}-${index}`} to={item.to} className={`v2-link-card ${toneClass}`}>
                      <span className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/6 text-white/88">
                          <CircleAlert size={17} strokeWidth={2.2} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-bold text-white">{item.title}</span>
                          <span className="mt-1 block text-sm leading-6 text-white/62">{item.detail}</span>
                        </span>
                      </span>
                      <ArrowUpRight size={16} className="shrink-0 text-white/50" />
                    </Link>
                  );
                })}
              </div>
            )}

            <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <Link to={appPath('/settlement')} className="v2-action-button v2-action-button-primary">
                <ArrowLeftRight size={15} strokeWidth={2.2} />
                {t.dashboard.viewSettlement}
              </Link>
              <Link to={appPath('/expenses')} className="v2-action-button">
                <Receipt size={15} strokeWidth={2.2} />
                {t.nav.expenses}
              </Link>
              <Link to={appPath('/members')} className="v2-action-button">
                <Users size={15} strokeWidth={2.2} />
                {t.nav.members}
              </Link>
              <Link to={appPath('/group-buy')} className="v2-action-button">
                <ShoppingBag size={15} strokeWidth={2.2} />
                {t.groupBuy.title}
              </Link>
            </div>
          </article>

          <article className="v2-panel p-6">
            <p className="v2-kicker">{copy.snapshot}</p>
            <h2 className="mt-2 text-xl font-black text-white">{copy.snapshot}</h2>

            <div className="mt-5 space-y-3">
              <div className="v2-list-row">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/6 text-white/88">
                  <ChartNoAxesColumn size={18} strokeWidth={2.1} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-[0.14em] text-white/42">{copy.biggestExpense}</p>
                  <p className="mt-1 truncate text-sm font-bold text-white">
                    {biggestExpense?.description ?? '—'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-white v2-number">{biggestExpense ? fmt(biggestExpense.amount) : '—'}</p>
                  <p className="mt-1 text-xs text-white/48">
                    {formatDisplayDate(biggestExpense?.date, localeTag)}
                  </p>
                </div>
              </div>

              <div className="v2-list-row">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/6 text-white/88">
                  <Coins size={18} strokeWidth={2.1} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-[0.14em] text-white/42">{copy.latestTopUp}</p>
                  <p className="mt-1 truncate text-sm font-bold text-white">
                    {latestTopUp ? getMember(latestTopUp.memberId)?.name ?? t.common.unknown : copy.noTopUps}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-white v2-number">{latestTopUp ? fmt(latestTopUp.amount) : '—'}</p>
                  <p className="mt-1 text-xs text-white/48">
                    {formatDisplayDate(latestTopUp?.date, localeTag)}
                  </p>
                </div>
              </div>

              <div className="v2-list-row">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/6 text-white/88">
                  <HandCoins size={18} strokeWidth={2.1} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-[0.14em] text-white/42">{copy.topContributor}</p>
                  <p className="mt-1 truncate text-sm font-bold text-white">{topContributor?.member.name ?? '—'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-white v2-number">{topContributor ? fmt(topContributor.contributed) : '—'}</p>
                  <p className="mt-1 text-xs text-white/48">{copy.compareWithV1}</p>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="v2-panel p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="v2-kicker">{t.dashboard.recentExpenses}</p>
              <h2 className="mt-2 text-xl font-black text-white">{t.dashboard.recentExpenses}</h2>
            </div>
            <Link to={appPath('/expenses')} className="v2-action-button">
              {t.dashboard.viewAll}
            </Link>
          </div>

          {sortedExpenses.length === 0 ? (
            <div className="v2-soft-card mt-5 p-5">
              <p className="text-base font-bold text-white">{t.dashboard.noExpenses}</p>
              <p className="mt-2 text-sm leading-6 text-white/62">{copy.addFirstExpenseDetail}</p>
            </div>
          ) : (
            <div className="v2-list mt-5">
              {sortedExpenses.slice(0, 5).map((expense) => {
                const payer = expense.paidBy === FUND_PAYER_ID ? null : getMember(expense.paidBy);
                const shares = Object.values(splitAmountEvenly(expense.amount, expense.splitAmong));
                const minShare = shares.length > 0 ? Math.min(...shares) : 0;
                const maxShare = shares.length > 0 ? Math.max(...shares) : 0;

                return (
                  <div key={expense.id} className="v2-list-row">
                    <CategoryIcon category={expense.category} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-bold text-white">{expense.description}</p>
                        {expense.paidBy === FUND_PAYER_ID && (
                          <span className="v2-chip v2-chip-warm">{t.common.fundDeduct}</span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-white/58">
                        {expense.paidBy === FUND_PAYER_ID ? t.common.fundDeduct : `${t.common.by} ${payer?.name ?? t.common.unknown}`}
                        {' · '}
                        {t.common.splitAmong(expense.splitAmong.length)}
                        {' · '}
                        {formatDisplayDate(expense.date, localeTag)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-white v2-number">{fmt(expense.amount)}</p>
                      <p className="mt-1 text-xs text-white/48">
                        {t.common.perPerson}{' '}
                        {minShare === maxShare ? fmt(minShare) : `${fmt(minShare)} ~ ${fmt(maxShare)}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        <article className="v2-panel p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="v2-kicker">{copy.settlementQueue}</p>
              <h2 className="mt-2 text-xl font-black text-white">{copy.settlementQueue}</h2>
            </div>
            <Link to={appPath('/settlement')} className="v2-action-button">
              {t.dashboard.viewSettlement}
            </Link>
          </div>

          {pendingSettlements.length === 0 ? (
            <div className="v2-soft-card mt-5 p-5">
              <p className="text-base font-bold text-white">{copy.noPendingTransfers}</p>
              <p className="mt-2 text-sm leading-6 text-white/62">{copy.allClearDetail}</p>
            </div>
          ) : (
            <div className="v2-list mt-5">
              {pendingSettlements.slice(0, 5).map((item: Settlement) => {
                const fromIsFund = item.fromId === FUND_PAYER_ID;
                const toIsFund = item.toId === FUND_PAYER_ID;
                const fromMember = fromIsFund ? null : getMember(item.fromId);
                const toMember = toIsFund ? null : getMember(item.toId);
                return (
                  <div key={item.id} className="v2-list-row">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {fromIsFund ? (
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f8ac75]/12 text-[#f8ac75]">
                          <Wallet size={18} strokeWidth={2.1} />
                        </span>
                      ) : (
                        fromMember && <MemberAvatar member={fromMember} size="sm" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-white">
                          {fromIsFund ? t.settlement.fundAccount : fromMember?.name ?? t.common.unknown}
                        </p>
                        <p className="mt-1 text-sm text-white/54">{t.settlement.transferTo}</p>
                      </div>
                      {toIsFund ? (
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#a3acff]/12 text-[#a3acff]">
                          <Wallet size={18} strokeWidth={2.1} />
                        </span>
                      ) : (
                        toMember && <MemberAvatar member={toMember} size="sm" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">
                          {toIsFund ? t.settlement.fundAccount : toMember?.name ?? t.common.unknown}
                        </p>
                        <p className="mt-1 text-xs text-white/46">{item.done ? t.settlement.done : copy.pendingTransfers}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-white v2-number">{fmt(item.amount)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <article className="v2-panel p-6">
          <p className="v2-kicker">{copy.balanceBoard}</p>
          <h2 className="mt-2 text-xl font-black text-white">{copy.balanceBoard}</h2>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="v2-soft-card p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-white">{copy.shouldReceive}</p>
                <span className="v2-chip">{receiveList.length}</span>
              </div>
              <div className="mt-4 space-y-3">
                {receiveList.length === 0 ? (
                  <p className="text-sm text-white/58">{copy.noPendingTransfers}</p>
                ) : (
                  receiveList.map((item) => (
                    <div key={item.member.id} className="flex items-center gap-3">
                      <MemberAvatar member={item.member} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-white">{item.member.name}</p>
                        <p className="mt-1 text-xs text-white/46">
                          {t.settlement.contributed} {fmt(item.contributed)} · {t.settlement.advancedPay} {fmt(item.paid)}
                        </p>
                      </div>
                      <span className="text-sm font-black v2-number v2-balance-positive">
                        +{fmt(item.balance)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="v2-soft-card p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-white">{copy.shouldPay}</p>
                <span className="v2-chip">{payList.length}</span>
              </div>
              <div className="mt-4 space-y-3">
                {payList.length === 0 ? (
                  <p className="text-sm text-white/58">{copy.noPendingTransfers}</p>
                ) : (
                  payList.map((item) => (
                    <div key={item.member.id} className="flex items-center gap-3">
                      <MemberAvatar member={item.member} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-white">{item.member.name}</p>
                        <p className="mt-1 text-xs text-white/46">
                          {t.settlement.shouldPay} {fmt(item.shouldPay)}
                        </p>
                      </div>
                      <span className="text-sm font-black v2-number v2-balance-negative">
                        {fmt(item.balance)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </article>

        <article className="v2-panel p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="v2-kicker">{copy.topUps}</p>
              <h2 className="mt-2 text-xl font-black text-white">{copy.topUps}</h2>
            </div>
            <span className="v2-chip v2-chip-warm">
              <Coins size={14} strokeWidth={2.2} />
              {fmt(totalContributions)}
            </span>
          </div>

          {contributionTotals.length === 0 ? (
            <div className="v2-soft-card mt-5 p-5">
              <p className="text-base font-bold text-white">{copy.noTopUps}</p>
              <p className="mt-2 text-sm leading-6 text-white/62">{copy.addFirstExpenseDetail}</p>
            </div>
          ) : (
            <div className="v2-list mt-5">
              {contributionTotals.map((item) => (
                <div key={item.member.id} className="v2-list-row">
                  <MemberAvatar member={item.member} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{item.member.name}</p>
                    <p className="mt-1 text-sm text-white/54">
                      {copy.latest}{' '}
                      {item.latest ? formatDisplayDate(item.latest.date, localeTag) : '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-white v2-number">{fmt(item.total)}</p>
                    <p className="mt-1 text-xs text-white/46">{copy.topContributor}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="v2-panel p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="v2-kicker">{copy.compareTitle}</p>
              <h2 className="mt-2 text-xl font-black text-white">{copy.compareTitle}</h2>
              <p className="mt-2 text-sm text-white/58">
                {copy.compareWithV1}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to={v1Path('/dashboard')} className="v2-action-button">
                <ArrowUpRight size={15} strokeWidth={2.2} />
                v1 Dashboard
              </Link>
              <Link to={appPath('/analytics')} className="v2-action-button">
                <ChartNoAxesColumn size={15} strokeWidth={2.2} />
                {t.nav.analytics}
              </Link>
            </div>
          </div>
      </section>
    </div>
  );
}
