# Group Buy (搭單) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "group buy" feature where one person pays for multiple people's purchases, with automatic personal expense tracking and independent settlement.

**Architecture:** New `groupBuys` Firestore collection stores each group buy with embedded items array. On create, items are also written to each member's `personalExpenses` with a `groupBuyId` backlink. Settlement is independent from group expenses — tracked per-member within the GroupBuy doc.

**Tech Stack:** React, TypeScript, Firestore, motion/react, Tailwind CSS, Lucide icons

**Design doc:** `docs/plans/2026-02-24-group-buy-design.md`

---

### Task 1: Types + PersonalExpense groupBuyId field

**Files:**
- Modify: `src/app/data/sampleData.ts`

**Step 1: Add GroupBuy types and update PersonalExpense**

Add after the `PersonalExpense` interface (~line 49):

```typescript
export interface GroupBuyItem {
  memberId: string;
  description: string;
  amount: number;
  category: CategoryType;
}

export interface GroupBuy {
  id: string;
  title: string;
  payerId: string;
  items: GroupBuyItem[];
  date: string;
  createdAt: string;
  settlements: Record<string, boolean>;
}
```

Add optional `groupBuyId` to `PersonalExpense`:
```typescript
export interface PersonalExpense {
  // ... existing fields ...
  groupBuyId?: string;  // links back to parent group buy
}
```

**Step 2: Add demo data**

Add after `CONTRIBUTIONS` array:
```typescript
export const GROUP_BUYS: GroupBuy[] = [];
```

**Step 3: Build verify**

Run: `npm run build`
Expected: Success, no type errors

**Step 4: Commit**

```bash
git add src/app/data/sampleData.ts
git commit -m "feat(group-buy): add GroupBuy types and PersonalExpense.groupBuyId"
```

---

### Task 2: i18n keys

**Files:**
- Modify: `src/app/i18n/types.ts`
- Modify: `src/app/i18n/zh.ts`
- Modify: `src/app/i18n/ja.ts`

**Step 1: Add groupBuy section to types.ts**

Add a new `groupBuy` key in the `Translations` interface:

```typescript
groupBuy: {
  title: string;
  newGroupBuy: string;
  titleLabel: string;
  titlePlaceholder: string;
  date: string;
  payer: string;
  selectPayer: string;
  items: string;
  addItem: string;
  selectMember: string;
  itemDescription: string;
  itemDescPlaceholder: string;
  itemAmount: string;
  itemCategory: string;
  settlementPreview: string;
  total: string;
  payerSelf: string;
  owes: (debtor: string, creditor: string, amount: string) => string;
  confirm: string;
  noItems: string;
  needMinTwoItems: string;
  created: string;
  deleted: string;
  markPaid: string;
  markUnpaid: string;
  paid: string;
  unpaid: string;
  allSettled: string;
  groupBuyTag: string;
  history: string;
  noGroupBuys: string;
  deleteConfirm: string;
  viewDetail: string;
};
```

**Step 2: Add zh.ts translations**

```typescript
groupBuy: {
  title: '搭單',
  newGroupBuy: '新增搭單',
  titleLabel: '搭單描述',
  titlePlaceholder: '例：免稅店購物',
  date: '日期',
  payer: '墊錢人',
  selectPayer: '選擇墊錢人',
  items: '購買項目',
  addItem: '新增項目',
  selectMember: '選擇成員',
  itemDescription: '品項描述',
  itemDescPlaceholder: '例：水果、鎖匙扣',
  itemAmount: '金額',
  itemCategory: '分類',
  settlementPreview: '結算預覽',
  total: '合計',
  payerSelf: '（墊錢人）自己的',
  owes: (debtor, creditor, amount) => `${debtor} 需還 ${creditor} ${amount}`,
  confirm: '確認搭單',
  noItems: '請至少加一個項目',
  needMinTwoItems: '搭單至少要有兩人的項目',
  created: '搭單已建立',
  deleted: '搭單已刪除',
  markPaid: '標記已還',
  markUnpaid: '標記未還',
  paid: '已還',
  unpaid: '未還',
  allSettled: '全部已還清 🎉',
  groupBuyTag: '搭單',
  history: '搭單記錄',
  noGroupBuys: '暫無搭單記錄',
  deleteConfirm: '確定要刪除此搭單？相關個人消費不會被刪除。',
  viewDetail: '查看詳情',
},
```

**Step 3: Add ja.ts translations**

