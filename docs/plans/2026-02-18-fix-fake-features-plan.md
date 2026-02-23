# Fix All Fake Features — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn all 10 mock/placeholder features into real, working functionality with Firebase persistence.

**Architecture:** Existing React app stays as-is. Add Firebase (Firestore + Anonymous Auth) for persistence. Replace mock UI interactions with real implementations. All changes are modifications to existing files + one new firebase config file.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS 4, Firebase 11, Tesseract.js, qrcode.react, Web Share API

---

### Task 1: Install Dependencies & Verify App Runs

**Files:**
- Modify: `package.json`

**Step 1: Install npm dependencies**

Run: `cd /Users/rainsday/Library/CloudStorage/Dropbox/cluade/expsene && npm install`
Expected: All packages install successfully

**Step 2: Start dev server and verify**

Run: `npm run dev`
Expected: Vite dev server starts on localhost

**Step 3: Install new dependencies**

Run: `npm install firebase tesseract.js qrcode.react`
Expected: 3 packages added

**Step 4: Verify app still builds**

Run: `npm run build`
Expected: Build succeeds with no errors

---

### Task 2: Firebase Setup & Config

**Files:**
- Create: `src/app/firebase.ts`

**Step 1: Check Firebase project status**

Use `mcp__plugin_firebase_firebase__firebase_get_environment` to check if a project is already configured.

**Step 2: Create Firebase config file**

Create `src/app/firebase.ts`:

```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = {
  // Will be populated from firebase_get_sdk_config
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export async function ensureAuth(): Promise<string> {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        resolve(user.uid);
      } else {
        const cred = await signInAnonymously(auth);
        resolve(cred.user.uid);
      }
    });
  });
}
```

**Step 3: Initialize Firestore via Firebase MCP**

Use Firebase MCP tools to:
1. Create or select a Firebase project
2. Initialize Firestore
3. Enable Anonymous Auth
4. Get SDK config and populate firebaseConfig

**Step 4: Verify Firebase connection**

Import firebase.ts in main.tsx temporarily, call `ensureAuth()`, check console for success.

---

### Task 3: Data Persistence — Rewrite AppContext for Firestore

**Files:**
- Modify: `src/app/context/AppContext.tsx`
- Modify: `src/app/data/sampleData.ts` (keep types + utilities, remove hardcoded exports as defaults)

**Step 1: Add Firestore CRUD helpers**

Add to AppContext.tsx:
- `loadGroup(groupId)` — reads group doc + subcollections
- `onSnapshot` listeners for expenses, members, settlements
- Replace `useState(EXPENSES)` with `useState<Expense[]>([])` + Firestore listener
- Replace `useState(MEMBERS)` with Firestore listener
- Add loading state: `isLoading: boolean`

**Step 2: Modify all mutation functions**

- `addExpense`: write to `groups/{groupId}/expenses` then update local state via listener
- `deleteExpense`: delete from Firestore
- `updateExpense` (new): update doc in Firestore
- `setGroupName` / `setBudget` / `setCurrency`: update group doc
- `setSettlements` markDone: update settlement doc

**Step 3: Add groupId management**

- Store `groupId` in localStorage
- On app load: if groupId exists → load from Firestore; if not → show onboarding
- New function `createGroup(name, budget, currency, members)` → writes to Firestore, returns groupId

**Step 4: Keep sample data as fallback for "demo mode"**

- "直接查看示範" button still works with hardcoded EXPENSES/MEMBERS
- Set a `demoMode: boolean` flag in context
- In demo mode, skip Firestore reads/writes

**Step 5: Verify**

Run: `npm run build`
Expected: No TypeScript errors

---

### Task 4: Fix Onboarding — Real Group Creation

**Files:**
- Modify: `src/app/screens/Onboarding.tsx`
- Modify: `src/app/context/AppContext.tsx` (add `createGroup`)

**Step 1: Wire up handleFinish to create real Firestore group**

