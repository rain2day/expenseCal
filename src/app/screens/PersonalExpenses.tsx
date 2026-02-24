import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Plus, ArrowLeft, Lock, Eye, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { useApp } from '../context/AppContext';
import { useT } from '../i18n/I18nContext';
import { CategoryType } from '../data/sampleData';
import { CategoryIcon, StaggerContainer, StaggerItem } from '../components/SharedComponents';

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
  const {
    getMember, personalExpenses, loadPersonalExpenses,
    deletePersonalExpense, personalExpensesLoading,
    showToast, fmt,
  } = useApp();
  const { t } = useT();
  const [activeTab, setActiveTab] = useState<'list' | 'stats'>('list');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<string | null>(null);

  const member = memberId ? getMember(memberId) : undefined;

  // Lazy-load personal expenses when page mounts
  useEffect(() => {
    if (!memberId) return;
    const cleanup = loadPersonalExpenses(memberId);
    return cleanup;
  }, [memberId, loadPersonalExpenses]);

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
            <h1 className="text-xl font-black text-foreground">{t.personal.title(member.name)}</h1>
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
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-secondary transition-colors"
                      onClick={() => setEditingExpense(editingExpense === exp.id ? null : exp.id)}
                    >
                      <CategoryIcon category={exp.category} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{exp.description}</p>
                        <p className="text-xs text-muted-foreground">{exp.date}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {exp.visibility === 'private' ? (
                          <Lock size={12} className="text-subtle" />
                        ) : (
                          <Eye size={12} className="text-subtle" />
                        )}
                        <span className="font-black text-sm tabular-nums text-foreground">{fmt(exp.amount)}</span>
                      </div>
                    </div>

                    {/* Expanded: delete action */}
                    <AnimatePresence initial={false}>
                      {editingExpense === exp.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ height: { duration: 0.25 }, opacity: { duration: 0.15 } }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-border px-4 py-2.5 bg-sidebar flex justify-end gap-2">
                            {confirmDelete === exp.id ? (
                              <>
                                <span className="flex-1 text-xs text-destructive self-center">{t.personal.deleteConfirm}</span>
                                <button
                                  onClick={() => {
                                    if (memberId) {
                                      deletePersonalExpense(memberId, exp.id);
                                      showToast('success', t.personal.deleted);
                                    }
                                    setConfirmDelete(null);
                                    setEditingExpense(null);
                                  }}
                                  className="px-3 py-1.5 bg-destructive text-white text-xs font-bold rounded-lg active:scale-95 transition-transform"
                                >
                                  {t.common.confirm}
                                </button>
                                <button
                                  onClick={() => setConfirmDelete(null)}
                                  className="px-3 py-1.5 bg-secondary text-muted-foreground text-xs font-bold rounded-lg active:scale-95 transition-transform"
                                >
                                  {t.common.cancel}
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setConfirmDelete(exp.id)}
                                className="flex items-center gap-1.5 text-xs text-destructive/70 active:text-destructive transition-colors"
                              >
                                <Trash2 size={13} strokeWidth={2} /> {t.common.delete}
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </StaggerItem>
              ))
            )}
          </StaggerContainer>
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

      {/* ── FAB for quick add ──────────────────────────────── */}
      <button
        onClick={() => setShowAddForm(true)}
        className="lg:hidden fixed z-40 rounded-full bg-primary text-white flex items-center justify-center border border-white/24 active:scale-90 transition-transform"
        style={{
          bottom: 'calc(max(env(safe-area-inset-bottom, 0px), 8px) + 86px)',
          right: '20px',
          width: '56px',
          height: '56px',
          boxShadow: '0 8px 24px rgba(221,132,60,0.4)',
        }}
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {/* Desktop add button */}
      <div className="hidden lg:block max-w-2xl mx-auto px-4 pb-6">
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full bg-primary text-white rounded-xl py-3 flex items-center justify-center gap-2 font-bold active:scale-95 transition-transform shadow-lg shadow-primary/20"
        >
          <Plus size={17} strokeWidth={2.5} />
          {t.personal.addTitle}
        </button>
      </div>

      {/* ── Add Form Overlay ──────────────────────────── */}
      <AnimatePresence>
        {showAddForm && memberId && (
          <AddPersonalExpenseForm
            memberId={memberId}
            onClose={() => setShowAddForm(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Add Personal Expense Form (bottom sheet overlay)
   ════════════════════════════════════════════════════════════════════ */

const CATEGORIES: CategoryType[] = ['food', 'transport', 'accommodation', 'tickets', 'shopping', 'other'];

function AddPersonalExpenseForm({
  memberId,
  onClose,
}: {
  memberId: string;
  onClose: () => void;
}) {
  const { addPersonalExpense, showToast } = useApp();
  const { t } = useT();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CategoryType>('shopping');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [visibility, setVisibility] = useState<'private' | 'group'>('private');

  function handleSave() {
    const amtNum = Math.round(Number(amount));
    if (!amtNum || amtNum <= 0 || !description.trim()) {
      showToast('error', t.addExpense.errorRequired);
      return;
    }

    const exp = {
      id: `pe_${Date.now()}`,
      amount: amtNum,
      description: description.trim(),
      category,
      date,
      visibility,
    };

    addPersonalExpense(memberId, exp);
    showToast('success', t.personal.added);
    onClose();
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="w-full max-w-lg bg-card border-t border-border rounded-t-3xl p-5 space-y-4"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 34 }}
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 20px)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-black text-foreground">{t.personal.addTitle}</h2>
          <button onClick={onClose} className="text-muted-foreground active:text-foreground transition-colors text-lg">✕</button>
        </div>

        {/* Amount */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{t.personal.enterAmount}</label>
          <input
            autoFocus
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0"
            className="w-full bg-secondary rounded-xl px-3 py-2.5 text-lg font-black text-foreground outline-none border border-border focus:border-primary tabular-nums"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{t.personal.description}</label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
            placeholder={t.personal.descriptionPlaceholder}
            className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground outline-none border border-border focus:border-primary placeholder:text-subtle"
          />
        </div>

        {/* Category */}
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">{t.personal.category}</label>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors
                  ${category === cat
                    ? 'bg-accent-bg text-primary border border-primary/30'
                    : 'bg-secondary text-muted-foreground border border-border'
                  }`}
              >
                <CategoryIcon category={cat} size="sm" />
                {t.categories[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Date + Visibility */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">{t.personal.date}</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground outline-none border border-border focus:border-primary"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">{t.personal.visibility}</label>
            <div className="flex gap-1 bg-secondary rounded-xl p-1 border border-border">
              <button
                onClick={() => setVisibility('private')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors
                  ${visibility === 'private' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
              >
                <Lock size={11} /> {t.personal.private}
              </button>
              <button
                onClick={() => setVisibility('group')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors
                  ${visibility === 'group' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
              >
                <Eye size={11} /> {t.personal.group}
              </button>
            </div>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          className="w-full bg-primary text-white rounded-xl py-3 font-bold text-sm active:scale-95 transition-transform shadow-lg shadow-primary/20"
        >
          {t.personal.save}
        </button>
      </motion.div>
    </motion.div>
  );
}