```typescript
groupBuy: {
  title: '共同購入',
  newGroupBuy: '共同購入を追加',
  titleLabel: '説明',
  titlePlaceholder: '例：免税店ショッピング',
  date: '日付',
  payer: '立替者',
  selectPayer: '立替者を選択',
  items: '購入品目',
  addItem: '品目を追加',
  selectMember: 'メンバーを選択',
  itemDescription: '品目の説明',
  itemDescPlaceholder: '例：果物、キーホルダー',
  itemAmount: '金額',
  itemCategory: 'カテゴリ',
  settlementPreview: '精算プレビュー',
  total: '合計',
  payerSelf: '（立替者）本人分',
  owes: (debtor, creditor, amount) => `${debtor} → ${creditor} に ${amount}`,
  confirm: '共同購入を確定',
  noItems: '品目を追加してください',
  needMinTwoItems: '共同購入には2人以上必要です',
  created: '共同購入を作成しました',
  deleted: '共同購入を削除しました',
  markPaid: '返済済みにする',
  markUnpaid: '未返済にする',
  paid: '返済済み',
  unpaid: '未返済',
  allSettled: '全額返済済み 🎉',
  groupBuyTag: '共同購入',
  history: '共同購入履歴',
  noGroupBuys: '共同購入の記録はありません',
  deleteConfirm: 'この共同購入を削除しますか？関連する個人支出は削除されません。',
  viewDetail: '詳細を見る',
},
```

**Step 4: Build verify**

Run: `npm run build`
Expected: Success

**Step 5: Commit**

```bash
git add src/app/i18n/types.ts src/app/i18n/zh.ts src/app/i18n/ja.ts
git commit -m "feat(group-buy): add i18n keys for zh and ja"
```

---

### Task 3: Firestore rules

**Files:**
- Modify: `firestore.rules`

**Step 1: Add groupBuys validation and match rules**

Add before the closing `}` of the group match block:

```firestore
// ── Group buys ────────────────────────────────────────
function validGroupBuyItem(item) {
  return item.keys().hasOnly(['memberId', 'description', 'amount', 'category']) &&
    isShortString(item.memberId, 64) &&
    isShortString(item.description, 120) &&
    isAmountMinorUnit(item.amount) &&
    isCategory(item.category);
}

function validGroupBuyData(data) {
  return data.keys().hasOnly(['title', 'payerId', 'items', 'date', 'createdAt', 'settlements']) &&
    isShortString(data.title, 120) &&
    isShortString(data.payerId, 64) &&
    data.items is list &&
    data.items.size() >= 1 &&
    data.items.size() <= 30 &&
    isDateString(data.date) &&
    (!data.keys().hasAny(['createdAt']) || isShortString(data.createdAt, 40)) &&
    data.settlements is map;
}

match /groupBuys/{groupBuyId} {
  allow read: if isSignedIn();
  allow create: if isSignedIn() && validGroupBuyData(request.resource.data);
  allow update: if isSignedIn();
  allow delete: if isSignedIn();
}
```

Note: `update` is permissive because settlement toggling only changes the `settlements` map. Full validation on update is complex for nested structures.

**Step 2: Deploy rules (optional, can be deferred)**

Run: `firebase deploy --only firestore:rules` (or defer to final deploy)

**Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat(group-buy): add Firestore security rules for groupBuys"
```

---

### Task 4: AppContext — CRUD + listeners

**Files:**
- Modify: `src/app/context/AppContext.tsx`

**Step 1: Add state and imports**

Add to the existing state declarations:
```typescript
const [groupBuys, setGroupBuys] = useState<GroupBuy[]>([]);
const [groupBuysLoading, setGroupBuysLoading] = useState(false);
```

Import `GroupBuy` from sampleData.

**Step 2: Add loadGroupBuys with Firestore onSnapshot**

Follow the `loadPersonalExpenses` pattern:
```typescript
const groupBuysCleanupRef = useRef<(() => void) | null>(null);

