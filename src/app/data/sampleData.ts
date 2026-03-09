export type CategoryType = 'food' | 'transport' | 'accommodation' | 'tickets' | 'shopping' | 'other';

export interface Member {
  id: string;
  name: string;
  initials: string;
  color: string;
  role: 'admin' | 'member';
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  category: CategoryType;
  paidBy: string;
  splitAmong: string[];
  date: string;
  createdAt?: string;
}

export interface Settlement {
  id: string;
  fromId: string;
  toId: string;
  amount: number;
  done: boolean;
}

export const FUND_PAYER_ID = '__fund__';

export interface Contribution {
  id: string;
  memberId: string;
  amount: number;
  date: string;
  note?: string;
  createdAt?: string;
}

export interface PersonalExpense {
  id: string;
  amount: number;          // minor units (same as Expense)
  description: string;     // max 120 chars
  category: CategoryType;  // reuse existing 6 categories
  date: string;            // YYYY-MM-DD
  createdAt?: string;      // ISO timestamp
  visibility: 'private' | 'group';
  groupBuyId?: string;     // links back to parent group buy
}

export interface GroupBuyItem {
  memberId: string;
  description: string;
  amount: number;
  category: CategoryType;
}

export interface GroupBuy {
  id: string;
  title: string;
  payerId: string;
  items: GroupBuyItem[];
  date: string;
  createdAt: string;
  settlements: Record<string, boolean>;
  taxFree?: boolean;
}

export const MEMBERS: Member[] = [
  { id: 'm1', name: 'a仔',  initials: 'A', color: '#DD843C', role: 'admin' },
  { id: 'm2', name: '貓仔', initials: '貓', color: '#C05A5A', role: 'member' },
  { id: 'm3', name: 'cy',   initials: 'C', color: '#72A857', role: 'member' },
  { id: 'm4', name: '魚',   initials: '魚', color: '#5A7EC5', role: 'member' },
  { id: 'm5', name: 'hihi', initials: 'H', color: '#C8914A', role: 'member' },
  { id: 'm6', name: '424',  initials: '4', color: '#9055A0', role: 'member' },
  { id: 'm7', name: 'Ruki', initials: 'R', color: '#5AABAB', role: 'member' },
];

export const ALL_IDS = MEMBERS.map(m => m.id);

export const EXPENSES: Expense[] = [
  { id: 'e1',  amount: 12400, description: '廣島燒晚餐',   category: 'food',          paidBy: 'm1', splitAmong: ALL_IDS, date: '2026-04-15' },
  { id: 'e2',  amount: 8500,  description: '宮島渡輪',     category: 'transport',     paidBy: 'm2', splitAmong: ALL_IDS, date: '2026-04-14' },
  { id: 'e3',  amount: 11000, description: '酒店訂金',     category: 'accommodation', paidBy: 'm3', splitAmong: ALL_IDS, date: '2026-04-13' },
  { id: 'e4',  amount: 3200,  description: '嚴島神社門票', category: 'tickets',       paidBy: 'm4', splitAmong: ALL_IDS, date: '2026-04-13' },
  { id: 'e5',  amount: 980,   description: '便利店零食',   category: 'shopping',      paidBy: 'm5', splitAmong: ALL_IDS, date: '2026-04-12' },
  { id: 'e6',  amount: 2400,  description: '居酒屋輕飲',   category: 'food',          paidBy: 'm6', splitAmong: ALL_IDS, date: '2026-04-12' },
  { id: 'e7',  amount: 1200,  description: '廣島城門票',   category: 'tickets',       paidBy: 'm7', splitAmong: ALL_IDS, date: '2026-04-12' },
  { id: 'e8',  amount: 1400,  description: '新幹線補票',   category: 'transport',     paidBy: 'm1', splitAmong: ALL_IDS, date: '2026-04-11' },
  { id: 'e9',  amount: 3200,  description: '藥妝購物',     category: 'shopping',      paidBy: 'm2', splitAmong: ALL_IDS, date: '2026-04-11' },
  { id: 'e10', amount: 4200,  description: '燒肉午餐',     category: 'food',          paidBy: 'm3', splitAmong: ALL_IDS, date: '2026-04-10' },
  { id: 'e11', amount: 2100,  description: '宮島纜車',     category: 'tickets',       paidBy: 'm1', splitAmong: ALL_IDS, date: '2026-04-10' },
  { id: 'e12', amount: 1520,  description: '機場巴士',     category: 'transport',     paidBy: 'm4', splitAmong: ALL_IDS, date: '2026-04-09' },
];