Replace the current `handleFinish()`:
```typescript
async function handleFinish() {
  const groupId = await createGroup(
    gName || '核爆都唔割鳩',
    Number(gBudget) || 80000,
    currSel.symbol,
    members.map((m, i) => ({
      id: m.id,
      name: m.name,
      initials: m.initials,
      color: m.color,
      role: i === 0 ? 'admin' : 'member' as const,
    }))
  );
  localStorage.setItem('gcd-groupId', groupId);
  showToast('success', '群組建立成功！');
  navigate('/app/dashboard');
}
```

**Step 2: Members added in step 3 are now persisted**

The `createGroup` function writes members to Firestore subcollection.

**Step 3: Verify**

Create a new group via onboarding → check Firestore console → data should appear.

---

### Task 5: Fix QR Code — Real Scannable QR

**Files:**
- Modify: `src/app/screens/Onboarding.tsx` (step 4 QR)
- Modify: `src/app/screens/Members.tsx` (invite QR)

**Step 1: Replace fake QR in Onboarding step 4**

Replace the fake grid pattern with:
```tsx
import { QRCodeSVG } from 'qrcode.react';

// In step 4 JSX, replace the grid div:
<QRCodeSVG
  value={`${window.location.origin}/join/${groupId}`}
  size={160}
  bgColor="#F0DDD0"
  fgColor="#0E0908"
  level="M"
/>
```

**Step 2: Replace fake QR in Members.tsx**

Remove the `QR_PATTERN` constant and replace the grid with `QRCodeSVG` using the same invite URL pattern.

**Step 3: Update invite link text**

Replace hardcoded `https://gcd.app/join/abc123` with dynamic `${window.location.origin}/join/${groupId}`.

**Step 4: Fix "Copy" button to actually copy**

Replace toast-only handler with:
```typescript
async function handleCopy() {
  const url = `${window.location.origin}/join/${groupId}`;
  await navigator.clipboard.writeText(url);
  showToast('success', '連結已複製');
}
```

**Step 5: Verify**

QR code should be visually different (real pattern), and scanning with a phone camera should open the invite URL.

---

### Task 6: Fix Join Group Flow

**Files:**
- Create: `src/app/screens/JoinGroup.tsx`
- Modify: `src/app/routes.ts` (add `/join/:groupId` route)
- Modify: `src/app/screens/Onboarding.tsx` (wire "加入現有群組" button)
- Modify: `src/app/context/AppContext.tsx` (add `joinGroup`)

**Step 1: Create JoinGroup screen**

```tsx
// Simple screen: show group name, input for your name, join button
// On join: add self as member to Firestore group, save groupId, navigate to dashboard
```

**Step 2: Add route**

In `routes.ts`, add:
```typescript
{ path: '/join/:groupId', Component: JoinGroup }
```

**Step 3: Wire Onboarding "加入現有群組" button**

Change from toast to: prompt for group ID or link, then navigate to `/join/{groupId}`.
Simplest approach: navigate to a join page that asks for the invite code/link.

**Step 4: Add `joinGroup(groupId, memberData)` to AppContext**

Writes new member doc to `groups/{groupId}/members/`, sets local groupId.

**Step 5: Verify**

Create group on device A → copy invite link → open on device B → join → both see same data.

---

### Task 7: Fix Share Functionality

**Files:**
- Modify: `src/app/screens/Members.tsx`

**Step 1: Replace toast-only share buttons with Web Share API**

Replace the share buttons section:
```tsx
// Single share button using Web Share API
async function handleShare() {
  const url = `${window.location.origin}/join/${groupId}`;
  if (navigator.share) {
    await navigator.share({
      title: `加入「${groupName}」`,
      text: `快啲加入我哋嘅公數群組！`,
      url,
    });
  } else {
    await navigator.clipboard.writeText(url);
    showToast('success', '連結已複製到剪貼板');
  }
}
```

**Step 2: Simplify share UI**

