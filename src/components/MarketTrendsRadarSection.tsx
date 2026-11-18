import React, { useMemo, useState } from 'react';
import { OWNER_DATA, fmt, fmt2, pct, signFmt } from '../data/ownerData';
import { KpiMetricCard, StateLabel, StatusNotice, SurfaceCard } from './UiPrimitives';

type TrendScenarioMode = 'current_research' | 'unmitigated' | 'mitigated';

interface MarketTrendItem {
  id: 'customs_reform' | 'liquidity_shift' | 'logistics_asycuda';
  title: string;
  shortTitle: string;
  badge: string;
  tone: 'success' | 'warning' | 'danger';
  strokeColor: string;
  researchStat: string;
  researchSource: string;
  summary: string;
  affectedSkus: string;
  transmissionChannel: string;
  recommendedMove: string;
  calcImpactM: (mode: TrendScenarioMode) => {
    cogsDeltaM: number;
    serviceCostDeltaM: number;
    mixRevenueDeltaM: number;
    netContributionDeltaM: number;
  };
}

const BASE_CONTRIBUTION = OWNER_DATA.contributionAnalysis.totals;
const PRODUCTS = OWNER_DATA.contributionAnalysis.products;

// Exact SKU subsets from OWNER_DATA.contributionAnalysis
const sumSub = (ids: string[]) =>
  PRODUCTS.filter((p) => ids.includes(p.productId)).reduce(
    (acc, p) => {
      acc.revenue += p.revenue;
      acc.cogs += p.cogs;
      acc.gp += p.grossProfit;
      acc.service += p.variableServiceCosts;
      acc.contribution += p.contribution;
      return acc;
    },
    { revenue: 0, cogs: 0, gp: 0, service: 0, contribution: 0 }
  );

const FOOD_IMPORTS = sumSub(['P01', 'P02', 'P03', 'P05', 'P09']);
const NON_FOOD = sumSub(['P06']);
const PRIVATE_LABEL = sumSub(['P07', 'P08']);
const COLD_CHAIN = sumSub(['P05', 'P09']);

