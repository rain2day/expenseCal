# Personal Expense Tracking — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add per-member personal expense journal (CRUD + statistics) — separate from group shared expenses, pure bookkeeping with configurable privacy.

**Architecture:** New Firestore subcollection `personalExpenses/{memberId}/items/{expenseId}` with lazy-loaded AppContext state. Dedicated page at `/app/personal/:memberId` with 2 tabs (list + statistics). Entry point from Members page expanded card.

**Tech Stack:** React 18 + TypeScript, Firestore real-time listeners, Recharts (existing), Framer Motion (existing), Tailwind CSS (existing), i18n (existing zh/ja system).

**Design Doc:** `docs/plans/2026-02-24-personal-expenses-design.md`

---

## Task 1: PersonalExpense Type + Data Exports

**Files:**
- Modify: `src/app/data/sampleData.ts` (after line 38, after Contribution interface)

**Step 1: Add PersonalExpense interface and CategoryType reuse**

Add to `src/app/data/sampleData.ts` after the `Contribution` interface (line 38):

```typescript
export interface PersonalExpense {
  id: string;
  amount: number;          // minor units (same as Expense)
  description: string;     // max 120 chars
  category: CategoryType;  // reuse existing 6 categories
  date: string;            // YYYY-MM-DD
  createdAt?: string;      // ISO timestamp
  visibility: 'private' | 'group';
}
```

**Step 2: Verify build passes**

Run: `cd /Users/rainsday/Library/CloudStorage/Dropbox/cluade/expsene/expenseCal && npm run build`
Expected: Build succeeds, no errors.

**Step 3: Commit**

```bash
git add src/app/data/sampleData.ts
git commit -m "feat(personal): add PersonalExpense interface"
```

---

## Task 2: i18n — Add Personal Expense Translation Keys

**Files:**
- Modify: `src/app/i18n/types.ts` (add `personal` section after `pdf` section, before closing `}`)
- Modify: `src/app/i18n/zh.ts` (add `personal` section)
- Modify: `src/app/i18n/ja.ts` (add `personal` section)

**Step 1: Add type definitions to `types.ts`**

Add new `personal` section in the `Translations` interface (after `pdf` section, before the final `}`):

```typescript
  personal: {
    title: (name: string) => string;
    listTab: string;
    statsTab: string;
    addTitle: string;
    editTitle: string;
    enterAmount: string;
    description: string;
    descriptionPlaceholder: string;
    category: string;
    date: string;
    visibility: string;
    private: string;
    group: string;
    privateHint: string;
    groupHint: string;
    save: string;
    update: string;
    noExpenses: string;
    noExpensesHint: string;
    deleteConfirm: string;
    deleted: string;
    added: string;
    updated: string;
    totalSpent: string;
    dailyAvg: string;
    peakDay: string;
    daysWithSpending: (n: number) => string;
    categoryDist: string;
    dailyTrend: string;
    viewPersonal: string;
  };
```

**Step 2: Add Chinese translations to `zh.ts`**

```typescript
  personal: {
    title: (name: string) => `${name} 的個人消費`,
    listTab: '支出列表',
    statsTab: '統計分析',
    addTitle: '新增個人消費',
    editTitle: '編輯個人消費',
    enterAmount: '輸入金額',
    description: '描述',
    descriptionPlaceholder: '例：藥妝、手信、紀念品…',
    category: '分類',
    date: '日期',
    visibility: '可見性',
    private: '私人',
    group: '群組可見',
    privateHint: '只有自己可見',
    groupHint: '群組成員可見',
    save: '儲存',
    update: '更新',
    noExpenses: '暫無個人消費',
    noExpensesHint: '按 + 記錄你的個人消費',
    deleteConfirm: '確定刪除此筆消費？',
    deleted: '已刪除個人消費',
    added: '已新增個人消費',
    updated: '已更新個人消費',
    totalSpent: '總消費',
    dailyAvg: '日均消費',
    peakDay: '最高消費日',
    daysWithSpending: (n: number) => `${n} 天有消費`,
    categoryDist: '分類分佈',
    dailyTrend: '每日趨勢',
    viewPersonal: '個人消費',
  },
```