Replace 4 individual platform buttons with one "Share" button (Web Share API shows OS-level share sheet with all apps).

Keep a "Copy Link" fallback button for desktop browsers that don't support Web Share.

**Step 3: Verify**

On mobile: share button opens native share sheet. On desktop: copies link with toast.

---

### Task 8: Fix Expense Edit

**Files:**
- Modify: `src/app/screens/ExpenseHistory.tsx` (wire edit button)
- Modify: `src/app/screens/AddExpense.tsx` (add edit mode)
- Modify: `src/app/context/AppContext.tsx` (add `updateExpense`)

**Step 1: Add `updateExpense` to AppContext**

```typescript
const updateExpense = useCallback(async (exp: Expense) => {
  if (demoMode) {
    setExpenses(prev => prev.map(e => e.id === exp.id ? exp : e));
  } else {
    await updateDoc(doc(db, 'groups', groupId, 'expenses', exp.id), { ...exp });
  }
}, [groupId, demoMode]);
```

Expose it in the context value.

**Step 2: Wire edit button in ExpenseHistory**

```tsx
<button
  onClick={() => navigate('/app/add-expense', { state: { editExpense: exp } })}
  className="bg-[#3A1E08] text-[#DD843C] px-4 flex items-center gap-1 text-xs font-bold"
>
  <Pencil size={14} strokeWidth={2} />編輯
</button>
```

**Step 3: Add edit mode to AddExpense**

```tsx
import { useLocation } from 'react-router';

const location = useLocation();
const editExpense = location.state?.editExpense as Expense | undefined;
const isEdit = !!editExpense;

// Initialize state from editExpense if present:
const [amount, setAmount] = useState(editExpense ? String(editExpense.amount) : '');
const [description, setDescription] = useState(editExpense?.description ?? '');
// ... etc for all fields

// In handleSave:
if (isEdit) {
  updateExpense({ ...editExpense, amount: amt, description, category, paidBy, splitAmong, date });
  showToast('success', '已更新支出');
} else {
  addExpense({ id: `e_${Date.now()}`, amount: amt, ... });
  showToast('success', '成功新增支出');
}
navigate(-1);
```

**Step 4: Update header text**

Change `<h1>` from hardcoded "新增支出" to `{isEdit ? '編輯支出' : '新增支出'}`.

**Step 5: Verify**

Click edit on an expense → form pre-fills → change amount → save → expense list shows updated amount.

---

### Task 9: Fix Settings Page — Real Actions

**Files:**
- Modify: `src/app/screens/Settings.tsx`

**Step 1: Add edit modals for group name, budget, currency**

Add local state for inline editing:
```tsx
const [editingName, setEditingName] = useState(false);
const [editingBudget, setEditingBudget] = useState(false);
const [tempName, setTempName] = useState(groupName);
const [tempBudget, setTempBudget] = useState(String(budget));
```

Replace toast-only `onClick` handlers:
- Group name: toggle `editingName`, show inline input, save on confirm
- Budget: toggle `editingBudget`, show inline number input, save on confirm
- Currency: show a simple selector, update on selection

**Step 2: Implement CSV export**

```typescript
function exportCSV() {
  const header = '日期,描述,類別,金額,支付人,分攤人數\n';
  const rows = expenses.map(e => {
    const payer = members.find(m => m.id === e.paidBy)?.name ?? '';
    return `${e.date},${e.description},${CATEGORY_CONFIG[e.category].label},${e.amount},${payer},${e.splitAmong.length}`;
  }).join('\n');
  const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${groupName}-expenses.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('success', 'CSV 匯出成功');
}
```

**Step 3: Implement PDF export**

```typescript
function exportPDF() {
  window.print();
}
```

Add a `@media print` stylesheet in theme.css for clean print layout.

**Step 4: Implement "Clear all records" with confirmation**

```typescript
function handleClearAll() {
  if (!window.confirm('確定要清除所有紀錄嗎？此操作不可逆！')) return;
  clearAllExpenses(); // new AppContext function that batch-deletes from Firestore
  showToast('success', '所有紀錄已清除');
}
```

