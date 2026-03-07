import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Funnel, Pencil, Plus, ReceiptText, Search, Trash2, Users, Wallet } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CATEGORY_CONFIG, CategoryType, FUND_PAYER_ID, splitAmountEvenly } from '../data/sampleData';
import { CategoryIcon, MemberAvatar } from '../components/SharedComponents';
import { useT } from '../i18n/I18nContext';
import { useAppPaths } from '../routing/appPaths';
import { groupExpensesByDateLabel, toRecentTime } from './helpers';
import { getV2Copy } from './copy';
import { V2EmptyState, V2List, V2ListRow, V2MetricGrid, V2PageHeader, V2Panel, V2Token } from './primitives';

const FILTER_ORDER: Array<CategoryType | 'all'> = ['all', 'food', 'transport', 'accommodation', 'tickets', 'shopping', 'other'];

export function ExpenseHistoryV2() {
  const navigate = useNavigate();
  const { locale, t } = useT();
  const { appPath } = useAppPaths();
  const { expenses, deleteExpense, showToast, getMember, fmt } = useApp();
  const copy = getV2Copy(locale);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CategoryType | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories = useMemo(
    () => FILTER_ORDER.map((key) => ({
      key,
      label: key === 'all' ? t.expenseHistory.all : t.categories[key],
    })),
    [t],
  );

  const filtered = useMemo(() => expenses.filter((expense) => {
    const matchCategory = filter === 'all' || expense.category === filter;
    const matchSearch = expense.description.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  }), [expenses, filter, search]);

  const groupedEntries = useMemo(() => {
    const groups = groupExpensesByDateLabel(filtered, {
      today: t.expenseHistory.today,
      yesterday: t.expenseHistory.yesterday,
    });

    return Object.entries(groups)
      .map(([label, items]) => [label, [...items].sort((a, b) => toRecentTime(b) - toRecentTime(a))] as const)
      .sort((a, b) => toRecentTime(b[1][0]) - toRecentTime(a[1][0]));
  }, [filtered, t]);

  const filteredTotal = filtered.reduce((sum, expense) => sum + expense.amount, 0);
  const fundTotal = filtered.filter((expense) => expense.paidBy === FUND_PAYER_ID).reduce((sum, expense) => sum + expense.amount, 0);
  const avgParticipants = filtered.length > 0
    ? Math.round(filtered.reduce((sum, expense) => sum + expense.splitAmong.length, 0) / filtered.length)
    : 0;

  const categoryBreakdown = useMemo(() => {
    const total = filtered.reduce((sum, expense) => sum + expense.amount, 0);
    if (total === 0) return [];

    const amounts = new Map<CategoryType, number>();
    filtered.forEach((expense) => {
      amounts.set(expense.category, (amounts.get(expense.category) || 0) + expense.amount);
    });

    return [...amounts.entries()]
      .map(([category, amount]) => ({
        category,
        amount,
        pct: Math.round((amount / total) * 100),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filtered]);

  const topCategory = categoryBreakdown[0];
  const largestExpenses = [...filtered].sort((a, b) => b.amount - a.amount).slice(0, 5);
  const localeTag = locale === 'zh' ? 'zh-HK' : locale === 'ja' ? 'ja-JP' : 'en-US';

  function handleDelete(id: string) {
    deleteExpense(id);
    showToast('success', t.expenseHistory.deletedExpense);
  }

  return (
    <div className="space-y-4">
      <V2PageHeader
        kicker={t.nav.expenseRecords}
        title={t.expenseHistory.title}
        description={
          expenses.length === 0
            ? t.expenseHistory.tryOther
            : `${t.expenseHistory.totalCount(filtered.length)} · ${t.expenseHistory.totalSum(fmt(filteredTotal))}`
        }
        actions={(
          <button
            type="button"
            onClick={() => navigate(appPath('/add-expense'))}
            className="v2-action-button v2-action-button-primary"
          >
            <Plus size={16} strokeWidth={2.2} />
            {t.nav.addExpense}
          </button>
        )}
        meta={(
          <>
            <V2Token tone="warm">{filter === 'all' ? t.expenseHistory.all : t.categories[filter]}</V2Token>
            <V2Token>{fmt(filteredTotal)}</V2Token>
            <V2Token tone="cool">{t.common.splitAmong(avgParticipants || 0)}</V2Token>
          </>
        )}
      />

      <V2MetricGrid
        items={[
          {
            label: t.expenseHistory.totalCount(filtered.length),
            value: fmt(filteredTotal),
            note: t.expenseHistory.totalSum(fmt(filteredTotal)),
          },
          {
            label: t.common.fund,
            value: fmt(fundTotal),
            note: t.common.fundDeduct,
          },
          {
            label: t.addExpense.participants,
            value: String(avgParticipants),
            note: t.common.splitAmong(avgParticipants),
          },
          {
            label: topCategory ? t.analytics.categoryTab : t.expenseHistory.all,
            value: topCategory ? t.categories[topCategory.category] : '-',
            note: topCategory ? `${topCategory.pct}% · ${fmt(topCategory.amount)}` : t.expenseHistory.tryOther,
          },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
        <V2Panel
          title={t.expenseHistory.title}
          eyebrow={t.nav.expenseRecords}
          action={(
            <span className="v2-chip">
              <Funnel size={14} strokeWidth={2} />
              {categories.length - 1}
            </span>
          )}
        >
          <div className="space-y-4">
            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-center gap-3 rounded-[18px] border border-white/8 bg-[rgba(8,12,24,0.58)] px-4 py-3">
                <Search size={16} className="text-white/46" strokeWidth={2} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t.expenseHistory.searchPlaceholder}
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/34"
                />
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {categories.map((category) => (
                  <button
                    key={category.key}
                    type="button"
                    onClick={() => setFilter(category.key)}
                    className={`rounded-full px-3 py-2 text-xs font-bold transition-colors ${
                      filter === category.key
                        ? 'bg-[rgba(248,172,117,0.16)] text-[rgba(255,228,210,0.96)]'
                        : 'bg-white/[0.04] text-white/56'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            {expenses.length === 0 ? (
              <V2EmptyState
                title={t.expenseHistory.title}
                detail={t.expenseHistory.tryOther}
                actionLabel={t.nav.addExpense}
                actionTo={appPath('/add-expense')}
              />
            ) : groupedEntries.length === 0 ? (
              <V2EmptyState
                title={t.expenseHistory.noResults}
                detail={t.expenseHistory.tryOther}
                actionLabel={t.nav.addExpense}
                actionTo={appPath('/add-expense')}
              />
            ) : (
              groupedEntries.map(([label, items]) => (
                <div key={label} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/38">{label}</p>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>
                  <V2List>
                    {items.map((expense) => {
                      const shares = Object.values(splitAmountEvenly(expense.amount, expense.splitAmong));
                      const minShare = shares.length ? Math.min(...shares) : 0;
                      const maxShare = shares.length ? Math.max(...shares) : 0;
                      const isFundPaid = expense.paidBy === FUND_PAYER_ID;
                      const payer = isFundPaid ? null : getMember(expense.paidBy);
                      const isExpanded = expandedId === expense.id;

                      return (
                        <V2ListRow key={expense.id} className="items-start gap-4">
                          <CategoryIcon category={expense.category} size="md" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-bold text-white">{expense.description}</p>
                              {isFundPaid ? <V2Token tone="warm">{t.common.fund}</V2Token> : null}
                              <span className="text-xs text-white/36">{expense.date}</span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/54">
                              <span>{isFundPaid ? t.common.fundDeduct : `${t.common.by} ${payer?.name ?? t.common.unknown}`}</span>
                              <span className="text-white/28">/</span>
                              <span>{t.common.splitAmong(expense.splitAmong.length)}</span>
                              <button
                                type="button"
                                onClick={() => setExpandedId(isExpanded ? null : expense.id)}
                                className="text-[rgba(248,172,117,0.96)]"
                              >
                                {isExpanded ? t.common.cancel : t.nav.members}
                              </button>
                            </div>
                            {isExpanded ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {expense.splitAmong.map((memberId) => {
                                  const member = getMember(memberId);
                                  if (!member) return null;
                                  return (
                                    <span key={memberId} className="inline-flex items-center gap-2 rounded-full bg-white/[0.04] px-2 py-1 text-xs text-white/62">
                                      <MemberAvatar member={member} size="sm" />
                                      {member.name}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-base font-black text-white v2-number">{fmt(expense.amount)}</p>
                            <p className="mt-1 text-xs text-white/46">
                              {t.common.perPerson}{' '}
                              {minShare === maxShare ? fmt(minShare) : `${fmt(minShare)}~${fmt(maxShare)}`}
                            </p>
                            <div className="mt-3 flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => navigate(appPath('/add-expense'), { state: { editExpense: expense } })}
                                className="rounded-full border border-white/10 bg-white/[0.03] p-2 text-white/70 transition hover:bg-white/[0.07]"
                                aria-label={t.expenseHistory.editAction}
                              >
                                <Pencil size={14} strokeWidth={2} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(expense.id)}
                                className="rounded-full border border-[#d05242]/20 bg-[#d05242]/10 p-2 text-[#ffcdc6] transition hover:bg-[#d05242]/18"
                                aria-label={t.expenseHistory.deleteAction}
                              >
                                <Trash2 size={14} strokeWidth={2} />
                              </button>
                            </div>
                          </div>
                        </V2ListRow>
                      );
                    })}
                  </V2List>
                </div>
              ))
            )}
          </div>
        </V2Panel>

        <div className="space-y-4">
          <V2Panel title={t.analytics.categoryDist} eyebrow={t.analytics.categoryTab}>
            {categoryBreakdown.length === 0 ? (
              <V2EmptyState title={t.expenseHistory.noResults} detail={t.expenseHistory.tryOther} />
            ) : (
              <V2List>
                {categoryBreakdown.map((entry) => (
                  <V2ListRow key={entry.category}>
                    <span
                      className="h-10 w-10 rounded-2xl"
                      style={{ background: `${CATEGORY_CONFIG[entry.category].color}22` }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white">{t.categories[entry.category]}</p>
                      <p className="mt-1 text-xs text-white/46">{entry.pct}%</p>
                    </div>
                    <p className="text-sm font-black text-white v2-number">{fmt(entry.amount)}</p>
                  </V2ListRow>
                ))}
              </V2List>
            )}
          </V2Panel>

          <V2Panel title={copy.biggestExpense} eyebrow={t.analytics.trendTab}>
            {largestExpenses.length === 0 ? (
              <V2EmptyState title={t.expenseHistory.noResults} detail={t.expenseHistory.tryOther} />
            ) : (
              <V2List>
                {largestExpenses.map((expense) => {
                  const payer = expense.paidBy === FUND_PAYER_ID ? null : getMember(expense.paidBy);
                  return (
                    <V2ListRow key={expense.id}>
                      <CategoryIcon category={expense.category} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-white">{expense.description}</p>
                        <p className="mt-1 text-xs text-white/46">
                          {(payer?.name ?? t.common.fund)} · {new Intl.DateTimeFormat(localeTag, { month: 'short', day: 'numeric' }).format(new Date(`${expense.date}T00:00:00`))}
                        </p>
                      </div>
                      <p className="text-sm font-black text-white v2-number">{fmt(expense.amount)}</p>
                    </V2ListRow>
                  );
                })}
              </V2List>
            )}
          </V2Panel>

          <V2Panel title={t.nav.members} eyebrow={t.addExpense.participants}>
            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.05] text-white/70">
                  <Users size={18} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{t.common.splitAmong(avgParticipants || 0)}</p>
                  <p className="mt-1 text-xs text-white/46">{t.expenseHistory.totalCount(filtered.length)}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-white/52">
                <Wallet size={14} strokeWidth={2} />
                {t.expenseHistory.totalSum(fmt(fundTotal))}
              </div>
            </div>
          </V2Panel>
        </div>
      </div>
    </div>
  );
}
