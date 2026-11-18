import React, { useMemo, useState } from 'react';
import {
  OWNER_DATA,
  filterTransactions,
  groupRows,
  sumRows,
  computeTwinSimulation,
  fmt,
  fmt2,
  pct,
  signFmt,
  SavedScenario,
  DecisionRecord,
  TransactionRow,
} from '../data/ownerData';
import {
  WaterfallBridgeSvg,
  ProductProfitBarChart,
  ContributionComparisonChart,
  ScenarioCompareBarChart,
  RevenueMarginScatterChart,
  ChartEmpty,
} from './Charts';
import { KpiMetricCard, SurfaceCard, StatusNotice, StateLabel } from './UiPrimitives';
import { ScenarioComparisonSection } from './ScenarioComparisonSection';

export type TwinTabId =
  | 'model'
  | 'simulate'
  | 'compare'
  | 'opportunities'
  | 'diagnostics'
  | 'contribution'
  | 'decisions'
  | 'financial'
  | 'memory';

const TWIN_TABS: Array<{ id: TwinTabId; label: string }> = [
  { id: 'model', label: 'صورة النموذج' },
  { id: 'simulate', label: 'مختبر القرارات' },
  { id: 'compare', label: 'مقارنة السيناريوهات' },
  { id: 'opportunities', label: 'فرص وتحسينات' },
  { id: 'diagnostics', label: 'الربحية والأدلة' },
  { id: 'contribution', label: 'هامش المساهمة' },
  { id: 'decisions', label: 'القرارات والنتائج' },
  { id: 'financial', label: 'الضوابط المالية' },
  { id: 'memory', label: 'ذاكرة القرار' },
];

