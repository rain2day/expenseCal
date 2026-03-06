import type { Contribution, Expense } from '../data/sampleData';

export function toRecentTime(entry: { date: string; createdAt?: string }) {
  return Date.parse(entry.createdAt ?? entry.date) || 0;
}

export function formatDisplayDate(dateLike: string | undefined, locale: string) {
  if (!dateLike) return '-';
  const date = new Date(dateLike.length > 10 ? dateLike : `${dateLike}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateLike;
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date);
}

export function groupExpensesByDateLabel(
  expenses: Expense[],
  labels: { today: string; yesterday: string },
) {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const groups: Record<string, Expense[]> = {};

  expenses.forEach((expense) => {
    const label = expense.date === today
      ? labels.today
      : expense.date === yesterday
        ? labels.yesterday
        : expense.date;
    if (!groups[label]) groups[label] = [];
    groups[label].push(expense);
  });

  return groups;
}

export interface TrendPoint {
  day: string;
  date: string;
  daily: number;
  spent: number;
  contrib: number;
  budget: number;
  avg: number;
}

export function computeTimeSeries(expenses: Expense[], contributions: Contribution[], budget: number): TrendPoint[] {
  if (expenses.length === 0) return [];

  const allDates = new Set<string>();
  expenses.forEach((expense) => allDates.add(expense.date));
  contributions.forEach((contribution) => allDates.add(contribution.date));
  const sortedDates = [...allDates].sort();

  const expensesByDay: Record<string, number> = {};
  expenses.forEach((expense) => {
    expensesByDay[expense.date] = (expensesByDay[expense.date] || 0) + expense.amount;
  });

  const contributionsByDay: Record<string, number> = {};
  contributions.forEach((contribution) => {
    contributionsByDay[contribution.date] = (contributionsByDay[contribution.date] || 0) + contribution.amount;
  });

  let cumulativeSpent = 0;
  let cumulativeContrib = 0;

  return sortedDates.map((date, index) => {
    const dailySpend = expensesByDay[date] || 0;
    const dailyContrib = contributionsByDay[date] || 0;
    cumulativeSpent += dailySpend;
    cumulativeContrib += dailyContrib;
    const day = new Date(date);
    const label = `${day.getMonth() + 1}/${day.getDate()}`;

    return {
      day: label,
      date,
      daily: dailySpend,
      spent: cumulativeSpent,
      contrib: cumulativeContrib,
      budget,
      avg: Math.round(cumulativeSpent / (index + 1)),
    };
  });
}

export function trendStats(data: TrendPoint[]) {
  if (data.length === 0) return null;

  const dailyAmounts = data.map((item) => item.daily).filter((amount) => amount > 0);
  const peakDay = data.reduce((max, item) => (item.daily > max.daily ? item : max), data[0]);
  const totalSpent = data[data.length - 1].spent;
  const totalContrib = data[data.length - 1].contrib;
  const daysWithSpending = dailyAmounts.length;
  const avgDaily = daysWithSpending > 0 ? Math.round(totalSpent / daysWithSpending) : 0;

  return {
    peakDay,
    totalSpent,
    totalContrib,
    avgDaily,
    daysWithSpending,
    totalDays: data.length,
  };
}
