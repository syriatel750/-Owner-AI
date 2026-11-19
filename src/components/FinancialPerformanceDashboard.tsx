import React, { useMemo } from 'react';
import { CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { OWNER_DATA, filterTransactions, fmt2, sumRows } from '../data/ownerData';
import { SurfaceCard } from './UiPrimitives';

type Point = {
  period: string;
  label: string;
  grossProfit: number | null;
  grossMargin: number | null;
  contribution: number | null;
  contributionMargin: number | null;
};

const MONEY = (n: number | null) => n === null ? 'غير متاح' : `${fmt2(n)} مليون د.ع`;
const PERCENT = (n: number | null) => n === null ? 'غير متاح' : `${fmt2(n)}%`;
const BLUE = '#2277CF';
const GREEN = '#07856C';

export function FinancialPerformanceDashboard({ selectedPeriod }: { selectedPeriod: string }) {
  const series = useMemo<Point[]>(() => {
    const evidence = OWNER_DATA.contributionAnalysis;
    const complete =
      evidence.coverage.complete &&
      evidence.coverage.invalidRows === 0 &&
      evidence.coverage.productsWithCompleteCost === evidence.coverage.productsTotal;
    return OWNER_DATA.months.map((month) => {
      const rows = filterTransactions(OWNER_DATA.transactions, { period: month.id });
      const totals = sumRows(rows);
      const hasSales = rows.length > 0 && totals.revenue !== 0;
      // Never invent historical variable service costs. Contribution is only valid in its source period.
      const hasContribution = complete && hasSales && month.id === evidence.period && evidence.totals.revenue > 0;
      return {
        period: month.id,
        label: month.name,
        grossProfit: hasSales ? totals.gp : null,
        grossMargin: hasSales ? totals.gp / totals.revenue * 100 : null,
        contribution: hasContribution ? evidence.totals.contribution : null,
        contributionMargin: hasContribution ? evidence.totals.contribution / evidence.totals.revenue * 100 : null,
      };
    });
  }, []);
  const current = series.find((item) => item.period === selectedPeriod);
  const available = series.filter((item) => item.contribution !== null).length;

  const tooltipContent = ({ active, payload, label, unit }: {
    active?: boolean;
    payload?: ReadonlyArray<{ name?: string; value?: unknown; color?: string }>;
    label?: string | number;
    unit: 'money' | 'percent';
  }) => !active || !payload?.length ? null : (
    <div dir="rtl" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <div className="mb-2 font-bold text-slate-900">{label}</div>
      {payload.map((p, idx) => (
        <div key={idx} className="flex justify-between gap-4 text-slate-600">
          <span>{p.name}</span>
          <strong style={{ color: p.color }}>
            {unit === 'money' ? MONEY(typeof p.value === 'number' ? p.value : null) : PERCENT(typeof p.value === 'number' ? p.value : null)}
          </strong>
        </div>
      ))}
    </div>
  );

  return (
    <SurfaceCard title="لوحة مؤشرات الأداء المالي" subtitle="تطور الربح الإجمالي وهامش المساهمة عبر الفترات المالية">
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: 'الربح الإجمالي', value: MONEY(current?.grossProfit ?? null), color: BLUE },
            { label: 'هامش الربح الإجمالي', value: PERCENT(current?.grossMargin ?? null), color: BLUE },
            { label: 'هامش المساهمة', value: PERCENT(current?.contributionMargin ?? null), color: GREEN },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">{item.label} · الفترة المختارة</p>
              <p className="mt-1 text-lg font-extrabold" style={{ color: item.color }}>{item.value}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <section className="min-w-0 rounded-xl border border-slate-200 p-3" aria-label="اتجاه الأرباح والمساهمة">
            <h3 className="mb-2 text-sm font-bold text-slate-800">الأرباح والمساهمة · مليون د.ع</h3>
            <div dir="ltr" className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={series} margin={{ top: 12, right: 8, left: 3, bottom: 5 }}>
                  <CartesianGrid stroke="#DBE4EF" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis width={43} tick={{ fontSize: 11 }} tickFormatter={(v: number) => fmt2(v)} />
                  <Tooltip content={(props) => tooltipContent({ active: props.active, payload: props.payload, label: props.label, unit: 'money' })} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line name="الربح الإجمالي" dataKey="grossProfit" stroke={BLUE} strokeWidth={3} dot={{ r: 4 }} connectNulls={false} />
                  <Line name="المساهمة (قيمة)" dataKey="contribution" stroke={GREEN} strokeWidth={3} dot={{ r: 5 }} connectNulls={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section className="min-w-0 rounded-xl border border-slate-200 p-3" aria-label="تطور هوامش الربحية">
            <h3 className="mb-2 text-sm font-bold text-slate-800">هوامش الأداء · %</h3>
            <div dir="ltr" className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={series} margin={{ top: 12, right: 8, left: 3, bottom: 5 }}>
                  <CartesianGrid stroke="#DBE4EF" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis width={43} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${fmt2(v)}%`} />
                  <Tooltip content={(props) => tooltipContent({ active: props.active, payload: props.payload, label: props.label, unit: 'percent' })} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line name="هامش الربح الإجمالي" dataKey="grossMargin" stroke={BLUE} strokeWidth={3} dot={{ r: 4 }} connectNulls={false} />
                  <Line name="هامش المساهمة" dataKey="contributionMargin" stroke={GREEN} strokeWidth={3} dot={{ r: 5 }} connectNulls={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
          {OWNER_DATA.meta.sourceWarning}
          {' '}تتوفر تكاليف الخدمة المتغيرة اللازمة لاحتساب هامش المساهمة لفترة {OWNER_DATA.contributionAnalysis.period} فقط
          ({available} من {series.length} أشهر). لا تُملأ الأشهر الأخرى بتقديرات افتراضية.
          الربح الإجمالي وهامش المساهمة ليسا صافي الربح بعد المصروفات الثابتة والتمويل والضرائب.
        </p>
      </div>
    </SurfaceCard>
  );
}
