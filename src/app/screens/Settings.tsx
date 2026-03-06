import React, { useState, useRef, useCallback } from 'react';
import {
  ChevronRight, Bell, Globe,
  Download, FileText, Trash2, Info, MessageSquare,
  Pencil, Palette, Check, Link2, Copy,
  Users, LogOut, Plus,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useT } from '../i18n/I18nContext';
import { useNavigate } from 'react-router';
import { CATEGORY_CONFIG, FUND_PAYER_ID, formatAmountInput } from '../data/sampleData';
import { StaggerContainer, StaggerItem } from '../components/SharedComponents';
import { PdfReport } from '../components/PdfReport';
import { useAppPaths } from '../routing/appPaths';

interface SettingRow {
  label: string;
  value?: string;
  icon?: React.ReactNode;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: () => void;
  danger?: boolean;
  onClick?: () => void;
}

function SettingItem({ label, value, toggle, toggleValue, onToggle, danger, onClick, icon }: SettingRow) {
  return (
    <button
      onClick={onClick || onToggle}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary active:bg-secondary transition-colors"
    >
      {icon && <span className="text-muted-foreground w-4 flex-shrink-0">{icon}</span>}
      <span className={`flex-1 text-sm ${danger ? 'text-destructive' : 'text-foreground'}`}>{label}</span>
      {toggle !== undefined ? (
        <div
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0
            ${toggleValue ? 'bg-primary' : 'bg-switch-background'}`}
        >
          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
            ${toggleValue ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
        </div>
      ) : value ? (
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">{value}</span>
          {onClick && <ChevronRight size={14} className="text-subtle" strokeWidth={2} />}
        </div>
      ) : (
        !danger && onClick && <ChevronRight size={14} className="text-subtle" strokeWidth={2} />
      )}
    </button>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-subtle uppercase tracking-wider px-1 mb-2">{title}</p>
      <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
        {children}
      </div>
    </div>
  );
}

const CURRENCY_CODES = ['¥', '$', 'HK$', '€', '£', 'NT$', 'RM', 'S$', '₩', '฿'] as const;

const SYMBOL_TO_ISO: Record<string, string> = {
  '¥': 'JPY', '$': 'USD', 'HK$': 'HKD', '€': 'EUR',
  '£': 'GBP', 'NT$': 'TWD', 'RM': 'MYR', 'S$': 'SGD',
  '₩': 'KRW', '฿': 'THB',
};

const CURRENCY_LABEL_KEYS: Record<string, string> = {
  '¥': 'currJPY',
  '$': 'currUSD',
  'HK$': 'currHKD',
  '€': 'currEUR',
  '£': 'currGBP',
  'NT$': 'currTWD',
  'RM': 'currMYR',
  'S$': 'currSGD',
  '₩': 'currKRW',
  '฿': 'currTHB',
};

export function Settings() {
  const navigate = useNavigate();
  const { appPath, entryPath } = useAppPaths();
  const { t, locale, setLocale } = useT();
  const {
    groupName, setGroupName,
    currency, setCurrency, convertCurrency, showToast,
    clearAllExpenses, expenses, members,
    notifications, toggleNotifications,
    totalContributions,
    fmt,
    groupId, demoMode,
    savedGroups, switchGroup, leaveCurrentGroup,
  } = useApp();

  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(groupName);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [pendingCurrency, setPendingCurrency] = useState<string | null>(null);
  const [pendingRate, setPendingRate] = useState<number | null>(null);
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [connectId, setConnectId] = useState('');
  const [showPdfReport, setShowPdfReport] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const currencies = CURRENCY_CODES.map(code => ({
    code,
    label: t.settings[CURRENCY_LABEL_KEYS[code] as keyof typeof t.settings] as string,
  }));

  async function handleCurrencySelect(symbol: string) {
    if (symbol === currency) {
      setShowCurrencyPicker(false);
      return;
    }
    const fromISO = SYMBOL_TO_ISO[currency];
    const toISO = SYMBOL_TO_ISO[symbol];
    if (!fromISO || !toISO) {
      setCurrency(symbol);
      setShowCurrencyPicker(false);
      showToast('success', `${t.settings.currencyChanged} ${symbol}`);
      return;
    }
    setIsFetchingRate(true);
    try {
      const res = await fetch(`https://api.frankfurter.app/latest?from=${fromISO}&to=${toISO}`);
      const data = await res.json();
      const rate: number = data.rates?.[toISO];
      if (!rate) throw new Error('no rate');
      setPendingCurrency(symbol);
      setPendingRate(rate);
    } catch {
      showToast('error', t.settings.fetchRateFailed);
      setCurrency(symbol);
      setShowCurrencyPicker(false);
      showToast('success', `${t.settings.currencyChanged} ${symbol}`);
    } finally {
      setIsFetchingRate(false);
    }
  }

  async function handleConvert() {
    if (!pendingCurrency || pendingRate === null) return;
    setIsConverting(true);
    try {
      await convertCurrency(pendingCurrency, pendingRate);
      showToast('success', t.settings.convertSuccess);
    } catch {
      showToast('error', t.settings.fetchRateFailed);
    } finally {
      setIsConverting(false);
      setPendingCurrency(null);
      setPendingRate(null);
      setShowCurrencyPicker(false);
    }
  }

  function handleSymbolOnly() {
    if (!pendingCurrency) return;
    setCurrency(pendingCurrency);
    showToast('success', `${t.settings.currencyChanged} ${pendingCurrency}`);
    setPendingCurrency(null);
    setPendingRate(null);
    setShowCurrencyPicker(false);
  }

  function confirmName() {
    if (tempName.trim()) {
      setGroupName(tempName.trim());
    }
    setEditingName(false);
  }

  function exportCSV() {
    if (expenses.length === 0) {
      showToast('info', t.settings.csvNoData);
      return;
    }
    const header = `${t.settings.csvDate},${t.settings.csvDescription},${t.settings.csvCategory},${t.settings.csvAmount},${t.settings.csvPayer},${t.settings.csvSplitCount}\n`;
    const rows = expenses.map(e => {
      const payer = e.paidBy === FUND_PAYER_ID ? t.common.fundDeduct : (members.find(m => m.id === e.paidBy)?.name ?? '');
      const catLabel = CATEGORY_CONFIG[e.category]?.label ?? e.category;
      const majorAmount = formatAmountInput(e.amount, currency);
      return `${e.date},"${e.description}",${catLabel},${majorAmount},"${payer}",${e.splitAmong.length}`;
    }).join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${groupName}-expenses.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('success', t.settings.csvExported);
  }

  const exportPDF = useCallback(async () => {
    setPdfExporting(true);
    setShowPdfReport(true);
    // Wait for React to render the hidden report
    await new Promise(r => setTimeout(r, 300));
    try {
      const el = pdfRef.current;
      if (!el) throw new Error('PDF element not found');

      // Use blob URL + iframe print — avoids html2canvas entirely
      // (html2canvas can't parse Tailwind v4's oklch()/color() CSS functions)
      const html = `<!DOCTYPE html><html><head>
        <meta charset="utf-8">
        <title>${groupName}-report</title>
        <style>
          *{box-sizing:border-box;margin:0;padding:0;}
          body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Hiragino Sans",sans-serif;background:#fff;color:#111;}
          @media print{@page{size:A4;margin:8mm 0;}body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
        </style>
      </head><body>${el.outerHTML}</body></html>`;

      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const printFrame = document.createElement('iframe');
      printFrame.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;border:none;';
      printFrame.src = url;
      document.body.appendChild(printFrame);

      await new Promise<void>(r => { printFrame.onload = () => r(); });
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();

      setTimeout(() => {
        document.body.removeChild(printFrame);
        URL.revokeObjectURL(url);
      }, 2000);

      showToast('success', t.settings.pdfHint);
    } catch (err) {
      console.error('PDF export failed:', err);
      showToast('error', 'PDF export failed');
    } finally {
      setShowPdfReport(false);
      setPdfExporting(false);
    }
  }, [groupName, showToast, t]);

  function handleClearAll() {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    clearAllExpenses();
    showToast('success', t.settings.clearedAll);
    setConfirmClear(false);
  }

  return (
    <div className="bg-transparent min-h-screen w-full overflow-x-hidden">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="bg-sidebar px-4 pt-header pb-4 border-b border-border lg:pt-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-black text-foreground">{t.settings.title}</h1>
        </div>
      </div>

      <StaggerContainer className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {/* ── Profile Section ─────────────────────────────────────── */}
        <StaggerItem>
        <div
          className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 active:bg-secondary transition-colors cursor-pointer"
          onClick={() => { setTempName(groupName); setEditingName(true); }}
        >
          <img src={`${import.meta.env.BASE_URL}icon-dark.svg`} alt="app icon" className="w-14 h-14 rounded-2xl flex-shrink-0 shadow-lg shadow-primary/20" />
          <div className="flex-1 min-w-0">
            <p className="font-black text-foreground truncate">{groupName}</p>
            <p className="text-xs text-muted-foreground">{t.settings.memberCount(members.length, fmt(totalContributions))}</p>
          </div>
          <ChevronRight size={16} className="text-subtle flex-shrink-0" strokeWidth={2} />
        </div>
        </StaggerItem>

        {/* ── Group Settings ───────────────────────────────────────── */}
        <StaggerItem>
        <SectionCard title={t.settings.sectionGroup}>
          {editingName ? (
            <div className="flex items-center gap-3 px-4 py-3.5">
              <span className="text-muted-foreground w-4 flex-shrink-0"><Pencil size={14} strokeWidth={2} /></span>
              <span className="text-sm text-foreground flex-shrink-0">{t.settings.groupName}</span>
              <input
                autoFocus
                value={tempName}
                onChange={e => setTempName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') confirmName(); }}
                onBlur={confirmName}
                className="flex-1 bg-secondary rounded-lg px-2 py-1 text-sm text-foreground outline-none border border-primary min-w-0"
              />
            </div>
          ) : (
            <SettingItem
              label={t.settings.groupName}
              value={groupName}
              icon={<Pencil size={14} strokeWidth={2} />}
              onClick={() => { setTempName(groupName); setEditingName(true); }}
            />
          )}
          <SettingItem
            label={t.settings.currency}
            value={`${currencies.find(c => c.code === currency)?.label.split(' ')[0] ?? ''} ${currency}`}
            icon={<Globe size={14} strokeWidth={2} />}
            onClick={() => setShowCurrencyPicker(v => !v)}
          />
          {showCurrencyPicker && (
            <div className="px-4 py-2 bg-sidebar">
              <div className="grid grid-cols-5 gap-1.5">
                {currencies.map(c => (
                  <button
                    key={c.code}
                    onClick={() => handleCurrencySelect(c.code)}
                    disabled={isFetchingRate}
                    className={`flex items-center justify-center py-2 rounded-xl text-xl transition-colors disabled:opacity-50 ${
                      currency === c.code
                        ? 'bg-accent-bg ring-2 ring-primary'
                        : 'hover:bg-secondary'
                    }`}
                  >
                    {isFetchingRate && pendingCurrency === null ? '…' : c.label.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Currency conversion dialog */}
          {pendingCurrency && pendingRate !== null && (
            <div className="mx-4 mb-3 p-4 bg-accent-bg border border-primary/30 rounded-2xl">
              <p className="text-sm font-bold text-foreground mb-1">{t.settings.convertDialogTitle}</p>
              <p className="text-xs text-muted-foreground mb-3">
                {t.settings.convertDialogRate(
                  SYMBOL_TO_ISO[currency] ?? currency,
                  SYMBOL_TO_ISO[pendingCurrency] ?? pendingCurrency,
                  pendingRate.toFixed(4),
                )}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleConvert}
                  disabled={isConverting}
                  className="flex-1 bg-primary text-white text-xs font-bold py-2 rounded-xl disabled:opacity-50 active:scale-95 transition-transform"
                >
                  {isConverting ? t.settings.converting : t.settings.convertAmounts}
                </button>
                <button
                  onClick={handleSymbolOnly}
                  disabled={isConverting}
                  className="flex-1 bg-secondary border border-border text-xs font-bold py-2 rounded-xl disabled:opacity-50 active:scale-95 transition-transform"
                >
                  {t.settings.symbolOnly}
                </button>
              </div>
            </div>
          )}
        </SectionCard>
        </StaggerItem>

        {/* ── Preferences ─────────────────────────────────────────── */}
        <StaggerItem>
        <SectionCard title={t.settings.sectionPrefs}>
          <SettingItem
            label={t.settings.notifications}
            icon={<Bell size={14} strokeWidth={2} />}
            toggle={true}
            toggleValue={notifications}
            onToggle={toggleNotifications}
          />
          <SettingItem
            label={t.settings.language}
            value={locale === 'zh' ? t.settings.langZh : locale === 'ja' ? t.settings.langJa : t.settings.langEn}
            icon={<Globe size={14} strokeWidth={2} />}
            onClick={() => setShowLangPicker(v => !v)}
          />
          {showLangPicker && (
            <div className="px-4 py-2 bg-sidebar">
              <div className="flex gap-1.5">
                {([['zh', t.settings.langZh], ['ja', t.settings.langJa], ['en', t.settings.langEn]] as const).map(([code, label]) => (
                  <button
                    key={code}
                    onClick={() => { setLocale(code); setShowLangPicker(false); }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      locale === code
                        ? 'bg-primary text-white shadow-md'
                        : 'text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <SettingItem
            label={t.settings.sectionTheme}
            icon={<Palette size={14} strokeWidth={2} />}
            onClick={() => navigate(appPath('/theme'))}
          />
        </SectionCard>
        </StaggerItem>

        {/* ── Data ─────────────────────────────────────────────────── */}
        <StaggerItem>
        <SectionCard title={t.settings.sectionData}>
          <SettingItem
            label={t.settings.exportCSV}
            value={`${expenses.length} ${t.common.items}`}
            icon={<Download size={14} strokeWidth={2} />}
            onClick={exportCSV}
          />
          <SettingItem
            label={pdfExporting ? 'PDF...' : t.settings.exportPDF}
            icon={<FileText size={14} strokeWidth={2} />}
            onClick={pdfExporting ? undefined : exportPDF}
          />
          {confirmClear ? (
            <div className="flex items-center gap-3 px-4 py-3.5">
              <span className="text-muted-foreground w-4 flex-shrink-0"><Trash2 size={14} className="text-destructive" strokeWidth={2} /></span>
              <span className="flex-1 text-sm text-destructive">{t.settings.confirmClear}</span>
              <button
                onClick={handleClearAll}
                className="px-3 py-1.5 bg-destructive text-white text-xs font-bold rounded-lg active:scale-95 transition-transform"
              >
                {t.common.confirm}
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="px-3 py-1.5 bg-secondary text-muted-foreground text-xs font-bold rounded-lg active:scale-95 transition-transform"
              >
                {t.common.cancel}
              </button>
            </div>
          ) : (
            <SettingItem
              label={t.settings.clearAll}
              icon={<Trash2 size={14} className="text-destructive" strokeWidth={2} />}
              danger={true}
              onClick={handleClearAll}
            />
          )}
        </SectionCard>
        </StaggerItem>

        {/* ── Sync / Share ─────────────────────────────────────────── */}
        <StaggerItem>
        <SectionCard title={t.settings.sectionSync}>
          {!demoMode && groupId ? (
            <div className="px-4 py-3.5">
              <div className="flex items-center gap-3 mb-2">
                <Link2 size={14} className="text-muted-foreground flex-shrink-0" strokeWidth={2} />
                <span className="text-sm text-foreground">{t.settings.groupId}</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-secondary rounded-lg px-3 py-2 text-xs text-muted-foreground font-mono truncate select-all">
                  {groupId}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(groupId).then(() => {
                      showToast('success', t.settings.groupIdCopied);
                    }).catch(() => {
                      showToast('error', t.settings.copyFailedManual);
                    });
                  }}
                  className="p-2 bg-secondary rounded-lg text-muted-foreground hover:text-foreground active:scale-95 transition-all flex-shrink-0"
                >
                  <Copy size={14} strokeWidth={2} />
                </button>
              </div>
              <p className="text-[10px] text-subtle mt-1.5">{t.settings.syncDesc}</p>
            </div>
          ) : (
            <div className="px-4 py-3.5">
              <div className="flex items-center gap-3 mb-2">
                <Link2 size={14} className="text-muted-foreground flex-shrink-0" strokeWidth={2} />
                <span className="text-sm text-foreground">{t.settings.connectGroup}</span>
              </div>
              <p className="text-[10px] text-subtle mb-2">{t.settings.connectDesc}</p>
              <div className="flex items-center gap-2">
                <input
                  value={connectId}
                  onChange={e => setConnectId(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && connectId.trim()) {
                      localStorage.setItem('gcd-groupId', connectId.trim());
                      window.location.reload();
                    }
                  }}
                  placeholder={t.settings.connectPlaceholder}
                  className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-primary transition-colors placeholder:text-subtle font-mono min-w-0"
                />
                <button
                  onClick={() => {
                    if (!connectId.trim()) {
                      showToast('info', t.settings.enterGroupId);
                      return;
                    }
                    localStorage.setItem('gcd-groupId', connectId.trim());
                    window.location.reload();
                  }}
                  className="px-3 py-2 bg-primary text-white text-xs font-bold rounded-lg active:scale-95 transition-transform flex-shrink-0"
                >
                  {t.settings.connect}
                </button>
              </div>
            </div>
          )}
        </SectionCard>
        </StaggerItem>

        {/* ── My Groups ─────────────────────────────────────────────── */}
        {!demoMode && (
        <StaggerItem>
        <SectionCard title={t.settings.sectionGroups}>
          {savedGroups.length === 0 ? (
            <div className="px-4 py-4 text-center">
              <p className="text-xs text-subtle">{t.settings.noSavedGroups}</p>
            </div>
          ) : (
            savedGroups.map(g => {
              const isActive = g.id === groupId;
              return (
                <button
                  key={g.id}
                  onClick={() => {
                    if (!isActive) {
                      switchGroup(g.id);
                      showToast('info', t.settings.switchedGroup);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${
                    isActive ? 'bg-accent-bg' : 'hover:bg-secondary active:bg-secondary'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black flex-shrink-0 ${
                    isActive ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'
                  }`}>
                    {g.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${isActive ? 'text-primary font-bold' : 'text-foreground'}`}>
                      {g.name}
                    </p>
                    <p className="text-[10px] text-subtle font-mono truncate">{g.id.slice(0, 12)}…</p>
                  </div>
                  {isActive && (
                    <span className="text-[10px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">
                      {t.settings.currentGroup}
                    </span>
                  )}
                  {!isActive && (
                    <ChevronRight size={14} className="text-subtle flex-shrink-0" strokeWidth={2} />
                  )}
                </button>
              );
            })
          )}
          {/* Create / Join shortcuts */}
          <div className="flex gap-2 px-4 py-3">
            <button
              onClick={() => {
                navigate(entryPath(true));
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-secondary hover:bg-secondary/80 rounded-xl text-xs text-muted-foreground font-bold transition-colors active:scale-95"
            >
              <Plus size={13} strokeWidth={2.5} /> {t.settings.createNewGroup}
            </button>
            <button
              onClick={() => {
                navigate(entryPath(true));
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-secondary hover:bg-secondary/80 rounded-xl text-xs text-muted-foreground font-bold transition-colors active:scale-95"
            >
              <Users size={13} strokeWidth={2} /> {t.settings.joinGroupBtn}
            </button>
          </div>
          {/* Leave current group */}
          {groupId && (
            confirmLeave ? (
              <div className="flex items-center gap-3 px-4 py-3.5">
                <span className="text-muted-foreground w-4 flex-shrink-0"><LogOut size={14} className="text-destructive" strokeWidth={2} /></span>
                <span className="flex-1 text-xs text-destructive">{t.settings.confirmLeave}</span>
                <button
                  onClick={() => {
                    leaveCurrentGroup();
                    showToast('success', t.settings.leftGroup);
                  }}
                  className="px-3 py-1.5 bg-destructive text-white text-xs font-bold rounded-lg active:scale-95 transition-transform"
                >
                  {t.common.confirm}
                </button>
                <button
                  onClick={() => setConfirmLeave(false)}
                  className="px-3 py-1.5 bg-secondary text-muted-foreground text-xs font-bold rounded-lg active:scale-95 transition-transform"
                >
                  {t.common.cancel}
                </button>
              </div>
            ) : (
              <SettingItem
                label={t.settings.leaveGroup}
                icon={<LogOut size={14} className="text-destructive" strokeWidth={2} />}
                danger={true}
                onClick={() => setConfirmLeave(true)}
              />
            )
          )}
        </SectionCard>
        </StaggerItem>
        )}

        {/* ── About ────────────────────────────────────────────────── */}
        <StaggerItem>
        <SectionCard title={t.settings.sectionAbout}>
          <SettingItem
            label={t.settings.version}
            value="v1.0.0"
            icon={<Info size={14} strokeWidth={2} />}
          />
          <SettingItem
            label={t.settings.feedback}
            icon={<MessageSquare size={14} strokeWidth={2} />}
            onClick={() => {
              showToast('info', t.settings.feedbackMsg);
            }}
          />
          <SettingItem
            label={t.settings.componentLib}
            icon={<Palette size={14} strokeWidth={2} />}
            onClick={() => navigate('/components')}
          />
        </SectionCard>
        </StaggerItem>

        <StaggerItem>
        <div className="text-center py-4">
          <p className="text-xs text-subtle">{t.nav.appName} v1.0.0</p>
          <p className="text-xs text-subtle mt-0.5">{t.settings.tagline}</p>
        </div>
        </StaggerItem>

        <div className="h-4" />
      </StaggerContainer>

      {/* Hidden PDF report for html2pdf export */}
      {showPdfReport && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1 }}>
          <PdfReport ref={pdfRef} />
        </div>
      )}
    </div>
  );
}