**Step 3: Add Japanese translations to `ja.ts`**

```typescript
  personal: {
    title: (name: string) => `${name} の個人支出`,
    listTab: '支出一覧',
    statsTab: '統計分析',
    addTitle: '個人支出を追加',
    editTitle: '個人支出を編集',
    enterAmount: '金額を入力',
    description: '説明',
    descriptionPlaceholder: '例：お土産、ドラッグストア…',
    category: 'カテゴリー',
    date: '日付',
    visibility: '公開設定',
    private: '非公開',
    group: 'グループ公開',
    privateHint: '自分だけ見える',
    groupHint: 'グループメンバーに公開',
    save: '保存',
    update: '更新',
    noExpenses: '個人支出はまだありません',
    noExpensesHint: '+ ボタンで個人支出を記録',
    deleteConfirm: 'この支出を削除しますか？',
    deleted: '個人支出を削除しました',
    added: '個人支出を追加しました',
    updated: '個人支出を更新しました',
    totalSpent: '合計支出',
    dailyAvg: '日平均',
    peakDay: '最高支出日',
    daysWithSpending: (n: number) => `${n}日支出あり`,
    categoryDist: 'カテゴリー分布',
    dailyTrend: '日別推移',
    viewPersonal: '個人支出',
  },
```

**Step 4: Verify build passes**

Run: `npm run build`
Expected: Build succeeds. TypeScript enforces zh and ja have identical keys.

**Step 5: Commit**

```bash
git add src/app/i18n/types.ts src/app/i18n/zh.ts src/app/i18n/ja.ts
git commit -m "feat(personal): add i18n keys for personal expenses (zh + ja)"
```

---

## Task 3: Firestore Security Rules

**Files:**
- Modify: `firestore.rules` (add rules inside `match /groups/{groupId}` block, after contributions match at line 89)

**Step 1: Add validation function + match blocks**

Add before the closing `}` of `match /groups/{groupId}` (before line 90):

```
      // ── Personal expenses ─────────────────────────────────
      function isVisibility(v) {
        return v == 'private' || v == 'group';
      }

      function validPersonalExpenseData(data) {
        return data.keys().hasOnly(['amount', 'description', 'category', 'date', 'createdAt', 'visibility']) &&
          isAmountMinorUnit(data.amount) &&
          isShortString(data.description, 120) &&
          isCategory(data.category) &&
          isDateString(data.date) &&
          isVisibility(data.visibility) &&
          (!data.keys().hasAny(['createdAt']) || isShortString(data.createdAt, 40));
      }

      match /personalExpenses/{memberId} {
        allow read, write: if isSignedIn();
      }

      match /personalExpenses/{memberId}/items/{expenseId} {
        allow read: if isSignedIn();
        allow create, update: if isSignedIn() && validPersonalExpenseData(request.resource.data);
        allow delete: if isSignedIn();
      }
```

**Step 2: Deploy rules**

Run: `cd /Users/rainsday/Library/CloudStorage/Dropbox/cluade/expsene/expenseCal && npx firebase deploy --only firestore:rules`
Expected: Rules deployed successfully. (If firebase CLI not installed, skip deploy — rules will be deployed manually.)

**Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat(personal): add Firestore security rules for personal expenses"
```

---

## Task 4: AppContext — Personal Expense State + CRUD

**Files:**
- Modify: `src/app/context/AppContext.tsx`

This is the largest task. We add:
1. New state: `personalExpenses` array
2. New methods: `loadPersonalExpenses`, `addPersonalExpense`, `deletePersonalExpense`, `updatePersonalExpense`
3. New cleanup ref for personal expense listener

**Step 1: Add imports and interface changes**

In `AppContext.tsx`, add `PersonalExpense` to the import from `sampleData.ts` (line 9):

```typescript
import {
  Expense,
  EXPENSES,
  MEMBERS,
  Member,
  GROUP_NAME,
  CURRENCY,
  canonicalCurrencySymbol,
  getCurrencyMinorDigits,
  computeBalances,
  computeSettlements,
  computeFundBalance,
  FUND_PAYER_ID,
  CONTRIBUTIONS,
  formatAmount,
  normalizeMinorAmount,
} from '../data/sampleData';
import type { Settlement, CategoryType, Contribution, PersonalExpense } from '../data/sampleData';
```

Add to the `AppContextValue` interface (after `leaveCurrentGroup` at line 82):

```typescript
  // Personal expenses
  personalExpenses: PersonalExpense[];
  loadPersonalExpenses: (memberId: string) => () => void;
  addPersonalExpense: (memberId: string, exp: PersonalExpense) => void;
  deletePersonalExpense: (memberId: string, expenseId: string) => void;
  updatePersonalExpense: (memberId: string, exp: PersonalExpense) => void;
  personalExpensesLoading: boolean;
```

**Step 2: Add state declarations inside AppProvider**

After `const [savedGroups, setSavedGroups]` block (around line 128), add:

```typescript
  // ── Personal expenses (lazy loaded) ────────────────────────────────
  const [personalExpenses, setPersonalExpenses] = useState<PersonalExpense[]>([]);
  const [personalExpensesLoading, setPersonalExpensesLoading] = useState(false);
  const personalCleanupRef = useRef<(() => void) | null>(null);
```

**Step 3: Add loadPersonalExpenses method**

After the `leaveCurrentGroup` callback (around line 279), add:

```typescript
  // ── loadPersonalExpenses (lazy, called from PersonalExpenses page) ──
  const loadPersonalExpenses = useCallback((memberId: string) => {
    // Clean up previous listener
    if (personalCleanupRef.current) {
      personalCleanupRef.current();
      personalCleanupRef.current = null;
    }

    if (demoMode || !groupId) {
      // Demo mode: no personal expenses
      setPersonalExpenses([]);
      return () => {};
    }

    setPersonalExpensesLoading(true);

    const itemsRef = collection(db, 'groups', groupId, 'personalExpenses', memberId, 'items');
    const itemsQuery = query(itemsRef, orderBy('date', 'desc'));
    const unsub = onSnapshot(itemsQuery, (snap) => {
      const items: PersonalExpense[] = [];
      snap.forEach((d) => {
        const data = d.data();
        items.push({
          id: d.id,
          amount: normalizeMinorAmount(data.amount),
          description: data.description,
          category: data.category as CategoryType,
          date: data.date,
          createdAt: data.createdAt,
          visibility: data.visibility || 'private',
        });
      });
      setPersonalExpenses(items);
      setPersonalExpensesLoading(false);
    });

    personalCleanupRef.current = unsub;
    return unsub;
  }, [demoMode, groupId]);