**Step 5: Verify**

- Edit group name → check dashboard shows new name
- Export CSV → download .csv file → open in Excel → data correct
- Clear all → expenses list empty

---

### Task 10: Fix Receipt Scan — Real Camera + OCR

**Files:**
- Modify: `src/app/screens/ReceiptScan.tsx`

**Step 1: Add camera access**

Replace fake viewfinder with real `<video>` element:
```tsx
const videoRef = useRef<HTMLVideoElement>(null);
const canvasRef = useRef<HTMLCanvasElement>(null);
const [stream, setStream] = useState<MediaStream | null>(null);

async function startCamera() {
  const s = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
  });
  setStream(s);
  if (videoRef.current) videoRef.current.srcObject = s;
}

function stopCamera() {
  stream?.getTracks().forEach(t => t.stop());
  setStream(null);
}

useEffect(() => { startCamera(); return stopCamera; }, []);
```

**Step 2: Capture frame and run Tesseract.js OCR**

```tsx
import { createWorker } from 'tesseract.js';

async function handleScan() {
  setState('scanning');
  const video = videoRef.current!;
  const canvas = canvasRef.current!;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d')!.drawImage(video, 0, 0);

  const worker = await createWorker('jpn+chi_tra');
  const { data: { text } } = await worker.recognize(canvas);
  await worker.terminate();

  const parsed = parseReceipt(text);
  setResult(parsed);
  setState('result');
}
```

**Step 3: Add receipt text parser**

```typescript
function parseReceipt(text: string): { amount: string; merchant: string; date: string } {
  // Match amounts: look for ¥ followed by digits, or large standalone numbers
  const amountMatch = text.match(/[¥￥]\s*([\d,]+)/);
  const amount = amountMatch ? amountMatch[1].replace(/,/g, '') : '';

  // Match dates: YYYY/MM/DD or YYYY-MM-DD or similar
  const dateMatch = text.match(/(\d{4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})/);
  const date = dateMatch ? `${dateMatch[1]}/${dateMatch[2].padStart(2,'0')}/${dateMatch[3].padStart(2,'0')}` : '';

  // Merchant: first non-empty line that isn't a number
  const lines = text.split('\n').map(l => l.trim()).filter(l => l && !/^[\d¥￥\s,.\-\/]+$/.test(l));
  const merchant = lines[0] || '';

  return { amount, merchant, date };
}
```

**Step 4: Implement upload tab**

```tsx
<input
  type="file"
  accept="image/*"
  capture="environment"
  ref={fileInputRef}
  className="hidden"
  onChange={handleFileUpload}
/>
<button onClick={() => fileInputRef.current?.click()}>選擇相片</button>
```

On file select → read as data URL → create Image → draw to canvas → run Tesseract.

**Step 5: Pass OCR result to AddExpense**

```typescript
function handleConfirm() {
  stopCamera();
  navigate('/app/add-expense', {
    state: {
      editExpense: {
        amount: parseInt(result.amount) || 0,
        description: result.merchant,
        date: result.date?.replace(/\//g, '-') || new Date().toISOString().split('T')[0],
      }
    }
  });
}
```

**Step 6: Verify**

Open scan → point camera at a receipt → tap scan → OCR result shows → confirm → AddExpense pre-fills.

---

### Task 11: Fix Notification Bell

**Files:**
- Modify: `src/app/screens/Dashboard.tsx`
- Modify: `src/app/context/AppContext.tsx` (add `unreadCount`)

**Step 1: Track "last seen" in AppContext**

```typescript
const [lastSeen, setLastSeen] = useState(() =>
  localStorage.getItem('gcd-lastSeen') || new Date().toISOString()
);

const unreadCount = expenses.filter(e => {
  const expCreated = e.createdAt || e.date;
  return expCreated > lastSeen;
}).length;

function markAllRead() {
  const now = new Date().toISOString();
  setLastSeen(now);
  localStorage.setItem('gcd-lastSeen', now);
}
```

