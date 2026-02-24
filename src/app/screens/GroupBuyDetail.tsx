import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Trash2, Check, Calendar, Wallet, ShoppingBag, PartyPopper } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { useT } from '../i18n/I18nContext';
import { CategoryIcon, MemberAvatar, StaggerContainer, StaggerItem } from '../components/SharedComponents';

function MiniConfetti() {
  const colors = ['#DD843C', '#9055A0', '#72A857', '#D05242', '#C8914A', '#5A7EC5'];
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    x: Math.random() * 100,
    delay: Math.random() * 0.3,
    size: Math.random() * 6 + 4,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0 }}
          animate={{ y: '100vh', opacity: 0, rotate: 360 * 3 }}
          transition={{ duration: 1.5 + Math.random(), delay: p.delay, ease: 'easeIn' }}
          className="absolute rounded-sm"
          style={{ width: p.size, height: p.size, background: p.color, left: 0 }}
        />
      ))}
    </div>
  );
}

export function GroupBuyDetail() {
  const { groupBuyId } = useParams<{ groupBuyId: string }>();
  const navigate = useNavigate();
  const {
    groupBuys, loadGroupBuys, toggleGroupBuySettlement,
    deleteGroupBuy, getMember, showToast, fmt,
  } = useApp();
  const { t } = useT();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [celebratingMember, setCelebratingMember] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const cleanup = loadGroupBuys();
    return cleanup;
  }, [loadGroupBuys]);

  const gb = groupBuys.find(g => g.id === groupBuyId);

  if (!gb) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Not found</p>
      </div>
    );
  }

  const payer = getMember(gb.payerId);
  const total = gb.items.reduce((s, i) => s + i.amount, 0);

  // Group items by debtor (non-payer members)
  const debtors: Record<string, number> = {};
  gb.items.forEach(i => {
    if (i.memberId !== gb.payerId) {
      debtors[i.memberId] = (debtors[i.memberId] || 0) + i.amount;
    }
  });

  const allSettled = Object.keys(debtors).length > 0 &&
    Object.keys(debtors).every(mid => gb.settlements[mid]);

  function handleToggle(memberId: string) {
    const wasPaid = gb!.settlements[memberId];
    toggleGroupBuySettlement(gb!.id, memberId);
    if (!wasPaid) {
      setCelebratingMember(memberId);
      setShowConfetti(true);
      setTimeout(() => {
        setCelebratingMember(null);
        setShowConfetti(false);
      }, 2000);
    }
  }

  function handleDelete() {
    deleteGroupBuy(gb!.id);
    showToast('success', t.groupBuy.deleted);
    navigate(-1);
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden">
      {showConfetti && <MiniConfetti />}

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="shrink-0 bg-sidebar px-4 pt-header pb-4 border-b border-border flex items-center gap-3 lg:pt-6">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground active:scale-90 transition-transform"
        >
          <ArrowLeft size={16} strokeWidth={2} />
        </button>
        <h1 className="text-lg font-black text-foreground truncate">{gb.title}</h1>
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <StaggerContainer className="max-w-lg mx-auto px-4 py-5 space-y-4">

          {/* ── All Settled Banner ──────────────────────────────── */}
          <AnimatePresence>
            {allSettled && (
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
                <p className="text-2xl font-black mb-1">{t.groupBuy.allSettled}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Info Card ───────────────────────────────────────── */}
          <StaggerItem>
            <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <Calendar size={14} className="text-muted-foreground" strokeWidth={2} />
                  <span className="text-sm text-foreground">{gb.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Wallet size={14} className="text-primary" strokeWidth={2} />
                  <span className="text-sm font-black text-foreground tabular-nums">{fmt(total)}</span>
                </div>
              </div>
              <div className="border-t border-border pt-3 flex items-center gap-3">
                {payer && <MemberAvatar member={payer} size="md" />}
                <div>
                  <p className="text-sm font-bold text-foreground">{payer?.name ?? t.common.unknown}</p>
                  <p className="text-xs text-muted-foreground">{t.groupBuy.payer}</p>
                </div>
              </div>
            </div>
          </StaggerItem>

          {/* ── Items List ──────────────────────────────────────── */}
          <StaggerItem>
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={14} className="text-primary" strokeWidth={2} />
                  <span className="text-sm font-bold text-foreground">{t.groupBuy.items}</span>
                  <span className="text-xs text-muted-foreground">({gb.items.length})</span>
                </div>
              </div>
              <div>
                {gb.items.map((item, idx) => {
                  const member = getMember(item.memberId);
                  const isPayer = item.memberId === gb.payerId;
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-2.5 px-4 py-2.5 ${
                        idx < gb.items.length - 1 ? 'border-b border-border' : ''
                      }`}
                    >
                      <CategoryIcon category={item.category} size="sm" />
                      {member && <MemberAvatar member={member} size="sm" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.description}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {member?.name}{isPayer ? ` ${t.groupBuy.payerSelf}` : ''}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-foreground tabular-nums whitespace-nowrap flex-shrink-0">
                        {fmt(item.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </StaggerItem>

          {/* ── Settlement Section ──────────────────────────────── */}
          {Object.keys(debtors).length > 0 && (
            <StaggerItem>
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-foreground">{t.groupBuy.settlementPreview}</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                      allSettled ? 'bg-success-bg text-success' : 'bg-secondary text-muted-foreground'
                    }`}>
                      {Object.values(debtors).filter((_, i) => gb.settlements[Object.keys(debtors)[i]]).length}/{Object.keys(debtors).length}
                    </span>
                  </div>
                </div>
                <div>
                  {Object.entries(debtors).map(([memberId, amount], idx) => {
                    const debtor = getMember(memberId);
                    const isPaid = gb.settlements[memberId];
                    return (
                      <motion.div
                        key={memberId}
                        animate={isPaid ? { opacity: 0.6 } : { opacity: 1 }}
                        className={`relative flex items-center gap-3 px-4 py-3 ${
                          idx < Object.keys(debtors).length - 1 ? 'border-b border-border' : ''
                        }`}
                      >
                        {debtor && <MemberAvatar member={debtor} size="sm" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">
                            {debtor?.name ?? t.common.unknown}
                          </p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {t.groupBuy.owes(debtor?.name ?? '', payer?.name ?? '', fmt(amount))}
                          </p>
                        </div>
                        <button
                          onClick={() => handleToggle(memberId)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex-shrink-0 active:scale-95 ${
                            isPaid
                              ? 'bg-success/15 text-success'
                              : 'bg-secondary text-muted-foreground'
                          }`}
                        >
                          {isPaid ? (
                            <><Check size={12} className="inline mr-1" />{t.groupBuy.paid}</>
                          ) : (
                            t.groupBuy.unpaid
                          )}
                        </button>

                        {/* Celebration emoji */}
                        {celebratingMember === memberId && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="absolute inset-0 flex items-center justify-center pointer-events-none"
                          >
                            <span className="text-2xl">🎉</span>
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </StaggerItem>
          )}

          {/* ── Delete Section ──────────────────────────────────── */}
          <StaggerItem>
            <div className="pt-4">
              <AnimatePresence mode="wait">
                {!confirmDelete ? (
                  <motion.button
                    key="delete-btn"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setConfirmDelete(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-destructive/30 text-sm font-bold text-destructive hover:bg-destructive/5 transition-colors active:scale-98"
                  >
                    <Trash2 size={14} strokeWidth={2} />
                    {t.groupBuy.deleteConfirm.split('？')[0]}
                  </motion.button>
                ) : (
                  <motion.div
                    key="confirm-row"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-2"
                  >
                    <p className="text-xs text-center text-muted-foreground">
                      {t.groupBuy.deleteConfirm}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground bg-secondary border border-border active:scale-98 transition-transform"
                      >
                        {t.common.cancel}
                      </button>
                      <button
                        onClick={handleDelete}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-destructive active:scale-98 transition-transform"
                      >
                        {t.common.confirm}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </StaggerItem>

          <div className="h-4" />
        </StaggerContainer>
      </div>
    </div>
  );
}
