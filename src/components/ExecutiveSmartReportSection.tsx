import React, { useMemo, useState } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import {
  DecisionRecord,
  OWNER_DATA,
  SumTotals,
  fmt,
  pct,
  signFmt,
} from '../data/ownerData';
import { WorkingCapitalAnalysis } from '../utils/liquidityAlerts';
import { StateLabel, SurfaceCard } from './UiPrimitives';

type ReportWeek = 'w4' | 'w3' | 'w2' | 'w1';
type ReportFocus = 'comprehensive' | 'profitability' | 'liquidity';

const WEEK_OPTIONS: Array<{ id: ReportWeek; label: string; share: number; note: string }> = [
  { id: 'w4', label: 'الأسبوع الرابع (إغلاق الفترة)', share: 0.27, note: 'يتضمن تسويات الخصومات وتكاليف الشحن الختامية' },
  { id: 'w3', label: 'الأسبوع الثالث', share: 0.25, note: 'ذروة التسليمات للمناطق والطلب المؤسسي' },
  { id: 'w2', label: 'الأسبوع الثاني', share: 0.24, note: 'استقرار وتيرة البيع وتغذية المخازن الإقليمية' },
  { id: 'w1', label: 'الأسبوع الأول', share: 0.24, note: 'بداية دورة التوزيع الشهرية وتثبيت الأسعار' },
];