export const CONTRIBUTIONS: Contribution[] = [
  { id: 'c1', memberId: 'm1', amount: 11500, date: '2026-04-09', note: '首次夾錢' },
  { id: 'c2', memberId: 'm2', amount: 11500, date: '2026-04-09', note: '首次夾錢' },
  { id: 'c3', memberId: 'm3', amount: 11500, date: '2026-04-09', note: '首次夾錢' },
  { id: 'c4', memberId: 'm4', amount: 11500, date: '2026-04-09', note: '首次夾錢' },
  { id: 'c5', memberId: 'm5', amount: 11500, date: '2026-04-09', note: '首次夾錢' },
  { id: 'c6', memberId: 'm6', amount: 11000, date: '2026-04-09', note: '首次夾錢' },
  { id: 'c7', memberId: 'm7', amount: 11000, date: '2026-04-09', note: '首次夾錢' },
];

export const GROUP_BUYS: GroupBuy[] = [];

export const BUDGET = 80000;
export const GROUP_NAME = '核爆都唔割鳩';
export const CURRENCY = '¥';

const CURRENCY_CODE_TO_SYMBOL: Record<string, string> = {
  JPY: '¥',
  USD: '$',
  CNY: 'CN¥',
  RMB: 'CN¥',
  HKD: 'HK$',
  TWD: 'NT$',
  EUR: '€',
  GBP: '£',
  AUD: 'A$',
  CAD: 'C$',
  MYR: 'RM',
  SGD: 'S$',
  PHP: '₱',
  KRW: '₩',
  THB: '฿',
  VND: '₫',
  IDR: 'Rp',
};

export const CATEGORY_CONFIG: Record<CategoryType, { iconKey: string; label: string; color: string; bg: string }> = {
  food:          { iconKey: 'Utensils',    label: '餐飲', color: '#DD843C', bg: '#3A1E08' },
  transport:     { iconKey: 'Train',       label: '交通', color: '#5A7EC5', bg: '#0E1836' },
  accommodation: { iconKey: 'BedDouble',   label: '住宿', color: '#9055A0', bg: '#260E30' },
  tickets:       { iconKey: 'Ticket',      label: '門票', color: '#C05A5A', bg: '#340E0E' },
  shopping:      { iconKey: 'ShoppingBag', label: '購物', color: '#72A857', bg: '#12280A' },
  other:         { iconKey: 'Package',     label: '其他', color: '#9A7565', bg: '#261A14' },
};

export function formatJPY(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}

export function canonicalCurrencySymbol(currency: string): string {
  const raw = String(currency || '').trim();
  if (!raw) return CURRENCY;

  if (CURRENCY_MINOR_DIGITS[raw] !== undefined) return raw;

  const upper = raw.toUpperCase();
  if (CURRENCY_CODE_TO_SYMBOL[upper]) return CURRENCY_CODE_TO_SYMBOL[upper];

  return raw;
}

/** @deprecated Use formatAmount(amount, currency) instead */
export function getMemberById(id: string): Member | undefined {
  return MEMBERS.find(m => m.id === id);
}

const CURRENCY_MINOR_DIGITS: Record<string, number> = {
  '¥': 0,
  'CN¥': 2,
  '₩': 0,
  '$': 2,
  'A$': 2,
  'C$': 2,
  'HK$': 2,
  'NT$': 2,
  '€': 2,
  '£': 2,
  'RM': 2,
  'S$': 2,
  '₱': 2,
  '฿': 2,
  '₫': 0,
  'Rp': 0,
};

export function getCurrencyMinorDigits(currency: string): number {
  const symbol = canonicalCurrencySymbol(currency);
  return CURRENCY_MINOR_DIGITS[symbol] ?? 0;
}

export function normalizeMinorAmount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.round(value);
}

