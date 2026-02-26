import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronRight, Bell, Plus, ScanLine, ArrowLeftRight, Wallet, ShoppingBag } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useT } from '../i18n/I18nContext';
import { FUND_PAYER_ID, getCurrencyMinorDigits, parseAmountInput, splitAmountEvenly } from '../data/sampleData';
import {
  MemberAvatar, AvatarGroup, CategoryIcon,
  BudgetBar, DonutGauge, useCountUp,
  StaggerContainer, StaggerItem,
} from '../components/SharedComponents';

export function Dashboard() {
  const navigate = useNavigate();
  const { groupName, members, expenses, totalSpent, balances, currency, unreadCount, markAllRead, fundBalance, fundSpent, totalContributions, contributions, addContribution, showToast, getMember, fmt } = useApp();
  const { t } = useT();
  const lastQuickNavRef = useRef(0);

  const perPerson = Math.round(totalSpent / members.length);
  const remaining = fundBalance;
  const memberAdvanced = totalSpent - fundSpent;
  // Health = net coverage: how much of the fund covers ALL spending (including advances)
  const healthPctRaw = totalContributions > 0
    ? Math.round(((totalContributions - totalSpent) / totalContributions) * 100)
    : 100;
  const healthPct = Math.max(0, Math.min(100, healthPctRaw));
  const recentExpenses = expenses.slice(0, 4);

  const countTotal  = useCountUp(totalSpent);
  const countPer    = useCountUp(perPerson);
  const countRemain = useCountUp(remaining);

  // ── Add contribution form state ──────────────────────────────────
  const [showAddFund, setShowAddFund] = useState(false);
  const [fundMembers, setFundMembers] = useState<string[]>([]);
  const [fundAmount, setFundAmount] = useState('');
  const amountStep = getCurrencyMinorDigits(currency) === 0 ? '1' : '0.01';

  function toggleFundMember(id: string) {
    setFundMembers(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  function handleAddContribution() {
    const amt = parseAmountInput(fundAmount, currency);
    if (amt === null || amt <= 0 || fundMembers.length === 0) {
      showToast('error', t.dashboard.fillAmountAndMembers);
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    fundMembers.forEach((memberId, i) => {
      addContribution({
        id: `c_${Date.now()}_${i}`,
        memberId,
        amount: amt,
        date: today,
        note: '',
      });
    });
    const names = fundMembers.map(id => members.find(m => m.id === id)?.name ?? id).join('、');
    showToast('success', t.dashboard.addedContribution(names, fmt(amt)));
    setFundAmount('');
    setFundMembers([]);
    setShowAddFund(false);
  }

  function safeNavigate(to: string) {
    const now = Date.now();
    if (now - lastQuickNavRef.current < 250) return;
    lastQuickNavRef.current = now;
    navigate(to);
  }

  function handleQuickAction(to: string, e: React.SyntheticEvent) {
    e.preventDefault();
    e.stopPropagation();
    safeNavigate(to);
  }

  return (
    <div className="bg-transparent min-h-screen w-full overflow-x-hidden">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="bg-sidebar px-4 pt-header pb-4 border-b border-border lg:pt-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-subtle tracking-wide uppercase mb-0.5">{t.dashboard.group}</p>
              <h1 className="text-xl font-black text-foreground">{groupName}</h1>
            </div>
            <button
              onClick={() => { markAllRead(); navigate('/app/expenses'); }}
              className="relative w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground active:scale-95 transition-transform"
            >
              <Bell size={18} strokeWidth={2} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Avatar row */}
          <AvatarGroup members={members} max={7} />

          {/* Budget bar — show fund usage (fund-paid expenses vs total contributions) */}
          {totalContributions > 0 && (
            <div className="mt-4">
              <BudgetBar spent={fundSpent} budget={totalContributions} />
            </div>
          )}
        </div>
      </div>

      <StaggerContainer className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* ── Health Gauge Card ──────────────────────────────────── */}
        <StaggerItem><div className="bg-card rounded-2xl border border-border p-4 neu-raised glass-rim">
          <DonutGauge percentage={healthPct} />

          {/* 2×2 Stat Grid */}
          <div className="grid grid-cols-2 gap-2.5 mt-1">
            <div className="bg-background rounded-xl p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-0.5">{t.dashboard.totalSpent}</p>
              <p className="font-black text-foreground tabular-nums text-sm">{fmt(countTotal)}</p>
            </div>
            <div className="bg-background rounded-xl p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-0.5">{t.dashboard.perPersonCost}</p>
              <p className="font-black text-primary tabular-nums text-sm">{fmt(countPer)}</p>
            </div>
            <div className="bg-background rounded-xl p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-0.5">{t.dashboard.fundBalance}</p>
              <p className={`font-black tabular-nums text-sm ${remaining >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(countRemain)}</p>
            </div>
            <div className="bg-background rounded-xl p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-0.5">{t.dashboard.expenseCount}</p>
              <p className="font-black text-purple tabular-nums text-sm">{t.dashboard.nItems(expenses.length)}</p>
            </div>
          </div>
        </div></StaggerItem>

        {/* ── Fund Card ─────────────────────────────────────────── */}
        <StaggerItem><div className="bg-card border border-border rounded-2xl p-4 neu-raised glass-rim">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wallet size={16} className="text-primary" strokeWidth={2} />
              <h2 className="font-bold text-sm text-foreground">{t.dashboard.fund}</h2>
            </div>
            <button
              onClick={() => setShowAddFund(v => !v)}
              className="text-xs px-3 py-1 rounded-full font-medium bg-accent-bg text-primary active:scale-95 transition-transform"
            >
              {showAddFund ? t.dashboard.cancelFund : t.dashboard.addFund}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-1">
            <div className="bg-background rounded-xl p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-0.5">{t.dashboard.totalFund}</p>
              <p className="font-black text-foreground tabular-nums text-sm">{fmt(totalContributions)}</p>
            </div>
            <div className="bg-background rounded-xl p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-0.5">{t.dashboard.fundBalanceLabel}</p>
              <p className={`font-black tabular-nums text-sm ${fundBalance >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(fundBalance)}</p>
            </div>
          </div>
          {memberAdvanced > 0 && (
            <div className="bg-background rounded-xl p-3 border border-amber-500/30 mb-1">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{t.dashboard.advanceTotal}</p>
                <p className="font-black tabular-nums text-sm" style={{ color: '#C8914A' }}>{fmt(memberAdvanced)}</p>
              </div>
            </div>
          )}
          {showAddFund && (
            <div className="mt-3 space-y-3 bg-background rounded-xl p-3 border border-border">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-muted-foreground">{t.dashboard.contributors}</label>
                  <button
                    onClick={() => setFundMembers(
                      fundMembers.length === members.length ? [] : members.map(m => m.id)
                    )}
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium transition-all
                      ${fundMembers.length === members.length
                        ? 'bg-primary text-white'
                        : 'bg-accent-bg text-primary'
                      }`}
                  >
                    {fundMembers.length === members.length ? t.dashboard.deselectAll : t.dashboard.selectAll}
                  </button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {members.map(m => (
                    <div key={m.id} className="flex flex-col items-center gap-0.5">
                      <MemberAvatar member={m} size="sm" checked={fundMembers.includes(m.id)} onClick={() => toggleFundMember(m.id)} />
                      <span className="text-[9px] text-muted-foreground">{m.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t.dashboard.amount}</label>
                <div className="flex items-center gap-1 bg-secondary rounded-lg px-3 py-2.5 border border-border">
                  <span className="text-sm text-subtle font-bold">{currency}</span>
                  <input
                    type="number"
                    value={fundAmount}
                    onChange={e => setFundAmount(e.target.value)}
                    placeholder="0"
                    min="0"
                    step={amountStep}
                    className="flex-1 bg-transparent text-sm text-foreground outline-none tabular-nums placeholder:text-border min-w-0"
                    inputMode="decimal"
                  />
                </div>
              </div>
              <button
                onClick={handleAddContribution}
                className="w-full bg-primary text-white rounded-lg py-2.5 text-sm font-bold active:scale-95 transition-transform glass-btn"
              >
                {t.dashboard.confirmAdd}
              </button>
            </div>
          )}
        </div></StaggerItem>

        {/* ── Quick Actions ──────────────────────────────────────── */}
        <StaggerItem><div className="grid grid-cols-4 gap-2.5">
          {[
            { label: t.dashboard.newExpense, Icon: Plus,           color: '#DD843C', bg: 'var(--accent-bg)', to: '/app/add-expense' },
            { label: t.dashboard.scanReceipt, Icon: ScanLine,        color: '#9055A0', bg: 'var(--purple-bg)', to: '/app/scan' },
            { label: t.groupBuy.title, Icon: ShoppingBag, color: '#4A90D9', bg: 'var(--info-bg)', to: '/app/group-buy' },
            { label: t.dashboard.viewSettlement, Icon: ArrowLeftRight,  color: '#72A857', bg: 'var(--success-bg)', to: '/app/settlement' },
          ].map(a => (
            <button key={a.label}
              type="button"
              onPointerUp={(e) => handleQuickAction(a.to, e)}
              onClick={(e) => handleQuickAction(a.to, e)}
              className="bg-card rounded-2xl p-3 flex flex-col items-center gap-1.5 neu-press touch-manipulation"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: a.bg }}>
                <a.Icon size={18} strokeWidth={2} style={{ color: a.color } as React.CSSProperties} />
              </div>
              <span className="text-xs text-muted-foreground">{a.label}</span>
            </button>
          ))}
        </div></StaggerItem>

        {/* ── Recent Expenses ────────────────────────────────────── */}
        <StaggerItem><div className="bg-card border border-border rounded-2xl overflow-hidden neu-raised glass-rim">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="font-bold text-sm text-foreground">{t.dashboard.recentExpenses}</h2>
            <button
              onClick={() => navigate('/app/expenses')}
              className="text-xs text-primary flex items-center gap-0.5 active:opacity-70"
            >
              {t.dashboard.viewAll} <ChevronRight size={13} />
            </button>
          </div>

          {recentExpenses.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground text-sm">{t.dashboard.noExpenses}</p>
            </div>
          ) : (
            recentExpenses.map((exp, i) => {
              const isFundPaid = exp.paidBy === FUND_PAYER_ID;
              const payer = isFundPaid ? null : getMember(exp.paidBy);
              const shares = Object.values(splitAmountEvenly(exp.amount, exp.splitAmong));
              const ppMin = shares.length > 0 ? Math.min(...shares) : 0;
              const ppMax = shares.length > 0 ? Math.max(...shares) : 0;
              return (
                <div key={exp.id}
                  className={`flex items-center gap-3 px-4 py-3 ${i < recentExpenses.length - 1 ? 'border-b border-border' : ''}`}>
                  <CategoryIcon category={exp.category} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-foreground truncate">{exp.description}</p>
                      {isFundPaid && (
                        <span className="text-[10px] bg-accent-bg text-primary px-1.5 py-0.5 rounded-full flex-shrink-0">{t.common.fundDeduct}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 min-w-0">
                      <p className="text-xs text-muted-foreground">
                        {isFundPaid ? t.common.fundDeduct : `${t.common.by} ${payer?.name ?? '—'}`} ·
                      </p>
                      <p className="text-xs text-primary">{t.common.splitAmong(exp.splitAmong.length)}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-sm text-foreground tabular-nums">{fmt(exp.amount)}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {t.common.perPerson} {ppMin === ppMax ? fmt(ppMin) : `${fmt(ppMin)}~${fmt(ppMax)}`}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div></StaggerItem>

        {/* ── Balance Summary ────────────────────────────────────── */}
        <StaggerItem><div className="bg-card border border-border rounded-2xl overflow-hidden neu-raised glass-rim">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="font-bold text-sm text-foreground">{t.dashboard.memberBalance}</h2>
            <button onClick={() => navigate('/app/settlement')} className="text-xs text-primary flex items-center gap-0.5 active:opacity-70">
              {t.dashboard.settle} <ChevronRight size={13} />
            </button>
          </div>
          {balances.slice(0, 4).map((b, i) => (
            <div key={b.member.id}
              className={`flex items-center gap-3 px-4 py-2.5 ${i < 3 ? 'border-b border-border' : ''}`}>
              <MemberAvatar member={b.member} size="sm" />
              <span className="flex-1 text-sm text-foreground">{b.member.name}</span>
              <span className={`text-sm font-bold tabular-nums flex-shrink-0 whitespace-nowrap ${b.balance > 0 ? 'text-success' : b.balance < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {b.balance > 0 ? '+' : ''}{fmt(b.balance)}
              </span>
            </div>
          ))}
          {balances.length > 4 && (
            <button onClick={() => navigate('/app/settlement')}
              className="w-full py-2.5 text-xs text-primary text-center border-t border-border">
              {t.dashboard.viewAllMembers(balances.length)}
            </button>
          )}
        </div></StaggerItem>

        <div className="h-4" />
      </StaggerContainer>
    </div>
  );
}
