import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, X, Check, Link2, ChevronLeft, Eye, ArrowLeft } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '../context/AppContext';
import { getCurrencyMinorDigits, parseAmountInput } from '../data/sampleData';
import { useT } from '../i18n/I18nContext';

const MEMBER_COLORS = ['#DD843C','#C05A5A','#72A857','#5A7EC5','#C8914A','#9055A0','#5AABAB','#BD7A5A'];
const CURRENCIES = [
  { code: 'JPY', symbol: '¥',   label: '日圓 (JPY)' },
  { code: 'USD', symbol: '$',   label: '美元 (USD)' },
  { code: 'HKD', symbol: 'HK$', label: '港幣 (HKD)' },
  { code: 'TWD', symbol: 'NT$', label: '台幣 (TWD)' },
  { code: 'EUR', symbol: '€',   label: '歐元 (EUR)' },
  { code: 'GBP', symbol: '£',   label: '英鎊 (GBP)' },
  { code: 'MYR', symbol: 'RM',  label: '馬幣 (MYR)' },
  { code: 'SGD', symbol: 'S$',  label: '新幣 (SGD)' },
  { code: 'KRW', symbol: '₩',   label: '韓圜 (KRW)' },
  { code: 'THB', symbol: '฿',   label: '泰銖 (THB)' },
];

interface TempMember { id: string; name: string; color: string; initials: string; }

function getInitials(name: string) {
  if (!name) return '?';
  const c = name.trim();
  return c.length === 1 ? c : c[0].toUpperCase();
}

