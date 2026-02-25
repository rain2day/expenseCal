import React, { useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { ArrowLeft, Plus, X, Calendar, Check, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { CategoryType, parseAmountInput, formatAmountInput, getCurrencyMinorDigits } from '../data/sampleData';
import { MemberAvatar, CategoryBadge, CategoryIcon, StaggerContainer, StaggerItem } from '../components/SharedComponents';
import { useT } from '../i18n/I18nContext';
import { useVisualViewportHeight } from '../hooks/useVisualViewportHeight';

const CATEGORIES: CategoryType[] = ['food', 'transport', 'accommodation', 'tickets', 'shopping', 'other'];

export function GroupBuyForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { members, addGroupBuy, showToast, fmt, currency, getMember } = useApp();
  const { t } = useT();

  const memberId = (location.state as any)?.memberId as string | undefined;

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [payerId, setPayerId] = useState('');
  const [items, setItems] = useState<{ memberId: string; description: string; amount: number; category: CategoryType }[]>([]);

  // Add-item inline form state
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemMemberId, setItemMemberId] = useState(memberId ?? '');
  const [itemDesc, setItemDesc] = useState('');
  const [itemAmount, setItemAmount] = useState('');
  const [itemCategory, setItemCategory] = useState<CategoryType>('shopping');
  const [taxFree, setTaxFree] = useState(false);

  const amountStep = getCurrencyMinorDigits(currency) === 0 ? '1' : '0.01';

  // ── Settlement preview ─────────────────────────────────────────────
  const TAX_RATE = 1.1;
  const taxAdj = (amt: number) => taxFree ? Math.round(amt / TAX_RATE) : amt;
  const totalRaw = items.reduce((s, i) => s + i.amount, 0);
  const total = taxAdj(totalRaw);
  const payerTotalRaw = items.filter(i => i.memberId === payerId).reduce((s, i) => s + i.amount, 0);
  const payerTotal = taxAdj(payerTotalRaw);
  const debtors = items
    .filter(i => i.memberId !== payerId)
    .reduce((acc, i) => {
      acc[i.memberId] = (acc[i.memberId] || 0) + taxAdj(i.amount);
      return acc;
    }, {} as Record<string, number>);
  const taxSaved = taxFree ? totalRaw - total : 0;

  // ── Add item handler ───────────────────────────────────────────────
  function handleAddItem() {
    if (!itemMemberId) { showToast('error', t.groupBuy.selectMember); return; }
    if (!itemDesc.trim()) { showToast('error', t.groupBuy.itemDescription); return; }
    const parsed = parseAmountInput(itemAmount, currency);
    if (!parsed || parsed <= 0) { showToast('error', t.groupBuy.itemAmount); return; }

    setItems(prev => [...prev, {
      memberId: itemMemberId,
      description: itemDesc.trim(),
      amount: parsed,
      category: itemCategory,
    }]);
    // Reset add-item form
    setItemMemberId('');
    setItemDesc('');
    setItemAmount('');
    setItemCategory('shopping');
    setShowAddItem(false);
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  // ── Validation ────────────────────────────────────────────────────
  const uniqueMembers = new Set(items.map(i => i.memberId));
  const hasMultipleMembers = uniqueMembers.size >= 2
    || (uniqueMembers.size === 1 && payerId && !uniqueMembers.has(payerId));
  const canSubmit = !!(title.trim() && payerId && items.length > 0 && hasMultipleMembers);

  // ── Submit handler ─────────────────────────────────────────────────
  async function handleSubmit() {
    if (!title.trim()) { showToast('error', t.groupBuy.titleLabel); return; }
    if (!payerId) { showToast('error', t.groupBuy.selectPayer); return; }
    if (items.length === 0) { showToast('error', t.groupBuy.noItems); return; }
    if (!hasMultipleMembers) { showToast('error', t.groupBuy.needMinTwoItems); return; }

    // Build settlements map: each non-payer member -> false (not yet paid)
    const settlements: Record<string, boolean> = {};
    items.forEach(i => {
      if (i.memberId !== payerId) settlements[i.memberId] = false;
    });

    await addGroupBuy({
      title: title.trim(),
      payerId,
      items,
      date,
      settlements,
    });

    showToast('success', t.groupBuy.created);
    navigate(-1);
  }

  const payerMember = payerId ? getMember(payerId) : undefined;
  const vpHeight = useVisualViewportHeight();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll focused input into view within the scroll container
  const handleInputFocus = () => {
    setTimeout(() => {
      const el = document.activeElement as HTMLElement | null;
      if (el && scrollRef.current) {
        const elRect = el.getBoundingClientRect();
        const containerRect = scrollRef.current.getBoundingClientRect();
        if (elRect.top < containerRect.top || elRect.bottom > containerRect.bottom) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    }, 350);
  };

  return (
    <motion.div
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed top-0 inset-x-0 z-50 bg-background flex flex-col overflow-hidden"
      style={{ height: vpHeight }}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="shrink-0 bg-sidebar px-4 pt-header pb-4 border-b border-border flex items-center gap-3 lg:pt-6">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground active:scale-90 transition-transform"
        >
          <ArrowLeft size={16} strokeWidth={2} />
        </button>
        <h1 className="text-lg font-black text-foreground">{t.groupBuy.newGroupBuy}</h1>
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <StaggerContainer className="max-w-lg mx-auto px-4 py-5 space-y-4">

          {/* Title */}
          <StaggerItem>
            <div className="bg-card border border-border rounded-2xl p-4">
              <label className="block text-xs text-muted-foreground mb-2">{t.groupBuy.titleLabel}</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                onFocus={handleInputFocus}
                placeholder={t.groupBuy.titlePlaceholder}
                className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 border border-border transition-all placeholder:text-subtle"
              />
            </div>
          </StaggerItem>

          {/* Payer */}
          <StaggerItem>
            <div className="bg-card border border-border rounded-2xl p-4">
              <label className="block text-xs text-muted-foreground mb-3">{t.groupBuy.payer}</label>
              <div className="flex gap-3 flex-wrap">
                {members.map(m => (
                  <div key={m.id} className="flex flex-col items-center gap-1">
                    <div className={`p-0.5 rounded-full transition-all ${payerId === m.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : ''}`}>
                      <MemberAvatar
                        member={m}
                        size="md"
                        onClick={() => setPayerId(m.id)}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{m.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </StaggerItem>

          {/* Items */}
          <StaggerItem>
            <div className="bg-card border border-border rounded-2xl p-4">
              <label className="block text-xs text-muted-foreground mb-3">{t.groupBuy.items}</label>

              {/* Existing items list */}
              {items.length > 0 && (
                <div className="space-y-2 mb-3">
                  {items.map((item, idx) => {
                    const member = getMember(item.memberId);
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2.5 bg-secondary rounded-xl px-3 py-2.5 border border-border"
                      >
                        <CategoryIcon category={item.category} size="sm" />
                        {member && (
                          <MemberAvatar member={member} size="sm" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{item.description}</p>
                          <p className="text-[10px] text-muted-foreground">{member?.name}</p>
                        </div>
                        <span className="text-sm font-bold text-foreground tabular-nums whitespace-nowrap">{fmt(item.amount)}</span>
                        <button
                          onClick={() => removeItem(idx)}
                          className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center text-destructive flex-shrink-0 active:scale-90 transition-transform"
                        >
                          <X size={12} strokeWidth={2.5} />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Add item button / inline form */}
              <AnimatePresence mode="wait">
                {!showAddItem ? (
                  <motion.button
                    key="add-btn"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowAddItem(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors active:scale-98"
                  >
                    <Plus size={16} strokeWidth={2} />
                    {t.groupBuy.addItem}
                  </motion.button>
                ) : (
                  <motion.div
                    key="add-form"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 bg-secondary/50 rounded-xl p-3 border border-border overflow-hidden"
                  >
                    {/* Member select */}
                    <div>
                      <label className="block text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">{t.groupBuy.selectMember}</label>
                      <div className="flex gap-2 flex-wrap">
                        {members.map(m => (
                          <div key={m.id} className="flex flex-col items-center gap-0.5">
                            <div className={`p-0.5 rounded-full transition-all ${itemMemberId === m.id ? 'ring-2 ring-primary ring-offset-1 ring-offset-card' : ''}`}>
                              <MemberAvatar
                                member={m}
                                size="sm"
                                onClick={() => setItemMemberId(m.id)}
                              />
                            </div>
                            <span className="text-[9px] text-muted-foreground">{m.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">{t.groupBuy.itemDescription}</label>
                      <input
                        value={itemDesc}
                        onChange={e => setItemDesc(e.target.value)}
                        onFocus={handleInputFocus}
                        placeholder={t.groupBuy.itemDescPlaceholder}
                        className="w-full bg-card rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 border border-border placeholder:text-subtle"
                      />
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">{t.groupBuy.itemAmount}</label>
                      <div className="flex items-center gap-2 bg-card rounded-lg px-3 py-2 border border-border">
                        <span className="text-sm text-subtle font-bold">{currency}</span>
                        <input
                          type="number"
                          value={itemAmount}
                          onChange={e => setItemAmount(e.target.value)}
                          onFocus={handleInputFocus}
                          placeholder="0"
                          min="0"
                          step={amountStep}
                          className="flex-1 bg-transparent text-sm text-foreground outline-none tabular-nums placeholder:text-border"
                          inputMode="decimal"
                        />
                      </div>
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">{t.groupBuy.itemCategory}</label>
                      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                        {CATEGORIES.map(cat => (
                          <CategoryBadge
                            key={cat}
                            category={cat}
                            selected={itemCategory === cat}
                            onClick={() => setItemCategory(cat)}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Confirm / Cancel row */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowAddItem(false);
                          setItemMemberId('');
                          setItemDesc('');
                          setItemAmount('');
                          setItemCategory('shopping');
                        }}
                        className="flex-1 py-2 rounded-lg text-sm font-medium text-muted-foreground bg-secondary border border-border active:scale-98 transition-transform"
                      >
                        {t.common.cancel}
                      </button>
                      <button
                        onClick={handleAddItem}
                        className="flex-1 py-2 rounded-lg text-sm font-bold text-white bg-primary active:scale-98 transition-transform"
                      >
                        <span className="flex items-center justify-center gap-1">
                          <Check size={14} strokeWidth={2.5} />
                          {t.common.confirm}
                        </span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </StaggerItem>

          {/* Tax-free toggle */}
          <StaggerItem>
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-foreground">{t.groupBuy.taxFree}</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{t.groupBuy.taxFreeHint}</p>
                </div>
                <button
                  onClick={() => setTaxFree(prev => !prev)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${taxFree ? 'bg-primary' : 'bg-secondary border border-border'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${taxFree ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          </StaggerItem>

          {/* Settlement Preview */}
          {items.length > 0 && payerId && (
            <StaggerItem>
              <div className="bg-card border border-border rounded-2xl p-4">
                <label className="block text-xs text-muted-foreground mb-3">{t.groupBuy.settlementPreview}</label>
                <div className="space-y-2">
                  {taxFree && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t.groupBuy.originalTotal}</span>
                        <span className="text-muted-foreground tabular-nums line-through">{fmt(totalRaw)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-green-400">{t.groupBuy.taxSaved}</span>
                        <span className="text-green-400 font-bold tabular-nums">-{fmt(taxSaved)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{taxFree ? t.groupBuy.afterTax : t.groupBuy.total}</span>
                    <span className="font-bold text-foreground tabular-nums">{fmt(total)}</span>
                  </div>

                  {/* Payer's own */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {payerMember?.name} {t.groupBuy.payerSelf}
                    </span>
                    <span className="font-bold text-foreground tabular-nums">{fmt(payerTotal)}</span>
                  </div>

                  {/* Divider */}
                  {Object.keys(debtors).length > 0 && (
                    <div className="border-t border-border my-1" />
                  )}

                  {/* Debtors */}
                  {Object.entries(debtors).map(([mid, amt]) => {
                    const debtor = getMember(mid);
                    return (
                      <div key={mid} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          {debtor && <MemberAvatar member={debtor} size="sm" />}
                          <span className="text-foreground">
                            {t.groupBuy.owes(debtor?.name ?? mid, payerMember?.name ?? '', fmt(amt))}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </StaggerItem>
          )}

          {/* Date */}
          <StaggerItem>
            <div className="bg-card border border-border rounded-2xl p-4">
              <label className="block text-xs text-muted-foreground mb-2">{t.groupBuy.date}</label>
              <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2.5 border border-border">
                <Calendar size={16} className="text-muted-foreground" strokeWidth={2} />
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-foreground outline-none"
                />
              </div>
            </div>
          </StaggerItem>

          {/* ── Confirm Button (inside scroll) ───────────────────── */}
          <StaggerItem>
            <div className="pb-[max(env(safe-area-inset-bottom,0px),16px)]">
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`w-full rounded-xl py-3.5 font-bold flex items-center justify-center gap-2 transition-all active:scale-98
                  ${canSubmit
                    ? 'bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
              >
                <ShoppingBag size={18} strokeWidth={2.5} />
                {t.groupBuy.confirm}
              </button>
            </div>
          </StaggerItem>

        </StaggerContainer>
      </div>
    </motion.div>
  );
}
