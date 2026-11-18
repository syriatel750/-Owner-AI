import React, { useMemo, useState } from 'react';
import { OWNER_DATA, SumTotals, fmt, pct, signFmt } from '../data/ownerData';
import { LiquiditySettings, WorkingCapitalAnalysis } from '../utils/liquidityAlerts';
import { ExpectedLiquidityCurveChart, ExpectedLiquidityPoint } from './Charts';
import { KpiMetricCard, StateLabel, StatusNotice, SurfaceCard } from './UiPrimitives';

type LiquidityScenario = 'baseline' | 'stress' | 'mitigation';

interface FutureCashSchedule {
  id: string;
  label: string;
  shortLabel: string;
  revenueSeasonFactor: number;
  collectionEfficiency: number;
  supplierSeasonFactor: number;
  operatingObligationM: number;
  debtAndCapexM: number;
  commitmentNote: string;
}

const SIX_MONTH_SCHEDULE: FutureCashSchedule[] = [
  {
    id: '2026-11',
    label: 'نوفمبر 2026',
    shortLabel: 'نوفمبر',
    revenueSeasonFactor: 1.03,
    collectionEfficiency: 0.93,
    supplierSeasonFactor: 1.04,
    operatingObligationM: 42,
    debtAndCapexM: 32,
    commitmentNote: 'سداد دفعات اعتمادات استيراد موسمية + تشغيل المستودعات',
  },
  {
    id: '2026-12',
    label: 'ديسمبر 2026',
    shortLabel: 'ديسمبر',
    revenueSeasonFactor: 1.04,
    collectionEfficiency: 0.90,
    supplierSeasonFactor: 1.09,
    operatingObligationM: 48,
    debtAndCapexM: 56,
    commitmentNote: 'تسويات نهاية السنة المالية وشحنات تعزيز المخزون الجاف',
  },
  {
    id: '2027-01',
    label: 'يناير 2027',
    shortLabel: 'يناير',
    revenueSeasonFactor: 0.92,
    collectionEfficiency: 0.88,
    supplierSeasonFactor: 1.06,
    operatingObligationM: 46,
    debtAndCapexM: 60,
    commitmentNote: 'ذروة استحقاق التسهيلات المصرفية وتراجع طلب ما بعد نهاية العام',
  },
  {
    id: '2027-02',
    label: 'فبراير 2027',
    shortLabel: 'فبراير',
    revenueSeasonFactor: 0.97,
    collectionEfficiency: 0.91,
    supplierSeasonFactor: 1.03,
    operatingObligationM: 44,
    debtAndCapexM: 48,
    commitmentNote: 'تمويل طلبيات التعبئة والتخزين المبرد استعداداً لموسم الذروة',
  },
  {
    id: '2027-03',
    label: 'مارس 2027',
    shortLabel: 'مارس',
    revenueSeasonFactor: 1.09,
    collectionEfficiency: 0.95,
    supplierSeasonFactor: 1.01,
    operatingObligationM: 45,
    debtAndCapexM: 28,
    commitmentNote: 'انتعاش التدفقات النقدية التشغيلية وتحسن سرعة التحصيل',
  },
  {
    id: '2027-04',
    label: 'أبريل 2027',
    shortLabel: 'أبريل',
    revenueSeasonFactor: 1.08,
    collectionEfficiency: 0.96,
    supplierSeasonFactor: 0.98,
    operatingObligationM: 43,
    debtAndCapexM: 25,
    commitmentNote: 'استقرار دورة السداد وتراجع ضغط الالتزامات الرأسمالية',
  },
];

