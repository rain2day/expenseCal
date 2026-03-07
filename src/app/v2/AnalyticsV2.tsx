import React, { useMemo, useState } from 'react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartColumnIncreasing, Coins, Scale, TrendingUp } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CATEGORY_CONFIG, CategoryType, TIME_SERIES_DATA } from '../data/sampleData';
import { useT } from '../i18n/I18nContext';
import { getV2Copy } from './copy';
import { computeTimeSeries, trendStats, type TrendPoint } from './helpers';
import { V2EmptyState, V2List, V2ListRow, V2MetricGrid, V2PageHeader, V2Panel, V2Token } from './primitives';

const TOOLTIP_STYLE = {
  background: 'rgba(11,17,31,0.96)',
  border: '1px solid rgba(163, 172, 255, 0.16)',
  borderRadius: 16,
  color: '#eaedff',
  fontSize: 12,
  padding: '8px 12px',
};

type Tab = 'category' | 'person' | 'trend';

const TAB_KEYS: Tab[] = ['category', 'person', 'trend'];

export function AnalyticsV2() {
  const { locale, t } = useT();
  const {
    expenses,
    contributions,
    balances,
    budget,
    demoMode,
    currency,
    fmt,
    fundSpent,
    fundBalance,
    totalContributions,
  } = useApp();
  const [tab, setTab] = useState<Tab>('trend');
  const copy = getV2Copy(locale);

  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const categoryTotals: Partial<Record<CategoryType, number>> = {};
  expenses.forEach((expense) => {
    categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
  });

  const categoryData = Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      name: t.categories[category as CategoryType],
      key: category as CategoryType,
      value: amount || 0,
      color: CATEGORY_CONFIG[category as CategoryType].color,
      pct: totalSpent > 0 ? Math.round(((amount || 0) / totalSpent) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value);

  const personData = balances.map((balance) => ({
    name: balance.member.name,
    paid: balance.paid,
    shouldPay: balance.shouldPay,
    delta: balance.balance,
  }));

  const trendData = useMemo(
    () => demoMode ? (TIME_SERIES_DATA as TrendPoint[]) : computeTimeSeries(expenses, contributions, budget),
    [budget, contributions, demoMode, expenses],
  );
  const stats = useMemo(() => trendStats(trendData), [trendData]);
  const totalAdvanced = Math.max(totalSpent - fundSpent, 0);
  const topCategory = categoryData[0];
  const largestDelta = [...balances].sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))[0];

  const tabLabel: Record<Tab, string> = {
    category: t.analytics.categoryTab,
    person: t.analytics.personTab,
    trend: t.analytics.trendTab,
  };

  return (
    <div className="space-y-4">
      <V2PageHeader
        kicker={t.nav.analytics}
        title={t.analytics.title}
        description={stats ? t.analytics.dayCount(stats.totalDays) : t.analytics.demoTrendDesc}
        meta={(
          <>
            <V2Token tone="warm">{t.analytics.trendTab}</V2Token>
            <V2Token>{fmt(totalSpent)}</V2Token>
            <V2Token tone="cool">{fmt(totalContributions)}</V2Token>
          </>
        )}
      />

      <V2MetricGrid
        items={[
          {
            label: t.analytics.statTotalSpent,
            value: fmt(totalSpent),
            note: topCategory ? `${t.analytics.categoryTab} · ${topCategory.name}` : t.analytics.categoryDist,
          },
          {
            label: t.analytics.statTotalFund,
            value: fmt(totalContributions),
            note: `${t.analytics.fundRemaining} ${fmt(fundBalance)}`,
            accentClassName: fundBalance >= 0 ? 'text-[#d9f2d3]' : 'text-[#ffcdc6]',
          },
          {
            label: t.analytics.advancePending,
            value: fmt(totalAdvanced),
            note: t.analytics.paymentRatio,
          },
          {
            label: t.analytics.memberComparison,
            value: largestDelta ? largestDelta.member.name : '-',
            note: largestDelta ? fmt(Math.abs(largestDelta.balance)) : '-',
          },
        ]}
      />

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {TAB_KEYS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              tab === item
                ? 'bg-[rgba(248,172,117,0.16)] text-[rgba(255,228,210,0.96)]'
                : 'bg-white/[0.04] text-white/56'
            }`}
          >
            {tabLabel[item]}
          </button>
        ))}
      </div>

      {tab === 'category' ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.95fr)]">
          <V2Panel title={t.analytics.categoryDist} eyebrow={t.analytics.categoryTab}>
            {categoryData.length === 0 ? (
              <V2EmptyState title={t.expenseHistory.noResults} detail={t.expenseHistory.tryOther} />
            ) : (
              <div className="grid gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(280px,1fr)]">
                <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={66}
                        outerRadius={104}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryData.map((entry) => (
                          <Cell key={entry.key} fill={entry.color} strokeWidth={0} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [fmt(value), '']} contentStyle={TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <V2List>
                  {categoryData.map((entry) => (
                    <V2ListRow key={entry.key}>
                      <span className="h-10 w-10 rounded-2xl" style={{ background: `${entry.color}22` }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-white">{entry.name}</p>
                        <p className="mt-1 text-xs text-white/46">{entry.pct}%</p>
                      </div>
                      <p className="text-sm font-black text-white v2-number">{fmt(entry.value)}</p>
                    </V2ListRow>
                  ))}
                </V2List>
              </div>
            )}
          </V2Panel>

          <V2Panel title={copy.snapshot} eyebrow={t.analytics.categoryTab}>
            {topCategory ? (
              <div className="space-y-4">
                <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/40">{t.analytics.most}</p>
                  <p className="mt-3 text-2xl font-black text-white">{topCategory.name}</p>
                  <p className="mt-2 text-sm text-white/58">{fmt(topCategory.value)} · {topCategory.pct}%</p>
                </div>
                <V2List>
                  {categoryData.slice(0, 4).map((entry) => (
                    <V2ListRow key={entry.key}>
                      <span className="v2-dot" style={{ background: entry.color }} />
                      <p className="flex-1 text-sm text-white/72">{entry.name}</p>
                      <p className="text-sm font-black text-white v2-number">{fmt(entry.value)}</p>
                    </V2ListRow>
                  ))}
                </V2List>
              </div>
            ) : (
              <V2EmptyState title={t.expenseHistory.noResults} detail={t.expenseHistory.tryOther} />
            )}
          </V2Panel>
        </div>
      ) : null}

      {tab === 'person' ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.95fr)]">
          <V2Panel title={t.analytics.memberComparison} eyebrow={t.analytics.personTab}>
            {personData.length === 0 ? (
              <V2EmptyState title={t.expenseHistory.noResults} detail={t.expenseHistory.tryOther} />
            ) : (
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={personData} layout="vertical" margin={{ top: 8, right: 18, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(163, 172, 255, 0.12)" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => `${currency}${(value / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 10, fill: 'rgba(234,237,255,0.52)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#eaedff' }}
                    axisLine={false}
                    tickLine={false}
                    width={54}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [fmt(value), name === 'paid' ? t.analytics.paid : t.analytics.shouldPayLabel]}
                    contentStyle={TOOLTIP_STYLE}
                  />
                  <Legend
                    formatter={(value) => value === 'paid' ? t.analytics.paid : t.analytics.shouldPayLabel}
                    wrapperStyle={{ fontSize: 11, color: 'rgba(234,237,255,0.62)' }}
                  />
                  <Bar dataKey="paid" fill="#dd843c" radius={[0, 6, 6, 0]} barSize={12} />
                  <Bar dataKey="shouldPay" fill="#6c71e2" radius={[0, 6, 6, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </V2Panel>

          <V2Panel title={copy.balanceBoard} eyebrow={t.analytics.personTab}>
            <V2List>
              {balances.map((balance) => (
                <V2ListRow key={balance.member.id}>
                  <span className="h-10 w-10 rounded-full" style={{ background: balance.member.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white">{balance.member.name}</p>
                    <p className="mt-1 text-xs text-white/46">
                      {t.analytics.paid} {fmt(balance.paid)} · {t.analytics.shouldPayLabel} {fmt(balance.shouldPay)}
                    </p>
                  </div>
                  <p className={`text-sm font-black v2-number ${balance.balance > 0 ? 'text-[#d9f2d3]' : balance.balance < 0 ? 'text-[#ffcdc6]' : 'text-white/54'}`}>
                    {fmt(balance.balance)}
                  </p>
                </V2ListRow>
              ))}
            </V2List>
          </V2Panel>
        </div>
      ) : null}

      {tab === 'trend' ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
          <V2Panel title={t.analytics.trendOverview} eyebrow={t.analytics.trendTab}>
            {trendData.length === 0 ? (
              <V2EmptyState title={t.expenseHistory.noResults} detail={t.expenseHistory.tryOther} />
            ) : (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={trendData} margin={{ top: 8, right: 12, left: 0, bottom: 6 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(163, 172, 255, 0.12)" vertical={false} />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 10, fill: 'rgba(234,237,255,0.52)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="cumulative"
                      tickFormatter={(value) => `${currency}${(value / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 10, fill: 'rgba(234,237,255,0.52)' }}
                      axisLine={false}
                      tickLine={false}
                      width={44}
                    />
                    <YAxis
                      yAxisId="daily"
                      orientation="right"
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 9, fill: 'rgba(234,237,255,0.42)' }}
                      axisLine={false}
                      tickLine={false}
                      width={30}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(value: number, name: string) => {
                        const labels: Record<string, string> = {
                          daily: t.analytics.tooltipDaily,
                          spent: t.analytics.tooltipCumSpent,
                          contrib: t.analytics.tooltipCumContrib,
                          avg: t.analytics.tooltipAvgDaily,
                        };
                        return [fmt(value), labels[name] || name];
                      }}
                    />
                    <Bar yAxisId="daily" dataKey="daily" fill="#dd843c" opacity={0.28} radius={[4, 4, 0, 0]} name="daily" barSize={trendData.length > 15 ? 8 : 18} />
                    <Area yAxisId="cumulative" type="monotone" dataKey="contrib" fill="#72a857" fillOpacity={0.08} stroke="#72a857" strokeWidth={2} strokeDasharray="4 3" dot={false} name="contrib" />
                    <Line yAxisId="cumulative" type="monotone" dataKey="avg" stroke="#9055a0" strokeWidth={1.5} strokeDasharray="3 3" dot={false} name="avg" />
                    {budget > 0 ? (
                      <ReferenceLine yAxisId="cumulative" y={budget} stroke="#d05242" strokeDasharray="6 3" label={{ value: t.analytics.budgetLabel, position: 'insideTopRight', fill: '#d05242', fontSize: 10 }} />
                    ) : null}
                    <Line yAxisId="cumulative" type="monotone" dataKey="spent" stroke="#f8ac75" strokeWidth={2.6} dot={{ r: 3.5, fill: '#f8ac75', strokeWidth: 0 }} activeDot={{ r: 5 }} name="spent" />
                  </ComposedChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 text-[11px] text-white/52">
                  <V2Token>{t.analytics.legendDaily}</V2Token>
                  <V2Token tone="warm">{t.analytics.legendCumSpent}</V2Token>
                  <V2Token tone="cool">{t.analytics.legendCumContrib}</V2Token>
                </div>
              </div>
            )}
          </V2Panel>

          <div className="space-y-4">
            <V2Panel title={copy.snapshot} eyebrow={t.analytics.trendTab}>
              <V2List>
                <V2ListRow>
                  <TrendingUp size={18} className="text-[#f8ac75]" strokeWidth={2} />
                  <div className="flex-1">
                    <p className="text-sm text-white/68">{t.analytics.statAvgDaily}</p>
                    <p className="mt-1 text-sm font-black text-white v2-number">{fmt(stats?.avgDaily || 0)}</p>
                  </div>
                </V2ListRow>
                <V2ListRow>
                  <ChartColumnIncreasing size={18} className="text-[#6c71e2]" strokeWidth={2} />
                  <div className="flex-1">
                    <p className="text-sm text-white/68">{t.analytics.statPeakDay}</p>
                    <p className="mt-1 text-sm font-black text-white v2-number">{stats ? fmt(stats.peakDay.daily) : '-'}</p>
                  </div>
                </V2ListRow>
                <V2ListRow>
                  <Coins size={18} className="text-[#72a857]" strokeWidth={2} />
                  <div className="flex-1">
                    <p className="text-sm text-white/68">{t.analytics.fundRemaining}</p>
                    <p className={`mt-1 text-sm font-black v2-number ${fundBalance >= 0 ? 'text-[#d9f2d3]' : 'text-[#ffcdc6]'}`}>
                      {fmt(fundBalance)}
                    </p>
                  </div>
                </V2ListRow>
              </V2List>
            </V2Panel>

            <V2Panel title={t.analytics.fundBreakdown} eyebrow={t.analytics.statTotalFund}>
              <V2List>
                <V2ListRow>
                  <p className="flex-1 text-sm text-white/68">{t.analytics.fundSpentLabel}</p>
                  <p className="text-sm font-black text-white v2-number">{fmt(fundSpent)}</p>
                </V2ListRow>
                <V2ListRow>
                  <p className="flex-1 text-sm text-white/68">{t.analytics.advancePending}</p>
                  <p className="text-sm font-black text-white v2-number">{fmt(totalAdvanced)}</p>
                </V2ListRow>
                <V2ListRow>
                  <p className="flex-1 text-sm text-white/68">{t.analytics.fundRemaining}</p>
                  <p className={`text-sm font-black v2-number ${fundBalance >= 0 ? 'text-[#d9f2d3]' : 'text-[#ffcdc6]'}`}>
                    {fmt(fundBalance)}
                  </p>
                </V2ListRow>
                <V2ListRow>
                  <Scale size={18} className="text-[#f8ac75]" strokeWidth={2} />
                  <div className="flex-1">
                    <p className="text-sm text-white/68">{t.analytics.netBalance}</p>
                    <p className="mt-1 text-sm font-black text-white v2-number">
                      {totalContributions >= totalSpent ? t.analytics.sufficient : `${t.analytics.deficit} ${fmt(totalSpent - totalContributions)}`}
                    </p>
                  </div>
                </V2ListRow>
              </V2List>
            </V2Panel>
          </div>
        </div>
      ) : null}
    </div>
  );
}
