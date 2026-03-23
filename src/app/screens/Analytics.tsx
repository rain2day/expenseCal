import React, { useState } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  ComposedChart, Line, ReferenceLine, Area,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { useT } from '../i18n/I18nContext';
import { CATEGORY_CONFIG, CategoryType, TIME_SERIES_DATA, Expense, Contribution, FUND_PAYER_ID } from '../data/sampleData';
import { StaggerContainer, StaggerItem } from '../components/SharedComponents';

type Tab = 'category' | 'person' | 'trend';

const TAB_KEYS: Tab[] = ['category', 'person', 'trend'];

const TOOLTIP_STYLE = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  color: 'var(--foreground)',
  fontSize: 12,
  padding: '8px 12px',
};

interface TrendPoint {
  day: string;
  date: string;
  daily: number;         // daily spending
  spent: number;         // cumulative spending
  contrib: number;       // cumulative contributions
  budget: number;
  avg: number;           // average daily spend up to this point
}

function computeTimeSeries(expenses: Expense[], contributions: Contribution[], budget: number): TrendPoint[] {
  if (expenses.length === 0) return [];

  // Collect all unique dates from both expenses and contributions
  const allDates = new Set<string>();
  expenses.forEach(e => allDates.add(e.date));
  contributions.forEach(c => allDates.add(c.date));
  const sortedDates = [...allDates].sort();

  // Daily spending by date
  const expByDay: Record<string, number> = {};
  expenses.forEach(e => {
    expByDay[e.date] = (expByDay[e.date] || 0) + e.amount;
  });

  // Daily contributions by date
  const contribByDay: Record<string, number> = {};
  contributions.forEach(c => {
    contribByDay[c.date] = (contribByDay[c.date] || 0) + c.amount;
  });

  let cumSpent = 0;
  let cumContrib = 0;
  return sortedDates.map((date, idx) => {
    const dailySpend = expByDay[date] || 0;
    const dailyContrib = contribByDay[date] || 0;
    cumSpent += dailySpend;
    cumContrib += dailyContrib;
    const d = new Date(date);
    const label = `${d.getMonth()+1}/${d.getDate()}`;
    return {
      day: label,
      date,
      daily: dailySpend,
      spent: cumSpent,
      contrib: cumContrib,
      budget,
      avg: Math.round(cumSpent / (idx + 1)),
    };
  });
}

function trendStats(data: TrendPoint[]) {
  if (data.length === 0) return null;
  const dailyAmounts = data.map(d => d.daily).filter(d => d > 0);
  const peakDay = data.reduce((max, d) => d.daily > max.daily ? d : max, data[0]);
  const totalSpent = data[data.length - 1].spent;
  const totalContrib = data[data.length - 1].contrib;
  const daysWithSpending = dailyAmounts.length;
  const avgDaily = daysWithSpending > 0 ? Math.round(totalSpent / daysWithSpending) : 0;
  return { peakDay, totalSpent, totalContrib, avgDaily, daysWithSpending, totalDays: data.length };
}