const loadGroupBuys = useCallback(() => {
  // Cleanup previous listener
  if (groupBuysCleanupRef.current) groupBuysCleanupRef.current();

  if (demoMode || !groupId) {
    setGroupBuysLoading(false);
    return () => {};
  }

  setGroupBuysLoading(true);
  const gbRef = collection(db, 'groups', groupId, 'groupBuys');
  const q = query(gbRef, orderBy('createdAt', 'desc'));
  const unsub = onSnapshot(q, (snap) => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as GroupBuy));
    setGroupBuys(data);
    setGroupBuysLoading(false);
  });

  groupBuysCleanupRef.current = unsub;
  return unsub;
}, [demoMode, groupId]);
```

**Step 3: Add addGroupBuy**

This is the most complex function — it creates the GroupBuy doc AND writes personal expenses for each item:

```typescript
const addGroupBuy = useCallback(async (gb: Omit<GroupBuy, 'id' | 'createdAt'>) => {
  const createdAt = new Date().toISOString();
  const id = `gb_${Date.now()}`;
  const fullGb: GroupBuy = { ...gb, id, createdAt };

  if (demoMode || !groupId) {
    setGroupBuys(prev => [fullGb, ...prev]);
    // Also add personal expenses for each item
    for (const item of gb.items) {
      const pe: PersonalExpense = {
        id: `pe_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        amount: item.amount,
        description: item.description,
        category: item.category,
        date: gb.date,
        visibility: 'private',
        groupBuyId: id,
        createdAt,
      };
      addPersonalExpense(item.memberId, pe);
    }
  } else {
    try {
      const gbRef = collection(db, 'groups', groupId, 'groupBuys');
      const { id: _id, ...data } = fullGb;
      const docRef = await addDoc(gbRef, data);
      const firestoreId = docRef.id;

      // Write personal expenses for each item
      for (const item of gb.items) {
        const peData = {
          amount: normalizeMinorAmount(item.amount),
          description: item.description,
          category: item.category,
          date: gb.date,
          visibility: 'private',
          groupBuyId: firestoreId,
          createdAt,
        };
        const itemsRef = collection(db, 'groups', groupId, 'personalExpenses', item.memberId, 'items');
        await addDoc(itemsRef, peData);
      }
    } catch (err) {
      console.error('Failed to add group buy:', err);
      showToast('error', t.errors.addExpenseFailed);
    }
  }
}, [demoMode, groupId, showToast, t, addPersonalExpense]);
```

**Step 4: Add deleteGroupBuy**

```typescript
const deleteGroupBuy = useCallback((gbId: string) => {
  if (demoMode || !groupId) {
    setGroupBuys(prev => prev.filter(g => g.id !== gbId));
  } else {
    const gbDocRef = doc(db, 'groups', groupId, 'groupBuys', gbId);
    deleteDoc(gbDocRef).catch((err) => {
      console.error('Failed to delete group buy:', err);
      showToast('error', t.errors.deleteExpenseFailed);
    });
  }
}, [demoMode, groupId, showToast, t]);
```

**Step 5: Add toggleGroupBuySettlement**

```typescript
const toggleGroupBuySettlement = useCallback((gbId: string, memberId: string) => {
  if (demoMode || !groupId) {
    setGroupBuys(prev => prev.map(g => {
      if (g.id !== gbId) return g;
      const done = !g.settlements[memberId];
      return { ...g, settlements: { ...g.settlements, [memberId]: done } };
    }));
  } else {
    // Read current, toggle, write back
    const gbDocRef = doc(db, 'groups', groupId, 'groupBuys', gbId);
    const gb = groupBuys.find(g => g.id === gbId);
    if (!gb) return;
    const done = !gb.settlements[memberId];
    updateDoc(gbDocRef, { [`settlements.${memberId}`]: done }).catch((err) => {
      console.error('Failed to toggle settlement:', err);
    });
  }
}, [demoMode, groupId, groupBuys]);
```

**Step 6: Expose in context value**

Add to the context value object:
```typescript
groupBuys, groupBuysLoading, loadGroupBuys,
addGroupBuy, deleteGroupBuy, toggleGroupBuySettlement,
```

Also add these to the `AppContextType` interface.

**Step 7: Build verify**

Run: `npm run build`
Expected: Success

**Step 8: Commit**

```bash
git add src/app/context/AppContext.tsx
git commit -m "feat(group-buy): add CRUD functions and Firestore listeners"
```

---

### Task 5: Routes

**Files:**
- Modify: `src/app/routes.ts`

**Step 1: Add route imports and paths**

Add lazy imports at top:
```typescript
const GroupBuyForm = lazy(() => import('./screens/GroupBuyForm').then(m => ({ default: m.GroupBuyForm })));
const GroupBuyDetail = lazy(() => import('./screens/GroupBuyDetail').then(m => ({ default: m.GroupBuyDetail })));
```

Add routes in the children array (after `personal/:memberId`):
```typescript
{ path: 'group-buy', Component: GroupBuyForm },
{ path: 'group-buy/:groupBuyId', Component: GroupBuyDetail },
```

**Step 2: Build verify**

Run: `npm run build`
Expected: May warn about missing components — that's OK, we create them next.

**Step 3: Commit**

```bash
git add src/app/routes.ts
git commit -m "feat(group-buy): add routes for group buy form and detail"
```

---

### Task 6: GroupBuyForm screen

**Files:**
- Create: `src/app/screens/GroupBuyForm.tsx`

This is the main form for creating a new group buy. It has:
1. Title + date + payer selection
2. Items list (add/remove)
3. Settlement preview
4. Confirm button

**Step 1: Create the full GroupBuyForm component**

Key sections:
- State: `title`, `date`, `payerId`, `items[]` (each with memberId, description, amount, category)
- "Add Item" opens a mini-form inline: select member → description → amount → category → add
- Settlement preview computed from items + payerId
- On confirm: call `addGroupBuy()`, toast success, navigate back

Use existing UI patterns from AddExpense.tsx:
- `MemberAvatar` for payer/member selection
- `CategoryIcon` chips for category
- Currency input with `parseCurrencyInput` / `formatCurrencyInput`
- Same card/rounded-2xl styling

**Step 2: Build verify**

Run: `npm run build`
Expected: Success

**Step 3: Commit**

```bash
git add src/app/screens/GroupBuyForm.tsx
git commit -m "feat(group-buy): add group buy creation form"
```

---

### Task 7: GroupBuyDetail screen

**Files:**
- Create: `src/app/screens/GroupBuyDetail.tsx`

Shows a completed group buy with:
1. Header: title, date, payer info
2. Items list: each item with member avatar, description, amount
3. Settlement section: each debtor with "已還/未還" toggle button
4. Delete button at bottom

**Step 1: Create GroupBuyDetail component**

Key features:
- Load specific group buy from `groupBuys` array by ID param
- Show items grouped visually
- Settlement toggles call `toggleGroupBuySettlement()`
- When all settled → show confetti (reuse existing confetti pattern from Settlement.tsx)
- Delete button with confirmation

**Step 2: Build verify**

Run: `npm run build`
Expected: Success

**Step 3: Commit**

```bash
git add src/app/screens/GroupBuyDetail.tsx
git commit -m "feat(group-buy): add group buy detail and settlement tracking"
```

---

### Task 8: PersonalExpenses integration

**Files:**
- Modify: `src/app/screens/PersonalExpenses.tsx`

**Step 1: Add "搭單" button in header**

Add a second button next to the "+" button:
```tsx
<button
  onClick={() => navigate('/app/group-buy', { state: { memberId } })}
  className="flex items-center gap-1 bg-accent-bg text-primary px-3 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition-transform"
>
  <ShoppingBag size={14} strokeWidth={2} /> {t.groupBuy.title}
</button>
```

Import `ShoppingBag` from lucide-react.

**Step 2: Add "搭單" tag on personal expenses that have groupBuyId**

In the list item rendering, add a small tag:
```tsx
{exp.groupBuyId && (
  <span className="text-[10px] bg-accent-bg text-primary px-1.5 py-0.5 rounded-md font-bold">
    {t.groupBuy.groupBuyTag}
  </span>
)}
```

**Step 3: Add group buy history section**

Add a section below the list/stats tabs or as a third tab showing group buy records for this member. Each record links to `/app/group-buy/:id`.

**Step 4: Build verify**

Run: `npm run build`
Expected: Success

**Step 5: Commit**

```bash
git add src/app/screens/PersonalExpenses.tsx
git commit -m "feat(group-buy): add entry button and groupBuy tag to personal expenses"
```

---

### Task 9: Firestore rules validation + deploy

**Files:**
- Modify: `firestore.rules` (already done in Task 3)

**Step 1: Validate rules**

Run: `firebase emulators:start` or test manually

**Step 2: Update PersonalExpense rules to allow groupBuyId**

Update `validPersonalExpenseData` to accept the optional `groupBuyId` field:
```firestore
function validPersonalExpenseData(data) {
  return data.keys().hasOnly(['amount', 'description', 'category', 'date', 'createdAt', 'visibility', 'groupBuyId']) &&
    // ... existing validations ...
    (!data.keys().hasAny(['groupBuyId']) || isShortString(data.groupBuyId, 64));
}
```

**Step 3: Build + deploy rules**

Run: `firebase deploy --only firestore:rules`

**Step 4: Commit**

```bash
git add firestore.rules
git commit -m "feat(group-buy): update Firestore rules to allow groupBuyId on personal expenses"
```

---

### Task 10: Final build + push

**Step 1: Full build**

Run: `npm run build`
Expected: Clean build, no errors

**Step 2: Manual test checklist**

- [ ] PersonalExpenses page shows 搭單 button
- [ ] Can create new group buy with 2+ items
- [ ] Settlement preview shows correct amounts
- [ ] Personal expenses created for each item
- [ ] GroupBuy detail shows items and settlement toggles
- [ ] Can mark settlements as paid/unpaid
- [ ] Can delete group buy
- [ ] Personal expenses with groupBuyId show 搭單 tag

**Step 3: Push**

```bash
git push
```
