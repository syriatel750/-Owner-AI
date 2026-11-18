import React, { useMemo, useState } from 'react';
import { OWNER_DATA, filterTransactions, sumRows, fmt, pct, signFmt } from '../data/ownerData';
import { ForecastPoint, ProfitabilityForecastChart } from './Charts';
import { SurfaceCard, StatusNotice } from './UiPrimitives';

const FUTURE_MONTHS = [
  { id: '2026-11', label: 'نوفمبر 2026', short: 'نوفمبر' },
  { id: '2026-12', label: 'ديسمبر 2026', short: 'ديسمبر' },
  { id: '2027-01', label: 'يناير 2027', short: 'يناير' },
  { id: '2027-02', label: 'فبراير 2027', short: 'فبراير' },
  { id: '2027-03', label: 'مارس 2027', short: 'مارس' },
  { id: '2027-04', label: 'أبريل 2027', short: 'أبريل' },
];

export function ForecastSection() {
  const [region, setRegion] = useState<string>('الكل');
  const [category, setCategory] = useState<string>('الكل');

  // Historical baseline stats for selected scope
  const historical = useMemo(() => {
    const pts = OWNER_DATA.months.map((m) => {
      const s = sumRows(
        filterTransactions(OWNER_DATA.transactions, {
          period: m.id,
          region,
          cat: category,
        })
      );
      return {
        period: m.id,
        label: m.name,
        revenue: s.revenue,
        cogs: s.cogs,
        gp: s.gp,
        margin: s.revenue ? (100 * s.gp) / s.revenue : 0,
      };
    });

    const first = pts[0];
    const last = pts[pts.length - 1];
    const steps = Math.max(1, pts.length - 1);
    const avgRevGrowthPct =
      first && first.revenue > 0 ? (Math.pow(last.revenue / first.revenue, 1 / steps) - 1) * 100 : 0;
    const avgCostGrowthPct =
      first && first.cogs > 0 ? (Math.pow(last.cogs / first.cogs, 1 / steps) - 1) * 100 : 0;
    const avgGpDrift = first ? (last.gp - first.gp) / steps : 0;

    return {
      pts,
      last,
      avgRevGrowthPct,
      avgCostGrowthPct,
      avgGpDrift,
    };
  }, [region, category]);

  // Interactive user-entered parameters for the 6-month projection
  const [salesGrowthPct, setSalesGrowthPct] = useState<number>(3.0);
  const [costInflationPct, setCostInflationPct] = useState<number>(0.5);
  const [pricingImprovementPct, setPricingImprovementPct] = useState<number>(0.8);
  const [showTable, setShowTable] = useState<boolean>(false);

  const forecastSeries = useMemo(() => {
    const chartData: ForecastPoint[] = historical.pts.map((h, idx) => {
      const isLastActual = idx === historical.pts.length - 1;
      return {
        period: h.period,
        label: h.label,
        kind: 'actual',
        actualGp: Number(h.gp.toFixed(2)),
        forecastGp: isLastActual ? Number(h.gp.toFixed(2)) : null,
        baselineTrendGp: isLastActual ? Number(h.gp.toFixed(2)) : null,
        projectedRevenue: Number(h.revenue.toFixed(2)),
        projectedCogs: Number(h.cogs.toFixed(2)),
        projectedMargin: Number(h.margin.toFixed(1)),
      };
    });

    const baseLast = historical.last;
    let curRev = baseLast.revenue;
    let curCogs = baseLast.cogs;

    let driftRev = baseLast.revenue;
    let driftCogs = baseLast.cogs;

    const futureRows: Array<{
      period: string;
      label: string;
      revenue: number;
      cogs: number;
      gp: number;
      margin: number;
      baselineGp: number;
    }> = [];

    for (const m of FUTURE_MONTHS) {
      // Entered scenario projection
      const volFactor = 1 + salesGrowthPct / 100;
      const priceFactor = 1 + pricingImprovementPct / 100;
      const costFactor = 1 + costInflationPct / 100;

      curRev = curRev * volFactor * priceFactor;
      curCogs = curCogs * volFactor * costFactor;
      const curGp = curRev - curCogs;
      const curMargin = curRev ? (100 * curGp) / curRev : 0;

      // Status-quo historical drift projection (without management intervention)
      driftRev = driftRev * (1 + historical.avgRevGrowthPct / 100);
      driftCogs = driftCogs * (1 + historical.avgCostGrowthPct / 100);
      const driftGp = driftRev - driftCogs;

      chartData.push({
        period: m.id,
        label: m.short,
        kind: 'forecast',
        actualGp: null,
        forecastGp: Number(curGp.toFixed(2)),
        baselineTrendGp: Number(driftGp.toFixed(2)),
        projectedRevenue: Number(curRev.toFixed(2)),
        projectedCogs: Number(curCogs.toFixed(2)),
        projectedMargin: Number(curMargin.toFixed(1)),
      });

      futureRows.push({
        period: m.id,
        label: m.label,
        revenue: curRev,
        cogs: curCogs,
        gp: curGp,
        margin: curMargin,
        baselineGp: driftGp,
      });
    }

    const totalSixMonthGp = futureRows.reduce((acc, r) => acc + r.gp, 0);
    const totalSixMonthRev = futureRows.reduce((acc, r) => acc + r.revenue, 0);
    const avgSixMonthMargin = totalSixMonthRev ? (100 * totalSixMonthGp) / totalSixMonthRev : 0;
    const endMonth = futureRows[futureRows.length - 1];
    const totalBaselineGp = futureRows.reduce((acc, r) => acc + r.baselineGp, 0);

    return {
      chartData,
      futureRows,
      totalSixMonthGp,
      avgSixMonthMargin,
      endMonth,
      deltaVsLastActual: endMonth.gp - baseLast.gp,
      deltaVsTrend: totalSixMonthGp - totalBaselineGp,
    };
  }, [historical, salesGrowthPct, costInflationPct, pricingImprovementPct]);

  const applyObservedTrend = () => {
    setSalesGrowthPct(Number(historical.avgRevGrowthPct.toFixed(1)));
    setCostInflationPct(Number((historical.avgCostGrowthPct - historical.avgRevGrowthPct).toFixed(1)));
    setPricingImprovementPct(0);
  };

  return (
    <SurfaceCard
      title="توقعات الأداء المالي المستقبلي (للأشهر الستة القادمة)"
      subtitle="إسقاط خطي للربحية الإجمالية المتوقعة من نوفمبر 2026 إلى أبريل 2027 استناداً إلى السجلات الفعلية والمدخلات المعدّلة"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={applyObservedTrend}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            مطابقة الاتجاه التاريخي المرصود
          </button>
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {showTable ? 'إخفاء جدول الأشهر' : 'عرض جدول الأشهر الستة'}
          </button>
        </div>
      }
    >
      {/* Scope & Entered Input Controls */}
      <div className="mb-6 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 md:grid-cols-2 xl:grid-cols-5">
        <label className="text-xs font-semibold text-slate-700">
          النطاق الجغرافي
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
          >
            <option value="الكل">جميع المدن</option>
            {OWNER_DATA.regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-semibold text-slate-700">
          القطاع السلعي
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
          >
            <option value="الكل">جميع القطاعات</option>
            {[...new Set(OWNER_DATA.products.map((p) => p.cat))].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-semibold text-slate-700">
          <div className="flex items-center justify-between">
            <span>نمو المبيعات الشهري</span>
            <span className="font-num font-bold text-[#1D63B8]">{signFmt(salesGrowthPct, 1)}%</span>
          </div>
          <input
            type="range"
            min={-5}
            max={12}
            step={0.5}
            value={salesGrowthPct}
            onChange={(e) => setSalesGrowthPct(Number(e.target.value))}
            className="mt-2.5 w-full accent-[#1D63B8]"
          />
        </label>

        <label className="text-xs font-semibold text-slate-700">
          <div className="flex items-center justify-between">
            <span>تضخم تكلفة الوحدة شهرياً</span>
            <span className="font-num font-bold text-amber-700">{signFmt(costInflationPct, 1)}%</span>
          </div>
          <input
            type="range"
            min={-4}
            max={6}
            step={0.5}
            value={costInflationPct}
            onChange={(e) => setCostInflationPct(Number(e.target.value))}
            className="mt-2.5 w-full accent-amber-600"
          />
        </label>

        <label className="text-xs font-semibold text-slate-700">
          <div className="flex items-center justify-between">
            <span>ضبط التسعير والخصم شهرياً</span>
            <span className="font-num font-bold text-[#0F766E]">{signFmt(pricingImprovementPct, 1)}%</span>
          </div>
          <input
            type="range"
            min={-3}
            max={5}
            step={0.2}
            value={pricingImprovementPct}
            onChange={(e) => setPricingImprovementPct(Number(e.target.value))}
            className="mt-2.5 w-full accent-[#0F766E]"
          />
        </label>
      </div>

      {/* 3 Projection Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold text-slate-500">إجمالي الربح الإجمالي المتوقع (6 أشهر)</div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-num text-2xl font-bold text-slate-900">{fmt(forecastSeries.totalSixMonthGp)}</span>
            <span className="text-xs text-slate-500">مليون د.ع</span>
          </div>
          <div className={`mt-1 text-xs font-semibold ${forecastSeries.deltaVsTrend >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            فارق {signFmt(forecastSeries.deltaVsTrend)} م عن مسار الاستمرار
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold text-slate-500">الربحية الشهرية المتوقعة في أبريل 2027</div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-num text-2xl font-bold text-[#1D63B8]">{fmt(forecastSeries.endMonth.gp)}</span>
            <span className="text-xs text-slate-500">مليون د.ع</span>
          </div>
          <div className={`mt-1 text-xs font-semibold ${forecastSeries.deltaVsLastActual >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            تغير {signFmt(forecastSeries.deltaVsLastActual)} م مقارنة بأكتوبر الفعلي
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold text-slate-500">متوسط الهامش الإجمالي المتوقع</div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-num text-2xl font-bold text-[#0F766E]">{pct(forecastSeries.avgSixMonthMargin)}</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            مقارنة بهامش أكتوبر الفعلي ({pct(historical.last.margin)})
          </div>
        </div>
      </div>

      {/* Interactive 6-Month Line Chart */}
      <ProfitabilityForecastChart data={forecastSeries.chartData} height={320} />

      {/* Optional 6-Month Breakdown Table */}
      {showTable && (
        <div className="mt-5 overflow-x-auto border-t border-slate-100 pt-4">
          <table className="w-full min-w-[560px] text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="px-3 py-2.5 font-semibold">الشهر المتوقع</th>
                <th className="px-3 py-2.5 font-semibold">صافي المبيعات المتوقع</th>
                <th className="px-3 py-2.5 font-semibold">التكلفة المتوقعة</th>
                <th className="px-3 py-2.5 font-semibold">الربح الإجمالي المتوقع</th>
                <th className="px-3 py-2.5 font-semibold">الهامش %</th>
                <th className="px-3 py-2.5 font-semibold">مسار دون تدخل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {forecastSeries.futureRows.map((row) => (
                <tr key={row.period} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5 font-bold text-slate-900">{row.label}</td>
                  <td className="px-3 py-2.5 font-num">{fmt(row.revenue)}</td>
                  <td className="px-3 py-2.5 font-num text-slate-600">{fmt(row.cogs)}</td>
                  <td className={`px-3 py-2.5 font-num font-bold ${row.gp < 0 ? 'text-rose-700' : 'text-[#1D63B8]'}`}>
                    {fmt(row.gp)}
                  </td>
                  <td className="px-3 py-2.5 font-num">{pct(row.margin)}</td>
                  <td className="px-3 py-2.5 font-num text-amber-700">{fmt(row.baselineGp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4">
        <StatusNotice tone="neutral">
          تُحتسب التوقعات انطلاقاً من الأداء الفعلي لأكتوبر 2026 وفق معدلات النمو والتكلفة والتسعير المدخلة أعلاه. الخط المتقطع يوضح استمرار الاتجاه التاريخي ({signFmt(historical.avgRevGrowthPct, 1)}% نمو مبيعات، {signFmt(historical.avgCostGrowthPct, 1)}% نمو تكلفة شهرياً) دون أي تعديل إداري.
        </StatusNotice>
      </div>
    </SurfaceCard>
  );
}
