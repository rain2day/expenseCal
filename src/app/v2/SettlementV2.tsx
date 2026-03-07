import React, { useEffect, useMemo, useState } from 'react';
import { Check, CreditCard, PartyPopper, Trash2, Wallet } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { FUND_PAYER_ID } from '../data/sampleData';
import { BalanceBadge, CategoryIcon, MemberAvatar } from '../components/SharedComponents';
import { useT } from '../i18n/I18nContext';
import { getV2Copy } from './copy';
import { V2EmptyState, V2List, V2ListRow, V2MetricGrid, V2PageHeader, V2Panel, V2Token } from './primitives';

export function SettlementV2() {
  const { locale, t } = useT();
  const copy = getV2Copy(locale);
  const {
    balances,
    settlements,
    setSettlements,
    groupName,
    showToast,
    fundBalance,
    totalContributions,
    getMember,
    fmt,
    contributions,
    deleteContribution,
    expenses,
    groupBuys,
    loadGroupBuys,
    toggleGroupBuySettlement,
    deleteGroupBuy,
  } = useApp();
  const [confirmDeleteContributionId, setConfirmDeleteContributionId] = useState<string | null>(null);
  const [confirmDeleteGroupBuyId, setConfirmDeleteGroupBuyId] = useState<string | null>(null);

  useEffect(() => {
    const cleanup = loadGroupBuys();
    return cleanup;
  }, [loadGroupBuys]);

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

    const taxRate = 1.1;
    groupBuys.forEach((groupBuy) => {
      const payer = getMember(groupBuy.payerId);
      if (!payer) return;

      const taxAdjusted = (amount: number) => groupBuy.taxFree ? Math.round(amount / taxRate) : amount;
      const memberTotals = new Map<string, number>();
      groupBuy.items.forEach((item) => {
        if (item.memberId === groupBuy.payerId) return;
        memberTotals.set(item.memberId, (memberTotals.get(item.memberId) || 0) + taxAdjusted(item.amount));
      });

      memberTotals.forEach((amount, memberId) => {
        const debtor = getMember(memberId);
        if (!debtor) return;
        debts.push({
          gbId: groupBuy.id,
          gbTitle: groupBuy.title,
          debtorId: memberId,
          debtorName: debtor.name,
          creditorId: groupBuy.payerId,
          creditorName: payer.name,
          amount,
          isSettled: groupBuy.settlements[memberId] === true,
          date: groupBuy.date,
        });
      });
    });

    return debts;
  }, [getMember, groupBuys]);

  const unsettledDebts = groupBuyDebts.filter((debt) => !debt.isSettled);
  const settledDebts = groupBuyDebts.filter((debt) => debt.isSettled);
  const advancePayments = useMemo(() => expenses.filter((expense) => expense.paidBy !== FUND_PAYER_ID), [expenses]);
  const plannedFundOut = settlements.filter((item) => item.fromId === FUND_PAYER_ID).reduce((sum, item) => sum + item.amount, 0);
  const plannedFundIn = settlements.filter((item) => item.toId === FUND_PAYER_ID).reduce((sum, item) => sum + item.amount, 0);
  const projectedFundAfterPlan = fundBalance - plannedFundOut + plannedFundIn;
  const doneCount = settlements.filter((item) => item.done).length;
  const allDone = settlements.length > 0 && doneCount === settlements.length;
  const pendingSettlementAmount = settlements.filter((item) => !item.done).reduce((sum, item) => sum + item.amount, 0);

  const adjustedBalances = balances.map((balance) => {
    let adjustment = 0;
    settlements.forEach((item) => {
      if (!item.done) return;
      if (item.fromId === balance.member.id) adjustment += item.amount;
      if (item.toId === balance.member.id) adjustment -= item.amount;
    });
    return { ...balance, balance: balance.balance + adjustment };
  });

  function markDone(id: string) {
    setSettlements((current) => current.map((item) => item.id === id ? { ...item, done: true } : item));
    showToast('success', t.settlement.markedDone);
  }

  function markUndone(id: string) {
    setSettlements((current) => current.map((item) => item.id === id ? { ...item, done: false } : item));
    showToast('info', t.settlement.unmarkedDone);
  }

  return (
    <div className="space-y-4">
      <V2PageHeader
        kicker={t.nav.settlement}
        title={t.settlement.title}
        description={groupName}
        meta={(
          <>
            <V2Token tone={fundBalance >= 0 ? 'cool' : 'danger'}>{t.dashboard.fundBalance} {fmt(fundBalance)}</V2Token>
            <V2Token tone="warm">{t.settlement.settledCount(doneCount, settlements.length)}</V2Token>
            <V2Token>{fmt(projectedFundAfterPlan)}</V2Token>
          </>
        )}
      />

      <V2MetricGrid
        items={[
          { label: t.settlement.minTransfers, value: fmt(pendingSettlementAmount), note: t.settlement.settledCount(doneCount, settlements.length) },
          { label: t.analytics.statTotalFund, value: fmt(totalContributions), note: t.dashboard.fundBalance },
          { label: t.analytics.advancePending, value: fmt(advancePayments.reduce((sum, expense) => sum + expense.amount, 0)), note: t.settlement.advanceHistory },
          { label: t.groupBuy.title, value: String(unsettledDebts.length), note: unsettledDebts.length > 0 ? t.groupBuy.unpaid : t.groupBuy.paid },
        ]}
      />

      {allDone ? (
        <div className="rounded-[28px] border border-[#72a857]/24 bg-[linear-gradient(180deg,rgba(114,168,87,0.18),rgba(90,144,64,0.12))] px-6 py-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-[#d9f2d3]">
            <PartyPopper size={32} strokeWidth={2} />
          </div>
          <p className="mt-4 text-2xl font-black text-white">{t.settlement.allSettled}</p>
          <p className="mt-2 text-sm text-white/58">{t.settlement.noDebt}</p>
          <button
            type="button"
            onClick={() => setSettlements((current) => current.map((item) => ({ ...item, done: false })))}
            className="v2-action-button mt-5"
          >
            {t.settlement.resetDemo}
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)]">
        <div className="space-y-4">
          <V2Panel title={t.settlement.minTransfers} eyebrow={t.nav.settlement}>
            {settlements.length === 0 ? (
              <V2EmptyState title={t.settlement.noDebt} detail={t.settlement.allSettled} />
            ) : (
              <V2List>
                {settlements.map((settlement) => {
                  const fromIsFund = settlement.fromId === FUND_PAYER_ID;
                  const toIsFund = settlement.toId === FUND_PAYER_ID;
                  const from = fromIsFund ? null : getMember(settlement.fromId);
                  const to = toIsFund ? null : getMember(settlement.toId);
                  const fromName = fromIsFund ? t.settlement.fundAccount : (from?.name || t.common.unknown);
                  const toName = toIsFund ? t.settlement.fundAccount : (to?.name || t.common.unknown);

                  return (
                    <V2ListRow key={settlement.id}>
                      {fromIsFund ? (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(248,172,117,0.12)] text-[rgba(255,228,210,0.96)]">
                          <Wallet size={16} strokeWidth={2.2} />
                        </div>
                      ) : from ? <MemberAvatar member={from} size="sm" /> : null}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-white">{fromName} → {toName}</p>
                        <p className="mt-1 text-xs text-white/46">{fmt(settlement.amount)}</p>
                      </div>
                      {toIsFund ? (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(248,172,117,0.12)] text-[rgba(255,228,210,0.96)]">
                          <Wallet size={16} strokeWidth={2.2} />
                        </div>
                      ) : to ? <MemberAvatar member={to} size="sm" /> : null}
                      <button
                        type="button"
                        onClick={() => settlement.done ? markUndone(settlement.id) : markDone(settlement.id)}
                        className={`rounded-full px-3 py-2 text-xs font-bold ${settlement.done ? 'bg-[#72a857]/14 text-[#d9f2d3]' : 'bg-[rgba(248,172,117,0.12)] text-[rgba(255,228,210,0.96)]'}`}
                      >
                        {settlement.done ? <Check size={12} className="inline" strokeWidth={2.4} /> : null} {settlement.done ? t.settlement.done : t.settlement.markDone}
                      </button>
                    </V2ListRow>
                  );
                })}
              </V2List>
            )}
          </V2Panel>

          <V2Panel title={t.settlement.personalBalance} eyebrow={t.nav.members}>
            <V2List>
              {adjustedBalances.map((balance) => (
                <V2ListRow key={balance.member.id}>
                  <MemberAvatar member={balance.member} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white">{balance.member.name}</p>
                    <p className="mt-1 text-xs text-white/46">
                      {t.settlement.contributed} {fmt(balance.contributed)} · {t.settlement.shouldPay} {fmt(balance.shouldPay)}
                    </p>
                  </div>
                  <BalanceBadge amount={balance.balance} />
                </V2ListRow>
              ))}
            </V2List>
          </V2Panel>

          <V2Panel title={t.groupBuy.title} eyebrow={t.groupBuy.groupBuyTag}>
            {groupBuyDebts.length === 0 ? (
              <V2EmptyState title={t.groupBuy.title} detail={t.groupBuy.noItems} />
            ) : (
              <V2List>
                {[...unsettledDebts, ...settledDebts].map((debt) => {
                  const debtor = getMember(debt.debtorId);
                  const creditor = getMember(debt.creditorId);
                  const confirmId = `${debt.gbId}-${debt.debtorId}`;
                  return (
                    <div key={confirmId} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                      <div className="flex items-center gap-3">
                        {debtor ? <MemberAvatar member={debtor} size="sm" /> : null}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-white">{debt.debtorName} → {debt.creditorName}</p>
                          <p className="mt-1 text-xs text-white/46">{debt.gbTitle} · {debt.date}</p>
                        </div>
                        {creditor ? <MemberAvatar member={creditor} size="sm" /> : null}
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <V2Token tone={debt.isSettled ? 'success' : 'warm'}>{fmt(debt.amount)}</V2Token>
                        <button
                          type="button"
                          onClick={() => {
                            toggleGroupBuySettlement(debt.gbId, debt.debtorId);
                            showToast(debt.isSettled ? 'info' : 'success', debt.isSettled ? t.groupBuy.markUnpaid : t.groupBuy.markPaid);
                          }}
                          className={`v2-action-button ${debt.isSettled ? 'border-[#72a857]/20 bg-[#72a857]/10 text-[#d9f2d3]' : ''}`}
                        >
                          {debt.isSettled ? t.groupBuy.paid : t.groupBuy.markPaid}
                        </button>
                        {confirmDeleteGroupBuyId === confirmId ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                deleteGroupBuy(debt.gbId);
                                setConfirmDeleteGroupBuyId(null);
                                showToast('success', t.groupBuy.deleted);
                              }}
                              className="v2-action-button border-[#d05242]/20 bg-[#d05242]/10 text-[#ffcdc6]"
                            >
                              {t.common.confirm}
                            </button>
                            <button type="button" onClick={() => setConfirmDeleteGroupBuyId(null)} className="v2-action-button">
                              {t.common.cancel}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteGroupBuyId(confirmId)}
                            className="v2-action-button border-[#d05242]/20 bg-[#d05242]/10 text-[#ffcdc6]"
                          >
                            <Trash2 size={14} strokeWidth={2} />
                            {t.common.delete}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </V2List>
            )}
          </V2Panel>
        </div>

        <div className="space-y-4">
          <V2Panel title={copy.snapshot} eyebrow={t.nav.settlement}>
            <V2List>
              <V2ListRow>
                <Wallet size={18} className="text-[#f8ac75]" strokeWidth={2} />
                <div className="flex-1">
                  <p className="text-sm text-white/68">{t.dashboard.fundBalance}</p>
                  <p className={`mt-1 text-sm font-black v2-number ${fundBalance >= 0 ? 'text-[#d9f2d3]' : 'text-[#ffcdc6]'}`}>{fmt(fundBalance)}</p>
                </div>
              </V2ListRow>
              <V2ListRow>
                <CreditCard size={18} className="text-[#6c71e2]" strokeWidth={2} />
                <div className="flex-1">
                  <p className="text-sm text-white/68">{t.settlement.advanceHistory}</p>
                  <p className="mt-1 text-sm font-black text-white v2-number">{fmt(advancePayments.reduce((sum, expense) => sum + expense.amount, 0))}</p>
                </div>
              </V2ListRow>
              <V2ListRow>
                <PartyPopper size={18} className="text-[#72a857]" strokeWidth={2} />
                <div className="flex-1">
                  <p className="text-sm text-white/68">{t.settlement.settlePlan(fmt(projectedFundAfterPlan))}</p>
                  <p className="mt-1 text-sm font-black text-white v2-number">{fmt(projectedFundAfterPlan)}</p>
                </div>
              </V2ListRow>
            </V2List>
          </V2Panel>

          <V2Panel title={t.settlement.contribHistory} eyebrow={t.analytics.statTotalFund}>
            {contributions.length === 0 ? (
              <V2EmptyState title={t.settlement.contribHistory} detail={t.groupBuy.noItems} />
            ) : (
              <V2List>
                {contributions.map((contribution) => {
                  const member = getMember(contribution.memberId);
                  return (
                    <div key={contribution.id} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                      <div className="flex items-center gap-3">
                        {member ? <MemberAvatar member={member} size="sm" /> : null}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-white">{member?.name ?? t.common.unknown}</p>
                          <p className="mt-1 text-xs text-white/46">{contribution.date}{contribution.note ? ` · ${contribution.note}` : ''}</p>
                        </div>
                        <p className="text-sm font-black text-[#d9f2d3] v2-number">+{fmt(contribution.amount)}</p>
                      </div>
                      <div className="mt-3 flex justify-end gap-2">
                        {confirmDeleteContributionId === contribution.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                deleteContribution(contribution.id);
                                setConfirmDeleteContributionId(null);
                                showToast('success', t.settlement.deletedContrib);
                              }}
                              className="v2-action-button border-[#d05242]/20 bg-[#d05242]/10 text-[#ffcdc6]"
                            >
                              {t.common.confirm}
                            </button>
                            <button type="button" onClick={() => setConfirmDeleteContributionId(null)} className="v2-action-button">
                              {t.common.cancel}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteContributionId(contribution.id)}
                            className="v2-action-button border-[#d05242]/20 bg-[#d05242]/10 text-[#ffcdc6]"
                          >
                            <Trash2 size={14} strokeWidth={2} />
                            {t.common.delete}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </V2List>
            )}
          </V2Panel>

          <V2Panel title={t.settlement.advanceHistory} eyebrow={t.analytics.advancePending}>
            {advancePayments.length === 0 ? (
              <V2EmptyState title={t.settlement.advanceHistory} detail={t.settlement.noDebt} />
            ) : (
              <V2List>
                {advancePayments.map((expense) => {
                  const payer = getMember(expense.paidBy);
                  return (
                    <V2ListRow key={expense.id}>
                      {payer ? <MemberAvatar member={payer} size="sm" /> : null}
                      <CategoryIcon category={expense.category} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-white">{expense.description}</p>
                        <p className="mt-1 text-xs text-white/46">{t.settlement.advancePaid(payer?.name ?? t.common.unknown)} · {expense.date}</p>
                      </div>
                      <p className="text-sm font-black text-white v2-number">{fmt(expense.amount)}</p>
                    </V2ListRow>
                  );
                })}
              </V2List>
            )}
          </V2Panel>
        </div>
      </div>
    </div>
  );
}
