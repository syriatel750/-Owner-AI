import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  OWNER_DATA,
  calcLeakageBridge,
  filterTransactions,
  groupRows,
  sumRows,
  fmt,
  money,
  pct,
  signFmt,
  CaseItem,
} from '../data/ownerData';
import {
  CHART_COLORS,
  WaterfallBridgeSvg,
  ProductProfitBarChart,
  WorkingCapitalStackedChart,
  MixDonutChart,
  DecisionCurveChart,
} from './Charts';
import { StatusNotice, StateLabel } from './UiPrimitives';
import { DEFAULT_LIQUIDITY_SETTINGS, LiquiditySettings } from '../utils/liquidityAlerts';

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-slate-50/95 px-6 py-4 backdrop-blur-sm">
          <h2 className="text-base font-bold text-slate-900 sm:text-lg">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="p-6 space-y-6">{children}</div>
      </div>
    </div>
  );
}

/* 1. Case Investigation Modal */
export function CaseModal({
  caseItem,
  onClose,
  onUpdateStatus,
  onOpenPricing,
}: {
  caseItem: CaseItem;
  onClose: () => void;
  onUpdateStatus: (caseId: string, status: string, reason: string) => void;
  onOpenPricing: () => void;
}) {
  const [tab, setTab] = useState<'insight' | 'process'>('insight');
  const [status, setStatus] = useState(caseItem.closed ? 'مغلقة' : caseItem.status);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const leakage = calcLeakageBridge();
  const skuList = groupRows(
    filterTransactions(OWNER_DATA.transactions, { period: OWNER_DATA.latestPeriod }),
    'product'
  )
    .map((x) => ({
      ...x,
      name: OWNER_DATA.products.find((p) => p.id === x.key)?.name || x.key,
    }))
    .sort((a, b) => a.margin - b.margin);

  const overdue = OWNER_DATA.ar.reduce((a, r) => a + r.overdue, 0);
  const stock = OWNER_DATA.inventory.reduce((a, r) => a + r.value, 0);
  const slow = OWNER_DATA.inventory.reduce((a, r) => a + r.value * r.slow, 0);

  return (
    <ModalShell title={caseItem.title} onClose={onClose}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>{caseItem.id} · نتائج أولية بحسب البيانات الحالية</span>
        <StateLabel tone={caseItem.closed ? 'success' : 'warning'} label={caseItem.status} />
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab('insight')}
          className={`border-b-2 px-4 py-2 text-xs font-bold transition-colors ${
            tab === 'insight' ? 'border-[#1D63B8] text-[#1D63B8]' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          التقييم والأدلة
        </button>
        <button
          type="button"
          onClick={() => setTab('process')}
          className={`border-b-2 px-4 py-2 text-xs font-bold transition-colors ${
            tab === 'process' ? 'border-[#1D63B8] text-[#1D63B8]' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          الاستقصاء والتاريخ
        </button>
      </div>

      {tab === 'insight' ? (
        caseItem.type === 'profit' ? (
          <div className="space-y-6">
            <StatusNotice tone="warning" title="الحكم التنفيذي">
              توجد فجوة عن هدف الربحية المفترض. يمكن تفسير تغير الربح الإجمالي بين آخر فترتين بعوامل السعر والكلفة والكمية والخصم. <strong>التغير الشهري ليس بحد ذاته خسارة محققة.</strong>
            </StatusNotice>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">إجمالي الربح · أكتوبر</div>
                <div className="mt-1 font-num text-xl font-bold text-slate-900">{money(leakage.A.gp)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">إجمالي الربح · سبتمبر</div>
                <div className="mt-1 font-num text-xl font-bold text-slate-900">{money(leakage.B.gp)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">تغير الربح بين الفترتين</div>
                <div className={`mt-1 font-num text-xl font-bold ${leakage.total < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {money(leakage.total)}
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-bold text-slate-900">تفسير تغير الربح الإجمالي — شلال محاسبي</h3>
              <WaterfallBridgeSvg
                steps={[
                  { name: 'ربح سبتمبر', value: leakage.B.gp, type: 'total' },
                  { name: 'الكميات', value: leakage.bridge.volume, type: 'delta' },
                  { name: 'السعر', value: leakage.bridge.price, type: 'delta' },
                  { name: 'الخصم', value: leakage.bridge.discount, type: 'delta' },
                  { name: 'تكلفة الوحدة', value: leakage.bridge.cost, type: 'delta' },
                  { name: 'ربح أكتوبر', value: leakage.A.gp, type: 'total' },
                ]}
              />
            </div>

            <div>
              <h3 className="mb-2 text-sm font-bold text-slate-900">ترتيب الأصناف حسب هامش الربح (%)</h3>
              <ProductProfitBarChart data={skuList} dataKey="margin" unit="%" />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPricing();
                }}
                className="rounded-lg bg-[#1D63B8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#164E94]"
              >
                اختبر تعديل سعر صنف معين ←
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <StatusNotice tone="neutral" title="الحكم التنفيذي">
              هناك تعرض اقتصادي مرتبط بالمستحقات المتأخرة ومخزون بطيء الحركة. هذه أرصدة ومؤشرات تعرض، وليست خسارة محققة أو أموالاً مفقودة.
            </StatusNotice>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">ذمم متأخرة</div>
                <div className="mt-1 font-num text-xl font-bold text-rose-700">{money(overdue)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">قيمة المخزون الإجمالية</div>
                <div className="mt-1 font-num text-xl font-bold text-slate-900">{money(stock)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">مخزون بطيء الحركة (تقديري)</div>
                <div className="mt-1 font-num text-xl font-bold text-amber-700">{money(slow)}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-bold text-slate-900">التوزيع الجغرافي للذمم</h3>
                <WorkingCapitalStackedChart
                  data={OWNER_DATA.ar}
                  labelKey="region"
                  firstKey="current"
                  firstName="جارية"
                  firstColor={CHART_COLORS.teal}
                  secondKey="overdue"
                  secondName="متأخرة"
                  secondColor={CHART_COLORS.rose}
                />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-bold text-slate-900">مزيج المخزون</h3>
                <MixDonutChart
                  slices={[
                    { label: 'مخزون طبيعي', value: stock - slow, color: CHART_COLORS.cobalt },
                    { label: 'مخزون بطيء الحركة', value: slow, color: CHART_COLORS.amber },
                  ]}
                />
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="space-y-5">
          <StatusNotice tone="neutral" title="ماذا نعرف، وماذا لا نعرف؟">
            {caseItem.type === 'profit'
              ? 'الفرق المالي بين الفترات محسوب بدقة، لكن منشأ السياسة التجارية والأسباب الخارجية يحتاج تحققاً.'
              : 'أرصدة الذمم والمخزون محددة، لكن أثرها المستقبلي على النقد غير محسوم دون جدول التدفق النقدي.'}
          </StatusNotice>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
            <label className="font-semibold text-slate-700">
              حالة القضية
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              >
                <option value="قيد الاستقصاء">قيد الاستقصاء</option>
                <option value="معتمدة للمتابعة">معتمدة للمتابعة</option>
                <option value="قيد التقييم">قيد التقييم</option>
                <option value="مغلقة">مغلقة</option>
              </select>
            </label>
            <label className="font-semibold text-slate-700 sm:col-span-2">
              سبب التغيير / الإغلاق
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="سجل السبب والمرجع أو قرار المالك..."
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              />
            </label>
          </div>

          {error && <div className="text-xs font-semibold text-rose-700">{error}</div>}

          <button
            type="button"
            onClick={() => {
              if (!reason.trim()) {
                setError('يجب توثيق سبب التحديث أو الإغلاق.');
                return;
              }
              setError(null);
              onUpdateStatus(caseItem.id, status, reason.trim());
              setReason('');
            }}
            className="rounded-lg bg-[#1D63B8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#164E94]"
          >
            حفظ التحديث
          </button>

          <div>
            <h3 className="mb-3 text-sm font-bold text-slate-900">سجل الأحداث</h3>
            <div className="space-y-3 border-r-2 border-slate-200 pr-4">
              {caseItem.history.map((h, i) => (
                <div key={i} className="text-xs">
                  <div className="font-num text-[11px] text-slate-500">{h.date}</div>
                  <div className="mt-0.5 text-slate-800">{h.note}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

/* 2. Decision Simulator Modal (Warehouse, Private Label, Pricing) */
export function DecisionModal({
  kind,
  initialProductId = 'P03',
  onClose,
}: {
  kind: 'warehouse' | 'private' | 'pricing';
  initialProductId?: string;
  onClose: () => void;
}) {
  // Warehouse state
  const [invest, setInvest] = useState(550);
  const [benefit, setBenefit] = useState(200);
  const [fixed, setFixed] = useState(115);

  // Private label state
  const [quantity, setQuantity] = useState(280);
  const [saving, setSaving] = useState(0.7);
  const [launch, setLaunch] = useState(95);

  // Pricing state
  const [productId, setProductId] = useState(initialProductId);
  const [priceChange, setPriceChange] = useState(5);
  const [demandChange, setDemandChange] = useState(-4);

  const title = {
    warehouse: 'تقييم قرار إنشاء مخزن في البصرة',
    private: 'تقييم توسيع منتجات العلامة الخاصة',
    pricing: 'محاكاة تغيير أسعار المنتجات',
  }[kind];

  return (
    <ModalShell title={title} onClose={onClose}>
      <StatusNotice tone="neutral" title="مراجعة قرار — سيناريو قابل للتعديل">
        غيّر الافتراضات أدناه لتحديث الحسابات والمنحنيات البيانية تلقائياً. النتيجة تحليل استكشافي وليست موافقة استثمارية.
      </StatusNotice>

      {kind === 'warehouse' && (() => {
        const net = benefit - fixed;
        const thirdParty = Math.round(benefit * 0.7 - 65);
        const current = Math.round(benefit * 0.35 - 20);
        const paybackYears = net > 0 ? invest / net : null;
        const curveData = [0, 1, 2, 3, 4, 5].map((yr) => ({
          year: `السنة ${yr}`,
          cumCash: -invest + yr * net,
        }));

        return (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
              <label className="font-semibold text-slate-700">
                <div className="flex justify-between"><span>الاستثمار الأولي</span><span className="font-num text-[#1D63B8]">{money(invest)}</span></div>
                <input type="range" min={100} max={1100} step={25} value={invest} onChange={(e) => setInvest(Number(e.target.value))} className="mt-2 w-full accent-[#1D63B8]" />
              </label>
              <label className="font-semibold text-slate-700">
                <div className="flex justify-between"><span>المنافع السنوية</span><span className="font-num text-[#1D63B8]">{money(benefit)}</span></div>
                <input type="range" min={50} max={420} step={10} value={benefit} onChange={(e) => setBenefit(Number(e.target.value))} className="mt-2 w-full accent-[#1D63B8]" />
              </label>
              <label className="font-semibold text-slate-700">
                <div className="flex justify-between"><span>التكاليف السنوية الثابتة</span><span className="font-num text-[#1D63B8]">{money(fixed)}</span></div>
                <input type="range" min={30} max={280} step={5} value={fixed} onChange={(e) => setFixed(Number(e.target.value))} className="mt-2 w-full accent-[#1D63B8]" />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">صافي المساهمة السنوية</div>
                <div className={`mt-1 font-num text-xl font-bold ${net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{money(net)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">استرداد الاستثمار (تقريبي)</div>
                <div className="mt-1 font-num text-xl font-bold text-slate-900">{paybackYears ? `${fmt(paybackYears)} سنة` : 'غير متحقق'}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">بديل طرف ثالث (تجريبي)</div>
                <div className="mt-1 font-num text-xl font-bold text-slate-900">{money(thirdParty)} / سنة</div>
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-xs font-bold text-slate-800">منحنى التدفق التراكمي وفترة الاسترداد (5 سنوات)</h4>
              <DecisionCurveChart data={curveData} xKey="year" yKey="cumCash" yName="صافي التدفق التراكمي" />
            </div>

            <StatusNotice tone={net <= 0 || net < thirdParty ? 'warning' : 'success'} title="توصية مشروطة">
              {net <= 0
                ? 'لا يُوصى بالمضي في هذا السيناريو: المساهمة السنوية غير موجبة.'
                : net > thirdParty && paybackYears !== null && paybackYears < 4
                  ? 'يستحق الخيار دراسة جدوى تفصيلية، مع اختبار الطلب الفعلي وتكاليف التشغيل.'
                  : `بديل الطرف الثالث يحقق ${money(thirdParty)} سنوياً باستثمار أولي منخفض مقارنة بـ ${money(current)} للوضع الحالي.`}
            </StatusNotice>
          </div>
        );
      })()}

      {kind === 'private' && (() => {
        const gain = quantity * saving;
        const net = gain - launch;
        const breakeven = launch / saving;
        const curveData = [100, 200, 300, 400, 500, 600].map((q) => ({
          vol: `${q} ألف`,
          netProfit: q * saving - launch,
        }));

        return (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
              <label className="font-semibold text-slate-700">
                <div className="flex justify-between"><span>الكمية السنوية (ألف وحدة)</span><span className="font-num text-[#1D63B8]">{fmt(quantity)} ألف</span></div>
                <input type="range" min={50} max={650} step={10} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="mt-2 w-full accent-[#1D63B8]" />
              </label>
              <label className="font-semibold text-slate-700">
                <div className="flex justify-between"><span>فرق ربح الوحدة (ألف د.ع)</span><span className="font-num text-[#1D63B8]">{fmt(saving)} ألف</span></div>
                <input type="range" min={0.1} max={2.5} step={0.1} value={saving} onChange={(e) => setSaving(Number(e.target.value))} className="mt-2 w-full accent-[#1D63B8]" />
              </label>
              <label className="font-semibold text-slate-700">
                <div className="flex justify-between"><span>تكلفة الإطلاق</span><span className="font-num text-[#1D63B8]">{money(launch)}</span></div>
                <input type="range" min={20} max={240} step={5} value={launch} onChange={(e) => setLaunch(Number(e.target.value))} className="mt-2 w-full accent-[#1D63B8]" />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">مساهمة إضافية قبل الإطلاق</div>
                <div className="mt-1 font-num text-xl font-bold text-slate-900">{money(gain)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">صافي الأثر الأولي</div>
                <div className={`mt-1 font-num text-xl font-bold ${net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{money(net)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">حجم التعادل المطلوب</div>
                <div className="mt-1 font-num text-xl font-bold text-slate-900">{fmt(breakeven)} ألف وحدة</div>
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-xs font-bold text-slate-800">منحنى نقطة التعادل حسب حجم الطلب السنوي</h4>
              <DecisionCurveChart data={curveData} xKey="vol" yKey="netProfit" yName="صافي الأثر بعد الإطلاق" />
            </div>
          </div>
        );
      })()}

      {kind === 'pricing' && (() => {
        const rows = filterTransactions(OWNER_DATA.transactions, { period: OWNER_DATA.latestPeriod }).filter(
          (r) => r.product === productId
        );
        const A = sumRows(rows);
        const nextQty = A.qty * (1 + demandChange / 100);
        const weightedNet = A.qty ? (A.revenue * 1000) / A.qty : 0;
        const newRevenue = (weightedNet * (1 + priceChange / 100) * nextQty) / 1000;
        const newGp = newRevenue - A.cogs * (nextQty / (A.qty || 1));
        const delta = newGp - A.gp;

        const curveData = [-15, -10, -5, 0, 5, 10, 15, 20].map((pc) => {
          const rev = (weightedNet * (1 + pc / 100) * nextQty) / 1000;
          const gp = rev - A.cogs * (nextQty / (A.qty || 1));
          return { priceStep: `${signFmt(pc, 0)}%`, gp: Number(gp.toFixed(2)) };
        });

        return (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
              <label className="font-semibold text-slate-700">
                المنتج
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                >
                  {OWNER_DATA.products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
              <label className="font-semibold text-slate-700">
                <div className="flex justify-between"><span>تغير سعر البيع</span><span className="font-num text-[#1D63B8]">{signFmt(priceChange, 0)}%</span></div>
                <input type="range" min={-15} max={20} step={1} value={priceChange} onChange={(e) => setPriceChange(Number(e.target.value))} className="mt-2 w-full accent-[#1D63B8]" />
              </label>
              <label className="font-semibold text-slate-700">
                <div className="flex justify-between"><span>تغير الكمية المفترض</span><span className="font-num text-[#1D63B8]">{signFmt(demandChange, 0)}%</span></div>
                <input type="range" min={-30} max={25} step={1} value={demandChange} onChange={(e) => setDemandChange(Number(e.target.value))} className="mt-2 w-full accent-[#1D63B8]" />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">الربح الإجمالي الحالي</div>
                <div className="mt-1 font-num text-xl font-bold text-slate-900">{money(A.gp)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">الربح المفترض</div>
                <div className="mt-1 font-num text-xl font-bold text-[#1D63B8]">{money(newGp)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">فرق المساهمة</div>
                <div className={`mt-1 font-num text-xl font-bold ${delta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{signFmt(delta)} م</div>
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-xs font-bold text-slate-800">حساسية الربح الإجمالي لتغير السعر (مع ثبات تغير الكمية المفترض {pct(demandChange)})</h4>
              <DecisionCurveChart data={curveData} xKey="priceStep" yKey="gp" yName="الربح الإجمالي المفترض" />
            </div>
          </div>
        );
      })()}
    </ModalShell>
  );
}

/* 3. Company Context & Liquidity Thresholds Settings Modal */
export function SetupModal({
  onClose,
  liquiditySettings,
  onSaveLiquiditySettings,
}: {
  onClose: () => void;
  liquiditySettings: LiquiditySettings;
  onSaveLiquiditySettings: (next: LiquiditySettings) => void;
}) {
  const [draft, setDraft] = useState<LiquiditySettings>(liquiditySettings);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned: LiquiditySettings = {
      minAvailableLiquidityM: Math.max(50, Math.min(1000, Number(draft.minAvailableLiquidityM) || 250)),
      warningBufferPct: Math.max(5, Math.min(50, Number(draft.warningBufferPct) || 15)),
      minCoverageDays: Math.max(3, Math.min(90, Number(draft.minCoverageDays) || 10)),
      maxOverdueArPct: Math.max(5, Math.min(80, Number(draft.maxOverdueArPct) || 25)),
      maxSlowInventoryPct: Math.max(5, Math.min(80, Number(draft.maxSlowInventoryPct) || 20)),
      alertsEnabled: Boolean(draft.alertsEnabled),
    };
    onSaveLiquiditySettings(cleaned);
    setDraft(cleaned);
    setSavedMsg('تم حفظ حدود السيولة وتحديث نظام التنبيهات الذكي في مركز المالك.');
  };

  return (
    <ModalShell title="الإعدادات: سياق الشركة والحدود الدنيا للسيولة" onClose={onClose}>
      <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">الحدود الدنيا للسيولة وتنبيهات رأس المال العامل</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              يُطلق مركز المالك تنبيهات بصرية فورية عند اقتراب السيولة من هذه الحدود أو تجاوز سقوف الذمم والمخزون.
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-800">
            <input
              type="checkbox"
              checked={draft.alertsEnabled}
              onChange={(e) => setDraft((p) => ({ ...p, alertsEnabled: e.target.checked }))}
              className="h-4 w-4 accent-[#0F766E]"
            />
            <span>تفعيل التنبيهات البصرية</span>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs">
          <label className="font-semibold text-slate-700">
            الحد الأدنى للسيولة المتاحة (مليون د.ع)
            <input
              type="number"
              min={50}
              max={1000}
              step={10}
              value={draft.minAvailableLiquidityM}
              onChange={(e) => setDraft((p) => ({ ...p, minAvailableLiquidityM: Number(e.target.value) }))}
              className="font-num mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
            />
          </label>

          <label className="font-semibold text-slate-700">
            هامش الإنذار المبكر قبل الحد الأدنى (%)
            <input
              type="number"
              min={5}
              max={50}
              step={5}
              value={draft.warningBufferPct}
              onChange={(e) => setDraft((p) => ({ ...p, warningBufferPct: Number(e.target.value) }))}
              className="font-num mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
            />
          </label>

          <label className="font-semibold text-slate-700">
            الحد الأدنى لأيام التغطية النقدية
            <input
              type="number"
              min={3}
              max={90}
              step={1}
              value={draft.minCoverageDays}
              onChange={(e) => setDraft((p) => ({ ...p, minCoverageDays: Number(e.target.value) }))}
              className="font-num mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
            />
          </label>

          <label className="font-semibold text-slate-700">
            السقف الأقصى لنسبة الذمم المتأخرة (%)
            <input
              type="number"
              min={5}
              max={80}
              step={1}
              value={draft.maxOverdueArPct}
              onChange={(e) => setDraft((p) => ({ ...p, maxOverdueArPct: Number(e.target.value) }))}
              className="font-num mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
            />
          </label>

          <label className="font-semibold text-slate-700">
            السقف الأقصى للمخزون بطيء الحركة (%)
            <input
              type="number"
              min={5}
              max={80}
              step={1}
              value={draft.maxSlowInventoryPct}
              onChange={(e) => setDraft((p) => ({ ...p, maxSlowInventoryPct: Number(e.target.value) }))}
              className="font-num mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
            />
          </label>
        </div>

        {savedMsg && <StatusNotice tone="success">{savedMsg}</StatusNotice>}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              setDraft(DEFAULT_LIQUIDITY_SETTINGS);
              onSaveLiquiditySettings(DEFAULT_LIQUIDITY_SETTINGS);
              setSavedMsg('تمت استعادة الحدود الافتراضية وتطبيقها.');
            }}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            استعادة الحدود الافتراضية
          </button>
          <button
            type="submit"
            className="rounded-lg bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0D625B]"
          >
            حفظ وتطبيق الحدود
          </button>
        </div>
      </form>

      <div className="divide-y divide-slate-100 text-xs">
        <div className="py-3">
          <div className="font-bold text-slate-900">الاتجاه الاستراتيجي</div>
          <div className="mt-1 text-slate-600">{OWNER_DATA.owners.strategy}</div>
        </div>
        <div className="py-3">
          <div className="font-bold text-slate-900">الأولوية المالية</div>
          <div className="mt-1 text-slate-600">حماية السيولة، والنمو المربح، ومراقبة تسرب الهوامش.</div>
        </div>
        <div className="py-3">
          <div className="font-bold text-slate-900">حدود القرار</div>
          <div className="mt-1 text-slate-600">{OWNER_DATA.owners.risk}.</div>
        </div>
        <div className="py-3">
          <div className="font-bold text-slate-900">مستوى المراجعة</div>
          <div className="mt-1 text-slate-600">{OWNER_DATA.owners.scope}.</div>
        </div>
      </div>
      <StatusNotice tone="neutral">{OWNER_DATA.meta.setupNote}</StatusNotice>
    </ModalShell>
  );
}

/* 4. Enterprise AI Trust Simulation Modal */
export function TrustModal({ onClose }: { onClose: () => void }) {
  const [ok, setOk] = useState(true);
  const [checkedMsg, setCheckedMsg] = useState('لم يُرسل أي طلب.');
  const sampleText = 'مجموعة روافد العراق تراجع حساب شركة النخيل للبصرة';

  return (
    <ModalShell title="الثقة وحدود البيانات — محاكاة الترميز المحلي" onClose={onClose}>
      <StatusNotice tone="warning" title="هذه محاكاة تعليمية وليست حماية إنتاجية">
        لا يتم أي اتصال خارجي في هذه النسخة. الترميز المحلي الآمن يتطلب بوابة معزولة وخزنة أسماء وفحوص محتوى.
      </StatusNotice>
      <div className="space-y-3 text-xs">
        <div>
          <div className="font-bold text-slate-800">النص المحلي الأصلي</div>
          <p className="mt-1 text-slate-600">{sampleText}</p>
        </div>
        <div>
          <div className="font-bold text-slate-800">الحمولة المرمّزة محلياً</div>
          <p dir="ltr" className="mt-1 rounded-lg bg-slate-100 p-3 font-num text-left text-slate-800">
            ORG_001 reviews CLIENT_024 in CITY_003
          </p>
        </div>
        <label className="flex items-center gap-2 pt-2 font-semibold text-slate-700">
          <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="h-4 w-4 accent-[#1D63B8]" />
          افتراض اجتياز فحص الحماية
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() =>
              setCheckedMsg(
                ok
                  ? 'تم السماح افتراضياً للحمولة المرمّزة فقط. لم يُرسل أي طلب خارجي.'
                  : 'تم منع الإرسال افتراضياً لأن فحص الحماية غير مكتمل.'
              )
            }
            className="rounded-lg bg-[#1D63B8] px-4 py-2 font-semibold text-white hover:bg-[#164E94]"
          >
            اختبر بوابة الاتصال الافتراضية
          </button>
          <span className="text-slate-600">{checkedMsg}</span>
        </div>
      </div>
    </ModalShell>
  );
}
