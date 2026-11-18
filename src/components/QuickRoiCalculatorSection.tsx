import React, { useMemo, useState } from 'react';
import {
  OWNER_DATA,
  filterTransactions,
  fmt,
  fmt2,
  pct,
  signFmt,
  sumRows,
} from '../data/ownerData';
import { DecisionCurveChart } from './Charts';
import { KpiMetricCard, StateLabel, StatusNotice, SurfaceCard } from './UiPrimitives';

type MarginBenchmarkId =
  | 'group_gp'
  | 'group_contribution'
  | 'private_label'
  | 'non_food'
  | 'canned'
  | 'dry_food';

export function QuickRoiCalculatorSection({ period }: { period: string }) {
  const [proposedBudgetM, setProposedBudgetM] = useState<number>(180);
  const [benchmarkId, setBenchmarkId] = useState<MarginBenchmarkId>('group_gp');
  const [monthlySalesTargetM, setMonthlySalesTargetM] = useState<number>(85);
  const [monthlyOpexM, setMonthlyOpexM] = useState<number>(3.5);
  const [horizonMonths, setHorizonMonths] = useState<12 | 24 | 36>(24);

  const periodLabel = OWNER_DATA.months.find((m) => m.id === period)?.label ?? period;

  const benchmarks = useMemo(() => {
    const periodRows = filterTransactions(OWNER_DATA.transactions, { period });
    const groupTotals = sumRows(periodRows);
    const groupGpPct = groupTotals.revenue ? (100 * groupTotals.gp) / groupTotals.revenue : 0;

    const privateRows = periodRows.filter((r) => r.brand === 'علامة خاصة');
    const privateTotals = sumRows(privateRows);
    const privatePct = privateTotals.revenue ? (100 * privateTotals.gp) / privateTotals.revenue : 0;

    const nonFoodRows = periodRows.filter((r) => r.cat === 'غير غذائية');
    const nonFoodTotals = sumRows(nonFoodRows);
    const nonFoodPct = nonFoodTotals.revenue ? (100 * nonFoodTotals.gp) / nonFoodTotals.revenue : 0;

    const cannedRows = periodRows.filter((r) => r.cat === 'المعلبات');
    const cannedTotals = sumRows(cannedRows);
    const cannedPct = cannedTotals.revenue ? (100 * cannedTotals.gp) / cannedTotals.revenue : 0;

    const dryRows = periodRows.filter((r) => r.cat === 'الأغذية الجافة' && r.brand === 'مستورد');
    const dryTotals = sumRows(dryRows);
    const dryPct = dryTotals.revenue ? (100 * dryTotals.gp) / dryTotals.revenue : 0;

    const contribTotals = OWNER_DATA.contributionAnalysis.totals;
    const contribPct = contribTotals.revenue ? (100 * contribTotals.contribution) / contribTotals.revenue : 0;

    return {
      group_gp: {
        label: `متوسط هامش الربح الإجمالي للمجموعة (${pct(groupGpPct)})`,
        shortLabel: 'هامش الربح الإجمالي للمجموعة',
        marginPct: groupGpPct,
      },
      group_contribution: {
        label: `صافي هامش المساهمة للمجموعة (${pct(contribPct)})`,
        shortLabel: 'صافي هامش المساهمة للمجموعة',
        marginPct: contribPct,
      },
      private_label: {
        label: `قطاع العلامة الخاصة — روافد (${pct(privatePct)})`,
        shortLabel: 'قطاع العلامة الخاصة',
        marginPct: privatePct,
      },
      non_food: {
        label: `قطاع غير غذائية — منظفات نهرين (${pct(nonFoodPct)})`,
        shortLabel: 'القطاع غير الغذائي',
        marginPct: nonFoodPct,
      },
      canned: {
        label: `قطاع المعلبات (${pct(cannedPct)})`,
        shortLabel: 'قطاع المعلبات',
        marginPct: cannedPct,
      },
      dry_food: {
        label: `الأغذية الجافة المستوردة (${pct(dryPct)})`,
        shortLabel: 'الأغذية الجافة المستوردة',
        marginPct: dryPct,
      },
    };
  }, [period]);

  const activeBenchmark = benchmarks[benchmarkId];

  const calc = useMemo(() => {
    const safeBudget = Math.max(1, proposedBudgetM);
    const marginRate = activeBenchmark.marginPct / 100;
    const monthlyGrossProfitM = monthlySalesTargetM * marginRate;
    const monthlyNetCashflowM = monthlyGrossProfitM - monthlyOpexM;

    const paybackMonths =
      monthlyNetCashflowM > 0 ? safeBudget / monthlyNetCashflowM : Infinity;
    const annualNetProfitM = monthlyNetCashflowM * 12;
    const annualRoiPct = (100 * annualNetProfitM) / safeBudget;
    const horizonNetGainM = monthlyNetCashflowM * horizonMonths - safeBudget;

    // Minimum monthly sales required just to cover monthly opex
    const minSalesForOpexM = marginRate > 0 ? monthlyOpexM / marginRate : Infinity;
    // Required monthly sales to achieve payback within 18 months
    const targetMonthlyCash18M = safeBudget / 18 + monthlyOpexM;
    const salesFor18MoPaybackM = marginRate > 0 ? targetMonthlyCash18M / marginRate : Infinity;

    const curve = Array.from({ length: horizonMonths + 1 }, (_, month) => {
      const cumulativeNet = -safeBudget + month * monthlyNetCashflowM;
      return {
        month: `شهر ${month}`,
        cumulative: Math.round(cumulativeNet * 100) / 100,
      };
    });

    let verdictLabel = 'استرداد سريع (≤ 12 شهراً)';
    let verdictTone: 'success' | 'neutral' | 'warning' | 'danger' = 'success';
    let verdictHint = 'المشروع يسترد رأسماله خلال عام واحد ويولد فائضاً نقدياً مجزياً.';

    if (monthlyNetCashflowM <= 0) {
      verdictLabel = 'تدفق شهري سالب';
      verdictTone = 'danger';
      verdictHint = `العائد الشهري لا يغطي المصاريف التشغيلية (${fmt(monthlyOpexM)} م.د)؛ ارفع المبيعات فوق ${fmt(minSalesForOpexM)} م.د شهرياً أو انتقل لقطاع بهامش أعلى.`;
    } else if (paybackMonths > 24) {
      verdictLabel = 'فترة استرداد طويلة (> سنتين)';
      verdictTone = 'warning';
      verdictHint = `للوصول إلى استرداد خلال 18 شهراً بهذا الهامش، يُنصح برفع مبيعات المشروع إلى ${fmt(salesFor18MoPaybackM)} م.د شهرياً أو تخفيض الميزانية المبدئية.`;
    } else if (paybackMonths > 12) {
      verdictLabel = 'استرداد متوسط (12–24 شهراً)';
      verdictTone = 'neutral';
      verdictHint = 'جدوى اقتصادية متوازنة ضمن أفق عامين، مع قابلية لتحسين الاسترداد عبر تقليص الخصومات.';
    }

    return {
      monthlyGrossProfitM,
      monthlyNetCashflowM,
      paybackMonths,
      annualNetProfitM,
      annualRoiPct,
      horizonNetGainM,
      curve,
      verdictLabel,
      verdictTone,
      verdictHint,
    };
  }, [proposedBudgetM, activeBenchmark.marginPct, monthlySalesTargetM, monthlyOpexM, horizonMonths]);

  return (
    <SurfaceCard
      title="حاسبة العائد الاستثماري السريع وفترة الاسترداد"
      subtitle={`أدخل الميزانية المقترحة لمشروع جديد لحساب فترة الاسترداد التقديرية استناداً إلى هوامش الربح الفعلية في ${periodLabel}`}
      action={
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
          {([12, 24, 36] as const).map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setHorizonMonths(h)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                horizonMonths === h ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              أفق {h} شهراً
            </button>
          ))}
        </div>
      }
    >
      {/* 4 Summary KPIs */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiMetricCard
          label="فترة الاسترداد التقديرية"
          value={Number.isFinite(calc.paybackMonths) ? calc.paybackMonths : null}
          unit={Number.isFinite(calc.paybackMonths) ? 'شهر' : 'غير قابل للاسترداد'}
          varianceText={calc.verdictLabel}
          varianceTone={
            calc.verdictTone === 'success'
              ? 'good'
              : calc.verdictTone === 'danger'
              ? 'bad'
              : calc.verdictTone === 'warning'
              ? 'warn'
              : 'neutral'
          }
        />
        <KpiMetricCard
          label="العائد السنوي على الاستثمار (ROI)"
          value={calc.annualRoiPct}
          unit="%"
          varianceText={`ربح تشغيلي سنوي: ${signFmt(calc.annualNetProfitM, 1)} م.د`}
          varianceTone={calc.annualRoiPct >= 25 ? 'good' : calc.annualRoiPct > 0 ? 'warn' : 'bad'}
        />
        <KpiMetricCard
          label="صافي التدفق الشهري للمشروع"
          value={calc.monthlyNetCashflowM}
          unit="م.د / شهر"
          varianceText={`إجمالي ربح ${fmt(calc.monthlyGrossProfitM)} − مصروف ${fmt(monthlyOpexM)}`}
          varianceTone={calc.monthlyNetCashflowM > 0 ? 'good' : 'bad'}
        />
        <KpiMetricCard
          label={`صافي الفائض بعد ${horizonMonths} شهراً`}
          value={calc.horizonNetGainM}
          unit="م.د"
          varianceText={`بعد خصم ميزانية ${fmt(proposedBudgetM, 0)} م.د`}
          varianceTone={calc.horizonNetGainM >= 0 ? 'good' : 'warn'}
        />
      </div>

      {/* Inputs + Payback Curve */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left/Right RTL Input Controls */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 lg:col-span-5">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-800">
              <label htmlFor="quick-roi-budget">الميزانية المقترحة للمشروع (مليون د.ع)</label>
              <span className="font-num font-bold text-[#1D63B8]">{fmt(proposedBudgetM, 0)} م.د</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                id="quick-roi-budget"
                type="number"
                min={5}
                max={2000}
                step={5}
                value={proposedBudgetM}
                onChange={(e) => setProposedBudgetM(Math.max(1, Number(e.target.value) || 0))}
                className="font-num w-28 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900"
              />
              <input
                type="range"
                min={20}
                max={750}
                step={10}
                value={Math.min(750, proposedBudgetM)}
                onChange={(e) => setProposedBudgetM(Number(e.target.value))}
                className="flex-1 accent-[#1D63B8]"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[50, 120, 180, 350, 550].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setProposedBudgetM(preset)}
                  className={`font-num rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    proposedBudgetM === preset
                      ? 'border-[#1D63B8] bg-[#1D63B8] text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {preset} م.د
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="quick-roi-margin" className="mb-1.5 block text-xs font-semibold text-slate-800">
              معيار هامش الربح الحالي المطبّق
            </label>
            <select
              id="quick-roi-margin"
              value={benchmarkId}
              onChange={(e) => setBenchmarkId(e.target.value as MarginBenchmarkId)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
            >
              {(Object.keys(benchmarks) as MarginBenchmarkId[]).map((key) => (
                <option key={key} value={key}>
                  {benchmarks[key].label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-800">
                <label htmlFor="quick-roi-sales">المبيعات الشهرية المستهدفة</label>
                <span className="font-num text-[#0F766E]">{fmt(monthlySalesTargetM, 0)} م.د</span>
              </div>
              <input
                id="quick-roi-sales"
                type="number"
                min={5}
                max={600}
                step={5}
                value={monthlySalesTargetM}
                onChange={(e) => setMonthlySalesTargetM(Math.max(1, Number(e.target.value) || 0))}
                className="font-num mb-1.5 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900"
              />
              <input
                type="range"
                min={15}
                max={300}
                step={5}
                value={Math.min(300, monthlySalesTargetM)}
                onChange={(e) => setMonthlySalesTargetM(Number(e.target.value))}
                className="w-full accent-[#0F766E]"
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-800">
                <label htmlFor="quick-roi-opex">مصاريف تشغيل شهرية</label>
                <span className="font-num text-slate-700">{fmt(monthlyOpexM, 1)} م.د</span>
              </div>
              <input
                id="quick-roi-opex"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={monthlyOpexM}
                onChange={(e) => setMonthlyOpexM(Math.max(0, Number(e.target.value) || 0))}
                className="font-num mb-1.5 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900"
              />
              <input
                type="range"
                min={0}
                max={30}
                step={0.5}
                value={Math.min(30, monthlyOpexM)}
                onChange={(e) => setMonthlyOpexM(Number(e.target.value))}
                className="w-full accent-slate-600"
              />
            </div>
          </div>

          <StatusNotice tone={calc.verdictTone === 'danger' ? 'danger' : calc.verdictTone === 'warning' ? 'warning' : 'neutral'}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-bold text-slate-900">التقييم السريع للجدوى</span>
              <StateLabel tone={calc.verdictTone} label={calc.verdictLabel} />
            </div>
            <p className="text-[11px] leading-relaxed">{calc.verdictHint}</p>
          </StatusNotice>
        </div>

        {/* Chart Side: Cumulative Payback Curve */}
        <div className="flex flex-col justify-between lg:col-span-7">
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-slate-900">
                منحنى استرداد رأس المال التراكمي (نقطة التعادل عند الخط الأحمر 0)
              </h4>
              <span className="text-[11px] text-slate-500">
                المعيار: {activeBenchmark.shortLabel} ({pct(activeBenchmark.marginPct)})
              </span>
            </div>
            <DecisionCurveChart
              data={calc.curve}
              xKey="month"
              yKey="cumulative"
              yName="صافي الرصيد التراكمي"
              unit="م.د"
              height={255}
            />
          </div>

          {/* 3 Benchmark Reference Strip */}
          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-200 pt-3 text-xs sm:grid-cols-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:block sm:border-b-0 sm:pb-0">
              <div className="text-[11px] text-slate-500">الهامش المطبّق</div>
              <div className="font-num font-bold text-slate-900">{pct(activeBenchmark.marginPct)}</div>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:block sm:border-b-0 sm:pb-0">
              <div className="text-[11px] text-slate-500">هامش الربح الشهري الناتج</div>
              <div className="font-num font-bold text-[#0F766E]">{fmt2(calc.monthlyGrossProfitM)} م.د</div>
            </div>
            <div className="flex items-center justify-between sm:block">
              <div className="text-[11px] text-slate-500">نقطة التعادل التقديرية</div>
              <div className="font-num font-bold text-[#1D63B8]">
                {Number.isFinite(calc.paybackMonths) ? `الشهر ${fmt(calc.paybackMonths, 1)}` : 'لا يتحقق تعادل'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SurfaceCard>
  );
}
