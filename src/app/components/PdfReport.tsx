import React, { forwardRef } from 'react';
import { useApp } from '../context/AppContext';
import { useT } from '../i18n/I18nContext';
import {
  CATEGORY_CONFIG, FUND_PAYER_ID,
  CategoryType, splitAmountEvenly,
} from '../data/sampleData';

/* ─────────────────────── styles ─────────────────────── */
const PAGE: React.CSSProperties = {
  fontFamily: "'Noto Sans TC', 'Noto Sans JP', 'Hiragino Kaku Gothic ProN', sans-serif",
  color: '#1a1a1a',
  background: '#fff',
  padding: '32px 36px',
  maxWidth: 794,        // ≈ A4 width px
  lineHeight: 1.55,
  fontSize: 12,
};

const H1: React.CSSProperties = { fontSize: 22, fontWeight: 900, margin: '0 0 4px' };
const H2: React.CSSProperties = {
  fontSize: 14, fontWeight: 800, margin: '28px 0 10px',
  borderBottom: '2px solid #DD843C', paddingBottom: 4,
};
const TH: React.CSSProperties = {
  textAlign: 'left', padding: '6px 8px', fontWeight: 700,
  borderBottom: '1px solid #ddd', background: '#f7f0ea', fontSize: 11,
};
const TD: React.CSSProperties = { padding: '5px 8px', borderBottom: '1px solid #eee', fontSize: 11 };
const TDR: React.CSSProperties = { ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
const BADGE: React.CSSProperties = {
  display: 'inline-block', padding: '1px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700,
};
const POS: React.CSSProperties = { ...BADGE, background: '#e8f5e0', color: '#2d7a0d' };
const NEG: React.CSSProperties = { ...BADGE, background: '#fde8e6', color: '#c0392b' };
const ZERO: React.CSSProperties = { ...BADGE, background: '#eee', color: '#888' };

function ColorBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ width: 100, height: 10, background: '#eee', borderRadius: 5, overflow: 'hidden', display: 'inline-block', verticalAlign: 'middle' }}>
      <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 5 }} />
    </div>
  );
}