const MARKET_TRENDS: MarketTrendItem[] = [
  {
    id: 'customs_reform',
    title: 'إصلاحات التعرفة الجمركية وإعفاء الأغذية',
    shortTitle: 'التعرفة وإعفاء الأغذية',
    badge: 'أثر إيجابي صافي',
    tone: 'success',
    strokeColor: '#059669',
    researchStat: 'إعفاء الأغذية من الجمارك (أكتوبر 2026) مقابل 10%–20% على غير الغذائية',
    researchSource: 'قرار مجلس الوزراء 957 وتوجيه أكتوبر 2026 للتعرفة الجمركية في العراق',
    summary:
      'يعفي التوجيه الحكومي السلع الغذائية الأساسية من الرسوم الاسمية (0.5%–5%)، بينما يبقي شرائح 10%–20% على السلع غير الغذائية ويشترط الدفع المسبق للرسوم عند التحويل.',
    affectedSkus: 'الأغذية المستوردة (أرز، زيت، معلبات، لحوم) مقابل المنظفات (P06)',
    transmissionChannel: 'انخفاض كلفة الاستيراد الغذائية (-1.4%) مقابل ارتفاع كلفة P06 (+2.2%)',
    recommendedMove: 'تمرير جزء محدود من الوفر الجمركي لتعويض خسائر P03، وتثبيت مخزون P06 التعاقدي.',
    calcImpactM: (mode) => {
      const foodReliefRate = mode === 'mitigated' ? 0.018 : mode === 'current_research' ? 0.014 : 0.008;
      const nonFoodPenaltyRate = mode === 'unmitigated' ? 0.032 : mode === 'current_research' ? 0.022 : 0.012;
      const cogsSaving = FOOD_IMPORTS.cogs * foodReliefRate;
      const cogsExtra = NON_FOOD.cogs * nonFoodPenaltyRate;
      const netCogsDelta = cogsExtra - cogsSaving; // negative means cost dropped
      const serviceCostDeltaM = mode === 'unmitigated' ? 1.15 : mode === 'current_research' ? 0.65 : 0.25;
      const netContributionDeltaM = -netCogsDelta - serviceCostDeltaM;
      return {
        cogsDeltaM: netCogsDelta,
        serviceCostDeltaM,
        mixRevenueDeltaM: 0,
        netContributionDeltaM,
      };
    },
  },
  {
    id: 'liquidity_shift',
    title: 'ضغوط السيولة وتبدّل سلوك المستهلك نحو العلامة الخاصة',
    shortTitle: 'السيولة والعلامة الخاصة',
    badge: 'أثر مزدوج / تحوّل مزيج',
    tone: 'warning',
    strokeColor: '#D97706',
    researchStat: 'انكماش متوقع للناتج (-6.8% إلى -16%) وتضخم 3.5% وعجز جارٍ -10.8%',
    researchSource: 'تقارير آفاق اقتصاد العراق — صندوق النقد الدولي والبنك الدولي 2026',
    summary:
      'تقييد السيولة لدى الأسر يدفع الطلب للتحول من الأصناف المستوردة عالية السعر نحو العلامة الخاصة الاقتصادية (عدس وسكر روافد)، لكنه يضغط لزيادة الخصومات التجارية.',
    affectedSkus: 'عدس وسكر روافد (P07, P08) مقابل الأصناف المستوردة التنافسية (P03, P04)',
    transmissionChannel: 'تحوّل +8% لصالح العلامة الخاصة ذات هامش 21.4% مقابل ضغط خصم على المستورد',
    recommendedMove: 'توجيه الحوافز نحو العلامة الخاصة (روافد) وفرض سقف صارم لخصومات المنافذ الكبرى.',
    calcImpactM: (mode) => {
      const privateGrowth = mode === 'mitigated' ? 0.14 : mode === 'current_research' ? 0.08 : 0.04;
      const discountErosion = mode === 'unmitigated' ? 4.6 : mode === 'current_research' ? 2.75 : 0.9;
      const mixContributionGain = PRIVATE_LABEL.contribution * privateGrowth;
      const netContributionDeltaM = mixContributionGain - discountErosion;
      return {
        cogsDeltaM: 0,
        serviceCostDeltaM: 0,
        mixRevenueDeltaM: PRIVATE_LABEL.revenue * privateGrowth - discountErosion,
        netContributionDeltaM,
      };
    },
  },
  {
    id: 'logistics_asycuda',
    title: 'رقمنة الجمارك (ASYCUDA) وكلفة الموانئ والتبريد',
    shortTitle: 'أتمتة الموانئ والتبريد',
    badge: 'ضغط على التكاليف المتغيرة',
    tone: 'danger',
    strokeColor: '#DC2626',
    researchStat: 'إلزامية البيان المسبق ASYCUDA وشهادات المطابقة CoC ورسوم تأخير أم قصر',
    researchSource: 'تقارير اللوجستيات والموانئ العراقية وهيئة التقييس (COSQC) 2025–2026',
    summary:
      'يقلّص النظام المؤتمت التلاعب لكنه يفرض غرامات أرضيات وتخزين مبرد مرتفعة عند نقص شهادات المطابقة (CoC) أو تحويل مسارات الشحن عبر العقبة والخليج.',
    affectedSkus: 'المجمدات (P05 دجاج، P09 أسماك) وسلاسل التبريد بالموانئ',
    transmissionChannel: 'ارتفاع تكلفة الخدمة المتغيرة (+10% إلى +18%) في سلسلة التبريد واللوجستيات',
    recommendedMove: 'اعتماد التخليص الرقمي المسبق وفحص CoC قبل الشحن لتفادي غرامات الحاويات المبردة.',
    calcImpactM: (mode) => {
      const coldServiceJump = mode === 'unmitigated' ? 0.34 : mode === 'current_research' ? 0.21 : 0.06;
      const generalServiceJump = mode === 'unmitigated' ? 0.09 : mode === 'current_research' ? 0.05 : 0.01;
      const nonColdService = BASE_CONTRIBUTION.variableServiceCosts - COLD_CHAIN.service;
      const serviceCostDeltaM = COLD_CHAIN.service * coldServiceJump + nonColdService * generalServiceJump;
      const demurrageCogsM = mode === 'unmitigated' ? 2.1 : mode === 'current_research' ? 1.15 : 0.25;
      const netContributionDeltaM = -(serviceCostDeltaM + demurrageCogsM);
      return {
        cogsDeltaM: demurrageCogsM,
        serviceCostDeltaM,
        mixRevenueDeltaM: 0,
        netContributionDeltaM,
      };
    },
  },
];