export function Onboarding() {
  const navigate = useNavigate();
  const { createGroup, enterDemoMode, showToast, groupId } = useApp();
  const { t, locale } = useT();
  const [searchParams] = useSearchParams();
  const isNewGroupFlow = searchParams.has('new') && !!groupId;
  const preferredSymbol = typeof window !== 'undefined' ? localStorage.getItem('gcd-currency') : null;
  const preferredCode = CURRENCIES.find((c) => c.symbol === preferredSymbol)?.code || 'JPY';

  const [step,         setStep]         = useState(1);
  const [gName,        setGName]        = useState('');
  const [gBudget,      setGBudget]      = useState('');
  const [currency,     setCurrencyLocal] = useState(preferredCode);
  const [memberInput,  setMemberInput]  = useState('');
  const [members,      setMembers]      = useState<TempMember[]>([]);
  const [colorIdx,     setColorIdx]     = useState(0);
  const [isCreating,   setIsCreating]   = useState(false);
  const [createdGroupId, setCreatedGroupId] = useState<string | null>(null);
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joinInput,     setJoinInput]     = useState('');

  function addMember() {
    const name = memberInput.trim();
    if (!name) return;
    const color = MEMBER_COLORS[colorIdx % MEMBER_COLORS.length];
    setMembers(prev => [...prev, { id: Date.now().toString(), name, color, initials: getInitials(name) }]);
    setMemberInput('');
    setColorIdx(i => i + 1);
  }

  function removeMember(id: string) {
    setMembers(prev => prev.filter(m => m.id !== id));
  }

  async function handleNext() {
    if (step === 2 && (!gName.trim() || !gBudget)) return;
    if (step === 3) {
      // Create group before showing share step so we have the groupId for QR
      if (isCreating) return;
      setIsCreating(true);
      try {
        const currSymbol = CURRENCIES.find(c => c.code === currency)?.symbol || '¥';
        const perPersonMinor = parseAmountInput(gBudget, currSymbol);
        if (perPersonMinor === null || perPersonMinor <= 0) {
          showToast('error', t.onboarding.budgetFormatError);
          setIsCreating(false);
          return;
        }
        const gid = await createGroup(
          gName || '核爆都唔割鳩',
          perPersonMinor,
          currSymbol,
          members.map((m, i) => ({
            id: m.id,
            name: m.name,
            initials: m.initials,
            color: m.color,
            role: (i === 0 ? 'admin' : 'member') as 'admin' | 'member',
          }))
        );
        setCreatedGroupId(gid);
        showToast('success', t.onboarding.groupCreated);
        setStep(4);
      } catch (err) {
        console.error('Failed to create group:', err);
        showToast('error', t.onboarding.groupCreateFailed);
      } finally {
        setIsCreating(false);
      }
      return;
    }
    setStep(s => s + 1);
  }

  function handleFinish() {
    navigate('/app/dashboard');
  }

  function handleJoinSubmit() {
    const input = joinInput.trim();
    if (!input) return;
    // If user pasted a full URL, extract the groupId from it
    const urlMatch = input.match(/\/join\/(.+)$/);
    const gid = urlMatch ? urlMatch[1] : input;
    navigate(`/join/${gid}`);
  }

  const currSel = CURRENCIES.find(c => c.code === currency)!;
  const budgetStep = getCurrencyMinorDigits(currSel.symbol) === 0 ? '1' : '0.01';

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(221,132,60,0.12) 0%, transparent 70%)' }} />
      <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(144,85,160,0.10) 0%, transparent 70%)' }} />

      <div className="w-full max-w-sm relative">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {[1,2,3,4].map(i => (
            <div key={i} className={`rounded-full transition-all duration-300
              ${i === step ? 'w-6 h-2 bg-primary' : i < step ? 'w-2 h-2 bg-primary/70' : 'w-2 h-2 bg-switch-background'}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ── Step 1: Welcome ─────────────────────────────────────── */}
          {step === 1 && (
            <motion.div key="s1"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="bg-card border border-border rounded-3xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.5)] text-center"
            >
              <img src={`${import.meta.env.BASE_URL}icon-dark.svg`} alt="app icon" className="w-20 h-20 rounded-3xl mx-auto mb-4 shadow-lg shadow-primary/30" />
              <h1 className="text-2xl font-black text-foreground mb-2">{t.onboarding.appName}</h1>
              <p className="text-muted-foreground text-sm mb-8">{t.onboarding.tagline}</p>

              <button
                onClick={() => setStep(2)}
                className="w-full bg-primary text-white rounded-xl py-3.5 font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/30 hover:bg-primary/90 transition-colors mb-3 active:scale-98"
              >
                {t.onboarding.createGroup} <ArrowRight size={18} strokeWidth={2} />
              </button>
              {showJoinInput ? (
                <div className="space-y-2">
                  <input
                    value={joinInput}
                    onChange={e => setJoinInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleJoinSubmit()}
                    placeholder={t.onboarding.joinPlaceholder}
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors placeholder:text-subtle"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowJoinInput(false)}
                      className="flex-1 text-subtle text-sm py-2 active:opacity-70"
                    >
                      {t.common.cancel}
                    </button>
                    <button
                      onClick={handleJoinSubmit}
                      disabled={!joinInput.trim()}
                      className="flex-1 bg-accent-bg text-primary rounded-xl py-2 text-sm font-bold disabled:opacity-30 active:scale-98 transition-transform"
                    >
                      {t.common.join}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowJoinInput(true)}
                  className="w-full text-primary font-medium text-sm py-2 active:opacity-70"
                >
                  {t.onboarding.joinExisting} →
                </button>
              )}
              <div className="mt-2 pt-3 border-t border-border">
                {isNewGroupFlow ? (
                  <button
                    onClick={() => navigate('/app/dashboard')}
                    className="w-full text-subtle text-xs py-1.5 flex items-center justify-center gap-1.5 active:opacity-70"
                  >
                    <ArrowLeft size={13} strokeWidth={2} /> {t.onboarding.backToGroup}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      enterDemoMode();
                      showToast('info', t.onboarding.demoLoaded);
                      navigate('/app/dashboard');
                    }}
                    className="w-full text-subtle text-xs py-1.5 flex items-center justify-center gap-1.5 active:opacity-70"
                  >
                    <Eye size={13} strokeWidth={2} /> {t.onboarding.demoMode}
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Group Info ──────────────────────────────────── */}
          {step === 2 && (
            <motion.div key="s2"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="bg-card border border-border rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
            >
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setStep(1)} className="text-subtle hover:text-primary transition-colors">
                  <ChevronLeft size={20} strokeWidth={2} />
                </button>
                <h2 className="font-black text-foreground">{t.onboarding.createGroupTitle}</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{t.onboarding.groupNameLabel}</label>
                  <input
                    value={gName}
                    onChange={e => setGName(e.target.value)}
                    placeholder={t.onboarding.groupNamePlaceholder}
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors placeholder:text-subtle"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{t.onboarding.perPersonFund}</label>
                  <div className="flex items-center bg-secondary border border-border rounded-xl focus-within:border-primary transition-colors">
                    <span className="pl-3 text-sm text-muted-foreground">{currSel.symbol}</span>
                    <input
                      type="number"
                      value={gBudget}
                      onChange={e => setGBudget(e.target.value)}
                      placeholder="80000"
                      min="0"
                      step={budgetStep}
                      className="flex-1 bg-transparent px-2 py-2.5 text-sm text-foreground outline-none tabular-nums placeholder:text-subtle"
                    />
                  </div>
                  <p className="text-[10px] text-subtle mt-1">{t.onboarding.perPersonHint}</p>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">{t.onboarding.currencyLabel}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {CURRENCIES.map(c => (
                      <button
                        key={c.code}
                        onClick={() => setCurrencyLocal(c.code)}
                        className={`py-2 px-3 rounded-xl text-sm border transition-all
                          ${currency === c.code
                            ? 'bg-accent-bg border-primary text-primary font-bold'
                            : 'border-border text-muted-foreground bg-secondary'}`}
                      >
                        {c.symbol} {c.code}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleNext}
                disabled={!gName.trim() || !gBudget}
                className="w-full bg-primary disabled:opacity-30 text-white rounded-xl py-3 font-bold mt-6 flex items-center justify-center gap-2 active:scale-98 transition-transform"
              >
                {t.common.next} <ArrowRight size={16} strokeWidth={2} />
              </button>
            </motion.div>
          )}

          {/* ── Step 3: Add Members ─────────────────────────────────── */}
          {step === 3 && (
            <motion.div key="s3"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="bg-card border border-border rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
            >
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setStep(2)} className="text-subtle hover:text-primary transition-colors">
                  <ChevronLeft size={20} strokeWidth={2} />
                </button>
                <h2 className="font-black text-foreground">{t.onboarding.addMembersTitle}</h2>
              </div>

              <div className="flex gap-2 mb-4">
                <input
                  value={memberInput}
                  onChange={e => setMemberInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addMember()}
                  placeholder={t.onboarding.memberNamePlaceholder}
                  className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary placeholder:text-subtle"
                />
                <button
                  onClick={addMember}
                  className="bg-primary text-white px-4 py-2.5 rounded-xl font-bold text-sm active:scale-95 transition-transform"
                >
                  {t.onboarding.addButton}
                </button>
              </div>

              <div className="flex flex-wrap gap-2 min-h-[80px] bg-sidebar border border-border rounded-xl p-3 mb-4">
                {members.length === 0 && (
                  <p className="text-xs text-subtle self-center mx-auto">{t.onboarding.emptyHint}</p>
                )}
                {members.map(m => (
                  <div key={m.id} className="flex items-center gap-1.5 bg-secondary border border-border rounded-full px-2.5 py-1">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: m.color }}>
                      {m.initials}
                    </div>
                    <span className="text-xs text-foreground">{m.name}</span>
                    <button onClick={() => removeMember(m.id)} className="text-subtle hover:text-destructive transition-colors">
                      <X size={12} strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>

              <p className="text-xs text-subtle mb-4 text-center">{t.onboarding.membersAdded(members.length)}</p>

              <button
                onClick={handleNext}
                disabled={isCreating}
                className="w-full bg-primary disabled:opacity-40 text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 active:scale-98 transition-all"
              >
                {isCreating ? (
                  <>{t.onboarding.creating}</>
                ) : (
                  <>{t.common.next} <ArrowRight size={16} strokeWidth={2} /></>
                )}
              </button>
            </motion.div>
          )}

          {/* ── Step 4: Share ───────────────────────────────────────── */}
          {step === 4 && (
            <motion.div key="s4"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="bg-card border border-border rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)] text-center"
            >
              <div className="flex items-center gap-3 mb-6 text-left">
                <button onClick={() => setStep(3)} className="text-subtle hover:text-primary transition-colors">
                  <ChevronLeft size={20} strokeWidth={2} />
                </button>
                <h2 className="font-black text-foreground">{t.onboarding.inviteTitle}</h2>
              </div>

              {(() => {
                const inviteUrl = `${window.location.origin}/join/${createdGroupId || 'demo'}`;
                return (
                  <>
                    <div className="w-40 h-40 bg-foreground/10 rounded-2xl mx-auto mb-4 flex items-center justify-center p-2">
                      <QRCodeSVG value={inviteUrl} size={128} bgColor="#F0DDD0" fgColor="#0E0908" level="M" />
                    </div>

                    <p className="text-xs text-muted-foreground mb-4">{t.onboarding.scanQR}</p>

                    <div className="bg-secondary border border-border rounded-xl px-4 py-2.5 flex items-center gap-2 mb-6 text-left">
                      <Link2 size={14} className="text-muted-foreground flex-shrink-0" strokeWidth={2} />
                      <span className="text-xs text-muted-foreground truncate flex-1">
                        {inviteUrl}
                      </span>
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(inviteUrl);
                            showToast('success', t.onboarding.linkCopied);
                          } catch {
                            showToast('error', t.onboarding.copyFailed);
                          }
                        }}
                        className="text-xs text-primary font-bold flex-shrink-0 active:opacity-70"
                      >
                        {t.common.copy}
                      </button>
                    </div>
                  </>
                );
              })()}

              <button
                onClick={handleFinish}
                className="w-full bg-primary text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/30 active:scale-98 transition-transform"
              >
                <Check size={18} strokeWidth={2.5} /> {t.onboarding.finish}
              </button>
              <button
                onClick={handleFinish}
                className="mt-3 w-full text-subtle text-sm py-2 active:opacity-70"
              >
                {t.onboarding.inviteLater}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
