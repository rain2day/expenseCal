import React, { useState, useEffect, useMemo } from 'react';
import { Check, PartyPopper, Wallet, Trash2, ChevronDown, ChevronUp, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { MemberAvatar, BalanceBadge, StaggerContainer, StaggerItem, CategoryIcon } from '../components/SharedComponents';
import { FUND_PAYER_ID } from '../data/sampleData';
import { useT } from '../i18n/I18nContext';

function Confetti() {
  const colors = ['#DD843C', '#9055A0', '#72A857', '#D05242', '#C8914A', '#5A7EC5'];
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    size: Math.random() * 8 + 6,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0 }}
          animate={{ y: '100vh', opacity: 0, rotate: 360 * 3 }}
          transition={{ duration: 2 + Math.random(), delay: p.delay, ease: 'easeIn' }}
          className="absolute rounded-sm"
          style={{ width: p.size, height: p.size, background: p.color, left: 0 }}
        />
      ))}
    </div>
  );
}

export function Settlement() {
  const { t } = useT();
  const { balances, settlements, setSettlements, groupName, showToast, fundBalance, totalContributions, getMember, fmt, contributions, deleteContribution, expenses, groupBuys, loadGroupBuys, toggleGroupBuySettlement, deleteGroupBuy } = useApp();
  const [showConfetti, setShowConfetti] = useState(false);
  const [showContribHistory, setShowContribHistory] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showAdvanceHistory, setShowAdvanceHistory] = useState(false);
  const [confirmDeleteGbId, setConfirmDeleteGbId] = useState<string | null>(null);

  // Lazy-load group buys
  useEffect(() => {
    const cleanup = loadGroupBuys();
    return cleanup;
  }, [loadGroupBuys]);

  // Compute group buy debts: who owes whom how much
  const groupBuyDebts = useMemo(() => {
    const debts: Array<{
      gbId: string;
      gbTitle: string;
      debtorId: string;
      debtorName: string;
      creditorId: string;
      creditorName: string;
      amount: number;
      isSettled: boolean;
      date: string;
    }> = [];

    groupBuys.forEach(gb => {
      const payer = getMember(gb.payerId);
      if (!payer) return;
      // Sum items per non-payer member
      const memberTotals = new Map<string, number>();
      gb.items.forEach(item => {
        if (item.memberId !== gb.payerId) {
          memberTotals.set(item.memberId, (memberTotals.get(item.memberId) || 0) + item.amount);
        }
      });
      memberTotals.forEach((amount, memberId) => {
        const debtor = getMember(memberId);
        if (!debtor) return;
        debts.push({
          gbId: gb.id,
          gbTitle: gb.title,
          debtorId: memberId,
          debtorName: debtor.name,
          creditorId: gb.payerId,
          creditorName: payer.name,
          amount,
          isSettled: gb.settlements[memberId] === true,
          date: gb.date,
        });
      });
    });

    return debts;
  }, [groupBuys, getMember]);

  const unsettledDebts = groupBuyDebts.filter(d => !d.isSettled);
  const settledDebts = groupBuyDebts.filter(d => d.isSettled);

  const advancePayments = useMemo(() =>
    expenses.filter(exp => exp.paidBy !== FUND_PAYER_ID),
    [expenses]
  );
  const isFundId = (id: string) => id === FUND_PAYER_ID;
  const plannedFundOut = settlements
    .filter((s) => isFundId(s.fromId))
    .reduce((sum, s) => sum + s.amount, 0);
  const plannedFundIn = settlements
    .filter((s) => isFundId(s.toId))
    .reduce((sum, s) => sum + s.amount, 0);
  const projectedFundAfterPlan = fundBalance - plannedFundOut + plannedFundIn;

  const doneCount = settlements.filter(s => s.done).length;
  const allDone   = settlements.length > 0 && doneCount === settlements.length;

  // Compute adjusted balances that account for completed settlements
  const adjustedBalances = balances.map(b => {
    let adjustment = 0;
    for (const s of settlements) {
      if (!s.done) continue;
      // If this person paid (from), their balance goes up (debt reduced)
      if (s.fromId === b.member.id) adjustment += s.amount;
      // If this person received (to), their balance goes down (receivable reduced)
      if (s.toId === b.member.id) adjustment -= s.amount;
    }
    return { ...b, balance: b.balance + adjustment };
  });

  function markDone(id: string) {
    setSettlements(prev => prev.map(s => s.id === id ? { ...s, done: true } : s));
    showToast('success', t.settlement.markedDone);
  }

  function markUndone(id: string) {
    setSettlements(prev => prev.map(s => s.id === id ? { ...s, done: false } : s));
    showToast('info', t.settlement.unmarkedDone);
  }

  useEffect(() => {
    if (allDone && settlements.length > 0) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  }, [allDone, settlements.length]);

  return (
    <div className="bg-transparent min-h-screen w-full overflow-x-hidden">
      {showConfetti && <Confetti />}

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="bg-sidebar px-4 pt-header pb-4 border-b border-border lg:pt-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-black text-foreground">{t.settlement.title}</h1>
          <p className="text-sm text-muted-foreground">{groupName}</p>
        </div>
      </div>

      <StaggerContainer className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* ── All Settled State ──────────────────────────────────── */}
        <AnimatePresence>
          {allDone && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gradient-to-br from-[#72A857] to-[#5A9040] rounded-2xl p-6 text-white text-center shadow-lg"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}
                className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3"
              >
                <PartyPopper size={32} strokeWidth={2} />
              </motion.div>
              <p className="text-2xl font-black mb-1">{t.settlement.allSettled}</p>
              <p className="text-white/80 text-sm">{t.settlement.noDebt}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Fund Info Banner ──────────────────────────────────── */}
        {totalContributions > 0 && (
          <StaggerItem>
          <div className="bg-accent-bg border border-primary/20 rounded-2xl px-4 py-3 flex items-start gap-3">
            <Wallet size={16} className="text-primary flex-shrink-0" />
            <div className="text-xs text-primary space-y-1">
              <p>
                {t.settlement.fundCash(fmt(fundBalance), fmt(totalContributions), fmt(totalContributions - fundBalance))}
              </p>
              <p className="text-[11px] text-primary/80">
                {t.settlement.settlePlan(fmt(projectedFundAfterPlan))}
              </p>
            </div>
          </div>
          </StaggerItem>
        )}

        {/* ── Contribution History ──────────────────────────────── */}
        {contributions.length > 0 && (
          <StaggerItem>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowContribHistory(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <div className="flex items-center gap-2">
                <Wallet size={14} className="text-primary" strokeWidth={2} />
                <span className="text-sm font-bold text-foreground">{t.settlement.contribHistory}</span>
                <span className="text-xs text-muted-foreground">({contributions.length} {t.common.items})</span>
              </div>
              {showContribHistory
                ? <ChevronUp size={14} className="text-subtle" />
                : <ChevronDown size={14} className="text-subtle" />
              }
            </button>
            <AnimatePresence>
              {showContribHistory && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-border">
                    {contributions.map((c, i) => {
                      const member = getMember(c.memberId);
                      return (
                        <div
                          key={c.id}
                          className={`flex items-center gap-3 px-4 py-2.5 ${i < contributions.length - 1 ? 'border-b border-border' : ''}`}
                        >
                          {member && <MemberAvatar member={member} size="sm" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-foreground truncate">
                              {member?.name ?? t.common.unknown}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {c.date}{c.note ? ` · ${c.note}` : ''}
                            </p>
                          </div>
                          <span className="text-sm font-bold text-primary tabular-nums flex-shrink-0">
                            +{fmt(c.amount)}
                          </span>
                          {confirmDeleteId === c.id ? (
                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                onClick={() => {
                                  deleteContribution(c.id);
                                  setConfirmDeleteId(null);
                                  showToast('success', t.settlement.deletedContrib);
                                }}
                                className="text-[10px] px-2 py-1 bg-destructive text-white rounded-lg font-bold active:scale-95"
                              >
                                {t.common.confirm}
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="text-[10px] px-2 py-1 bg-secondary text-muted-foreground rounded-lg font-bold active:scale-95"
                              >
                                {t.common.cancel}
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(c.id)}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                            >
                              <Trash2 size={13} strokeWidth={2} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          </StaggerItem>
        )}

        {/* ── Advance Payment History (墊付記錄) ──────────────────── */}
        {advancePayments.length > 0 && (
          <StaggerItem>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowAdvanceHistory(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <div className="flex items-center gap-2">
                <CreditCard size={14} className="text-primary" strokeWidth={2} />
                <span className="text-sm font-bold text-foreground">{t.settlement.advanceHistory}</span>
                <span className="text-xs text-muted-foreground">({advancePayments.length} {t.common.items})</span>
              </div>
              {showAdvanceHistory
                ? <ChevronUp size={14} className="text-subtle" />
                : <ChevronDown size={14} className="text-subtle" />
              }
            </button>
            <AnimatePresence>
              {showAdvanceHistory && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-border">
                    {advancePayments.map((exp, i) => {
                      const payer = getMember(exp.paidBy);
                      return (
                        <div
                          key={exp.id}
                          className={`flex items-center gap-3 px-4 py-2.5 ${i < advancePayments.length - 1 ? 'border-b border-border' : ''}`}
                        >
                          {payer && <MemberAvatar member={payer} size="sm" />}
                          <CategoryIcon category={exp.category} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-foreground truncate">
                              {exp.description}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t.settlement.advancePaid(payer?.name ?? t.common.unknown)} · {exp.date}
                            </p>
                          </div>
                          <span className="text-sm font-bold text-foreground tabular-nums flex-shrink-0">
                            {fmt(exp.amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          </StaggerItem>
        )}

        {/* ── Per-person Balance Cards ───────────────────────────── */}
        <StaggerItem>
          <h2 className="text-xs font-bold text-subtle uppercase tracking-wider mb-3">{t.settlement.personalBalance}</h2>
          <div className="space-y-2">
            {adjustedBalances.map(b => {
              const isPos = b.balance > 0;
              const isNeg = b.balance < 0;
              return (
                <div key={b.member.id}
                  className="bg-card border border-border rounded-2xl overflow-hidden flex">
                  {/* Color strip */}
                  <div className="w-1 flex-shrink-0"
                    style={{ background: isPos ? '#72A857' : isNeg ? '#D05242' : '#3E2015' }} />
                  <div className="flex-1 min-w-0 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <MemberAvatar member={b.member} size="md" />
                      <p className="text-sm font-bold text-foreground truncate flex-1">{b.member.name}</p>
                      <div className="text-right flex-shrink-0">
                        <BalanceBadge amount={b.balance} />
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isPos ? t.settlement.receivable : isNeg ? t.settlement.payable : t.settlement.settled}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 ml-12 text-xs text-muted-foreground">
                      {b.contributed > 0 && (
                        <span className="text-primary whitespace-nowrap">{t.settlement.contributed} {fmt(b.contributed)}</span>
                      )}
                      {b.paid > 0 && (
                        <span className="whitespace-nowrap">{t.settlement.advancedPay} {fmt(b.paid)}</span>
                      )}
                      <span className="whitespace-nowrap">{t.settlement.shouldPay} {fmt(b.shouldPay)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </StaggerItem>

        {/* ── Settlement Suggestions ─────────────────────────────── */}
        {settlements.length > 0 && (
          <StaggerItem>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-subtle uppercase tracking-wider">{t.settlement.minTransfers}</h2>
              <span className={`text-xs px-2 py-1 rounded-full font-bold
                ${allDone ? 'bg-success-bg text-success' : 'bg-secondary text-muted-foreground'}`}>
                {t.settlement.settledCount(doneCount, settlements.length)}
              </span>
            </div>

            <div className="space-y-2">
              {settlements.map(s => {
                const fromIsFund = isFundId(s.fromId);
                const toIsFund = isFundId(s.toId);
                const from = fromIsFund ? null : getMember(s.fromId);
                const to = toIsFund ? null : getMember(s.toId);
                if (!fromIsFund && !from) return null;
                if (!toIsFund && !to) return null;
                const fromName = fromIsFund ? t.settlement.fundAccount : (from?.name || t.common.unknown);
                const toName = toIsFund ? t.settlement.fundAccount : (to?.name || t.common.unknown);

                return (
                  <motion.div
                    key={s.id}
                    animate={s.done ? { opacity: 0.45 } : { opacity: 1 }}
                    className="bg-card border border-border rounded-2xl px-4 py-3 flex items-center gap-3"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {fromIsFund ? (
                        <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 text-primary flex items-center justify-center flex-shrink-0">
                          <Wallet size={14} strokeWidth={2.2} />
                        </div>
                      ) : (
                        <MemberAvatar member={from!} size="sm" />
                      )}
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-muted-foreground">{t.settlement.transferTo}</span>
                        <span className="text-lg text-subtle">→</span>
                      </div>
                      {toIsFund ? (
                        <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 text-primary flex items-center justify-center flex-shrink-0">
                          <Wallet size={14} strokeWidth={2.2} />
                        </div>
                      ) : (
                        <MemberAvatar member={to!} size="sm" />
                      )}
                      <div className="ml-1">
                        <p className="text-xs text-muted-foreground truncate">
                          {fromName} → {toName}
                        </p>
                        <p className="font-black text-sm text-foreground tabular-nums">
                          {fmt(s.amount)}
                        </p>
                      </div>
                    </div>

                    {s.done ? (
                      <button
                        onClick={() => markUndone(s.id)}
                        className="flex items-center gap-1 bg-success-bg text-success px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 hover:bg-success-bg/60 transition-colors active:scale-95"
                        title={t.settlement.unmarkedDone}
                      >
                        <Check size={12} strokeWidth={2.5} /> {t.settlement.done}
                      </button>
                    ) : (
                      <button
                        onClick={() => markDone(s.id)}
                        className="bg-accent-bg text-primary px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 hover:bg-accent-bg/80 transition-colors active:scale-95"
                      >
                        {t.settlement.markDone}
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </StaggerItem>
        )}

        {/* ── Group Buy Debts (搭單還款) ─────────────────────────── */}
        {groupBuyDebts.length > 0 && (
          <StaggerItem>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-subtle uppercase tracking-wider">{t.groupBuy.title}</h2>
                {unsettledDebts.length > 0 && (
                  <span className="text-[10px] bg-warning-bg text-warning px-1.5 py-0.5 rounded-md font-bold">
                    {unsettledDebts.length} {t.groupBuy.unpaid}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {/* Unsettled debts first */}
              {unsettledDebts.map(d => {
                const debtor = getMember(d.debtorId);
                const creditor = getMember(d.creditorId);
                return (
                  <div
                    key={`${d.gbId}-${d.debtorId}`}
                    className="bg-card border border-border rounded-2xl px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {debtor && <MemberAvatar member={debtor} size="sm" />}
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] text-muted-foreground">{t.settlement.transferTo}</span>
                          <span className="text-lg text-subtle">→</span>
                        </div>
                        {creditor && <MemberAvatar member={creditor} size="sm" />}
                        <div className="ml-1">
                          <p className="text-xs text-muted-foreground truncate">
                            {d.debtorName} → {d.creditorName}
                          </p>
                          <p className="font-black text-sm text-foreground tabular-nums">
                            {fmt(d.amount)}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">{d.gbTitle} · {d.date}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => {
                            toggleGroupBuySettlement(d.gbId, d.debtorId);
                            showToast('success', t.groupBuy.markPaid);
                          }}
                          className="bg-accent-bg text-primary px-3 py-1.5 rounded-full text-xs font-bold hover:bg-accent-bg/80 transition-colors active:scale-95"
                        >
                          {t.groupBuy.markPaid}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteGbId(`${d.gbId}-${d.debtorId}`)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 size={13} strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                    {/* Delete confirmation */}
                    <AnimatePresence>
                      {confirmDeleteGbId === `${d.gbId}-${d.debtorId}` && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden"
                        >
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                            <p className="text-[10px] text-muted-foreground">{t.groupBuy.deleteConfirm}</p>
                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                onClick={() => {
                                  deleteGroupBuy(d.gbId);
                                  setConfirmDeleteGbId(null);
                                  showToast('success', t.groupBuy.deleted);
                                }}
                                className="text-[10px] px-2 py-1 bg-destructive text-white rounded-lg font-bold active:scale-95"
                              >
                                {t.common.confirm}
                              </button>
                              <button
                                onClick={() => setConfirmDeleteGbId(null)}
                                className="text-[10px] px-2 py-1 bg-secondary text-muted-foreground rounded-lg font-bold active:scale-95"
                              >
                                {t.common.cancel}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
              {/* Settled debts */}
              {settledDebts.map(d => {
                const debtor = getMember(d.debtorId);
                const creditor = getMember(d.creditorId);
                return (
                  <motion.div
                    key={`${d.gbId}-${d.debtorId}`}
                    animate={{ opacity: 0.45 }}
                    className="bg-card border border-border rounded-2xl px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {debtor && <MemberAvatar member={debtor} size="sm" />}
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] text-muted-foreground">{t.settlement.transferTo}</span>
                          <span className="text-lg text-subtle">→</span>
                        </div>
                        {creditor && <MemberAvatar member={creditor} size="sm" />}
                        <div className="ml-1">
                          <p className="text-xs text-muted-foreground truncate">
                            {d.debtorName} → {d.creditorName}
                          </p>
                          <p className="font-black text-sm text-foreground tabular-nums">
                            {fmt(d.amount)}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">{d.gbTitle} · {d.date}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => {
                            toggleGroupBuySettlement(d.gbId, d.debtorId);
                            showToast('info', t.groupBuy.markUnpaid);
                          }}
                          className="flex items-center gap-1 bg-success-bg text-success px-3 py-1.5 rounded-full text-xs font-bold hover:bg-success-bg/60 transition-colors active:scale-95"
                        >
                          <Check size={12} strokeWidth={2.5} /> {t.groupBuy.paid}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteGbId(`${d.gbId}-${d.debtorId}`)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 size={13} strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                    {/* Delete confirmation */}
                    <AnimatePresence>
                      {confirmDeleteGbId === `${d.gbId}-${d.debtorId}` && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden"
                        >
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                            <p className="text-[10px] text-muted-foreground">{t.groupBuy.deleteConfirm}</p>
                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                onClick={() => {
                                  deleteGroupBuy(d.gbId);
                                  setConfirmDeleteGbId(null);
                                  showToast('success', t.groupBuy.deleted);
                                }}
                                className="text-[10px] px-2 py-1 bg-destructive text-white rounded-lg font-bold active:scale-95"
                              >
                                {t.common.confirm}
                              </button>
                              <button
                                onClick={() => setConfirmDeleteGbId(null)}
                                className="text-[10px] px-2 py-1 bg-secondary text-muted-foreground rounded-lg font-bold active:scale-95"
                              >
                                {t.common.cancel}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </StaggerItem>
        )}

        {/* ── Reset ─────────────────────────────────────────────── */}
        {allDone && (
          <button
            onClick={() => setSettlements(prev => prev.map(s => ({ ...s, done: false })))}
            className="w-full text-xs text-subtle py-2"
          >
            {t.settlement.resetDemo}
          </button>
        )}

        <div className="h-4" />
      </StaggerContainer>
    </div>
  );
}
