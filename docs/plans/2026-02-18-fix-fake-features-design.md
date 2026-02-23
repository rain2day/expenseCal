# Design: Fix All Fake Features in Expense Calculator

## Overview

Turn all mock/placeholder features in the 公數計算器 app into real, working functionality. Add Firebase for data persistence and real-time sync.

## Tech Decisions

- **Data persistence**: Firebase (Firestore + Anonymous Auth)
- **Receipt OCR**: Tesseract.js (browser-only, no image storage needed)
- **QR codes**: qrcode.react library
- **Sharing**: Web Share API with clipboard fallback
- **CSV export**: Blob API + browser download

## Architecture

### Firebase Data Structure

```
groups/{groupId}
  ├── name: string
  ├── budget: number
  ├── currency: string
  ├── createdAt: timestamp
  │
  ├── members/{memberId}
  │     ├── name: string
  │     ├── initials: string
  │     ├── color: string
  │     └── role: 'admin' | 'member'
  │
  ├── expenses/{expenseId}
  │     ├── amount: number
  │     ├── description: string
  │     ├── category: CategoryType
  │     ├── paidBy: string (memberId)
  │     ├── splitAmong: string[] (memberIds)
  │     ├── date: string
  │     └── createdAt: timestamp
  │
  └── settlements/{settlementId}
        ├── fromId: string
        ├── toId: string
        ├── amount: number
        └── done: boolean
```

### Auth Flow

- Anonymous auth on first visit → get a userId
- userId stored in localStorage for session continuity
- Group creator becomes admin
- Join via invite link → add as member to group

## Features to Fix (10 items)

### A. Receipt Scan (ReceiptScan.tsx)

**Current**: Fake camera viewfinder, setTimeout simulation, hardcoded OCR result.

**Fix**:
1. `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })` for rear camera
2. Capture frame to canvas → pass image data to Tesseract.js
3. Tesseract.js with `chi_tra` + `jpn` language packs for Chinese/Japanese text
4. Regex parse for amounts (¥ / numbers), dates, merchant names
5. Pass parsed data via React Router state to AddExpense (pre-fill)
6. "Upload" tab: `<input type="file" accept="image/*" capture="environment">`
7. Image discarded after OCR — zero storage cost

### B. QR Code (Onboarding + Members)

**Current**: CSS grid pattern, not scannable.

**Fix**:
1. Install `qrcode.react`
2. QR content = `${location.origin}/join/${groupId}`
3. Replace fake grid with `<QRCodeSVG value={inviteUrl} />`

### C. Share Functionality (Members)

**Current**: Toast-only buttons for WhatsApp/Telegram/LINE.

**Fix**:
1. Primary: `navigator.share({ title, text, url })` (Web Share API)
2. Fallback: `navigator.clipboard.writeText(inviteUrl)` + toast
3. Remove individual platform buttons — Web Share API shows all installed apps

### D. Expense Edit/Delete (ExpenseHistory)

**Current**: Edit button has no handler; delete works in local state only.

**Fix**:
1. Edit: navigate to `/app/add-expense?edit={expenseId}`, pass expense data via router state
2. AddExpense detects edit mode → pre-fills form → updates instead of creates
3. Delete: confirmation dialog → remove from Firestore → toast
4. Add `updateExpense()` to AppContext

### E. Settings Page (Settings.tsx)

**Current**: All settings except dark mode show toast only.

**Fix**:
1. Group name: inline edit with save → Firestore update
2. Budget: number input modal → Firestore update
3. Currency: selector modal → Firestore update
4. CSV export: generate CSV string from expenses → Blob → `<a download>` trigger
5. PDF export: `window.print()` with print-optimized stylesheet
6. Clear all records: confirmation dialog → batch delete from Firestore
7. Language/notifications: keep as toast (out of scope for now)

### F. Onboarding Member Creation (Onboarding.tsx)

**Current**: Members added in step 3 are local state only; app uses hardcoded data.

**Fix**:
1. On "Complete" → create group doc in Firestore
2. Write all members to `groups/{groupId}/members/`
3. Save groupId to localStorage + AppContext
4. App reads members from Firestore instead of sampleData.ts

### G. Join Group (Onboarding.tsx + new JoinGroup route)

**Current**: "Join" button shows "coming soon" toast.

**Fix**:
1. New route: `/join/{groupId}`
2. Screen: enter name → add self as member to Firestore group
3. Redirect to dashboard
4. QR scan or link click → opens join page

### H. Notification Bell (Dashboard.tsx)

**Current**: Icon present, no handler.

**Fix**:
1. Track "last seen" timestamp per user in localStorage
2. Count expenses created after lastSeen = unread count
3. Badge on bell icon showing count
4. Click → navigate to expense history (mark all as read)

### I. Data Persistence (AppContext.tsx)

**Current**: All in-memory, resets on refresh.

**Fix**:
1. Firebase init in a new `src/app/firebase.ts` config file
2. AppContext reads initial data from Firestore on mount
3. All mutations (add/edit/delete expense, mark settlement, update settings) write to Firestore
4. `onSnapshot` listeners for real-time sync across devices
5. Loading states while Firestore data loads

### J. Dark Mode Fix (Layout.tsx)

**Current**: Hardcoded dark color values instead of CSS variables.

**Fix**:
1. Replace all `bg-[#0E0908]`, `bg-[#1A0D0A]` etc. with CSS variable references
2. Ensure theme.css variables are used consistently
3. Test both light and dark modes

## New Dependencies

```
firebase           # Firestore + Auth
tesseract.js       # Browser OCR
qrcode.react       # QR code generation
```

## Out of Scope

- Multi-language support (keep Chinese only)
- Push notifications (browser notification API)
- Actual payment integration
- User profile pictures