export function ExecutiveSmartReportSection({
  period,
  periodTotals,
  planTotals,
  regionSummary,
  skuMatrix,
  liquidityAnalysis,
  decisions,
  onNavigateTab,
}: {
  period: string;
  periodTotals: SumTotals;
  planTotals: SumTotals;
  regionSummary: Array<{
    region: string;
    revenue: number;
    cogs: number;
    gp: number;
    margin: number;
    quantity: number;
  }>;
  skuMatrix: Array<{
    id: string;
    name: string;
    cat: string;
    revenue: number;
    cogs: number;
    gp: number;
    margin: number;
    discountPct: number;
  }>;
  liquidityAnalysis: WorkingCapitalAnalysis;
  decisions: DecisionRecord[];
  onNavigateTab: (tab: 'margin' | 'capital' | 'suppliers' | 'governance') => void;
}) {
  const [selectedWeek, setSelectedWeek] = useState<ReportWeek>('w4');
  const [focus, setFocus] = useState<ReportFocus>('comprehensive');
  const [copied, setCopied] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const periodLabel = OWNER_DATA.months.find((m) => m.id === period)?.label ?? period;
  const weekConfig = WEEK_OPTIONS.find((w) => w.id === selectedWeek) ?? WEEK_OPTIONS[0];

  const report = useMemo(() => {
    const revAttainment = planTotals.revenue > 0 ? (100 * periodTotals.revenue) / planTotals.revenue : 0;
    const gpAttainment = planTotals.gp > 0 ? (100 * periodTotals.gp) / planTotals.gp : 0;
    const gpVariance = periodTotals.gp - planTotals.gp;
    const marginPct = periodTotals.revenue > 0 ? (100 * periodTotals.gp) / periodTotals.revenue : 0;
    const planMarginPct = planTotals.revenue > 0 ? (100 * planTotals.gp) / planTotals.revenue : 0;

    // Weekly share figures anchored to the period totals
    const weekRevenue = periodTotals.revenue * weekConfig.share;
    const weekPlanRevenue = planTotals.revenue * weekConfig.share;
    const weekGp = periodTotals.gp * weekConfig.share;
    const weekPlanGp = planTotals.gp * weekConfig.share;
    const weekGpGap = weekGp - weekPlanGp;
    const weekQty = Math.round(periodTotals.qty * weekConfig.share);

    // Top & weakest regions
    const sortedRegionsByGp = [...regionSummary].sort((a, b) => b.gp - a.gp);
    const bestRegion = sortedRegionsByGp[0];
    const lowestRegion = sortedRegionsByGp[sortedRegionsByGp.length - 1];

    // Top & losing SKUs
    const sortedSkusByGp = [...skuMatrix].sort((a, b) => b.gp - a.gp);
    const topSku = sortedSkusByGp[0];
    const negativeSkus = sortedSkusByGp.filter((s) => s.gp < 0);
    const worstSku = sortedSkusByGp[sortedSkusByGp.length - 1];
    const topDiscountSku = [...skuMatrix].sort((a, b) => b.discountPct - a.discountPct)[0];

    // Commercial bridge MoM factors if available
    const bridge = OWNER_DATA.commercialBridge[period]?.comparison;
    const bridgeDriverText = bridge
      ? `وعلى أساس شهري مقارن، جاء الفارق في الربح الإجمالي (${signFmt(bridge.change, 1)} م.د) مدفوعاً أساساً بتغيّر تكلفة الوحدة (${signFmt(bridge.factors.unitCost, 1)} م.د) والخصومات (${signFmt(bridge.factors.discount, 1)} م.د) مقابل أثر إيجابي من نمو الحجم (${signFmt(bridge.factors.volume, 1)} م.د).`
      : 'وتمثل هذه الفترة خط الأساس المرجعي الأول لسلسلة التقييم الاقتصادي في النظام.';

    // Decisions status summary
    const activeDecisions = decisions.filter((d) => d.status !== 'completed' && d.status !== 'rejected');
    const completedDecisions = decisions.filter((d) => d.status === 'completed');

    // Overall performance classification
    let overallTone: 'success' | 'warning' | 'danger' = 'success';
    let overallLabel = 'أداء متوازن ومستقر';
    if (gpAttainment < 75 || liquidityAnalysis.liquidityStatus === 'critical') {
      overallTone = 'danger';
      overallLabel = 'يتطلب تدخلاً تنفيذياً فورياً';
    } else if (gpAttainment < 95 || liquidityAnalysis.liquidityStatus === 'warning' || negativeSkus.length > 0) {
      overallTone = 'warning';
      overallLabel = 'يستدعي متابعة الهوامش والسيولة';
    }

    const executiveLead =
      `خلال ${weekConfig.label} من ${periodLabel} (${OWNER_DATA.meta.company})، سجّل الأداء الأسبوعي التقديري صافي مبيعات قدره ${fmt(weekRevenue)} م.د (مقابل مخطط ${fmt(weekPlanRevenue)} م.د بنسبة تحقق ${pct(revAttainment)}) وبحجم مبيعات ${fmt(weekQty, 0)} وحدة. وحققت المجموعة ربحاً إجمالياً أسبوعياً بنحو ${fmt(weekGp)} م.د مقارنة بخطة ${fmt(weekPlanGp)} م.د (${weekGpGap >= 0 ? 'فائض' : 'فجوة'} ${fmt(Math.abs(weekGpGap))} م.د)، ليستقر الهامش الإجمالي عند ${pct(marginPct)} مقابل ${pct(planMarginPct)} مستهدفاً. ${bridgeDriverText}`;

    const strengthBullets: string[] = [];
    if (bestRegion) {
      strengthBullets.push(
        `تقود ${bestRegion.region} مساهمة المناطق في الربحية بإجمالي ${fmt(bestRegion.gp)} م.د للشهر (هامش ${pct(bestRegion.margin)} ومبيعات ${fmt(bestRegion.revenue)} م.د).`
      );
    }
    if (topSku) {
      strengthBullets.push(
        `يتصدر صنف «${topSku.name}» قائمة الأصناف الرابحة بربح إجمالي ${fmt(topSku.gp)} م.د (هامش ${pct(topSku.margin)}).`
      );
    }
    if (lowestRegion && lowestRegion.region !== bestRegion?.region) {
      strengthBullets.push(
        `حافظت ${lowestRegion.region} على هامش ${pct(lowestRegion.margin)} بمبيعات ${fmt(lowestRegion.revenue)} م.د مع قابلية لرفع الحجم.`
      );
    }

    const pressureBullets: string[] = [];
    if (negativeSkus.length > 0 && worstSku) {
      pressureBullets.push(
        `يُلاحظ نزيف ربحية في ${negativeSkus.length} ${negativeSkus.length === 1 ? 'صنف' : 'أصناف'} سالبة الهامش، يتقدمها «${worstSku.name}» بخسارة إجمالية ${fmt(Math.abs(worstSku.gp))} م.د وهامش ${pct(worstSku.margin)}.`
      );
    }
    if (topDiscountSku && topDiscountSku.discountPct > 5) {
      pressureBullets.push(
        `ارتفعت نسبة الخصم الترويجي على «${topDiscountSku.name}» إلى ${pct(topDiscountSku.discountPct)}، ما يتطلب ضبط سقوف الخصم الممنوحة لقنوات التجزئة.`
      );
    }
    pressureBullets.push(
      `على مستوى رأس المال العامل: بلغت السيولة الحرة التقديرية ${fmt(liquidityAnalysis.estimatedFreeLiquidity)} م.د (${liquidityAnalysis.distanceToMinM >= 0 ? `فوق الحد الأدنى بـ ${fmt(liquidityAnalysis.distanceToMinM)} م.د` : `دون الحد الأدنى بـ ${fmt(Math.abs(liquidityAnalysis.distanceToMinM))} م.د`}) وتغطي ${fmt(liquidityAnalysis.coverageDays, 1)} يوماً من تكلفة المبيعات، فيما تتركز الذمم المتأخرة (${pct(liquidityAnalysis.overdueArPct)}) في ${liquidityAnalysis.topOverdueRegion.region} والمخزون البطيء (${pct(liquidityAnalysis.slowInventoryPct)}) في «${liquidityAnalysis.topSlowProduct.name}».`
    );

    const actionBullets: string[] = [
      negativeSkus.length > 0 && worstSku
        ? `تجميد الخصومات فوراً على «${worstSku.name}» ومراجعة عقود التوريد والتسعير قبل مطلع الأسبوع المقبل.`
        : `الحفاظ على انضباط الأسعار الحالي ومراقبة تغيرات كلفة الشحن للأصناف المستوردة.`,
      `إطلاق حملة تحصيل مركزة في ${liquidityAnalysis.topOverdueRegion.region} (${fmt(liquidityAnalysis.topOverdueRegion.overdue, 0)} م.د متأخرة) وتصريف المخزون البطيء في «${liquidityAnalysis.topSlowProduct.name}» لتحرير السيولة.`,
      decisions.length > 0
        ? `متابعة ${activeDecisions.length} قرارات نشطة مسجلة في النظام (مع ${completedDecisions.length} قرار مكتمل حتى الآن) وتحديث نتائجها المرصودة.`
        : `توثيق أول قرار تسعيري أو لوجستي في سجل القرارات لمتابعة الأثر الأسبوعي الفعلي مقارنة بخط الأساس.`,
    ];

    const plainTextSummary = [
      `تقرير الأداء التنفيذي الأسبوعي — ${OWNER_DATA.meta.company}`,
      `الفترة: ${periodLabel} · ${weekConfig.label} · الحالة: ${overallLabel}`,
      '',
      '1) الملخص التنفيذي:',
      executiveLead,
      '',
      '2) نقاط القوة والأداء المتميز:',
      ...strengthBullets.map((b) => `- ${b}`),
      '',
      '3) مواطن الضغط والمخاطر:',
      ...pressureBullets.map((b) => `- ${b}`),
      '',
      '4) أولويات الأسبوع القادم:',
      ...actionBullets.map((b) => `- ${b}`),
    ].join('\n');

    const generatedAt = new Date().toLocaleTimeString('ar-IQ', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return {
      overallTone,
      overallLabel,
      weekRevenue,
      weekGp,
      gpVariance,
      marginPct,
      executiveLead,
      strengthBullets,
      pressureBullets,
      actionBullets,
      plainTextSummary,
      activeAlertsCount: liquidityAnalysis.alerts.length,
      generatedAt,
      revision: refreshTick + 1,
    };
  }, [
    period,
    periodLabel,
    weekConfig,
    periodTotals,
    planTotals,
    regionSummary,
    skuMatrix,
    liquidityAnalysis,
    decisions,
    refreshTick,
  ]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(report.plainTextSummary);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <SurfaceCard
      title="تقرير الأداء التنفيذي الذكي (الملخص الأسبوعي الآلي)"
      subtitle={`صياغة تحليلية ديناميكية تتحدث تلقائياً وفق بيانات ${periodLabel} وإعدادات السيولة وسجل القرارات`}
      action={
        <div className="no-print flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setRefreshTick((t) => t + 1)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>تحديث الصياغة</span>
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D63B8] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#164E94]"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'تم النسخ للمشاركة' : 'نسخ التقرير النصي'}</span>
          </button>
        </div>
      }
    >
      {/* Controls & Executive Status Metadata */}
      <div className="mb-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <StateLabel tone={report.overallTone} label={report.overallLabel} />
          <span className="text-xs text-slate-500">
            مبيعات الأسبوع: <strong className="font-num text-slate-900">{fmt(report.weekRevenue)} م.د</strong>
            {' · '}
            ربح الأسبوع: <strong className="font-num text-[#0F766E]">{fmt(report.weekGp)} م.د</strong>
            {' · '}
            السيولة الحرة: <strong className="font-num text-slate-900">{fmt(liquidityAnalysis.estimatedFreeLiquidity)} م.د</strong>
            {' · '}
            التنبيهات النشطة: <strong className="font-num text-slate-900">{report.activeAlertsCount}</strong>
            {' · '}
            التوليد: <strong className="font-num text-slate-700">{report.generatedAt} (ن{report.revision})</strong>
          </span>
        </div>

        <div className="no-print flex flex-wrap items-center gap-2">
          <select
            aria-label="اختيار الأسبوع المالي"
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value as ReportWeek)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800"
          >
            {WEEK_OPTIONS.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label}
              </option>
            ))}
          </select>

          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
            {(
              [
                { id: 'comprehensive', label: 'شامل' },
                { id: 'profitability', label: 'الربحية' },
                { id: 'liquidity', label: 'السيولة' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFocus(f.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  focus === f.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Executive Narrative */}
      <div className="space-y-5">
        <div className="border-b border-slate-100 pb-4">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-slate-900">1. الخلاصة التنفيذية للأداء المالي الأسبوعي</h4>
            <span className="text-[11px] text-slate-500">{weekConfig.note}</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-700 sm:text-[13px]">{report.executiveLead}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Strengths */}
          {(focus === 'comprehensive' || focus === 'profitability') && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-emerald-800">2. محركات القوة والتفوق</h4>
                <button
                  type="button"
                  onClick={() => onNavigateTab('margin')}
                  className="no-print text-[11px] font-semibold text-[#1D63B8] hover:underline"
                >
                  تشريح الربحية ←
                </button>
              </div>
              <ul className="space-y-2.5 text-xs leading-relaxed text-slate-700">
                {report.strengthBullets.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Pressures & Alerts */}
          <div className={`space-y-2.5 ${focus !== 'comprehensive' ? 'lg:col-span-2' : ''}`}>
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-rose-800">3. مواطن الضغط ومؤشرات الإنذار</h4>
              <button
                type="button"
                onClick={() => onNavigateTab('capital')}
                className="no-print text-[11px] font-semibold text-[#1D63B8] hover:underline"
              >
                درع رأس المال ←
              </button>
            </div>
            <ul className="space-y-2.5 text-xs leading-relaxed text-slate-700">
              {report.pressureBullets
                .filter((_, idx) => {
                  if (focus === 'profitability') return idx < report.pressureBullets.length - 1;
                  if (focus === 'liquidity') return idx === report.pressureBullets.length - 1;
                  return true;
                })
                .map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
            </ul>
          </div>

          {/* Weekly Priorities & Decisions */}
          {(focus === 'comprehensive' || focus === 'liquidity') && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900">4. أولويات المتابعة للأسبوع القادم</h4>
                <button
                  type="button"
                  onClick={() => onNavigateTab('governance')}
                  className="no-print text-[11px] font-semibold text-[#1D63B8] hover:underline"
                >
                  سجل القرارات ←
                </button>
              </div>
              <ul className="space-y-2.5 text-xs leading-relaxed text-slate-700">
                {report.actionBullets.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1D63B8]" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </SurfaceCard>
  );
}
