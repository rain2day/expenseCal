import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  collection, doc, setDoc, addDoc, deleteDoc, updateDoc, getDocs,
  onSnapshot, query, orderBy, writeBatch,
} from 'firebase/firestore';
import { db, ensureAuth } from '../firebase';
import { useT } from '../i18n/I18nContext';
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
  GROUP_BUYS,
  formatAmount,
  normalizeMinorAmount,
} from '../data/sampleData';
import type { Settlement, CategoryType, Contribution, PersonalExpense, GroupBuy } from '../data/sampleData';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AppContextValue {
  darkMode: boolean;
  toggleDarkMode: () => void;
  currency: string;
  setCurrency: (c: string) => void;
  members: Member[];
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
  expenses: Expense[];
  addExpense: (e: Expense) => void;
  deleteExpense: (id: string) => void;
  updateExpense: (e: Expense) => void;
  clearAllExpenses: () => void;
  groupName: string;
  setGroupName: (n: string) => void;
  settlements: Settlement[];
  setSettlements: React.Dispatch<React.SetStateAction<Settlement[]>>;
  balances: ReturnType<typeof computeBalances>;
  totalSpent: number;
  toasts: Toast[];
  showToast: (type: Toast['type'], message: string) => void;
  // Fund / contributions
  contributions: Contribution[];
  addContribution: (c: Contribution) => void;
  deleteContribution: (id: string) => void;
  fundBalance: number;
  fundSpent: number;
  totalContributions: number;
  budget: number;
  // Firebase / group
  groupId: string | null;
  demoMode: boolean;
  isLoading: boolean;
  createGroup: (name: string, budget: number, currency: string, members: Member[]) => Promise<string>;
  joinGroup: (groupId: string, member: Member) => Promise<void>;
  enterGroup: (groupId: string) => Promise<void>;
  convertCurrency: (newSymbol: string, rate: number) => Promise<void>;
  enterDemoMode: () => void;
  deleteMember: (id: string) => Promise<boolean>;
  addMember: (m: Member) => void;
  getMember: (id: string) => Member | undefined;
  fmt: (amount: number) => string;
  // Notifications
  unreadCount: number;
  markAllRead: () => void;
  notifications: boolean;
  toggleNotifications: () => void;
  // Group switching
  savedGroups: Array<{ id: string; name: string }>;
  switchGroup: (gid: string) => void;
  leaveCurrentGroup: () => void;
  // Personal expenses
  personalExpenses: PersonalExpense[];
  loadPersonalExpenses: (memberId: string) => () => void;
  addPersonalExpense: (memberId: string, exp: PersonalExpense) => void;
  deletePersonalExpense: (memberId: string, expenseId: string) => void;
  updatePersonalExpense: (memberId: string, exp: PersonalExpense) => void;
  personalExpensesLoading: boolean;
  // Group buys
  groupBuys: GroupBuy[];
  groupBuysLoading: boolean;
  loadGroupBuys: () => (() => void);
  addGroupBuy: (gb: Omit<GroupBuy, 'id' | 'createdAt'>) => Promise<void>;
  deleteGroupBuy: (gbId: string) => void;
  toggleGroupBuySettlement: (gbId: string, memberId: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function convertMinorByCurrencyDigits(amount: number, fromCurrency: string, toCurrency: string): number {
  const fromDigits = getCurrencyMinorDigits(fromCurrency);
  const toDigits = getCurrencyMinorDigits(toCurrency);
  const delta = toDigits - fromDigits;
  const normalized = normalizeMinorAmount(amount);
  if (delta === 0) return normalized;
  if (delta > 0) return normalizeMinorAmount(normalized * 10 ** delta);
  return normalizeMinorAmount(normalized / 10 ** Math.abs(delta));
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { t } = useT();

  // ── Dark mode ──────────────────────────────────────────────────────
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('gcd-dark');
    return stored ? stored === 'true' : true;
  });

  // ── Core state ─────────────────────────────────────────────────────
  // When a real groupId exists, start empty to avoid flashing demo data
  const hasStoredGroup = !!localStorage.getItem('gcd-groupId');
  const preferredCurrency = canonicalCurrencySymbol(localStorage.getItem('gcd-currency') || CURRENCY);
  const [currency, setCurrencyLocal] = useState(preferredCurrency);
  const [members, setMembers] = useState<Member[]>(hasStoredGroup ? [] : MEMBERS);
  const [expenses, setExpenses] = useState<Expense[]>(hasStoredGroup ? [] : EXPENSES);
  const [groupNameLocal, setGroupNameLocal] = useState(hasStoredGroup ? '' : GROUP_NAME);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>(hasStoredGroup ? [] : CONTRIBUTIONS);
  const [budget, setBudget] = useState(0);
  const [notifications, setNotifications] = useState(() => {
    const stored = localStorage.getItem('gcd-notifications');
    return stored !== null ? stored === 'true' : true;
  });

  // ── Personal expenses (lazy loaded) ────────────────────────────────
  const [personalExpenses, setPersonalExpenses] = useState<PersonalExpense[]>([]);
  const [personalExpensesLoading, setPersonalExpensesLoading] = useState(false);
  const personalCleanupRef = useRef<(() => void) | null>(null);

  // ── Saved groups (multi-group support) ────────────────────────────
  const [savedGroups, setSavedGroups] = useState<Array<{ id: string; name: string }>>(() => {
    try {
      const raw = localStorage.getItem('gcd-groups');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  // ── Firebase / group state ─────────────────────────────────────────
  const [groupId, setGroupId] = useState<string | null>(() =>
    localStorage.getItem('gcd-groupId')
  );
  const [demoMode, setDemoMode] = useState<boolean>(() => {
    // If there's no groupId stored, we default to demo mode
    // Actual demo mode gets explicitly set via enterDemoMode
    return !localStorage.getItem('gcd-groupId');
  });

  // ── Group buys (lazy loaded) ──────────────────────────────────────
  // Must be after demoMode declaration to avoid TDZ
  const [groupBuys, setGroupBuys] = useState<GroupBuy[]>(demoMode ? GROUP_BUYS : []);
  const [groupBuysLoading, setGroupBuysLoading] = useState(false);
  const groupBuysCleanupRef = useRef<(() => void) | null>(null);

  const [isLoading, setIsLoading] = useState(hasStoredGroup);

  // ── Notification state ─────────────────────────────────────────────
  const [lastSeen, setLastSeen] = useState<string>(() =>
    localStorage.getItem('gcd-lastSeen') || new Date(0).toISOString()
  );

  // Ref to hold Firestore listener cleanup functions
  const cleanupRef = useRef<(() => void) | null>(null);

  // ── Firestore-syncing setters ──────────────────────────────────────
  const groupName = groupNameLocal;
  const setGroupName = useCallback((name: string) => {
    setGroupNameLocal(name);
    if (!demoMode && groupId) {
      updateDoc(doc(db, 'groups', groupId), { name }).catch((err) =>
        console.error('Failed to update group name:', err)
      );
    }
  }, [demoMode, groupId]);

  const setCurrency = useCallback((rawCurrency: string) => {
    const nextCurrency = canonicalCurrencySymbol(rawCurrency);
    const prevCurrency = canonicalCurrencySymbol(currency);
    if (nextCurrency === prevCurrency) return;

    const convert = (amount: number) => convertMinorByCurrencyDigits(amount, prevCurrency, nextCurrency);

    setCurrencyLocal(nextCurrency);
    localStorage.setItem('gcd-currency', nextCurrency);
    setExpenses((prev) => prev.map((exp) => ({ ...exp, amount: convert(exp.amount) })));
    setContributions((prev) => prev.map((contrib) => ({ ...contrib, amount: convert(contrib.amount) })));
    setBudget((prev) => convert(prev));

    if (!demoMode && groupId) {
      const nextBudget = convert(budget);
      updateDoc(doc(db, 'groups', groupId), { currency: nextCurrency, budget: nextBudget }).catch((err) =>
        console.error('Failed to update currency:', err)
      );

      expenses.forEach((exp) => {
        updateDoc(doc(db, 'groups', groupId, 'expenses', exp.id), {
          amount: convert(exp.amount),
        }).catch((err) => console.error('Failed to convert expense amount:', err));
      });

      contributions.forEach((contrib) => {
        updateDoc(doc(db, 'groups', groupId, 'contributions', contrib.id), {
          amount: convert(contrib.amount),
        }).catch((err) => console.error('Failed to convert contribution amount:', err));
      });
    }
  }, [budget, contributions, currency, demoMode, expenses, groupId]);

  const toggleNotifications = useCallback(() => {
    setNotifications(prev => {
      const next = !prev;
      localStorage.setItem('gcd-notifications', String(next));
      return next;
    });
  }, []);

  // ── Derived state ──────────────────────────────────────────────────
  const totalContributions = contributions.reduce((sum, c) => sum + c.amount, 0);
  const fundSpent = expenses.filter(e => e.paidBy === FUND_PAYER_ID).reduce((sum, e) => sum + e.amount, 0);
  const fundBalance = computeFundBalance(contributions, expenses);
  const balances = computeBalances(expenses, members, contributions);
  const [settlements, setSettlements] = useState<Settlement[]>(() => computeSettlements(balances, fundBalance));
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Recompute settlements whenever expenses, members, or contributions change
  useEffect(() => {
    const newBalances = computeBalances(expenses, members, contributions);
    const newFundBalance = computeFundBalance(contributions, expenses);
    setSettlements(computeSettlements(newBalances, newFundBalance));
  }, [expenses, members, contributions]);

  // ── Unread count ───────────────────────────────────────────────────
  const unreadCount = expenses.filter(e => {
    if (!e.createdAt) return false;
    return e.createdAt > lastSeen;
  }).length;

  const markAllRead = useCallback(() => {
    const now = new Date().toISOString();
    setLastSeen(now);
    localStorage.setItem('gcd-lastSeen', now);
  }, []);

  // Auto-save current group to saved list when we know its name
  useEffect(() => {
    if (groupId && groupNameLocal && !demoMode) {
      setSavedGroups(prev => {
        const existing = prev.find(g => g.id === groupId);
        let next: typeof prev;
        if (existing) {
          // Update name if changed
          if (existing.name !== groupNameLocal) {
            next = prev.map(g => g.id === groupId ? { ...g, name: groupNameLocal } : g);
          } else {
            return prev; // no change
          }
        } else {
          next = [...prev, { id: groupId, name: groupNameLocal }];
        }
        localStorage.setItem('gcd-groups', JSON.stringify(next));
        return next;
      });
    }
  }, [groupId, groupNameLocal, demoMode]);

  // ── switchGroup ──────────────────────────────────────────────────
  const switchGroup = useCallback((gid: string) => {
    localStorage.setItem('gcd-groupId', gid);
    window.location.reload();
  }, []);

  // ── leaveCurrentGroup ────────────────────────────────────────────
  const leaveCurrentGroup = useCallback(() => {
    if (!groupId) return;

    // Remove from saved groups
    const updated = savedGroups.filter(g => g.id !== groupId);
    localStorage.setItem('gcd-groups', JSON.stringify(updated));

    // Clean up listeners
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    // If there's another saved group, switch to it
    if (updated.length > 0) {
      localStorage.setItem('gcd-groupId', updated[0].id);
      window.location.reload();
    } else {
      // No more groups — go to onboarding
      localStorage.removeItem('gcd-groupId');
      window.location.href = import.meta.env.BASE_URL || '/';
    }
  }, [groupId, savedGroups]);

  // ── loadPersonalExpenses (lazy, called from PersonalExpenses page) ──
  const loadPersonalExpenses = useCallback((memberId: string) => {
    // Clean up previous listener
    if (personalCleanupRef.current) {
      personalCleanupRef.current();
      personalCleanupRef.current = null;
    }

    if (demoMode || !groupId) {
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
          groupBuyId: data.groupBuyId,
        });
      });
      setPersonalExpenses(items);
      setPersonalExpensesLoading(false);
    });

    personalCleanupRef.current = unsub;
    return unsub;
  }, [demoMode, groupId]);

  // ── Dark mode side effect ──────────────────────────────────────────
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('gcd-dark', String(darkMode));
  }, [darkMode]);

  const toggleDarkMode = useCallback(() => setDarkMode(d => !d), []);

  // ── Toast ──────────────────────────────────────────────────────────
  const showToast = useCallback((type: Toast['type'], message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

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

  // ── loadGroupBuys (lazy, called from GroupBuy page) ────────────────
  const loadGroupBuys = useCallback(() => {
    if (groupBuysCleanupRef.current) groupBuysCleanupRef.current();

    if (demoMode || !groupId) {
      setGroupBuysLoading(false);
      return () => {};
    }

    setGroupBuysLoading(true);
    const gbRef = collection(db, 'groups', groupId, 'groupBuys');
    const q = query(gbRef, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as GroupBuy));
      setGroupBuys(data);
      setGroupBuysLoading(false);
    });

    groupBuysCleanupRef.current = unsub;
    return unsub;
  }, [demoMode, groupId]);

  // ── addGroupBuy ───────────────────────────────────────────────────
  const addGroupBuy = useCallback(async (gb: Omit<GroupBuy, 'id' | 'createdAt'>) => {
    const createdAt = new Date().toISOString();
    const id = `gb_${Date.now()}`;
    const fullGb: GroupBuy = { ...gb, id, createdAt };

    if (demoMode || !groupId) {
      setGroupBuys(prev => [fullGb, ...prev]);
      // Also add personal expenses for each item
      for (const item of gb.items) {
        const pe: PersonalExpense = {
          id: `pe_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          amount: item.amount,
          description: item.description,
          category: item.category,
          date: gb.date,
          visibility: 'private',
          groupBuyId: id,
          createdAt,
        };
        addPersonalExpense(item.memberId, pe);
      }
    } else {
      try {
        const gbRef = collection(db, 'groups', groupId, 'groupBuys');
        const { id: _id, ...data } = fullGb;
        const docRef = await addDoc(gbRef, data);
        const firestoreId = docRef.id;

        for (const item of gb.items) {
          const peData = {
            amount: normalizeMinorAmount(item.amount),
            description: item.description,
            category: item.category,
            date: gb.date,
            visibility: 'private',
            groupBuyId: firestoreId,
            createdAt,
          };
          const itemsRef = collection(db, 'groups', groupId, 'personalExpenses', item.memberId, 'items');
          await addDoc(itemsRef, peData);
        }
      } catch (err) {
        console.error('Failed to add group buy:', err);
        showToast('error', t.errors.addExpenseFailed);
      }
    }
  }, [demoMode, groupId, showToast, t, addPersonalExpense]);

  // ── deleteGroupBuy ────────────────────────────────────────────────
  const deleteGroupBuy = useCallback((gbId: string) => {
    if (demoMode || !groupId) {
      setGroupBuys(prev => prev.filter(g => g.id !== gbId));
    } else {
      const gbDocRef = doc(db, 'groups', groupId, 'groupBuys', gbId);
      deleteDoc(gbDocRef).catch((err) => {
        console.error('Failed to delete group buy:', err);
        showToast('error', t.errors.deleteExpenseFailed);
      });
    }
  }, [demoMode, groupId, showToast, t]);

  // ── toggleGroupBuySettlement ──────────────────────────────────────
  const toggleGroupBuySettlement = useCallback((gbId: string, memberId: string) => {
    if (demoMode || !groupId) {
      setGroupBuys(prev => prev.map(g => {
        if (g.id !== gbId) return g;
        const done = !g.settlements[memberId];
        return { ...g, settlements: { ...g.settlements, [memberId]: done } };
      }));
    } else {
      const gbDocRef = doc(db, 'groups', groupId, 'groupBuys', gbId);
      const gb = groupBuys.find(g => g.id === gbId);
      if (!gb) return;
      const done = !gb.settlements[memberId];
      updateDoc(gbDocRef, { [`settlements.${memberId}`]: done }).catch((err) => {
        console.error('Failed to toggle settlement:', err);
      });
    }
  }, [demoMode, groupId, groupBuys]);

  // ── Firestore: load group with listeners ───────────────────────────
  const loadGroup = useCallback((gid: string) => {
    setIsLoading(true);

    // Group doc listener
    const groupDocRef = doc(db, 'groups', gid);
    const unsubGroup = onSnapshot(groupDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setGroupNameLocal(data.name || GROUP_NAME);
        const nextCurrency = canonicalCurrencySymbol(data.currency || CURRENCY);
        setCurrencyLocal(nextCurrency);
        localStorage.setItem('gcd-currency', nextCurrency);
        setBudget(data.budget || 0);
      }
    });

    // Members subcollection listener
    const membersRef = collection(db, 'groups', gid, 'members');
    const unsubMembers = onSnapshot(membersRef, (snap) => {
      const mems: Member[] = [];
      snap.forEach((d) => {
        const data = d.data();
        mems.push({
          id: d.id,
          name: data.name,
          initials: data.initials,
          color: data.color,
          role: data.role || 'member',
        });
      });
      if (mems.length > 0) {
        setMembers(mems);
      }
    });

    // Expenses subcollection listener
    const expensesRef = collection(db, 'groups', gid, 'expenses');
    const expensesQuery = query(expensesRef, orderBy('date', 'desc'));
    const unsubExpenses = onSnapshot(expensesQuery, (snap) => {
      const exps: Expense[] = [];
      snap.forEach((d) => {
        const data = d.data();
        exps.push({
          id: d.id,
          amount: normalizeMinorAmount(data.amount),
          description: data.description,
          category: data.category as CategoryType,
          paidBy: data.paidBy,
          splitAmong: data.splitAmong,
          date: data.date,
          createdAt: data.createdAt,
        });
      });
      setExpenses(exps);
      setIsLoading(false);
    });

    // Contributions subcollection listener
    const contributionsRef = collection(db, 'groups', gid, 'contributions');
    const contributionsQuery = query(contributionsRef, orderBy('date', 'desc'));
    let hasDeduped = false;
    const unsubContributions = onSnapshot(contributionsQuery, async (snap) => {
      const contribs: Contribution[] = [];
      snap.forEach((d) => {
        const data = d.data();
        contribs.push({
          id: d.id,
          memberId: data.memberId,
          amount: normalizeMinorAmount(data.amount),
          date: data.date,
          note: data.note || '',
          createdAt: data.createdAt,
        });
      });

      // One-time dedup: remove duplicate auto-migration contributions
      if (!hasDeduped && contribs.length > 0) {
        hasDeduped = true;
        const seen = new Set<string>();
        const dupeIds: string[] = [];
        for (const c of contribs) {
          const key = `${c.memberId}__${c.note}`;
          if ((c.note === '首次夾錢（自動補建）' || c.note === '首次夾錢') && seen.has(key)) {
            dupeIds.push(c.id);
          }
          seen.add(key);
        }
        if (dupeIds.length > 0) {
          console.log(`[dedup] Removing ${dupeIds.length} duplicate contributions`);
          for (const id of dupeIds) {
            await deleteDoc(doc(db, 'groups', gid, 'contributions', id));
          }
          return; // The onSnapshot will fire again with clean data
        }
      }

      setContributions(contribs);
    });

    const cleanup = () => {
      unsubGroup();
      unsubMembers();
      unsubExpenses();
      unsubContributions();
    };

    cleanupRef.current = cleanup;
    return cleanup;
  }, []);

  // Load group on mount if we have a groupId and are not in demo mode
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    if (groupId && !demoMode) {
      ensureAuth()
        .then(() => {
          if (cancelled) return;
          cleanup = loadGroup(groupId);
        })
        .catch((err) => {
          console.error('Failed to authenticate before loading group:', err);
          setIsLoading(false);
          showToast('error', t.errors.loginFailed);
        });
    }

    return () => {
      cancelled = true;
      if (cleanup) cleanup();
    };
  }, [groupId, demoMode, loadGroup, showToast, t]);

  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      if (personalCleanupRef.current) {
        personalCleanupRef.current();
      }
      if (groupBuysCleanupRef.current) {
        groupBuysCleanupRef.current();
      }
    };
  }, []);

  // ── createGroup ────────────────────────────────────────────────────
  const createGroup = useCallback(async (
    name: string,
    perPersonAmount: number,
    currencyVal: string,
    membersList: Member[],
  ): Promise<string> => {
    await ensureAuth();

    const perPersonMinor = Math.max(0, normalizeMinorAmount(perPersonAmount));
    const totalBudget = perPersonMinor * membersList.length;

    // Create group doc
    const groupDocRef = await addDoc(collection(db, 'groups'), {
      name,
      budget: totalBudget,
      currency: currencyVal,
      createdAt: new Date().toISOString(),
    });

    const gid = groupDocRef.id;

    // Create member subdocs
    for (const m of membersList) {
      await setDoc(doc(db, 'groups', gid, 'members', m.id), {
        name: m.name,
        initials: m.initials,
        color: m.color,
        role: m.role,
      });
    }

    // Create initial contributions for each member
    const now = new Date().toISOString();
    const dateStr = now.split('T')[0];
    const initialContribs: Contribution[] = [];
    for (const m of membersList) {
      const contribData = {
        memberId: m.id,
        amount: perPersonMinor,
        date: dateStr,
        note: '首次夾錢',
        createdAt: now,
      };
      const contribRef = await addDoc(collection(db, 'groups', gid, 'contributions'), contribData);
      initialContribs.push({ id: contribRef.id, ...contribData });
    }

    // Save groupId to localStorage and state
    localStorage.setItem('gcd-groupId', gid);
    setGroupId(gid);
    setDemoMode(false);

    // Set local state immediately (listeners will also update)
    setGroupNameLocal(name);
    const symbol = canonicalCurrencySymbol(currencyVal);
    setCurrencyLocal(symbol);
    localStorage.setItem('gcd-currency', symbol);
    setMembers(membersList);
    setExpenses([]);
    setContributions(initialContribs);

    return gid;
  }, []);

  // ── joinGroup ──────────────────────────────────────────────────────
  const joinGroup = useCallback(async (gid: string, member: Member): Promise<void> => {
    await ensureAuth();

    await setDoc(doc(db, 'groups', gid, 'members', member.id), {
      name: member.name,
      initials: member.initials,
      color: member.color,
      role: member.role,
    });

    localStorage.setItem('gcd-groupId', gid);
    setGroupId(gid);
    setDemoMode(false);
  }, []);

  // ── enterGroup (view-only / claim existing member) ─────────────────
  const enterGroup = useCallback(async (gid: string): Promise<void> => {
    await ensureAuth();
    localStorage.setItem('gcd-groupId', gid);
    setGroupId(gid);
    setDemoMode(false);
  }, []);

  // ── convertCurrency ────────────────────────────────────────────────
  const convertCurrency = useCallback(async (newSymbol: string, rate: number): Promise<void> => {
    const oldDigits = getCurrencyMinorDigits(currency);
    const newDigits = getCurrencyMinorDigits(newSymbol);

    function convert(oldMinor: number): number {
      const oldMajor = oldMinor / Math.pow(10, oldDigits);
      const newMajor = oldMajor * rate;
      return Math.round(newMajor * Math.pow(10, newDigits));
    }

    if (!demoMode && groupId) {
      const batch = writeBatch(db);

      for (const exp of expenses) {
        batch.update(doc(db, 'groups', groupId, 'expenses', exp.id), { amount: convert(exp.amount) });
      }
      for (const con of contributions) {
        batch.update(doc(db, 'groups', groupId, 'contributions', con.id), { amount: convert(con.amount) });
      }
      batch.update(doc(db, 'groups', groupId), {
        currency: newSymbol,
        budget: convert(budget),
      });

      await batch.commit();
    }

    setCurrencyLocal(newSymbol);
    setBudget(b => convert(b));
    setExpenses(prev => prev.map(e => ({ ...e, amount: convert(e.amount) })));
    setContributions(prev => prev.map(c => ({ ...c, amount: convert(c.amount) })));
  }, [currency, groupId, demoMode, expenses, contributions, budget]);

  // ── enterDemoMode ──────────────────────────────────────────────────
  const enterDemoMode = useCallback(() => {
    // Clean up any existing Firestore listeners
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    // Remove stored groupId
    localStorage.removeItem('gcd-groupId');
    setGroupId(null);
    setDemoMode(true);

    // Reset to sample data
    setMembers(MEMBERS);
    setExpenses(EXPENSES);
    setGroupNameLocal(GROUP_NAME);
    setCurrencyLocal(canonicalCurrencySymbol(localStorage.getItem('gcd-currency') || CURRENCY));
    setContributions(CONTRIBUTIONS);
    setBudget(0);
  }, []);

  // ── addExpense ─────────────────────────────────────────────────────
  const addExpense = useCallback((exp: Expense) => {
    const expWithCreatedAt = {
      ...exp,
      amount: normalizeMinorAmount(exp.amount),
      createdAt: exp.createdAt || new Date().toISOString(),
    };

    if (demoMode || !groupId) {
      // Demo mode: local state only
      setExpenses(prev => [expWithCreatedAt, ...prev]);
    } else {
      // Firestore mode: write to Firestore, listeners will update local state
      const expensesRef = collection(db, 'groups', groupId, 'expenses');
      const { id: _id, ...data } = expWithCreatedAt;
      addDoc(expensesRef, data).catch((err) => {
        console.error('Failed to add expense:', err);
        showToast('error', t.errors.addExpenseFailed);
      });
    }
  }, [demoMode, groupId, showToast, t]);

  // ── deleteExpense ──────────────────────────────────────────────────
  const deleteExpense = useCallback((id: string) => {
    if (demoMode || !groupId) {
      setExpenses(prev => prev.filter(e => e.id !== id));
    } else {
      const expDocRef = doc(db, 'groups', groupId, 'expenses', id);
      deleteDoc(expDocRef).catch((err) => {
        console.error('Failed to delete expense:', err);
        showToast('error', t.errors.deleteExpenseFailed);
      });
    }
  }, [demoMode, groupId, showToast, t]);

  // ── updateExpense ──────────────────────────────────────────────────
  const updateExpense = useCallback((exp: Expense) => {
    const normalized = {
      ...exp,
      amount: normalizeMinorAmount(exp.amount),
    };
    if (demoMode || !groupId) {
      setExpenses(prev => prev.map(e => e.id === normalized.id ? normalized : e));
    } else {
      const expDocRef = doc(db, 'groups', groupId, 'expenses', normalized.id);
      const { id: _id, ...data } = normalized;
      updateDoc(expDocRef, data).catch((err) => {
        console.error('Failed to update expense:', err);
        showToast('error', t.errors.updateExpenseFailed);
      });
    }
  }, [demoMode, groupId, showToast, t]);

  // ── clearAllExpenses ───────────────────────────────────────────────
  const clearAllExpenses = useCallback(async () => {
    if (demoMode || !groupId) {
      setExpenses([]);
      setContributions([]);
    } else {
      // Delete all expense docs from Firestore
      const expensesRef = collection(db, 'groups', groupId, 'expenses');
      const expSnap = await getDocs(expensesRef);
      const deleteExpPromises = expSnap.docs.map((d) =>
        deleteDoc(doc(db, 'groups', groupId!, 'expenses', d.id))
      );
      // Delete all contribution docs from Firestore
      const contribsRef = collection(db, 'groups', groupId, 'contributions');
      const contribSnap = await getDocs(contribsRef);
      const deleteContribPromises = contribSnap.docs.map((d) =>
        deleteDoc(doc(db, 'groups', groupId!, 'contributions', d.id))
      );
      await Promise.all([...deleteExpPromises, ...deleteContribPromises]);
    }
  }, [demoMode, groupId]);

  // ── addContribution ──────────────────────────────────────────────────
  const addContribution = useCallback((contrib: Contribution) => {
    const withCreatedAt = {
      ...contrib,
      amount: normalizeMinorAmount(contrib.amount),
      createdAt: contrib.createdAt || new Date().toISOString(),
    };

    if (demoMode || !groupId) {
      setContributions(prev => [withCreatedAt, ...prev]);
    } else {
      const contributionsRef = collection(db, 'groups', groupId, 'contributions');
      const { id: _id, ...data } = withCreatedAt;
      addDoc(contributionsRef, data).catch((err) => {
        console.error('Failed to add contribution:', err);
        showToast('error', t.errors.addContribFailed);
      });
    }
  }, [demoMode, groupId, showToast, t]);

  // ── deleteContribution ───────────────────────────────────────────────
  const deleteContribution = useCallback((id: string) => {
    if (demoMode || !groupId) {
      setContributions(prev => prev.filter(c => c.id !== id));
    } else {
      const contribDocRef = doc(db, 'groups', groupId, 'contributions', id);
      deleteDoc(contribDocRef).catch((err) => {
        console.error('Failed to delete contribution:', err);
        showToast('error', t.errors.deleteContribFailed);
      });
    }
  }, [demoMode, groupId, showToast, t]);

  // ── addMember ──────────────────────────────────────────────────────
  const addMember = useCallback((member: Member) => {
    if (demoMode || !groupId) {
      setMembers(prev => [...prev, member]);
    } else {
      const { id, ...data } = member;
      setDoc(doc(db, 'groups', groupId, 'members', id), data).catch((err) => {
        console.error('Failed to add member:', err);
        showToast('error', t.errors.addMemberFailed);
      });
    }
  }, [demoMode, groupId, showToast, t]);

  // ── getMember (live state lookup) ──────────────────────────────────
  const getMember = useCallback((id: string): Member | undefined => {
    return members.find(m => m.id === id);
  }, [members]);

  // ── fmt (currency-aware format) ────────────────────────────────────
  const fmt = useCallback((amount: number): string => {
    return formatAmount(amount, currency);
  }, [currency]);

  // ── deleteMember ─────────────────────────────────────────────────────
  const deleteMember = useCallback((id: string) => {
    if (members.length <= 1) {
      showToast('error', t.errors.minOneMember);
      return Promise.resolve(false);
    }

    const hasExpenseHistory = expenses.some((e) => e.paidBy === id || e.splitAmong.includes(id));
    const hasContributionHistory = contributions.some((c) => c.memberId === id);
    if (hasExpenseHistory || hasContributionHistory) {
      showToast('error', t.errors.hasHistory);
      return Promise.resolve(false);
    }

    if (demoMode || !groupId) {
      setMembers(prev => prev.filter(m => m.id !== id));
      return Promise.resolve(true);
    }

    const memberDocRef = doc(db, 'groups', groupId, 'members', id);
    return deleteDoc(memberDocRef)
      .then(() => true)
      .catch((err) => {
        console.error('Failed to delete member:', err);
        showToast('error', t.errors.deleteMemberFailed);
        return false;
      });
  }, [contributions, demoMode, expenses, groupId, members.length, showToast, t]);

  return (
    <AppContext.Provider value={{
      darkMode, toggleDarkMode,
      currency, setCurrency,
      members, setMembers,
      expenses, addExpense, deleteExpense, updateExpense, clearAllExpenses,
      groupName, setGroupName,
      settlements, setSettlements,
      balances, totalSpent,
      toasts, showToast,
      contributions, addContribution, deleteContribution,
      fundBalance, fundSpent, totalContributions, budget,
      groupId, demoMode, isLoading,
      createGroup, joinGroup, enterGroup, convertCurrency, enterDemoMode, deleteMember, addMember,
      getMember, fmt,
      unreadCount, markAllRead,
      notifications, toggleNotifications,
      savedGroups, switchGroup, leaveCurrentGroup,
      personalExpenses, loadPersonalExpenses, addPersonalExpense,
      deletePersonalExpense, updatePersonalExpense, personalExpensesLoading,
      groupBuys, groupBuysLoading, loadGroupBuys,
      addGroupBuy, deleteGroupBuy, toggleGroupBuySettlement,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
