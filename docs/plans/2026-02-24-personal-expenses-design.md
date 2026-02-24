# Personal Expense Tracking — Design Document

**Date:** 2026-02-24
**Status:** Approved

## Purpose

Per-member personal expense journal. Members record their own individual spending during the trip (souvenirs, personal shopping, etc.) — separate from group shared expenses. Pure bookkeeping, no impact on group settlement.

## Data Model

### Firestore Structure

```
groups/{groupId}/personalExpenses/{memberId}
  └── defaultVisibility: 'private' | 'group'

groups/{groupId}/personalExpenses/{memberId}/items/{expenseId}
  ├── amount: number           (minor units)
  ├── description: string      (max 120 chars)
  ├── category: CategoryType   (food/transport/accommodation/tickets/shopping/other)
  ├── date: string             (YYYY-MM-DD)
  ├── createdAt: string        (ISO timestamp)
  └── visibility: 'private' | 'group'
```

### TypeScript Type

```typescript
interface PersonalExpense {
  id: string;
  amount: number;
  description: string;
  category: CategoryType;
  date: string;
  createdAt?: string;
  visibility: 'private' | 'group';
}
```

## UI Structure

### Entry Points

- **Members page** → expand a member → "個人消費" button → navigates to personal expense page
- **FAB (+) long-press** → option menu: "新增公數支出" / "新增個人消費"

### Routes

```
/app/personal/:memberId       ← list + stats page (2 tabs)
/app/personal/:memberId/add   ← add form (overlay)
```

### Page Layout

Personal expense page has 2 tabs:

**Tab 1 — 支出列表 (Expense List)**
- Cards sorted by date (newest first)
- Each card: category icon, description, amount, date, visibility indicator (🔒/👁)
- Swipe or long-press to delete
- Tap to edit

**Tab 2 — 統計分析 (Statistics)**
- Donut chart: category distribution (reuse existing donut component)
- Daily trend bar chart (reuse existing trend chart logic)
- Summary cards: total spent, daily average, peak spending day

### Page-level FAB
- Floating "+" button within the personal expense page for quick add

## Firestore Security Rules

```
match /groups/{groupId}/personalExpenses/{memberId} {
  allow read, write: if isSignedIn();
}
match /groups/{groupId}/personalExpenses/{memberId}/items/{expenseId} {
  allow read: if isSignedIn();
  allow write: if isSignedIn();
}
```

Privacy controlled at app layer (query filter: only fetch visibility === 'group' for other members).

## Read/Write Logic

| Operation | Path | Trigger |
|-----------|------|---------|
| Load own records | `personalExpenses/{myId}/items` (all) | Enter personal page |
| Load other's records | `personalExpenses/{otherId}/items` where visibility == 'group' | Enter other's page |
| Add | `addDoc(personalExpenses/{myId}/items, data)` | Submit form |
| Delete | `deleteDoc(personalExpenses/{myId}/items/{id})` | Swipe/long-press |
| Toggle visibility | `updateDoc(item, { visibility })` | Toggle 🔒/👁 |

## AppContext Extension

- New state: `personalExpenses: PersonalExpense[]` (lazy loaded)
- New methods: `addPersonalExpense()`, `deletePersonalExpense()`, `updatePersonalExpense()`
- Firestore listener activates only when entering `/app/personal/:memberId` (lazy, no perf impact)

## Statistics (reuse existing components)

- Category donut chart (from Analytics)
- Daily trend bar chart (from Analytics)
- Summary: total, daily average, peak day, days with spending

## i18n

New keys for zh + ja covering:
- Page title, tab labels, form labels
- Visibility labels (private/group)
- Stats labels
- Empty states

## Scope

**In scope:**
- Personal expense CRUD
- Category selection (reuse existing 6 categories)
- Per-item visibility toggle (private/group)
- List view (sorted by date, category icons, amounts)
- Statistics tab (donut + trend + summary cards)
- Member page entry point
- i18n (zh + ja)

**Out of scope (YAGNI):**
- Photo/receipt attachments
- Personal budget
- CSV export
- Convert personal ↔ group expense
- Push notifications