export function ExpectedLiquidityCurveSection({
  period,
  periodTotals,
  liquidityAnalysis,
  liquiditySettings,
  onNavigateCapital,
}: {
  period: string;
  periodTotals: SumTotals;
  liquidityAnalysis: WorkingCapitalAnalysis;
  liquiditySettings: LiquiditySettings;
  onNavigateCapital: () => void;
}) {
  const [scenario, setScenario] = useState<LiquidityScenario>('baseline');
  const [overdueRecoveryPct, setOverdueRecoveryPct] = useState<number>(12);
  const [extraMonthlyCommitM, setExtraMonthlyCommitM] = useState<number>(0);
  const [inflowVariancePct, setInflowVariancePct] = useState<number>(0);

  const periodLabel = OWNER_DATA.months.find((m) => m.id === period)?.label ?? period;
  const minFloorM = liquiditySettings.minAvailableLiquidityM;

  const applyScenario = (next: LiquidityScenario) => {
    setScenario(next);
    if (next === 'baseline') {
      setOverdueRecoveryPct(12);
      setExtraMonthlyCommitM(0);
      setInflowVariancePct(0);
    } else if (next === 'stress') {
      setOverdueRecoveryPct(5);
      setExtraMonthlyCommitM(18);
      setInflowVariancePct(-6);
    } else {
      setOverdueRecoveryPct(28);
      setExtraMonthlyCommitM(0);
      setInflowVariancePct(4);
    }
  };

  const projection = useMemo(() => {
    const startCashM = liquidityAnalysis.estimatedFreeLiquidity;
    const baseMonthlyRev = periodTotals.revenue > 0 ? periodTotals.revenue : 680;
    const baseMonthlyCogs = periodTotals.cogs > 0 ? periodTotals.cogs : 565;

    let runningCash = startCashM;
    let remainingOverdueAr = liquidityAnalysis.arOverdue;

    const basePoint: ExpectedLiquidityPoint = {
      id: period,
      label: `${periodLabel} (الرصيد الحالي)`,
      shortLabel: 'أكتوبر (حالي)',
      kind: 'baseline',
      openingBalanceM: startCashM,
      inflowsM: baseMonthlyRev,
      supplierObligationsM: baseMonthlyCogs,
      operatingObligationsM: 40,
      debtAndCapexObligationsM: 24,
      totalOutflowsM: baseMonthlyCogs + 64,
      netCashFlowM: baseMonthlyRev - (baseMonthlyCogs + 64),
      closingBalanceM: startCashM,
      minFloorM,
      fundingGapM: Math.max(0, minFloorM - startCashM),
      isGap: startCashM < minFloorM,
      isDeficit: startCashM < 0,
      commitmentNote: 'نقطة الانطلاق الفعلية للسيولة الحرة بعد تسويات الفترة',
    };

    const futurePoints: ExpectedLiquidityPoint[] = SIX_MONTH_SCHEDULE.map((m) => {
      const openingBalanceM = runningCash;
      const operatingCashIn =
        baseMonthlyRev * m.revenueSeasonFactor * m.collectionEfficiency * (1 + inflowVariancePct / 100);
      const recoveredOverdue = remainingOverdueAr * (overdueRecoveryPct / 100);
      remainingOverdueAr = Math.max(0, remainingOverdueAr - recoveredOverdue);

      const inflowsM = operatingCashIn + recoveredOverdue;
      const supplierObligationsM = baseMonthlyCogs * m.supplierSeasonFactor;
      const operatingObligationsM = m.operatingObligationM;
      const debtAndCapexObligationsM = m.debtAndCapexM + extraMonthlyCommitM;
      const totalOutflowsM = supplierObligationsM + operatingObligationsM + debtAndCapexObligationsM;

      const netCashFlowM = inflowsM - totalOutflowsM;
      const closingBalanceM = openingBalanceM + netCashFlowM;
      const fundingGapM = Math.max(0, minFloorM - closingBalanceM);
      const isGap = closingBalanceM < minFloorM;
      const isDeficit = closingBalanceM < 0;

      runningCash = closingBalanceM;

      return {
        id: m.id,
        label: m.label,
        shortLabel: m.shortLabel,
        kind: 'projected',
        openingBalanceM,
        inflowsM,
        supplierObligationsM,
        operatingObligationsM,
        debtAndCapexObligationsM,
        totalOutflowsM,
        netCashFlowM,
        closingBalanceM,
        minFloorM,
        fundingGapM,
        isGap,
        isDeficit,
        commitmentNote: m.commitmentNote,
      };
    });

    const chartData = [basePoint, ...futurePoints];
    const gapMonths = futurePoints.filter((p) => p.isGap);
    const deficitMonths = futurePoints.filter((p) => p.isDeficit);
    const lowestMonth = [...futurePoints].sort((a, b) => a.closingBalanceM - b.closingBalanceM)[0];
    const peakGapMonth = [...futurePoints].sort((a, b) => b.fundingGapM - a.fundingGapM)[0];
    const totalOutflowsSixM = futurePoints.reduce((s, p) => s + p.totalOutflowsM, 0);
    const totalInflowsSixM = futurePoints.reduce((s, p) => s + p.inflowsM, 0);
    const netSixMonthFlow = totalInflowsSixM - totalOutflowsSixM;
    const endingBalance = futurePoints[futurePoints.length - 1]?.closingBalanceM ?? startCashM;

    return {
      chartData,
      futurePoints,
      startCashM,
      gapMonths,
      deficitMonths,
      lowestMonth,
      peakGapMonth,
      totalOutflowsSixM,
      totalInflowsSixM,
      netSixMonthFlow,
      endingBalance,
    };
  }, [
    period,
    periodLabel,
    periodTotals,
    liquidityAnalysis,
    minFloorM,
    overdueRecoveryPct,
    extraMonthlyCommitM,
    inflowVariancePct,
  ]);

  const hasDeficit = projection.deficitMonths.length > 0;
  const hasGap = projection.gapMonths.length > 0;

  return (
    <SurfaceCard
      title="منحنى السيولة المتوقع والفجوات التمويلية (6 أشهر قادمة)"
      subtitle={`تحليل زمني للتدفقات النقدية المتوقعة والالتزامات الحالية من نوفمبر 2026 إلى أبريل 2027 مقارنة بحد الأمان (${fmt(minFloorM, 0)} م.د)`}
      action={
        <div className="no-print flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
            {(
              [
                { id: 'baseline', label: 'الالتزامات الحالية' },
                { id: 'stress', label: 'ضغط السداد والتحصيل' },
                { id: 'mitigation', label: 'تحوط وتحصيل مكثف' },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => applyScenario(s.id)}
                className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  scenario === s.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onNavigateCapital}
            className="whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            درع رأس المال ←
          </button>
        </div>
      }
    >
      {/* Funding Gap Alert Summary */}
      <div className="mb-5">
        <StatusNotice
          tone={hasDeficit ? 'danger' : hasGap ? 'warning' : 'success'}
          title={
            hasDeficit
              ? `تحذير عجز نقدي محتمل في ${projection.deficitMonths.length} ${projection.deficitMonths.length === 1 ? 'شهر' : 'أشهر'}`
              : hasGap
              ? `رصد فجوة تمويلية دون الحد الأدنى في ${projection.gapMonths.map((g) => g.shortLabel).join('، ')}`
              : 'المسار النقدي المتوقع مستقر فوق الحد الأدنى للسيولة'
          }
        >
          {hasGap ? (
            <>
              ينخفض رصيد السيولة المتوقع إلى أدنى مستوى له في <strong>{projection.lowestMonth?.label}</strong> عند{' '}
              <strong className="font-num">{fmt(projection.lowestMonth?.closingBalanceM ?? 0)} م.د</strong> بفجوة تمويلية قصوى قدرها{' '}
              <strong className="font-num">{fmt(projection.peakGapMonth?.fundingGapM ?? 0)} م.د</strong> دون الحد الأدنى الآمن ({fmt(minFloorM, 0)} م.د). يوصى بتسريع تحصيل الذمم المتأخرة أو جدولة دفعات الموردين والتسهيلات قبل حلول شهر الذروة.
            </>
          ) : (
            <>
              يحافظ منحنى السيولة على رصيد لا يقل عن{' '}
              <strong className="font-num">{fmt(projection.lowestMonth?.closingBalanceM ?? 0)} م.د</strong> في{' '}
              <strong>{projection.lowestMonth?.label}</strong>، مما يغطي كافة الالتزامات الجارية والموسمية دون الحاجة لتمويل إضافي.
            </>
          )}
        </StatusNotice>
      </div>

      {/* 4 Executive Cash KPIs */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiMetricCard
          label="نقطة الانطلاق (السيولة الحرة)"
          value={projection.startCashM}
          unit="مليون د.ع"
          subtext={`الذمم المتأخرة القابلة للتحصيل: ${fmt(liquidityAnalysis.arOverdue)} م.د`}
          varianceTone={projection.startCashM >= minFloorM ? 'good' : 'bad'}
        />
        <KpiMetricCard
          label="أدنى رصيد سيولة متوقع"
          value={projection.lowestMonth?.closingBalanceM ?? 0}
          unit="مليون د.ع"
          subtext={`الشهر الأشد ضغطاً: ${projection.lowestMonth?.label ?? '—'}`}
          varianceText={
            projection.lowestMonth?.isDeficit
              ? 'عجز نقدي سالب'
              : projection.lowestMonth?.isGap
              ? `فجوة ${fmt(projection.lowestMonth.fundingGapM)} م.د دون الحد`
              : `فوق الحد بـ ${fmt((projection.lowestMonth?.closingBalanceM ?? 0) - minFloorM)} م.د`
          }
          varianceTone={projection.lowestMonth?.isGap ? 'bad' : 'good'}
        />
        <KpiMetricCard
          label="ذروة الفجوة التمويلية المحتملة"
          value={projection.peakGapMonth?.fundingGapM ?? 0}
          unit="مليون د.ع"
          subtext={
            hasGap
              ? `عدد أشهر الفجوة: ${projection.gapMonths.length} من أصل 6 أشهر`
              : 'لا توجد فجوات تمويلية مرصودة'
          }
          varianceTone={hasGap ? 'bad' : 'good'}
        />
        <KpiMetricCard
          label="صافي التدفق التراكمي (6 أشهر)"
          value={projection.netSixMonthFlow}
          unit="مليون د.ع"
          subtext={`الرصيد في أبريل 2027: ${fmt(projection.endingBalance)} م.د`}
          varianceText={`إجمالي الالتزامات: ${fmt(projection.totalOutflowsSixM, 0)} م.د`}
          varianceTone={projection.netSixMonthFlow >= 0 ? 'good' : 'warn'}
        />
      </div>

      {/* Sensitivity & Cash Flow Levers */}
      <div className="no-print mb-5 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 md:grid-cols-3">
        <label className="text-xs font-semibold text-slate-700">
          <div className="flex items-center justify-between">
            <span>تحصيل الذمم المتأخرة شهرياً</span>
            <span className="font-num font-bold text-[#0F766E]">{pct(overdueRecoveryPct)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={45}
            step={1}
            value={overdueRecoveryPct}
            onChange={(e) => setOverdueRecoveryPct(Number(e.target.value))}
            className="mt-2 w-full accent-[#0F766E]"
          />
        </label>

        <label className="text-xs font-semibold text-slate-700">
          <div className="flex items-center justify-between">
            <span>التزامات إضافية / دفعات طارئة شهرياً</span>
            <span className="font-num font-bold text-amber-700">+{fmt(extraMonthlyCommitM, 0)} م.د</span>
          </div>
          <input
            type="range"
            min={0}
            max={80}
            step={2}
            value={extraMonthlyCommitM}
            onChange={(e) => setExtraMonthlyCommitM(Number(e.target.value))}
            className="mt-2 w-full accent-amber-600"
          />
        </label>

        <label className="text-xs font-semibold text-slate-700">
          <div className="flex items-center justify-between">
            <span>تغيّر وتيرة التدفقات الداخلة</span>
            <span className="font-num font-bold text-[#1D63B8]">{signFmt(inflowVariancePct, 0)}%</span>
          </div>
          <input
            type="range"
            min={-15}
            max={10}
            step={1}
            value={inflowVariancePct}
            onChange={(e) => setInflowVariancePct(Number(e.target.value))}
            className="mt-2 w-full accent-[#1D63B8]"
          />
        </label>
      </div>

      {/* Expected Liquidity Curve Chart */}
      <ExpectedLiquidityCurveChart data={projection.chartData} minFloorM={minFloorM} height={360} />

      {/* Monthly Cash Flow & Funding Gap Schedule Table */}
      <div className="mt-6 overflow-x-auto border-t border-slate-200 pt-4">
        <table className="w-full min-w-[760px] border-collapse text-right text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600">
              <th className="px-3 py-2.5">الشهر</th>
              <th className="px-3 py-2.5">رصيد الافتتاح</th>
              <th className="px-3 py-2.5">التدفقات الداخلة (+)</th>
              <th className="px-3 py-2.5">الالتزامات الحالية (−)</th>
              <th className="px-3 py-2.5">صافي التدفق الشهري</th>
              <th className="px-3 py-2.5">الرصيد المتوقع</th>
              <th className="px-3 py-2.5">الفجوة التمويلية</th>
              <th className="px-3 py-2.5">المؤشر</th>
              <th className="px-3 py-2.5">محرك الالتزام الرئيسي</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {projection.futurePoints.map((row) => (
              <tr
                key={row.id}
                className={
                  row.isDeficit
                    ? 'bg-rose-50/50'
                    : row.isGap
                    ? 'bg-amber-50/40'
                    : 'hover:bg-slate-50/70'
                }
              >
                <td className="px-3 py-2.5 font-bold text-slate-900">{row.label}</td>
                <td className="font-num px-3 py-2.5 text-slate-600">{fmt(row.openingBalanceM)} م.د</td>
                <td className="font-num px-3 py-2.5 font-semibold text-[#0F766E]">+{fmt(row.inflowsM)}</td>
                <td className="font-num px-3 py-2.5 font-semibold text-amber-700">−{fmt(row.totalOutflowsM)}</td>
                <td
                  className={`font-num px-3 py-2.5 font-bold ${
                    row.netCashFlowM >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {signFmt(row.netCashFlowM)}
                </td>
                <td
                  className={`font-num px-3 py-2.5 font-extrabold ${
                    row.isGap ? 'text-rose-700' : 'text-[#1D63B8]'
                  }`}
                >
                  {fmt(row.closingBalanceM)} م.د
                </td>
                <td className="font-num px-3 py-2.5 font-bold text-rose-700">
                  {row.fundingGapM > 0 ? `${fmt(row.fundingGapM)} م.د` : '—'}
                </td>
                <td className="px-3 py-2.5">
                  <StateLabel
                    tone={row.isDeficit ? 'danger' : row.isGap ? 'warning' : 'success'}
                    label={row.isDeficit ? 'عجز نقدي' : row.isGap ? 'فجوة تمويلية' : 'ضمن الأمان'}
                  />
                </td>
                <td className="px-3 py-2.5 text-[11px] text-slate-600">{row.commitmentNote}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SurfaceCard>
  );
}
