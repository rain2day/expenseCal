# 搭單功能設計 (Group Buy)

> Date: 2026-02-24
> Status: Approved

## Problem

旅行時常出現「湊單購物」場景：幾個人一齊買野（例如免稅店湊單達到退稅門檻），一個人先墊錢付款，但每人買嘅嘢唔同。需要記錄每人買咗咩、自動計算邊個要還幾多錢。

## Design Decisions

- **獨立即時結算**：搭單欠款係私人之間嘅事，唔影響團體公數結算
- **入口位置**：個人消費頁面內，同「+」新增按鈕並列
- **參與人數**：團內任何成員都可以參與搭單
- **方案選擇**：方案 A — 搭單作為獨立數據結構，有完整記錄可回溯

## Data Model

```typescript
interface GroupBuyItem {
  memberId: string;       // 邊個買
  description: string;    // 買咗咩
  amount: number;         // 幾錢（minor units）
  category: CategoryType; // 分類
}

interface GroupBuy {
  id: string;
  title: string;          // 搭單描述（例如「免稅店購物」）
  payerId: string;        // 墊錢人
  items: GroupBuyItem[];  // 每人買嘅嘢
  date: string;           // YYYY-MM-DD
  createdAt: string;
  settlements: Record<string, boolean>; // { memberId: done }
}
```

**Firestore path:** `groups/{groupId}/groupBuys/{groupBuyId}`

**Side effect:** 建立搭單時，每個 item 自動寫入對應成員嘅 `personalExpenses/{memberId}/items/`，帶 `groupBuyId` 標記方便追溯。

## UI Flow

### Entry Point
個人消費頁面 header 加一個「搭單」按鈕（同「+」新增按鈕並列）

### Group Buy Form (`/app/group-buy`)

1. 填寫搭單描述、日期、選擇墊錢人
2. 逐個加項目：選成員 → 填描述 + 金額 + 分類
3. 底部即時顯示結算預覽
4. 確認後：建立 GroupBuy doc + 自動寫入各成員個人消費

### Settlement Preview (表單底部)
```
合計：¥5,000
小明（墊錢人）：¥3,000 自己嘅
阿花 需還 小明：¥2,000
```

### Settlement Tracking
- 每筆欠款可獨立標記「已還」
- 標記已還時有 confetti 效果（同現有 Settlement 一致）

### Personal Expenses Integration
- 搭單產生嘅個人消費帶「搭單」小標籤
- 點擊可查看完整搭單記錄

## Settlement Logic

```
對每個 item where item.memberId ≠ payerId:
  "{member.name} 需還 {payer.name} ¥{item.amount}"

墊錢人自己嘅 items 唔產生結算記錄
```

## YAGNI — Not Doing

- ❌ 搭單唔影響團體結算（Settlement）
- ❌ 唔支持一個 item 多人分攤（每個 item 只屬於一個人）
- ❌ 唔支持編輯已建立嘅搭單（可以刪除重建）
- ❌ 搭單無 fund 支付選項（只有成員墊錢）

## Files to Create/Modify

### New Files
- `src/app/screens/GroupBuy.tsx` — 搭單表單頁面
- `src/app/screens/GroupBuyDetail.tsx` — 搭單詳情 + 結算追蹤

### Modified Files
- `src/app/data/sampleData.ts` — GroupBuy, GroupBuyItem types
- `src/app/context/AppContext.tsx` — CRUD functions, Firestore listeners
- `src/app/screens/PersonalExpenses.tsx` — 搭單入口按鈕 + 搭單標籤
- `src/app/i18n/types.ts`, `zh.ts`, `ja.ts` — i18n keys
- `firestore.rules` — groupBuys collection security rules
- `src/app/data/sampleData.ts` — PersonalExpense type 加 groupBuyId? field
- App router — 新增 `/app/group-buy` 和 `/app/group-buy/:id` 路由