export function Analytics() {
  const { expenses, contributions, balances, budget, demoMode, currency, fmt, fundSpent, fundBalance, totalContributions, settlements } = useApp();
  const { t } = useT();
  const [tab, setTab] = useState<Tab>('category');

  const TAB_LABELS: Record<Tab, string> = {
    category: t.analytics.categoryTab,
    person:   t.analytics.personTab,
    trend:    t.analytics.trendTab,
  };

  const categoryTotals: Partial<Record<CategoryType, number>> = {};
  expenses.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const categoryData = Object.entries(categoryTotals)
    .map(([cat, amt]) => ({
      name:  t.categories[cat as CategoryType],
      value: amt!,
      color: CATEGORY_CONFIG[cat as CategoryType].color,
      pct:   Math.round((amt! / totalSpent) * 100),
    }))
    .sort((a, b) => b.value - a.value);

  const personData = balances.map(b => ({
    name:  b.member.name,
    [t.analytics.paid]: b.paid,
    [t.analytics.shouldPayLabel]: b.shouldPay,
    color: b.member.color,
  }));

  return (
    <div className="bg-transparent min-h-screen">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="bg-sidebar px-4 pt-header pb-0 border-b border-border lg:pt-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-black text-foreground mb-4">{t.analytics.title}</h1>
          <div className="flex">
            {TAB_KEYS.map(key => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 py-2.5 text-sm font-bold transition-all border-b-2
                  ${tab === key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-subtle'
                  }`}
              >
                {TAB_LABELS[key]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <StaggerContainer key={tab} className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {/* ── Tab: Category ─────────────────────────────────────────── */}
        {tab === 'category' && (
          <>
            <StaggerItem>
            <div className="bg-card border border-border rounded-2xl p-4">
              <h2 className="text-sm font-bold text-muted-foreground mb-4">{t.analytics.categoryDist}</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [fmt(v), '']}
                    contentStyle={TOOLTIP_STYLE}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            </StaggerItem>

            <StaggerItem>
            <div className="bg-card border border-border rounded-2xl p-4 space-y-2.5">
              {categoryData.map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: d.color }} />
                  <span className="text-sm text-foreground flex-1">{d.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{d.pct}%</span>
                  <span className="font-bold text-sm tabular-nums text-foreground">{fmt(d.value)}</span>
                  {i === 0 && (
                    <span className="text-xs bg-accent-bg text-primary px-1.5 py-0.5 rounded-full">{t.analytics.most}</span>
                  )}
                </div>
              ))}
            </div>
            </StaggerItem>
          </>
        )}

        {/* ── Tab: Per Person ───────────────────────────────────────── */}
        {tab === 'person' && (
          <StaggerItem>
          <div className="bg-card border border-border rounded-2xl p-4">
            <h2 className="text-sm font-bold text-muted-foreground mb-4">{t.analytics.memberComparison}</h2>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={personData}
                layout="vertical"
                margin={{ top: 0, right: 20, left: 40, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={v => `${currency}${(v/1000).toFixed(0)}k`}
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'var(--foreground)' }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip
                  formatter={(v: number, name: string) => [fmt(v), name]}
                  contentStyle={TOOLTIP_STYLE}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, color: 'var(--muted-foreground)' }}
                />
                <Bar dataKey={t.analytics.paid} fill="#DD843C" radius={[0, 4, 4, 0]} barSize={10} />
                <Bar dataKey={t.analytics.shouldPayLabel} fill="#9055A0" radius={[0, 4, 4, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          </StaggerItem>
        )}

        {/* ── Tab: Trend ─────────────────────────────────────────────── */}
        {tab === 'trend' && (() => {
          const trendData = demoMode
            ? TIME_SERIES_DATA as TrendPoint[]
            : computeTimeSeries(expenses, contributions, budget);
          const stats = trendStats(trendData);
          return (
          <>
          <StaggerItem>
          <div className="bg-card border border-border rounded-2xl p-4">
            <h2 className="text-sm font-bold text-muted-foreground mb-1">{t.analytics.trendOverview}</h2>
            <p className="text-xs text-subtle mb-4">
              {demoMode ? t.analytics.demoTrendDesc : t.analytics.dayCount(trendData.length)}
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="cumulative"
                  tickFormatter={v => `${currency}${(v/1000).toFixed(0)}k`}
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <YAxis
                  yAxisId="daily"
                  orientation="right"
                  tickFormatter={v => `${(v/1000).toFixed(0)}k`}
                  tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: number, name: string) => {
                    const labels: Record<string, string> = {
                      daily: t.analytics.tooltipDaily,
                      spent: t.analytics.tooltipCumSpent,
                      contrib: t.analytics.tooltipCumContrib,
                      avg: t.analytics.tooltipAvgDaily,
                    };
                    return [fmt(v), labels[name] || name];
                  }}
                />
                {/* Daily spending bars */}
                <Bar
                  yAxisId="daily"
                  dataKey="daily"
                  fill="#DD843C"
                  opacity={0.25}
                  radius={[3, 3, 0, 0]}
                  name="daily"
                  barSize={trendData.length > 15 ? 8 : 18}
                />
                {/* Cumulative contributions area */}
                <Area
                  yAxisId="cumulative"
                  type="monotone"
                  dataKey="contrib"
                  fill="#72A857"
                  fillOpacity={0.1}
                  stroke="#72A857"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  dot={false}
                  name="contrib"
                />
                {/* Average daily spend line */}
                <Line
                  yAxisId="cumulative"
                  type="monotone"
                  dataKey="avg"
                  stroke="#9055A0"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  dot={false}
                  name="avg"
                />
                {/* Budget reference line */}
                {budget > 0 && (
                  <ReferenceLine
                    yAxisId="cumulative"
                    y={budget}
                    stroke="#D05242"
                    strokeDasharray="6 3"
                    label={{ value: t.analytics.budgetLabel, position: 'insideTopRight', fill: '#D05242', fontSize: 10 }}
                  />
                )}
                {/* Cumulative spending line (main) */}
                <Line
                  yAxisId="cumulative"
                  type="monotone"
                  dataKey="spent"
                  stroke="#DD843C"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#DD843C', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  name="spent"
                />
              </ComposedChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3 justify-center">
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-2.5 rounded-sm bg-primary opacity-30" />
                <span className="text-[10px] text-muted-foreground">{t.analytics.legendDaily}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-0.5 bg-primary" />
                <span className="text-[10px] text-muted-foreground">{t.analytics.legendCumSpent}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5" style={{ borderTop: '2px dashed #72A857', height: 0 }} />
                <span className="text-[10px] text-muted-foreground">{t.analytics.legendCumContrib}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5" style={{ borderTop: '1.5px dashed #9055A0', height: 0 }} />
                <span className="text-[10px] text-muted-foreground">{t.analytics.legendAvgDaily}</span>
              </div>
              {budget > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5" style={{ borderTop: '2px dashed #D05242', height: 0 }} />
                  <span className="text-[10px] text-muted-foreground">{t.analytics.legendBudgetCap}</span>
                </div>
              )}
            </div>
          </div>
          </StaggerItem>

          {/* ── Stats cards ────────────────────────────────────── */}
          {stats && (
            <StaggerItem>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border border-border rounded-2xl p-3.5">
                <div className="text-[10px] text-muted-foreground mb-1">{t.analytics.statAvgDaily}</div>
                <div className="text-lg font-black text-foreground tabular-nums">{fmt(stats.avgDaily)}</div>
                <div className="text-[10px] text-subtle mt-0.5">
                  {t.analytics.statDaysSpending(stats.daysWithSpending)}
                </div>
              </div>
              <div className="bg-card border border-border rounded-2xl p-3.5">
                <div className="text-[10px] text-muted-foreground mb-1">{t.analytics.statPeakDay}</div>
                <div className="text-lg font-black text-foreground tabular-nums">{fmt(stats.peakDay.daily)}</div>
                <div className="text-[10px] text-subtle mt-0.5">{stats.peakDay.day}</div>
              </div>
              <div className="bg-card border border-border rounded-2xl p-3.5">
                <div className="text-[10px] text-muted-foreground mb-1">{t.analytics.statTotalSpent}</div>
                <div className="text-lg font-black text-foreground tabular-nums">{fmt(stats.totalSpent)}</div>
              </div>
              <div className="bg-card border border-border rounded-2xl p-3.5">
                <div className="text-[10px] text-muted-foreground mb-1">{t.analytics.statTotalFund}</div>
                <div className="text-lg font-black text-foreground tabular-nums">{fmt(stats.totalContrib)}</div>
              </div>
            </div>
            </StaggerItem>
          )}

          {/* ── Fund Breakdown Card ──────────────────────────────── */}
          {stats && totalContributions > 0 && (() => {
            const outstandingAdvance = settlements
              .filter((settlement) => !settlement.done && settlement.toId !== FUND_PAYER_ID)
              .reduce((sum, settlement) => sum + settlement.amount, 0);
            const netBalance = totalContributions - totalSpent;
            const advanceRatio = totalSpent > 0 ? outstandingAdvance / totalSpent : 0;

            return (
              <StaggerItem>
              <div className="bg-card border border-border rounded-2xl p-4">
                <div className="text-xs font-bold text-foreground mb-3">{t.analytics.fundBreakdown}</div>

                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{t.analytics.fundSpentLabel}</span>
                    <span className="text-xs font-bold text-foreground tabular-nums">{fmt(fundSpent)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{t.analytics.advancePending}</span>
                    <span className="text-xs font-bold tabular-nums" style={{ color: advanceRatio > 0.5 ? '#C8914A' : 'var(--foreground)' }}>
                      {fmt(outstandingAdvance)}
                    </span>
                  </div>
                  <div className="border-t border-border" />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{t.analytics.fundRemaining}</span>
                    <span className={`text-xs font-bold tabular-nums ${fundBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {fmt(fundBalance)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-foreground">{t.analytics.netBalance}</span>
                    <span className="text-sm font-black tabular-nums" style={{ color: netBalance >= 0 ? '#72A857' : '#D05242' }}>
                      {netBalance >= 0 ? t.analytics.sufficient : `${t.analytics.deficit} ${fmt(Math.abs(netBalance))}`}
                    </span>
                  </div>
                </div>

                {/* Advance ratio bar */}
                {outstandingAdvance > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex justify-between text-[10px] text-subtle mb-1.5">
                      <span>{t.analytics.paymentRatio}</span>
                      <span>{t.analytics.advancePercent(Math.round(advanceRatio * 100))}</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden flex">
                      <div
                        className="h-full rounded-l-full"
                        style={{ width: `${Math.round((1 - advanceRatio) * 100)}%`, background: '#3B5BA5' }}
                      />
                      <div
                        className="h-full rounded-r-full"
                        style={{ width: `${Math.round(advanceRatio * 100)}%`, background: advanceRatio > 0.5 ? '#C8914A' : '#5A7EC5' }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-subtle mt-1">
                      <span>{t.analytics.fundSpentLabel}</span>
                      <span>{t.analytics.advancePending}</span>
                    </div>
                  </div>
                )}
              </div>
              </StaggerItem>
            );
          })()}
          </>
          );
        })()}

        <div className="h-4" />
      </StaggerContainer>
    </div>
  );
}