export function MarketTrendsRadarSection() {
  const [scenarioMode, setScenarioMode] = useState<TrendScenarioMode>('current_research');
  const [selectedTrendId, setSelectedTrendId] = useState<MarketTrendItem['id']>('customs_reform');

  const computed = useMemo(() => {
    const items = MARKET_TRENDS.map((t) => {
      const impact = t.calcImpactM(scenarioMode);
      return {
        ...t,
        impact,
      };
    });

    const netDeltaM = items.reduce((s, x) => s + x.impact.netContributionDeltaM, 0);
    const totalMixRevDeltaM = items.reduce((s, x) => s + x.impact.mixRevenueDeltaM, 0);
    const baseContributionM = BASE_CONTRIBUTION.contribution; // 77.90 m IQD
    const projectedContributionM = baseContributionM + netDeltaM;
    const baseMarginPct = BASE_CONTRIBUTION.revenue
      ? (100 * baseContributionM) / BASE_CONTRIBUTION.revenue
      : 0;
    const projectedRevenueM = BASE_CONTRIBUTION.revenue + totalMixRevDeltaM;
    const projectedMarginPct = projectedRevenueM
      ? (100 * projectedContributionM) / projectedRevenueM
      : 0;

    return {
      items,
      netDeltaM,
      baseContributionM,
      projectedContributionM,
      baseMarginPct,
      projectedMarginPct,
      marginDeltaPts: projectedMarginPct - baseMarginPct,
    };
  }, [scenarioMode]);

  const activeTrend = useMemo(
    () => computed.items.find((t) => t.id === selectedTrendId) ?? computed.items[0],
    [computed.items, selectedTrendId]
  );

  // Mind Map Coordinates for Desktop SVG Connectors (viewBox 1000 x 430)
  // Center hub at x=500, y=215 -> Three branches at left/right/bottom or structured horizontal mind-map!
  // Let's use a crisp RTL 3-column Mind Map flow:
  // Right column (Hub, x=835, y=215) -> Middle column (3 Trend Nodes, x=520, y=75 / 215 / 355) -> Left column (Impact & Indicator Leaves, x=170, y=75 / 215 / 355)
  const branchCoords = [
    { y: 74, id: 'customs_reform' as const },
    { y: 215, id: 'liquidity_shift' as const },
    { y: 356, id: 'logistics_asycuda' as const },
  ];

  return (
    <SurfaceCard
      title="رادار اتجاهات السوق — خريطة ذهنية للأثر على هامش المساهمة"
      subtitle="ربط أحدث 3 اتجاهات اقتصادية محلية في العراق (2026) مع هيكل هامش المساهمة الفعلي لمجموعة روافد العراق"
      action={
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
          {(
            [
              { id: 'current_research', label: 'التقدير البحثي الراهن' },
              { id: 'unmitigated', label: 'دون تحوط تشغيلي' },
              { id: 'mitigated', label: 'مع خطة التكيف' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setScenarioMode(m.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                scenarioMode === m.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="mb-5">
        <StatusNotice tone="neutral" title="مرجعية البيانات البحثية وخط الأساس المحاسبي">
          تستند هذه القراءة إلى تقارير <strong>صندوق النقد والبنك الدولي (2026)</strong> و<strong>إصلاحات التعرفة الجمركية (قرار 957 وإعفاء أكتوبر 2026)</strong> و<strong>ضوابط نظام ASYCUDA بالموانئ العراقية</strong>، مع إسقاطها حسابياً على هامش المساهمة الشهري المسجل للمجموعة (<strong className="font-num">{fmt2(computed.baseContributionM)} م.د</strong> · <strong className="font-num">{pct(computed.baseMarginPct)}</strong>).
        </StatusNotice>
      </div>

      {/* 4 Summary KPIs */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiMetricCard
          label="هامش المساهمة الأساسي (أكتوبر)"
          value={computed.baseContributionM}
          unit="م.د"
          varianceText={`نسبة المساهمة الأساسية: ${pct(computed.baseMarginPct)}`}
          varianceTone="neutral"
        />
        <KpiMetricCard
          label="صافي أثر اتجاهات السوق الـ 3"
          value={computed.netDeltaM}
          unit="م.د / شهر"
          varianceText={
            computed.netDeltaM >= 0
              ? 'صافي دعم للربحية عند تطبيق خطة التكيف'
              : 'صافي ضغط متوقع على هامش المساهمة'
          }
          badgeText={`${signFmt(computed.netDeltaM, 2)} م.د`}
          varianceTone={computed.netDeltaM >= 0 ? 'good' : 'bad'}
        />
        <KpiMetricCard
          label="هامش المساهمة بعد الأثر"
          value={computed.projectedContributionM}
          unit="م.د"
          varianceText={`نسبة المساهمة المعدّلة: ${pct(computed.projectedMarginPct)}`}
          badgeText={`${signFmt(computed.marginDeltaPts, 2)} ن.م`}
          varianceTone={computed.marginDeltaPts >= 0 ? 'good' : 'warn'}
        />
        <KpiMetricCard
          label="الاتجاه الأكثر حساسية"
          value={Math.abs(
            Math.min(...computed.items.map((i) => i.impact.netContributionDeltaM))
          )}
          unit="م.د ضغط"
          varianceText="تكاليف الموانئ والتبريد (ASYCUDA)"
          varianceTone="bad"
        />
      </div>

      {/* Simple Interactive Mind Map */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-bold text-slate-800">
            الخريطة الذهنية التفاعلية — اضغط على أي اتجاه لعرض التفكيك البحثي والإجراء التنفيذي
          </div>
          <div className="text-[11px] text-slate-500">
            المركز (هامش المساهمة) ← الاتجاهات الاقتصادية الـ 3 ← الأثر المالي والنطاق المتأثر
          </div>
        </div>

        {/* Desktop Mind Map Canvas (3-level horizontal RTL diagram with SVG curved links) */}
        <div className="relative hidden lg:block">
          <div className="relative h-[430px] w-full overflow-hidden">
            {/* SVG Connector Layer (coordinates match the 3 columns below) */}
            <svg
              viewBox="0 0 1000 430"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-0 h-full w-full"
              aria-hidden="true"
            >
              {computed.items.map((item, idx) => {
                const yTarget = branchCoords[idx].y;
                const isSelected = selectedTrendId === item.id;
                const strokeW = isSelected ? 2.6 : 1.7;
                const opacity = isSelected ? 0.95 : 0.45;
                // Right Hub (x=760, y=215) -> Middle Trend Card (right edge x=640, left edge x=360) -> Left Leaf Card (right edge x=290)
                return (
                  <g key={item.id}>
                    <path
                      d={`M 760 215 C 705 215, 695 ${yTarget}, 640 ${yTarget}`}
                      fill="none"
                      stroke={item.strokeColor}
                      strokeWidth={strokeW}
                      strokeOpacity={opacity}
                    />
                    <path
                      d={`M 360 ${yTarget} C 325 ${yTarget}, 325 ${yTarget}, 290 ${yTarget}`}
                      fill="none"
                      stroke={item.strokeColor}
                      strokeWidth={strokeW}
                      strokeOpacity={opacity}
                      strokeDasharray="4 3"
                    />
                    <circle cx={640} cy={yTarget} r={3.5} fill={item.strokeColor} fillOpacity={opacity} />
                    <circle cx={290} cy={yTarget} r={3.5} fill={item.strokeColor} fillOpacity={opacity} />
                  </g>
                );
              })}
            </svg>

            {/* Right Column: Central Root Node (24% width -> right 0..240px in 1000px viewBox) */}
            <div
              className="absolute top-1/2 -translate-y-1/2"
              style={{ right: '1.5%', width: '22.5%' }}
            >
              <div className="rounded-xl border-2 border-[#0F2744] bg-[#0F2744] p-4 text-white shadow-sm">
                <div className="text-[11px] font-semibold text-teal-300">نقطة الارتكاز المالية</div>
                <div className="mt-1 text-sm font-extrabold leading-snug">
                  هامش المساهمة للمجموعة
                </div>
                <div className="mt-3 space-y-1.5 border-t border-white/15 pt-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-300">الأساس الحالي:</span>
                    <span className="font-num font-bold text-white">{fmt2(computed.baseContributionM)} م.د</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">أثر الاتجاهات الـ 3:</span>
                    <span
                      className={`font-num font-bold ${
                        computed.netDeltaM >= 0 ? 'text-emerald-300' : 'text-rose-300'
                      }`}
                    >
                      {signFmt(computed.netDeltaM, 2)} م.د
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-white/15 pt-1.5">
                    <span className="text-teal-200">المتوقع بعد الأثر:</span>
                    <span className="font-num font-extrabold text-teal-300">
                      {fmt2(computed.projectedContributionM)} م.د
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Column: 3 Economic Trend Branches (x=360..640 -> right 36%..64%, width 28%) */}
            {computed.items.map((item, idx) => {
              const isSelected = selectedTrendId === item.id;
              const topPct = idx === 0 ? '5%' : idx === 1 ? '38%' : '71%';
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedTrendId(item.id)}
                  className={`absolute rounded-xl border bg-white p-3.5 text-right transition-all ${
                    isSelected
                      ? 'border-slate-900 ring-2 ring-slate-900/15 shadow-sm'
                      : 'border-slate-200 hover:border-slate-400'
                  }`}
                  style={{ right: '36%', width: '28%', top: topPct }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-500">اتجاه #{idx + 1}</span>
                    <StateLabel tone={item.tone} label={item.badge} />
                  </div>
                  <div className="mt-1.5 text-xs font-bold leading-snug text-slate-900">
                    {item.title}
                  </div>
                  <div className="mt-1 truncate text-[11px] text-slate-500">
                    {item.researchStat}
                  </div>
                </button>
              );
            })}

            {/* Left Column: Leaf Nodes — Margin Impact & Affected Group Units (x=15..290 -> right 71%..98.5%, width 27.5%) */}
            {computed.items.map((item, idx) => {
              const isSelected = selectedTrendId === item.id;
              const topPct = idx === 0 ? '5%' : idx === 1 ? '38%' : '71%';
              const delta = item.impact.netContributionDeltaM;
              return (
                <div
                  key={`leaf-${item.id}`}
                  onClick={() => setSelectedTrendId(item.id)}
                  className={`absolute cursor-pointer rounded-xl border bg-white p-3.5 text-right transition-all ${
                    isSelected ? 'border-slate-400 bg-slate-50/40' : 'border-slate-200'
                  }`}
                  style={{ right: '71%', width: '27.5%', top: topPct }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-500">الأثر على المساهمة</span>
                    <span
                      className={`font-num text-sm font-extrabold ${
                        delta >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {signFmt(delta, 2)} م.د
                    </span>
                  </div>
                  <div className="mt-1.5 text-[11px] leading-relaxed text-slate-700">
                    <span className="font-semibold text-slate-900">الأصناف: </span>
                    {item.affectedSkus}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tablet / Mobile Simplified Mind Map Tree */}
        <div className="space-y-4 lg:hidden">
          <div className="rounded-xl bg-[#0F2744] p-4 text-white">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[11px] text-teal-300">مركز الخريطة الذهنية</div>
                <div className="text-sm font-extrabold">هامش المساهمة للمجموعة</div>
              </div>
              <div className="text-left">
                <div className="font-num text-base font-extrabold text-teal-300">
                  {fmt2(computed.projectedContributionM)} م.د
                </div>
                <div className="font-num text-[11px] text-slate-300">
                  صافي الأثر: {signFmt(computed.netDeltaM, 2)} م.د
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 border-r-2 border-slate-300 pr-4">
            {computed.items.map((item, idx) => {
              const delta = item.impact.netContributionDeltaM;
              const isSelected = selectedTrendId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedTrendId(item.id)}
                  className={`w-full rounded-xl border bg-white p-3.5 text-right ${
                    isSelected ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      {idx + 1}. {item.title}
                    </span>
                    <span
                      className={`font-num text-xs font-extrabold ${
                        delta >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {signFmt(delta, 2)} م.د
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-600">{item.researchStat}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Trend Research Breakdown & Group Margin Formula */}
      <div className="mt-5 grid grid-cols-1 gap-6 border-t border-slate-200 pt-5 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-7">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-bold text-slate-900">{activeTrend.title}</h4>
            <StateLabel tone={activeTrend.tone} label={activeTrend.badge} />
          </div>
          <p className="text-xs leading-relaxed text-slate-600">{activeTrend.summary}</p>
          <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 text-xs sm:grid-cols-2">
            <div>
              <div className="text-[11px] font-semibold text-slate-500">المؤشر والمصدر البحثي</div>
              <div className="mt-0.5 font-semibold text-slate-900">{activeTrend.researchStat}</div>
              <div className="mt-0.5 text-[11px] text-slate-500">{activeTrend.researchSource}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">آلية الانتقال إلى هامش المساهمة</div>
              <div className="mt-0.5 font-semibold text-slate-900">{activeTrend.transmissionChannel}</div>
              <div className="mt-0.5 text-[11px] text-slate-500">{activeTrend.affectedSkus}</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between space-y-3 border-t border-slate-100 pt-3 lg:col-span-5 lg:border-r lg:border-t-0 lg:pr-5 lg:pt-0">
          <div className="space-y-2 text-xs">
            <div className="font-bold text-slate-800">الأثر الكمي المفصّل لهذا الاتجاه (شهرياً)</div>
            <div className="flex justify-between border-b border-slate-100 pb-1.5">
              <span className="text-slate-600">تغيّر تكلفة البضاعة (COGS):</span>
              <span
                className={`font-num font-semibold ${
                  activeTrend.impact.cogsDeltaM <= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {signFmt(activeTrend.impact.cogsDeltaM, 2)} م.د
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1.5">
              <span className="text-slate-600">تغيّر تكلفة الخدمة المتغيرة:</span>
              <span
                className={`font-num font-semibold ${
                  activeTrend.impact.serviceCostDeltaM <= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {signFmt(activeTrend.impact.serviceCostDeltaM, 2)} م.د
              </span>
            </div>
            <div className="flex justify-between pt-0.5">
              <span className="font-bold text-slate-900">صافي الأثر على هامش المساهمة:</span>
              <span
                className={`font-num font-extrabold ${
                  activeTrend.impact.netContributionDeltaM >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {signFmt(activeTrend.impact.netContributionDeltaM, 2)} م.د
              </span>
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 px-3.5 py-2.5 text-[11px] leading-relaxed text-slate-700">
            <strong className="text-slate-900">التوصية الاستراتيجية: </strong>
            {activeTrend.recommendedMove}
          </div>
        </div>
      </div>
    </SurfaceCard>
  );
}
