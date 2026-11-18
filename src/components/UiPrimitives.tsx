import React from 'react';
import { fmt } from '../data/ownerData';

export function SurfaceCard({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-5 sm:p-6 ${className}`}>
      {(title || subtitle || action) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-base font-bold text-slate-900">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function KpiMetricCard({
  label,
  value,
  unit,
  subtext,
  varianceText,
  varianceTone = 'neutral',
  badgeText,
}: {
  label: string;
  value: number | null;
  unit: string;
  subtext?: string;
  varianceText?: string;
  varianceTone?: 'good' | 'bad' | 'warn' | 'neutral';
  badgeText?: string;
}) {
  const toneClasses = {
    good: 'text-emerald-700',
    bad: 'text-rose-700',
    warn: 'text-amber-700',
    neutral: 'text-slate-600',
  }[varianceTone];

  return (
    <article className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5">
      <div>
        <div className="text-xs font-semibold text-slate-500">{label}</div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-num text-2xl font-bold text-slate-900 sm:text-[28px]">
            {value === null ? '—' : fmt(value)}
          </span>
          <span className="text-xs text-slate-500">{unit}</span>
        </div>
        {subtext && <div className="mt-1 text-xs text-slate-500">{subtext}</div>}
      </div>

      {(varianceText || badgeText) && (
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
          {varianceText && <span className={`font-semibold ${toneClasses}`}>{varianceText}</span>}
          {badgeText && <span className={`font-num font-bold ${toneClasses}`}>{badgeText}</span>}
        </div>
      )}
    </article>
  );
}

export function StatusNotice({
  tone = 'neutral',
  title,
  children,
}: {
  tone?: 'neutral' | 'warning' | 'danger' | 'success';
  title?: string;
  children: React.ReactNode;
}) {
  const styles = {
    neutral: 'border-slate-200 bg-slate-50 text-slate-700',
    warning: 'border-amber-200 bg-amber-50/70 text-amber-950',
    danger: 'border-rose-200 bg-rose-50/70 text-rose-950',
    success: 'border-emerald-200 bg-emerald-50/70 text-emerald-950',
  }[tone];

  return (
    <div className={`rounded-xl border px-4 py-3.5 text-xs leading-relaxed ${styles}`}>
      {title && <div className="mb-1 font-bold">{title}</div>}
      <div>{children}</div>
    </div>
  );
}

export function StateLabel({
  tone,
  label,
}: {
  tone: 'danger' | 'warning' | 'success' | 'neutral';
  label: string;
}) {
  const cls = {
    danger: 'border-rose-200 bg-rose-50 text-rose-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    neutral: 'border-sky-200 bg-sky-50 text-sky-800',
  }[tone];
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}