```

**Step 4: Add CRUD methods**

After `loadPersonalExpenses`, add:

```typescript
  // ── addPersonalExpense ──────────────────────────────────────────────
  const addPersonalExpense = useCallback((memberId: string, exp: PersonalExpense) => {
    const withCreatedAt = {
      ...exp,
      amount: normalizeMinorAmount(exp.amount),
      createdAt: exp.createdAt || new Date().toISOString(),
    };

    if (demoMode || !groupId) {
      setPersonalExpenses(prev => [withCreatedAt, ...prev]);
    } else {
      const itemsRef = collection(db, 'groups', groupId, 'personalExpenses', memberId, 'items');
      const { id: _id, ...data } = withCreatedAt;
      addDoc(itemsRef, data).catch((err) => {
        console.error('Failed to add personal expense:', err);
        showToast('error', t.errors.addExpenseFailed);
      });
    }
  }, [demoMode, groupId, showToast, t]);

  // ── deletePersonalExpense ───────────────────────────────────────────
  const deletePersonalExpense = useCallback((memberId: string, expenseId: string) => {
    if (demoMode || !groupId) {
      setPersonalExpenses(prev => prev.filter(e => e.id !== expenseId));
    } else {
      const expDocRef = doc(db, 'groups', groupId, 'personalExpenses', memberId, 'items', expenseId);
      deleteDoc(expDocRef).catch((err) => {
        console.error('Failed to delete personal expense:', err);
        showToast('error', t.errors.deleteExpenseFailed);
      });
    }
  }, [demoMode, groupId, showToast, t]);

  // ── updatePersonalExpense ───────────────────────────────────────────
  const updatePersonalExpense = useCallback((memberId: string, exp: PersonalExpense) => {
    const normalized = { ...exp, amount: normalizeMinorAmount(exp.amount) };
    if (demoMode || !groupId) {
      setPersonalExpenses(prev => prev.map(e => e.id === normalized.id ? normalized : e));
    } else {
      const expDocRef = doc(db, 'groups', groupId, 'personalExpenses', memberId, 'items', normalized.id);
      const { id: _id, ...data } = normalized;
      updateDoc(expDocRef, data).catch((err) => {
        console.error('Failed to update personal expense:', err);
        showToast('error', t.errors.updateExpenseFailed);
      });
    }
  }, [demoMode, groupId, showToast, t]);
```

**Step 5: Add cleanup for personal listener on unmount**

In the unmount cleanup useEffect (around line 436-442), add personal cleanup:

```typescript
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      if (personalCleanupRef.current) {
        personalCleanupRef.current();
      }
    };
  }, []);
```

**Step 6: Add to Provider value**

In the `<AppContext.Provider value={{...}}>` (around line 750), add:

```typescript
      personalExpenses, loadPersonalExpenses, addPersonalExpense,
      deletePersonalExpense, updatePersonalExpense, personalExpensesLoading,
```

**Step 7: Verify build passes**

Run: `npm run build`
Expected: Build succeeds, no type errors.

**Step 8: Commit**

```bash
git add src/app/context/AppContext.tsx
git commit -m "feat(personal): add AppContext state and CRUD for personal expenses"
```

---

## Task 5: PersonalExpenses Screen (List + Stats)

**Files:**
- Create: `src/app/screens/PersonalExpenses.tsx`

This is the main page with 2 tabs. It uses `useParams` to get `memberId`, lazy-loads personal expenses via `loadPersonalExpenses`, and renders list + statistics tabs.

**Step 1: Create the complete PersonalExpenses component**

Create `src/app/screens/PersonalExpenses.tsx`:

```typescript
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
            <button onClick={() => navigate(-1)} className="text-muted-foreground active:text-foreground">
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
                                  className="px-3 py-1.5 bg-destructive text-white text-xs font-bold rounded-lg"
                                >
                                  {t.common.confirm}
                                </button>
                                <button
                                  onClick={() => setConfirmDelete(null)}
                                  className="px-3 py-1.5 bg-secondary text-muted-foreground text-xs font-bold rounded-lg"
                                >
                                  {t.common.cancel}
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setConfirmDelete(exp.id)}
                                className="flex items-center gap-1.5 text-xs text-destructive/70 active:text-destructive"
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
          bottom: 'calc(max(env(safe-area-inset-bottom, 0px), 8px) + 14px)',
          right: '20px',
          width: '56px',
          height: '56px',
          boxShadow: '0 8px 24px rgba(221,132,60,0.4)',
        }}
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {/* ── Add/Edit Form Overlay ──────────────────────────── */}
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
   Add Personal Expense Form (inline overlay)
   ════════════════════════════════════════════════════════════════════ */

const CATEGORIES: CategoryType[] = ['food', 'transport', 'accommodation', 'tickets', 'shopping', 'other'];

