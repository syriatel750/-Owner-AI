import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Cell,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { fmt, fmt2, pct, signFmt } from '../data/ownerData';

export const CHART_COLORS = {
  cobalt: '#1D63B8',
  teal: '#0F766E',
  emerald: '#059669',
  amber: '#D97706',
  rose: '#DC2626',
  slate: '#64748B',
  slateLight: '#94A3B8',
  grid: '#E2E8F0',
  text: '#475569',
};

const TOOLTIP_STYLE: React.CSSProperties = {
  direction: 'rtl',
  textAlign: 'right',
  fontFamily: 'IBM Plex Sans Arabic, sans-serif',
};

export function ChartEmpty({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 text-center">
      <div className="text-sm font-semibold text-slate-700">{title}</div>
      <div className="mt-1 text-xs text-slate-500">{subtitle}</div>
    </div>
  );
}

/* 1. Monthly Trend: Composed Area (Actual Rev) + Line (Plan Rev) + Bar (Gross Profit) */
export interface TrendPoint {
  period: string;
  label: string;
  revenue: number;
  planRevenue?: number;
  cogs?: number;
  gp: number;
  planGp?: number;
  margin?: number;
}

export function SalesProfitTrendChart({
  data,
  height = 280,
  showPlan = true,
}: {
  data: TrendPoint[];
  height?: number;
  showPlan?: boolean;
}) {
  if (!data.length) {
    return <ChartEmpty title="لا توجد بيانات زمنية" subtitle="يلزم توفر فترة واحدة على الأقل لعرض الاتجاه." />;
  }

  return (
    <div dir="ltr" className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 16, left: 4, bottom: 8 }}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.cobalt} stopOpacity={0.2} />
              <stop offset="95%" stopColor={CHART_COLORS.cobalt} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
            axisLine={{ stroke: CHART_COLORS.grid }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={(v) => fmt(v, 0)}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0]?.payload as TrendPoint;
              return (
                <div style={TOOLTIP_STYLE} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-md">
                  <div className="mb-1.5 font-bold text-slate-900">{label}</div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-600">صافي المبيعات:</span>
                      <span className="font-num font-semibold text-[#1D63B8]">{fmt(row.revenue)} مليون</span>
                    </div>
                    {showPlan && row.planRevenue !== undefined && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-600">خطة المبيعات:</span>
                        <span className="font-num text-slate-700">{fmt(row.planRevenue)} مليون</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-600">الربح الإجمالي:</span>
                      <span className="font-num font-semibold text-[#0F766E]">{fmt(row.gp)} مليون</span>
                    </div>
                    {showPlan && row.planGp !== undefined && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-600">خطة الربح:</span>
                        <span className="font-num text-slate-700">{fmt(row.planGp)} مليون</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-1">
                      <span className="text-slate-600">الهامش الإجمالي:</span>
                      <span className="font-num font-semibold text-slate-900">
                        {pct(row.revenue ? (100 * row.gp) / row.revenue : 0)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8, direction: 'rtl' }}
            formatter={(val) => <span className="text-slate-600 mx-1">{val}</span>}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            name="صافي المبيعات"
            stroke={CHART_COLORS.cobalt}
            strokeWidth={2.5}
            fill="url(#revGrad)"
          />
          {showPlan && (
            <Line
              type="monotone"
              dataKey="planRevenue"
              name="خطة المبيعات"
              stroke={CHART_COLORS.slateLight}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={{ r: 3, fill: CHART_COLORS.slateLight }}
            />
          )}
          <Bar dataKey="gp" name="الربح الإجمالي" fill={CHART_COLORS.teal} radius={[4, 4, 0, 0]} barSize={28} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* 2. True Cumulative Waterfall / Bridge SVG Chart */
export interface WaterfallStep {
  name: string;
  value: number;
  type: 'total' | 'delta';
  note?: string;
}

export function WaterfallBridgeSvg({
  steps,
  unit = 'مليون د.ع',
  ariaLabel = 'مخطط الشلال المالي',
}: {
  steps: WaterfallStep[];
  unit?: string;
  ariaLabel?: string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!steps.length) {
    return <ChartEmpty title="لا تتوفر قيم للرسم" subtitle="لا يمكن عرض الشلال بدون بيانات مصدر." />;
  }

  // Compute running cumulative positions
  let running = 0;
  const computed = steps.map((s) => {
    if (s.type === 'total') {
      const start = 0;
      const end = s.value;
      running = end;
      return { ...s, start, end, color: s.value < 0 ? CHART_COLORS.rose : CHART_COLORS.cobalt };
    }
    const start = running;
    const end = running + s.value;
    running = end;
    const color = s.value > 0 ? CHART_COLORS.emerald : s.value < 0 ? CHART_COLORS.rose : CHART_COLORS.slateLight;
    return { ...s, start, end, color };
  });

  const allVals = computed.flatMap((c) => [c.start, c.end, 0]);
  const minV = Math.min(...allVals);
  const maxV = Math.max(...allVals);
  const span = Math.max(1, maxV - minV);

  const w = 780;
  const h = 290;
  const top = 34;
  const bottom = 68;
  const left = 54;
  const right = 20;
  const plotH = h - top - bottom;
  const yOf = (v: number) => top + ((maxV - v) / span) * plotH;
  const zeroY = yOf(0);
  const slot = (w - left - right) / computed.length;
  const bw = Math.min(62, slot * 0.58);

  const ticks = Array.from({ length: 5 }, (_, i) => minV + (span * i) / 4);

  return (
    <div className="relative w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full min-w-[580px] select-none"
        role="img"
        aria-label={ariaLabel}
      >
        {/* Grid lines */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={left} x2={w - right} y1={yOf(t)} y2={yOf(t)} stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
            <text x={left - 8} y={yOf(t) + 4} textAnchor="end" fill={CHART_COLORS.text} fontSize="11" className="font-num">
              {fmt(t, 0)}
            </text>
          </g>
        ))}

        {/* Zero baseline */}
        <line x1={left} x2={w - right} y1={zeroY} y2={zeroY} stroke="#94A3B8" strokeWidth={1.2} />

        {/* Connectors & Bars */}
        {computed.map((c, i) => {
          const x0 = left + i * slot + (slot - bw) / 2;
          const yTop = Math.min(yOf(c.start), yOf(c.end));
          const barH = Math.max(3, Math.abs(yOf(c.end) - yOf(c.start)));
          const isPositiveLabel = c.type === 'total' ? c.end >= 0 : c.value >= 0;
          const labelY = isPositiveLabel ? yTop - 8 : yTop + barH + 15;
          const next = computed[i + 1];
          const isHover = hoveredIdx === i;

          return (
            <g
              key={c.name + i}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            >
              {/* Step connector line to next bar */}
              {next && (
                <line
                  x1={x0 + bw}
                  x2={left + (i + 1) * slot + (slot - bw) / 2}
                  y1={yOf(c.end)}
                  y2={yOf(c.end)}
                  stroke="#94A3B8"
                  strokeDasharray="3 3"
                  strokeWidth={1.2}
                />
              )}

              <rect
                x={x0}
                y={yTop}
                width={bw}
                height={barH}
                rx={4}
                fill={c.color}
                opacity={hoveredIdx !== null && !isHover ? 0.65 : 1}
              />

              <text
                x={x0 + bw / 2}
                y={labelY}
                textAnchor="middle"
                fill="#0F172A"
                fontSize="11.5"
                fontWeight="700"
                className="font-num"
              >
                {c.type === 'total' ? fmt(c.value) : signFmt(c.value)}
              </text>

              <text
                x={x0 + bw / 2}
                y={h - 24}
                textAnchor="middle"
                fill={CHART_COLORS.text}
                fontSize="11"
                fontWeight={isHover ? '700' : '500'}
              >
                {c.name}
              </text>
            </g>
          );
        })}
      </svg>

      {hoveredIdx !== null && computed[hoveredIdx] && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-700">
          <div>
            <span className="font-bold text-slate-900">{computed[hoveredIdx].name}</span>
            {computed[hoveredIdx].note && <span className="mr-2 text-slate-500">· {computed[hoveredIdx].note}</span>}
          </div>
          <div className="font-num font-bold text-slate-900">
            {computed[hoveredIdx].type === 'total' ? fmt(computed[hoveredIdx].value) : signFmt(computed[hoveredIdx].value)} {unit}
          </div>
        </div>
      )}
    </div>
  );
}

/* 3. Interactive Region Comparison Bar Chart (Click to select region) */
export interface RegionMetricRow {
  region: string;
  revenue: number;
  cogs: number;
  gp: number;
  margin: number;
  quantity: number;
  count?: number;
}

