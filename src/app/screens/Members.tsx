import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { UserPlus, Link2, ChevronDown, Crown, Share2, Copy, Trash2, Pencil, Wallet, BarChart3 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { useT } from '../i18n/I18nContext';
import { splitAmountEvenly } from '../data/sampleData';
import { MemberAvatar, RoleBadge, BalanceBadge, CategoryIcon, StaggerContainer, StaggerItem } from '../components/SharedComponents';
import { SwipeableRow } from '../components/SwipeableRow';
import type { CategoryType } from '../data/sampleData';

export function Members() {
  const navigate = useNavigate();
  const {
    balances, expenses, showToast, groupName, groupId, deleteMember, addMember, members, fmt,
    personalExpenses, loadPersonalExpenses, personalExpensesLoading, deletePersonalExpense,
  } = useApp();
  const { t } = useT();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [swipedPersonalId, setSwipedPersonalId] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');

  const AVATAR_COLORS = ['#DD843C', '#C05A5A', '#72A857', '#5A7EC5', '#C8914A', '#9055A0', '#5AABAB', '#D05242'];

  // Load personal expenses when a member card is expanded
  useEffect(() => {
    if (!expanded) return;
    const cleanup = loadPersonalExpenses(expanded);
    return cleanup;
  }, [expanded, loadPersonalExpenses]);

  function handleAddMember() {
    const name = newMemberName.trim();
    if (!name) { showToast('error', t.members.enterMemberName); return; }
    const id = `m_${Date.now()}`;
    const initials = name.slice(0, 1);
    const color = AVATAR_COLORS[members.length % AVATAR_COLORS.length];
    addMember({ id, name, initials, color, role: 'member' });
    showToast('success', t.members.addedMember(name));
    setNewMemberName('');
    setShowAddMember(false);
  }

  function getMemberExpenses(memberId: string) {
    return expenses.filter(e => e.paidBy === memberId || e.splitAmong.includes(memberId));
  }

  return (
    <div className="bg-transparent min-h-screen w-full overflow-x-hidden">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="bg-sidebar px-4 pt-header pb-4 border-b border-border lg:pt-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          <h1 className="text-xl font-black text-foreground">{t.members.title}</h1>
          <button
            onClick={() => setShowAddMember(v => !v)}
            className="flex items-center gap-1.5 bg-accent-bg text-primary px-3 py-2 rounded-xl text-sm font-bold active:scale-95 transition-transform"
          >
            <UserPlus size={15} strokeWidth={2} /> {t.members.addMember}
          </button>
        </div>
      </div>

      <StaggerContainer className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {/* ── Add Member Form ────────────────────────────────────────── */}
        {showAddMember && (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <p className="text-sm font-bold text-foreground">{t.members.addMember}</p>
            <input
              autoFocus
              value={newMemberName}
              onChange={e => setNewMemberName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddMember(); }}
              placeholder={t.members.namePlaceholder}
              className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground outline-none border border-border focus:border-primary placeholder:text-subtle"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddMember}
                className="flex-1 bg-primary text-white rounded-xl py-2.5 text-sm font-bold active:scale-95 transition-transform"
              >
                {t.members.confirmAdd}
              </button>
              <button
                onClick={() => { setShowAddMember(false); setNewMemberName(''); }}
                className="px-4 bg-secondary text-muted-foreground rounded-xl py-2.5 text-sm font-bold active:scale-95 transition-transform"
              >
                {t.common.cancel}
              </button>
            </div>
          </div>
        )}

        {/* ── Member Cards ──────────────────────────────────────────── */}
        {balances.map((b, _idx) => {
          const isExpanded = expanded === b.member.id;
          const memberExpenses = getMemberExpenses(b.member.id);

          return (
            <StaggerItem key={b.member.id}>
            <div
              className="bg-card border border-border rounded-2xl overflow-hidden">
              {/* Main row */}
              <div
                className="flex items-center gap-3 px-4 py-3.5 cursor-pointer select-none active:bg-secondary transition-colors"
                onClick={() => setExpanded(isExpanded ? null : b.member.id)}
              >
                <MemberAvatar member={b.member} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-black text-foreground">{b.member.name}</p>
                    <RoleBadge role={b.member.role} />
                    {b.member.role === 'admin' && <Crown size={13} className="text-primary" strokeWidth={2} />}
                  </div>
                  <div className="flex gap-2 text-xs text-muted-foreground truncate">
                    <span className="whitespace-nowrap">{t.members.paidTotal} {fmt(b.contributed + b.paid)}</span>
                    <span className="text-subtle">·</span>
                    <span className="whitespace-nowrap">{t.members.shouldPayTotal} {fmt(b.shouldPay)}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <BalanceBadge amount={b.balance} />
                  <motion.span
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    className="inline-flex"
                  >
                    <ChevronDown size={14} className="text-subtle" strokeWidth={2} />
                  </motion.span>
                </div>
              </div>

              {/* Expanded: expense history + delete */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    key={`${b.member.id}-expanded`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      height: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
                      opacity: { duration: 0.2 },
                    }}
                    className="overflow-hidden"
                  >
                    <motion.div
                      className="border-t border-border px-4 py-3 bg-sidebar"
                      initial={{ y: 8, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 4, opacity: 0 }}
                      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <p className="text-xs font-bold text-subtle uppercase tracking-wider mb-2">{t.members.relatedExpenses}</p>
                      {memberExpenses.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">{t.members.noRelatedExpenses}</p>
                      ) : (
                        memberExpenses.slice(0, 5).map((exp, index) => {
                          const isPayer = exp.paidBy === b.member.id;
                          const shareMap = splitAmountEvenly(exp.amount, exp.splitAmong);
                          const memberShare = shareMap[b.member.id] || 0;
                          return (
                            <motion.div
                              key={exp.id}
                              className="flex items-center gap-2 py-1.5"
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.22, delay: index * 0.03 }}
                            >
                              <CategoryIcon category={exp.category} size="sm" />
                              <span className="flex-1 text-xs text-muted-foreground truncate">{exp.description}</span>
                              <span className={`text-xs font-bold tabular-nums ${isPayer ? 'text-success' : 'text-destructive'}`}>
                                {isPayer ? '+' : '-'}{fmt(isPayer ? exp.amount : memberShare)}
                              </span>
                            </motion.div>
                          );
                        })
                      )}
                      {/* Personal expenses preview */}
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs font-bold text-subtle uppercase tracking-wider mb-2">{t.personal.personalExpensesLabel}</p>
                        {personalExpensesLoading ? (
                          <div className="flex justify-center py-2">
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : expanded === b.member.id && personalExpenses.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-1">{t.personal.noPersonalExpenses}</p>
                        ) : expanded === b.member.id ? (
                          <>
                            <div className="rounded-xl overflow-hidden border border-border">
                              {personalExpenses.slice(0, 5).map((pe, index) => (
                                <motion.div
                                  key={pe.id}
                                  className={index < Math.min(personalExpenses.length, 5) - 1 ? 'border-b border-border' : ''}
                                  initial={{ opacity: 0, y: 6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.22, delay: index * 0.03 }}
                                >
                                  <SwipeableRow
                                    isOpen={swipedPersonalId === pe.id}
                                    onOpen={() => setSwipedPersonalId(pe.id)}
                                    onClose={() => setSwipedPersonalId(prev => prev === pe.id ? null : prev)}
                                    actions={[
                                      {
                                        label: t.common.edit,
                                        icon: <Pencil size={14} strokeWidth={2} />,
                                        bgClass: 'bg-accent-bg',
                                        textClass: 'text-primary',
                                        onClick: () => navigate('/app/add-expense', {
                                          state: { personalMode: true, memberId: b.member.id, editPersonalExpense: pe },
                                        }),
                                      },
                                      {
                                        label: t.common.delete,
                                        icon: <Trash2 size={14} strokeWidth={2} />,
                                        bgClass: 'bg-destructive/15',
                                        textClass: 'text-destructive',
                                        onClick: () => {
                                          deletePersonalExpense(b.member.id, pe.id);
                                          showToast('success', t.personal.deleted);
                                          setSwipedPersonalId(null);
                                        },
                                      },
                                    ]}
                                  >
                                    <div className="flex items-center gap-2 px-3 py-2 bg-card">
                                      <CategoryIcon category={pe.category as CategoryType} size="sm" />
                                      <span className="flex-1 text-xs text-muted-foreground truncate">{pe.description}</span>
                                      <span className="text-xs font-bold tabular-nums text-foreground">{fmt(pe.amount)}</span>
                                    </div>
                                  </SwipeableRow>
                                </motion.div>
                              ))}
                            </div>
                            {personalExpenses.length > 5 && (
                              <p className="text-[10px] text-subtle mt-1">+{personalExpenses.length - 5} {t.common.items}</p>
                            )}
                          </>
                        ) : null}
                        {/* Link to full stats */}
                        <button
                          onClick={() => navigate(`/app/personal/${b.member.id}`)}
                          className="flex items-center gap-2 w-full py-2 px-1 mt-1 text-sm font-bold text-primary active:text-primary/70 transition-colors"
                        >
                          <BarChart3 size={15} strokeWidth={2} />
                          {t.personal.viewPersonal}
                        </button>
                      </div>

                      {/* Delete member */}
                      {members.length > 1 && (
                        <div className="mt-3 pt-3 border-t border-border">
                          {confirmDelete === b.member.id ? (
                            <div className="flex items-center gap-2">
                              <p className="flex-1 text-xs text-destructive">{t.members.confirmDeleteMember(b.member.name)}</p>
                              <button
                                onClick={async () => {
                                  const ok = await deleteMember(b.member.id);
                                  if (ok) {
                                    setConfirmDelete(null);
                                    setExpanded(null);
                                    showToast('success', t.members.deletedMember(b.member.name));
                                  }
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
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(b.member.id)}
                              className="flex items-center gap-1.5 text-xs text-destructive/70 active:text-destructive transition-colors"
                            >
                              <Trash2 size={13} strokeWidth={2} /> {t.members.removeMember}
                            </button>
                          )}
                        </div>
                      )}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            </StaggerItem>
          );
        })}

        {/* ── Invite Section ─────────────────────────────────────────── */}
        {(() => {
          const inviteUrl = `${window.location.origin}/join/${groupId || 'demo'}`;

          async function handleShare() {
            if (navigator.share) {
              try {
                await navigator.share({
                  title: t.members.shareTitle(groupName),
                  text: t.members.shareText,
                  url: inviteUrl,
                });
              } catch {
                // User cancelled share - that's ok
              }
            } else {
              try {
                await navigator.clipboard.writeText(inviteUrl);
                showToast('success', t.members.linkCopied);
              } catch {
                showToast('error', t.members.copyFailed);
              }
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
            <StaggerItem>
            <div className="bg-card border border-border rounded-2xl p-5">
              <h2 className="font-bold text-sm text-foreground mb-4">{t.members.inviteFriends}</h2>

              {/* QR code */}
              <div className="flex justify-center mb-4">
                <div className="bg-foreground/10 p-3 rounded-2xl">
                  <QRCodeSVG value={inviteUrl} size={128} bgColor="#F0DDD0" fgColor="#0E0908" level="M" />
                </div>
              </div>

              <p className="text-center text-xs text-muted-foreground mb-4">{t.members.scanToJoin(groupName)}</p>

              {/* Copy link */}
              <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2.5 border border-border mb-4">
                <Link2 size={14} className="text-muted-foreground flex-shrink-0" strokeWidth={2} />
                <span className="text-xs text-muted-foreground flex-1 truncate">{inviteUrl}</span>
                <button
                  onClick={handleCopy}
                  className="text-xs text-primary font-bold flex-shrink-0 active:opacity-70"
                >
                  {t.common.copy}
                </button>
              </div>

              {/* Share buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleShare}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary text-white rounded-xl py-2.5 font-bold text-sm active:scale-95 transition-transform shadow-lg shadow-primary/20"
                >
                  <Share2 size={16} strokeWidth={2} /> {t.common.share}
                </button>
                <button
                  onClick={handleCopy}
                  className="flex-1 flex items-center justify-center gap-2 bg-secondary border border-border text-foreground rounded-xl py-2.5 font-bold text-sm active:scale-95 transition-transform"
                >
                  <Copy size={16} strokeWidth={2} /> {t.common.copyLink}
                </button>
              </div>
            </div>
            </StaggerItem>
          );
        })()}

        <div className="h-4" />
      </StaggerContainer>
    </div>
  );
}
