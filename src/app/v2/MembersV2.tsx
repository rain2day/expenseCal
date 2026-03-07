import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Copy, Crown, Link2, Share2, Trash2, UserPlus, Wallet } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '../context/AppContext';
import { splitAmountEvenly, type CategoryType } from '../data/sampleData';
import { BalanceBadge, CategoryIcon, MemberAvatar, RoleBadge } from '../components/SharedComponents';
import { useT } from '../i18n/I18nContext';
import { useAppPaths } from '../routing/appPaths';
import { V2EmptyState, V2List, V2ListRow, V2MetricGrid, V2PageHeader, V2Panel, V2Token } from './primitives';

const AVATAR_COLORS = ['#DD843C', '#C05A5A', '#72A857', '#5A7EC5', '#C8914A', '#9055A0', '#5AABAB', '#D05242'];

export function MembersV2() {
  const navigate = useNavigate();
  const { t } = useT();
  const { appPath, joinPath, absoluteUrl } = useAppPaths();
  const {
    balances,
    expenses,
    showToast,
    groupName,
    groupId,
    deleteMember,
    addMember,
    members,
    fmt,
    personalExpenses,
    loadPersonalExpenses,
    personalExpensesLoading,
    groupBuys,
    loadGroupBuys,
  } = useApp();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!expanded) return undefined;
    const cleanup = loadPersonalExpenses(expanded);
    return cleanup;
  }, [expanded, loadPersonalExpenses]);

  useEffect(() => {
    const cleanup = loadGroupBuys();
    return cleanup;
  }, [loadGroupBuys]);

  const inviteUrl = absoluteUrl(joinPath(groupId || 'demo'));
  const positiveBalances = balances.filter((balance) => balance.balance > 0).length;
  const negativeBalances = balances.filter((balance) => balance.balance < 0).length;

  const contributionTotal = balances.reduce((sum, balance) => sum + balance.contributed, 0);
  const memberExpenseCount = useMemo(() => {
    const counts = new Map<string, number>();
    expenses.forEach((expense) => {
      counts.set(expense.paidBy, (counts.get(expense.paidBy) || 0) + 1);
      expense.splitAmong.forEach((memberId) => {
        counts.set(memberId, (counts.get(memberId) || 0) + 1);
      });
    });
    return counts;
  }, [expenses]);

  function handleAddMember() {
    const name = newMemberName.trim();
    if (!name) {
      showToast('error', t.members.enterMemberName);
      return;
    }

    const id = `m_${Date.now()}`;
    addMember({
      id,
      name,
      initials: name.slice(0, 1),
      color: AVATAR_COLORS[members.length % AVATAR_COLORS.length],
      role: 'member',
    });
    showToast('success', t.members.addedMember(name));
    setNewMemberName('');
    setShowAddMember(false);
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: t.members.shareTitle(groupName),
          text: t.members.shareText,
          url: inviteUrl,
        });
        return;
      } catch {
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(inviteUrl);
      showToast('success', t.members.linkCopied);
    } catch {
      showToast('error', t.members.copyFailed);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      showToast('success', t.members.linkCopied);
    } catch {
      showToast('error', t.members.copyFailed);
    }
  }

  return (
    <div className="space-y-4">
      <V2PageHeader
        kicker={t.nav.members}
        title={t.members.title}
        description={t.members.scanToJoin(groupName)}
        actions={(
          <button type="button" onClick={() => setShowAddMember((value) => !value)} className="v2-action-button v2-action-button-primary">
            <UserPlus size={16} strokeWidth={2.2} />
            {t.members.addMember}
          </button>
        )}
        meta={(
          <>
            <V2Token tone="warm">{members.length} {t.members.member}</V2Token>
            <V2Token>{fmt(contributionTotal)}</V2Token>
            <V2Token tone="cool">{t.members.inviteFriends}</V2Token>
          </>
        )}
      />

      <V2MetricGrid
        items={[
          { label: t.nav.members, value: String(members.length), note: t.members.inviteFriends },
          { label: t.settlement.receivable, value: String(positiveBalances), note: t.settlement.receivable },
          { label: t.settlement.payable, value: String(negativeBalances), note: t.settlement.payable },
          { label: t.settlement.contributed, value: fmt(contributionTotal), note: t.analytics.statTotalFund },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)]">
        <div className="space-y-4">
          {showAddMember ? (
            <V2Panel title={t.members.addMember} eyebrow={t.members.title}>
              <div className="space-y-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <input
                  autoFocus
                  value={newMemberName}
                  onChange={(event) => setNewMemberName(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') handleAddMember(); }}
                  placeholder={t.members.namePlaceholder}
                  className="w-full rounded-2xl border border-white/10 bg-[rgba(8,12,24,0.58)] px-4 py-3 text-sm text-white outline-none placeholder:text-white/34"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={handleAddMember} className="v2-action-button v2-action-button-primary flex-1">
                    {t.members.confirmAdd}
                  </button>
                  <button type="button" onClick={() => { setShowAddMember(false); setNewMemberName(''); }} className="v2-action-button flex-1">
                    {t.common.cancel}
                  </button>
                </div>
              </div>
            </V2Panel>
          ) : null}

          <V2Panel title={t.members.title} eyebrow={t.members.member}>
            {balances.length === 0 ? (
              <V2EmptyState title={t.members.title} detail={t.members.enterMemberName} />
            ) : (
              <V2List>
                {balances.map((balance) => {
                  const isExpanded = expanded === balance.member.id;
                  const relatedExpenses = expenses.filter((expense) => expense.paidBy === balance.member.id || expense.splitAmong.includes(balance.member.id));

                  return (
                    <div key={balance.member.id} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                      <div className="flex items-start gap-4">
                        <MemberAvatar member={balance.member} size="lg" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-black text-white">{balance.member.name}</p>
                            <RoleBadge role={balance.member.role} />
                            {balance.member.role === 'admin' ? <Crown size={14} className="text-[#f8ac75]" strokeWidth={2} /> : null}
                          </div>
                          <p className="mt-2 text-xs text-white/52">
                            {t.members.paidTotal} {fmt(balance.contributed + balance.paid)} · {t.members.shouldPayTotal} {fmt(balance.shouldPay)}
                          </p>
                        </div>
                        <div className="text-right">
                          <BalanceBadge amount={balance.balance} />
                          <p className="mt-2 text-[11px] text-white/42">{memberExpenseCount.get(balance.member.id) || 0} {t.common.items}</p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">{t.settlement.contributed}</p>
                          <p className="mt-2 text-sm font-black text-white v2-number">{fmt(balance.contributed)}</p>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">{t.settlement.advancedPay}</p>
                          <p className="mt-2 text-sm font-black text-white v2-number">{fmt(balance.paid)}</p>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">{t.settlement.shouldPay}</p>
                          <p className="mt-2 text-sm font-black text-white v2-number">{fmt(balance.shouldPay)}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" onClick={() => setExpanded(isExpanded ? null : balance.member.id)} className="v2-action-button">
                          {isExpanded ? t.common.cancel : t.members.relatedExpenses}
                        </button>
                        <button type="button" onClick={() => navigate(appPath(`/personal/${balance.member.id}`))} className="v2-action-button">
                          {t.personal.personalExpensesLabel}
                        </button>
                        {members.length > 1 ? (
                          confirmDelete === balance.member.id ? (
                            <>
                              <button
                                type="button"
                                onClick={async () => {
                                  const ok = await deleteMember(balance.member.id);
                                  if (ok) {
                                    setConfirmDelete(null);
                                    setExpanded(null);
                                    showToast('success', t.members.deletedMember(balance.member.name));
                                  }
                                }}
                                className="v2-action-button border-[#d05242]/20 bg-[#d05242]/10 text-[#ffcdc6]"
                              >
                                {t.common.confirm}
                              </button>
                              <button type="button" onClick={() => setConfirmDelete(null)} className="v2-action-button">
                                {t.common.cancel}
                              </button>
                            </>
                          ) : (
                            <button type="button" onClick={() => setConfirmDelete(balance.member.id)} className="v2-action-button border-[#d05242]/20 bg-[#d05242]/10 text-[#ffcdc6]">
                              <Trash2 size={14} strokeWidth={2} />
                              {t.members.removeMember}
                            </button>
                          )
                        ) : null}
                      </div>

                      {isExpanded ? (
                        <div className="mt-4 space-y-4 border-t border-white/8 pt-4">
                          <div>
                            <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-white/40">{t.members.relatedExpenses}</p>
                            {relatedExpenses.length === 0 ? (
                              <p className="text-sm text-white/52">{t.members.noRelatedExpenses}</p>
                            ) : (
                              <V2List>
                                {relatedExpenses.slice(0, 5).map((expense) => {
                                  const isPayer = expense.paidBy === balance.member.id;
                                  const shareMap = splitAmountEvenly(expense.amount, expense.splitAmong);
                                  const memberShare = shareMap[balance.member.id] || 0;
                                  return (
                                    <V2ListRow key={expense.id}>
                                      <CategoryIcon category={expense.category} size="sm" />
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-bold text-white">{expense.description}</p>
                                        <p className="mt-1 text-xs text-white/46">{expense.date}</p>
                                      </div>
                                      <p className={`text-sm font-black v2-number ${isPayer ? 'text-[#d9f2d3]' : 'text-[#ffcdc6]'}`}>
                                        {isPayer ? '+' : '-'}{fmt(isPayer ? expense.amount : memberShare)}
                                      </p>
                                    </V2ListRow>
                                  );
                                })}
                              </V2List>
                            )}
                          </div>

                          <div>
                            <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-white/40">{t.personal.personalExpensesLabel}</p>
                            {personalExpensesLoading ? (
                              <div className="flex justify-center py-4">
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#f8ac75] border-t-transparent" />
                              </div>
                            ) : personalExpenses.length === 0 ? (
                              <p className="text-sm text-white/52">{t.personal.noPersonalExpenses}</p>
                            ) : (
                              <V2List>
                                {personalExpenses.slice(0, 4).map((expense) => {
                                  const groupBuy = expense.groupBuyId ? groupBuys.find((item) => item.id === expense.groupBuyId) : null;
                                  return (
                                    <V2ListRow key={expense.id}>
                                      <CategoryIcon category={expense.category as CategoryType} size="sm" />
                                      <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <p className="truncate text-sm font-bold text-white">{expense.description}</p>
                                          {groupBuy ? <V2Token tone="cool">{t.groupBuy.groupBuyTag}</V2Token> : null}
                                        </div>
                                        <p className="mt-1 text-xs text-white/46">{expense.date}</p>
                                      </div>
                                      <p className="text-sm font-black text-white v2-number">{fmt(expense.amount)}</p>
                                    </V2ListRow>
                                  );
                                })}
                              </V2List>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </V2List>
            )}
          </V2Panel>
        </div>

        <div className="space-y-4">
          <V2Panel title={t.members.inviteFriends} eyebrow={t.common.share}>
            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <div className="flex justify-center">
                <div className="rounded-[24px] bg-[#f0ddd0] p-3">
                  <QRCodeSVG value={inviteUrl} size={150} bgColor="#F0DDD0" fgColor="#0E0908" level="M" />
                </div>
              </div>
              <p className="mt-4 text-center text-sm text-white/58">{t.members.scanToJoin(groupName)}</p>
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/8 bg-[rgba(8,12,24,0.58)] px-4 py-3">
                <Link2 size={15} className="text-white/46" strokeWidth={2} />
                <span className="min-w-0 flex-1 truncate text-xs text-white/62">{inviteUrl}</span>
                <button type="button" onClick={handleCopy} className="text-xs font-bold text-[rgba(255,228,210,0.96)]">
                  {t.common.copy}
                </button>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={handleShare} className="v2-action-button v2-action-button-primary justify-center">
                  <Share2 size={15} strokeWidth={2} />
                  {t.common.share}
                </button>
                <button type="button" onClick={handleCopy} className="v2-action-button justify-center">
                  <Copy size={15} strokeWidth={2} />
                  {t.common.copyLink}
                </button>
              </div>
            </div>
          </V2Panel>

          <V2Panel title={t.analytics.memberComparison} eyebrow={t.nav.members}>
            <V2List>
              {balances.map((balance) => (
                <V2ListRow key={balance.member.id}>
                  <span className="h-10 w-10 rounded-full" style={{ background: balance.member.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white">{balance.member.name}</p>
                    <p className="mt-1 text-xs text-white/46">{memberExpenseCount.get(balance.member.id) || 0} {t.common.items}</p>
                  </div>
                  <BalanceBadge amount={balance.balance} />
                </V2ListRow>
              ))}
            </V2List>
          </V2Panel>

          <V2Panel title={t.groupBuy.title} eyebrow={t.groupBuy.groupBuyTag}>
            {groupBuys.length === 0 ? (
              <V2EmptyState title={t.groupBuy.title} detail={t.groupBuy.noItems} actionLabel={t.groupBuy.newGroupBuy} actionTo={appPath('/group-buy')} />
            ) : (
              <V2List>
                {groupBuys.slice(0, 4).map((groupBuy) => (
                  <V2ListRow key={groupBuy.id}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.05] text-white/70">
                      <Wallet size={18} strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{groupBuy.title}</p>
                      <p className="mt-1 text-xs text-white/46">{groupBuy.items.length} {t.common.items}</p>
                    </div>
                    <button type="button" onClick={() => navigate(appPath(`/group-buy/${groupBuy.id}`))} className="v2-action-button">
                      {t.groupBuy.groupBuyTag}
                    </button>
                  </V2ListRow>
                ))}
              </V2List>
            )}
          </V2Panel>
        </div>
      </div>
    </div>
  );
}
