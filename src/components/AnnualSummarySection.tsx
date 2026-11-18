import React, { useMemo, useState } from 'react';
import { OWNER_DATA, fmt, pct } from '../data/ownerData';
import { CHART_COLORS, MixDonutChart } from './Charts';
import { SurfaceCard } from './UiPrimitives';

type HorizonMode = 'annualized' | 'actual3m';
type RevenueDimension = 'category' | 'region' | 'brand';

export function AnnualSummarySection() {
  const [horizon, setHorizon] = useState<HorizonMode>('annualized');
  const [revDim, setRevDim] = useState<RevenueDimension>('category');

  const summary = useMemo(() => {
    const monthsCount = OWNER_DATA.months.length || 3;
    const multiplier = horizon === 'annualized' ? 12 / monthsCount : 1;

    // 1. Aggregate actual 3-month revenue & COGS from transactions
    let netRevenue3m = 0;
    let cogsImported3m = 0;
    let cogsPrivate3m = 0;

    const byCategory = new Map<string, number>();
    const byRegion = new Map<string, number>();
    const byBrand = new Map<string, number>();

    for (const row of OWNER_DATA.transactions) {
      netRevenue3m += row.revenue;
      if (row.brand === 'علامة خاصة') cogsPrivate3m += row.cogs;
      else cogsImported3m += row.cogs;

      byCategory.set(row.cat, (byCategory.get(row.cat) || 0) + row.revenue);
      byRegion.set(row.region, (byRegion.get(row.region) || 0) + row.revenue);
      byBrand.set(row.brand, (byBrand.get(row.brand) || 0) + row.revenue);
    }

    // 2. Commercial discounts across the 3 recorded months
    const discounts3m = OWNER_DATA.months.reduce((acc, m) => {
      const bridge = OWNER_DATA.commercialBridge[m.id];
      return acc + (bridge ? bridge.waterfall.discounts : 0);
    }, 0);

    // 3. Variable service costs ratio from contributionAnalysis (2026-10) applied across revenue
    const contribTotals = OWNER_DATA.contributionAnalysis.totals;
    const serviceCostRatio =
      contribTotals.revenue > 0 ? contribTotals.variableServiceCosts / contribTotals.revenue : 0.0435;
    const variableServiceCosts3m = netRevenue3m * serviceCostRatio;

    const grossSales3m = netRevenue3m + discounts3m;
    const totalCogs3m = cogsImported3m + cogsPrivate3m;
    const totalOutflows3m = totalCogs3m + variableServiceCosts3m + discounts3m;
    const netContribution3m = grossSales3m - totalOutflows3m; // equals netRevenue - totalCogs - variableServiceCosts

    const totalRevenue = netRevenue3m * multiplier;
    const grossSales = grossSales3m * multiplier;
    const cogsImported = cogsImported3m * multiplier;
    const cogsPrivate = cogsPrivate3m * multiplier;
    const discounts = discounts3m * multiplier;
    const variableServiceCosts = variableServiceCosts3m * multiplier;
    const totalExpenses = totalOutflows3m * multiplier;
    const netContribution = netContribution3m * multiplier;

    const revColors = [
      CHART_COLORS.teal,
      CHART_COLORS.cobalt,
      CHART_COLORS.amber,
      CHART_COLORS.emerald,
      CHART_COLORS.slate,
    ];

    const rawRevMap =
      revDim === 'category' ? byCategory : revDim === 'region' ? byRegion : byBrand;

    const revenueSlices = Array.from(rawRevMap.entries())
      .map(([label, val]) => ({ label, value: Number((val * multiplier).toFixed(2)) }))
      .sort((a, b) => b.value - a.value)
      .map((item, idx) => ({
        ...item,
        color: revColors[idx % revColors.length],
      }));

    const expenseSlices = [
      {
        label: 'تكلفة البضاعة — المستورد',
        value: Number(cogsImported.toFixed(2)),
        color: CHART_COLORS.cobalt,
      },
      {
        label: 'تكلفة البضاعة — العلامة الخاصة',
        value: Number(cogsPrivate.toFixed(2)),
        color: CHART_COLORS.teal,
      },
      {
        label: 'الخصومات التجارية الممنوحة',
        value: Number(discounts.toFixed(2)),
        color: CHART_COLORS.amber,
      },
      {
        label: 'تكاليف الخدمة والتوزيع المتغيرة',
        value: Number(variableServiceCosts.toFixed(2)),
        color: CHART_COLORS.rose,
      },
    ];

    return {
      totalRevenue,
      grossSales,
      totalCogs: (cogsImported + cogsPrivate),
      discounts,
      variableServiceCosts,
      totalExpenses,
      netContribution,
      contributionMarginPct: totalRevenue > 0 ? (100 * netContribution) / totalRevenue : 0,
      revenueSlices,
      expenseSlices,
    };
  }, [horizon, revDim]);

  const dimLabel =
    revDim === 'category' ? 'القطاعات السلعية' : revDim === 'region' ? 'المناطق الجغرافية' : 'طبيعة النشاط';

  return (
    <SurfaceCard
      title="ملخص الأداء السنوي — توزيع الإيرادات والمصروفات الرئيسية"
      subtitle={
        horizon === 'annualized'
          ? 'تقدير سنوي (12 شهراً) محسوب على أساس معدل الأداء الفعلي للأشهر الثلاثة المسجلة (أغسطس – أكتوبر 2026)'
          : 'الإجمالي التراكمي للأشهر الثلاثة المسجلة فعلياً (أغسطس – أكتوبر 2026)'
      }
      action={
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setHorizon('annualized')}
              className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
                horizon === 'annualized' ? 'bg-[#0F766E] text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              التقدير السنوي (12 شهراً)
            </button>
            <button
              type="button"
              onClick={() => setHorizon('actual3m')}
              className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
                horizon === 'actual3m' ? 'bg-[#0F766E] text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              التراكمي المسجل (3 أشهر)
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Top Annual Summary Strip */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 text-xs">
          <div className="rounded-lg bg-slate-50 p-3.5">
            <div className="text-slate-500">
              {horizon === 'annualized' ? 'صافي الإيرادات السنوية المقدرة' : 'صافي الإيرادات التراكمية'}
            </div>
            <div className="mt-1 font-num text-lg font-bold text-[#0F766E]">
              {fmt(summary.totalRevenue)} <span className="text-xs font-normal text-slate-500">م.د</span>
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-3.5">
            <div className="text-slate-500">إجمالي التكاليف والخصومات والخدمة</div>
            <div className="mt-1 font-num text-lg font-bold text-slate-900">
              {fmt(summary.totalExpenses)} <span className="text-xs font-normal text-slate-500">م.د</span>
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-3.5">
            <div className="text-slate-500">صافي المساهمة بعد التكلفة المتغيرة</div>
            <div className="mt-1 font-num text-lg font-bold text-[#1D63B8]">
              {fmt(summary.netContribution)} <span className="text-xs font-normal text-slate-500">م.د</span>
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-3.5">
            <div className="text-slate-500">هامش المساهمة الصافي</div>
            <div className="mt-1 font-num text-lg font-bold text-emerald-700">
              {pct(summary.contributionMarginPct)}
            </div>
          </div>
        </div>

        {/* Two Side-by-Side Pie/Donut Charts: Revenue Sources & Expense Breakdown */}
        <div className="grid grid-cols-1 gap-6 border-t border-slate-100 pt-5 lg:grid-cols-2">
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900">توزيع مصادر الإيرادات ({dimLabel})</h4>
                <p className="text-[11px] text-slate-500">حصة كل مصدر من صافي الإيرادات المحققة</p>
              </div>
              <select
                value={revDim}
                onChange={(e) => setRevDim(e.target.value as RevenueDimension)}
                aria-label="تصنيف مصادر الإيرادات"
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700"
              >
                <option value="category">حسب القطاع</option>
                <option value="region">حسب المنطقة</option>
                <option value="brand">حسب طبيعة النشاط</option>
              </select>
            </div>
            <MixDonutChart
              slices={summary.revenueSlices}
              centerLabel="مليون د.ع إجمالي"
              height={240}
            />
          </div>

          <div className="border-t border-slate-100 pt-5 lg:border-t-0 lg:border-r lg:pr-6 lg:pt-0">
            <div className="mb-3">
              <h4 className="text-sm font-bold text-slate-900">توزيع المصروفات والتكاليف الرئيسية</h4>
              <p className="text-[11px] text-slate-500">
                تكلفة البضاعة والخصومات التجارية وتكاليف الخدمة المتغيرة (مليون د.ع)
              </p>
            </div>
            <MixDonutChart
              slices={summary.expenseSlices}
              centerLabel="مليون د.ع تكاليف"
              height={240}
            />
          </div>
        </div>

        <p className="text-[11px] leading-relaxed text-slate-500">
          ملاحظة منهجية: التقدير السنوي يُبنى حسابياً على معدل الأداء الفعلي للأشهر الثلاثة المتاحة دون افتراض مصروفات إدارية ثابتة أو ضرائب غير مسجلة في البيانات.
        </p>
      </div>
    </SurfaceCard>
  );
}
