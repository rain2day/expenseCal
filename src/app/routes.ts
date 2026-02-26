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
    path: '/components',
    Component: ComponentLibrary,
  },
], { basename });