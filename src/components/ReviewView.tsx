import React, { useMemo, useState } from 'react';
import {
  OWNER_DATA,
  filterTransactions,
  groupRows,
  sumRows,
  fmt,
  pct,
  CaseItem,
} from '../data/ownerData';
import {
  SalesProfitTrendChart,
  CategoryPlanActualChart,
  ProductProfitBarChart,
  RegionComparisonBarChart,
} from './Charts';
import { KpiMetricCard, SurfaceCard, StateLabel } from './UiPrimitives';
import { DecisionMatrixSection } from './DecisionMatrixSection';
import { ExternalRiskGaugeSection } from './ExternalRiskGaugeSection';
import { ExportControls, PrintReportHeader } from './ExportControls';
import { exportReviewToExcel } from '../utils/exportReports';

export function ReviewView({
  cases,
  onOpenCase,
  onOpenDecision,
  onNavigate,
  onAskWithPreset,
}: {
  cases: CaseItem[];
  onOpenCase: (id: string) => void;
  onOpenDecision: (kind: 'warehouse' | 'private' | 'pricing') => void;
  onNavigate: (view: 'cockpit' | 'review' | 'cases' | 'twin' | 'ask', twinTab?: string) => void;
  onAskWithPreset: (opts: { region: string; category: string; period: string; question: string }) => void;
}) {
  const [period, setPeriod] = useState(OWNER_DATA.latestPeriod);
  const [sector, setSector] = useState('الكل');
  const [cat, setCat] = useState('الكل');
  const [city, setCity] = useState('الكل');
  const [product, setProduct] = useState('الكل');

  const availableProducts = useMemo(() => {
    return OWNER_DATA.products.filter(
      (p) => (sector === 'الكل' || p.brand === sector) && (cat === 'الكل' || p.cat === cat)
    );
  }, [sector, cat]);

  const activeProduct = availableProducts.some((p) => p.id === product) ? product : 'الكل';

  const actualRows = useMemo(
    () =>
      filterTransactions(OWNER_DATA.transactions, {
        period,
        brand: sector,
        cat,
        region: city,
        product: activeProduct,
      }),
    [period, sector, cat, city, activeProduct]
  );

  const planRows = useMemo(
    () =>
      filterTransactions(OWNER_DATA.planRows, {
        period,
        brand: sector,
        cat,
        region: city,
        product: activeProduct,
      }),
    [period, sector, cat, city, activeProduct]
  );

  const a = useMemo(() => sumRows(actualRows), [actualRows]);
  const b = useMemo(() => sumRows(planRows), [planRows]);

  const trendData = useMemo(() => {
    return OWNER_DATA.months.map((m) => {
      const act = sumRows(
        filterTransactions(OWNER_DATA.transactions, {
          period: m.id,
          brand: sector,
          cat,
          region: city,
          product: activeProduct,
        })
      );
      const pln = sumRows(
        filterTransactions(OWNER_DATA.planRows, {
          period: m.id,
          brand: sector,
          cat,
          region: city,
          product: activeProduct,
        })
      );
      return {
        period: m.id,
        label: m.name,
        revenue: act.revenue,
        planRevenue: pln.revenue,
        gp: act.gp,
        planGp: pln.gp,
      };
    });
  }, [sector, cat, city, activeProduct]);

  const categoryTargets = useMemo(() => {
    const cats = [...new Set(availableProducts.map((p) => p.cat))];
    return cats.map((c) => {
      const act = sumRows(
        filterTransactions(OWNER_DATA.transactions, { period, brand: sector, cat: c, region: city, product: activeProduct })
      );
      const pln = sumRows(
        filterTransactions(OWNER_DATA.planRows, { period, brand: sector, cat: c, region: city, product: activeProduct })
      );
      return { name: c, actual: act.gp, plan: pln.gp };
    });
  }, [availableProducts, period, sector, city, activeProduct]);

  const regionData = useMemo(() => {
    return groupRows(actualRows, 'region')
      .map((r) => ({
        region: r.key,
        revenue: r.revenue,
        cogs: r.cogs,
        gp: r.gp,
        margin: r.margin,
        quantity: r.qty,
      }))
      .sort((x, y) => y.gp - x.gp);
  }, [actualRows]);

  const productsSummary = useMemo(() => {
    return groupRows(actualRows, 'product').map((x) => ({
      ...x,
      name: OWNER_DATA.products.find((p) => p.id === x.key)?.name || x.key,
    }));
  }, [actualRows]);

  const winners = useMemo(() => productsSummary.filter((x) => x.gp > 0).sort((x, y) => y.gp - x.gp).slice(0, 5), [productsSummary]);
  const losers = useMemo(() => productsSummary.filter((x) => x.gp < 0).sort((x, y) => x.gp - y.gp).slice(0, 5), [productsSummary]);

  const margin = a.revenue ? (100 * a.gp) / a.revenue : 0;
  const planMargin = b.revenue ? (100 * b.gp) / b.revenue : 0;

  const resetFilters = () => {
    setPeriod(OWNER_DATA.latestPeriod);
    setSector('الكل');
    setCat('الكل');
    setCity('الكل');
    setProduct('الكل');
  };

  const openCases = cases.filter((c) => !c.closed);
  const periodLabel = period === 'all' ? 'جميع الأشهر' : OWNER_DATA.months.find((m) => m.id === period)?.label ?? period;

  return (
    <div className="space-y-6">
      <PrintReportHeader
        dashboardTitle="تقرير المراجعة التنفيذية (مراجعتي)"
        periodLabel={periodLabel}
        scopeDetails={`النشاط: ${sector} · القطاع: ${cat} · المدينة: ${city} · القضايا المفتوحة: ${openCases.length}`}
      />

      {/* Executive Hero */}
      <section className="rounded-2xl bg-gradient-to-l from-[#122643] via-[#143359] to-[#114A63] px-6 py-7 text-white sm:px-8">
        <div className="text-xs font-semibold tracking-wide text-sky-200">{OWNER_DATA.meta.eyebrow}</div>
        <h2 className="mt-2 max-w-3xl text-2xl font-extrabold leading-snug sm:text-[27px]">
          صورة النتائج الاقتصادية للمجموعة، مع مراجعة القضايا التي تستحق اهتمام المالك
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-200">
          المؤشرات توضح المبيعات والتكاليف والربحية وتحقيق الأهداف حسب النطاق المختار، بينما تركز القضايا أسفلها على القرارات الاستراتيجية.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-200">
          <span>المرجع: أهداف المالك المعتمدة</span>
          <span aria-hidden="true">·</span>
          <span>{OWNER_DATA.meta.coverage}</span>
          <span aria-hidden="true">·</span>
          <span>تغطية كاملة للفترة</span>
        </div>
      </section>

      {/* Group Performance Filters */}
      <SurfaceCard
        title="مؤشرات أداء المجموعة"
        subtitle="مبيعات · كميات · تكاليف البضاعة · ربح إجمالي · تنفيذ الميزانية"
        action={
          <div className="no-print flex flex-wrap items-center gap-2">
            <ExportControls
              dashboardTitle="المراجعة التنفيذية"
              scopeLabel={periodLabel}
              onExportExcel={() =>
                exportReviewToExcel({
                  period,
                  periodLabel,
                  filters: { sector, cat, city, product: activeProduct },
                  actual: a,
                  plan: b,
                  regionData,
                  productsSummary,
                  cases,
                })
              }
            />
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              إعادة الفلاتر
            </button>
            <button
              type="button"
              onClick={() => onNavigate('twin', 'model')}
              className="rounded-lg bg-[#1D63B8] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#164E94]"
            >
              استكشف التوأم الاقتصادي ←
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-xs font-semibold text-slate-600">
            الشهر
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
            >
              {OWNER_DATA.months.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
              <option value="all">جميع الأشهر</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            النشاط
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
            >
              <option value="الكل">جميع الأنشطة</option>
              <option value="مستورد">الاستيراد والتوزيع</option>
              <option value="علامة خاصة">العلامة الخاصة</option>
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
              {[...new Set(OWNER_DATA.products.map((p) => p.cat))].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            المدينة
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
            >
              <option value="الكل">جميع المدن</option>
              {OWNER_DATA.regions.map((r) => (
                <option key={r} value={r}>{r}</option>
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
              {availableProducts.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
          <span>نطاق القراءة:</span>
          <span className="font-semibold text-slate-900">
            {period === 'all' ? 'كل الأشهر' : OWNER_DATA.months.find((m) => m.id === period)?.label}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-semibold text-slate-900">{sector === 'الكل' ? 'جميع الأنشطة' : sector}</span>
          <span aria-hidden="true">·</span>
          <span className="font-semibold text-slate-900">{cat === 'الكل' ? 'كل القطاعات' : cat}</span>
          <span aria-hidden="true">·</span>
          <span className="font-semibold text-slate-900">{city === 'الكل' ? 'كل المدن' : city}</span>
        </div>
      </SurfaceCard>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiMetricCard
          label="صافي قيمة المبيعات"
          value={a.revenue}
          unit="مليون د.ع"
          subtext={`الخطة: ${fmt(b.revenue)} مليون`}
          varianceText={a.revenue >= b.revenue ? 'تحقيق إيجابي' : 'دون المخطط'}
          varianceTone={a.revenue >= b.revenue ? 'good' : 'bad'}
          badgeText={b.revenue ? pct((100 * a.revenue) / b.revenue) : '—'}
        />
        <KpiMetricCard
          label="الكمية المباعة"
          value={a.qty}
          unit="وحدة"
          subtext={`الخطة: ${fmt(b.qty, 0)} وحدة`}
          varianceText={a.qty >= b.qty ? 'حجم أعلى من الخطة' : 'حجم أقل من الخطة'}
          varianceTone={a.qty >= b.qty ? 'good' : 'bad'}
          badgeText={b.qty ? pct((100 * a.qty) / b.qty) : '—'}
        />
        <KpiMetricCard
          label="تكلفة البضاعة المباعة"
          value={a.cogs}
          unit="مليون د.ع"
          subtext={`الخطة: ${fmt(b.cogs)} مليون`}
          varianceText={a.cogs <= b.cogs ? 'أقل من الميزانية' : 'أعلى من الميزانية'}
          varianceTone={a.cogs <= b.cogs ? 'good' : 'bad'}
          badgeText={b.cogs ? pct((100 * a.cogs) / b.cogs) : '—'}
        />
        <KpiMetricCard
          label="الربح الإجمالي"
          value={a.gp}
          unit="مليون د.ع"
          subtext={`هامش فعلي ${pct(margin)} مقابل خطة ${pct(planMargin)}`}
          varianceText={a.gp >= b.gp ? 'يحقق الخطة' : 'انحراف سلبي عن الخطة'}
          varianceTone={a.gp >= b.gp ? 'good' : 'bad'}
          badgeText={b.gp ? pct((100 * a.gp) / b.gp) : '—'}
        />
      </div>

      {/* 4 Analytical Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SurfaceCard title="اتجاه المبيعات والربح الإجمالي" subtitle="مقارنة الفعل بالخطة خلال أشهر السلسلة">
          <SalesProfitTrendChart data={trendData} />
        </SurfaceCard>

        <SurfaceCard title="تحقيق أهداف الربح حسب القطاع" subtitle="خطة تجريبية مقابل الفعلي (مليون د.ع)">
          <CategoryPlanActualChart data={categoryTargets} />
        </SurfaceCard>

        <SurfaceCard title="مساهمة المنتجات في الربح الإجمالي" subtitle="الربح الإجمالي لكل صنف ضمن النطاق المختار">
          <ProductProfitBarChart data={[...productsSummary].sort((x, y) => y.gp - x.gp)} />
        </SurfaceCard>

        <SurfaceCard title="الربح الإجمالي حسب المنطقة" subtitle="ترتيب المدن من الأعلى إلى الأقل مساهمة">
          <RegionComparisonBarChart data={regionData} metric="gp" unit="مليون د.ع" />
        </SurfaceCard>
      </div>

      {/* Top Profit & Loss-Making Products Tables */}
      <SurfaceCard
        title="المنتجات الأكثر مساهمة في الربح والخسارة"
        subtitle="صافي المبيعات والربح الإجمالي بعد الخصم وتكلفة البضاعة"
        action={
          <button
            type="button"
            onClick={() =>
              onAskWithPreset({
                region: city,
                category: cat,
                period,
                question: 'ما المنتجات الأكثر ربحية؟',
              })
            }
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            تحليل المنتجات بالتفصيل
          </button>
        }
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <h4 className="mb-3 text-sm font-bold text-slate-900">المنتجات الأعلى ربحاً</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="px-3 py-2.5 font-semibold">المنتج</th>
                    <th className="px-3 py-2.5 font-semibold">المبيعات</th>
                    <th className="px-3 py-2.5 font-semibold">الربح الإجمالي</th>
                    <th className="px-3 py-2.5 font-semibold">الهامش</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {winners.map((w) => (
                    <tr key={w.key}>
                      <td className="px-3 py-2.5 font-semibold text-slate-800">{w.name}</td>
                      <td className="px-3 py-2.5 font-num">{fmt(w.revenue)}</td>
                      <td className="px-3 py-2.5 font-num font-bold text-emerald-700">{fmt(w.gp)}</td>
                      <td className="px-3 py-2.5 font-num">{pct(w.margin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5 lg:border-t-0 lg:border-r lg:pr-6 lg:pt-0">
            <h4 className="mb-3 text-sm font-bold text-slate-900">المنتجات الخاسرة على مستوى الربح الإجمالي</h4>
            {losers.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                      <th className="px-3 py-2.5 font-semibold">المنتج</th>
                      <th className="px-3 py-2.5 font-semibold">المبيعات</th>
                      <th className="px-3 py-2.5 font-semibold">الخسارة الإجمالية</th>
                      <th className="px-3 py-2.5 font-semibold">الهامش</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {losers.map((l) => (
                      <tr key={l.key} className="bg-rose-50/40">
                        <td className="px-3 py-2.5 font-semibold text-slate-900">{l.name}</td>
                        <td className="px-3 py-2.5 font-num">{fmt(l.revenue)}</td>
                        <td className="px-3 py-2.5 font-num font-bold text-rose-700">{fmt(l.gp)}</td>
                        <td className="px-3 py-2.5 font-num text-rose-700">{pct(l.margin)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-xs text-slate-600">
                لا توجد منتجات ذات ربح إجمالي سالب في النطاق المختار.
              </div>
            )}
          </div>
        </div>
      </SurfaceCard>

      {/* Decision Priority Matrix */}
      <DecisionMatrixSection />

      {/* External Regional Risk Gauge */}
      <ExternalRiskGaugeSection />

      {/* Open Strategic Cases & Opportunity */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h3 className="text-lg font-bold text-slate-900">الموضوعات التي تستحق قرارك</h3>
          <p className="text-xs text-slate-500">قضايا مرتبطة بأثر اقتصادي، وليست تنبيهات تشغيلية</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('cases')}
          className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          عرض سجل القضايا
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 lg:col-span-2">
          {openCases.length ? (
            openCases.map((c) => (
              <div
                key={c.id}
                onClick={() => onOpenCase(c.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onOpenCase(c.id)}
                className="cursor-pointer p-5 transition-colors hover:bg-slate-50"
              >
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{c.id} · مراجعة جوهرية</span>
                  <StateLabel tone={c.type === 'profit' ? 'warning' : 'neutral'} label={c.status} />
                </div>
                <h4 className="mt-2 text-base font-bold text-slate-900">{c.title}</h4>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{c.desc}</p>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-500">اضغط لعرض الأدلة والاستقصاء</span>
                  <span className="font-semibold text-[#1D63B8]">فتح الملف ←</span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-xs text-slate-600">
              <strong className="block text-sm text-slate-800">لا توجد قضايا جوهرية مفتوحة</strong>
              ضمن البيانات المتاحة.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <SurfaceCard title="هل يمكن زيادة عائد العلامة الخاصة؟" subtitle="فرصة استراتيجية مبدئية">
            <p className="text-xs leading-relaxed text-slate-600">
              الطلب على بعض المنتجات موجود بالفعل، وهناك طاقة تعبئة متاحة افتراضياً. تستحق الفكرة اختبار تكلفتها ومخاطرها قبل الاستثمار.
            </p>
            <button
              type="button"
              onClick={() => onOpenDecision('private')}
              className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
            >
              تحليل الفرصة ←
            </button>
          </SurfaceCard>

          <SurfaceCard title="اطرح سؤالاً عن شركتك">
            <p className="text-xs leading-relaxed text-slate-600">
              استكشف المنتجات والمناطق والأسعار والتكاليف، أو اطلب تقييم قرار جديد.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('ask')}
              className="mt-4 w-full rounded-lg bg-[#1D63B8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#164E94]"
            >
              ابدأ التحليل ←
            </button>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
