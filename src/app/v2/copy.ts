import type { Locale } from '../i18n/types';

type V2Copy = {
  previewBadge: string;
  previewNote: string;
  overview: string;
  currentApp: string;
  currentGroup: string;
  currentDashboard: string;
  groupMeta: (members: number, expenses: number) => string;
  budgetRunway: string;
  needsAttention: string;
  allClear: string;
  allClearDetail: string;
  fundNegative: string;
  fundNegativeDetail: string;
  fundLow: string;
  fundLowDetail: string;
  memberAdvance: string;
  memberAdvanceDetail: string;
  pendingTransfers: string;
  pendingTransfersDetail: string;
  addFirstExpense: string;
  addFirstExpenseDetail: string;
  snapshot: string;
  biggestExpense: string;
  latestTopUp: string;
  topContributor: string;
  settlementQueue: string;
  noPendingTransfers: string;
  balanceBoard: string;
  shouldReceive: string;
  shouldPay: string;
  topUps: string;
  noTopUps: string;
  latest: string;
  fundUsed: string;
  compareWithV1: string;
  compareTitle: string;
};

const copyByLocale: Record<Locale, V2Copy> = {
  zh: {
    previewBadge: 'V2 預覽',
    previewNote: '平行版本，只重做資訊層級，同 v1 共用同一組資料。',
    overview: '總覽',
    currentApp: '現有版本',
    currentGroup: '目前群組',
    currentDashboard: 'v1 Dashboard',
    groupMeta: (members, expenses) => `${members} 位成員 · ${expenses} 筆支出`,
    budgetRunway: '預算跑道',
    needsAttention: '而家要處理',
    allClear: '目前無急項',
    allClearDetail: '基金、結算同最近活動都正常，可以繼續記帳。',
    fundNegative: '基金已透支',
    fundNegativeDetail: '優先補回公數，之後先處理個人結算。',
    fundLow: '基金餘額偏低',
    fundLowDetail: '建議安排追加公數，避免之後再由成員墊付。',
    memberAdvance: '仍有成員墊付未還',
    memberAdvanceDetail: '結算頁要先處理應收應付，避免欠款越積越多。',
    pendingTransfers: '仲有交易未完成',
    pendingTransfersDetail: '最少交易結清已計好，去結算頁逐筆核對即可。',
    addFirstExpense: '先記第一筆支出',
    addFirstExpenseDetail: '有第一筆資料之後，餘額、結算同分析先有意思。',
    snapshot: '即時快照',
    biggestExpense: '最大單筆支出',
    latestTopUp: '最近一次入數',
    topContributor: '目前入數最多',
    settlementQueue: '待處理結算',
    noPendingTransfers: '目前無待處理交易',
    balanceBoard: '成員結餘',
    shouldReceive: '應收較多',
    shouldPay: '應付較多',
    topUps: '公數入數',
    noTopUps: '尚未有入數紀錄',
    latest: '最近',
    fundUsed: '基金已出',
    compareWithV1: '可隨時跳返 v1 對照流程。',
    compareTitle: '版本對照',
  },
  en: {
    previewBadge: 'V2 Preview',
    previewNote: 'Parallel version focused on information hierarchy. It shares the same live data as v1.',
    overview: 'Overview',
    currentApp: 'Current app',
    currentGroup: 'Current group',
    currentDashboard: 'v1 dashboard',
    groupMeta: (members, expenses) => `${members} members · ${expenses} expenses`,
    budgetRunway: 'Budget runway',
    needsAttention: 'Needs attention',
    allClear: 'Nothing urgent right now',
    allClearDetail: 'Fund balance, settlements, and recent activity are all in a stable range.',
    fundNegative: 'Fund is overspent',
    fundNegativeDetail: 'Top up the shared cash first, then clear personal transfers.',
    fundLow: 'Fund balance is running low',
    fundLowDetail: 'A fund top-up now will prevent more member advances later.',
    memberAdvance: 'Members are still fronting costs',
    memberAdvanceDetail: 'Use settlement next so reimbursements do not keep stacking up.',
    pendingTransfers: 'Transfers are still pending',
    pendingTransfersDetail: 'The minimum-transfer plan is already computed. Review and mark them off.',
    addFirstExpense: 'Add the first expense',
    addFirstExpenseDetail: 'Balances and settlement only become meaningful after the first shared spend.',
    snapshot: 'Live snapshot',
    biggestExpense: 'Largest expense',
    latestTopUp: 'Latest top-up',
    topContributor: 'Top contributor',
    settlementQueue: 'Settlement queue',
    noPendingTransfers: 'No pending transfers right now',
    balanceBoard: 'Member balances',
    shouldReceive: 'Should receive',
    shouldPay: 'Should pay',
    topUps: 'Fund top-ups',
    noTopUps: 'No top-up records yet',
    latest: 'Latest',
    fundUsed: 'Paid from fund',
    compareWithV1: 'Jump back to v1 any time to compare the working flow.',
    compareTitle: 'Compare versions',
  },
  ja: {
    previewBadge: 'V2 プレビュー',
    previewNote: 'v1 を残したまま、情報の優先順位だけを作り直した並行版です。',
    overview: '概要',
    currentApp: '現行版',
    currentGroup: '現在のグループ',
    currentDashboard: 'v1 ダッシュボード',
    groupMeta: (members, expenses) => `${members}人のメンバー · ${expenses}件の支出`,
    budgetRunway: '予算ランウェイ',
    needsAttention: '今やること',
    allClear: '急ぎの項目はありません',
    allClearDetail: '資金、精算、最近の動きは安定しています。',
    fundNegative: '共同資金が赤字です',
    fundNegativeDetail: '先に共同資金を補充し、その後に個人間精算を進めてください。',
    fundLow: '共同資金の残高が少ないです',
    fundLowDetail: '今のうちに追加入金すると立替えを増やさずに済みます。',
    memberAdvance: '未精算の立替えがあります',
    memberAdvanceDetail: '精算ページで受取と支払を先に整理してください。',
    pendingTransfers: '未完了の送金があります',
    pendingTransfersDetail: '最小送金プランは計算済みです。精算ページで確認してください。',
    addFirstExpense: '最初の支出を追加してください',
    addFirstExpenseDetail: '最初の共有支出が入ってから残高や精算が意味を持ちます。',
    snapshot: 'ライブスナップショット',
    biggestExpense: '最大の支出',
    latestTopUp: '最新の入金',
    topContributor: '入金額トップ',
    settlementQueue: '精算キュー',
    noPendingTransfers: '未処理の送金はありません',
    balanceBoard: 'メンバー残高',
    shouldReceive: '受け取り側',
    shouldPay: '支払い側',
    topUps: '共同資金の入金',
    noTopUps: '入金記録はまだありません',
    latest: '最新',
    fundUsed: '共同資金支出',
    compareWithV1: '必要ならいつでも v1 に戻って動線を比較できます。',
    compareTitle: 'バージョン比較',
  },
};

export function getV2Copy(locale: Locale): V2Copy {
  return copyByLocale[locale] ?? copyByLocale.en;
}
