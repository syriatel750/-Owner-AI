import React, { useEffect, useMemo, useState } from 'react';
import {
  OWNER_DATA,
  filterTransactions,
  groupRows,
  sumRows,
  fmt,
  fmt2,
  pct,
  signFmt,
  DecisionRecord,
  ChannelSaleRow,
  SupplierPurchaseRow,
} from '../data/ownerData';
import {
  CHART_COLORS,
  SalesProfitTrendChart,
  WaterfallBridgeSvg,
  RegionComparisonBarChart,
  RegionGroupedPerfChart,
  RegionProductHeatmap,
  RevenueMarginScatterChart,
  ProductProfitBarChart,
  MixDonutChart,
  WorkingCapitalStackedChart,
  CategoryPlanActualChart,
  ChartEmpty,
} from './Charts';
import { KpiMetricCard, SurfaceCard, StatusNotice, StateLabel } from './UiPrimitives';
import { ForecastSection } from './ForecastSection';
import { AnnualSummarySection } from './AnnualSummarySection';
import { CumulativeProfitGrowthSection } from './CumulativeProfitGrowthSection';
import { FinancialSustainabilitySection } from './FinancialSustainabilitySection';
import { SensitivityAnalysisSection } from './SensitivityAnalysisSection';
import { SupplierAnalysisSection } from './SupplierAnalysisSection';
import { OpportunityProfitabilityMatrixSection } from './OpportunityProfitabilityMatrixSection';
import { AssetEfficiencySection } from './AssetEfficiencySection';
import { MarketTrendsRadarSection } from './MarketTrendsRadarSection';
import { QuickRoiCalculatorSection } from './QuickRoiCalculatorSection';
import { CashConversionCycleSection } from './CashConversionCycleSection';
import { ExpectedLiquidityCurveSection } from './ExpectedLiquidityCurveSection';
import { ExecutiveSmartReportSection } from './ExecutiveSmartReportSection';
import { ExportControls, PrintReportHeader } from './ExportControls';
import { exportCockpitToExcel } from '../utils/exportReports';
import { LiquiditySettings, analyzeWorkingCapitalAndLiquidity } from '../utils/liquidityAlerts';
import { InAppLiquidityToasts, LiquidityAlertFullPanel, LiquidityAlertStrip } from './LiquidityAlertCenter';

type CockpitTab = 'brief' | 'godview' | 'forecast' | 'margin' | 'sensitivity' | 'capital' | 'liquidity' | 'investment' | 'channels' | 'suppliers' | 'lab' | 'governance';

const TABS: Array<{ id: CockpitTab; label: string }> = [
  { id: 'brief', label: 'نبض المالك' },
  { id: 'godview', label: 'تحليل المناطق' },
  { id: 'forecast', label: 'التوقعات والنمو' },
  { id: 'margin', label: 'تشريح الربحية' },
  { id: 'sensitivity', label: 'تحليل الحساسية' },
  { id: 'capital', label: 'درع رأس المال' },
  { id: 'liquidity', label: 'الدورة النقدية والسيولة' },
  { id: 'investment', label: 'الاستثمار وكفاءة الأصول' },
  { id: 'channels', label: 'القنوات التجارية' },
  { id: 'suppliers', label: 'تحليل الموردين' },
  { id: 'lab', label: 'مختبر القرارات' },
  { id: 'governance', label: 'الحوكمة والضوابط' },
];

// Existing financial views are redistributed without changing their calculations.
const COCKPIT_GROUPS: Array<{ id: string; label: string; hint: string; tabs: CockpitTab[] }> = [
  { id: 'vision', label: 'الرؤية الشاملة', hint: 'النبض والمناطق والتوقعات', tabs: ['brief', 'godview', 'forecast'] },
  { id: 'economics', label: 'الربحية والتجارة', hint: 'SKU والتكاليف والقنوات والموردون', tabs: ['margin', 'sensitivity', 'channels', 'suppliers'] },
  { id: 'capital', label: 'الاستثمار والسيولة', hint: 'رأس المال والفرص والأصول ودورة النقد', tabs: ['capital', 'liquidity', 'investment'] },
  { id: 'decisions', label: 'القرارات والحوكمة', hint: 'المحاكاة والضوابط', tabs: ['lab', 'governance'] },
];

