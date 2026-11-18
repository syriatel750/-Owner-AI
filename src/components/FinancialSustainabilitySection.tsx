import React, { useMemo, useState } from 'react';
import { OWNER_DATA, fmt, pct, signFmt } from '../data/ownerData';
import { FinancialSustainabilityChart, SustainabilityCurvePoint } from './Charts';
import { StateLabel, SurfaceCard } from './UiPrimitives';

const EFFICIENCY_STEPS = [55, 65, 75, 85, 92];

export function FinancialSustainabilitySection() {
  const [inventoryEfficiencyGainPct, setInventoryEfficiencyGainPct] = useState<number>(25);
  const [logisticsResourceGainPct, setLogisticsResourceGainPct] = useState<number>(18);
  const [targetPrivateSharePct, setTargetPrivateSharePct] = useState<number>(24);

  const metrics = useMemo(() => {
    const arTotal = OWNER_DATA.ar.reduce((s, r) => s + r.current + r.overdue, 0);
    const arOverdue = OWNER_DATA.ar.reduce((s, r) => s + r.overdue, 0);
    const invTotal = OWNER_DATA.inventory.reduce((s, r) => s + r.value, 0);
    const invSlow = OWNER_DATA.inventory.reduce((s, r) => s + r.value * r.slow, 0);

    const octRows = OWNER_DATA.transactions.filter((t) => t.period === OWNER_DATA.latestPeriod);
    const octRev = octRows.reduce((s, r) => s + r.revenue, 0);
    const octPrivateRev = octRows.filter((t) => t.brand === 'علامة خاصة').reduce((s, r) => s + r.revenue, 0);
    const currentPrivateSharePct = octRev > 0 ? (100 * octPrivateRev) / octRev : 15.9;

    const contrib = OWNER_DATA.contributionAnalysis.totals;
    const baseContribPct = contrib.revenue > 0 ? (100 * contrib.contribution) / contrib.revenue : 8.82;

    // Baseline Resource Efficiency Score (0-100)
    const baseInvEff = invTotal > 0 ? (1 - invSlow / invTotal) * 100 : 76.8; // ~76.8%
    const baseArEff = arTotal > 0 ? (1 - arOverdue / arTotal) * 100 : 70.5; // ~70.5%
    const baseLogisticsEff = 62; // proxy reflecting cold-chain / freight drag
    const baseResourceEff = baseInvEff * 0.35 + baseArEff * 0.35 + baseLogisticsEff * 0.30; // ~70.1%

    // Projected Resource Efficiency with user improvements
    const projInvEff = Math.min(96, baseInvEff + (100 - baseInvEff) * (inventoryEfficiencyGainPct / 100));
    const projLogisticsEff = Math.min(96, baseLogisticsEff + (100 - baseLogisticsEff) * (logisticsResourceGainPct / 100));
    const projArEff = Math.min(94, baseArEff + inventoryEfficiencyGainPct * 0.25);
    const projectedResourceEff = projInvEff * 0.35 + projArEff * 0.35 + projLogisticsEff * 0.30;

    // Released liquidity & annual contribution gain from efficiency
    const releasedInvCash = invSlow * (inventoryEfficiencyGainPct / 100);
    const logisticsAnnualSavings = contrib.variableServiceCosts * (logisticsResourceGainPct / 100) * 12;
    const privateShareLiftRatio = Math.max(0, (targetPrivateSharePct - currentPrivateSharePct) / 100);
    const projectedContribPct = Math.min(
      24,
      baseContribPct + (logisticsResourceGainPct * 0.045) + privateShareLiftRatio * 18
    );

    // Long-Term Goal Attainment (4 Strategic Pillars from OWNER_DATA.owners.strategy)
    const calcGoals = (resEff: number, privShare: number, contribMargin: number, cashSaved: number) => {
      const liquidityGoal = Math.min(100, 48 + (resEff - 60) * 1.45 + cashSaved * 0.12);
      const marginGoal = Math.min(100, (contribMargin / 15) * 100);
      const privateLabelGoal = Math.min(100, (privShare / 25) * 100);
      const selfFundingGoal = Math.min(100, 42 + (resEff - 60) * 1.3 + cashSaved * 0.15);
      const overall = (liquidityGoal + marginGoal + privateLabelGoal + selfFundingGoal) / 4;
      return { liquidityGoal, marginGoal, privateLabelGoal, selfFundingGoal, overall };
    };

    const baseGoals = calcGoals(baseResourceEff, currentPrivateSharePct, baseContribPct, 0);
    const projGoals = calcGoals(
      projectedResourceEff,
      targetPrivateSharePct,
      projectedContribPct,
      releasedInvCash
    );

    const baseIndex = baseResourceEff * 0.5 + baseGoals.overall * 0.5;
    const projectedIndex = projectedResourceEff * 0.5 + projGoals.overall * 0.5;

    // Nearest efficiency bucket labels for reference markers
    const nearestBucket = (val: number) => {
      let best = EFFICIENCY_STEPS[0];
      for (const s of EFFICIENCY_STEPS) {
        if (Math.abs(s - val) < Math.abs(best - val)) best = s;
      }
      return `${best}%`;
    };

    const curveData: SustainabilityCurvePoint[] = EFFICIENCY_STEPS.map((eff) => {
      const ratioFromBase = Math.max(0, (eff - baseResourceEff) / 25);
      const cashRel = Math.max(0, (eff - 55) * 6.5);
      const estPriv = Math.min(30, currentPrivateSharePct + ratioFromBase * 9);
      const estMargin = Math.min(20, baseContribPct + ratioFromBase * 4.5);
      const g = calcGoals(eff, estPriv, estMargin, cashRel);
      const idxScore = eff * 0.5 + g.overall * 0.5;

      return {
        efficiencyPct: eff,
        label: `${eff}%`,
        goalAttainmentPct: Number(g.overall.toFixed(1)),
        sustainabilityIndex: Number(idxScore.toFixed(1)),
        releasedLiquidityM: Number(cashRel.toFixed(1)),
      };
    });

    return {
      baseResourceEff,
      projectedResourceEff,
      baseIndex,
      projectedIndex,
      baseGoals,
      projGoals,
      releasedInvCash,
      logisticsAnnualSavings,
      projectedContribPct,
      currentPrivateSharePct,
      curveData,
      currentBucketLabel: nearestBucket(baseResourceEff),
      projectedBucketLabel: nearestBucket(projectedResourceEff),
    };
  }, [inventoryEfficiencyGainPct, logisticsResourceGainPct, targetPrivateSharePct]);

  const strategicGoalsList = [
    {
      name: 'حماية السيولة وتقليص رأس المال المقيّد',
      base: metrics.baseGoals.liquidityGoal,
      projected: metrics.projGoals.liquidityGoal,
      note: `تحرير ${fmt(metrics.releasedInvCash)} م.د من المخزون البطيء`,
    },
    {
      name: 'هامش مساهمة مستدام (المستهدف 15%+)',
      base: metrics.baseGoals.marginGoal,
      projected: metrics.projGoals.marginGoal,
      note: `يرتفع الهامش المتوقع إلى ${pct(metrics.projectedContribPct)}`,
    },
    {
      name: 'توسيع العلامة الخاصة المحلية (المستهدف 25%)',
      base: metrics.baseGoals.privateLabelGoal,
      projected: metrics.projGoals.privateLabelGoal,
      note: `من ${pct(metrics.currentPrivateSharePct)} إلى ${pct(targetPrivateSharePct)}`,
    },
    {
      name: 'القدرة الذاتية على تمويل التوسع الاستثماري',
      base: metrics.baseGoals.selfFundingGoal,
      projected: metrics.projGoals.selfFundingGoal,
      note: `وفر لوجستي سنوي ${fmt(metrics.logisticsAnnualSavings)} م.د`,
    },
  ];

  const statusTone =
    metrics.projectedIndex >= 80 ? 'success' : metrics.projectedIndex >= 65 ? 'warning' : 'danger';
  const statusText =
    metrics.projectedIndex >= 80
      ? 'استدامة مالية قوية'
      : metrics.projectedIndex >= 65
        ? 'نطاق انتقالي قابل للتحسين'
        : 'ضغط استنزاف موارد';

  return (
    <SurfaceCard
      title="مؤشر الاستدامة المالية — كفاءة استهلاك الموارد مقابل الأهداف طويلة المدى"
      subtitle={`مربوط باستراتيجية المجموعة: "${OWNER_DATA.owners.strategy}"`}
      action={<StateLabel tone={statusTone} label={statusText} />}
    >
      <div className="space-y-6">
        {/* Interactive Resource Efficiency Levers */}
        <div className="grid grid-cols-1 gap-5 rounded-xl bg-slate-50/80 p-4 md:grid-cols-3 text-xs">
          <label className="font-semibold text-slate-700">
            <div className="flex justify-between">
              <span>تقليص هدر وبطء المخزون</span>
              <span className="font-num font-bold text-[#0F766E]">{fmt(inventoryEfficiencyGainPct, 0)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={60}
              step={5}
              value={inventoryEfficiencyGainPct}
              onChange={(e) => setInventoryEfficiencyGainPct(Number(e.target.value))}
              className="mt-2 w-full accent-[#0F766E]"
            />
            <div className="mt-1 text-[11px] font-normal text-slate-500">
              يحرر سيولة مخزونية بمقدار <strong className="font-num text-slate-800">{fmt(metrics.releasedInvCash)} م.د</strong>
            </div>
          </label>

          <label className="font-semibold text-slate-700">
            <div className="flex justify-between">
              <span>كفاءة اللوجستيات والطاقة والتبريد</span>
              <span className="font-num font-bold text-[#1D63B8]">{fmt(logisticsResourceGainPct, 0)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={40}
              step={2}
              value={logisticsResourceGainPct}
              onChange={(e) => setLogisticsResourceGainPct(Number(e.target.value))}
              className="mt-2 w-full accent-[#1D63B8]"
            />
            <div className="mt-1 text-[11px] font-normal text-slate-500">
              وفر سنوي بتكاليف الخدمة <strong className="font-num text-slate-800">{fmt(metrics.logisticsAnnualSavings)} م.د</strong>
            </div>
          </label>

          <label className="font-semibold text-slate-700">
            <div className="flex justify-between">
              <span>حصة العلامة الخاصة المستهدفة</span>
              <span className="font-num font-bold text-emerald-700">{fmt(targetPrivateSharePct, 0)}%</span>
            </div>
            <input
              type="range"
              min={16}
              max={35}
              step={1}
              value={targetPrivateSharePct}
              onChange={(e) => setTargetPrivateSharePct(Number(e.target.value))}
              className="mt-2 w-full accent-emerald-600"
            />
            <div className="mt-1 text-[11px] font-normal text-slate-500">
              الأساس الفعلي الحالي: <strong className="font-num text-slate-800">{pct(metrics.currentPrivateSharePct)}</strong>
            </div>
          </label>
        </div>

        {/* 4 Summary Metrics */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 text-xs">
          <div className="rounded-lg bg-slate-50 p-3.5">
            <div className="text-slate-500">مؤشر الاستدامة المالية الحالي</div>
            <div className="mt-1 font-num text-lg font-bold text-slate-900">
              {fmt(metrics.baseIndex, 1)} <span className="text-xs font-normal text-slate-500">/ 100</span>
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-3.5">
            <div className="text-slate-500">مؤشر الاستدامة المستهدف</div>
            <div className="mt-1 font-num text-lg font-bold text-[#1D63B8]">
              {fmt(metrics.projectedIndex, 1)} <span className="text-xs font-normal text-slate-500">/ 100</span>
            </div>
            <div className="mt-0.5 font-num text-[11px] font-semibold text-emerald-700">
              {signFmt(metrics.projectedIndex - metrics.baseIndex, 1)} نقطة تحسن
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-3.5">
            <div className="text-slate-500">كفاءة استهلاك الموارد</div>
            <div className="mt-1 font-num text-lg font-bold text-[#0F766E]">
              {pct(metrics.projectedResourceEff)}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">الأساس: {pct(metrics.baseResourceEff)}</div>
          </div>

          <div className="rounded-lg bg-slate-50 p-3.5">
            <div className="text-slate-500">تحقيق الأهداف طويلة المدى</div>
            <div className="mt-1 font-num text-lg font-bold text-emerald-700">
              {pct(metrics.projGoals.overall)}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">الأساس: {pct(metrics.baseGoals.overall)}</div>
          </div>
        </div>

        {/* Chart + Long-Term Goals Breakdown */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="mb-2 text-xs font-bold text-slate-800">
              منحنى ارتباط كفاءة استهلاك الموارد بتحقيق الأهداف طويلة المدى
            </div>
            <FinancialSustainabilityChart
              data={metrics.curveData}
              currentEffLabel={metrics.currentBucketLabel}
              projectedEffLabel={metrics.projectedBucketLabel}
              height={310}
            />
          </div>

          <div className="border-t border-slate-100 pt-4 lg:col-span-5 lg:border-t-0 lg:border-r lg:border-slate-200 lg:pr-6 lg:pt-0">
            <div className="mb-3 text-xs font-bold text-slate-800">
              تفكيك الأهداف طويلة المدى للشركة (الوضع الأساسي ← المستهدف)
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {strategicGoalsList.map((goal) => (
                <div key={goal.name} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">{goal.name}</span>
                    <span className="font-num font-bold text-[#0F766E]">{pct(goal.projected)}</span>
                  </div>
                  <div className="mt-1.5 relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="absolute inset-y-0 right-0 rounded-full bg-slate-300"
                      style={{ width: `${Math.min(100, goal.base)}%` }}
                    />
                    <div
                      className="absolute inset-y-0 right-0 rounded-full bg-[#0F766E] transition-all duration-300 opacity-85"
                      style={{ width: `${Math.min(100, goal.projected)}%` }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{goal.note}</span>
                    <span className="font-num">الأساس: {pct(goal.base)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SurfaceCard>
  );
}
