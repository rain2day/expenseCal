import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Search, SlidersHorizontal, Trash2, Pencil, ReceiptText, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CategoryType, CATEGORY_CONFIG, FUND_PAYER_ID, splitAmountEvenly } from '../data/sampleData';
import { CategoryIcon, MemberAvatar, StaggerContainer, StaggerItem } from '../components/SharedComponents';
import { SwipeableRow } from '../components/SwipeableRow';
import { AnimatePresence, motion } from 'motion/react';
import { useT } from '../i18n/I18nContext';
import { Translations } from '../i18n/types';
import { useAppPaths } from '../routing/appPaths';

function groupByDate(expenses: ReturnType<typeof useApp>['expenses'], t: Translations) {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const groups: Record<string, typeof expenses> = {};
  expenses.forEach(exp => {
    const label = exp.date === today ? t.expenseHistory.today : exp.date === yesterday ? t.expenseHistory.yesterday : exp.date;
    if (!groups[label]) groups[label] = [];
    groups[label].push(exp);
  });
  return groups;
}

export function ExpenseHistory() {
  const navigate = useNavigate();
  const { appPath } = useAppPaths();
  const { expenses, deleteExpense, showToast, getMember, fmt, members } = useApp();
  const { t } = useT();
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState<CategoryType | 'all'>('all');
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories = useMemo(() => [
    { key: 'all' as const, label: t.expenseHistory.all },
    { key: 'food' as const, label: t.categories.food },
    { key: 'transport' as const, label: t.categories.transport },
    { key: 'accommodation' as const, label: t.categories.accommodation },
    { key: 'tickets' as const, label: t.categories.tickets },
    { key: 'shopping' as const, label: t.categories.shopping },
    { key: 'other' as const, label: t.categories.other },
  ], [t]);

  const filtered = useMemo(() => {
    return expenses.filter(exp => {
      const matchCat    = filter === 'all' || exp.category === filter;
      const matchSearch = exp.description.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [expenses, filter, search]);

  const grouped = useMemo(() => groupByDate(filtered, t), [filtered, t]);

  function handleDelete(id: string) {
    deleteExpense(id);
    showToast('success', t.expenseHistory.deletedExpense);
    setSwipedId(null);
  }

  return (
    <div className="bg-transparent min-h-screen flex flex-col">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="bg-sidebar px-4 pt-header pb-3 border-b border-border lg:pt-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-black text-foreground mb-3">{t.expenseHistory.title}</h1>
          <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2.5 border border-border">
            <Search size={16} className="text-muted-foreground flex-shrink-0" strokeWidth={2} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t.expenseHistory.searchPlaceholder}
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-subtle"
            />
            <button className="text-muted-foreground"><SlidersHorizontal size={16} strokeWidth={2} /></button>
          </div>
        </div>
      </div>

      {/* ── Category Filter ──────────────────────────────────────── */}
      <div className="bg-sidebar border-b border-border">
        <div className="max-w-2xl mx-auto">
          <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
            {categories.map(c => (
              <button
                key={c.key}
                onClick={() => setFilter(c.key)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                  ${filter === c.key
                    ? 'bg-primary text-white'
                    : 'bg-secondary text-muted-foreground'
                  }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Expense List ─────────────────────────────────────────── */}
      <StaggerContainer className="flex-1 max-w-2xl mx-auto w-full px-4 pt-3 pb-[calc(56px+72px+max(env(safe-area-inset-bottom,0px),8px))] lg:pb-20">
        {Object.keys(grouped).length === 0 && (
          <StaggerItem>
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-3 text-muted-foreground">
                <ReceiptText size={28} strokeWidth={1.5} />
              </div>
              <p className="font-bold text-foreground">{t.expenseHistory.noResults}</p>
              <p className="text-sm text-muted-foreground mt-1">{t.expenseHistory.tryOther}</p>
            </div>
          </StaggerItem>
        )}

        {Object.entries(grouped).map(([dateLabel, exps]) => (
          <StaggerItem key={dateLabel} className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-bold text-subtle uppercase tracking-wider">{dateLabel}</p>
              <div className="flex-1 h-px bg-switch-background" />
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {exps.map((exp, i) => {
                const isFundPaid = exp.paidBy === FUND_PAYER_ID;
                const payer = isFundPaid ? null : getMember(exp.paidBy);
                const shares = Object.values(splitAmountEvenly(exp.amount, exp.splitAmong));
                const perPersonMin = shares.length > 0 ? Math.min(...shares) : 0;
                const perPersonMax = shares.length > 0 ? Math.max(...shares) : 0;
                const isOpen = swipedId === exp.id;

                return (
                  <SwipeableRow
                    key={exp.id}
                    isOpen={isOpen}
                    onOpen={() => setSwipedId(exp.id)}
                    onClose={() => setSwipedId(prev => prev === exp.id ? null : prev)}
                    className={i < exps.length - 1 ? 'border-b border-border' : ''}
                    actions={[
                      {
                        label: t.expenseHistory.editAction,
                        icon: <Pencil size={16} strokeWidth={2} />,
                        bgClass: 'bg-accent-bg',
                        textClass: 'text-primary',
                        onClick: () => navigate(appPath('/add-expense'), { state: { editExpense: exp } }),
                      },
                      {
                        label: t.expenseHistory.deleteAction,
                        icon: <Trash2 size={16} strokeWidth={2} />,
                        bgClass: 'bg-destructive/15',
                        textClass: 'text-destructive',
                        onClick: () => handleDelete(exp.id),
                      },
                    ]}
                  >
                    <div className="flex items-center gap-3 px-4 py-3">
                      <CategoryIcon category={exp.category} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-foreground truncate">{exp.description}</p>
                          {isFundPaid && (
                            <span className="text-[10px] bg-accent-bg text-primary px-1.5 py-0.5 rounded-full flex-shrink-0">{t.common.fund}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <p className="text-xs text-muted-foreground">
                            {isFundPaid ? t.common.fundDeduct : `${t.common.by} ${payer?.name}`} ·
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedId(expandedId === exp.id ? null : exp.id);
                            }}
                            className="text-xs text-primary flex items-center gap-0.5"
                          >
                            {t.common.splitAmong(exp.splitAmong.length)}
                            <ChevronDown
                              size={10}
                              className={`transition-transform ${expandedId === exp.id ? 'rotate-180' : ''}`}
                            />
                          </button>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-black text-sm text-foreground tabular-nums">{fmt(exp.amount)}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {t.common.perPerson} {perPersonMin === perPersonMax ? fmt(perPersonMin) : `${fmt(perPersonMin)}~${fmt(perPersonMax)}`}
                        </p>
                      </div>
                    </div>
                    {/* Split member details */}
                    <AnimatePresence>
                      {expandedId === exp.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-3 pt-0.5">
                            <div className="flex flex-wrap gap-1.5">
                              {exp.splitAmong.map(id => {
                                const m = getMember(id);
                                return m ? (
                                  <div key={id} className="flex items-center gap-1 bg-secondary rounded-full pl-0.5 pr-2 py-0.5">
                                    <MemberAvatar member={m} size="sm" />
                                    <span className="text-[10px] text-muted-foreground">{m.name}</span>
                                  </div>
                                ) : null;
                              })}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </SwipeableRow>
                );
              })}
            </div>
          </StaggerItem>
        ))}

      </StaggerContainer>

      {/* ── Fixed Footer — always above bottom nav ────────────────── */}
      <div className="fixed bottom-[calc(62px+max(env(safe-area-inset-bottom,0px),8px))] lg:bottom-0 left-0 right-0 z-20 bg-sidebar/95 backdrop-blur-sm border-t border-border px-6 py-3">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            {t.expenseHistory.totalCount(filtered.length)}
          </span>
          <span className="font-black text-foreground tabular-nums text-sm">
            {t.expenseHistory.totalSum(fmt(filtered.reduce((s, e) => s + e.amount, 0)))}
          </span>
        </div>
      </div>
    </div>
  );
}
