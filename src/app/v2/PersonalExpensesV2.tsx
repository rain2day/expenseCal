import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { BarChart, Bar, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowLeft, Check, Pencil, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CategoryType } from '../data/sampleData';
import { CategoryIcon } from '../components/SharedComponents';
import { useT } from '../i18n/I18nContext';
import { useAppPaths } from '../routing/appPaths';
import { V2EmptyState, V2List, V2ListRow, V2MetricGrid, V2PageHeader, V2Panel, V2Token } from './primitives';

const CATEGORY_COLORS: Record<CategoryType, string> = {
  food: '#dd843c',
  transport: '#5a7ec5',
  accommodation: '#9055a0',
  tickets: '#72a857',
  shopping: '#c05a5a',
  other: '#5aabab',
};

export function PersonalExpensesV2() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const { appPath } = useAppPaths();
  const { t } = useT();
  const {
    getMember,
    personalExpenses,
    loadPersonalExpenses,
    deletePersonalExpense,
    personalExpensesLoading,
    showToast,
    fmt,
    groupBuys,
    loadGroupBuys,
    toggleGroupBuySettlement,
  } = useApp();
  const [activeTab, setActiveTab] = useState<'list' | 'stats'>('list');

  const member = memberId ? getMember(memberId) : undefined;

  useEffect(() => {
    if (!memberId) return undefined;
    const cleanup = loadPersonalExpenses(memberId);
    return cleanup;
  }, [loadPersonalExpenses, memberId]);

  useEffect(() => {
    const cleanup = loadGroupBuys();
    return cleanup;
  }, [loadGroupBuys]);

  const stats = useMemo(() => {
    if (personalExpenses.length === 0) return null;

    const total = personalExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const categoryTotals = new Map<CategoryType, number>();
    personalExpenses.forEach((expense) => {
      categoryTotals.set(expense.category, (categoryTotals.get(expense.category) || 0) + expense.amount);
    });
    const categoryData = [...categoryTotals.entries()]
      .map(([category, amount]) => ({
        name: category,
        value: amount,
        pct: Math.round((amount / total) * 100),
        color: CATEGORY_COLORS[category],
      }))
      .sort((a, b) => b.value - a.value);

    const dailyTotals = new Map<string, number>();
    personalExpenses.forEach((expense) => {
      dailyTotals.set(expense.date, (dailyTotals.get(expense.date) || 0) + expense.amount);
    });
    const dailyData = [...dailyTotals.entries()]
      .map(([date, amount]) => ({ date: date.slice(5), amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const daysCount = dailyTotals.size;
    const dailyAvg = daysCount > 0 ? Math.round(total / daysCount) : 0;
    const peakEntry = [...dailyTotals.entries()].sort((a, b) => b[1] - a[1])[0];
    const peakDay = peakEntry ? peakEntry[0] : '';
    const peakAmount = peakEntry ? peakEntry[1] : 0;

    return { total, categoryData, dailyData, daysCount, dailyAvg, peakDay, peakAmount };
  }, [personalExpenses]);

  if (!member) {
    return <V2EmptyState title="Member not found" detail="This member no longer exists in the current group." />;
  }

  return (
    <div className="space-y-4">
      <V2PageHeader
        kicker={t.personal.personalExpensesLabel}
        title={t.personal.title(member.name)}
        description={t.personal.noExpensesHint}
        actions={(
          <button type="button" onClick={() => navigate(-1)} className="v2-action-button">
            <ArrowLeft size={16} strokeWidth={2.2} />
            {t.common.cancel}
          </button>
        )}
        meta={(
          <>
            <V2Token tone="cool">{member.name}</V2Token>
            <V2Token>{fmt(stats?.total || 0)}</V2Token>
          </>
        )}
      />

      {stats ? (
        <V2MetricGrid
          items={[
            { label: t.personal.totalSpent, value: fmt(stats.total), note: t.personal.daysWithSpending(stats.daysCount) },
            { label: t.personal.dailyAvg, value: fmt(stats.dailyAvg), note: t.personal.dailyTrend },
            { label: t.personal.peakDay, value: stats.peakDay ? stats.peakDay.slice(5) : '-', note: stats.peakAmount ? fmt(stats.peakAmount) : '-' },
            { label: t.personal.categoryDist, value: stats.categoryData[0] ? t.categories[stats.categoryData[0].name] : '-', note: stats.categoryData[0] ? `${stats.categoryData[0].pct}%` : '-' },
          ]}
        />
      ) : null}

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {(['list', 'stats'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              activeTab === tab
                ? 'bg-[rgba(248,172,117,0.16)] text-[rgba(255,228,210,0.96)]'
                : 'bg-white/[0.04] text-white/56'
            }`}
          >
            {tab === 'list' ? t.personal.listTab : t.personal.statsTab}
          </button>
        ))}
      </div>

      {personalExpensesLoading ? (
        <V2Panel title={t.personal.listTab} eyebrow={t.personal.personalExpensesLabel}>
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#f8ac75] border-t-transparent" />
          </div>
        </V2Panel>
      ) : null}

      {!personalExpensesLoading && activeTab === 'list' ? (
        <V2Panel title={t.personal.listTab} eyebrow={t.personal.personalExpensesLabel}>
          {personalExpenses.length === 0 ? (
            <V2EmptyState title={t.personal.noExpenses} detail={t.personal.noExpensesHint} />
          ) : (
            <V2List>
              {personalExpenses.map((expense) => {
                const groupBuy = expense.groupBuyId ? groupBuys.find((item) => item.id === expense.groupBuyId) : null;
                const isPayer = groupBuy?.payerId === memberId;
                const isSettled = groupBuy && memberId ? groupBuy.settlements[memberId] === true : false;
                const payer = groupBuy ? getMember(groupBuy.payerId) : undefined;
                return (
                  <V2ListRow key={expense.id} className="items-start gap-4">
                    <CategoryIcon category={expense.category} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-bold text-white">{expense.description}</p>
                        {groupBuy ? <V2Token tone="cool">{t.groupBuy.groupBuyTag}</V2Token> : null}
                        <span className="text-xs text-white/36">{expense.date}</span>
                      </div>
                      <p className="mt-1 text-xs text-white/54">
                        {groupBuy && !isPayer ? t.groupBuy.owes(member.name, payer?.name ?? '', fmt(expense.amount)) : t.personal.personalExpensesLabel}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-black text-white v2-number">{fmt(expense.amount)}</p>
                      <div className="mt-3 flex items-center justify-end gap-2">
                        {groupBuy && !isPayer ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (!memberId) return;
                              toggleGroupBuySettlement(groupBuy.id, memberId);
                              showToast(isSettled ? 'info' : 'success', isSettled ? t.groupBuy.markUnpaid : t.groupBuy.markPaid);
                            }}
                            className={`rounded-full px-3 py-2 text-xs font-bold ${isSettled ? 'bg-[#72a857]/14 text-[#d9f2d3]' : 'bg-[rgba(248,172,117,0.12)] text-[rgba(255,228,210,0.96)]'}`}
                          >
                            {isSettled ? <Check size={12} className="inline" strokeWidth={2.4} /> : null} {isSettled ? t.groupBuy.paid : t.groupBuy.markPaid}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => navigate(appPath('/add-expense'), { state: { personalMode: true, memberId, editPersonalExpense: expense } })}
                          className="rounded-full border border-white/10 bg-white/[0.03] p-2 text-white/70 transition hover:bg-white/[0.07]"
                          aria-label={t.common.edit}
                        >
                          <Pencil size={14} strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!memberId) return;
                            deletePersonalExpense(memberId, expense.id);
                            showToast('success', t.personal.deleted);
                          }}
                          className="rounded-full border border-[#d05242]/20 bg-[#d05242]/10 p-2 text-[#ffcdc6] transition hover:bg-[#d05242]/18"
                          aria-label={t.common.delete}
                        >
                          <Trash2 size={14} strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  </V2ListRow>
                );
              })}
            </V2List>
          )}
        </V2Panel>
      ) : null}

      {!personalExpensesLoading && activeTab === 'stats' ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <V2Panel title={t.personal.categoryDist} eyebrow={t.personal.statsTab}>
            {!stats ? (
              <V2EmptyState title={t.personal.noExpenses} detail={t.personal.noExpensesHint} />
            ) : (
              <div className="grid gap-4 md:grid-cols-[minmax(0,0.95fr)_minmax(240px,1fr)]">
                <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={stats.categoryData} dataKey="value" cx="50%" cy="50%" innerRadius={54} outerRadius={92} paddingAngle={2} strokeWidth={0}>
                        {stats.categoryData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <V2List>
                  {stats.categoryData.map((category) => (
                    <V2ListRow key={category.name}>
                      <span className="v2-dot" style={{ background: category.color }} />
                      <p className="flex-1 text-sm text-white/72">{t.categories[category.name]}</p>
                      <p className="text-xs text-white/44">{category.pct}%</p>
                      <p className="text-sm font-black text-white v2-number">{fmt(category.value)}</p>
                    </V2ListRow>
                  ))}
                </V2List>
              </div>
            )}
          </V2Panel>

          <V2Panel title={t.personal.dailyTrend} eyebrow={t.personal.statsTab}>
            {!stats ? (
              <V2EmptyState title={t.personal.noExpenses} detail={t.personal.noExpensesHint} />
            ) : (
              <div className="space-y-4">
                {stats.dailyData.length > 1 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={stats.dailyData}>
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(234,237,255,0.52)' }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{
                          background: 'rgba(11,17,31,0.96)',
                          border: '1px solid rgba(163, 172, 255, 0.16)',
                          borderRadius: 16,
                          color: '#eaedff',
                          fontSize: 12,
                        }}
                        formatter={(value: number) => [fmt(value), t.personal.totalSpent]}
                      />
                      <Bar dataKey="amount" fill="#dd843c" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <V2EmptyState title={t.personal.dailyTrend} detail={t.personal.noExpensesHint} />
                )}
              </div>
            )}
          </V2Panel>
        </div>
      ) : null}
    </div>
  );
}
