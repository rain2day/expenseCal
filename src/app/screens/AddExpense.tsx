import React, { useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { X, Calendar, Check, Wallet, Lock, ShoppingBag, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { CategoryType, Expense, FUND_PAYER_ID, formatAmountInput, getCurrencyMinorDigits, parseAmountInput } from '../data/sampleData';
import { MemberAvatar, CategoryBadge, CategoryIcon, StaggerContainer, StaggerItem } from '../components/SharedComponents';
import { useT } from '../i18n/I18nContext';
import { useVisualViewportHeight } from '../hooks/useVisualViewportHeight';

const CATEGORIES: CategoryType[] = ['food', 'transport', 'accommodation', 'tickets', 'shopping', 'other'];

export function AddExpense() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    members, addExpense, updateExpense, addPersonalExpense, updatePersonalExpense,
    addGroupBuy, getMember, showToast, currency, fundBalance, fmt,
  } = useApp();
  const { t } = useT();

  const editExpense = (location.state as any)?.editExpense as Expense | undefined;
  const editPersonalExp = (location.state as any)?.editPersonalExpense as any | undefined;
  const scanData = (location.state as any)?.scanData as {
    amount: string | number;
    description: string;
    category: CategoryType;
    date: string;
  } | undefined;
  const isEdit = !!editExpense;
  const isEditPersonal = !!editPersonalExp;
  const scannedAmountText = scanData?.amount !== undefined ? String(scanData.amount) : '';

  // Personal mode: passed via location.state from PersonalExpenses page
  const personalModeDefault = !!(location.state as any)?.personalMode || isEditPersonal;
  const personalMemberId = (location.state as any)?.memberId as string | undefined;

  const [expenseType, setExpenseType] = useState<'group' | 'personal' | 'groupBuy'>(
    personalModeDefault ? 'personal' : 'group'
  );
  const [amount,      setAmount]      = useState(
    editExpense ? formatAmountInput(editExpense.amount, currency)
    : editPersonalExp ? formatAmountInput(editPersonalExp.amount, currency)
    : scannedAmountText
  );
  const [description, setDescription] = useState(editExpense?.description ?? editPersonalExp?.description ?? scanData?.description ?? '');
  const [category,    setCategory]    = useState<CategoryType>(editExpense?.category ?? editPersonalExp?.category ?? scanData?.category ?? 'food');
  const [paidBy,      setPaidBy]      = useState(editExpense?.paidBy ?? FUND_PAYER_ID);
  const [splitAmong,  setSplitAmong]  = useState<string[]>(editExpense?.splitAmong ?? members.map(m => m.id));
  const [date,        setDate]        = useState(editExpense?.date ?? editPersonalExp?.date ?? scanData?.date ?? new Date().toISOString().split('T')[0]);
  const lastPayerTapRef = useRef(0);

  // Personal-mode specific state
  const [personalFor, setPersonalFor] = useState<string>(personalMemberId ?? members[0]?.id ?? '');

  // GroupBuy-mode specific state
  const [gbTitle, setGbTitle] = useState('');
  const [gbPayerId, setGbPayerId] = useState('');
  const [gbItems, setGbItems] = useState<{ memberId: string; description: string; amount: number; category: CategoryType }[]>([]);
  const [showGbAddItem, setShowGbAddItem] = useState(false);
  const [gbItemMemberId, setGbItemMemberId] = useState('');
  const [gbItemDesc, setGbItemDesc] = useState('');
  const [gbItemAmount, setGbItemAmount] = useState('');
  const [gbItemCategory, setGbItemCategory] = useState<CategoryType>('shopping');

  const isPersonal = expenseType === 'personal';
  const isGroupBuy = expenseType === 'groupBuy';

  function toggleSplit(id: string) {
    setSplitAmong(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  // ── GroupBuy handlers ───────────────────────────────────────
  function handleAddGbItem() {
    if (!gbItemMemberId) { showToast('error', t.groupBuy.selectMember); return; }
    if (!gbItemDesc.trim()) { showToast('error', t.groupBuy.itemDescription); return; }
    const parsed = parseAmountInput(gbItemAmount, currency);
    if (!parsed || parsed <= 0) { showToast('error', t.groupBuy.itemAmount); return; }
    setGbItems(prev => [...prev, {
      memberId: gbItemMemberId,
      description: gbItemDesc.trim(),
      amount: parsed,
      category: gbItemCategory,
    }]);
    setGbItemMemberId('');
    setGbItemDesc('');
    setGbItemAmount('');
    setGbItemCategory('shopping');
    setShowGbAddItem(false);
  }

  function removeGbItem(idx: number) {
    setGbItems(prev => prev.filter((_, i) => i !== idx));
  }

  function handleSave() {
    // iOS Safari can emit a delayed ghost click near the bottom action area
    // right after tapping payer avatars; ignore that accidental submit.
    if (Date.now() - lastPayerTapRef.current < 350) return;

    // ── GroupBuy submit ──────────────────────────────────────
    if (isGroupBuy) {
      if (!gbTitle.trim()) { showToast('error', t.groupBuy.titleLabel); return; }
      if (!gbPayerId) { showToast('error', t.groupBuy.selectPayer); return; }
      if (gbItems.length === 0) { showToast('error', t.groupBuy.noItems); return; }
      const uniq = new Set(gbItems.map(i => i.memberId));
      const hasMultiple = uniq.size >= 2
        || (uniq.size === 1 && gbPayerId && !uniq.has(gbPayerId));
      if (!hasMultiple) { showToast('error', t.groupBuy.needMinTwoItems); return; }
      const settlements: Record<string, boolean> = {};
      gbItems.forEach(i => {
        if (i.memberId !== gbPayerId) settlements[i.memberId] = false;
      });
      addGroupBuy({
        title: gbTitle.trim(),
        payerId: gbPayerId,
        items: gbItems,
        date,
        settlements,
      });
      showToast('success', t.groupBuy.created);
      navigate(-1);
      return;
    }

    const amt = parseAmountInput(amount, currency);
    if (amt === null || amt <= 0 || !description.trim()) {
      showToast('error', t.addExpense.errorRequired);
      return;
    }

    if (isPersonal) {
      // Personal expense mode
      if (!personalFor) {
        showToast('error', t.addExpense.errorRequired);
        return;
      }
      if (isEditPersonal && editPersonalExp) {
        updatePersonalExpense(personalFor, {
          ...editPersonalExp,
          amount: amt,
          description: description.trim(),
          category,
          date,
          visibility: editPersonalExp.visibility ?? 'private',
        });
        showToast('success', t.addExpense.updatedExpense);
      } else {
        addPersonalExpense(personalFor, {
          id: `pe_${Date.now()}`,
          amount: amt,
          description: description.trim(),
          category,
          date,
          visibility: 'private',
        });
        showToast('success', t.addExpense.addedPersonal);
      }
      navigate(-1);
      return;
    }

    // Group expense mode
    if (splitAmong.length === 0) {
      showToast('error', t.addExpense.errorRequired);
      return;
    }
    if (paidBy === FUND_PAYER_ID && amt > fundBalance) {
      showToast('info', t.addExpense.fundOverdraft);
    }
    if (isEdit && editExpense) {
      updateExpense({
        ...editExpense,
        amount: amt,
        description: description.trim(),
        category,
        paidBy,
        splitAmong,
        date,
      });
      showToast('success', t.addExpense.updatedExpense);
    } else {
      addExpense({
        id: `e_${Date.now()}`,
        amount: amt,
        description: description.trim(),
        category,
        paidBy,
        splitAmong,
        date,
      });
      showToast('success', t.addExpense.addedExpense);
    }
    navigate(-1);
  }

  const parsedAmount = parseAmountInput(amount, currency);
  const splitCount = splitAmong.length;
  const perPersonBase = parsedAmount !== null && splitCount > 0
    ? Math.floor(parsedAmount / splitCount)
    : 0;
  const perPersonRemainder = parsedAmount !== null && splitCount > 0
    ? parsedAmount % splitCount
    : 0;
  const amountStep = getCurrencyMinorDigits(currency) === 0 ? '1' : '0.01';

  // GroupBuy settlement preview
  const gbTotal = gbItems.reduce((s, i) => s + i.amount, 0);
  const gbPayerTotal = gbItems.filter(i => i.memberId === gbPayerId).reduce((s, i) => s + i.amount, 0);
  const gbDebtors = gbItems
    .filter(i => i.memberId !== gbPayerId)
    .reduce((acc, i) => { acc[i.memberId] = (acc[i.memberId] || 0) + i.amount; return acc; }, {} as Record<string, number>);
  const gbPayerMember = gbPayerId ? getMember(gbPayerId) : undefined;
  const gbUniq = new Set(gbItems.map(i => i.memberId));
  const gbCanSubmit = !!(gbTitle.trim() && gbPayerId && gbItems.length > 0
    && (gbUniq.size >= 2 || (gbUniq.size === 1 && gbPayerId && !gbUniq.has(gbPayerId))));

  const vpHeight = useVisualViewportHeight();
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleInputFocus = () => {
    setTimeout(() => {
      const el = document.activeElement as HTMLElement | null;
      if (el && scrollRef.current) {
        const elRect = el.getBoundingClientRect();
        const containerRect = scrollRef.current.getBoundingClientRect();
        // Only scroll if the input is outside the visible container area
        if (elRect.top < containerRect.top || elRect.bottom > containerRect.bottom) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      // Prevent iOS window-level scroll from sticking on fixed overlay
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
      <div className="shrink-0 bg-sidebar px-4 pt-header pb-4 border-b border-border flex items-center justify-between lg:pt-6">
        <h1 className="text-lg font-black text-foreground">{isEdit || isEditPersonal ? t.addExpense.titleEdit : t.addExpense.titleNew}</h1>
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground active:scale-90 transition-transform"
        >
          <X size={16} strokeWidth={2} />
        </button>
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <StaggerContainer className="max-w-lg mx-auto px-4 py-5 space-y-4">

          {/* Type toggle: group / personal (hide during edit) */}
          {!isEdit && !isEditPersonal && (
            <StaggerItem>
            <div className="flex gap-1 bg-secondary rounded-xl p-1">
              <button
                onClick={() => setExpenseType('group')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 transition-colors
                  ${expenseType === 'group'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground'
                  }`}
              >
                <Wallet size={14} strokeWidth={2} />
                {t.addExpense.typeGroup}
              </button>
              <button
                onClick={() => setExpenseType('personal')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 transition-colors
                  ${isPersonal
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground'
                  }`}
              >
                <Lock size={14} strokeWidth={2} />
                {t.addExpense.typePersonal}
              </button>
              <button
                onClick={() => setExpenseType('groupBuy')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 transition-colors
                  ${isGroupBuy
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground'
                  }`}
              >
                <ShoppingBag size={14} strokeWidth={2} />
                {t.groupBuy.title}
              </button>
            </div>
            </StaggerItem>
          )}

          {!isGroupBuy && (<>
          {/* Amount */}
          <StaggerItem>
          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">{t.addExpense.enterAmount}</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-3xl text-subtle font-bold">{currency}</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                onFocus={handleInputFocus}
                placeholder="0"
                min="0"
                step={amountStep}
                className="text-5xl font-black text-foreground bg-transparent outline-none w-48 text-center tabular-nums placeholder:text-border"
                inputMode="decimal"
              />
            </div>
            {!isPersonal && parsedAmount !== null && parsedAmount > 0 && splitCount > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                {perPersonRemainder === 0
                  ? t.addExpense.perPersonCalc(fmt(perPersonBase))
                  : t.addExpense.perPersonCalc(fmt(perPersonBase), fmt(perPersonBase + 1))}
              </p>
            )}
          </div>
          </StaggerItem>

          {/* Description */}
          <StaggerItem>
          <div className="bg-card border border-border rounded-2xl p-4">
            <label className="block text-xs text-muted-foreground mb-2">{t.addExpense.description}</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              onFocus={handleInputFocus}
              placeholder={t.addExpense.descriptionPlaceholder}
              className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 border border-border transition-all placeholder:text-subtle"
            />
          </div>
          </StaggerItem>

          {/* Category */}
          <StaggerItem>
          <div className="bg-card border border-border rounded-2xl p-4">
            <label className="block text-xs text-muted-foreground mb-3">{t.addExpense.category}</label>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {CATEGORIES.map(cat => (
                <CategoryBadge
                  key={cat}
                  category={cat}
                  selected={category === cat}
                  onClick={() => setCategory(cat)}
                />
              ))}
            </div>
          </div>
          </StaggerItem>
          </>)}

          {/* ── Group-only sections ─────────────────────────── */}
          {expenseType === 'group' && (
            <>
              {/* Paid by */}
              <StaggerItem>
              <div className="bg-card border border-border rounded-2xl p-4">
                <label className="block text-xs text-muted-foreground mb-3">{t.addExpense.paidBy}</label>
                <div className="flex gap-3 flex-wrap">
                  {/* Fund option */}
                  <div className="flex flex-col items-center gap-1">
                    <div className={`p-0.5 rounded-full transition-all ${paidBy === FUND_PAYER_ID ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : ''}`}>
                      <button
                        onClick={() => {
                          lastPayerTapRef.current = Date.now();
                          setPaidBy(FUND_PAYER_ID);
                        }}
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white select-none cursor-pointer active:scale-95 transition-transform"
                        style={{ background: '#C8914A' }}
                      >
                        <Wallet size={18} strokeWidth={2} />
                      </button>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{t.addExpense.fundDeduct}</span>
                    <span className={`text-[9px] tabular-nums ${fundBalance < 0 ? 'text-destructive' : 'text-subtle'}`}>{fmt(fundBalance)}</span>
                  </div>
                  {/* Members */}
                  {members.map(m => (
                    <div key={m.id} className="flex flex-col items-center gap-1">
                      <div className={`p-0.5 rounded-full transition-all ${paidBy === m.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : ''}`}>
                        <MemberAvatar
                          member={m}
                          size="md"
                          onClick={() => {
                            lastPayerTapRef.current = Date.now();
                            setPaidBy(m.id);
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{m.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              </StaggerItem>

              {/* Split among */}
              <StaggerItem>
              <div className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs text-muted-foreground">{t.addExpense.participants}</label>
                  <button
                    onClick={() => setSplitAmong(
                      splitAmong.length === members.length ? [] : members.map(m => m.id)
                    )}
                    className={`text-xs px-3 py-1 rounded-full font-medium transition-all
                      ${splitAmong.length === members.length
                        ? 'bg-primary text-white'
                        : 'bg-accent-bg text-primary'
                      }`}
                  >
                    {splitAmong.length === members.length ? t.addExpense.deselectAll : t.addExpense.selectAll}
                  </button>
                </div>
                <div className="flex gap-3 flex-wrap">
                  {members.map(m => (
                    <div key={m.id} className="flex flex-col items-center gap-1">
                      <MemberAvatar
                        member={m}
                        size="md"
                        checked={splitAmong.includes(m.id)}
                        onClick={() => toggleSplit(m.id)}
                      />
                      <span className="text-[10px] text-muted-foreground">{m.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              </StaggerItem>
            </>
          )}

          {/* ── Personal-only sections ─────────────────────── */}
          {isPersonal && (
            <>
              {/* For which member */}
              <StaggerItem>
              <div className="bg-card border border-border rounded-2xl p-4">
                <label className="block text-xs text-muted-foreground mb-3">{t.addExpense.forMember}</label>
                <div className="flex gap-3 flex-wrap">
                  {members.map(m => (
                    <div key={m.id} className="flex flex-col items-center gap-1">
                      <div className={`p-0.5 rounded-full transition-all ${personalFor === m.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : ''}`}>
                        <MemberAvatar
                          member={m}
                          size="md"
                          onClick={() => setPersonalFor(m.id)}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{m.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              </StaggerItem>
            </>
          )}

          {/* ── GroupBuy-only sections ─────────────────────── */}
          {isGroupBuy && (
            <>
              {/* GroupBuy Title */}
              <StaggerItem>
                <div className="bg-card border border-border rounded-2xl p-4">
                  <label className="block text-xs text-muted-foreground mb-2">{t.groupBuy.titleLabel}</label>
                  <input
                    value={gbTitle}
                    onChange={e => setGbTitle(e.target.value)}
                    onFocus={handleInputFocus}
                    placeholder={t.groupBuy.titlePlaceholder}
                    className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 border border-border transition-all placeholder:text-subtle"
                  />
                </div>
              </StaggerItem>

              {/* GroupBuy Payer */}
              <StaggerItem>
                <div className="bg-card border border-border rounded-2xl p-4">
                  <label className="block text-xs text-muted-foreground mb-3">{t.groupBuy.payer}</label>
                  <div className="flex gap-3 flex-wrap">
                    {members.map(m => (
                      <div key={m.id} className="flex flex-col items-center gap-1">
                        <div className={`p-0.5 rounded-full transition-all ${gbPayerId === m.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : ''}`}>
                          <MemberAvatar
                            member={m}
                            size="md"
                            onClick={() => setGbPayerId(m.id)}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{m.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </StaggerItem>

              {/* GroupBuy Items */}
              <StaggerItem>
                <div className="bg-card border border-border rounded-2xl p-4">
                  <label className="block text-xs text-muted-foreground mb-3">{t.groupBuy.items}</label>

                  {gbItems.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {gbItems.map((item, idx) => {
                        const m = getMember(item.memberId);
                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2.5 bg-secondary rounded-xl px-3 py-2.5 border border-border"
                          >
                            <CategoryIcon category={item.category} size="sm" />
                            {m && <MemberAvatar member={m} size="sm" />}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{item.description}</p>
                              <p className="text-[10px] text-muted-foreground">{m?.name}</p>
                            </div>
                            <span className="text-sm font-bold text-foreground tabular-nums whitespace-nowrap">{fmt(item.amount)}</span>
                            <button
                              onClick={() => removeGbItem(idx)}
                              className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center text-destructive flex-shrink-0 active:scale-90 transition-transform"
                            >
                              <X size={12} strokeWidth={2.5} />
                            </button>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}

                  <AnimatePresence mode="wait">
                    {!showGbAddItem ? (
                      <motion.button
                        key="gb-add-btn"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowGbAddItem(true)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors active:scale-98"
                      >
                        <Plus size={16} strokeWidth={2} />
                        {t.groupBuy.addItem}
                      </motion.button>
                    ) : (
                      <motion.div
                        key="gb-add-form"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 bg-secondary/50 rounded-xl p-3 border border-border overflow-hidden"
                      >
                        <div>
                          <label className="block text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">{t.groupBuy.selectMember}</label>
                          <div className="flex gap-2 flex-wrap">
                            {members.map(m => (
                              <div key={m.id} className="flex flex-col items-center gap-0.5">
                                <div className={`p-0.5 rounded-full transition-all ${gbItemMemberId === m.id ? 'ring-2 ring-primary ring-offset-1 ring-offset-card' : ''}`}>
                                  <MemberAvatar
                                    member={m}
                                    size="sm"
                                    onClick={() => setGbItemMemberId(m.id)}
                                  />
                                </div>
                                <span className="text-[9px] text-muted-foreground">{m.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">{t.groupBuy.itemDescription}</label>
                          <input
                            value={gbItemDesc}
                            onChange={e => setGbItemDesc(e.target.value)}
                            onFocus={handleInputFocus}
                            placeholder={t.groupBuy.itemDescPlaceholder}
                            className="w-full bg-card rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 border border-border placeholder:text-subtle"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">{t.groupBuy.itemAmount}</label>
                          <div className="flex items-center gap-2 bg-card rounded-lg px-3 py-2 border border-border">
                            <span className="text-sm text-subtle font-bold">{currency}</span>
                            <input
                              type="number"
                              value={gbItemAmount}
                              onChange={e => setGbItemAmount(e.target.value)}
                              onFocus={handleInputFocus}
                              placeholder="0"
                              min="0"
                              step={amountStep}
                              className="flex-1 bg-transparent text-sm text-foreground outline-none tabular-nums placeholder:text-border"
                              inputMode="decimal"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">{t.groupBuy.itemCategory}</label>
                          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                            {CATEGORIES.map(cat => (
                              <CategoryBadge
                                key={cat}
                                category={cat}
                                selected={gbItemCategory === cat}
                                onClick={() => setGbItemCategory(cat)}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setShowGbAddItem(false);
                              setGbItemMemberId('');
                              setGbItemDesc('');
                              setGbItemAmount('');
                              setGbItemCategory('shopping');
                            }}
                            className="flex-1 py-2 rounded-lg text-sm font-medium text-muted-foreground bg-secondary border border-border active:scale-98 transition-transform"
                          >
                            {t.common.cancel}
                          </button>
                          <button
                            onClick={handleAddGbItem}
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

              {/* GroupBuy Settlement Preview */}
              {gbItems.length > 0 && gbPayerId && (
                <StaggerItem>
                  <div className="bg-card border border-border rounded-2xl p-4">
                    <label className="block text-xs text-muted-foreground mb-3">{t.groupBuy.settlementPreview}</label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t.groupBuy.total}</span>
                        <span className="font-bold text-foreground tabular-nums">{fmt(gbTotal)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {gbPayerMember?.name} {t.groupBuy.payerSelf}
                        </span>
                        <span className="font-bold text-foreground tabular-nums">{fmt(gbPayerTotal)}</span>
                      </div>
                      {Object.keys(gbDebtors).length > 0 && (
                        <div className="border-t border-border my-1" />
                      )}
                      {Object.entries(gbDebtors).map(([mid, amt]) => {
                        const debtor = getMember(mid);
                        return (
                          <div key={mid} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              {debtor && <MemberAvatar member={debtor} size="sm" />}
                              <span className="text-foreground">
                                {t.groupBuy.owes(debtor?.name ?? mid, gbPayerMember?.name ?? '', fmt(amt))}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </StaggerItem>
              )}

              {/* GroupBuy Date */}
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
            </>
          )}

          {/* Date (group/personal only) */}
          {!isGroupBuy && (
          <StaggerItem>
          <div className="bg-card border border-border rounded-2xl p-4">
            <label className="block text-xs text-muted-foreground mb-2">{t.addExpense.date}</label>
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
          )}

          {/* ── Save Button ─────────────────────────────────────────── */}
          <StaggerItem>
            <button
              onClick={handleSave}
              disabled={isGroupBuy && !gbCanSubmit}
              className={`w-full rounded-xl py-3.5 font-bold flex items-center justify-center gap-2 transition-all active:scale-98
                ${isGroupBuy && !gbCanSubmit
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25'
                }`}
            >
              {isGroupBuy ? <ShoppingBag size={18} strokeWidth={2.5} /> : <Check size={18} strokeWidth={2.5} />}
              {isGroupBuy ? t.groupBuy.confirm : (isEdit || isEditPersonal ? t.addExpense.saveEdit : t.addExpense.saveNew)}
            </button>
          </StaggerItem>

          <div className="h-[max(env(safe-area-inset-bottom,0px),16px)]" />
        </StaggerContainer>
      </div>
    </motion.div>
  );
}