export function RegionComparisonBarChart({
  data,
  metric,
  unit,
  selectedRegion = 'all',
  onSelectRegion,
  height = 250,
}: {
  data: RegionMetricRow[];
  metric: 'revenue' | 'gp' | 'margin' | 'quantity';
  unit: string;
  selectedRegion?: string;
  onSelectRegion?: (region: string) => void;
  height?: number;
}) {
  if (!data.length) return <ChartEmpty title="لا توجد بيانات مناطق" subtitle="اختر فترة أخرى لعرض الأداء الجغرافي." />;

  return (
    <div dir="ltr" className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 14, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis
            dataKey="region"
            tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
            axisLine={{ stroke: CHART_COLORS.grid }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={46}
            tickFormatter={(v) => fmt(v, 0)}
          />
          <Tooltip
            cursor={{ fill: '#F1F5F9' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as RegionMetricRow;
              return (
                <div style={TOOLTIP_STYLE} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
                  <div className="mb-1 font-bold text-slate-900">{row.region}</div>
                  <div className="font-num font-semibold text-slate-800">
                    {fmt(row[metric], metric === 'quantity' ? 0 : 1)} {unit}
                  </div>
                  {onSelectRegion && <div className="mt-1 text-[11px] text-slate-500">اضغط لتحديد المنطقة</div>}
                </div>
              );
            }}
          />
          <Bar
            dataKey={metric}
            radius={[5, 5, 0, 0]}
            barSize={38}
            className={onSelectRegion ? 'cursor-pointer' : ''}
            onClick={(entry) => {
              const payload = entry?.payload as RegionMetricRow | undefined;
              if (onSelectRegion && payload?.region) {
                onSelectRegion(payload.region === selectedRegion ? 'all' : payload.region);
              }
            }}
          >
            {data.map((entry) => {
              const val = entry[metric];
              const isSelected = selectedRegion === entry.region;
              const fill =
                val < 0
                  ? CHART_COLORS.rose
                  : isSelected
                    ? CHART_COLORS.teal
                    : selectedRegion !== 'all'
                      ? '#94A3B8'
                      : CHART_COLORS.cobalt;
              return <Cell key={entry.region} fill={fill} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* 4. Region Grouped Chart (Revenue vs COGS vs GP) */
export function RegionGroupedPerfChart({ data, height = 270 }: { data: RegionMetricRow[]; height?: number }) {
  if (!data.length) return <ChartEmpty title="لا توجد بيانات مناطق" subtitle="لا تتوفر سجلات مبيعات في هذا النطاق." />;

  return (
    <div dir="ltr" className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 16, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis dataKey="region" tick={{ fill: CHART_COLORS.text, fontSize: 12 }} axisLine={{ stroke: CHART_COLORS.grid }} tickLine={false} />
          <YAxis tick={{ fill: CHART_COLORS.text, fontSize: 11 }} axisLine={false} tickLine={false} width={46} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as RegionMetricRow;
              return (
                <div style={TOOLTIP_STYLE} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-md">
                  <div className="mb-1.5 font-bold text-slate-900">{row.region}</div>
                  <div className="space-y-1">
                    <div className="flex justify-between gap-4"><span>المبيعات:</span><span className="font-num font-semibold text-[#1D63B8]">{fmt(row.revenue)} م</span></div>
                    <div className="flex justify-between gap-4"><span>تكلفة البضاعة:</span><span className="font-num text-slate-700">{fmt(row.cogs)} م</span></div>
                    <div className="flex justify-between gap-4"><span>الربح الإجمالي:</span><span className="font-num font-semibold text-[#0F766E]">{fmt(row.gp)} م</span></div>
                    <div className="flex justify-between gap-4 border-t border-slate-100 pt-1"><span>الهامش:</span><span className="font-num font-semibold">{pct(row.margin)}</span></div>
                  </div>
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6, direction: 'rtl' }} />
          <Bar dataKey="revenue" name="صافي المبيعات" fill={CHART_COLORS.cobalt} radius={[4, 4, 0, 0]} barSize={20} />
          <Bar dataKey="cogs" name="تكلفة البضاعة" fill="#CBD5E1" radius={[4, 4, 0, 0]} barSize={20} />
          <Bar dataKey="gp" name="الربح الإجمالي" fill={CHART_COLORS.teal} radius={[4, 4, 0, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* 5. Region x Product Margin Heatmap Matrix */
export interface HeatmapRow {
  productId: string;
  productName: string;
  cells: Record<string, { margin: number; gp: number; revenue: number; discount: number }>;
}

export function RegionProductHeatmap({
  regions,
  rows,
}: {
  regions: string[];
  rows: HeatmapRow[];
}) {
  const [selectedCell, setSelectedCell] = useState<{
    productName: string;
    region: string;
    margin: number;
    gp: number;
    revenue: number;
    discount: number;
  } | null>(null);

  if (!rows.length || !regions.length) {
    return <ChartEmpty title="لا تتوفر مصفوفة حرارية" subtitle="تتطلب بيانات للمناطق والأصناف معاً." />;
  }

  const cellStyle = (margin: number) => {
    if (margin < 0) return 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100';
    if (margin < 10) return 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100';
    if (margin < 24) return 'bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100';
    return 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100';
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[540px] border-separate border-spacing-1.5 text-xs">
          <thead>
            <tr>
              <th className="px-2 py-2 text-right font-semibold text-slate-500">الصنف</th>
              {regions.map((r) => (
                <th key={r} className="px-2 py-2 text-center font-semibold text-slate-700">
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.productId}>
                <td className="px-2 py-1.5 font-medium text-slate-800 whitespace-nowrap">{row.productName}</td>
                {regions.map((reg) => {
                  const cell = row.cells[reg];
                  if (!cell) {
                    return (
                      <td key={reg} className="rounded border border-slate-100 bg-slate-50 px-2 py-2 text-center text-slate-400">
                        —
                      </td>
                    );
                  }
                  const active = selectedCell?.productName === row.productName && selectedCell?.region === reg;
                  return (
                    <td key={reg} className="p-0">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedCell({
                            productName: row.productName,
                            region: reg,
                            ...cell,
                          })
                        }
                        className={`w-full rounded border px-2 py-2 text-center font-num font-semibold transition-colors ${cellStyle(cell.margin)} ${
                          active ? 'ring-2 ring-slate-900 ring-offset-1' : ''
                        }`}
                      >
                        {pct(cell.margin)}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 text-slate-600">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-rose-500" /> سالب (&lt; 0%)</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> ضعيف (0–10%)</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-sky-500" /> متوسط (10–24%)</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" /> مرتفع (≥ 24%)</span>
        </div>
        {selectedCell && (
          <div className="rounded-md bg-slate-100 px-3 py-1.5 text-slate-800">
            <span className="font-bold">{selectedCell.productName}</span> · {selectedCell.region}: مبيعات{' '}
            <span className="font-num font-semibold">{fmt(selectedCell.revenue)}</span> م · ربح{' '}
            <span className={`font-num font-semibold ${selectedCell.gp < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              {fmt(selectedCell.gp)}
            </span>{' '}
            م · خصم <span className="font-num">{pct(selectedCell.discount * 100)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* 6. SKU Revenue vs Gross Margin % Scatter Quadrant */
export interface SkuScatterPoint {
  id: string;
  name: string;
  cat: string;
  revenue: number;
  margin: number;
  gp: number;
}

export function RevenueMarginScatterChart({ data, height = 280 }: { data: SkuScatterPoint[]; height?: number }) {
  if (!data.length) return <ChartEmpty title="لا توجد أصناف للعرض" subtitle="عدّل فلاتر البحث لعرض توزيع الأصناف." />;

  const pos = data.filter((d) => d.gp >= 0);
  const neg = data.filter((d) => d.gp < 0);

  return (
    <div dir="ltr" className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 16, right: 20, bottom: 16, left: 6 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
          <XAxis
            type="number"
            dataKey="revenue"
            name="المبيعات"
            tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
            axisLine={{ stroke: CHART_COLORS.grid }}
            tickLine={false}
            unit=" م"
          />
          <YAxis
            type="number"
            dataKey="margin"
            name="الهامش"
            tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={44}
            unit="%"
          />
          <ZAxis type="number" dataKey="revenue" range={[80, 320]} />
          <ReferenceLine y={0} stroke={CHART_COLORS.rose} strokeDasharray="4 4" />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as SkuScatterPoint;
              return (
                <div style={TOOLTIP_STYLE} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-md">
                  <div className="font-bold text-slate-900">{p.name}</div>
                  <div className="text-[11px] text-slate-500 mb-1.5">{p.cat} · {p.id}</div>
                  <div className="space-y-0.5">
                    <div className="flex justify-between gap-4"><span>صافي المبيعات:</span><span className="font-num font-semibold">{fmt(p.revenue)} م</span></div>
                    <div className="flex justify-between gap-4"><span>الربح الإجمالي:</span><span className={`font-num font-semibold ${p.gp < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{fmt(p.gp)} م</span></div>
                    <div className="flex justify-between gap-4"><span>الهامش:</span><span className="font-num font-semibold">{pct(p.margin)}</span></div>
                  </div>
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, direction: 'rtl' }} />
          <Scatter name="أصناف موجبة الربح" data={pos} fill={CHART_COLORS.teal} />
          <Scatter name="أصناف خاسرة إجمالياً" data={neg} fill={CHART_COLORS.rose} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

/* 7. Horizontal Product Profitability Bar Chart */
export function ProductProfitBarChart({
  data,
  dataKey = 'gp',
  nameKey = 'name',
  unit = 'مليون د.ع',
  height = 290,
}: {
  data: Array<Record<string, any>>;
  dataKey?: string;
  nameKey?: string;
  unit?: string;
  height?: number;
}) {
  if (!data.length) return <ChartEmpty title="لا توجد بيانات" subtitle="لم يتم العثور على أصناف ضمن الفلتر." />;

  return (
    <div dir="ltr" className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 6, right: 20, left: 10, bottom: 6 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={false} />
          <XAxis type="number" tick={{ fill: CHART_COLORS.text, fontSize: 11 }} axisLine={{ stroke: CHART_COLORS.grid }} tickLine={false} />
          <YAxis
            type="category"
            dataKey={nameKey}
            width={135}
            tick={{ fill: '#1E293B', fontSize: 11.5 }}
            axisLine={false}
            tickLine={false}
          />
          <ReferenceLine x={0} stroke="#94A3B8" />
          <Tooltip
            cursor={{ fill: '#F1F5F9' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload;
              const val = Number(row[dataKey]);
              return (
                <div style={TOOLTIP_STYLE} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
                  <div className="font-bold text-slate-900">{row[nameKey]}</div>
                  <div className={`mt-1 font-num font-semibold ${val < 0 ? 'text-rose-700' : 'text-teal-800'}`}>
                    {fmt(val)} {unit}
                  </div>
                </div>
              );
            }}
          />
          <Bar dataKey={dataKey} radius={[0, 4, 4, 0]} barSize={18}>
            {data.map((entry, idx) => {
              const val = Number(entry[dataKey]);
              return <Cell key={idx} fill={val < 0 ? CHART_COLORS.rose : CHART_COLORS.teal} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* 8. Contribution vs Gross Profit vs Service Cost Grouped Chart */
export function ContributionComparisonChart({
  data,
  height = 310,
}: {
  data: Array<{ name: string; gp: number; serviceCost: number; contribution: number }>;
  height?: number;
}) {
  if (!data.length) return <ChartEmpty title="لا تتوفر بيانات مساهمة" subtitle="تتطلب بيانات تكلفة الخدمة لكل منتج." />;

  return (
    <div dir="ltr" className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 16, left: 6, bottom: 26 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: CHART_COLORS.text, fontSize: 10.5 }}
            interval={0}
            angle={-15}
            textAnchor="end"
            height={52}
            axisLine={{ stroke: CHART_COLORS.grid }}
            tickLine={false}
          />
          <YAxis tick={{ fill: CHART_COLORS.text, fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
          <ReferenceLine y={0} stroke="#94A3B8" />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const r = payload[0].payload;
              return (
                <div style={TOOLTIP_STYLE} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-md">
                  <div className="mb-1.5 font-bold text-slate-900">{r.name}</div>
                  <div className="space-y-1">
                    <div className="flex justify-between gap-4"><span>الربح الإجمالي:</span><span className="font-num font-semibold text-[#1D63B8]">{fmt2(r.gp)} م</span></div>
                    <div className="flex justify-between gap-4"><span>تكلفة الخدمة المتغيرة:</span><span className="font-num font-semibold text-amber-700">-{fmt2(r.serviceCost)} م</span></div>
                    <div className="flex justify-between gap-4 border-t border-slate-100 pt-1">
                      <span>هامش المساهمة:</span>
                      <span className={`font-num font-bold ${r.contribution < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{fmt2(r.contribution)} م</span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, direction: 'rtl' }} />
          <Bar dataKey="gp" name="الربح الإجمالي" fill={CHART_COLORS.cobalt} radius={[3, 3, 0, 0]} barSize={16} />
          <Bar dataKey="serviceCost" name="تكلفة الخدمة المتغيرة" fill={CHART_COLORS.amber} radius={[3, 3, 0, 0]} barSize={16} />
          <Bar dataKey="contribution" name="صافي المساهمة" radius={[3, 3, 0, 0]} barSize={16}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.contribution < 0 ? CHART_COLORS.rose : CHART_COLORS.emerald} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* 9. Clean Donut Mix Chart with Legend & Center Value */
export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export function MixDonutChart({
  slices,
  centerLabel = 'مليون د.ع',
  height = 220,
}: {
  slices: DonutSlice[];
  centerLabel?: string;
  height?: number;
}) {
  const valid = slices.filter((s) => s.value > 0);
  const total = valid.reduce((a, b) => a + b.value, 0);
  if (!total) return <ChartEmpty title="لا توجد قيم موجبة" subtitle="لا يمكن رسم التوزيع في غياب قيم موجبة." />;

  return (
    <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
      <div dir="ltr" className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={valid}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="86%"
              paddingAngle={2}
              stroke="none"
            >
              {valid.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as DonutSlice;
                return (
                  <div style={TOOLTIP_STYLE} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
                    <div className="font-bold text-slate-900">{d.label}</div>
                    <div className="mt-0.5 font-num font-semibold text-slate-700">
                      {fmt(d.value)} ({pct((100 * d.value) / total)})
                    </div>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-num text-xl font-bold text-slate-900">{fmt(total)}</span>
          <span className="text-[11px] text-slate-500">{centerLabel}</span>
        </div>
      </div>

      <div className="divide-y divide-slate-100 text-xs">
        {valid.map((s) => (
          <div key={s.label} className="flex items-center justify-between gap-2 py-2">
            <div className="flex items-center gap-2 text-slate-700">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} />
              <span>{s.label}</span>
            </div>
            <div className="font-num font-semibold text-slate-900">
              {fmt(s.value)} <span className="text-[11px] font-normal text-slate-500">({pct((100 * s.value) / total)})</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* 10. Stacked Bar Chart for Working Capital (AR Current vs Overdue & Inventory Fast vs Slow) */
export function WorkingCapitalStackedChart({
  data,
  labelKey,
  firstKey,
  firstName,
  firstColor,
  secondKey,
  secondName,
  secondColor,
  height = 250,
}: {
  data: Array<Record<string, any>>;
  labelKey: string;
  firstKey: string;
  firstName: string;
  firstColor: string;
  secondKey: string;
  secondName: string;
  secondColor: string;
  height?: number;
}) {
  if (!data.length) return <ChartEmpty title="لا تتوفر بيانات" subtitle="لا توجد أرصدة مسجلة في هذا النطاق." />;

  return (
    <div dir="ltr" className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 14, left: 4, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis
            dataKey={labelKey}
            tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
            interval={0}
            angle={data.length > 5 ? -15 : 0}
            textAnchor={data.length > 5 ? 'end' : 'middle'}
            height={data.length > 5 ? 48 : 28}
            axisLine={{ stroke: CHART_COLORS.grid }}
            tickLine={false}
          />
          <YAxis tick={{ fill: CHART_COLORS.text, fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const r = payload[0].payload;
              const tot = Number(r[firstKey]) + Number(r[secondKey]);
              return (
                <div style={TOOLTIP_STYLE} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-md">
                  <div className="mb-1.5 font-bold text-slate-900">{r[labelKey]}</div>
                  <div className="space-y-1">
                    <div className="flex justify-between gap-4"><span>{firstName}:</span><span className="font-num font-semibold">{fmt(r[firstKey])} م</span></div>
                    <div className="flex justify-between gap-4"><span>{secondName}:</span><span className="font-num font-semibold text-rose-700">{fmt(r[secondKey])} م</span></div>
                    <div className="flex justify-between gap-4 border-t border-slate-100 pt-1">
                      <span>نسبة التعرض:</span>
                      <span className="font-num font-bold">{pct(tot ? (100 * Number(r[secondKey])) / tot : 0)}</span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, direction: 'rtl' }} />
          <Bar dataKey={firstKey} name={firstName} stackId="wc" fill={firstColor} barSize={28} />
          <Bar dataKey={secondKey} name={secondName} stackId="wc" fill={secondColor} radius={[4, 4, 0, 0]} barSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* 11. Category Target Attainment Bullet / Comparison Chart */
export function CategoryPlanActualChart({
  data,
  height = 260,
}: {
  data: Array<{ name: string; actual: number; plan: number }>;
  height?: number;
}) {
  if (!data.length) return <ChartEmpty title="لا تتوفر قطاعات" subtitle="اختر نطاقاً يحتوي على مبيعات وميزانية." />;

  return (
    <div dir="ltr" className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 16, left: 4, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis dataKey="name" tick={{ fill: CHART_COLORS.text, fontSize: 11.5 }} axisLine={{ stroke: CHART_COLORS.grid }} tickLine={false} />
          <YAxis tick={{ fill: CHART_COLORS.text, fontSize: 11 }} axisLine={false} tickLine={false} width={42} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const r = payload[0].payload;
              const ratio = r.plan ? (100 * r.actual) / r.plan : 0;
              return (
                <div style={TOOLTIP_STYLE} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-md">
                  <div className="mb-1.5 font-bold text-slate-900">{r.name}</div>
                  <div className="space-y-1">
                    <div className="flex justify-between gap-4"><span>الربح الفعلي:</span><span className="font-num font-semibold text-[#0F766E]">{fmt(r.actual)} م</span></div>
                    <div className="flex justify-between gap-4"><span>الربح المخطط:</span><span className="font-num text-slate-700">{fmt(r.plan)} م</span></div>
                    <div className="flex justify-between gap-4 border-t border-slate-100 pt-1">
                      <span>نسبة التحقق:</span>
                      <span className={`font-num font-bold ${ratio >= 100 ? 'text-emerald-700' : 'text-amber-700'}`}>{pct(ratio)}</span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, direction: 'rtl' }} />
          <Bar dataKey="plan" name="الخطة المستهدفة" fill="#CBD5E1" radius={[4, 4, 0, 0]} barSize={22} />
          <Bar dataKey="actual" name="الربح الفعلي" fill={CHART_COLORS.teal} radius={[4, 4, 0, 0]} barSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* 12. Scenario Before/After & Multi-Scenario Comparison Chart */
export function ScenarioCompareBarChart({
  data,
  height = 230,
}: {
  data: Array<{ label: string; baseGp: number; scenarioGp: number }>;
  height?: number;
}) {
  if (!data.length) return <ChartEmpty title="لا توجد سيناريوهات للمقارنة" subtitle="احفظ سيناريو واحد على الأقل لعرض المقارنة." />;

  return (
    <div dir="ltr" className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 16, left: 4, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: CHART_COLORS.text, fontSize: 11.5 }} axisLine={{ stroke: CHART_COLORS.grid }} tickLine={false} />
          <YAxis tick={{ fill: CHART_COLORS.text, fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
          <ReferenceLine y={0} stroke="#94A3B8" />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const r = payload[0].payload;
              const diff = r.scenarioGp - r.baseGp;
              return (
                <div style={TOOLTIP_STYLE} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-md">
                  <div className="mb-1 font-bold text-slate-900">{r.label}</div>
                  <div className="space-y-1">
                    <div className="flex justify-between gap-4"><span>الربح الأساسي:</span><span className="font-num">{fmt(r.baseGp)} م</span></div>
                    <div className="flex justify-between gap-4"><span>الربح المفترض:</span><span className="font-num font-bold text-[#1D63B8]">{fmt(r.scenarioGp)} م</span></div>
                    <div className="flex justify-between gap-4 border-t border-slate-100 pt-1">
                      <span>الفارق:</span>
                      <span className={`font-num font-bold ${diff >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{signFmt(diff)} م</span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, direction: 'rtl' }} />
          <Bar dataKey="baseGp" name="الواقع الأساسي" fill="#CBD5E1" radius={[4, 4, 0, 0]} barSize={26} />
          <Bar dataKey="scenarioGp" name="نتيجة السيناريو" fill={CHART_COLORS.cobalt} radius={[4, 4, 0, 0]} barSize={26} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* 13. Decision Payback / Sensitivity Line Chart */
export function DecisionCurveChart({
  data,
  xKey,
  yKey,
  yName,
  unit = 'مليون د.ع',
  height = 210,
}: {
  data: Array<Record<string, any>>;
  xKey: string;
  yKey: string;
  yName: string;
  unit?: string;
  height?: number;
}) {
  if (!data.length) return null;
  return (
    <div dir="ltr" className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 16, left: 4, bottom: 4 }}>
          <defs>
            <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.teal} stopOpacity={0.22} />
              <stop offset="95%" stopColor={CHART_COLORS.teal} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis dataKey={xKey} tick={{ fill: CHART_COLORS.text, fontSize: 11 }} axisLine={{ stroke: CHART_COLORS.grid }} tickLine={false} />
          <YAxis tick={{ fill: CHART_COLORS.text, fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
          <ReferenceLine y={0} stroke={CHART_COLORS.rose} strokeDasharray="4 4" />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const r = payload[0].payload;
              return (
                <div style={TOOLTIP_STYLE} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
                  <div className="font-bold text-slate-900">{r[xKey]}</div>
                  <div className="mt-1 font-num font-semibold text-teal-800">
                    {yName}: {fmt(r[yKey])} {unit}
                  </div>
                </div>
              );
            }}
          />
          <Area type="monotone" dataKey={yKey} name={yName} stroke={CHART_COLORS.teal} strokeWidth={2.5} fill="url(#curveGrad)" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* 14. 6-Month Profitability Forecast Line Chart */
export interface ForecastPoint {
  period: string;
  label: string;
  kind: 'actual' | 'forecast';
  actualGp: number | null;
  forecastGp: number | null;
  baselineTrendGp: number | null;
  projectedRevenue: number;
  projectedCogs: number;
  projectedMargin: number;
}

export function ProfitabilityForecastChart({
  data,
  height = 310,
}: {
  data: ForecastPoint[];
  height?: number;
}) {
  if (!data.length) {
    return <ChartEmpty title="لا تتوفر بيانات للتوقعات" subtitle="أدخل بيانات فترة فعلية واحدة على الأقل." />;
  }

  const transitionPoint = data.find((d) => d.kind === 'actual' && d.forecastGp !== null);

  return (
    <div dir="ltr" className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 14, right: 20, left: 6, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: CHART_COLORS.text, fontSize: 11.5 }}
            axisLine={{ stroke: CHART_COLORS.grid }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={(v) => fmt(v, 0)}
          />
          <ReferenceLine y={0} stroke="#94A3B8" strokeWidth={1} />
          {transitionPoint && (
            <ReferenceLine
              x={transitionPoint.label}
              stroke="#94A3B8"
              strokeDasharray="4 4"
              label={{
                value: 'بداية التوقعات',
                position: 'top',
                fill: '#475569',
                fontSize: 11,
              }}
            />
          )}
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as ForecastPoint;
              const gpVal = row.kind === 'actual' ? row.actualGp : row.forecastGp;
              return (
                <div style={TOOLTIP_STYLE} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-md">
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <span className="font-bold text-slate-900">{row.label}</span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {row.kind === 'actual' ? 'أداء فعلي' : 'توقع مستقبلي'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-600">الربح الإجمالي {row.kind === 'actual' ? 'الفعلي' : 'المتوقع'}:</span>
                      <span className={`font-num font-bold ${(gpVal ?? 0) < 0 ? 'text-rose-700' : 'text-[#1D63B8]'}`}>
                        {gpVal !== null ? `${fmt(gpVal)} م` : '—'}
                      </span>
                    </div>
                    {row.kind === 'forecast' && row.baselineTrendGp !== null && (
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-600">مسار الاتجاه الحالي دون تعديل:</span>
                        <span className="font-num font-semibold text-amber-700">{fmt(row.baselineTrendGp)} م</span>
                      </div>
                    )}
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-600">صافي المبيعات:</span>
                      <span className="font-num text-slate-800">{fmt(row.projectedRevenue)} م</span>
                    </div>
                    <div className="flex justify-between gap-4 border-t border-slate-100 pt-1">
                      <span className="text-slate-600">الهامش الإجمالي:</span>
                      <span className="font-num font-semibold text-slate-900">{pct(row.projectedMargin)}</span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8, direction: 'rtl' }}
            formatter={(val) => <span className="text-slate-600 mx-1">{val}</span>}
          />
          <Line
            type="monotone"
            dataKey="actualGp"
            name="الربح الإجمالي الفعلي"
            stroke={CHART_COLORS.teal}
            strokeWidth={3}
            dot={{ r: 4, fill: CHART_COLORS.teal }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="forecastGp"
            name="الربحية المتوقعة (حسب المدخلات)"
            stroke={CHART_COLORS.cobalt}
            strokeWidth={3}
            dot={{ r: 4, fill: CHART_COLORS.cobalt }}
            activeDot={{ r: 6 }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="baselineTrendGp"
            name="مسار الاستمرار دون تدخل"
            stroke={CHART_COLORS.amber}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={{ r: 3, fill: CHART_COLORS.amber }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* 15. Decision Priority Matrix Scatter Chart (Expected Financial Impact vs Risk Score) */
export interface DecisionMatrixPoint {
  id: string;
  title: string;
  owner: string;
  impactM: number;
  riskScore: number;
  priorityScore: number;
  quadrant: 'immediate' | 'strategic' | 'quickwin' | 'defer';
  quadrantLabel: string;
  status: 'قيد الانتظار' | 'قيد التنفيذ' | 'مكتمل';
  rank: number;
}

const QUADRANT_COLORS: Record<DecisionMatrixPoint['quadrant'], string> = {
  immediate: CHART_COLORS.emerald,
  strategic: CHART_COLORS.cobalt,
  quickwin: CHART_COLORS.amber,
  defer: CHART_COLORS.rose,
};

export function DecisionPriorityMatrixChart({
  data,
  impactThreshold,
  riskThreshold,
  selectedId,
  onSelectDecision,
  height = 330,
}: {
  data: DecisionMatrixPoint[];
  impactThreshold: number;
  riskThreshold: number;
  selectedId?: string | null;
  onSelectDecision?: (id: string) => void;
  height?: number;
}) {
  if (!data.length) {
    return (
      <ChartEmpty
        title="لا توجد قرارات مصنّفة"
        subtitle="أضف قراراً جديداً لعرضه في مصفوفة الأثر المالي والمخاطرة."
      />
    );
  }

  const maxImpact = Math.max(impactThreshold * 1.4, ...data.map((d) => d.impactM * 1.15), 100);
  const immediateData = data.filter((d) => d.quadrant === 'immediate');
  const strategicData = data.filter((d) => d.quadrant === 'strategic');
  const quickwinData = data.filter((d) => d.quadrant === 'quickwin');
  const deferData = data.filter((d) => d.quadrant === 'defer');

  const renderGroup = (
    name: string,
    groupData: DecisionMatrixPoint[],
    color: string
  ) => (
    <Scatter
      name={name}
      data={groupData}
      fill={color}
      onClick={(entry: unknown) => {
        const pt = (entry as { payload?: DecisionMatrixPoint } | undefined)?.payload ?? (entry as DecisionMatrixPoint | undefined);
        if (pt?.id && onSelectDecision) onSelectDecision(pt.id);
      }}
      className={onSelectDecision ? 'cursor-pointer' : undefined}
    >
      {groupData.map((item) => (
        <Cell
          key={item.id}
          fill={color}
          fillOpacity={item.status === 'مكتمل' ? 0.4 : 0.92}
          stroke={selectedId === item.id ? '#0F172A' : '#FFFFFF'}
          strokeWidth={selectedId === item.id ? 2.5 : 1.5}
        />
      ))}
    </Scatter>
  );

  return (
    <div dir="ltr" className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 18, right: 24, bottom: 24, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
          <XAxis
            type="number"
            dataKey="riskScore"
            name="درجة المخاطرة"
            domain={[0, 10]}
            ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
            tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
            axisLine={{ stroke: CHART_COLORS.grid }}
            tickLine={false}
            label={{
              value: 'درجة المخاطرة (1 منخفضة ← 10 مرتفعة)',
              position: 'insideBottom',
              offset: -14,
              fill: '#475569',
              fontSize: 11,
            }}
          />
          <YAxis
            type="number"
            dataKey="impactM"
            name="الأثر المالي المتوقع"
            domain={[0, Math.ceil(maxImpact / 20) * 20]}
            tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={52}
            tickFormatter={(v) => fmt(v, 0)}
            label={{
              value: 'الأثر المالي (مليون د.ع)',
              angle: -90,
              position: 'insideLeft',
              offset: 4,
              fill: '#475569',
              fontSize: 11,
            }}
          />
          <ZAxis type="number" dataKey="priorityScore" range={[140, 360]} />
          <ReferenceLine
            x={riskThreshold}
            stroke="#64748B"
            strokeDasharray="5 4"
            strokeWidth={1.5}
            label={{
              value: `حد المخاطرة (${fmt(riskThreshold, 1)})`,
              position: 'top',
              fill: '#475569',
              fontSize: 10.5,
            }}
          />
          <ReferenceLine
            y={impactThreshold}
            stroke="#64748B"
            strokeDasharray="5 4"
            strokeWidth={1.5}
            label={{
              value: `حد الأثر (${fmt(impactThreshold, 0)} م)`,
              position: 'insideTopRight',
              fill: '#475569',
              fontSize: 10.5,
            }}
          />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as DecisionMatrixPoint;
              return (
                <div
                  style={TOOLTIP_STYLE}
                  className="max-w-[260px] rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-md"
                >
                  <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                    <span>ترتيب التنفيذ #{p.rank}</span>
                    <span className="font-semibold" style={{ color: QUADRANT_COLORS[p.quadrant] }}>
                      {p.quadrantLabel}
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 leading-snug">{p.title}</div>
                  <div className="mt-0.5 text-[11px] text-slate-500">{p.owner} · {p.status}</div>
                  <div className="mt-2 space-y-1 border-t border-slate-100 pt-1.5">
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-600">الأثر المالي المتوقع:</span>
                      <span className="font-num font-bold text-emerald-700">{fmt(p.impactM, 0)} م.د</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-600">درجة المخاطرة:</span>
                      <span className="font-num font-semibold text-slate-900">{fmt(p.riskScore, 1)} / 10</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-600">مؤشر الأولوية:</span>
                      <span className="font-num font-bold text-[#1D63B8]">{fmt2(p.priorityScore)}</span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11.5, paddingTop: 10, direction: 'rtl' }}
            formatter={(val) => <span className="text-slate-700 mx-1">{val}</span>}
          />
          {renderGroup('تنفيذ فوري (أثر مرتفع · مخاطرة منخفضة)', immediateData, QUADRANT_COLORS.immediate)}
          {renderGroup('تخطيط دقيق (أثر مرتفع · مخاطرة مرتفعة)', strategicData, QUADRANT_COLORS.strategic)}
          {renderGroup('تحسينات سريعة (أثر محدود · مخاطرة منخفضة)', quickwinData, QUADRANT_COLORS.quickwin)}
          {renderGroup('مراجعة أو تأجيل (أثر محدود · مخاطرة مرتفعة)', deferData, QUADRANT_COLORS.defer)}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

/* 16. Side-by-Side Scenario Financial & Liquidity Comparison Bar Chart */
export interface ScenarioComparisonChartRow {
  metric: string;
  base: number;
  scenarioA: number;
  scenarioB: number;
  unit: string;
}

export function ScenarioSideBySideChart({
  data,
  nameA = 'السيناريو (أ)',
  nameB = 'السيناريو (ب)',
  height = 270,
}: {
  data: ScenarioComparisonChartRow[];
  nameA?: string;
  nameB?: string;
  height?: number;
}) {
  if (!data.length) return null;

  return (
    <div dir="ltr" className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 20, left: 6, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis
            dataKey="metric"
            tick={{ fill: CHART_COLORS.text, fontSize: 11.5 }}
            axisLine={{ stroke: CHART_COLORS.grid }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={(v) => fmt(v, 0)}
          />
          <ReferenceLine y={0} stroke="#94A3B8" />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as ScenarioComparisonChartRow;
              return (
                <div style={TOOLTIP_STYLE} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-md">
                  <div className="mb-1.5 font-bold text-slate-900">{row.metric}</div>
                  <div className="space-y-1">
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-600">الأساس الحالي:</span>
                      <span className="font-num text-slate-800">{fmt(row.base)} {row.unit}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-600">{nameA}:</span>
                      <span className="font-num font-bold text-[#1D63B8]">{fmt(row.scenarioA)} {row.unit}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-600">{nameB}:</span>
                      <span className="font-num font-bold text-[#0F766E]">{fmt(row.scenarioB)} {row.unit}</span>
                    </div>
                    <div className="flex justify-between gap-4 border-t border-slate-100 pt-1">
                      <span className="text-slate-600">الفارق (ب − أ):</span>
                      <span className={`font-num font-bold ${row.scenarioB - row.scenarioA >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {signFmt(row.scenarioB - row.scenarioA)} {row.unit}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 6, direction: 'rtl' }}
            formatter={(val) => <span className="text-slate-700 mx-1">{val}</span>}
          />
          <Bar dataKey="base" name="الأساس الحالي" fill="#CBD5E1" radius={[4, 4, 0, 0]} barSize={22} />
          <Bar dataKey="scenarioA" name={nameA} fill={CHART_COLORS.cobalt} radius={[4, 4, 0, 0]} barSize={22} />
          <Bar dataKey="scenarioB" name={nameB} fill={CHART_COLORS.teal} radius={[4, 4, 0, 0]} barSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* 17. Sensitivity Analysis Multi-Driver Curve Chart (Impact on Contribution Margin %) */
export interface SensitivityCurvePoint {
  shockPct: number;
  label: string;
  rawMaterialMarginPct: number;
  freightMarginPct: number;
  priceMarginPct: number;
  rawMaterialContrib: number;
  freightContrib: number;
  priceContrib: number;
}

export function SensitivityCurveChart({
  data,
  metric = 'marginPct',
  height = 310,
}: {
  data: SensitivityCurvePoint[];
  metric?: 'marginPct' | 'contribution';
  height?: number;
}) {
  if (!data.length) return null;

  const isPct = metric === 'marginPct';
  const kRaw = isPct ? 'rawMaterialMarginPct' : 'rawMaterialContrib';
  const kFreight = isPct ? 'freightMarginPct' : 'freightContrib';
  const kPrice = isPct ? 'priceMarginPct' : 'priceContrib';

  return (
    <div dir="ltr" className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 14, right: 20, left: 6, bottom: 14 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
          <XAxis
            dataKey="label"
            tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
            axisLine={{ stroke: CHART_COLORS.grid }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={50}
            tickFormatter={(v) => (isPct ? `${fmt(v, 0)}%` : fmt(v, 0))}
          />
          <ReferenceLine y={0} stroke={CHART_COLORS.rose} strokeDasharray="4 4" />
          <ReferenceLine
            x="0%"
            stroke="#64748B"
            strokeDasharray="4 4"
            label={{ value: 'الوضع المختار', position: 'top', fill: '#475569', fontSize: 10.5 }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as SensitivityCurvePoint;
              return (
                <div style={TOOLTIP_STYLE} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-md">
                  <div className="mb-1.5 font-bold text-slate-900">صدمة إضافية للمتغير: {p.label}</div>
                  <div className="space-y-1">
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-600">تغير أسعار المواد الخام:</span>
                      <span className={`font-num font-bold ${p[kRaw] < 0 ? 'text-rose-700' : 'text-[#1D63B8]'}`}>
                        {isPct ? pct(p[kRaw]) : `${fmt(p[kRaw])} م.د`}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-600">تغير تكاليف الشحن والخدمة:</span>
                      <span className={`font-num font-bold ${p[kFreight] < 0 ? 'text-rose-700' : 'text-amber-700'}`}>
                        {isPct ? pct(p[kFreight]) : `${fmt(p[kFreight])} م.د`}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-600">تغير سعر البيع:</span>
                      <span className={`font-num font-bold ${p[kPrice] < 0 ? 'text-rose-700' : 'text-[#0F766E]'}`}>
                        {isPct ? pct(p[kPrice]) : `${fmt(p[kPrice])} م.د`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 6, direction: 'rtl' }}
            formatter={(val) => <span className="text-slate-700 mx-1">{val}</span>}
          />
          <Line
            type="monotone"
            dataKey={kRaw}
            name="حساسية أسعار المواد الخام"
            stroke={CHART_COLORS.cobalt}
            strokeWidth={2.5}
            dot={{ r: 3.5, fill: CHART_COLORS.cobalt }}
          />
          <Line
            type="monotone"
            dataKey={kFreight}
            name="حساسية تكاليف الشحن والخدمة"
            stroke={CHART_COLORS.amber}
            strokeWidth={2.5}
            dot={{ r: 3.5, fill: CHART_COLORS.amber }}
          />
          <Line
            type="monotone"
            dataKey={kPrice}
            name="حساسية سعر البيع"
            stroke={CHART_COLORS.teal}
            strokeWidth={2.5}
            strokeDasharray="5 3"
            dot={{ r: 3, fill: CHART_COLORS.teal }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* 18. Sensitivity Impact Bar Chart by Product (Baseline vs Adjusted Contribution Margin %) */
export interface SensitivityProductBarRow {
  name: string;
  baseMarginPct: number;
  adjustedMarginPct: number;
  baseContrib: number;
  adjustedContrib: number;
}

export function SensitivityMarginCompareChart({
  data,
  height = 300,
}: {
  data: SensitivityProductBarRow[];
  height?: number;
}) {
  if (!data.length) return null;

  return (
    <div dir="ltr" className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 16, left: 4, bottom: 26 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: CHART_COLORS.text, fontSize: 10.5 }}
            interval={0}
            angle={-15}
            textAnchor="end"
            height={52}
            axisLine={{ stroke: CHART_COLORS.grid }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={44}
            tickFormatter={(v) => `${fmt(v, 0)}%`}
          />
          <ReferenceLine y={0} stroke={CHART_COLORS.rose} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const r = payload[0].payload as SensitivityProductBarRow;
              return (
                <div style={TOOLTIP_STYLE} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-md">
                  <div className="mb-1.5 font-bold text-slate-900">{r.name}</div>
                  <div className="space-y-1">
                    <div className="flex justify-between gap-4">
                      <span>هامش المساهمة الأساسي:</span>
                      <span className="font-num font-semibold text-slate-700">
                        {pct(r.baseMarginPct)} ({fmt2(r.baseContrib)} م)
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>هامش المساهمة بعد التحريك:</span>
                      <span className={`font-num font-bold ${r.adjustedMarginPct < 0 ? 'text-rose-700' : 'text-[#0F766E]'}`}>
                        {pct(r.adjustedMarginPct)} ({fmt2(r.adjustedContrib)} م)
                      </span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, direction: 'rtl' }}
            formatter={(val) => <span className="text-slate-700 mx-1">{val}</span>}
          />
          <Bar dataKey="baseMarginPct" name="هامش المساهمة الأساسي %" fill="#CBD5E1" radius={[3, 3, 0, 0]} barSize={16} />
          <Bar dataKey="adjustedMarginPct" name="هامش المساهمة بعد التعديل %" radius={[3, 3, 0, 0]} barSize={16}>
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.adjustedMarginPct < 0 ? CHART_COLORS.rose : CHART_COLORS.teal} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* 19. Semi-Circular External Risk Gauge SVG */
export function ExternalRiskGaugeSvg({
  score,
  label,
}: {
  score: number;
  label: string;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = 84;
  const cx = 115;
  const cy = 105;
  const circumference = Math.PI * radius;
  const filled = (clamped / 100) * circumference;

  const color =
    clamped >= 70
      ? CHART_COLORS.rose
      : clamped >= 45
        ? CHART_COLORS.amber
        : CHART_COLORS.emerald;

  // Needle angle: 180 deg (left, score=0) to 0 deg (right, score=100)
  const angleRad = Math.PI * (1 - clamped / 100);
  const nx = cx + (radius - 14) * Math.cos(angleRad);
  const ny = cy - (radius - 14) * Math.sin(angleRad);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 230 130" className="w-full max-w-[240px]" role="img" aria-label={`مؤشر المخاطر الخارجية ${score} من 100`}>
        {/* Background track */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={16}
          strokeLinecap="round"
        />
        {/* Active score arc */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth={16}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
        />
        {/* Needle */}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#0F172A" strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={5} fill="#0F172A" />
        {/* Score Text */}
        <text x={cx} y={cy - 24} textAnchor="middle" className="font-num" fontSize={26} fontWeight={800} fill="#0F172A">
          {Math.round(clamped)}
        </text>
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize={10.5} fill="#64748B">
          من 100 نقطة خطر
        </text>
        {/* Min/Max labels */}
        <text x={cx - radius} y={cy + 18} textAnchor="middle" fontSize={10} fill="#64748B">0 (آمن)</text>
        <text x={cx + radius} y={cy + 18} textAnchor="middle" fontSize={10} fill="#64748B">100 (حرج)</text>
      </svg>
      <div className="mt-1 text-center text-xs font-bold" style={{ color }}>
        {label}
      </div>
    </div>
  );
}

/* 20. Regional External Risk Radar Chart */
export interface RiskRadarDimension {
  axis: string;
  currentRisk: number;
  toleranceLimit: number;
}

export function ExternalRiskRadarChart({
  data,
  height = 285,
}: {
  data: RiskRadarDimension[];
  height?: number;
}) {
  if (!data.length) return null;

  return (
    <div dir="ltr" className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="72%" data={data}>
          <PolarGrid stroke={CHART_COLORS.grid} />
          <PolarAngleAxis dataKey="axis" tick={{ fill: '#334155', fontSize: 10.5 }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#94A3B8', fontSize: 9.5 }} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as RiskRadarDimension;
              return (
                <div style={TOOLTIP_STYLE} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-md">
                  <div className="mb-1 font-bold text-slate-900">{p.axis}</div>
                  <div className="space-y-0.5">
                    <div className="flex justify-between gap-4">
                      <span>درجة الخطر الإقليمي:</span>
                      <span className="font-num font-bold text-rose-700">{fmt(p.currentRisk, 0)} / 100</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>حد التحمل الاستثماري:</span>
                      <span className="font-num font-semibold text-[#0F766E]">{fmt(p.toleranceLimit, 0)} / 100</span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11.5, direction: 'rtl' }}
            formatter={(val) => <span className="text-slate-700 mx-1">{val}</span>}
          />
          <Radar
            name="درجة الخطر المرصودة"
            dataKey="currentRisk"
            stroke={CHART_COLORS.rose}
            fill={CHART_COLORS.rose}
            fillOpacity={0.22}
            strokeWidth={2}
          />
          <Radar
            name="حد التحمل المؤسسي"
            dataKey="toleranceLimit"
            stroke={CHART_COLORS.teal}
            fill={CHART_COLORS.teal}
            fillOpacity={0.1}
            strokeDasharray="4 3"
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* 21. Expected Portfolio Impact Bar Chart by Group Segment */
export interface PortfolioImpactRow {
  segment: string;
  baselineValue: number;
  expectedImpactM: number;
  riskLevel: string;
}

export function PortfolioRiskImpactChart({
  data,
  height = 270,
}: {
  data: PortfolioImpactRow[];
  height?: number;
}) {
  if (!data.length) return null;

  return (
    <div dir="ltr" className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 20, left: 10, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
            axisLine={{ stroke: CHART_COLORS.grid }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="segment"
            width={150}
            tick={{ fill: '#1E293B', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <ReferenceLine x={0} stroke="#64748B" />
          <Tooltip
            cursor={{ fill: '#F1F5F9' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const r = payload[0].payload as PortfolioImpactRow;
              return (
                <div style={TOOLTIP_STYLE} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-md">
                  <div className="font-bold text-slate-900">{r.segment}</div>
                  <div className="mt-1 space-y-1">
                    <div className="flex justify-between gap-4">
                      <span>حجم التعرض / المحفظة:</span>
                      <span className="font-num font-semibold">{fmt(r.baselineValue)} م.د</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>الأثر المالي المتوقع:</span>
                      <span className={`font-num font-bold ${r.expectedImpactM < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {signFmt(r.expectedImpactM)} م.د
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">مستوى التأثر: {r.riskLevel}</div>
                  </div>
                </div>
              );
            }}
          />
          <Bar dataKey="expectedImpactM" name="الأثر المتوقع (مليون د.ع)" radius={[0, 4, 4, 0]} barSize={20}>
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.expectedImpactM < 0 ? CHART_COLORS.rose : CHART_COLORS.emerald} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* 22. Cumulative Profit Growth Chart linking Revenue Growth & Operating Cost Reduction across 12 Fiscal Months */
export interface CumulativeProfitGrowthPoint {
  month: string;
  monthIndex: number;
  revenueGrowthPct: number;
  costReductionPct: number;
  cumulativeProfitGrowthPct: number;
  revenueLiftM: number;
  costSavingsM: number;
  cumulativeProfitM: number;
  monthlyProfitM: number;
}

export function CumulativeProfitGrowthChart({
  data,
  mode = 'combined',
  height = 330,
}: {
  data: CumulativeProfitGrowthPoint[];
  mode?: 'combined' | 'rates';
  height?: number;
}) {
  if (!data.length) return null;

  if (mode === 'rates') {
    return (
      <div dir="ltr" className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 14, right: 20, left: 6, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
              axisLine={{ stroke: CHART_COLORS.grid }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={(v) => `${fmt(v, 0)}%`}
            />
            <ReferenceLine y={0} stroke="#94A3B8" />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as CumulativeProfitGrowthPoint;
                return (
                  <div style={TOOLTIP_STYLE} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-md">
                    <div className="mb-1.5 font-bold text-slate-900">{p.month} (الشهر {p.monthIndex})</div>
                    <div className="space-y-1">
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-600">معدل نمو الأرباح التراكمي:</span>
                        <span className="font-num font-bold text-[#0F766E]">{signFmt(p.cumulativeProfitGrowthPct)}%</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-600">نمو الإيرادات عن الأساس:</span>
                        <span className="font-num font-semibold text-[#1D63B8]">{signFmt(p.revenueGrowthPct)}%</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-600">انخفاض التكاليف التشغيلية:</span>
                        <span className="font-num font-semibold text-amber-700">{signFmt(p.costReductionPct)}%</span>
                      </div>
                      <div className="flex justify-between gap-4 border-t border-slate-100 pt-1">
                        <span className="text-slate-600">الأرباح التراكمية:</span>
                        <span className="font-num font-bold text-slate-900">{fmt(p.cumulativeProfitM)} م.د</span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 6, direction: 'rtl' }}
              formatter={(val) => <span className="text-slate-700 mx-1">{val}</span>}
            />
            <Line
              type="monotone"
              dataKey="cumulativeProfitGrowthPct"
              name="معدل نمو الأرباح التراكمي %"
              stroke={CHART_COLORS.teal}
              strokeWidth={3}
              dot={{ r: 4, fill: CHART_COLORS.teal }}
            />
            <Line
              type="monotone"
              dataKey="revenueGrowthPct"
              name="نمو الإيرادات التراكمي %"
              stroke={CHART_COLORS.cobalt}
              strokeWidth={2.2}
              strokeDasharray="5 3"
              dot={{ r: 3, fill: CHART_COLORS.cobalt }}
            />
            <Line
              type="monotone"
              dataKey="costReductionPct"
              name="انخفاض التكاليف التشغيلية %"
              stroke={CHART_COLORS.amber}
              strokeWidth={2.2}
              strokeDasharray="4 4"
              dot={{ r: 3, fill: CHART_COLORS.amber }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div dir="ltr" className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 14, right: 16, left: 6, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
            axisLine={{ stroke: CHART_COLORS.grid }}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={(v) => fmt(v, 0)}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: CHART_COLORS.teal, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={(v) => `${fmt(v, 0)}%`}
          />
          <ReferenceLine yAxisId="left" y={0} stroke="#CBD5E1" />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as CumulativeProfitGrowthPoint;
              return (
                <div style={TOOLTIP_STYLE} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-md">
                  <div className="mb-1.5 font-bold text-slate-900">{p.month} (الشهر {p.monthIndex} من السنة المالية)</div>
                  <div className="space-y-1">
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-600">معدل نمو الأرباح التراكمي:</span>
                      <span className="font-num font-bold text-[#0F766E]">{signFmt(p.cumulativeProfitGrowthPct)}%</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-600">مكاسب نمو الإيرادات التراكمية:</span>
                      <span className="font-num font-semibold text-[#1D63B8]">{signFmt(p.revenueLiftM)} م.د ({signFmt(p.revenueGrowthPct)}%)</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-600">وفورات خفض التكاليف التشغيلية:</span>
                      <span className="font-num font-semibold text-amber-700">{signFmt(p.costSavingsM)} م.د ({signFmt(p.costReductionPct)}%)</span>
                    </div>
                    <div className="flex justify-between gap-4 border-t border-slate-100 pt-1">
                      <span className="text-slate-600">صافي الأرباح التراكمية:</span>
                      <span className="font-num font-bold text-slate-900">{fmt(p.cumulativeProfitM)} م.د</span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 6, direction: 'rtl' }}
            formatter={(val) => <span className="text-slate-700 mx-1">{val}</span>}
          />
          <Bar
            yAxisId="left"
            dataKey="revenueLiftM"
            name="مساهمة نمو الإيرادات (م.د)"
            stackId="drivers"
            fill={CHART_COLORS.cobalt}
            barSize={20}
          />
          <Bar
            yAxisId="left"
            dataKey="costSavingsM"
            name="وفورات خفض التكاليف التشغيلية (م.د)"
            stackId="drivers"
            fill={CHART_COLORS.amber}
            radius={[4, 4, 0, 0]}
            barSize={20}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cumulativeProfitGrowthPct"
            name="معدل نمو الأرباح التراكمي (%)"
            stroke={CHART_COLORS.teal}
            strokeWidth={3}
            dot={{ r: 4, fill: CHART_COLORS.teal }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* 23. Financial Sustainability Index Chart: Resource Efficiency vs Long-Term Goal Attainment */
export interface SustainabilityCurvePoint {
  efficiencyPct: number;
  label: string;
  goalAttainmentPct: number;
  sustainabilityIndex: number;
  releasedLiquidityM: number;
  isCurrentPosition?: boolean;
  isProjectedPosition?: boolean;
}

export function FinancialSustainabilityChart({
  data,
  currentEffLabel,
  projectedEffLabel,
  height = 315,
}: {
  data: SustainabilityCurvePoint[];
  currentEffLabel?: string;
  projectedEffLabel?: string;
  height?: number;
}) {
  if (!data.length) return null;

  return (
    <div dir="ltr" className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 18, right: 20, left: 6, bottom: 14 }}>
          <defs>
            <linearGradient id="sustainGoalGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.teal} stopOpacity={0.22} />
              <stop offset="95%" stopColor={CHART_COLORS.teal} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
            axisLine={{ stroke: CHART_COLORS.grid }}
            tickLine={false}
          />
          <YAxis
            yAxisId="pct"
            domain={[0, 100]}
            tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={46}
            tickFormatter={(v) => `${fmt(v, 0)}%`}
          />
          <YAxis
            yAxisId="cash"
            orientation="right"
            tick={{ fill: CHART_COLORS.cobalt, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={(v) => fmt(v, 0)}
          />
          <ReferenceLine yAxisId="pct" y={80} stroke={CHART_COLORS.emerald} strokeDasharray="4 4" />
          {currentEffLabel && (
            <ReferenceLine
              yAxisId="pct"
              x={currentEffLabel}
              stroke="#64748B"
              strokeDasharray="4 4"
              label={{ value: 'الوضع الأساسي', position: 'top', fill: '#475569', fontSize: 10.5 }}
            />
          )}
          {projectedEffLabel && projectedEffLabel !== currentEffLabel && (
            <ReferenceLine
              yAxisId="pct"
              x={projectedEffLabel}
              stroke={CHART_COLORS.teal}
              strokeDasharray="3 3"
              label={{ value: 'المستهدف', position: 'top', fill: '#0F766E', fontSize: 10.5 }}
            />
          )}
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as SustainabilityCurvePoint;
              return (
                <div style={TOOLTIP_STYLE} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-md">
                  <div className="mb-1.5 font-bold text-slate-900">
                    كفاءة استهلاك الموارد: {p.label}
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-600">تحقيق الأهداف طويلة المدى:</span>
                      <span className="font-num font-bold text-[#0F766E]">{pct(p.goalAttainmentPct)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-600">مؤشر الاستدامة المالية:</span>
                      <span className="font-num font-bold text-[#1D63B8]">{fmt(p.sustainabilityIndex, 1)} / 100</span>
                    </div>
                    <div className="flex justify-between gap-4 border-t border-slate-100 pt-1">
                      <span className="text-slate-600">السيولة المحررة من الكفاءة:</span>
                      <span className="font-num font-semibold text-emerald-700">+{fmt(p.releasedLiquidityM)} م.د</span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 6, direction: 'rtl' }}
            formatter={(val) => <span className="text-slate-700 mx-1">{val}</span>}
          />
          <Bar
            yAxisId="cash"
            dataKey="releasedLiquidityM"
            name="سيولة محررة من كفاءة الموارد (م.د)"
            fill="#BFDBFE"
            radius={[4, 4, 0, 0]}
            barSize={22}
          />
          <Area
            yAxisId="pct"
            type="monotone"
            dataKey="goalAttainmentPct"
            name="تحقيق الأهداف طويلة المدى (%)"
            stroke={CHART_COLORS.teal}
            strokeWidth={2.5}
            fill="url(#sustainGoalGrad)"
          />
          <Line
            yAxisId="pct"
            type="monotone"
            dataKey="sustainabilityIndex"
            name="مؤشر الاستدامة المالية (من 100)"
            stroke={CHART_COLORS.cobalt}
            strokeWidth={2.5}
            dot={{ r: 3.5, fill: CHART_COLORS.cobalt }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* 24. Supplier Performance Bar Chart: Supply Cost Variance vs On-Time Delivery Compliance */
export interface SupplierChartPoint {
  id: string;
  supplier: string;
  shortName: string;
  purchaseM: number;
  costVariancePct: number;
  costImpactM: number;
  onTimePct: number;
  defectPct: number;
}

export function SupplierPerformanceBarChart({
  data,
  mode = 'dual',
  minDeliveryTarget = 85,
  maxCostVarianceLimit = 5,
  height = 340,
}: {
  data: SupplierChartPoint[];
  mode?: 'dual' | 'cost' | 'delivery';
  minDeliveryTarget?: number;
  maxCostVarianceLimit?: number;
  height?: number;
}) {
  if (!data.length) return null;

  const minVar = Math.min(0, ...data.map((d) => d.costVariancePct));
  const maxVar = Math.max(maxCostVarianceLimit + 2, ...data.map((d) => d.costVariancePct));
  const varDomain: [number, number] = [Math.floor(minVar - 1.5), Math.ceil(maxVar + 1.5)];

  const deliveryColor = (v: number) => {
    if (v >= minDeliveryTarget) return CHART_COLORS.teal;
    if (v >= minDeliveryTarget - 10) return CHART_COLORS.amber;
    return CHART_COLORS.rose;
  };

  const varianceColor = (v: number) => {
    if (v <= 0) return CHART_COLORS.emerald;
    if (v <= maxCostVarianceLimit) return CHART_COLORS.amber;
    return CHART_COLORS.rose;
  };

  return (
    <div dir="ltr" className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 18, right: 18, left: 10, bottom: 26 }} barGap={6}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis
            dataKey="shortName"
            tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
            axisLine={{ stroke: CHART_COLORS.grid }}
            tickLine={false}
            interval={0}
          />
          {mode !== 'cost' && (
            <YAxis
              yAxisId="delivery"
              domain={[0, 100]}
              tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={44}
              tickFormatter={(v) => `${v}%`}
            />
          )}
          {mode !== 'delivery' && (
            <YAxis
              yAxisId="variance"
              orientation={mode === 'dual' ? 'right' : 'left'}
              domain={varDomain}
              tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={(v) => `${v > 0 ? '+' : ''}${fmt(v, 0)}%`}
            />
          )}
          <Tooltip
            cursor={{ fill: '#F1F5F9', opacity: 0.7 }}
            content={({ active, payload }) => {
              const item = payload?.[0]?.payload as SupplierChartPoint | undefined;
              if (!active || !item) return null;
              return (
                <div
                  style={TOOLTIP_STYLE}
                  className="min-w-[230px] rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-md"
                >
                  <div className="mb-1.5 font-bold text-slate-900">{item.supplier}</div>
                  <div className="space-y-1">
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-600">حجم التوريد:</span>
                      <span className="font-num font-semibold text-slate-900">{fmt(item.purchaseM)} م.د</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-600">تباين تكلفة التوريد:</span>
                      <span
                        className={`font-num font-bold ${
                          item.costVariancePct > maxCostVarianceLimit
                            ? 'text-rose-700'
                            : item.costVariancePct > 0
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {item.costVariancePct > 0 ? '+' : ''}
                        {pct(item.costVariancePct)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-600">الأثر المالي للتباين:</span>
                      <span className={`font-num font-semibold ${item.costImpactM > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {item.costImpactM > 0 ? '+' : ''}
                        {fmt2(item.costImpactM)} م.د
                      </span>
                    </div>
                    <div className="flex justify-between gap-4 border-t border-slate-100 pt-1">
                      <span className="text-slate-600">الالتزام بمواعيد التسليم:</span>
                      <span
                        className={`font-num font-bold ${
                          item.onTimePct >= minDeliveryTarget
                            ? 'text-[#0F766E]'
                            : item.onTimePct >= minDeliveryTarget - 10
                            ? 'text-amber-700'
                            : 'text-rose-700'
                        }`}
                      >
                        {pct(item.onTimePct)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-600">نسبة العيوب/المرتجعات:</span>
                      <span className="font-num font-semibold text-slate-700">{pct(item.defectPct)}</span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8, direction: 'rtl' }}
            formatter={(val) => <span className="text-slate-700 mx-1">{val}</span>}
          />
          {mode !== 'cost' && (
            <ReferenceLine
              yAxisId="delivery"
              y={minDeliveryTarget}
              stroke={CHART_COLORS.teal}
              strokeDasharray="4 4"
              label={{
                value: `هدف التسليم ${minDeliveryTarget}%`,
                position: 'insideTopLeft',
                fill: '#0F766E',
                fontSize: 10.5,
              }}
            />
          )}
          {mode !== 'delivery' && (
            <ReferenceLine yAxisId="variance" y={0} stroke="#64748B" strokeWidth={1.2} />
          )}
          {mode !== 'delivery' && (
            <ReferenceLine
              yAxisId="variance"
              y={maxCostVarianceLimit}
              stroke={CHART_COLORS.rose}
              strokeDasharray="4 4"
              label={{
                value: `سقف التباين +${maxCostVarianceLimit}%`,
                position: 'insideTopRight',
                fill: '#BE123C',
                fontSize: 10.5,
              }}
            />
          )}
          {mode !== 'cost' && (
            <Bar
              yAxisId="delivery"
              dataKey="onTimePct"
              name="الالتزام بمواعيد التسليم (%)"
              radius={[4, 4, 0, 0]}
              barSize={mode === 'dual' ? 22 : 34}
            >
              {data.map((entry) => (
                <Cell key={`del-${entry.id}`} fill={deliveryColor(entry.onTimePct)} />
              ))}
            </Bar>
          )}
          {mode !== 'delivery' && (
            <Bar
              yAxisId="variance"
              dataKey="costVariancePct"
              name="تباين تكلفة التوريد (%)"
              radius={[4, 4, 0, 0]}
              barSize={mode === 'dual' ? 22 : 34}
            >
              {data.map((entry) => (
                <Cell key={`var-${entry.id}`} fill={varianceColor(entry.costVariancePct)} />
              ))}
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* 25. Opportunity Profitability Matrix: ROI (%) vs Calculated Risk Score (Existing & Proposed Projects) */
export interface OpportunityMatrixPoint {
  id: string;
  name: string;
  projectType: 'existing' | 'proposed';
  projectTypeLabel: string;
  category: string;
  capitalM: number;
  expectedReturnM: number;
  roiPct: number;
  riskScore: number;
  riskAdjustedScore: number;
  marketRisk: number;
  supplyRisk: number;
  executionRisk: number;
  capitalRisk: number;
  quadrant: 'golden' | 'strategic' | 'defensive' | 'restructure';
  quadrantLabel: string;
}

const OPP_QUADRANT_COLORS: Record<OpportunityMatrixPoint['quadrant'], string> = {
  golden: CHART_COLORS.emerald,
  strategic: CHART_COLORS.cobalt,
  defensive: CHART_COLORS.amber,
  restructure: CHART_COLORS.rose,
};

export function OpportunityProfitabilityMatrixChart({
  data,
  roiHurdlePct,
  riskCeiling,
  selectedId,
  onSelectProject,
  height = 360,
}: {
  data: OpportunityMatrixPoint[];
  roiHurdlePct: number;
  riskCeiling: number;
  selectedId?: string | null;
  onSelectProject?: (id: string) => void;
  height?: number;
}) {
  if (!data.length) {
    return (
      <ChartEmpty
        title="لا توجد مشاريع مطابقة للتصفية"
        subtitle="عدّل الفلتر أو أضف فرصة جديدة لعرضها في مصفوفة العائد والمخاطرة."
      />
    );
  }

  const maxRoi = Math.max(roiHurdlePct * 1.45, ...data.map((d) => d.roiPct * 1.15), 40);
  const existingData = data.filter((d) => d.projectType === 'existing');
  const proposedData = data.filter((d) => d.projectType === 'proposed');

  return (
    <div dir="ltr" className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 26, bottom: 26, left: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
          <XAxis
            type="number"
            dataKey="riskScore"
            name="درجة المخاطرة المحسوبة"
            domain={[0, 10]}
            ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
            tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
            axisLine={{ stroke: CHART_COLORS.grid }}
            tickLine={false}
            label={{
              value: 'درجة المخاطرة المحسوبة (1 منخفضة ← 10 مرتفعة)',
              position: 'insideBottom',
              offset: -15,
              fill: '#475569',
              fontSize: 11,
            }}
          />
          <YAxis
            type="number"
            dataKey="roiPct"
            name="معدل العائد المتوقع (ROI %)"
            domain={[0, Math.ceil(maxRoi / 10) * 10]}
            tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={50}
            tickFormatter={(v) => `${fmt(v, 0)}%`}
            label={{
              value: 'العائد على الاستثمار ROI (%)',
              angle: -90,
              position: 'insideLeft',
              offset: 4,
              fill: '#475569',
              fontSize: 11,
            }}
          />
          <ZAxis type="number" dataKey="capitalM" range={[160, 520]} name="رأس المال المستثمر" />
          <ReferenceLine
            x={riskCeiling}
            stroke="#64748B"
            strokeDasharray="5 4"
            strokeWidth={1.5}
            label={{
              value: `سقف المخاطرة (${fmt(riskCeiling, 1)})`,
              position: 'top',
              fill: '#475569',
              fontSize: 10.5,
            }}
          />
          <ReferenceLine
            y={roiHurdlePct}
            stroke="#0F766E"
            strokeDasharray="5 4"
            strokeWidth={1.5}
            label={{
              value: `الحد الأدنى للعائد (${fmt(roiHurdlePct, 0)}%)`,
              position: 'insideTopRight',
              fill: '#0F766E',
              fontSize: 10.5,
            }}
          />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              const item = payload?.[0]?.payload as OpportunityMatrixPoint | undefined;
              if (!active || !item) return null;
              return (
                <div
                  style={TOOLTIP_STYLE}
                  className="min-w-[250px] max-w-[280px] rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-md"
                >
                  <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                    <span>{item.projectTypeLabel} · {item.category}</span>
                    <span className="font-semibold" style={{ color: OPP_QUADRANT_COLORS[item.quadrant] }}>
                      {item.quadrantLabel}
                    </span>
                  </div>
                  <div className="font-bold leading-snug text-slate-900">{item.name}</div>
                  <div className="mt-2 space-y-1 border-t border-slate-100 pt-1.5">
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-600">معدل العائد المتوقع (ROI):</span>
                      <span className="font-num font-bold text-[#0F766E]">{pct(item.roiPct)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-600">درجة المخاطرة المحسوبة:</span>
                      <span className="font-num font-bold text-slate-900">{fmt(item.riskScore, 2)} / 10</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-600">الاستثمار / العائد السنوي:</span>
                      <span className="font-num font-semibold text-slate-800">
                        {fmt(item.capitalM, 0)} / {fmt(item.expectedReturnM, 0)} م.د
                      </span>
                    </div>
                    <div className="flex justify-between gap-4 border-t border-slate-100 pt-1 text-[11px]">
                      <span className="text-slate-500">العائد المعدّل بالمخاطرة:</span>
                      <span className="font-num font-bold text-[#1D63B8]">{fmt2(item.riskAdjustedScore)}</span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 10, direction: 'rtl' }}
            formatter={(val) => <span className="mx-1 text-slate-700">{val}</span>}
          />
          {existingData.length > 0 && (
            <Scatter
              name="مشاريع قائمة (دائرة)"
              data={existingData}
              shape="circle"
              fill={CHART_COLORS.cobalt}
              onClick={(entry: unknown) => {
                const pt =
                  (entry as { payload?: OpportunityMatrixPoint } | undefined)?.payload ??
                  (entry as OpportunityMatrixPoint | undefined);
                if (pt?.id && onSelectProject) onSelectProject(pt.id);
              }}
              className={onSelectProject ? 'cursor-pointer' : undefined}
            >
              {existingData.map((item) => (
                <Cell
                  key={item.id}
                  fill={OPP_QUADRANT_COLORS[item.quadrant]}
                  fillOpacity={0.88}
                  stroke={selectedId === item.id ? '#0F172A' : '#1E293B'}
                  strokeWidth={selectedId === item.id ? 2.5 : 1.5}
                />
              ))}
            </Scatter>
          )}
          {proposedData.length > 0 && (
            <Scatter
              name="مشاريع مقترحة (معين)"
              data={proposedData}
              shape="diamond"
              fill={CHART_COLORS.emerald}
              onClick={(entry: unknown) => {
                const pt =
                  (entry as { payload?: OpportunityMatrixPoint } | undefined)?.payload ??
                  (entry as OpportunityMatrixPoint | undefined);
                if (pt?.id && onSelectProject) onSelectProject(pt.id);
              }}
              className={onSelectProject ? 'cursor-pointer' : undefined}
            >
              {proposedData.map((item) => (
                <Cell
                  key={item.id}
                  fill={OPP_QUADRANT_COLORS[item.quadrant]}
                  fillOpacity={0.92}
                  stroke={selectedId === item.id ? '#0F172A' : '#FFFFFF'}
                  strokeWidth={selectedId === item.id ? 2.5 : 1.5}
                />
              ))}
            </Scatter>
          )}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

/* 26. Asset Efficiency Chart: ROA (%) & Inventory Turnover across Main Operating Departments */
export interface AssetEfficiencyPoint {
  id: string;
  department: string;
  shortName: string;
  totalAssetsM: number;
  inventoryM: number;
  slowInventoryM: number;
  slowPct: number;
  annualCogsM: number;
  annualOperatingProfitM: number;
  roaPct: number;
  turnoverX: number;
  dioDays: number;
}

export function AssetEfficiencyChart({
  data,
  viewMode = 'combo',
  targetRoaPct = 15,
  targetTurnoverX = 4.5,
  selectedId,
  onSelectDepartment,
  height = 345,
}: {
  data: AssetEfficiencyPoint[];
  viewMode?: 'combo' | 'scatter';
  targetRoaPct?: number;
  targetTurnoverX?: number;
  selectedId?: string | null;
  onSelectDepartment?: (id: string) => void;
  height?: number;
}) {
  if (!data.length) return null;

  const minRoa = Math.min(0, ...data.map((d) => d.roaPct));
  const maxRoa = Math.max(targetRoaPct + 8, ...data.map((d) => d.roaPct));
  const roaDomain: [number, number] = [Math.floor(minRoa - 3), Math.ceil(maxRoa + 4)];
  const maxTurn = Math.max(targetTurnoverX + 1.5, ...data.map((d) => d.turnoverX));

  const roaBarColor = (roa: number) => {
    if (roa >= targetRoaPct) return CHART_COLORS.teal;
    if (roa > 0) return CHART_COLORS.amber;
    return CHART_COLORS.rose;
  };

  const renderTooltip = (item: AssetEfficiencyPoint) => (
    <div
      style={TOOLTIP_STYLE}
      className="min-w-[240px] rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-md"
    >
      <div className="mb-1.5 font-bold text-slate-900">{item.department}</div>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-slate-600">العائد على الأصول (ROA):</span>
          <span
            className={`font-num font-bold ${
              item.roaPct >= targetRoaPct
                ? 'text-[#0F766E]'
                : item.roaPct > 0
                ? 'text-amber-700'
                : 'text-rose-700'
            }`}
          >
            {pct(item.roaPct)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-600">معدل دوران المخزون:</span>
          <span
            className={`font-num font-bold ${
              item.turnoverX >= targetTurnoverX ? 'text-[#1D63B8]' : 'text-amber-700'
            }`}
          >
            {fmt2(item.turnoverX)} مرة/سنة
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-600">فترة بقاء المخزون (DIO):</span>
          <span className="font-num font-semibold text-slate-800">{fmt(item.dioDays, 0)} يوماً</span>
        </div>
        <div className="flex justify-between gap-4 border-t border-slate-100 pt-1">
          <span className="text-slate-600">الأصول التشغيلية / المخزون:</span>
          <span className="font-num font-semibold text-slate-900">
            {fmt(item.totalAssetsM, 0)} / {fmt(item.inventoryM, 0)} م.د
          </span>
        </div>
        <div className="flex justify-between gap-4 text-[11px]">
          <span className="text-slate-500">نسبة المخزون البطيء:</span>
          <span className="font-num font-semibold text-amber-700">{pct(item.slowPct)}</span>
        </div>
      </div>
    </div>
  );

  if (viewMode === 'scatter') {
    return (
      <div dir="ltr" className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 18, right: 24, bottom: 26, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis
              type="number"
              dataKey="turnoverX"
              name="معدل دوران المخزون"
              domain={[0, Math.ceil(maxTurn + 1)]}
              tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
              axisLine={{ stroke: CHART_COLORS.grid }}
              tickLine={false}
              tickFormatter={(v) => `${fmt(v, 1)}x`}
              label={{
                value: 'معدل دوران المخزون السنوي (مرة / سنة)',
                position: 'insideBottom',
                offset: -15,
                fill: '#475569',
                fontSize: 11,
              }}
            />
            <YAxis
              type="number"
              dataKey="roaPct"
              name="العائد على الأصول (ROA)"
              domain={roaDomain}
              tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={(v) => `${fmt(v, 0)}%`}
              label={{
                value: 'العائد على الأصول ROA (%)',
                angle: -90,
                position: 'insideLeft',
                offset: 4,
                fill: '#475569',
                fontSize: 11,
              }}
            />
            <ZAxis type="number" dataKey="totalAssetsM" range={[200, 620]} />
            <ReferenceLine
              x={targetTurnoverX}
              stroke={CHART_COLORS.cobalt}
              strokeDasharray="4 4"
              label={{
                value: `هدف الدوران (${fmt(targetTurnoverX, 1)}x)`,
                position: 'top',
                fill: '#1D63B8',
                fontSize: 10.5,
              }}
            />
            <ReferenceLine
              y={targetRoaPct}
              stroke={CHART_COLORS.teal}
              strokeDasharray="4 4"
              label={{
                value: `هدف ROA (${targetRoaPct}%)`,
                position: 'insideTopRight',
                fill: '#0F766E',
                fontSize: 10.5,
              }}
            />
            <ReferenceLine y={0} stroke="#94A3B8" strokeWidth={1} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                const item = payload?.[0]?.payload as AssetEfficiencyPoint | undefined;
                return active && item ? renderTooltip(item) : null;
              }}
            />
            <Scatter
              name="الأقسام التشغيلية"
              data={data}
              onClick={(entry: unknown) => {
                const pt =
                  (entry as { payload?: AssetEfficiencyPoint } | undefined)?.payload ??
                  (entry as AssetEfficiencyPoint | undefined);
                if (pt?.id && onSelectDepartment) onSelectDepartment(pt.id);
              }}
              className={onSelectDepartment ? 'cursor-pointer' : undefined}
            >
              {data.map((item) => (
                <Cell
                  key={item.id}
                  fill={roaBarColor(item.roaPct)}
                  fillOpacity={0.9}
                  stroke={selectedId === item.id ? '#0F172A' : '#FFFFFF'}
                  strokeWidth={selectedId === item.id ? 2.5 : 1.5}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div dir="ltr" className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 18, right: 18, left: 10, bottom: 22 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis
            dataKey="shortName"
            tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
            axisLine={{ stroke: CHART_COLORS.grid }}
            tickLine={false}
            interval={0}
          />
          <YAxis
            yAxisId="roa"
            domain={roaDomain}
            tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={46}
            tickFormatter={(v) => `${fmt(v, 0)}%`}
          />
          <YAxis
            yAxisId="turnover"
            orientation="right"
            domain={[0, Math.ceil(maxTurn + 1)]}
            tick={{ fill: CHART_COLORS.cobalt, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={46}
            tickFormatter={(v) => `${fmt(v, 1)}x`}
          />
          <Tooltip
            cursor={{ fill: '#F1F5F9', opacity: 0.7 }}
            content={({ active, payload }) => {
              const item = payload?.[0]?.payload as AssetEfficiencyPoint | undefined;
              return active && item ? renderTooltip(item) : null;
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8, direction: 'rtl' }}
            formatter={(val) => <span className="mx-1 text-slate-700">{val}</span>}
          />
          <ReferenceLine yAxisId="roa" y={0} stroke="#94A3B8" strokeWidth={1.1} />
          <ReferenceLine
            yAxisId="roa"
            y={targetRoaPct}
            stroke={CHART_COLORS.teal}
            strokeDasharray="4 4"
            label={{
              value: `هدف ROA ${targetRoaPct}%`,
              position: 'insideTopLeft',
              fill: '#0F766E',
              fontSize: 10.5,
            }}
          />
          <ReferenceLine
            yAxisId="turnover"
            y={targetTurnoverX}
            stroke={CHART_COLORS.cobalt}
            strokeDasharray="4 4"
            label={{
              value: `هدف الدوران ${fmt(targetTurnoverX, 1)}x`,
              position: 'insideTopRight',
              fill: '#1D63B8',
              fontSize: 10.5,
            }}
          />
          <Bar
            yAxisId="roa"
            dataKey="roaPct"
            name="العائد على الأصول ROA (%)"
            radius={[4, 4, 0, 0]}
            barSize={32}
            onClick={(entry: unknown) => {
              const pt =
                (entry as { payload?: AssetEfficiencyPoint } | undefined)?.payload ??
                (entry as AssetEfficiencyPoint | undefined);
              if (pt?.id && onSelectDepartment) onSelectDepartment(pt.id);
            }}
            className={onSelectDepartment ? 'cursor-pointer' : undefined}
          >
            {data.map((entry) => (
              <Cell
                key={`roa-${entry.id}`}
                fill={roaBarColor(entry.roaPct)}
                stroke={selectedId === entry.id ? '#0F172A' : 'none'}
                strokeWidth={selectedId === entry.id ? 2 : 0}
              />
            ))}
          </Bar>
          <Line
            yAxisId="turnover"
            type="monotone"
            dataKey="turnoverX"
            name="معدل دوران المخزون (مرة/سنة)"
            stroke={CHART_COLORS.cobalt}
            strokeWidth={3}
            dot={{ r: 5, fill: '#FFFFFF', stroke: CHART_COLORS.cobalt, strokeWidth: 2.5 }}
            activeDot={{ r: 7, fill: CHART_COLORS.cobalt }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* 27. Cash Conversion Cycle (CCC) Chart: DIO + DSO - DPO = CCC */
export interface CccChartPoint {
  id: string;
  label: string;
  dioDays: number;
  dsoDays: number;
  dpoDays: number;
  dpoDaysNeg: number;
  operatingCycleDays: number;
  cccDays: number;
  tiedCapitalM: number;
}

export function CashConversionCycleChart({
  data,
  targetCccDays = 75,
  height = 345,
}: {
  data: CccChartPoint[];
  targetCccDays?: number;
  height?: number;
}) {
  if (!data.length) return null;

  return (
    <div dir="ltr" className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} stackOffset="sign" margin={{ top: 18, right: 20, left: 10, bottom: 18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: CHART_COLORS.text, fontSize: 11.5 }}
            axisLine={{ stroke: CHART_COLORS.grid }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={50}
            tickFormatter={(v) => `${fmt(v, 0)} د`}
          />
          <ReferenceLine y={0} stroke="#64748B" strokeWidth={1.2} />
          <ReferenceLine
            y={targetCccDays}
            stroke={CHART_COLORS.rose}
            strokeDasharray="5 4"
            label={{
              value: `الحد المستهدف (${targetCccDays} يوماً)`,
              position: 'insideTopRight',
              fill: '#BE123C',
              fontSize: 10.5,
            }}
          />
          <Tooltip
            cursor={{ fill: '#F1F5F9', opacity: 0.7 }}
            content={({ active, payload }) => {
              const item = payload?.[0]?.payload as CccChartPoint | undefined;
              if (!active || !item) return null;
              return (
                <div
                  style={TOOLTIP_STYLE}
                  className="min-w-[240px] rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-md"
                >
                  <div className="mb-1.5 font-bold text-slate-900">{item.label}</div>
                  <div className="space-y-1">
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-600">+ فترة التخزين (DIO):</span>
                      <span className="font-num font-bold text-[#1D63B8]">{fmt(item.dioDays, 1)} يوماً</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-600">+ فترة التحصيل (DSO):</span>
                      <span className="font-num font-bold text-[#0F766E]">{fmt(item.dsoDays, 1)} يوماً</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-600">− فترة الدفع للموردين (DPO):</span>
                      <span className="font-num font-bold text-emerald-700">−{fmt(item.dpoDays, 1)} يوماً</span>
                    </div>
                    <div className="flex justify-between gap-4 border-t border-slate-100 pt-1">
                      <span className="font-bold text-slate-900">= دورة التحويل النقدي (CCC):</span>
                      <span
                        className={`font-num font-extrabold ${
                          item.cccDays <= targetCccDays ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {fmt(item.cccDays, 1)} يوماً
                      </span>
                    </div>
                    <div className="flex justify-between gap-4 text-[11px]">
                      <span className="text-slate-500">صافي رأس المال المحتجز:</span>
                      <span className="font-num font-semibold text-slate-800">{fmt(item.tiedCapitalM, 0)} م.د</span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8, direction: 'rtl' }}
            formatter={(val) => <span className="mx-1 text-slate-700">{val}</span>}
          />
          <Bar
            dataKey="dioDays"
            name="فترة التخزين DIO (+)"
            stackId="ccc"
            fill={CHART_COLORS.cobalt}
            barSize={32}
          />
          <Bar
            dataKey="dsoDays"
            name="فترة التحصيل DSO (+)"
            stackId="ccc"
            fill={CHART_COLORS.teal}
            radius={[4, 4, 0, 0]}
            barSize={32}
          />
          <Bar
            dataKey="dpoDaysNeg"
            name="فترة الدفع للموردين DPO (−)"
            stackId="ccc"
            fill={CHART_COLORS.emerald}
            radius={[0, 0, 4, 4]}
            barSize={32}
          />
          <Line
            type="monotone"
            dataKey="cccDays"
            name="صافي دورة التحويل النقدي (CCC)"
            stroke="#0F172A"
            strokeWidth={3}
            dot={{ r: 5, fill: '#FFFFFF', stroke: '#0F172A', strokeWidth: 2.5 }}
            activeDot={{ r: 7, fill: '#0F172A' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* 28. Expected Liquidity Curve Chart (Monthly Cash Inflows, Obligations & Closing Balance + Funding Gaps) */
export interface ExpectedLiquidityPoint {
  id: string;
  label: string;
  shortLabel: string;
  kind: 'baseline' | 'projected';
  openingBalanceM: number;
  inflowsM: number;
  supplierObligationsM: number;
  operatingObligationsM: number;
  debtAndCapexObligationsM: number;
  totalOutflowsM: number;
  netCashFlowM: number;
  closingBalanceM: number;
  minFloorM: number;
  fundingGapM: number;
  isGap: boolean;
  isDeficit: boolean;
  commitmentNote: string;
}

export function ExpectedLiquidityCurveChart({
  data,
  minFloorM,
  height = 355,
}: {
  data: ExpectedLiquidityPoint[];
  minFloorM: number;
  height?: number;
}) {
  if (!data.length) return null;

  const minBalance = Math.min(...data.map((d) => d.closingBalanceM), 0);
  const maxFlow = Math.max(
    ...data.map((d) => Math.max(d.inflowsM, d.totalOutflowsM, d.closingBalanceM, minFloorM))
  );
  const yMin = minBalance < 0 ? Math.floor(minBalance / 50) * 50 - 30 : 0;
  const yMax = Math.ceil((maxFlow * 1.12) / 50) * 50;

  return (
    <div dir="ltr" className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 20, right: 20, left: 10, bottom: 16 }}>
          <defs>
            <linearGradient id="liqBalanceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.cobalt} stopOpacity={0.22} />
              <stop offset="95%" stopColor={CHART_COLORS.cobalt} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis
            dataKey="shortLabel"
            tick={{ fill: CHART_COLORS.text, fontSize: 11.5 }}
            axisLine={{ stroke: CHART_COLORS.grid }}
            tickLine={false}
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={54}
            tickFormatter={(v) => `${fmt(v, 0)} م`}
          />
          <ReferenceLine y={0} stroke="#64748B" strokeWidth={1.2} />
          <ReferenceLine
            y={minFloorM}
            stroke={CHART_COLORS.rose}
            strokeDasharray="5 4"
            strokeWidth={1.6}
            label={{
              value: `حد السيولة الأدنى (${fmt(minFloorM, 0)} م.د)`,
              position: 'insideTopRight',
              fill: '#BE123C',
              fontSize: 10.5,
            }}
          />
          <Tooltip
            cursor={{ fill: '#F1F5F9', opacity: 0.7 }}
            content={({ active, payload }) => {
              const item = payload?.[0]?.payload as ExpectedLiquidityPoint | undefined;
              if (!active || !item) return null;
              return (
                <div
                  style={TOOLTIP_STYLE}
                  className="min-w-[265px] rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-md"
                >
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <span className="font-bold text-slate-900">{item.label}</span>
                    <span
                      className={`font-semibold ${
                        item.isDeficit
                          ? 'text-rose-700'
                          : item.isGap
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      {item.isDeficit
                        ? 'عجز نقدي حرج'
                        : item.isGap
                        ? 'فجوة دون الحد الأدنى'
                        : 'رصيد آمن'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">رصيد الافتتاح:</span>
                      <span className="font-num font-semibold text-slate-800">{fmt(item.openingBalanceM)} م.د</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-600">+ التدفقات النقدية الداخلة:</span>
                      <span className="font-num font-bold text-[#0F766E]">+{fmt(item.inflowsM)} م.د</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-600">− الالتزامات الحالية (إجمالي):</span>
                      <span className="font-num font-bold text-amber-700">−{fmt(item.totalOutflowsM)} م.د</span>
                    </div>
                    <div className="flex justify-between gap-4 border-t border-slate-100 pt-1 text-[11px] text-slate-500">
                      <span>موردون {fmt(item.supplierObligationsM, 0)} · تشغيل {fmt(item.operatingObligationsM, 0)} · تمويل/أخرى {fmt(item.debtAndCapexObligationsM, 0)}</span>
                    </div>
                    <div className="flex justify-between gap-4 border-t border-slate-100 pt-1">
                      <span className="font-bold text-slate-900">الرصيد المتوقع نهاية الشهر:</span>
                      <span
                        className={`font-num font-extrabold ${
                          item.isGap ? 'text-rose-700' : 'text-[#1D63B8]'
                        }`}
                      >
                        {fmt(item.closingBalanceM)} م.د
                      </span>
                    </div>
                    {item.fundingGapM > 0 && (
                      <div className="flex justify-between gap-4 text-rose-700">
                        <span className="font-bold">الفجوة التمويلية المطلوب تغطيتها:</span>
                        <span className="font-num font-extrabold">{fmt(item.fundingGapM)} م.د</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8, direction: 'rtl' }}
            formatter={(val) => <span className="mx-1 text-slate-700">{val}</span>}
          />
          <Bar
            dataKey="inflowsM"
            name="التدفقات الداخلة المتوقعة (م.د)"
            fill={CHART_COLORS.teal}
            radius={[4, 4, 0, 0]}
            barSize={20}
            fillOpacity={0.85}
          />
          <Bar
            dataKey="totalOutflowsM"
            name="الالتزامات والتدفقات الخارجة (م.د)"
            fill={CHART_COLORS.amber}
            radius={[4, 4, 0, 0]}
            barSize={20}
            fillOpacity={0.85}
          />
          <Area
            type="monotone"
            dataKey="closingBalanceM"
            fill="url(#liqBalanceFill)"
            stroke="none"
            legendType="none"
            tooltipType="none"
          />
          <Line
            type="monotone"
            dataKey="closingBalanceM"
            name="منحنى رصيد السيولة المتوقع (م.د)"
            stroke={CHART_COLORS.cobalt}
            strokeWidth={3}
            dot={(props: { cx?: number; cy?: number; payload?: ExpectedLiquidityPoint; index?: number }) => {
              const { cx, cy, payload, index } = props;
              if (cx == null || cy == null || !payload) return <g key={`empty-${index}`} />;
              const strokeColor = payload.isDeficit
                ? '#BE123C'
                : payload.isGap
                ? '#DC2626'
                : CHART_COLORS.cobalt;
              const fillColor = payload.isGap ? '#FEF2F2' : '#FFFFFF';
              return (
                <circle
                  key={`dot-${payload.id}-${index}`}
                  cx={cx}
                  cy={cy}
                  r={payload.isGap ? 6.5 : 5}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={payload.isGap ? 3 : 2.5}
                />
              );
            }}
            activeDot={{ r: 7.5, fill: CHART_COLORS.cobalt }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}