export function TwinView({
  activeTab,
  onTabChange,
  scenarios,
  onSaveScenario,
  decisions,
  onCreateDecision,
  onTransitionDecision,
  onRecordOutcome,
  onOpenDecisionModal,
}: {
  activeTab: TwinTabId;
  onTabChange: (tab: TwinTabId) => void;
  scenarios: SavedScenario[];
  onSaveScenario: (s: SavedScenario) => void;
  decisions: DecisionRecord[];
  onCreateDecision: (rec: {
    recommendationKey: string;
    title: string;
    action: string;
    period: string;
    baselineValue: number | null;
    baselineSource: 'manual' | 'verified_source';
  }) => void;
  onTransitionDecision: (id: string, nextStatus: DecisionRecord['status'], reason: string) => void;
  onRecordOutcome: (id: string, observedPeriod: string, observedValue: number, externalFactors: string, evidenceNote: string) => void;
  onOpenDecisionModal: (kind: 'warehouse' | 'private' | 'pricing', productId?: string) => void;
}) {
  // Scope state
  const [period, setPeriod] = useState(OWNER_DATA.latestPeriod);
  const [region, setRegion] = useState('الكل');
  const [cat, setCat] = useState('الكل');
  const [product, setProduct] = useState('الكل');

  // Simulator sliders
  const [pricePct, setPricePct] = useState(5);
  const [demandPct, setDemandPct] = useState(-4);
  const [costPct, setCostPct] = useState(0);
  const [discountPoints, setDiscountPoints] = useState(0);

  // Decisions inline form state
  const [activeDecisionAction, setActiveDecisionAction] = useState<{
    id: string;
    mode: 'transition' | 'outcome';
    targetStatus?: DecisionRecord['status'];
  } | null>(null);
  const [reasonInput, setReasonInput] = useState('');
  const [outcomePeriod, setOutcomePeriod] = useState('2026-10');
  const [outcomeVal, setOutcomeVal] = useState('');
  const [outcomeFactors, setOutcomeFactors] = useState('');
  const [outcomeNote, setOutcomeNote] = useState('');
  const [decisionFeedback, setDecisionFeedback] = useState<string | null>(null);

  // Financial control check
  const [financialChecked, setFinancialChecked] = useState(false);

  const availProducts = useMemo(
    () => OWNER_DATA.products.filter((p) => cat === 'الكل' || p.cat === cat),
    [cat]
  );
  const activeProduct = availProducts.some((p) => p.id === product) ? product : 'الكل';

  const actualRows = useMemo(
    () =>
      filterTransactions(OWNER_DATA.transactions, {
        period,
        region,
        cat,
        product: activeProduct,
      }) as TransactionRow[],
    [period, region, cat, activeProduct]
  );

  const planRows = useMemo(
    () =>
      filterTransactions(OWNER_DATA.planRows, {
        period,
        region,
        cat,
        product: activeProduct,
      }),
    [period, region, cat, activeProduct]
  );

  const a = useMemo(() => sumRows(actualRows), [actualRows]);
  const p = useMemo(() => sumRows(planRows), [planRows]);

  const productGroups = useMemo(() => {
    return groupRows(actualRows, 'product')
      .map((g) => {
        const prod = OWNER_DATA.products.find((x) => x.id === g.key);
        return { ...g, name: prod?.name || g.key, cat: prod?.cat || '' };
      })
      .sort((x, y) => y.gp - x.gp);
  }, [actualRows]);

  const sim = useMemo(
    () => computeTwinSimulation(actualRows, { pricePct, demandPct, costPct, discountPoints }),
    [actualRows, pricePct, demandPct, costPct, discountPoints]
  );

  const handleSaveScenario = () => {
    const scopeLabel = `${region === 'الكل' ? 'المجموعة' : region} · ${cat === 'الكل' ? 'كل القطاعات' : cat}`;
    onSaveScenario({
      id: `SCN-${Date.now()}`,
      name: `سيناريو ${scenarios.length + 1}: ${scopeLabel}`,
      scope: { period, region, cat, product: activeProduct },
      price: pricePct / 100,
      demand: demandPct / 100,
      cost: costPct / 100,
      discountPoints: discountPoints / 100,
      baseGp: sim.base.gp,
      nextGp: sim.next.gp,
      delta: sim.delta,
      baseRev: sim.base.revenue,
      nextRev: sim.next.revenue,
      createdAt: new Date().toISOString().slice(0, 10),
    });
    onTabChange('memory');
  };

  const statusLabels: Record<DecisionRecord['status'], string> = {
    proposed: 'مقترح',
    under_review: 'قيد المراجعة',
    trial_authorized: 'مصرّح بالتجربة محلياً',
    rejected: 'مرفوض',
    completed: 'مكتمل التسجيل',
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <section className="rounded-2xl bg-gradient-to-l from-[#102642] via-[#123055] to-[#0F4C5C] px-6 py-7 text-white sm:px-8">
        <div className="text-xs font-semibold tracking-wide text-sky-200">التوأم الاقتصادي الرقمي · نموذج تفاعلي</div>
        <h2 className="mt-2 text-2xl font-extrabold sm:text-[26px]">
          كيف تتحول قرارات التسعير والخصم والتكلفة إلى نتائج اقتصادية؟
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-200">
          توأم اقتصادي يربط المبيعات والتكاليف والربح والمخزون والسيولة، ويختبر سيناريوهات التغيير حسابياً وفق السجلات المتاحة.
        </p>

        {/* Causal Sequence Strip */}
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            ['01 · الطلب والمنتجات', 'الكمية · السوق'],
            ['02 · الإيرادات', 'السعر · الخصم'],
            ['03 · الربح الإجمالي', 'تكلفة الوحدة · الهامش'],
            ['04 · رأس المال', 'المخزون · الذمم'],
            ['05 · قرار المالك', 'مقارنة · اعتماد · تحقق'],
          ].map(([title, sub]) => (
            <div key={title} className="rounded-lg border border-white/15 bg-white/10 px-3 py-2.5 text-xs">
              <div className="font-bold text-white">{title}</div>
              <div className="mt-0.5 text-[11px] text-slate-200">{sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-4" role="tablist">
        {TWIN_TABS.map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(t.id)}
              className={`rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                active
                  ? 'bg-[#1D63B8] text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Scope Bar (Visible on Model, Simulate, Compare, Opportunities) */}
      {(activeTab === 'model' || activeTab === 'simulate' || activeTab === 'compare' || activeTab === 'opportunities') && (
        <SurfaceCard title="نطاق الدراسة الاقتصادية" subtitle="اختر الفترة والمدينة والقطاع والمنتج لتطبيق الحسابات والمحاكاة">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-semibold text-slate-600">
              الفترة
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
              >
                {OWNER_DATA.months.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
                <option value="all">جميع الفترات</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              المدينة
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
              >
                <option value="الكل">جميع المدن</option>
                {OWNER_DATA.regions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              القطاع
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
              >
                <option value="الكل">جميع القطاعات</option>
                {[...new Set(OWNER_DATA.products.map((x) => x.cat))].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              المنتج
              <select
                value={activeProduct}
                onChange={(e) => setProduct(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
              >
                <option value="الكل">جميع المنتجات</option>
                {availProducts.map((x) => (
                  <option key={x.id} value={x.id}>{x.name}</option>
                ))}
              </select>
            </label>
          </div>
        </SurfaceCard>
      )}

      {/* TAB 1: صورة النموذج */}
      {activeTab === 'model' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiMetricCard
              label="صافي المبيعات"
              value={a.revenue}
              unit="مليون د.ع"
              subtext={`الخطة: ${fmt(p.revenue)} م`}
              varianceText={`الفارق ${signFmt(a.revenue - p.revenue)}`}
              varianceTone={a.revenue >= p.revenue ? 'good' : 'bad'}
            />
            <KpiMetricCard
              label="تكلفة البضاعة"
              value={a.cogs}
              unit="مليون د.ع"
              subtext={`الخطة: ${fmt(p.cogs)} م`}
              varianceText={`الفارق ${signFmt(a.cogs - p.cogs)}`}
              varianceTone={a.cogs <= p.cogs ? 'good' : 'warn'}
            />
            <KpiMetricCard
              label="الربح الإجمالي"
              value={a.gp}
              unit="مليون د.ع"
              subtext={`الخطة: ${fmt(p.gp)} م`}
              varianceText={`الفارق ${signFmt(a.gp - p.gp)}`}
              varianceTone={a.gp >= p.gp ? 'good' : 'bad'}
            />
            <KpiMetricCard
              label="الهامش الإجمالي"
              value={a.revenue ? (100 * a.gp) / a.revenue : 0}
              unit="%"
              subtext={`الكمية: ${fmt(a.qty, 0)} وحدة`}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SurfaceCard title="مساهمة المنتجات في الربح الإجمالي ضمن النطاق" subtitle="مليون د.ع">
              <ProductProfitBarChart data={productGroups} />
            </SurfaceCard>

            <SurfaceCard title="خريطة المبيعات مقابل الهامش للأصناف" subtitle="نسبة الهامش الإجمالي مقابل حجم المبيعات">
              <RevenueMarginScatterChart
                data={productGroups.map((g) => ({
                  id: g.key,
                  name: g.name,
                  cat: g.cat,
                  revenue: Number(g.revenue.toFixed(2)),
                  margin: Number(g.margin.toFixed(1)),
                  gp: Number(g.gp.toFixed(2)),
                }))}
              />
            </SurfaceCard>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SurfaceCard title="كيف تتصل نتائج النشاط ببعضها؟">
              <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="font-bold text-slate-900">01 · البيع</div>
                  <div className="mt-1 text-slate-600">الكمية × السعر بعد الخصم</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="font-bold text-slate-900">02 · التكلفة</div>
                  <div className="mt-1 text-slate-600">وحدات × تكلفة الوحدة</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="font-bold text-slate-900">03 · الربح</div>
                  <div className="mt-1 text-slate-600">صافي البيع − التكلفة</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="font-bold text-slate-900">04 · السيولة</div>
                  <div className="mt-1 text-slate-600">مخزون وذمم وأرصدة</div>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                العلاقات 01–03 حسابية مباشرة. السيولة لا تُستنتج تلقائياً من الربح بل تحتاج تواريخ تحصيل وصرف مجدولة.
              </p>
            </SurfaceCard>

            <SurfaceCard title="ما يغطيه النموذج وما لا يدعيه">
              <ul className="space-y-2 text-xs text-slate-600">
                <li>• <strong>مغطى بالكامل:</strong> المبيعات، الخصومات، تكلفة البضاعة، والربح الإجمالي على مستوى الصنف والمدينة والشهر.</li>
                <li>• <strong>تعرض تقديري:</strong> أرصدة الذمم والمخزون بطيء الحركة دون جداول استحقاق يومية.</li>
                <li>• <strong>خارج النطاق:</strong> صافي ربح الشركة النهائي، مرونة الطلب السوقية التلقائية، أو الضرائب.</li>
              </ul>
            </SurfaceCard>
          </div>
        </div>
      )}

      {/* TAB 2: مختبر القرارات (المحاكاة) */}
      {activeTab === 'simulate' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SurfaceCard
              title="تعديل افتراضات السيناريو"
              subtitle="تُطبّق النسب على السجلات الفعلية في النطاق المختار دون تعديل البيانات الأصلية"
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-700">
                  <div className="flex justify-between">
                    <span>تغير سعر البيع</span>
                    <span className="font-num font-bold text-[#1D63B8]">{signFmt(pricePct, 0)}%</span>
                  </div>
                  <input
                    type="range"
                    min={-15}
                    max={20}
                    step={1}
                    value={pricePct}
                    onChange={(e) => setPricePct(Number(e.target.value))}
                    className="mt-2 w-full accent-[#1D63B8]"
                  />
                </label>

                <label className="text-xs font-semibold text-slate-700">
                  <div className="flex justify-between">
                    <span>تغير الكمية المفترض</span>
                    <span className="font-num font-bold text-[#1D63B8]">{signFmt(demandPct, 0)}%</span>
                  </div>
                  <input
                    type="range"
                    min={-30}
                    max={30}
                    step={1}
                    value={demandPct}
                    onChange={(e) => setDemandPct(Number(e.target.value))}
                    className="mt-2 w-full accent-[#1D63B8]"
                  />
                </label>

                <label className="text-xs font-semibold text-slate-700">
                  <div className="flex justify-between">
                    <span>تغير تكلفة الوحدة</span>
                    <span className="font-num font-bold text-[#1D63B8]">{signFmt(costPct, 0)}%</span>
                  </div>
                  <input
                    type="range"
                    min={-15}
                    max={20}
                    step={1}
                    value={costPct}
                    onChange={(e) => setCostPct(Number(e.target.value))}
                    className="mt-2 w-full accent-[#1D63B8]"
                  />
                </label>

                <label className="text-xs font-semibold text-slate-700">
                  <div className="flex justify-between">
                    <span>تغير الخصم (نقطة مئوية)</span>
                    <span className="font-num font-bold text-[#1D63B8]">{signFmt(discountPoints, 0)} نقطة</span>
                  </div>
                  <input
                    type="range"
                    min={-5}
                    max={8}
                    step={1}
                    value={discountPoints}
                    onChange={(e) => setDiscountPoints(Number(e.target.value))}
                    className="mt-2 w-full accent-[#1D63B8]"
                  />
                </label>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPricePct(5);
                    setDemandPct(-4);
                    setCostPct(0);
                    setDiscountPoints(0);
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  إعادة الافتراضات
                </button>
                <button
                  type="button"
                  onClick={handleSaveScenario}
                  className="rounded-lg bg-[#1D63B8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#164E94]"
                >
                  حفظ السيناريو للمقارنة
                </button>
              </div>

              <div className="mt-4 rounded-lg bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
                تغير الكمية افتراض مستقل يدخله المالك وليس استجابة سوقية تلقائية للسعر.
              </div>
            </SurfaceCard>

            <SurfaceCard title="نتائج السيناريو مقارنة بالواقع">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-[11px] text-slate-500">الربح الأساسي</div>
                  <div className="mt-1 font-num text-lg font-bold text-slate-900">{fmt(sim.base.gp)} م</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-[11px] text-slate-500">الربح المفترض</div>
                  <div className="mt-1 font-num text-lg font-bold text-[#1D63B8]">{fmt(sim.next.gp)} م</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-[11px] text-slate-500">صافي الأثر</div>
                  <div className={`mt-1 font-num text-lg font-bold ${sim.delta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {signFmt(sim.delta)} م
                  </div>
                </div>
              </div>

              <ScenarioCompareBarChart
                data={[{ label: 'النطاق المختار', baseGp: sim.base.gp, scenarioGp: sim.next.gp }]}
                height={200}
              />
            </SurfaceCard>
          </div>

          <SurfaceCard
            title="شلال تفكيك الأثر للسيناريو (جسر متسلسل)"
            subtitle="توزيع صافي التغير في الربح الإجمالي بين الكمية والسعر والخصم والتكلفة"
          >
            <WaterfallBridgeSvg
              steps={[
                { name: 'الربح الأساسي', value: sim.base.gp, type: 'total', note: 'الوضع الفعلي الحالي' },
                { name: 'تغير الكمية', value: sim.impact.volume, type: 'delta', note: 'بالهامش السابق للوحدة' },
                { name: 'تغير السعر', value: sim.impact.price, type: 'delta', note: 'على الكمية الجديدة' },
                { name: 'تغير الخصم', value: sim.impact.discount, type: 'delta', note: 'أثر تعديل نسبة الخصم' },
                { name: 'تغير التكلفة', value: sim.impact.cost, type: 'delta', note: 'أثر تكلفة الوحدة' },
                { name: 'الربح بعد التعديل', value: sim.next.gp, type: 'total', note: 'النتيجة الحسابية' },
              ]}
            />
          </SurfaceCard>
        </div>
      )}

      {/* TAB 2B: مقارنة السيناريوهات */}
      {activeTab === 'compare' && (
        <ScenarioComparisonSection
          actualRows={actualRows}
          period={period}
          region={region}
          cat={cat}
          product={activeProduct}
          scenarios={scenarios}
          onSaveScenario={onSaveScenario}
        />
      )}

      {/* TAB 3: فرص وتحسينات */}
      {activeTab === 'opportunities' && (() => {
        const weak = [...productGroups].sort((x, y) => x.margin - y.margin).slice(0, 3);
        const top = [...productGroups].filter((x) => x.gp > 0).sort((x, y) => y.gp - x.gp).slice(0, 3);
        return (
          <div className="space-y-6">
            <SurfaceCard
              title="مقارنة هوامش الربح الإجمالي للأصناف في النطاق"
              subtitle="فرز سريع للأصناف الأضعف والأقوى هامشاً لاختبار سيناريوهات التسعير"
            >
              <ProductProfitBarChart data={[...productGroups].sort((x, y) => x.margin - y.margin)} dataKey="margin" unit="%" />
            </SurfaceCard>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <SurfaceCard title="أصناف تستحق مراجعة التسعير والتكلفة" subtitle="مرشحات أولية مبنية على ضعف الهامش أو الخسارة">
                <div className="divide-y divide-slate-100">
                  {weak.map((x) => (
                    <div key={x.key} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900">{x.name}</span>
                        <StateLabel tone={x.gp < 0 ? 'danger' : 'warning'} label={x.gp < 0 ? 'خسارة إجمالية' : 'هامش منخفض'} />
                      </div>
                      <p className="mt-1 text-xs text-slate-600">
                        المبيعات <span className="font-num font-semibold">{fmt(x.revenue)}</span> م · الربح{' '}
                        <span className="font-num font-semibold">{fmt(x.gp)}</span> م · الهامش{' '}
                        <span className="font-num font-semibold">{pct(x.margin)}</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => onOpenDecisionModal('pricing', x.key)}
                        className="mt-2.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        اختبار تعديل السعر ←
                      </button>
                    </div>
                  ))}
                </div>
              </SurfaceCard>

              <SurfaceCard title="أعلى المساهمين وفرص التوسيع" subtitle="الأقوى ربحاً حالياً وفرصة العلامة الخاصة">
                <div className="divide-y divide-slate-100">
                  {top.map((x) => (
                    <div key={x.key} className="py-3.5 first:pt-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{x.name}</span>
                        <span className="font-num text-xs font-bold text-emerald-700">{fmt(x.gp)} مليون د.ع</span>
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">هامش {pct(x.margin)} · {x.cat}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl bg-slate-50 p-4">
                  <div className="font-bold text-slate-900 text-xs">فرصة مشروطة: توسيع العلامة الخاصة</div>
                  <p className="mt-1 text-xs text-slate-600">
                    اختبر جدوى تحويل منتجات مستوردة إلى تعبئة محلية بحساب تكلفة الإطلاق وحجم التعادل.
                  </p>
                  <button
                    type="button"
                    onClick={() => onOpenDecisionModal('private')}
                    className="mt-3 rounded-lg bg-[#0F766E] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0D625B]"
                  >
                    تقييم العلامة الخاصة ←
                  </button>
                </div>
              </SurfaceCard>
            </div>
          </div>
        );
      })()}

      {/* TAB 4: الربحية والأدلة */}
      {activeTab === 'diagnostics' && (() => {
        const diag = OWNER_DATA.economicDiagnostics;
        return (
          <div className="space-y-6">
            <StatusNotice tone="success" title="تقرير الأدلة الحسابية — الفترة 2026-10">
              تغطية الفحص: <span className="font-num font-bold">{diag.coverage.rowsUsed} / {diag.coverage.rowsSeen}</span> صفوف مكتملة · مطابقة مجموع أرباح المنتجات مع الإجمالي: <strong>متطابقة 100%</strong>.
            </StatusNotice>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <KpiMetricCard label="صافي الإيرادات" value={diag.totals.revenue} unit="مليون د.ع" subtext={diag.period} />
              <KpiMetricCard label="الربح الإجمالي" value={diag.totals.grossProfit} unit="مليون د.ع" subtext={`الخصومات: ${fmt(diag.totals.discountValue)} م`} />
              <KpiMetricCard label="هامش الربح الإجمالي" value={diag.totals.grossMarginPct} unit="%" subtext="أكتوبر 2026" />
            </div>

            <SurfaceCard title="الأداء التنازلي للمنتجات حسب الربح الإجمالي" subtitle="أدلة مستخرجة من فواتير المبيعات وتكلفة الشراء">
              <ProductProfitBarChart
                data={diag.products.map((x) => ({ name: x.productName, gp: x.grossProfit }))}
              />
            </SurfaceCard>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <SurfaceCard title="جدول الربحية الموثق حسب الصنف">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                        <th className="px-2.5 py-2.5 font-semibold">المنتج</th>
                        <th className="px-2.5 py-2.5 font-semibold">الإيرادات</th>
                        <th className="px-2.5 py-2.5 font-semibold">التكلفة</th>
                        <th className="px-2.5 py-2.5 font-semibold">الربح</th>
                        <th className="px-2.5 py-2.5 font-semibold">الهامش</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {diag.products.map((x) => (
                        <tr key={x.productId} className={x.grossProfit < 0 ? 'bg-rose-50/40' : ''}>
                          <td className="px-2.5 py-2.5 font-semibold text-slate-900">{x.productName}</td>
                          <td className="px-2.5 py-2.5 font-num">{fmt(x.revenue)}</td>
                          <td className="px-2.5 py-2.5 font-num">{fmt(x.cogs)}</td>
                          <td className={`px-2.5 py-2.5 font-num font-bold ${x.grossProfit < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                            {fmt(x.grossProfit)}
                          </td>
                          <td className="px-2.5 py-2.5 font-num">{x.grossMarginPct !== null ? pct(x.grossMarginPct) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SurfaceCard>

              <SurfaceCard title={`إشارات تستحق الاستقصاء (${diag.findings.length})`}>
                <div className="space-y-4">
                  {diag.findings.map((fItem) => (
                    <div key={fItem.id} className="rounded-lg border border-rose-200 bg-rose-50/40 p-4 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900">{fItem.title} · {fItem.productId}</span>
                        <span className="font-num font-bold text-rose-700">{fmt(fItem.observedGrossProfit)} م</span>
                      </div>
                      <p className="mt-1.5 text-slate-700">{fItem.suggestedAction}</p>
                      <div className="mt-2 text-[11px] text-slate-500">
                        المصدر: {fItem.evidence.source} · {fItem.evidence.period} · {fItem.evidence.rowCount} صفوف
                      </div>
                    </div>
                  ))}
                  <div className="rounded-lg bg-slate-50 p-3.5 text-xs text-slate-600">
                    <div className="font-bold text-slate-800 mb-1">حدود القراءة:</div>
                    {diag.limitations.map((l, i) => (
                      <div key={i}>• {l}</div>
                    ))}
                  </div>
                </div>
              </SurfaceCard>
            </div>
          </div>
        );
      })()}

      {/* TAB 5: هامش المساهمة */}
      {activeTab === 'contribution' && (() => {
        const c = OWNER_DATA.contributionAnalysis;
        const chartRows = c.products.map((x) => ({
          name: x.productName,
          gp: x.grossProfit,
          serviceCost: x.variableServiceCosts,
          contribution: x.contribution,
        }));
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <KpiMetricCard label="الربح الإجمالي" value={c.totals.grossProfit} unit="مليون د.ع" subtext={c.period} />
              <KpiMetricCard label="تكلفة الخدمة المتغيرة" value={c.totals.variableServiceCosts} unit="مليون د.ع" subtext="تغطية 9 / 9 منتجات" varianceTone="warn" />
              <KpiMetricCard label="هامش المساهمة الإجمالي" value={c.totals.contribution} unit="مليون د.ع" subtext="بعد اقتطاع تكلفة الخدمة" varianceTone="good" />
            </div>

            <SurfaceCard
              title="تفكيك هامش المساهمة مقابل الربح الإجمالي وتكلفة الخدمة"
              subtitle="يوضح كيف تتحول بعض المنتجات (مثل الدجاج المجمد) إلى هامش مساهمة سالب بعد احتساب تكلفة الخدمة والتبريد"
            >
              <ContributionComparisonChart data={chartRows} />
            </SurfaceCard>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <SurfaceCard title="جدول المساهمة بعد التكلفة المتغيرة">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                        <th className="px-2.5 py-2.5 font-semibold">المنتج</th>
                        <th className="px-2.5 py-2.5 font-semibold">الربح الإجمالي</th>
                        <th className="px-2.5 py-2.5 font-semibold">تكلفة الخدمة</th>
                        <th className="px-2.5 py-2.5 font-semibold">هامش المساهمة</th>
                        <th className="px-2.5 py-2.5 font-semibold">النسبة %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {c.products.map((x) => (
                        <tr key={x.productId} className={x.contribution < 0 ? 'bg-rose-50/40' : ''}>
                          <td className="px-2.5 py-2.5 font-semibold text-slate-900">{x.productName}</td>
                          <td className="px-2.5 py-2.5 font-num">{fmt2(x.grossProfit)}</td>
                          <td className="px-2.5 py-2.5 font-num text-amber-800">{fmt2(x.variableServiceCosts)}</td>
                          <td className={`px-2.5 py-2.5 font-num font-bold ${x.contribution < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                            {fmt2(x.contribution)}
                          </td>
                          <td className="px-2.5 py-2.5 font-num">{pct(x.contributionMarginPct)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SurfaceCard>

              <SurfaceCard title={`توصيات استقصاء المساهمة (${c.recommendations.length})`}>
                <div className="space-y-3">
                  {c.recommendations.map((r) => (
                    <div key={r.id} className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900">{r.title} · {r.productId}</span>
                        <span className="font-num font-bold text-rose-700">{fmt2(r.observedContribution)} م</span>
                      </div>
                      <p className="mt-1.5 text-slate-600">{r.action}</p>
                      <div className="mt-2 text-[11px] text-slate-500">{r.status} · المصدر: {r.evidence.source}</div>
                    </div>
                  ))}
                </div>
              </SurfaceCard>
            </div>
          </div>
        );
      })()}

      {/* TAB 6: القرارات والنتائج */}
      {activeTab === 'decisions' && (
        <div className="space-y-6">
          <StatusNotice tone="neutral" title="سجل القرارات المحلي (يحفظ في المتصفح)">
            الاعتماد هنا تسجيل محلي للمراجعة والمتابعة مع توثيق خط الأساس والنتائج اللاحقة. التغير المرصود بعد القرار لا يثبت السببية تلقائياً.
          </StatusNotice>

          {decisionFeedback && <StatusNotice tone="success">{decisionFeedback}</StatusNotice>}

          <SurfaceCard title="توصيات مرشحة للتسجيل كقرار" subtitle="مستخرجة من تحليل هامش المساهمة">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {OWNER_DATA.contributionAnalysis.recommendations.map((rec) => {
                const prod = OWNER_DATA.products.find((p) => p.id === rec.productId);
                return (
                  <div key={rec.id} className="flex flex-col justify-between rounded-xl border border-slate-200 p-4 text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{rec.title} — {prod?.name || rec.productId}</div>
                      <p className="mt-1.5 leading-relaxed text-slate-600">{rec.action}</p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onCreateDecision({
                            recommendationKey: rec.id,
                            title: `${rec.title} (${prod?.name || rec.productId})`,
                            action: rec.action,
                            period: OWNER_DATA.contributionAnalysis.period,
                            baselineValue: Number(rec.observedContribution.toFixed(2)),
                            baselineSource: 'verified_source',
                          });
                          setDecisionFeedback('تم تسجيل القرار بخط أساس مستخرج من بيانات الفترة.');
                        }}
                        className="rounded-lg bg-[#0F766E] px-3 py-1.5 font-semibold text-white hover:bg-[#0D625B]"
                      >
                        تسجيل بخط أساس من البيانات
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </SurfaceCard>

          <SurfaceCard title={`القرارات المسجلة (${decisions.length})`}>
            {decisions.length ? (
              <div className="space-y-4">
                {decisions.map((d) => {
                  const nextStates: DecisionRecord['status'][] =
                    d.status === 'proposed'
                      ? ['under_review', 'rejected']
                      : d.status === 'under_review'
                        ? ['trial_authorized', 'rejected']
                        : d.status === 'trial_authorized'
                          ? ['completed']
                          : [];

                  return (
                    <div key={d.id} className="rounded-xl border border-slate-200 p-4 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-slate-900 text-sm">{d.title}</span>
                          <span className="mr-2 text-slate-500">· إصدار {d.version} · {d.period}</span>
                        </div>
                        <StateLabel
                          tone={d.status === 'completed' ? 'success' : d.status === 'rejected' ? 'danger' : 'neutral'}
                          label={statusLabels[d.status]}
                        />
                      </div>
                      <p className="mt-1.5 text-slate-600">{d.action}</p>
                      <div className="mt-2 text-slate-500">
                        خط الأساس: <strong className="font-num text-slate-800">{d.baselineValue !== null ? `${fmt2(d.baselineValue)} مليون` : 'غير متوفر'}</strong>
                        {' · '}النتائج المسجلة: <strong className="font-num text-slate-800">{d.outcomes.length}</strong>
                      </div>

                      {d.outcomes.length > 0 && (
                        <div className="mt-3 space-y-1.5 rounded-lg bg-slate-50 p-3">
                          {d.outcomes.map((o, idx) => (
                            <div key={idx} className="text-slate-700">
                              <span className="font-num font-bold">{o.observedPeriod}</span>: القيمة المرصودة{' '}
                              <span className="font-num font-bold">{fmt2(o.observedValue)}</span> م (التغير{' '}
                              <span className={`font-num font-bold ${o.observedChange >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                {signFmt(o.observedChange, 2)}
                              </span>
                              ) — عوامل خارجية: {o.externalFactors}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {nextStates.map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => {
                              setActiveDecisionAction({ id: d.id, mode: 'transition', targetStatus: st });
                              setReasonInput('');
                            }}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            تحويل إلى: {statusLabels[st]}
                          </button>
                        ))}
                        {(d.status === 'trial_authorized' || d.status === 'completed') && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveDecisionAction({ id: d.id, mode: 'outcome' });
                              setOutcomeVal('');
                              setOutcomeFactors('');
                              setOutcomeNote('');
                            }}
                            className="rounded-lg bg-[#1D63B8] px-3 py-1.5 font-semibold text-white hover:bg-[#164E94]"
                          >
                            تسجيل نتيجة مرصودة
                          </button>
                        )}
                      </div>

                      {activeDecisionAction?.id === d.id && activeDecisionAction.mode === 'transition' && (
                        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                          <label className="block font-semibold text-slate-700">
                            سبب التحديث (8 أحرف على الأقل):
                            <input
                              type="text"
                              value={reasonInput}
                              onChange={(e) => setReasonInput(e.target.value)}
                              placeholder="اكتب مبرر الاعتماد أو الرفض..."
                              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                            />
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (reasonInput.trim().length < 8) {
                                  setDecisionFeedback('يرجى كتابة سبب واضح من 8 أحرف على الأقل.');
                                  return;
                                }
                                onTransitionDecision(d.id, activeDecisionAction.targetStatus!, reasonInput.trim());
                                setActiveDecisionAction(null);
                                setDecisionFeedback('تم تحديث حالة القرار بنجاح.');
                              }}
                              className="rounded-lg bg-[#0F766E] px-3 py-1.5 font-semibold text-white"
                            >
                              تأكيد التحديث
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveDecisionAction(null)}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-600"
                            >
                              إلغاء
                            </button>
                          </div>
                        </div>
                      )}

                      {activeDecisionAction?.id === d.id && activeDecisionAction.mode === 'outcome' && (
                        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <input
                              type="text"
                              value={outcomePeriod}
                              onChange={(e) => setOutcomePeriod(e.target.value)}
                              placeholder="الفترة YYYY-MM"
                              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                            />
                            <input
                              type="number"
                              step="0.01"
                              value={outcomeVal}
                              onChange={(e) => setOutcomeVal(e.target.value)}
                              placeholder="القيمة المرصودة (مليون د.ع)"
                              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                            />
                            <input
                              type="text"
                              value={outcomeFactors}
                              onChange={(e) => setOutcomeFactors(e.target.value)}
                              placeholder="عوامل خارجية محتملة"
                              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                            />
                            <input
                              type="text"
                              value={outcomeNote}
                              onChange={(e) => setOutcomeNote(e.target.value)}
                              placeholder="مصدر القياس والدليل"
                              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const val = Number(outcomeVal);
                                if (!Number.isFinite(val) || !outcomeFactors.trim() || !outcomeNote.trim()) {
                                  setDecisionFeedback('يرجى إدخال قيمة رقمية والعوامل الخارجية ووصف الدليل.');
                                  return;
                                }
                                onRecordOutcome(d.id, outcomePeriod, val, outcomeFactors.trim(), outcomeNote.trim());
                                setActiveDecisionAction(null);
                                setDecisionFeedback('تم توثيق النتيجة المرصودة محلياً.');
                              }}
                              className="rounded-lg bg-[#1D63B8] px-3 py-1.5 font-semibold text-white"
                            >
                              حفظ النتيجة
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveDecisionAction(null)}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-600"
                            >
                              إلغاء
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <ChartEmpty title="لم تُسجل قرارات بعد" subtitle="اختر إحدى التوصيات أعلاه لبدء تتبع القرار وخط الأساس." />
            )}
          </SurfaceCard>
        </div>
      )}

      {/* TAB 7: الضوابط المالية */}
      {activeTab === 'financial' && (
        <SurfaceCard
          title="الضوابط المالية — مطابقة دفتر الأستاذ العام (GL) بالعمليات"
          subtitle="يتطلب ميزان مراجعة مستورد من النظام المحاسبي ومطابقة أرصدة الإيرادات والتكلفة"
          action={
            <button
              type="button"
              onClick={() => setFinancialChecked(true)}
              className="rounded-lg bg-[#1D63B8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#164E94]"
            >
              فحص المطابقة للفترة {period === 'all' ? '2026-10' : period}
            </button>
          }
        >
          <StatusNotice tone={financialChecked ? 'warning' : 'neutral'} title={financialChecked ? 'نتيجة الفحص: لا يوجد ميزان مراجعة مستورد' : 'حالة الجاهزية المحاسبية'}>
            {financialChecked
              ? 'المطابقة التشغيلية الداخلية بين سجلات المبيعات والأصناف وتكاليف الخدمة مكتملة 100%، لكن مطابقة دفتر الأستاذ العام (GL) غير منفذة لعدم وجود ملف ميزان مراجعة خارجي.'
              : 'اضغط "فحص المطابقة" للتحقق من توفر أرصدة دفتر الأستاذ العام مقابل الجداول التشغيلية.'}
          </StatusNotice>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="px-3 py-3 font-semibold">البند المحاسبي</th>
                  <th className="px-3 py-3 font-semibold">دفتر الأستاذ (GL)</th>
                  <th className="px-3 py-3 font-semibold">العمليات (الفواتير)</th>
                  <th className="px-3 py-3 font-semibold">حالة المطابقة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-3 py-3 font-semibold text-slate-900">صافي الإيرادات</td>
                  <td className="px-3 py-3 text-slate-500">غير متوفر</td>
                  <td className="px-3 py-3 font-num font-bold">{fmt(OWNER_DATA.economicDiagnostics.totals.revenue)} م</td>
                  <td className="px-3 py-3"><StateLabel tone="warning" label="بانتظار ميزان المراجعة" /></td>
                </tr>
                <tr>
                  <td className="px-3 py-3 font-semibold text-slate-900">تكلفة البضاعة المباعة</td>
                  <td className="px-3 py-3 text-slate-500">غير متوفر</td>
                  <td className="px-3 py-3 font-num font-bold">{fmt(OWNER_DATA.economicDiagnostics.totals.cogs)} م</td>
                  <td className="px-3 py-3"><StateLabel tone="warning" label="بانتظار ميزان المراجعة" /></td>
                </tr>
                <tr>
                  <td className="px-3 py-3 font-semibold text-slate-900">المطابقة التشغيلية الداخلية</td>
                  <td className="px-3 py-3 text-slate-500">—</td>
                  <td className="px-3 py-3 font-num font-bold">{fmt(OWNER_DATA.economicDiagnostics.totals.grossProfit)} م</td>
                  <td className="px-3 py-3"><StateLabel tone="success" label="متطابقة 100%" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      )}

      {/* TAB 8: ذاكرة القرار والتعلم */}
      {activeTab === 'memory' && (
        <div className="space-y-6">
          <SurfaceCard
            title="مقارنة السيناريوهات المحفوظة"
            subtitle="مقارنة بصرية بين الربح الأساسي ونتيجة كل سيناريو محفوظ"
          >
            <ScenarioCompareBarChart
              data={scenarios.map((s, idx) => ({
                label: `سيناريو ${idx + 1}`,
                baseGp: s.baseGp,
                scenarioGp: s.nextGp,
              }))}
            />
          </SurfaceCard>

          <SurfaceCard title="سجل السيناريوهات">
            {scenarios.length ? (
              <div className="divide-y divide-slate-100">
                {scenarios.map((s, i) => (
                  <div key={s.id} className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0 text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{s.name}</div>
                      <div className="mt-1 text-slate-600">
                        السعر <span className="font-num font-semibold">{signFmt(s.price * 100, 0)}%</span> · الطلب{' '}
                        <span className="font-num font-semibold">{signFmt(s.demand * 100, 0)}%</span> · التكلفة{' '}
                        <span className="font-num font-semibold">{signFmt(s.cost * 100, 0)}%</span> · الخصم{' '}
                        <span className="font-num font-semibold">{signFmt(s.discountPoints * 100, 0)}</span> نقطة
                      </div>
                      <div className="mt-1">
                        الفرق المفترض في الربح الإجمالي:{' '}
                        <span className={`font-num font-bold ${s.delta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {signFmt(s.delta)} مليون د.ع
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPeriod(s.scope.period);
                        setRegion(s.scope.region);
                        setCat(s.scope.cat);
                        setProduct(s.scope.product);
                        setPricePct(Math.round(s.price * 100));
                        setDemandPct(Math.round(s.demand * 100));
                        setCostPct(Math.round(s.cost * 100));
                        setDiscountPoints(Math.round(s.discountPoints * 100));
                        onTabChange('simulate');
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      استرجاع الافتراضات ←
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <ChartEmpty
                title="لم تحفظ أي سيناريو بعد"
                subtitle="انتقل إلى مختبر القرارات، عدّل الافتراضات ثم احفظ السيناريو للمقارنة."
              />
            )}
          </SurfaceCard>
        </div>
      )}
    </div>
  );
}