export function CockpitView({
  onNavigate,
  onOpenDecision,
  decisions,
  liquiditySettings,
  onOpenSettings,
}: {
  onNavigate: (view: 'cockpit' | 'review' | 'cases' | 'twin' | 'ask', twinTab?: string) => void;
  onOpenDecision: (kind: 'warehouse' | 'private' | 'pricing') => void;
  decisions: DecisionRecord[];
  liquiditySettings: LiquiditySettings;
  onOpenSettings: () => void;
}) {
  const [activeTab, setActiveTab] = useState<CockpitTab>('brief');
  const currentGroup = COCKPIT_GROUPS.find((g) => g.tabs.includes(activeTab)) ?? COCKPIT_GROUPS[0];
  const [period, setPeriod] = useState<string>(OWNER_DATA.latestPeriod);
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [godviewMetric, setGodviewMetric] = useState<'revenue' | 'gp' | 'margin' | 'quantity'>('revenue');

  // SKU Matrix filters
  const [skuSearch, setSkuSearch] = useState('');
  const [skuCategory, setSkuCategory] = useState('all');
  const [skuRegion, setSkuRegion] = useState('all');
  const [skuSort, setSkuSort] = useState<'gp_asc' | 'revenue_desc' | 'margin_asc' | 'discount_desc'>('gp_asc');

  // Capital filter
  const [capitalRegion, setCapitalRegion] = useState('all');

  // Optional local CSV imports for Channels & Suppliers (no fabricated data!)
  const [channelRows, setChannelRows] = useState<ChannelSaleRow[]>([]);
  const [supplierRows, setSupplierRows] = useState<SupplierPurchaseRow[]>([]);
  const [csvFeedback, setCsvFeedback] = useState<string | null>(null);

  // Smart Liquidity & Working Capital Alerts state
  const [dismissedToastIds, setDismissedToastIds] = useState<string[]>([]);
  const [acknowledgedAlertIds, setAcknowledgedAlertIds] = useState<string[]>([]);

  const liquidityAnalysis = useMemo(
    () => analyzeWorkingCapitalAndLiquidity(period, liquiditySettings),
    [period, liquiditySettings]
  );

  // Re-dispatch visual alerts whenever period or configured liquidity thresholds change
  useEffect(() => {
    setDismissedToastIds([]);
  }, [period, liquiditySettings]);

  const handleTriggerReCheck = () => {
    setDismissedToastIds([]);
  };

  const handleAcknowledgeAlert = (id: string) => {
    setAcknowledgedAlertIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const periodRows = useMemo(() => filterTransactions(OWNER_DATA.transactions, { period }), [period]);
  const periodPlanRows = useMemo(() => filterTransactions(OWNER_DATA.planRows, { period }), [period]);
  const periodTotals = useMemo(() => sumRows(periodRows), [periodRows]);
  const planTotals = useMemo(() => sumRows(periodPlanRows), [periodPlanRows]);

  const monthlyTrend = useMemo(() => {
    return OWNER_DATA.months.map((m) => {
      const actual = sumRows(filterTransactions(OWNER_DATA.transactions, { period: m.id, region: selectedRegion === 'all' ? 'الكل' : selectedRegion }));
      const plan = sumRows(filterTransactions(OWNER_DATA.planRows, { period: m.id, region: selectedRegion === 'all' ? 'الكل' : selectedRegion }));
      return {
        period: m.id,
        label: m.name,
        revenue: actual.revenue,
        planRevenue: plan.revenue,
        cogs: actual.cogs,
        gp: actual.gp,
        planGp: plan.gp,
      };
    });
  }, [selectedRegion]);

  const allMonthlyTrend = useMemo(() => {
    return OWNER_DATA.months.map((m) => {
      const actual = sumRows(filterTransactions(OWNER_DATA.transactions, { period: m.id }));
      const plan = sumRows(filterTransactions(OWNER_DATA.planRows, { period: m.id }));
      return {
        period: m.id,
        label: m.name,
        revenue: actual.revenue,
        planRevenue: plan.revenue,
        cogs: actual.cogs,
        gp: actual.gp,
        planGp: plan.gp,
      };
    });
  }, []);

  const regionSummary = useMemo(() => {
    return groupRows(periodRows, 'region')
      .map((r) => ({
        region: r.key,
        revenue: r.revenue,
        cogs: r.cogs,
        gp: r.gp,
        margin: r.margin,
        quantity: r.qty,
        count: r.count,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [periodRows]);

  const categoryComparison = useMemo(() => {
    const cats = [...new Set(OWNER_DATA.products.map((p) => p.cat))];
    return cats.map((cat) => {
      const act = sumRows(filterTransactions(OWNER_DATA.transactions, { period, cat }));
      const pln = sumRows(filterTransactions(OWNER_DATA.planRows, { period, cat }));
      return { name: cat, actual: act.gp, plan: pln.gp };
    });
  }, [period]);

  const brandMix = useMemo(() => {
    const brands = [...new Set(periodRows.map((r) => r.brand))];
    const palette = [CHART_COLORS.teal, CHART_COLORS.cobalt, CHART_COLORS.amber];
    return brands.map((b, i) => ({
      label: b,
      value: periodRows.filter((r) => r.brand === b).reduce((acc, r) => acc + r.revenue, 0),
      color: palette[i % palette.length],
    }));
  }, [periodRows]);

  // Heatmap rows for Godview
  const heatmapData = useMemo(() => {
    return OWNER_DATA.products.map((prod) => {
      const cells: Record<string, { margin: number; gp: number; revenue: number; discount: number }> = {};
      for (const reg of OWNER_DATA.regions) {
        const match = periodRows.find((r) => r.product === prod.id && r.region === reg);
        if (match) {
          cells[reg] = {
            margin: match.revenue ? (100 * match.gp) / match.revenue : 0,
            gp: match.gp,
            revenue: match.revenue,
            discount: match.discount,
          };
        }
      }
      return { productId: prod.id, productName: prod.name, cells };
    });
  }, [periodRows]);

  // SKU Matrix aggregation
  const skuMatrix = useMemo(() => {
    const byId = new Map(OWNER_DATA.products.map((p) => [p.id, p]));
    const ag = new Map<
      string,
      {
        id: string;
        name: string;
        cat: string;
        revenue: number;
        cogs: number;
        gp: number;
        quantity: number;
        grossList: number;
        discountValue: number;
        regions: Set<string>;
      }
    >();

    for (const r of periodRows) {
      if (skuRegion !== 'all' && r.region !== skuRegion) continue;
      if (skuCategory !== 'all' && r.cat !== skuCategory) continue;
      const p = byId.get(r.product);
      if (skuSearch && !`${r.product} ${p?.name || ''}`.toLowerCase().includes(skuSearch.toLowerCase())) continue;

      const cur = ag.get(r.product) || {
        id: r.product,
        name: p?.name || r.product,
        cat: r.cat,
        revenue: 0,
        cogs: 0,
        gp: 0,
        quantity: 0,
        grossList: 0,
        discountValue: 0,
        regions: new Set<string>(),
      };
      cur.revenue += r.revenue;
      cur.cogs += r.cogs;
      cur.gp += r.gp;
      cur.quantity += r.quantity;
      const gross = r.revenue / (1 - r.discount);
      cur.grossList += gross;
      cur.discountValue += gross * r.discount;
      cur.regions.add(r.region);
      ag.set(r.product, cur);
    }

    const list = Array.from(ag.values()).map((x) => ({
      ...x,
      margin: x.revenue ? (100 * x.gp) / x.revenue : 0,
      discountPct: x.grossList ? (100 * x.discountValue) / x.grossList : 0,
      regionCount: x.regions.size,
    }));

    const sorters = {
      gp_asc: (a: typeof list[0], b: typeof list[0]) => a.gp - b.gp,
      revenue_desc: (a: typeof list[0], b: typeof list[0]) => b.revenue - a.revenue,
      margin_asc: (a: typeof list[0], b: typeof list[0]) => a.margin - b.margin,
      discount_desc: (a: typeof list[0], b: typeof list[0]) => b.discountPct - a.discountPct,
    };
    return list.sort(sorters[skuSort]);
  }, [periodRows, skuRegion, skuCategory, skuSearch, skuSort]);

  const bridgePeriod = OWNER_DATA.commercialBridge[period];

  const handleCsvUpload = async (file: File, target: 'channels' | 'suppliers') => {
    try {
      const text = await file.text();
      const lines = text.trim().split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) {
        setCsvFeedback('الملف لا يحتوي على صفوف بيانات كافية.');
        return;
      }
      const headers = lines[0].split(',').map((h) => h.trim());
      const rows = lines.slice(1).map((line) => {
        const cols = line.split(',').map((c) => c.trim());
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => (obj[h] = cols[i] ?? ''));
        return obj;
      });

      if (target === 'channels') {
        const parsed: ChannelSaleRow[] = rows
          .filter((r) => r.channel && r.period)
          .map((r) => ({
            period: r.period,
            channel: r.channel,
            net_revenue_miqd: Number(r.net_revenue_miqd) || 0,
            cogs_miqd: Number(r.cogs_miqd) || 0,
            quantity: Number(r.quantity) || 0,
          }));
        setChannelRows(parsed);
        setCsvFeedback(`تمت قراءة ${parsed.length} سجل قناة محلياً.`);
      } else {
        const parsed: SupplierPurchaseRow[] = rows
          .filter((r) => r.supplier && r.period)
          .map((r) => ({
            period: r.period,
            supplier: r.supplier,
            purchase_miqd: Number(r.purchase_miqd) || 0,
            on_time_pct: Number(r.on_time_pct) || 0,
            defect_pct: Number(r.defect_pct) || 0,
            cost_variance_pct: r.cost_variance_pct !== undefined && r.cost_variance_pct !== '' ? Number(r.cost_variance_pct) || 0 : undefined,
          }));
        setSupplierRows(parsed);
        setCsvFeedback(`تمت قراءة ${parsed.length} سجل مورد محلياً.`);
      }
    } catch {
      setCsvFeedback('تعذر قراءة ملف CSV. تحقق من الترميز والأعمدة.');
    }
  };

  const marginPct = periodTotals.revenue ? (100 * periodTotals.gp) / periodTotals.revenue : 0;
  const gpVariance = periodTotals.gp - planTotals.gp;
  const gpAttainment = planTotals.gp ? (100 * periodTotals.gp) / planTotals.gp : 0;

  const activeTabLabel = TABS.find((t) => t.id === activeTab)?.label ?? 'مركز المالك';
  const periodLabel = OWNER_DATA.months.find((m) => m.id === period)?.label ?? period;

  return (
    <div className="space-y-6">
      <PrintReportHeader
        dashboardTitle={`مركز المالك التنفيذي — ${activeTabLabel}`}
        periodLabel={periodLabel}
        scopeDetails={`${OWNER_DATA.meta.sector} · المبيعات والأرباح ورأس المال العامل وكفاءة الأصول`}
      />

      {/* Executive Command Banner (Single Focal Anchor) */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-[#0F2744] via-[#12375B] to-[#0E565E] px-6 py-7 text-white sm:px-8">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold tracking-wide text-teal-200">
              {OWNER_DATA.meta.company} · مركز الاستخبارات الاقتصادية
            </div>
            <h2 className="mt-2 text-2xl font-extrabold leading-snug text-white sm:text-[28px]">
              قراءة تنفيذية للربحية، الفروع، ورأس المال العامل
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">
              جميع المؤشرات والرسوم البيانية مستخرجة مباشرة من سجلات الفواتير والخطط المحملة للفترة المختارة، مع فصل صريح بين الربح الإجمالي وصافي الربح.
            </p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-xs backdrop-blur-sm">
            <div className="font-semibold text-teal-100">حالة المصدر الحالي</div>
            <div className="mt-1 font-medium text-white">{OWNER_DATA.meta.dataTag}</div>
            <div className="mt-0.5 text-slate-300">{OWNER_DATA.meta.coverage}</div>
          </div>
        </div>
      </section>

      {/* Sub-navigation Tabs + Period Control + Export */}
      <div className="no-print flex flex-col gap-4 border-b border-slate-200 pb-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="المجموعات التحليلية">
            {COCKPIT_GROUPS.map((group) => (
              <button key={group.id} type="button" role="tab" aria-selected={currentGroup.id === group.id}
                onClick={() => setActiveTab(group.tabs[0])}
                className={`rounded-xl border px-4 py-2 text-xs font-bold transition-colors ${
                  currentGroup.id === group.id
                    ? 'border-[#0F766E] bg-[#0F766E] text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-teal-200 hover:text-teal-800'
                }`}>
                {group.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 border-r-2 border-teal-600 pr-3" role="tablist" aria-label="صفحات المجموعة المختارة">
            {TABS.filter((t) => currentGroup.tabs.includes(t.id)).map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(t.id)}
                className={`rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-[#0F766E] text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {t.id === 'capital' && liquidityAnalysis.alerts.length > 0
                  ? `${t.label} (${liquidityAnalysis.alerts.length})`
                  : t.label}
              </button>
            );
            })}
          </div>
          <p className="text-[11px] text-slate-500">{currentGroup.hint} · اختر صفحة واحدة لعرض تحليلاتها دون ازدحام</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <label htmlFor="cockpit-period" className="text-xs font-semibold text-slate-600 whitespace-nowrap">
              الفترة المالية
            </label>
            <select
              id="cockpit-period"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-[#1D63B8] focus:outline-none"
            >
              {OWNER_DATA.months.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <ExportControls
            dashboardTitle={`مركز المالك (${activeTabLabel})`}
            scopeLabel={periodLabel}
            onExportExcel={() =>
              exportCockpitToExcel({
                period,
                periodLabel,
                activeTabLabel,
                periodTotals,
                planTotals,
                regionSummary,
                skuMatrix: skuMatrix.map((s) => ({
                  product: s.id,
                  name: s.name,
                  cat: s.cat,
                  quantity: s.quantity,
                  revenue: s.revenue,
                  cogs: s.cogs,
                  gp: s.gp,
                  margin: s.margin,
                  discountPct: s.discountPct,
                })),
                ar: OWNER_DATA.ar,
                invWithNames: OWNER_DATA.inventory.map((i) => ({
                  ...i,
                  name: OWNER_DATA.products.find((p) => p.id === i.product)?.name ?? i.product,
                  slowValue: i.value * i.slow,
                })),
                decisions,
              })
            }
          />
        </div>
      </div>

      {/* TAB 1: نبض المالك */}
      {activeTab === 'brief' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiMetricCard
              label="صافي المبيعات"
              value={periodTotals.revenue}
              unit="مليون د.ع"
              subtext={`المخطط: ${fmt(planTotals.revenue)} مليون`}
              varianceText={periodTotals.revenue >= planTotals.revenue ? 'فوق الخطة' : 'دون الخطة'}
              varianceTone={periodTotals.revenue >= planTotals.revenue ? 'good' : 'bad'}
              badgeText={pct(planTotals.revenue ? (100 * periodTotals.revenue) / planTotals.revenue : 0)}
            />
            <KpiMetricCard
              label="الربح الإجمالي"
              value={periodTotals.gp}
              unit="مليون د.ع"
              subtext={`المخطط: ${fmt(planTotals.gp)} مليون`}
              varianceText={gpVariance >= 0 ? 'يتجاوز المستهدف' : `فجوة ${fmt(Math.abs(gpVariance))} مليون`}
              varianceTone={gpVariance >= 0 ? 'good' : 'bad'}
              badgeText={pct(gpAttainment)}
            />
            <KpiMetricCard
              label="هامش الربح الإجمالي"
              value={marginPct}
              unit="%"
              subtext={`الهامش المخطط: ${pct(planTotals.revenue ? (100 * planTotals.gp) / planTotals.revenue : 0)}`}
              varianceText="قبل تكاليف الخدمة والتشغيل"
              varianceTone="neutral"
            />
            <KpiMetricCard
              label="الكمية المباعة"
              value={periodTotals.qty}
              unit="وحدة"
              subtext={`المخطط: ${fmt(planTotals.qty, 0)} وحدة`}
              varianceText={periodTotals.qty >= planTotals.qty ? 'حجم طلب إيجابي' : 'تراجع عن الخطة'}
              varianceTone={periodTotals.qty >= planTotals.qty ? 'good' : 'warn'}
              badgeText={pct(planTotals.qty ? (100 * periodTotals.qty) / planTotals.qty : 0)}
            />
          </div>

          <LiquidityAlertStrip
            analysis={liquidityAnalysis}
            settings={liquiditySettings}
            onOpenSettings={onOpenSettings}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onTriggerReCheck={handleTriggerReCheck}
          />

          <ExecutiveSmartReportSection
            period={period}
            periodTotals={periodTotals}
            planTotals={planTotals}
            regionSummary={regionSummary}
            skuMatrix={skuMatrix}
            liquidityAnalysis={liquidityAnalysis}
            decisions={decisions}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SurfaceCard
              title="اتجاه المبيعات والربح الإجمالي عبر الأشهر"
              subtitle="مقارنة المبيعات الفعلية بالخطة مع مسار الربح الإجمالي (مليون د.ع)"
            >
              <SalesProfitTrendChart data={allMonthlyTrend} />
            </SurfaceCard>

            <SurfaceCard
              title="تحقق خطة الربح الإجمالي حسب القطاع"
              subtitle="مقارنة الفعل بالخطة التجريبية لكل قطاع سلعي"
            >
              <CategoryPlanActualChart data={categoryComparison} />
            </SurfaceCard>

            <SurfaceCard
              title="المبيعات حسب المناطق"
              subtitle="مليون د.ع · اضغط على أي مدينة للتحليل التفصيلي"
              action={
                <button
                  type="button"
                  onClick={() => setActiveTab('godview')}
                  className="text-xs font-semibold text-[#1D63B8] hover:underline"
                >
                  فتح لوحة المناطق ←
                </button>
              }
            >
              <RegionComparisonBarChart
                data={regionSummary}
                metric="revenue"
                unit="مليون د.ع"
                onSelectRegion={(reg) => {
                  setSelectedRegion(reg);
                  setActiveTab('godview');
                }}
              />
            </SurfaceCard>

            <SurfaceCard
              title="توزيع الإيرادات حسب طبيعة النشاط"
              subtitle="الاستيراد والتوزيع مقابل العلامة الخاصة"
            >
              <MixDonutChart slices={brandMix} />
            </SurfaceCard>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <SurfaceCard title="القراءة الاقتصادية للفترة">
              <p className="text-xs leading-relaxed text-slate-600">
                بلغ الربح الإجمالي <span className="font-num font-bold text-slate-900">{fmt(periodTotals.gp)}</span> مليون د.ع مقابل خطة{' '}
                <span className="font-num font-bold text-slate-900">{fmt(planTotals.gp)}</span> مليون د.ع. تراجع الهامش الإجمالي في أكتوبر ناتج أساساً عن ارتفاع تكلفة البضاعة وزيادة الخصومات في أصناف مثل زيت دوار الشمس، وليس عن تراجع الطلب الكلي.
              </p>
            </SurfaceCard>

            <SurfaceCard title="حدود الإثبات والبيانات">
              <p className="text-xs leading-relaxed text-slate-600">
                {OWNER_DATA.meta.sourceWarning} الربح الإجمالي المعروض لا يقتطع المصروفات الإدارية أو الإيجارات أو التمويل، ولا يعد الانحراف عن الخطة خسارة نقدية محققة.
              </p>
            </SurfaceCard>

            <SurfaceCard title="الخطوة التنفيذية التالية">
              <p className="mb-4 text-xs leading-relaxed text-slate-600">
                افحص ملفات القضايا المفتوحة أو اختبر سيناريوهات التسعير والتكلفة في التوأم الاقتصادي.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate('review')}
                  className="rounded-lg bg-[#1D63B8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#164E94]"
                >
                  المراجعة التنفيذية
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('cases')}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  القضايا الاقتصادية
                </button>
              </div>
            </SurfaceCard>
          </div>
        </div>
      )}

      {/* Grouped analytics: retain existing components and their financial logic. */}
      {activeTab === 'forecast' && (
        <div className="space-y-6">
          <AnnualSummarySection />
          <CumulativeProfitGrowthSection />
          <ForecastSection />
          <FinancialSustainabilitySection />
        </div>
      )}

      {activeTab === 'investment' && (
        <div className="space-y-6">
          <OpportunityProfitabilityMatrixSection />
          <AssetEfficiencySection period={period} />
          <MarketTrendsRadarSection />
          <QuickRoiCalculatorSection period={period} />
        </div>
      )}

      {activeTab === 'liquidity' && (
        <div className="space-y-6">
          <CashConversionCycleSection period={period} />
          <ExpectedLiquidityCurveSection
            period={period}
            periodTotals={periodTotals}
            liquidityAnalysis={liquidityAnalysis}
            liquiditySettings={liquiditySettings}
            onNavigateCapital={() => setActiveTab('capital')}
          />
        </div>
      )}

      {/* TAB 2: تحليل المناطق (Godview) */}
      {activeTab === 'godview' && (() => {
        const focus = selectedRegion === 'all' ? null : regionSummary.find((x) => x.region === selectedRegion);
        const totalRev = focus ? focus.revenue : periodTotals.revenue;
        const totalGp = focus ? focus.gp : periodTotals.gp;
        const totalQty = focus ? focus.quantity : periodTotals.qty;
        const mPct = totalRev ? (100 * totalGp) / totalRev : 0;

        return (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <label htmlFor="gv-region-select" className="text-xs font-bold text-slate-700">
                  المنطقة المختارة:
                </label>
                <select
                  id="gv-region-select"
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800"
                >
                  <option value="all">جميع المدن (المجموعة)</option>
                  {regionSummary.map((r) => (
                    <option key={r.region} value={r.region}>
                      {r.region}
                    </option>
                  ))}
                </select>
                {selectedRegion !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedRegion('all')}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    عرض كل المدن
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                {(
                  [
                    ['revenue', 'المبيعات'],
                    ['gp', 'الربح الإجمالي'],
                    ['margin', 'الهامش %'],
                    ['quantity', 'الكميات'],
                  ] as const
                ).map(([k, lbl]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setGodviewMetric(k)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                      godviewMetric === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiMetricCard label={focus ? `مبيعات ${focus.region}` : 'مبيعات جميع المناطق'} value={totalRev} unit="مليون د.ع" subtext={period} />
              <KpiMetricCard label="الربح الإجمالي" value={totalGp} unit="مليون د.ع" subtext="قبل مصاريف الفروع الثابتة" />
              <KpiMetricCard label="الهامش الإجمالي" value={mPct} unit="%" subtext="متوسط مرجح للمبيعات" />
              <KpiMetricCard label="الكمية المباعة" value={totalQty} unit="وحدة" subtext={`${focus ? focus.count : periodRows.length} سجل فاتورة`} />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <SurfaceCard
                title="مقارنة المناطق حسب المؤشر المختار"
                subtitle="اضغط على أي عمود لتحديد المدينة وتحديث الاتجاه الزمني"
              >
                <RegionComparisonBarChart
                  data={regionSummary}
                  metric={godviewMetric}
                  unit={godviewMetric === 'margin' ? '%' : godviewMetric === 'quantity' ? 'وحدة' : 'مليون د.ع'}
                  selectedRegion={selectedRegion}
                  onSelectRegion={setSelectedRegion}
                />
              </SurfaceCard>

              <SurfaceCard
                title="هيكل المبيعات والتكلفة والربح لكل منطقة"
                subtitle="المبيعات الصافية مقابل تكلفة البضاعة والربح الإجمالي"
              >
                <RegionGroupedPerfChart data={regionSummary} />
              </SurfaceCard>
            </div>

            <SurfaceCard
              title={`اتجاه المبيعات والربح عبر الأشهر — ${selectedRegion === 'all' ? 'جميع المناطق' : selectedRegion}`}
              subtitle="تطور الأداء الفعلي مقارنة بالخطة خلال الأشهر المتاحة"
            >
              <SalesProfitTrendChart data={monthlyTrend} />
            </SurfaceCard>

            <SurfaceCard
              title="الخريطة الحرارية لهوامش الربح (المنطقة × الصنف)"
              subtitle="نسبة هامش الربح الإجمالي لكل منتج في كل مدينة · اضغط على أي خلية لعرض التفاصيل"
            >
              <RegionProductHeatmap regions={OWNER_DATA.regions} rows={heatmapData} />
            </SurfaceCard>

            <SurfaceCard title="ملخص المناطق التفصيلي">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[540px] text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                      <th className="px-3 py-3 font-semibold">المنطقة</th>
                      <th className="px-3 py-3 font-semibold">صافي المبيعات (مليون)</th>
                      <th className="px-3 py-3 font-semibold">تكلفة البضاعة (مليون)</th>
                      <th className="px-3 py-3 font-semibold">الربح الإجمالي (مليون)</th>
                      <th className="px-3 py-3 font-semibold">الهامش %</th>
                      <th className="px-3 py-3 font-semibold">الكمية (وحدة)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {regionSummary.map((r) => (
                      <tr
                        key={r.region}
                        onClick={() => setSelectedRegion(r.region === selectedRegion ? 'all' : r.region)}
                        className={`cursor-pointer transition-colors hover:bg-slate-50 ${
                          selectedRegion === r.region ? 'bg-teal-50/50' : ''
                        }`}
                      >
                        <td className="px-3 py-3 font-bold text-slate-900">{r.region}</td>
                        <td className="px-3 py-3 font-num">{fmt(r.revenue)}</td>
                        <td className="px-3 py-3 font-num text-slate-600">{fmt(r.cogs)}</td>
                        <td className="px-3 py-3 font-num font-bold text-teal-800">{fmt(r.gp)}</td>
                        <td className="px-3 py-3 font-num">{pct(r.margin)}</td>
                        <td className="px-3 py-3 font-num">{fmt(r.quantity, 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SurfaceCard>
          </div>
        );
      })()}

      {/* TAB 3: تشريح الربحية */}
      {activeTab === 'margin' && (
        <div className="space-y-6">
          {bridgePeriod && (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                <KpiMetricCard label="المبيعات قبل الخصم" value={bridgePeriod.waterfall.grossSales} unit="مليون" />
                <KpiMetricCard label="إجمالي الخصومات" value={bridgePeriod.waterfall.discounts} unit="مليون" varianceTone="warn" />
                <KpiMetricCard label="صافي الإيرادات" value={bridgePeriod.waterfall.netRevenue} unit="مليون" />
                <KpiMetricCard label="تكلفة البضاعة" value={bridgePeriod.waterfall.cogs} unit="مليون" />
                <KpiMetricCard
                  label="الربح الإجمالي"
                  value={bridgePeriod.waterfall.grossProfit}
                  unit="مليون"
                  badgeText={pct(bridgePeriod.waterfall.grossMarginPct)}
                  varianceTone="good"
                />
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <SurfaceCard
                  title="شلال الربحية التجاري — من السعر المعلن إلى الربح الإجمالي"
                  subtitle={`الفترة ${period} · بالمليون د.ع · مرر المؤشر على أي عمود للتفاصيل`}
                >
                  <WaterfallBridgeSvg
                    steps={[
                      { name: 'المبيعات الإجمالية', value: bridgePeriod.waterfall.grossSales, type: 'total', note: 'قبل الخصم التجاري' },
                      { name: 'الخصومات', value: -bridgePeriod.waterfall.discounts, type: 'delta', note: 'مجموع الخصومات الممنوحة على الفواتير' },
                      { name: 'صافي الإيرادات', value: bridgePeriod.waterfall.netRevenue, type: 'total', note: 'المبيعات الفعلية بعد الخصم' },
                      { name: 'تكلفة البضاعة', value: -bridgePeriod.waterfall.cogs, type: 'delta', note: 'تكلفة الشراء / البضاعة المباعة' },
                      { name: 'الربح الإجمالي', value: bridgePeriod.waterfall.grossProfit, type: 'total', note: 'قبل تكلفة الخدمة والمصاريف الثابتة' },
                    ]}
                  />
                </SurfaceCard>

                <SurfaceCard
                  title={
                    bridgePeriod.comparison
                      ? `جسر تغير الربح (${bridgePeriod.previousPeriod} ← ${period})`
                      : 'جسر تغير الربح عن الفترة السابقة'
                  }
                  subtitle="تفكيك جبري للتغير بين الفترتين إلى حجم وسعر وخصم وتكلفة"
                >
                  {bridgePeriod.comparison ? (
                    <WaterfallBridgeSvg
                      steps={[
                        { name: `ربح ${bridgePeriod.previousPeriod}`, value: bridgePeriod.comparison.baselineGrossProfit, type: 'total', note: 'الأساس' },
                        { name: 'أثر الحجم', value: bridgePeriod.comparison.factors.volume, type: 'delta', note: 'تغير الكميات بالهامش السابق' },
                        { name: 'أثر السعر', value: bridgePeriod.comparison.factors.price, type: 'delta', note: 'تغير سعر القائمة' },
                        { name: 'أثر الخصم', value: bridgePeriod.comparison.factors.discount, type: 'delta', note: 'توسع أو تقلص الخصومات' },
                        { name: 'تكلفة الوحدة', value: bridgePeriod.comparison.factors.unitCost, type: 'delta', note: 'ارتفاع أو انخفاض كلفة التوريد' },
                        { name: `ربح ${period}`, value: bridgePeriod.comparison.currentGrossProfit, type: 'total', note: 'الربح الحالي' },
                      ]}
                    />
                  ) : (
                    <ChartEmpty title="لا توجد فترة سابقة للمقارنة" subtitle="فترة أغسطس 2026 هي بداية السلسلة المتاحة." />
                  )}
                </SurfaceCard>
              </div>
            </>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SurfaceCard
              title="مصفوفة الحجم مقابل الهامش للأصناف (Scatter)"
              subtitle="توزيع الأصناف حسب صافي المبيعات (س) وهامش الربح الإجمالي % (ص)"
            >
              <RevenueMarginScatterChart
                data={skuMatrix.map((s) => ({
                  id: s.id,
                  name: s.name,
                  cat: s.cat,
                  revenue: Number(s.revenue.toFixed(2)),
                  margin: Number(s.margin.toFixed(1)),
                  gp: Number(s.gp.toFixed(2)),
                }))}
              />
            </SurfaceCard>

            <SurfaceCard
              title="ترتيب الأصناف حسب مساهمة الربح الإجمالي"
              subtitle="مليون د.ع · الأصناف الخاسرة تظهر باللون الأحمر"
            >
              <ProductProfitBarChart data={[...skuMatrix].sort((a, b) => b.gp - a.gp)} />
            </SurfaceCard>
          </div>

          {/* Multi-filter SKU Table */}
          <SurfaceCard
            title="جدول تشريح الأصناف (SKU Matrix)"
            subtitle="تصفية وبحث فوري على مستوى الصنف والقطاع والمنطقة"
            action={
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate('twin', 'contribution')}
                  className="rounded-lg bg-[#0F766E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0D625B]"
                >
                  هامش المساهمة بعد الخدمة
                </button>
              </div>
            }
          >
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input
                type="text"
                value={skuSearch}
                onChange={(e) => setSkuSearch(e.target.value)}
                placeholder="ابحث باسم الصنف أو الرمز..."
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#1D63B8] focus:outline-none"
              />
              <select
                value={skuCategory}
                onChange={(e) => setSkuCategory(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
              >
                <option value="all">جميع القطاعات</option>
                {[...new Set(OWNER_DATA.products.map((p) => p.cat))].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={skuRegion}
                onChange={(e) => setSkuRegion(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
              >
                <option value="all">جميع المناطق</option>
                {OWNER_DATA.regions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <select
                value={skuSort}
                onChange={(e) => setSkuSort(e.target.value as typeof skuSort)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
              >
                <option value="gp_asc">الأقل ربحاً أولاً</option>
                <option value="revenue_desc">الأعلى مبيعات</option>
                <option value="margin_asc">الأقل هامشاً</option>
                <option value="discount_desc">الأعلى خصماً</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="px-3 py-3 font-semibold">المنتج</th>
                    <th className="px-3 py-3 font-semibold">القطاع</th>
                    <th className="px-3 py-3 font-semibold">الكمية</th>
                    <th className="px-3 py-3 font-semibold">صافي المبيعات</th>
                    <th className="px-3 py-3 font-semibold">التكلفة</th>
                    <th className="px-3 py-3 font-semibold">الربح الإجمالي</th>
                    <th className="px-3 py-3 font-semibold">الهامش %</th>
                    <th className="px-3 py-3 font-semibold">الخصم المرجح %</th>
                    <th className="px-3 py-3 font-semibold">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {skuMatrix.map((s) => (
                    <tr key={s.id} className={s.gp < 0 ? 'bg-rose-50/40' : s.margin < 8 ? 'bg-amber-50/40' : 'hover:bg-slate-50'}>
                      <td className="px-3 py-3">
                        <div className="font-bold text-slate-900">{s.name}</div>
                        <div className="font-num text-[11px] text-slate-500">{s.id}</div>
                      </td>
                      <td className="px-3 py-3 text-slate-600">{s.cat}</td>
                      <td className="px-3 py-3 font-num">{fmt(s.quantity, 0)}</td>
                      <td className="px-3 py-3 font-num">{fmt(s.revenue)}</td>
                      <td className="px-3 py-3 font-num text-slate-600">{fmt(s.cogs)}</td>
                      <td className={`px-3 py-3 font-num font-bold ${s.gp < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {fmt(s.gp)}
                      </td>
                      <td className="px-3 py-3 font-num">{pct(s.margin)}</td>
                      <td className="px-3 py-3 font-num">{pct(s.discountPct)}</td>
                      <td className="px-3 py-3">
                        {s.gp < 0 ? (
                          <StateLabel tone="danger" label="خسارة إجمالية" />
                        ) : s.margin < 8 ? (
                          <StateLabel tone="warning" label="هامش ضعيف" />
                        ) : (
                          <StateLabel tone="success" label="هامش صحي" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SurfaceCard>
        </div>
      )}

      {/* TAB 3B: تحليل الحساسية */}
      {activeTab === 'sensitivity' && <SensitivityAnalysisSection />}

      {/* TAB 4: درع رأس المال */}
      {activeTab === 'capital' && (() => {
        const ar = OWNER_DATA.ar;
        const inv = OWNER_DATA.inventory;
        const arTotal = ar.reduce((n, x) => n + x.current + x.overdue, 0);
        const arOverdue = ar.reduce((n, x) => n + x.overdue, 0);
        const invTotal = inv.reduce((n, x) => n + x.value, 0);
        const invSlow = inv.reduce((n, x) => n + x.value * x.slow, 0);

        const slicedAr = capitalRegion === 'all' ? ar : ar.filter((r) => r.region === capitalRegion);
        const slicedNow = slicedAr.reduce((n, x) => n + x.current, 0);
        const slicedLate = slicedAr.reduce((n, x) => n + x.overdue, 0);

        const invWithNames = inv
          .map((x) => ({
            ...x,
            name: OWNER_DATA.products.find((p) => p.id === x.product)?.name || x.product,
            fastValue: Number((x.value * (1 - x.slow)).toFixed(2)),
            slowValue: Number((x.value * x.slow).toFixed(2)),
          }))
          .sort((a, b) => b.slowValue - a.slowValue);

        return (
          <div className="space-y-6">
            <LiquidityAlertFullPanel
              analysis={liquidityAnalysis}
              settings={liquiditySettings}
              acknowledgedIds={acknowledgedAlertIds}
              onAcknowledge={handleAcknowledgeAlert}
              onOpenSettings={onOpenSettings}
              onTriggerReCheck={handleTriggerReCheck}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiMetricCard
                label="إجمالي الذمم المتأخرة"
                value={arOverdue}
                unit="مليون د.ع"
                subtext={`من أصل ${fmt(arTotal)} مليون`}
                varianceText={arOverdue / arTotal >= 0.25 ? 'تتطلب متابعة تحصيل' : 'ضمن النطاق'}
                varianceTone={arOverdue / arTotal >= 0.25 ? 'warn' : 'good'}
                badgeText={pct((100 * arOverdue) / arTotal)}
              />
              <KpiMetricCard
                label="الذمم غير المتأخرة"
                value={arTotal - arOverdue}
                unit="مليون د.ع"
                subtext="أرصدة جارية"
                varianceTone="good"
              />
              <KpiMetricCard label="إجمالي قيمة المخزون" value={invTotal} unit="مليون د.ع" subtext="آخر لقطة مخزون" />
              <KpiMetricCard
                label="تعرض المخزون بطيء الحركة"
                value={invSlow}
                unit="مليون د.ع"
                subtext="أرصدة معرضة للبطء وليست خسارة محققة"
                varianceText={pct((100 * invSlow) / invTotal)}
                varianceTone="warn"
              />
            </div>

            <StatusNotice tone="warning" title="نطاق وحدود قراءة رأس المال العامل">
              أرصدة الذمم والمخزون تمثل آخر لقطة تعرض ولا تتضمن جداول استحقاق الدائنين أو التدفقات النقدية اليومية. لا يجوز اعتبار هذه الأرصدة وفورات نقدية تلقائية دون خطة تحصيل أو تصريف فعلية.
            </StatusNotice>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <SurfaceCard
                title="هيكل الذمم المدينة حسب المنطقة"
                subtitle="مقارنة الذمم الجارية والمتأخرة في كل مدينة (مليون د.ع)"
                action={
                  <select
                    value={capitalRegion}
                    onChange={(e) => setCapitalRegion(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    <option value="all">جميع المدن</option>
                    {ar.map((x) => (
                      <option key={x.region} value={x.region}>{x.region}</option>
                    ))}
                  </select>
                }
              >
                <WorkingCapitalStackedChart
                  data={ar}
                  labelKey="region"
                  firstKey="current"
                  firstName="ذمم جارية"
                  firstColor={CHART_COLORS.teal}
                  secondKey="overdue"
                  secondName="ذمم متأخرة"
                  secondColor={CHART_COLORS.rose}
                />
              </SurfaceCard>

              <SurfaceCard
                title={`توزيع الذمم (${capitalRegion === 'all' ? 'المجموعة' : capitalRegion})`}
                subtitle="نسبة المتأخر مقابل الجاري"
              >
                <MixDonutChart
                  slices={[
                    { label: 'ذمم جارية (غير متأخرة)', value: slicedNow, color: CHART_COLORS.emerald },
                    { label: 'ذمم متأخرة', value: slicedLate, color: CHART_COLORS.rose },
                  ]}
                />
              </SurfaceCard>

              <SurfaceCard
                title="توزيع المخزون (متحرك مقابل بطيء الحركة) حسب الصنف"
                subtitle="أعلى الأصناف تعرضاً في رأس المال المحتجز بالمخزون"
              >
                <WorkingCapitalStackedChart
                  data={invWithNames}
                  labelKey="name"
                  firstKey="fastValue"
                  firstName="مخزون طبيعي الحركة"
                  firstColor={CHART_COLORS.cobalt}
                  secondKey="slowValue"
                  secondName="مخزون بطيء الحركة"
                  secondColor={CHART_COLORS.amber}
                  height={280}
                />
              </SurfaceCard>

              <SurfaceCard
                title="مزيج قيمة المخزون الإجمالية"
                subtitle="الرصيد الإجمالي للمخزون ونسبة بطيء الحركة"
              >
                <MixDonutChart
                  slices={[
                    { label: 'مخزون طبيعي الحركة', value: invTotal - invSlow, color: CHART_COLORS.cobalt },
                    { label: 'مخزون بطيء الحركة (تقديري)', value: invSlow, color: CHART_COLORS.amber },
                  ]}
                />
              </SurfaceCard>
            </div>

            <SurfaceCard title="تفاصيل المخزون بطيء الحركة حسب الصنف">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[540px] text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                      <th className="px-3 py-3 font-semibold">الصنف</th>
                      <th className="px-3 py-3 font-semibold">القطاع</th>
                      <th className="px-3 py-3 font-semibold">قيمة المخزون (مليون)</th>
                      <th className="px-3 py-3 font-semibold">نسبة بطيء الحركة</th>
                      <th className="px-3 py-3 font-semibold">قيمة التعرض (مليون)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invWithNames.map((item) => (
                      <tr key={item.product} className="hover:bg-slate-50">
                        <td className="px-3 py-3 font-bold text-slate-900">{item.name}</td>
                        <td className="px-3 py-3 text-slate-600">{item.category}</td>
                        <td className="px-3 py-3 font-num">{fmt(item.value)}</td>
                        <td className="px-3 py-3 font-num">{pct(item.slow * 100)}</td>
                        <td className="px-3 py-3 font-num font-bold text-amber-800">{fmt(item.slowValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SurfaceCard>
          </div>
        );
      })()}

      {/* TAB 5: القنوات التجارية */}
      {activeTab === 'channels' && (() => {
        const filteredChannels = channelRows.filter((r) => r.period === period);
        const agg = new Map<string, { name: string; revenue: number; gp: number; quantity: number }>();
        for (const r of filteredChannels) {
          const cur = agg.get(r.channel) || { name: r.channel, revenue: 0, gp: 0, quantity: 0 };
          cur.revenue += r.net_revenue_miqd;
          cur.gp += r.net_revenue_miqd - r.cogs_miqd;
          cur.quantity += r.quantity;
          agg.set(r.channel, cur);
        }
        const items = Array.from(agg.values()).sort((a, b) => b.revenue - a.revenue);

        return (
          <div className="space-y-6">
            <StatusNotice tone="warning" title="بيانات القنوات التجارية مصدر مستقل">
              سجلات المبيعات الحالية لا تحمل حقل القناة البيعية (جملة، تجزئة، سلاسل كبرى). لا يقوم النظام بتوزيع المبيعات بالافتراض؛ يمكنك استيراد ملف <code>channel_sales.csv</code> محلياً لعرض التحليل والرسوم.
            </StatusNotice>

            {csvFeedback && <StatusNotice tone="neutral">{csvFeedback}</StatusNotice>}

            <SurfaceCard
              title="القنوات التجارية"
              subtitle="يتطلب أعمدة: period, channel, net_revenue_miqd, cogs_miqd, quantity"
              action={
                <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                  استيراد channel_sales.csv
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleCsvUpload(e.target.files[0], 'channels')}
                  />
                </label>
              }
            >
              {items.length ? (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <MixDonutChart
                    slices={items.map((x, i) => ({
                      label: x.name,
                      value: x.revenue,
                      color: [CHART_COLORS.teal, CHART_COLORS.cobalt, CHART_COLORS.amber, CHART_COLORS.emerald][i % 4],
                    }))}
                  />
                  <ProductProfitBarChart data={items} dataKey="gp" nameKey="name" />
                </div>
              ) : (
                <ChartEmpty
                  title="لا تتوفر بيانات قنوات مستقلة في اللقطة الحالية"
                  subtitle="أضف ملف channel_sales.csv لتفعيل الرسوم البيانية للقنوات، أو تابع تحليل المناطق والأصناف من التبويبات الأخرى."
                />
              )}
            </SurfaceCard>
          </div>
        );
      })()}

      {/* TAB 6: تحليل الموردين */}
      {activeTab === 'suppliers' && (
        <SupplierAnalysisSection
          period={period}
          importedRows={supplierRows}
          onUploadCsv={(file) => handleCsvUpload(file, 'suppliers')}
          csvFeedback={csvFeedback}
        />
      )}

      {/* TAB 7: مختبر القرارات */}
      {activeTab === 'lab' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SurfaceCard
            title="مختبر المحاكاة والتوأم الاقتصادي"
            subtitle="اختبار تغيرات السعر والطلب وتكلفة الوحدة والخصم مع حساب جسر الأثر المتسلسل"
          >
            <p className="mb-4 text-xs leading-relaxed text-slate-600">
              يمكنك تشغيل المحاكاة التفاعلية على مستوى المجموعة أو مدينة أو صنف محدد، ومقارنة عدة سيناريوهات محفوظة جنباً إلى جنب.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onNavigate('twin', 'simulate')}
                className="rounded-lg bg-[#1D63B8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#164E94]"
              >
                فتح مختبر التوأم الاقتصادي
              </button>
              <button
                type="button"
                onClick={() => onNavigate('twin', 'decisions')}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                سجل القرارات والنتائج
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('sensitivity')}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                أداة تحليل الحساسية ←
              </button>
            </div>
          </SurfaceCard>

          <SurfaceCard
            title="محركات تقييم القرارات الاستثمارية والتسعيرية"
            subtitle="نماذج تفاعلية بمنحنيات التعادل والاسترداد والحساسية"
          >
            <p className="mb-4 text-xs leading-relaxed text-slate-600">
              ملاحظة منهجية: تغير الطلب في المحاكاة افتراض يدخله المستخدم وليس توقعاً مضموناً من السوق. النتائج تقيس الأثر على الربح الإجمالي.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onOpenDecision('warehouse')}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                تقييم مخزن البصرة
              </button>
              <button
                type="button"
                onClick={() => onOpenDecision('private')}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                فرصة العلامة الخاصة
              </button>
              <button
                type="button"
                onClick={() => onOpenDecision('pricing')}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                حساسية تسعير صنف
              </button>
            </div>
          </SurfaceCard>
        </div>
      )}

      {/* TAB 8: الحوكمة والضوابط */}
      {activeTab === 'governance' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SurfaceCard title="مصادر البيانات وحدود الاعتماد">
            <div className="space-y-3 text-xs text-slate-600">
              <p>{OWNER_DATA.meta.sourceWarning}</p>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span>تغطية صفوف المبيعات والمنتجات</span>
                <span className="font-num font-bold text-slate-900">
                  {OWNER_DATA.economicDiagnostics.coverage.rowsUsed} / {OWNER_DATA.economicDiagnostics.coverage.rowsSeen} صف
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span>تغطية تكلفة الخدمة المتغيرة</span>
                <span className="font-num font-bold text-slate-900">
                  {OWNER_DATA.contributionAnalysis.coverage.productsWithCompleteCost} / {OWNER_DATA.contributionAnalysis.coverage.productsTotal} منتجات
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span>مطابقة دفتر الأستاذ العام (GL)</span>
                <StateLabel tone="warning" label="يتطلب ميزان مراجعة خارجي" />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onNavigate('twin', 'diagnostics')}
                className="rounded-lg bg-[#0F766E] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0D625B]"
              >
                عرض الأدلة الحسابية
              </button>
              <button
                type="button"
                onClick={() => onNavigate('twin', 'financial')}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                الضوابط المالية
              </button>
            </div>
          </SurfaceCard>

          <SurfaceCard title="سجل القرارات المعتمدة للمراجعة" subtitle={`${decisions.length} قرارات مسجلة محلياً`}>
            {decisions.length ? (
              <div className="divide-y divide-slate-100">
                {decisions.slice(0, 6).map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{d.title}</div>
                      <div className="text-[11px] text-slate-500">{d.period} · خط الأساس: {d.baselineValue !== null ? `${fmt(d.baselineValue)} م` : 'غير متوفر'}</div>
                    </div>
                    <StateLabel
                      tone={d.status === 'completed' ? 'success' : d.status === 'rejected' ? 'danger' : 'neutral'}
                      label={
                        d.status === 'proposed'
                          ? 'مقترح'
                          : d.status === 'under_review'
                            ? 'قيد المراجعة'
                            : d.status === 'trial_authorized'
                              ? 'مصرّح بالتجربة'
                              : d.status === 'completed'
                                ? 'مكتمل'
                                : 'مرفوض'
                      }
                    />
                  </div>
                ))}
              </div>
            ) : (
              <ChartEmpty title="لا توجد قرارات مسجلة بعد" subtitle="يمكنك تسجيل مسودة قرار من تبويب القرارات والنتائج في التوأم الاقتصادي." />
            )}
          </SurfaceCard>
        </div>
      )}

      {/* Floating In-App Visual Liquidity Alerts */}
      <div className="no-print">
        <InAppLiquidityToasts
          alerts={liquidityAnalysis.alerts}
          enabled={liquiditySettings.alertsEnabled}
          dismissedIds={dismissedToastIds}
          onDismiss={(id) => setDismissedToastIds((prev) => [...prev, id])}
          onDismissAll={() => setDismissedToastIds(liquidityAnalysis.alerts.map((a) => a.id))}
          onOpenCapital={() => setActiveTab('capital')}
          onOpenSettings={onOpenSettings}
        />
      </div>
    </div>
  );
}
