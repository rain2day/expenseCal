# Design: Dark Theme Overhaul, Remove Budget Limit, Fix Fund UI

**Date:** 2026-02-18
**Status:** Approved

## A. Dark Mode — Deep Red-Brown Warm Palette

Update `.dark` CSS variables in `theme.css`. Light mode unchanged.

| Token | Old | New |
|-------|-----|-----|
| `--background` | `#0E0908` | `#6A2020` |
| `--card` | `#1A0D0A` | `#4A1515` |
| `--secondary` | `#2E1910` | `#7A2828` |
| `--muted` | `#2E1910` | `#7A2828` |
| `--border` | `rgba(221,132,60,0.15)` | `rgba(221,132,60,0.20)` |
| `--input` | `rgba(221,132,60,0.08)` | `rgba(221,132,60,0.12)` |
| `--input-background` | `#2E1910` | `#5A1818` |
| `--switch-background` | `#3E2015` | `#5A1818` |
| `--accent-bg` | `#3A1E08` | `#8A3020` |
| `--success-bg` | `#12280A` | `#2A4A20` |
| `--purple-bg` | `#260E30` | `#4A2050` |
| `--sidebar` | `#150C09` | `#5A1818` |
| `--sidebar-accent` | `#2E1910` | `#7A2828` |

Keep: `--primary`, `--foreground`, `--muted-foreground`, all chart colors.

## B. Remove Budget Limit (預算上限)

1. Delete `manualBudget` state, `setManualBudget`, `setBudget` from AppContext
2. Remove `budget` derived value — replace with `totalContributions` directly
3. Remove budget edit row from Settings.tsx
4. Dashboard BudgetBar: `spent=totalSpent, budget=totalContributions`; hide when `totalContributions === 0`
5. Health gauge: `fundBalance / totalContributions * 100`; default 100 when no contributions
6. Remove `budget` from AppContext interface and provider value
7. Remove Onboarding per-person budget calculation — just store total contributions as-is

## C. Fix Fund Contribution UI (追加公數)

In Dashboard.tsx fund form (lines 148-169):
- Stack amount input and confirm button vertically (not side-by-side)
- Amount input: full width
- Confirm button: full width below input
- Maintain existing member avatar selector layout