export function parseAmountInput(input: string, currency: string): number | null {
  const cleaned = input.trim().replace(/,/g, '');
  if (!cleaned) return null;

  const m = cleaned.match(/^(\d+)(?:\.(\d+))?$/);
  if (!m) return null;

  const wholePart = m[1];
  const fracPart = m[2] ?? '';
  const digits = getCurrencyMinorDigits(currency);
  if (digits === 0 && fracPart.length > 0) return null;
  if (fracPart.length > digits) return null;

  const whole = Number(wholePart);
  if (!Number.isSafeInteger(whole)) return null;

  const factor = 10 ** digits;
  const fracStr = digits > 0
    ? (fracPart + '0'.repeat(digits)).slice(0, digits)
    : '';
  const frac = fracStr ? Number(fracStr) : 0;
  if (!Number.isSafeInteger(frac)) return null;

  const minor = whole * factor + frac;
  if (!Number.isSafeInteger(minor)) return null;
  return minor;
}

export function formatAmountInput(amountMinor: number, currency: string): string {
  const minor = normalizeMinorAmount(amountMinor);
  const digits = getCurrencyMinorDigits(currency);
  if (digits === 0) return String(minor);

  const factor = 10 ** digits;
  const sign = minor < 0 ? '-' : '';
  const abs = Math.abs(minor);
  const whole = Math.floor(abs / factor);
  const fracRaw = String(abs % factor).padStart(digits, '0');
  const fracTrimmed = fracRaw.replace(/0+$/, '');
  return fracTrimmed
    ? `${sign}${whole}.${fracTrimmed}`
    : `${sign}${whole}`;
}

