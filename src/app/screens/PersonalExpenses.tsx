import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Trash2, Pencil, Check } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { useApp } from '../context/AppContext';
import { useT } from '../i18n/I18nContext';
import { CategoryType } from '../data/sampleData';
import { CategoryIcon, StaggerContainer, StaggerItem } from '../components/SharedComponents';
import { SwipeableRow } from '../components/SwipeableRow';
import { useAppPaths } from '../routing/appPaths';

const CATEGORY_COLORS: Record<CategoryType, string> = {
  food: '#DD843C',
  transport: '#5A7EC5',
  accommodation: '#9055A0',
  tickets: '#72A857',
  shopping: '#C05A5A',
  other: '#5AABAB',
};

export function PersonalExpenses() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const { appPath } = useAppPaths();
  const {
    getMember, personalExpenses, loadPersonalExpenses,
    deletePersonalExpense, personalExpensesLoading,
    showToast, fmt,
    groupBuys, loadGroupBuys, toggleGroupBuySettlement, getMember: getM,
  } = useApp();
  const { t } = useT();
  const [activeTab, setActiveTab] = useState<'list' | 'stats'>('list');
  const [swipedId, setSwipedId] = useState<string | null>(null);

  const member = memberId ? getMember(memberId) : undefined;

  // Lazy-load personal expenses when page mounts
  useEffect(() => {
    if (!memberId) return;
    const cleanup = loadPersonalExpenses(memberId);
    return cleanup;
  }, [memberId, loadPersonalExpenses]);

  // Lazy-load group buys for history section
  useEffect(() => {
    const cleanup = loadGroupBuys();
    return cleanup;
  }, [loadGroupBuys]);

  // ── Stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (personalExpenses.length === 0) return null;

    const total = personalExpenses.reduce((s, e) => s + e.amount, 0);

    // Category distribution
    const catMap = new Map<CategoryType, number>();
    personalExpenses.forEach(e => {
      catMap.set(e.category, (catMap.get(e.category) || 0) + e.amount);
    });
    const categoryData = Array.from(catMap.entries())
      .map(([cat, amount]) => ({
        name: cat,
        value: amount,
        pct: Math.round((amount / total) * 100),
        color: CATEGORY_COLORS[cat],
      }))
      .sort((a, b) => b.value - a.value);

    // Daily trend
    const dayMap = new Map<string, number>();
    personalExpenses.forEach(e => {
      dayMap.set(e.date, (dayMap.get(e.date) || 0) + e.amount);
    });
    const dailyData = Array.from(dayMap.entries())
      .map(([date, amount]) => ({ date: date.slice(5), amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Summary
    const daysCount = dayMap.size;
    const dailyAvg = daysCount > 0 ? Math.round(total / daysCount) : 0;
    const peakEntry = Array.from(dayMap.entries()).sort((a, b) => b[1] - a[1])[0];
    const peakDay = peakEntry ? peakEntry[0] : '';
    const peakAmount = peakEntry ? peakEntry[1] : 0;

    return { total, categoryData, dailyData, daysCount, dailyAvg, peakDay, peakAmount };
  }, [personalExpenses]);

  if (!member) {
    return (
      <div className="bg-transparent min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Member not found</p>
      </div>
    );
  }

  return (
    <div className="bg-transparent min-h-screen w-full overflow-x-hidden">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="bg-sidebar px-4 pt-header pb-4 border-b border-border lg:pt-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => navigate(-1)} className="text-muted-foreground active:text-foreground transition-colors">
              <ArrowLeft size={20} strokeWidth={2} />
            </button>
            <h1 className="text-xl font-black text-foreground flex-1">{t.personal.title(member.name)}</h1>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 bg-secondary rounded-xl p-1">
            {(['list', 'stats'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors
                  ${activeTab === tab
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground'
                  }`}
              >
                {tab === 'list' ? t.personal.listTab : t.personal.statsTab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        {personalExpensesLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeTab === 'list' ? (
          /* ── List Tab ──────────────────────────────────── */
          <>
          <StaggerContainer className="space-y-3">
            {personalExpenses.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-sm">{t.personal.noExpenses}</p>
                <p className="text-subtle text-xs mt-1">{t.personal.noExpensesHint}</p>
              </div>
            ) : (
              personalExpenses.map(exp => (
                <StaggerItem key={exp.id}>
                  <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    <SwipeableRow
                      isOpen={swipedId === exp.id}
                      onOpen={() => setSwipedId(exp.id)}
                      onClose={() => setSwipedId(prev => prev === exp.id ? null : prev)}
                      actions={[
                        {
                          label: t.common.edit,
                          icon: <Pencil size={16} strokeWidth={2} />,
                          bgClass: 'bg-accent-bg',
                          textClass: 'text-primary',
                          onClick: () => navigate(appPath('/add-expense'), {
                            state: { personalMode: true, memberId, editPersonalExpense: exp },
                          }),
                        },
                        {
                          label: t.common.delete,
                          icon: <Trash2 size={16} strokeWidth={2} />,
                          bgClass: 'bg-destructive/15',
                          textClass: 'text-destructive',
                          onClick: () => {
                            if (memberId) {
                              deletePersonalExpense(memberId, exp.id);
                              showToast('success', t.personal.deleted);
                            }
                            setSwipedId(null);
                          },
                        },
                      ]}
                    >
                      {(() => {
                        const gb = exp.groupBuyId ? groupBuys.find(g => g.id === exp.groupBuyId) : null;
                        const isPayer = gb && gb.payerId === memberId;
                        const isSettled = gb && memberId ? gb.settlements[memberId] === true : false;
                        const payerName = gb ? getM(gb.payerId)?.name : '';
                        // Get other participants for "跟誰搭" info
                        const partners = gb
                          ? [...new Set(gb.items.map(i => i.memberId))].filter(id => id !== memberId).map(id => getM(id)?.name).filter(Boolean)
                          : [];
                        return (
                          <div className="flex items-center gap-3 px-4 py-3">
                            <CategoryIcon category={exp.category} size="md" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-bold text-foreground truncate">{exp.description}</p>
                                {gb && (
                                  <span className="text-[10px] bg-info-bg text-info px-1.5 py-0.5 rounded-md font-bold shrink-0">
                                    {t.groupBuy.groupBuyTag}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{exp.date}</p>
                              {gb && isPayer && partners.length > 0 && (
                                <p className="text-[10px] text-info mt-0.5">
                                  {t.groupBuy.payerSelf} · {t.groupBuy.sharedWith(partners.join('、'))}
                                </p>
                              )}
                              {gb && !isPayer && (
                                <p className="text-[10px] text-warning mt-0.5">
                                  {isSettled
                                    ? `✓ ${t.groupBuy.paid}`
                                    : `${t.groupBuy.owes(member.name, payerName ?? '', fmt(exp.amount))}`
                                  }
                                </p>
                              )}
                            </div>
                            <span className="font-black text-sm tabular-nums text-foreground">{fmt(exp.amount)}</span>
                            {gb && !isPayer && !isSettled && memberId && (
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleGroupBuySettlement(gb.id, memberId); showToast('success', t.groupBuy.markPaid); }}
                                className="text-[10px] bg-accent-bg text-primary px-2 py-1 rounded-lg font-bold shrink-0 active:scale-95 transition-transform"
                              >
                                {t.groupBuy.markPaid}
                              </button>
                            )}
                            {gb && !isPayer && isSettled && memberId && (
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleGroupBuySettlement(gb.id, memberId); showToast('info', t.groupBuy.markUnpaid); }}
                                className="text-[10px] bg-success-bg text-success px-2 py-1 rounded-lg font-bold shrink-0 active:scale-95 transition-transform flex items-center gap-0.5"
                              >
                                <Check size={10} strokeWidth={2.5} /> {t.groupBuy.paid}
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </SwipeableRow>
                  </div>
                </StaggerItem>
              ))
            )}
          </StaggerContainer>

          </>
        ) : (
          /* ── Stats Tab ─────────────────────────────────── */
          <div className="space-y-4">
            {!stats ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-sm">{t.personal.noExpenses}</p>
              </div>
            ) : (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-card border border-border rounded-2xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">{t.personal.totalSpent}</p>
                    <p className="font-black text-lg tabular-nums text-foreground">{fmt(stats.total)}</p>
                  </div>
                  <div className="bg-card border border-border rounded-2xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">{t.personal.dailyAvg}</p>
                    <p className="font-black text-lg tabular-nums text-foreground">{fmt(stats.dailyAvg)}</p>
                  </div>
                  <div className="bg-card border border-border rounded-2xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">{t.personal.peakDay}</p>
                    <p className="font-black text-sm tabular-nums text-foreground">{stats.peakDay.slice(5)}</p>
                    <p className="text-xs text-muted-foreground">{fmt(stats.peakAmount)}</p>
                  </div>
                  <div className="bg-card border border-border rounded-2xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">{t.personal.daysWithSpending(stats.daysCount)}</p>
                    <p className="font-black text-lg tabular-nums text-foreground">{stats.daysCount}</p>
                  </div>
                </div>

                {/* Category donut */}
                <div className="bg-card border border-border rounded-2xl p-4">
                  <p className="text-sm font-bold text-foreground mb-3">{t.personal.categoryDist}</p>
                  <div className="flex items-center gap-4">
                    <div className="w-32 h-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={stats.categoryData}
                            dataKey="value"
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={55}
                            paddingAngle={2}
                            strokeWidth={0}
                          >
                            {stats.categoryData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {stats.categoryData.map(cat => (
                        <div key={cat.name} className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color }} />
                          <span className="text-xs text-muted-foreground flex-1">{t.categories[cat.name as CategoryType]}</span>
                          <span className="text-xs font-bold tabular-nums text-foreground">{cat.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Daily trend bar chart */}
                {stats.dailyData.length > 1 && (
                  <div className="bg-card border border-border rounded-2xl p-4">
                    <p className="text-sm font-bold text-foreground mb-3">{t.personal.dailyTrend}</p>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.dailyData}>
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis hide />
                          <Tooltip
                            contentStyle={{
                              background: 'var(--color-card)',
                              border: '1px solid var(--color-border)',
                              borderRadius: '12px',
                              fontSize: '12px',
                            }}
                            formatter={(value: number) => [fmt(value), t.personal.totalSpent]}
                          />
                          <Bar dataKey="amount" fill="#DD843C" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
