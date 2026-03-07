import React from 'react';
import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';

export function V2PageHeader({
  kicker,
  title,
  description,
  actions,
  meta,
}: {
  kicker?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <section className="v2-panel v2-panel-strong p-5 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          {kicker ? <p className="v2-kicker">{kicker}</p> : null}
          <h1 className="mt-2 text-3xl font-black text-white md:text-[2.35rem]">{title}</h1>
          {description ? (
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/64">{description}</p>
          ) : null}
          {meta ? <div className="mt-4 flex flex-wrap gap-2">{meta}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}

export function V2Panel({
  title,
  eyebrow,
  action,
  children,
  className = '',
}: {
  title: string;
  eyebrow?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`v2-panel p-5 md:p-6 ${className}`.trim()}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? <p className="v2-kicker">{eyebrow}</p> : null}
          <h2 className="mt-2 text-lg font-black text-white">{title}</h2>
        </div>
        {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function V2MetricGrid({
  items,
}: {
  items: Array<{ label: string; value: string; note?: string; accentClassName?: string }>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="v2-metric-card p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/44">{item.label}</p>
          <p className={`mt-3 text-2xl font-black text-white v2-number ${item.accentClassName ?? ''}`.trim()}>
            {item.value}
          </p>
          {item.note ? <p className="mt-2 text-sm leading-6 text-white/56">{item.note}</p> : null}
        </div>
      ))}
    </div>
  );
}

export function V2List({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`v2-list ${className}`.trim()}>{children}</div>;
}

export function V2ListRow({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`v2-list-row ${className}`.trim()}>{children}</div>;
}

export function V2EmptyState({
  title,
  detail,
  actionLabel,
  actionTo,
}: {
  title: string;
  detail: string;
  actionLabel?: string;
  actionTo?: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] px-5 py-8 text-center">
      <p className="text-lg font-bold text-white/92">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/56">{detail}</p>
      {actionLabel && actionTo ? (
        <Link to={actionTo} className="v2-action-button v2-action-button-primary mt-5 inline-flex">
          {actionLabel}
          <ArrowRight size={15} strokeWidth={2.2} />
        </Link>
      ) : null}
    </div>
  );
}

export function V2Token({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'warm' | 'cool' | 'success' | 'danger';
}) {
  const className = {
    neutral: 'v2-chip',
    warm: 'v2-chip v2-chip-warm',
    cool: 'v2-chip v2-chip-cool',
    success: 'v2-chip border-[#72a857]/30 bg-[#72a857]/12 text-[#d9f2d3]',
    danger: 'v2-chip border-[#d05242]/30 bg-[#d05242]/12 text-[#ffcdc6]',
  }[tone];

  return <span className={className}>{children}</span>;
}

export function V2SplitLayout({
  main,
  side,
}: {
  main: React.ReactNode;
  side: React.ReactNode;
}) {
  return <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.88fr)]">{main}{side}</div>;
}
