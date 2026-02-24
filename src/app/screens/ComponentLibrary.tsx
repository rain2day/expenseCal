import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Trash2, X, CheckCircle2, Info, ArrowLeft, Package } from 'lucide-react';
import { motion } from 'motion/react';
import { MEMBERS, CATEGORY_CONFIG, CategoryType, formatJPY } from '../data/sampleData';
import {
  MemberAvatar, AvatarGroup, CategoryBadge, CategoryIcon,
  StatCard, BalanceBadge, RoleBadge, SkeletonRow, EmptyState,
} from '../components/SharedComponents';
import { useApp } from '../context/AppContext';
import { ThemeConfigurator } from '../components/ThemeConfigurator';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-black text-foreground text-lg">{title}</h2>
        <div className="flex-1 h-px bg-switch-background" />
      </div>
      {children}
    </div>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card border border-border rounded-2xl p-4 ${className}`}>
      {children}
    </div>
  );
}

function Label({ text }: { text: string }) {
  return <p className="text-xs text-subtle mb-3 uppercase tracking-wider">{text}</p>;
}

export function ComponentLibrary() {
  const navigate = useNavigate();
  const { showToast, darkMode, toggleDarkMode } = useApp();
  const [selectedCat,  setSelectedCat]  = useState<CategoryType>('food');
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [showEmpty,    setShowEmpty]    = useState<'none' | 'expenses' | 'settled'>('none');

  const CATS = Object.keys(CATEGORY_CONFIG) as CategoryType[];

  return (
    <div className="bg-transparent min-h-screen">
      {/* Header */}
      <div className="bg-sidebar px-4 pt-header pb-4 border-b border-border lg:pt-6">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
            <ArrowLeft size={15} strokeWidth={2} />
          </button>
          <div>
            <h1 className="text-xl font-black text-foreground">元件庫</h1>
            <p className="text-xs text-muted-foreground">公數計算器 設計系統</p>
          </div>
          {/* Dark mode toggle moved into ThemeConfigurator */}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* ── Theme Configurator ─────────────────────────────────── */}
        <Section title="主題設定">
          <ThemeConfigurator />
        </Section>

        {/* ── Buttons ──────────────────────────────────────────────── */}
        <Section title="按鈕">
          <Card>
            <Label text="Button Variants" />
            <div className="flex flex-wrap gap-3">
              <button className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/25 hover:bg-primary/90 transition-colors active:scale-95">
                Primary
              </button>
              <button className="border-2 border-primary text-primary px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-accent-bg transition-colors">
                Secondary
              </button>
              <button className="text-primary px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-accent-bg transition-colors">
                Ghost
              </button>
              <button className="bg-destructive text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-destructive/25">
                Danger
              </button>
              <button className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/25">
                <Plus size={18} strokeWidth={2.5} />
              </button>
              <button className="w-10 h-10 bg-destructive/20 text-destructive rounded-full flex items-center justify-center">
                <Trash2 size={16} strokeWidth={2} />
              </button>
            </div>

            <div className="mt-4">
              <Label text="Button States" />
              <div className="flex flex-wrap gap-3">
                <button className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold opacity-30 cursor-not-allowed">
                  Disabled
                </button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold"
                >
                  Press Me ↓
                </motion.button>
                <button className="bg-success text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2">
                  <CheckCircle2 size={15} strokeWidth={2} /> 成功
                </button>
              </div>
            </div>
          </Card>
        </Section>

        {/* ── Inputs ───────────────────────────────────────────────── */}
        <Section title="輸入欄位">
          <Card className="space-y-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">文字欄位</label>
              <input
                placeholder="支出描述"
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors placeholder:text-subtle"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">金額欄位</label>
              <div className="flex items-center bg-secondary border border-border rounded-xl focus-within:border-primary transition-colors">
                <span className="pl-3 text-muted-foreground font-bold">¥</span>
                <input type="number" placeholder="0" className="flex-1 bg-transparent px-2 py-2.5 text-sm text-foreground outline-none tabular-nums placeholder:text-subtle" />
              </div>
            </div>
          </Card>
        </Section>

        {/* ── Avatars ──────────────────────────────────────────────── */}
        <Section title="頭像">
          <Card>
            <div className="space-y-4">
              <div>
                <Label text="Sizes: S / M / L / XL" />
                <div className="flex items-end gap-4">
                  {(['sm','md','lg','xl'] as const).map(s => (
                    <MemberAvatar key={s} member={MEMBERS[0]} size={s} />
                  ))}
                </div>
              </div>
              <div>
                <Label text="With Checkmark" />
                <div className="flex gap-3">
                  <MemberAvatar member={MEMBERS[0]} size="lg" checked={true} />
                  <MemberAvatar member={MEMBERS[1]} size="lg" checked={false} />
                  <MemberAvatar member={MEMBERS[2]} size="lg" checked={true} />
                </div>
              </div>
              <div>
                <Label text="Avatar Group (Stacked)" />
                <AvatarGroup members={MEMBERS} max={5} />
              </div>
              <div>
                <Label text="All Members" />
                <div className="flex flex-wrap gap-4">
                  {MEMBERS.map(m => (
                    <div key={m.id} className="flex flex-col items-center gap-1">
                      <MemberAvatar member={m} size="lg" />
                      <span className="text-xs text-muted-foreground">{m.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </Section>

        {/* ── Badges ───────────────────────────────────────────────── */}
        <Section title="標籤 / 徽章">
          <Card>
            <div className="space-y-4">
              <div>
                <Label text="Balance Badges" />
                <div className="flex gap-3 flex-wrap">
                  <BalanceBadge amount={5957} />
                  <BalanceBadge amount={-3243} />
                  <BalanceBadge amount={0} />
                </div>
              </div>
              <div>
                <Label text="Role Badges" />
                <div className="flex gap-3">
                  <RoleBadge role="admin" />
                  <RoleBadge role="member" />
                </div>
              </div>
              <div>
                <Label text="Category Badges" />
                <div className="flex flex-wrap gap-2">
                  {CATS.map(cat => (
                    <CategoryBadge
                      key={cat}
                      category={cat}
                      selected={selectedCat === cat}
                      onClick={() => setSelectedCat(cat)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label text="Category Icons" />
                <div className="flex gap-4 flex-wrap">
                  {CATS.map(cat => (
                    <div key={cat} className="flex flex-col items-center gap-1.5">
                      <CategoryIcon category={cat} size="lg" />
                      <span className="text-[10px] text-muted-foreground">{CATEGORY_CONFIG[cat].label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </Section>

        {/* ── Stat Cards ────────────────────────────────────────────── */}
        <Section title="統計卡片">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="總支出"   value={formatJPY(45100)} />
            <StatCard label="人均費用" value={formatJPY(6443)}  accent="#DD843C" />
            <StatCard label="剩餘預算" value={formatJPY(34900)} accent="#72A857" />
            <StatCard label="支出筆數" value="12 筆"             accent="#9055A0" />
          </div>
        </Section>

        {/* ── Toast Notifications ──────────────────────────────────── */}
        <Section title="Toast 通知">
          <Card>
            <Label text="Toast Variants" />
            <div className="space-y-2 mb-4">
              {[
                { color: '#72A857', bg: '#162810', icon: <CheckCircle2 size={15} strokeWidth={2} />, msg: '成功新增支出' },
                { color: '#D05242', bg: '#38100C', icon: <X size={15} strokeWidth={2} />, msg: '無法儲存，請重試' },
                { color: '#DD843C', bg: '#3A1E08', icon: <Info size={15} strokeWidth={2} />, msg: '已同步最新資料' },
              ].map((t, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium" style={{ background: t.bg, color: t.color }}>
                  {t.icon} {t.msg}
                </div>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => showToast('success', '成功新增支出')}   className="px-3 py-1.5 bg-success text-white rounded-lg text-xs font-bold">觸發成功</button>
              <button onClick={() => showToast('error',   '無法儲存，請重試')} className="px-3 py-1.5 bg-destructive text-white rounded-lg text-xs font-bold">觸發錯誤</button>
              <button onClick={() => showToast('info',    '已同步最新資料')}   className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold">觸發提示</button>
            </div>
          </Card>
        </Section>

        {/* ── Skeleton States ──────────────────────────────────────── */}
        <Section title="載入骨架">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <Label text="Skeleton Loading" />
              <button onClick={() => setShowSkeleton(s => !s)} className="text-xs text-primary">
                {showSkeleton ? '隱藏' : '顯示'}
              </button>
            </div>
            {showSkeleton ? (
              <div className="rounded-xl overflow-hidden border border-border">
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </div>
            ) : (
              <p className="text-xs text-subtle">點擊「顯示」查看骨架載入效果</p>
            )}
          </Card>
        </Section>

        {/* ── Empty States ─────────────────────────────────────────── */}
        <Section title="空狀態">
          <Card>
            <div className="flex gap-2 mb-4">
              {[
                { key: 'none',     label: '隱藏' },
                { key: 'expenses', label: '無支出' },
                { key: 'settled',  label: '已結清' },
              ].map(opt => (
                <button key={opt.key}
                  onClick={() => setShowEmpty(opt.key as typeof showEmpty)}
                  className={`px-3 py-1.5 rounded-full text-xs transition-all
                    ${showEmpty === opt.key ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
            {showEmpty === 'expenses' && (
              <EmptyState
                icon={<Package size={28} strokeWidth={1.5} />}
                title="尚無支出紀錄"
                subtitle="點擊下方按鈕新增第一筆支出"
                cta="新增第一筆支出"
                onCta={() => showToast('info', '前往新增支出')}
              />
            )}
            {showEmpty === 'settled' && (
              <EmptyState
                icon={<CheckCircle2 size={28} strokeWidth={1.5} />}
                title="大家都唔欠錢！"
                subtitle="所有結算已完成，盡情享樂吧！"
              />
            )}
            {showEmpty === 'none' && (
              <p className="text-xs text-subtle">選擇空狀態類型預覽</p>
            )}
          </Card>
        </Section>

        <div className="h-8" />
      </div>
    </div>
  );
}