function AddPersonalExpenseForm({
  memberId,
  onClose,
}: {
  memberId: string;
  onClose: () => void;
}) {
  const { addPersonalExpense, showToast, currency, fmt } = useApp();
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
          <button onClick={onClose} className="text-muted-foreground">✕</button>
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
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/app/screens/PersonalExpenses.tsx
git commit -m "feat(personal): add PersonalExpenses screen with list + stats tabs"
```

---

## Task 6: Route Setup

**Files:**
- Modify: `src/app/routes.ts` (add import + route)

**Step 1: Add import and route entry**

Add import at line 11 (after Members import):

```typescript
import { PersonalExpenses } from './screens/PersonalExpenses';
```

Add route inside the `children` array (after `members` route at line 49):

```typescript
      { path: 'personal/:memberId', Component: PersonalExpenses },
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/app/routes.ts
git commit -m "feat(personal): add /app/personal/:memberId route"
```

---

## Task 7: Members Page Entry Point

**Files:**
- Modify: `src/app/screens/Members.tsx`

Add a "個人消費" button in each member's expanded section, linking to `/app/personal/:memberId`.

**Step 1: Add import and navigation**

Add `useNavigate` to imports (line 1):

```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router';
```

Add `Wallet` to lucide imports:

```typescript
import { UserPlus, Link2, ChevronDown, Crown, Share2, Copy, Trash2, Wallet } from 'lucide-react';
```

Inside the `Members` component, add navigate:

```typescript
const navigate = useNavigate();
```

**Step 2: Add personal expense button in expanded section**

In the expanded member card section, before the "Delete member" section (before `{members.length > 1 && (` around line 167), add:

```typescript
                      {/* Personal expenses link */}
                      <button
                        onClick={() => navigate(`/app/personal/${b.member.id}`)}
                        className="flex items-center gap-2 w-full py-2 px-1 text-sm font-bold text-primary active:text-primary/70 transition-colors"
                      >
                        <Wallet size={15} strokeWidth={2} />
                        {t.personal.viewPersonal}
                      </button>
```

**Step 3: Verify build passes**

Run: `npm run build`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add src/app/screens/Members.tsx
git commit -m "feat(personal): add entry point button in Members page"
```

---

## Task 8: Build + Manual Test + Final Commit

**Step 1: Full production build**

Run: `npm run build`
Expected: Build succeeds with zero errors and zero warnings.

**Step 2: Manual verification checklist**

- [ ] Members page: expand a member → "個人消費" button visible
- [ ] Click "個人消費" → navigates to `/app/personal/:memberId`
- [ ] Personal page shows header with member name + back button
- [ ] List/Stats tab switch works
- [ ] Empty state message shows correctly
- [ ] FAB (+ button) opens add form overlay
- [ ] Add form: amount, description, category, date, visibility all work
- [ ] Save creates entry in Firestore
- [ ] List shows new entry with category icon, description, amount, visibility icon
- [ ] Tap entry → expand → delete button → confirm delete → item removed
- [ ] Stats tab shows donut chart, bar chart, summary cards
- [ ] Language switch (zh/ja) applies to all personal expense text
- [ ] Back button returns to Members page

**Step 3: Final combined commit (if any touch-ups needed)**

```bash
git add -A
git commit -m "feat(personal): personal expense tracking with list + statistics"
```

**Step 4: Push**

```bash
git push origin main
```

---

## File Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/app/data/sampleData.ts` | Modify | Add `PersonalExpense` interface |
| `src/app/i18n/types.ts` | Modify | Add `personal` translation keys |
| `src/app/i18n/zh.ts` | Modify | Add Chinese translations |
| `src/app/i18n/ja.ts` | Modify | Add Japanese translations |
| `firestore.rules` | Modify | Add personalExpenses validation + match rules |
| `src/app/context/AppContext.tsx` | Modify | Add state, CRUD methods, lazy listener |
| `src/app/screens/PersonalExpenses.tsx` | **Create** | Main page: list + stats + add form |
| `src/app/routes.ts` | Modify | Add `/app/personal/:memberId` route |
| `src/app/screens/Members.tsx` | Modify | Add "個人消費" entry button |