/** Currency-aware amount formatter (amount is stored in minor units) */
export function formatAmount(amount: number, currency: string): string {
  const symbol = canonicalCurrencySymbol(currency);
  const minor = normalizeMinorAmount(amount);
  const digits = getCurrencyMinorDigits(symbol);
  const sign = minor < 0 ? '-' : '';
  const abs = Math.abs(minor);

  if (digits === 0) {
    return `${sign}${symbol}${abs.toLocaleString()}`;
  }

  const factor = 10 ** digits;
  const major = abs / factor;
  return `${sign}${symbol}${major.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

export function splitAmountEvenly(amountMinor: number, participantIds: string[]): Record<string, number> {
  const ids = Array.from(new Set(participantIds.filter(Boolean))).sort();
  const total = normalizeMinorAmount(amountMinor);
  const allocations: Record<string, number> = {};

  if (ids.length === 0 || total === 0) return allocations;

  const base = Math.floor(total / ids.length);
  const remainder = total - base * ids.length;

  ids.forEach((id, idx) => {
    allocations[id] = base + (idx < remainder ? 1 : 0);
  });

  return allocations;
}

export function computeBalances(expenses: Expense[], members: Member[], contributions: Contribution[] = []) {
  const contributed: Record<string, number> = {};
  const paid: Record<string, number> = {};
  const share: Record<string, number> = {};
  members.forEach(m => { contributed[m.id] = 0; paid[m.id] = 0; share[m.id] = 0; });

  // Sum each member's contributions to the fund
  contributions.forEach(c => {
    if (contributed[c.memberId] !== undefined) {
      contributed[c.memberId] += Math.max(0, normalizeMinorAmount(c.amount));
    }
  });

  const memberIdSet = new Set(members.map((m) => m.id));

  expenses.forEach(exp => {
    const amount = Math.max(0, normalizeMinorAmount(exp.amount));
    if (amount <= 0 || exp.splitAmong.length === 0) return;

    if (exp.paidBy !== FUND_PAYER_ID) {
      // Individual-paid: the payer gets credit
      if (paid[exp.paidBy] !== undefined) {
        paid[exp.paidBy] += amount;
      }
    }

    // Everyone in splitAmong owes a deterministic integer share (base + remainder allocation)
    const validSplitIds = exp.splitAmong.filter((id) => memberIdSet.has(id));
    const split = splitAmountEvenly(amount, validSplitIds);
    Object.entries(split).forEach(([id, value]) => {
      share[id] = (share[id] || 0) + value;
    });
  });

  return members.map(m => ({
    member: m,
    contributed: contributed[m.id] || 0,
    paid: paid[m.id] || 0,
    shouldPay: share[m.id] || 0,
    // Fund-first accounting: already-paid contributions count before extra settlement.
    balance: (contributed[m.id] || 0) + (paid[m.id] || 0) - (share[m.id] || 0),
  }));
}

export function computeFundBalance(contributions: Contribution[], expenses: Expense[]): number {
  const totalContributions = contributions.reduce((sum, c) => sum + Math.max(0, normalizeMinorAmount(c.amount)), 0);
  // Only fund-paid expenses reduce the fund balance
  const fundExpenses = expenses
    .filter(e => e.paidBy === FUND_PAYER_ID)
    .reduce((sum, e) => sum + Math.max(0, normalizeMinorAmount(e.amount)), 0);
  return totalContributions - fundExpenses;
}

export function computeSettlements(
  balances: ReturnType<typeof computeBalances>,
  fundBalance: number = 0,
): Settlement[] {
  const creditors = balances
    .filter((b) => b.balance > 0)
    .map((b) => ({ ...b, remaining: normalizeMinorAmount(b.balance) }))
    .sort((a, b) => {
      if (b.remaining !== a.remaining) return b.remaining - a.remaining;
      return a.member.id.localeCompare(b.member.id);
    });

  const debtors = balances
    .filter((b) => b.balance < 0)
    .map((b) => ({ ...b, remaining: Math.abs(normalizeMinorAmount(b.balance)) }))
    .sort((a, b) => {
      if (b.remaining !== a.remaining) return b.remaining - a.remaining;
      return a.member.id.localeCompare(b.member.id);
    });

  const settlements: Settlement[] = [];
  let idx = 0;

  // Step 1: Use fund cash first to reimburse receivables.
  let fundRemaining = Math.max(0, normalizeMinorAmount(fundBalance));
  for (const c of creditors) {
    if (fundRemaining <= 0) break;
    const amount = Math.min(c.remaining, fundRemaining);
    if (amount <= 0) continue;
    settlements.push({
      id: `s${++idx}`,
      fromId: FUND_PAYER_ID,
      toId: c.member.id,
      amount,
      done: false,
    });
    c.remaining -= amount;
    fundRemaining -= amount;
  }

  // Step 2: Remaining debts are settled member-to-member.
  let ci = 0, di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const amount = Math.min(creditors[ci].remaining, debtors[di].remaining);
    if (amount > 0) {
      settlements.push({
        id: `s${++idx}`,
        fromId: debtors[di].member.id,
        toId: creditors[ci].member.id,
        amount,
        done: false,
      });
    }
    creditors[ci].remaining -= amount;
    debtors[di].remaining -= amount;
    if (creditors[ci].remaining <= 0) ci++;
    if (debtors[di].remaining <= 0) di++;
  }

  // Step 3: If fund is negative, debtors top up the fund account.
  if (normalizeMinorAmount(fundBalance) < 0) {
    let needTopUp = Math.abs(normalizeMinorAmount(fundBalance));
    for (const d of debtors) {
      if (needTopUp <= 0) break;
      if (d.remaining <= 0) continue;
      const amount = Math.min(d.remaining, needTopUp);
      settlements.push({
        id: `s${++idx}`,
        fromId: d.member.id,
        toId: FUND_PAYER_ID,
        amount,
        done: false,
      });
      d.remaining -= amount;
      needTopUp -= amount;
    }
  }

  return settlements;
}

export const TIME_SERIES_DATA = [
  { day: 'Day 1', date: '2026-04-09', daily: 1520,  spent: 1520,  contrib: 80500, budget: 80000, avg: 1520 },
  { day: 'Day 2', date: '2026-04-10', daily: 4600,  spent: 6120,  contrib: 80500, budget: 80000, avg: 3060 },
  { day: 'Day 3', date: '2026-04-11', daily: 6300,  spent: 12420, contrib: 80500, budget: 80000, avg: 4140 },
  { day: 'Day 4', date: '2026-04-12', daily: 4580,  spent: 17000, contrib: 80500, budget: 80000, avg: 4250 },
  { day: 'Day 5', date: '2026-04-13', daily: 3200,  spent: 20200, contrib: 80500, budget: 80000, avg: 4040 },
  { day: 'Day 6', date: '2026-04-14', daily: 11000, spent: 31200, contrib: 80500, budget: 80000, avg: 5200 },
  { day: 'Day 7', date: '2026-04-15', daily: 8500,  spent: 39700, contrib: 80500, budget: 80000, avg: 5671 },
  { day: 'Day 8', date: '2026-04-16', daily: 12400, spent: 52100, contrib: 80500, budget: 80000, avg: 6513 },
];
