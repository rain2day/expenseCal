import { createBrowserRouter, redirect } from 'react-router';
import { Layout } from './components/Layout';
import { Onboarding } from './screens/Onboarding';
import { Dashboard } from './screens/Dashboard';
import { ExpenseHistory } from './screens/ExpenseHistory';
import { AddExpense } from './screens/AddExpense';
import { ReceiptScan } from './screens/ReceiptScan';
import { Settlement } from './screens/Settlement';
import { Analytics } from './screens/Analytics';
import { Members } from './screens/Members';
import { PersonalExpenses } from './screens/PersonalExpenses';
import { Settings } from './screens/Settings';
import { ThemeSettings } from './screens/ThemeSettings';
import { ComponentLibrary } from './screens/ComponentLibrary';
import { JoinGroup } from './screens/JoinGroup';
import { GroupBuyForm } from './screens/GroupBuyForm';
import { GroupBuyDetail } from './screens/GroupBuyDetail';
import { V2Layout } from './v2/V2Layout';
import { AddExpenseV2 } from './v2/AddExpenseV2';
import { AnalyticsV2 } from './v2/AnalyticsV2';
import { DashboardV2 } from './v2/DashboardV2';
import { ExpenseHistoryV2 } from './v2/ExpenseHistoryV2';
import { GroupBuyDetailV2 } from './v2/GroupBuyDetailV2';
import { GroupBuyFormV2 } from './v2/GroupBuyFormV2';
import { JoinGroupV2 } from './v2/JoinGroupV2';
import { MembersV2 } from './v2/MembersV2';
import { OnboardingV2 } from './v2/OnboardingV2';
import { PersonalExpensesV2 } from './v2/PersonalExpensesV2';
import { ReceiptScanV2 } from './v2/ReceiptScanV2';
import { SettingsV2 } from './v2/SettingsV2';
import { SettlementV2 } from './v2/SettlementV2';
import { ThemeSettingsV2 } from './v2/ThemeSettingsV2';

const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Onboarding,
    loader: ({ request }) => {
      const gid = localStorage.getItem('gcd-groupId');
      const url = new URL(request.url);
      // Allow access when creating/joining a new group from Settings (?new=1)
      if (gid && !url.searchParams.has('new')) return redirect('/app/dashboard');
      return null;
    },
  },
  {
    path: '/join/:groupId',
    Component: JoinGroup,
  },
  {
    path: '/v2/start',
    Component: OnboardingV2,
    loader: ({ request }) => {
      const gid = localStorage.getItem('gcd-groupId');
      const url = new URL(request.url);
      if (gid && !url.searchParams.has('new')) return redirect('/v2/dashboard');
      return null;
    },
  },
  {
    path: '/v2/join/:groupId',
    Component: JoinGroupV2,
  },
  {
    path: '/app',
    Component: Layout,
    loader: () => {
      const gid = localStorage.getItem('gcd-groupId');
      if (!gid) return redirect('/');
      return null;
    },
    children: [
      { index: true, loader: () => redirect('/app/dashboard') },
      { path: 'dashboard', Component: Dashboard },
      { path: 'expenses', Component: ExpenseHistory },
      { path: 'add-expense', Component: AddExpense },
      { path: 'scan', Component: ReceiptScan },
      { path: 'settlement', Component: Settlement },
      { path: 'analytics', Component: Analytics },
      { path: 'members', Component: Members },
      { path: 'personal/:memberId', Component: PersonalExpenses },
      { path: 'group-buy', Component: GroupBuyForm },
      { path: 'group-buy/:groupBuyId', Component: GroupBuyDetail },
      { path: 'settings', Component: Settings },
      { path: 'theme', Component: ThemeSettings },
    ],
  },
  {
    path: '/v2',
    Component: V2Layout,
    loader: () => {
      const gid = localStorage.getItem('gcd-groupId');
      if (!gid) return redirect('/v2/start');
      return null;
    },
    children: [
      { index: true, loader: () => redirect('/v2/dashboard') },
      { path: 'dashboard', Component: DashboardV2 },
      { path: 'expenses', Component: ExpenseHistoryV2 },
      { path: 'add-expense', Component: AddExpenseV2 },
      { path: 'scan', Component: ReceiptScanV2 },
      { path: 'settlement', Component: SettlementV2 },
      { path: 'analytics', Component: AnalyticsV2 },
      { path: 'members', Component: MembersV2 },
      { path: 'personal/:memberId', Component: PersonalExpensesV2 },
      { path: 'group-buy', Component: GroupBuyFormV2 },
      { path: 'group-buy/:groupBuyId', Component: GroupBuyDetailV2 },
      { path: 'settings', Component: SettingsV2 },
      { path: 'theme', Component: ThemeSettingsV2 },
    ],
  },
  {
    path: '/components',
    Component: ComponentLibrary,
  },
], { basename });