/* ─────────────── component ─────────────── */
export const PdfReport = forwardRef<HTMLDivElement>(function PdfReport(_props, ref) {
  const {
    groupName, members, expenses, contributions,
    balances, totalSpent, settlements,
    fundBalance, fundSpent, totalContributions, fmt,
  } = useApp();
  const { t } = useT();

  const today = new Date().toLocaleDateString();

  // ── Category stats ──
  const catTotals: Record<string, number> = {};
  expenses.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount; });
  const catEntries = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);

  // ── Expense list sorted by date desc ──
  const sortedExpenses = [...expenses].sort((a, b) => b.date.localeCompare(a.date));

  // ── Advance (individual-paid) expenses ──
  const advanceExpenses = expenses.filter(e => e.paidBy !== FUND_PAYER_ID);

  // ── Member map ──
  const mMap = Object.fromEntries(members.map(m => [m.id, m]));

  return (
    <div ref={ref} style={PAGE}>
      {/* ══════ Section 1: Cover / Overview ══════ */}
      <h1 style={H1}>{groupName} — {t.pdf.title}</h1>
      <p style={{ color: '#888', fontSize: 11, margin: '0 0 16px' }}>
        {t.pdf.generatedOn}: {today}
      </p>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
        <Stat label={t.pdf.totalExpenses} value={fmt(totalSpent)} />
        <Stat label={t.pdf.memberCount} value={`${members.length}`} />
        <Stat label={t.pdf.totalFund} value={fmt(totalContributions)} />
        <Stat label={t.pdf.fundBalance} value={fmt(fundBalance)} />
      </div>

      {/* ══════ Section 2: Settlement Summary ══════ */}
      <h2 style={H2}>{t.pdf.settlementSummary}</h2>

      {/* Balance table */}
      <p style={{ fontWeight: 700, fontSize: 12, margin: '12px 0 6px' }}>{t.pdf.balanceTable}</p>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead>
          <tr>
            <th style={TH}>{t.pdf.name}</th>
            <th style={{ ...TH, textAlign: 'right' }}>{t.pdf.contributed}</th>
            <th style={{ ...TH, textAlign: 'right' }}>{t.pdf.paid}</th>
            <th style={{ ...TH, textAlign: 'right' }}>{t.pdf.shouldPay}</th>
            <th style={{ ...TH, textAlign: 'right' }}>{t.pdf.balance}</th>
          </tr>
        </thead>
        <tbody>
          {balances.map(b => (
            <tr key={b.member.id}>
              <td style={TD}>{b.member.name}</td>
              <td style={TDR}>{fmt(b.contributed)}</td>
              <td style={TDR}>{fmt(b.paid)}</td>
              <td style={TDR}>{fmt(b.shouldPay)}</td>
              <td style={TDR}>
                <span style={b.balance > 0 ? POS : b.balance < 0 ? NEG : ZERO}>
                  {b.balance > 0 ? '+' : ''}{fmt(b.balance)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Transfer suggestions */}
      <p style={{ fontWeight: 700, fontSize: 12, margin: '12px 0 6px' }}>{t.pdf.transferSuggestions}</p>
      {settlements.length === 0 ? (
        <p style={{ color: '#888', fontSize: 11 }}>{t.pdf.noData}</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
          <thead>
            <tr>
              <th style={TH}>{t.pdf.from}</th>
              <th style={TH}>{t.pdf.to}</th>
              <th style={{ ...TH, textAlign: 'right' }}>{t.pdf.amount}</th>
            </tr>
          </thead>
          <tbody>
            {settlements.map((s, i) => (
              <tr key={i}>
                <td style={TD}>{mMap[s.fromId]?.name ?? s.fromId}</td>
                <td style={TD}>{mMap[s.toId]?.name ?? s.toId}</td>
                <td style={TDR}>{fmt(s.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ══════ Section 3: Fund Contribution Records ══════ */}
      <h2 style={H2}>{t.pdf.contribRecords}</h2>
      {contributions.length === 0 ? (
        <p style={{ color: '#888', fontSize: 11 }}>{t.pdf.noData}</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
          <thead>
            <tr>
              <th style={TH}>{t.pdf.date}</th>
              <th style={TH}>{t.pdf.name}</th>
              <th style={{ ...TH, textAlign: 'right' }}>{t.pdf.amount}</th>
              <th style={TH}>{t.pdf.description}</th>
            </tr>
          </thead>
          <tbody>
            {[...contributions].sort((a, b) => b.date.localeCompare(a.date)).map(c => (
              <tr key={c.id}>
                <td style={TD}>{c.date}</td>
                <td style={TD}>{mMap[c.memberId]?.name ?? t.common.unknown}</td>
                <td style={TDR}>{fmt(c.amount)}</td>
                <td style={TD}>{c.note || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ══════ Section 3b: Advance Payment Records ══════ */}
      <h2 style={H2}>{t.pdf.advanceRecords}</h2>
      {advanceExpenses.length === 0 ? (
        <p style={{ color: '#888', fontSize: 11 }}>{t.pdf.noData}</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
          <thead>
            <tr>
              <th style={TH}>{t.pdf.date}</th>
              <th style={TH}>{t.pdf.payer}</th>
              <th style={TH}>{t.pdf.description}</th>
              <th style={{ ...TH, textAlign: 'right' }}>{t.pdf.amount}</th>
              <th style={{ ...TH, textAlign: 'right' }}>{t.pdf.splitCount}</th>
            </tr>
          </thead>
          <tbody>
            {advanceExpenses
              .sort((a, b) => b.date.localeCompare(a.date))
              .map(e => (
                <tr key={e.id}>
                  <td style={TD}>{e.date}</td>
                  <td style={TD}>{mMap[e.paidBy]?.name ?? t.common.unknown}</td>
                  <td style={TD}>{e.description}</td>
                  <td style={TDR}>{fmt(e.amount)}</td>
                  <td style={TDR}>{e.splitAmong.length}</td>
                </tr>
              ))}
          </tbody>
        </table>
      )}

      {/* ══════ Section 4: Expense List ══════ */}
      <h2 style={H2}>{t.pdf.expenseList}</h2>
      {sortedExpenses.length === 0 ? (
        <p style={{ color: '#888', fontSize: 11 }}>{t.pdf.noData}</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
          <thead>
            <tr>
              <th style={TH}>{t.pdf.date}</th>
              <th style={TH}>{t.pdf.category}</th>
              <th style={TH}>{t.pdf.description}</th>
              <th style={{ ...TH, textAlign: 'right' }}>{t.pdf.amount}</th>
              <th style={TH}>{t.pdf.payer}</th>
              <th style={{ ...TH, textAlign: 'right' }}>{t.pdf.splitCount}</th>
            </tr>
          </thead>
          <tbody>
            {sortedExpenses.map(e => (
              <tr key={e.id}>
                <td style={TD}>{e.date}</td>
                <td style={TD}>
                  <span style={{
                    display: 'inline-block', width: 8, height: 8, borderRadius: 4, marginRight: 4,
                    background: CATEGORY_CONFIG[e.category]?.color ?? '#999', verticalAlign: 'middle',
                  }} />
                  {t.categories[e.category as CategoryType] ?? e.category}
                </td>
                <td style={TD}>{e.description}</td>
                <td style={TDR}>{fmt(e.amount)}</td>
                <td style={TD}>
                  {e.paidBy === FUND_PAYER_ID
                    ? t.common.fundDeduct
                    : mMap[e.paidBy]?.name ?? t.common.unknown}
                </td>
                <td style={TDR}>{e.splitAmong.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ══════ Section 5: Category Analysis ══════ */}
      <h2 style={H2}>{t.pdf.categoryAnalysis}</h2>
      <p style={{ fontWeight: 700, fontSize: 12, margin: '12px 0 6px' }}>{t.pdf.categoryBreakdown}</p>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead>
          <tr>
            <th style={TH}>{t.pdf.category}</th>
            <th style={{ ...TH, textAlign: 'right' }}>{t.pdf.amount}</th>
            <th style={{ ...TH, textAlign: 'right' }}>{t.pdf.percentage}</th>
            <th style={TH}></th>
          </tr>
        </thead>
        <tbody>
          {catEntries.map(([cat, total]) => {
            const pct = totalSpent > 0 ? (total / totalSpent) * 100 : 0;
            const cfg = CATEGORY_CONFIG[cat as CategoryType];
            return (
              <tr key={cat}>
                <td style={TD}>
                  <span style={{
                    display: 'inline-block', width: 8, height: 8, borderRadius: 4, marginRight: 4,
                    background: cfg?.color ?? '#999', verticalAlign: 'middle',
                  }} />
                  {t.categories[cat as CategoryType] ?? cat}
                </td>
                <td style={TDR}>{fmt(total)}</td>
                <td style={TDR}>{pct.toFixed(1)}%</td>
                <td style={TD}><ColorBar pct={pct} color={cfg?.color ?? '#999'} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Member comparison */}
      <p style={{ fontWeight: 700, fontSize: 12, margin: '12px 0 6px' }}>{t.pdf.memberComparison}</p>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead>
          <tr>
            <th style={TH}>{t.pdf.name}</th>
            <th style={{ ...TH, textAlign: 'right' }}>{t.pdf.paid}</th>
            <th style={{ ...TH, textAlign: 'right' }}>{t.pdf.shouldPay}</th>
            <th style={{ ...TH, textAlign: 'right' }}>{t.pdf.balance}</th>
          </tr>
        </thead>
        <tbody>
          {balances.map(b => (
            <tr key={b.member.id}>
              <td style={TD}>{b.member.name}</td>
              <td style={TDR}>{fmt(b.contributed + b.paid)}</td>
              <td style={TDR}>{fmt(b.shouldPay)}</td>
              <td style={TDR}>
                <span style={b.balance > 0 ? POS : b.balance < 0 ? NEG : ZERO}>
                  {b.balance > 0 ? '+' : ''}{fmt(b.balance)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <p style={{ textAlign: 'center', color: '#aaa', fontSize: 9, marginTop: 24, borderTop: '1px solid #eee', paddingTop: 8 }}>
        {groupName} · {t.pdf.generatedOn} {today}
      </p>
    </div>
  );
});

/* ── Small stat box ── */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      flex: '1 1 140px', padding: '10px 14px',
      background: '#fdf6f0', borderRadius: 10, border: '1px solid #f0e0d0',
    }}>
      <div style={{ fontSize: 10, color: '#888' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#DD843C' }}>{value}</div>
    </div>
  );
}
