import React, { useMemo, useState } from 'react';
import { OWNER_DATA, filterTransactions, sumRows, fmt, pct, signFmt } from '../data/ownerData';
import { CumulativeProfitGrowthChart, CumulativeProfitGrowthPoint } from './Charts';
import { SurfaceCard } from './UiPrimitives';

const FISCAL_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

export function CumulativeProfitGrowthSection() {
  const [region, setRegion] = useState<string>('الكل');
  const [annualRevGrowthPct, setAnnualRevGrowthPct] = useState<number>(15);
  const [annualOpexReductionPct, setAnnualOpexReductionPct] = useState<number>(6);
  const [chartMode, setChartMode] = useState<'combined' | 'rates'>('combined');

  const baseline = useMemo(() => {
    const monthsCount = OWNER_DATA.months.length || 3;
    const rows = filterTransactions(OWNER_DATA.transactions, { period: 'all', region });
    const tot = sumRows(rows);
    const contribTotals = OWNER_DATA.contributionAnalysis.totals;
    const serviceRatio =
      contribTotals.revenue > 0 ? contribTotals.variableServiceCosts / contribTotals.revenue : 0.0435;

    const avgRev = tot.revenue / monthsCount;
    const avgCogs = tot.cogs / monthsCount;
    const avgService = avgRev * serviceRatio;
    const avgCost = avgCogs + avgService;
    const avgProfit = avgRev - avgCost;

    return {
      avgRev,
      avgCost,
      avgProfit,
      baseAnnualProfit: avgProfit * 12,
    };
  }, [region]);

  const series = useMemo(() => {
    let cumRevLift = 0;
    let cumCostSavings = 0;
    let cumProfit = 0;
    let cumBaseProfit = 0;

    const points: CumulativeProfitGrowthPoint[] = FISCAL_MONTHS.map((mName, idx) => {
      const mIndex = idx + 1;
      const progress = idx / 11; // 0 at M1 -> 1 at M12

      const revFactor = Math.pow(1 + annualRevGrowthPct / 100, progress);
      const costFactor = 1 - (annualOpexReductionPct / 100) * progress;

      const revM = baseline.avgRev * revFactor;
      const monthlyRevLift = (revM - baseline.avgRev) * (baseline.avgRev > 0 ? baseline.avgProfit / baseline.avgRev : 0);
      const monthlyCostSavings = baseline.avgCost * revFactor * (1 - costFactor);
      const monthlyProfit = baseline.avgProfit + monthlyRevLift + monthlyCostSavings;

      cumRevLift += monthlyRevLift;
      cumCostSavings += monthlyCostSavings;
      cumProfit += monthlyProfit;
      cumBaseProfit += baseline.avgProfit;

      const cumProfitGrowthPct =
        cumBaseProfit > 0 ? ((cumProfit - cumBaseProfit) / cumBaseProfit) * 100 : 0;

      return {
        month: mName,
        monthIndex: mIndex,
        revenueGrowthPct: Number(((revFactor - 1) * 100).toFixed(1)),
        costReductionPct: Number(((1 - costFactor) * 100).toFixed(1)),
        cumulativeProfitGrowthPct: Number(cumProfitGrowthPct.toFixed(1)),
        revenueLiftM: Number(cumRevLift.toFixed(1)),
        costSavingsM: Number(cumCostSavings.toFixed(1)),
        cumulativeProfitM: Number(cumProfit.toFixed(1)),
        monthlyProfitM: Number(monthlyProfit.toFixed(1)),
      };
    });

    const last = points[points.length - 1];
    const totalAddedProfit = last.revenueLiftM + last.costSavingsM;
    const revSharePct = totalAddedProfit !== 0 ? (100 * last.revenueLiftM) / totalAddedProfit : 0;
    const costSharePct = totalAddedProfit !== 0 ? (100 * last.costSavingsM) / totalAddedProfit : 0;

    return {
      points,
      last,
      totalAddedProfit,
      revSharePct,
      costSharePct,
    };
  }, [baseline, annualRevGrowthPct, annualOpexReductionPct]);

  return (
    <SurfaceCard
      title="معدل نمو الأرباح التراكمي خلال السنة المالية"
      subtitle="يربط بين مسار نمو الإيرادات وانخفاض التكاليف التشغيلية عبر 12 شهراً لإظهار محركات النمو التراكمي للأرباح"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            aria-label="نطاق معدل نمو الأرباح التراكمي"
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700"
          >
            <option value="الكل">جميع المناطق</option>
            {OWNER_DATA.regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setChartMode('combined')}
              className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
                chartMode === 'combined' ? 'bg-[#0F766E] text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الأثر التراكمي والنمو
            </button>
            <button
              type="button"
              onClick={() => setChartMode('rates')}
              className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
                chartMode === 'rates' ? 'bg-[#0F766E] text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              نسب النمو (%)
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Interactive Driver Sliders */}
        <div className="grid grid-cols-1 gap-5 rounded-xl bg-slate-50/80 p-4 sm:grid-cols-2 text-xs">
          <label className="font-semibold text-slate-700">
            <div className="flex justify-between">
              <span>معدل نمو الإيرادات المستهدف خلال السنة</span>
              <span className="font-num font-bold text-[#1D63B8]">{signFmt(annualRevGrowthPct, 0)}%</span>
            </div>
            <input
              type="range"
              min={-5}
              max={35}
              step={1}
              value={annualRevGrowthPct}
              onChange={(e) => setAnnualRevGrowthPct(Number(e.target.value))}
              className="mt-2 w-full accent-[#1D63B8]"
            />
            <div className="mt-1 flex justify-between text-[11px] font-normal text-slate-500">
              <span>-5%</span>
              <span>مساهمة تراكمية بالربح: {signFmt(series.last.revenueLiftM)} م.د</span>
              <span>+35%</span>
            </div>
          </label>

          <label className="font-semibold text-slate-700">
            <div className="flex justify-between">
              <span>نسبة خفض التكاليف التشغيلية خلال السنة</span>
              <span className="font-num font-bold text-amber-700">{fmt(annualOpexReductionPct, 1)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={15}
              step={0.5}
              value={annualOpexReductionPct}
              onChange={(e) => setAnnualOpexReductionPct(Number(e.target.value))}
              className="mt-2 w-full accent-amber-600"
            />
            <div className="mt-1 flex justify-between text-[11px] font-normal text-slate-500">
              <span>0%</span>
              <span>وفورات تشغيلية تراكمية: {signFmt(series.last.costSavingsM)} م.د</span>
              <span>15%</span>
            </div>
          </label>
        </div>

        {/* 4 Summary Metrics */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 text-xs">
          <div className="rounded-lg bg-slate-50 p-3.5">
            <div className="text-slate-500">معدل نمو الأرباح التراكمي السنوي</div>
            <div
              className={`mt-1 font-num text-lg font-bold ${
                series.last.cumulativeProfitGrowthPct >= 0 ? 'text-[#0F766E]' : 'text-rose-700'
              }`}
            >
              {signFmt(series.last.cumulativeProfitGrowthPct)}%
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-3.5">
            <div className="text-slate-500">الأرباح التراكمية بنهاية السنة</div>
            <div className="mt-1 font-num text-lg font-bold text-slate-900">
              {fmt(series.last.cumulativeProfitM)} <span className="text-xs font-normal text-slate-500">م.د</span>
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-3.5">
            <div className="text-slate-500">مساهمة نمو الإيرادات</div>
            <div className="mt-1 font-num text-lg font-bold text-[#1D63B8]">
              {signFmt(series.last.revenueLiftM)} م.د{' '}
              <span className="text-[11px] font-normal text-slate-500">({pct(series.revSharePct)})</span>
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-3.5">
            <div className="text-slate-500">وفورات خفض التكاليف التشغيلية</div>
            <div className="mt-1 font-num text-lg font-bold text-amber-700">
              {signFmt(series.last.costSavingsM)} م.د{' '}
              <span className="text-[11px] font-normal text-slate-500">({pct(series.costSharePct)})</span>
            </div>
          </div>
        </div>

        {/* Interactive 12-Month Cumulative Chart */}
        <CumulativeProfitGrowthChart data={series.points} mode={chartMode} />

        <p className="text-[11px] leading-relaxed text-slate-500">
          يبدأ المسار من متوسط الأداء الفعلي المسجل للنطاق المختار ({fmt(baseline.avgRev)} م.د مبيعات شهرية،{' '}
          {fmt(baseline.avgProfit)} م.د ربح مساهمة شهري) ويجمع أثر التوسع التدريجي في الإيرادات ووفورات كفاءة التكاليف التشغيلية حتى نهاية السنة المالية.
        </p>
      </div>
    </SurfaceCard>
  );
}