**Step 2: Add `createdAt` to expense writes**

When `addExpense` or `updateExpense` writes to Firestore, include `createdAt: new Date().toISOString()`.

**Step 3: Wire bell button in Dashboard**

```tsx
<button
  onClick={() => { markAllRead(); navigate('/app/expenses'); }}
  className="relative w-9 h-9 rounded-full bg-[#2E1910] flex items-center justify-center text-[#9A7565]"
>
  <Bell size={18} strokeWidth={2} />
  {unreadCount > 0 && (
    <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#D05242] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  )}
</button>
```

**Step 4: Verify**

Add expense on another device → bell shows badge → click bell → navigate to expenses → badge clears.

---

### Task 12: Fix Analytics Trend — Compute from Real Data

**Files:**
- Modify: `src/app/screens/Analytics.tsx`
- Modify: `src/app/data/sampleData.ts` (keep TIME_SERIES_DATA for demo mode only)

**Step 1: Compute time series from actual expenses**

```typescript
function computeTimeSeries(expenses: Expense[], budget: number) {
  if (expenses.length === 0) return [];
  const sorted = [...expenses].sort((a, b) => a.date.localeCompare(b.date));
  const byDay: Record<string, number> = {};
  sorted.forEach(e => {
    byDay[e.date] = (byDay[e.date] || 0) + e.amount;
  });
  let cumulative = 0;
  return Object.entries(byDay).map(([date, amount]) => {
    cumulative += amount;
    return { day: date, spent: cumulative, budget };
  });
}
```

**Step 2: Replace hardcoded TIME_SERIES_DATA usage**

```tsx
const trendData = demoMode ? TIME_SERIES_DATA : computeTimeSeries(expenses, budget);
```

**Step 3: Verify**

Add a few expenses with different dates → trend chart shows actual cumulative spending.

---

### Task 13: Fix Dark Mode — CSS Variables Instead of Hardcoded Colors

**Files:**
- Modify: `src/app/components/Layout.tsx`

**Step 1: Audit hardcoded colors in Layout.tsx**

Replace all `bg-[#0E0908]`, `bg-[#150C09]`, `border-[#3E2015]`, `text-[#F0DDD0]` etc. with Tailwind CSS variable classes.

Since theme.css already defines CSS variables for both light/dark modes, use:
```
bg-[var(--bg)]
bg-[var(--surface)]
border-[var(--border)]
text-[var(--text)]
```

Or better: add Tailwind custom colors in theme.css that auto-switch based on dark class.

**Step 2: Test light mode**

Toggle dark mode off → verify Layout doesn't show dark colors on light background.

**Step 3: Verify both modes work**

Toggle back and forth → both look correct.

---

### Task 14: Final Integration Test & Build

**Step 1: Run build**

Run: `npm run build`
Expected: No errors

**Step 2: Test complete flow**

1. Fresh load → Onboarding → create group with 3 members
2. Add 2 expenses → check dashboard stats
3. Edit an expense → verify update
4. Delete an expense → verify removal
5. Check settlement → mark one done
6. Check analytics → all 3 tabs show data
7. Open Members → QR code visible → copy link works
8. Open Settings → change group name → verify dashboard
9. Export CSV → download file
10. Toggle dark mode → verify both themes
11. Refresh page → data persists
12. Open scan → camera activates (if on HTTPS/localhost)

**Step 3: Commit**

```bash
git init
git add -A
git commit -m "feat: implement all features with Firebase persistence

- Add Firebase Firestore for data persistence
- Add real camera + Tesseract.js OCR for receipt scanning
- Add real QR codes with qrcode.react
- Add Web Share API for native sharing
- Add expense edit/delete functionality
- Add real settings (CSV export, group editing)
- Add join group flow
- Add notification bell with unread count
- Fix dark mode CSS variables
- Compute analytics trend from real data"
```
