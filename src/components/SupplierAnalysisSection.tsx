import React, { useMemo, useState } from 'react';
import {
  OWNER_DATA,
  SupplierPurchaseRow,
  filterTransactions,
  fmt,
  fmt2,
  pct,
} from '../data/ownerData';
import { SupplierChartPoint, SupplierPerformanceBarChart } from './Charts';
import { KpiMetricCard, StateLabel, StatusNotice, SurfaceCard } from './UiPrimitives';

type VarianceBasis = 'contract' | 'prev' | 'aug';
type ChartMode = 'dual' | 'cost' | 'delivery';
type SortKey = 'variance_desc' | 'delivery_asc' | 'volume_desc';

interface SupplierBlueprint {
  id: string;
  supplier: string;
  shortName: string;
  category: string;
  origin: string;
  productIds: string[];
  contractCosts: Record<string, number>;
  onTimeByPeriod: Record<string, number>;
  defectPct: number;
  leadTimeDays: number;
  paymentTermDays: number;
}

const PRINCIPAL_SUPPLIERS: SupplierBlueprint[] = [
  {
    id: 'SUP-OIL',
    supplier: 'شركة الرافدين للزيوت النباتية',
    shortName: 'الرافدين للزيوت',
    category: 'الأغذية الجافة (الزيوت)',
    origin: 'مستورد — ميناء أم قصر',
    productIds: ['P03'],
    contractCosts: { P03: 15.8 },
    onTimeByPeriod: { '2026-08': 84, '2026-09': 80, '2026-10': 74 },
    defectPct: 1.9,
    leadTimeDays: 16,
    paymentTermDays: 30,
  },
  {
    id: 'SUP-COLD',
    supplier: 'دجلة للاستيراد والتبريد',
    shortName: 'دجلة للتبريد',
    category: 'المجمدات واللحوم',
    origin: 'مستورد — سلسلة تبريد',
    productIds: ['P05', 'P09'],
    contractCosts: { P05: 19.3, P09: 15.6 },
    onTimeByPeriod: { '2026-08': 79, '2026-09': 74, '2026-10': 68 },
    defectPct: 2.6,
    leadTimeDays: 18,
    paymentTermDays: 21,
  },
  {
    id: 'SUP-GRAIN',
    supplier: 'مجموعة البصرة للحبوب والأرز',
    shortName: 'البصرة للحبوب',
    category: 'الأغذية الجافة (الحبوب)',
    origin: 'مستورد — تعاقد ربع سنوي',
    productIds: ['P01'],
    contractCosts: { P01: 15.5 },
    onTimeByPeriod: { '2026-08': 91, '2026-09': 90, '2026-10': 89 },
    defectPct: 0.9,
    leadTimeDays: 11,
    paymentTermDays: 45,
  },
  {
    id: 'SUP-CANNED',
    supplier: 'الشركة الوطنية للمعلبات والحلويات',
    shortName: 'الوطنية للمعلبات',
    category: 'المعلبات والبسكويت',
    origin: 'توريد إقليمي',
    productIds: ['P02', 'P04'],
    contractCosts: { P02: 10.75, P04: 7.75 },
    onTimeByPeriod: { '2026-08': 88, '2026-09': 87, '2026-10': 86 },
    defectPct: 1.1,
    leadTimeDays: 10,
    paymentTermDays: 45,
  },
  {
    id: 'SUP-NONFOOD',
    supplier: 'مؤسسة النهرين للصناعات المنزلية',
    shortName: 'النهرين للمنظفات',
    category: 'غير غذائية',
    origin: 'توريد تعاقدي بسقف سعري',
    productIds: ['P06'],
    contractCosts: { P06: 9.95 },
    onTimeByPeriod: { '2026-08': 94, '2026-09': 93, '2026-10': 93 },
    defectPct: 0.6,
    leadTimeDays: 7,
    paymentTermDays: 60,
  },
  {
    id: 'SUP-LOCAL',
    supplier: 'وحدة التعبئة المحلية — روافد',
    shortName: 'التعبئة المحلية',
    category: 'العلامة الخاصة',
    origin: 'تعبئة محلية — بغداد',
    productIds: ['P07', 'P08'],
    contractCosts: { P07: 6.2, P08: 5.9 },
    onTimeByPeriod: { '2026-08': 97, '2026-09': 96, '2026-10': 96 },
    defectPct: 0.4,
    leadTimeDays: 4,
    paymentTermDays: 60,
  },
];

interface SupplierEvaluationRow extends SupplierChartPoint {
  category: string;
  origin: string;
  productNames: string[];
  quantity: number;
  actualUnitCost: number;
  baselineUnitCost: number;
  leadTimeDays: number;
  paymentTermDays: number;
  statusLabel: 'متوافق' | 'تحت المراقبة' | 'تدخل عاجل';
  statusTone: 'success' | 'warning' | 'danger';
  recommendation: string;
}

function getPreviousPeriod(period: string): string {
  if (period === '2026-10') return '2026-09';
  return '2026-08';
}

export function SupplierAnalysisSection({
  period,
  importedRows,
  onUploadCsv,
  csvFeedback,
}: {
  period: string;
  importedRows: SupplierPurchaseRow[];
  onUploadCsv: (file: File) => void;
  csvFeedback: string | null;
}) {
  const [basis, setBasis] = useState<VarianceBasis>('contract');
  const [chartMode, setChartMode] = useState<ChartMode>('dual');
  const [sortKey, setSortKey] = useState<SortKey>('variance_desc');
  const [minDeliveryTarget, setMinDeliveryTarget] = useState<number>(85);
  const [maxCostVarianceLimit, setMaxCostVarianceLimit] = useState<number>(5);
  const [useImportedData, setUseImportedData] = useState<boolean>(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('SUP-OIL');

  const periodCsvRows = useMemo(
    () => importedRows.filter((r) => r.period === period),
    [importedRows, period]
  );

  const showingImported = useImportedData && periodCsvRows.length > 0;

  const productMap = useMemo(
    () => new Map(OWNER_DATA.products.map((p) => [p.id, p])),
    []
  );

  const evaluateStatus = (
    costVariancePct: number,
    onTimePct: number
  ): {
    statusLabel: 'متوافق' | 'تحت المراقبة' | 'تدخل عاجل';
    statusTone: 'success' | 'warning' | 'danger';
    recommendation: string;
  } => {
    const costBreach = costVariancePct > maxCostVarianceLimit;
    const deliveryBreach = onTimePct < minDeliveryTarget;

    if (costBreach && deliveryBreach) {
      return {
        statusLabel: 'تدخل عاجل',
        statusTone: 'danger',
        recommendation: 'إعادة تفاوض فوري على السقف السعري وتفعيل مورد بديل لكسر التأخير',
      };
    }
    if (costBreach) {
      return {
        statusLabel: 'تحت المراقبة',
        statusTone: 'warning',
        recommendation: 'مراجعة فواتير الشحن وربط الدفعات بسقف تعاقدي ثابت للربع القادم',
      };
    }
    if (deliveryBreach) {
      return {
        statusLabel: 'تحت المراقبة',
        statusTone: 'warning',
        recommendation: 'فرض شرط جزائي على تأخير التسليم وزيادة مخزون الأمان المرحلي',
      };
    }
    if (costVariancePct <= 0 && onTimePct >= minDeliveryTarget + 5) {
      return {
        statusLabel: 'متوافق',
        statusTone: 'success',
        recommendation: 'تمديد العقد وتوسيع الحصة التوريدية للاستفادة من الوفورات والانضباط',
      };
    }
    return {
      statusLabel: 'متوافق',
      statusTone: 'success',
      recommendation: 'استمرار التوريد مع متابعة شهرية لمؤشرات الجودة والأسعار',
    };
  };

  const rows: SupplierEvaluationRow[] = useMemo(() => {
    if (showingImported) {
      const list = periodCsvRows.map((r, idx) => {
        const costVar = Number.isFinite(r.cost_variance_pct) ? Number(r.cost_variance_pct) : 0;
        const costImpactM = r.purchase_miqd * (costVar / (100 + costVar || 100));
        const evalResult = evaluateStatus(costVar, r.on_time_pct);
        return {
          id: `CSV-${idx}`,
          supplier: r.supplier,
          shortName: r.supplier.length > 18 ? `${r.supplier.slice(0, 16)}..` : r.supplier,
          category: 'ملف CSV مستورد',
          origin: 'بيانات محلية مستوردة',
          productNames: ['حسب سجل المشتريات'],
          quantity: 0,
          purchaseM: r.purchase_miqd,
          actualUnitCost: 0,
          baselineUnitCost: 0,
          costVariancePct: costVar,
          costImpactM,
          onTimePct: r.on_time_pct,
          defectPct: r.defect_pct,
          leadTimeDays: 0,
          paymentTermDays: 0,
          ...evalResult,
        };
      });
      return list;
    }

    const currentTx = filterTransactions(OWNER_DATA.transactions, { period });
    const comparePeriod = basis === 'prev' ? getPreviousPeriod(period) : '2026-08';
    const compareTx = filterTransactions(OWNER_DATA.transactions, { period: comparePeriod });

    return PRINCIPAL_SUPPLIERS.map((sup) => {
      const supCurrent = currentTx.filter((t) => sup.productIds.includes(t.product));
      const supCompare = compareTx.filter((t) => sup.productIds.includes(t.product));

      let totalCogs = 0;
      let totalQty = 0;
      let baselineCogsAtCurrentQty = 0;

      for (const pid of sup.productIds) {
        const curRows = supCurrent.filter((r) => r.product === pid);
        const curQty = curRows.reduce((s, r) => s + r.quantity, 0);
        const curCogs = curRows.reduce((s, r) => s + r.cogs, 0);
        totalCogs += curCogs;
        totalQty += curQty;

        let baseUnitCost = sup.contractCosts[pid] ?? 0;
        if (basis !== 'contract') {
          const cmpRows = supCompare.filter((r) => r.product === pid);
          const cmpQty = cmpRows.reduce((s, r) => s + r.quantity, 0);
          const cmpCogs = cmpRows.reduce((s, r) => s + r.cogs, 0);
          if (cmpQty > 0) {
            baseUnitCost = (cmpCogs * 1000) / cmpQty;
          }
        }
        baselineCogsAtCurrentQty += (curQty * baseUnitCost) / 1000;
      }

      const costImpactM = totalCogs - baselineCogsAtCurrentQty;
      const costVariancePct =
        baselineCogsAtCurrentQty > 0 ? (100 * costImpactM) / baselineCogsAtCurrentQty : 0;
      const actualUnitCost = totalQty > 0 ? (totalCogs * 1000) / totalQty : 0;
      const baselineUnitCost = totalQty > 0 ? (baselineCogsAtCurrentQty * 1000) / totalQty : 0;
      const onTimePct = sup.onTimeByPeriod[period] ?? 85;
      const evalResult = evaluateStatus(costVariancePct, onTimePct);

      return {
        id: sup.id,
        supplier: sup.supplier,
        shortName: sup.shortName,
        category: sup.category,
        origin: sup.origin,
        productNames: sup.productIds.map((id) => productMap.get(id)?.name ?? id),
        quantity: totalQty,
        purchaseM: totalCogs,
        actualUnitCost,
        baselineUnitCost,
        costVariancePct,
        costImpactM,
        onTimePct,
        defectPct: sup.defectPct,
        leadTimeDays: sup.leadTimeDays,
        paymentTermDays: sup.paymentTermDays,
        ...evalResult,
      };
    });
  }, [showingImported, periodCsvRows, period, basis, productMap, minDeliveryTarget, maxCostVarianceLimit]);

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    if (sortKey === 'variance_desc') {
      copy.sort((a, b) => b.costVariancePct - a.costVariancePct);
    } else if (sortKey === 'delivery_asc') {
      copy.sort((a, b) => a.onTimePct - b.onTimePct);
    } else {
      copy.sort((a, b) => b.purchaseM - a.purchaseM);
    }
    return copy;
  }, [rows, sortKey]);

  const summary = useMemo(() => {
    const totalPurchase = sortedRows.reduce((s, r) => s + r.purchaseM, 0);
    const totalImpact = sortedRows.reduce((s, r) => s + r.costImpactM, 0);
    const weightedDelivery =
      totalPurchase > 0
        ? sortedRows.reduce((s, r) => s + r.onTimePct * r.purchaseM, 0) / totalPurchase
        : 0;
    const weightedVariance =
      totalPurchase > 0
        ? sortedRows.reduce((s, r) => s + r.costVariancePct * r.purchaseM, 0) / totalPurchase
        : 0;
    const breachedCount = sortedRows.filter(
      (r) => r.costVariancePct > maxCostVarianceLimit || r.onTimePct < minDeliveryTarget
    ).length;

    return {
      totalPurchase,
      totalImpact,
      weightedDelivery,
      weightedVariance,
      breachedCount,
    };
  }, [sortedRows, maxCostVarianceLimit, minDeliveryTarget]);

  const selectedSupplier = useMemo(
    () => sortedRows.find((r) => r.id === selectedSupplierId) ?? sortedRows[0] ?? null,
    [sortedRows, selectedSupplierId]
  );

  const periodLabel = OWNER_DATA.months.find((m) => m.id === period)?.label ?? period;
  const basisLabel =
    basis === 'contract'
      ? 'السعر التعاقدي المخطط'
      : basis === 'prev'
      ? 'متوسط تكلفة الشهر السابق'
      : 'خط الأساس (أغسطس 2026)';

  return (
    <div className="space-y-6">
      <StatusNotice
        tone={showingImported ? 'neutral' : 'warning'}
        title={showingImported ? 'عرض بيانات الموردين المستوردة محلياً' : 'نطاق بيانات الموردين التفاعلي'}
      >
        {showingImported ? (
          <span>
            يتم عرض <strong className="font-num">{periodCsvRows.length}</strong> سجل توريد من ملف{' '}
            <code>supplier_purchases.csv</code> للفترة <strong>{periodLabel}</strong>.
          </span>
        ) : (
          <span>
            يتم احتساب تكلفة التوريد وتباين تكلفة الوحدة مباشرة من سجلات تكلفة البضاعة المبيعة لأصناف{' '}
            <strong>{periodLabel}</strong>، مع ربطها بملفات الموردين الرئيسيين ومؤشرات الالتزام بمواعيد التسليم للمحاكاة. يمكنك
            استيراد <code>supplier_purchases.csv</code> لتحميل بياناتك الفعلية.
          </span>
        )}
      </StatusNotice>

      {csvFeedback && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-medium text-slate-700">
          {csvFeedback}
        </div>
      )}

      {/* 4 Summary KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiMetricCard
          label="إجمالي تكلفة التوريد"
          value={summary.totalPurchase}
          unit="م.د"
          varianceText={`عبر ${sortedRows.length} موردين رئيسيين (${periodLabel})`}
          varianceTone="neutral"
        />
        <KpiMetricCard
          label="متوسط الالتزام بمواعيد التسليم"
          value={summary.weightedDelivery}
          unit="%"
          varianceText={
            summary.weightedDelivery >= minDeliveryTarget
              ? `أعلى من المستهدف (${minDeliveryTarget}%)`
              : `أقل من المستهدف بـ ${fmt(minDeliveryTarget - summary.weightedDelivery, 1)} نقطة`
          }
          varianceTone={summary.weightedDelivery >= minDeliveryTarget ? 'good' : 'bad'}
        />
        <KpiMetricCard
          label="متوسط تباين تكاليف التوريد"
          value={summary.weightedVariance}
          unit="%"
          varianceText={`مقارنة بـ ${basisLabel}`}
          badgeText={`${summary.weightedVariance > 0 ? '+' : ''}${pct(summary.weightedVariance)}`}
          varianceTone={
            summary.weightedVariance <= 0
              ? 'good'
              : summary.weightedVariance <= maxCostVarianceLimit
              ? 'warn'
              : 'bad'
          }
        />
        <KpiMetricCard
          label="الأثر المالي لتباين التوريد"
          value={summary.totalImpact}
          unit="م.د"
          varianceText={
            summary.totalImpact > 0
              ? `${summary.breachedCount} موردين يتجاوزون الضوابط`
              : 'صافي وفر تشغيلي في المشتريات'
          }
          badgeText={`${summary.totalImpact > 0 ? '+' : ''}${fmt2(summary.totalImpact)} م.د`}
          varianceTone={summary.totalImpact > 0 ? 'bad' : 'good'}
        />
      </div>

      {/* Main Bar Chart + Controls */}
      <SurfaceCard
        title="لوحة تحليل الموردين — تباين التكلفة والالتزام بمواعيد التسليم"
        subtitle={`مقارنة أداء الموردين الرئيسيين وفق ${basisLabel} لفترة ${periodLabel}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {periodCsvRows.length > 0 && (
              <button
                type="button"
                onClick={() => setUseImportedData((prev) => !prev)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {showingImported ? 'العودة إلى نموذج المجموعة' : 'عرض بيانات CSV المستوردة'}
              </button>
            )}
            <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              استيراد supplier_purchases.csv
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onUploadCsv(file);
                    setUseImportedData(true);
                  }
                }}
              />
            </label>
          </div>
        }
      >
        {/* Filter & Threshold Controls */}
        <div className="mb-5 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">عرض الرسم البياني الشريطي</label>
            <div className="inline-flex w-full rounded-lg border border-slate-200 bg-white p-0.5">
              {(
                [
                  { id: 'dual', label: 'مقارنة مزدوجة' },
                  { id: 'cost', label: 'تباين التكلفة %' },
                  { id: 'delivery', label: 'الالتزام بالتسليم %' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setChartMode(m.id)}
                  className={`flex-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    chartMode === m.id
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3">
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">أساس مقارنة تكلفة التوريد</label>
            <select
              value={basis}
              onChange={(e) => setBasis(e.target.value as VarianceBasis)}
              disabled={showingImported}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 disabled:opacity-60"
            >
              <option value="contract">السعر التعاقدي المخطط</option>
              <option value="prev">متوسط الشهر السابق</option>
              <option value="aug">خط الأساس (أغسطس 2026)</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">ترتيب الموردين</label>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800"
            >
              <option value="variance_desc">الأعلى تبايناً بالتكلفة</option>
              <option value="delivery_asc">الأدنى التزاماً بالتسليم</option>
              <option value="volume_desc">الأكبر حجماً للتوريد</option>
            </select>
          </div>

          <div className="lg:col-span-3 grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-700">
                <span>هدف التسليم</span>
                <span className="font-num text-[#0F766E]">{minDeliveryTarget}%</span>
              </div>
              <input
                type="range"
                min={70}
                max={96}
                step={1}
                value={minDeliveryTarget}
                onChange={(e) => setMinDeliveryTarget(Number(e.target.value))}
                className="w-full accent-[#0F766E]"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-700">
                <span>سقف التباين</span>
                <span className="font-num text-rose-700">+{maxCostVarianceLimit}%</span>
              </div>
              <input
                type="range"
                min={1}
                max={12}
                step={0.5}
                value={maxCostVarianceLimit}
                onChange={(e) => setMaxCostVarianceLimit(Number(e.target.value))}
                className="w-full accent-[#DC2626]"
              />
            </div>
          </div>
        </div>

        {/* Bar Chart */}
        <SupplierPerformanceBarChart
          data={sortedRows}
          mode={chartMode}
          minDeliveryTarget={minDeliveryTarget}
          maxCostVarianceLimit={maxCostVarianceLimit}
          height={350}
        />

        {/* Selected Supplier Executive Focus Strip */}
        {selectedSupplier && (
          <div className="mt-4 flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-900">ملف التركيز: {selectedSupplier.supplier}</span>
                <StateLabel tone={selectedSupplier.statusTone} label={selectedSupplier.statusLabel} />
              </div>
              <div className="text-xs text-slate-600">
                الأصناف: <span className="font-medium text-slate-800">{selectedSupplier.productNames.join(' · ')}</span>
                {selectedSupplier.leadTimeDays > 0 && (
                  <>
                    {' '}
                    · مهلة التوريد: <span className="font-num font-semibold">{selectedSupplier.leadTimeDays}</span> يوماً
                    · شروط السداد: <span className="font-num font-semibold">{selectedSupplier.paymentTermDays}</span> يوماً
                  </>
                )}
              </div>
            </div>
            <div className="text-xs font-medium text-slate-800 sm:max-w-md sm:text-left">
              الإجراء الموصى به: <span className="font-semibold text-slate-900">{selectedSupplier.recommendation}</span>
            </div>
          </div>
        )}
      </SurfaceCard>

      {/* Detailed Supplier Performance Table */}
      <SurfaceCard
        title="مصفوفة تقييم الموردين الرئيسيين والامتثال التعاقدي"
        subtitle="اضغط على أي صف لعرض ملف التركيز وإجراء التوريد الموصى به. الأعمدة: التكلفة الفعلية مقابل المرجع، الأثر المالي، والانضباط الزمني"
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600">
                <th className="px-3 py-2.5">المورد الرئيسي</th>
                <th className="px-3 py-2.5">الفئة والأصناف</th>
                <th className="px-3 py-2.5">حجم التوريد</th>
                <th className="px-3 py-2.5">تباين التكلفة</th>
                <th className="px-3 py-2.5">الأثر المالي</th>
                <th className="px-3 py-2.5">الالتزام بالتسليم</th>
                <th className="px-3 py-2.5">العيوب</th>
                <th className="px-3 py-2.5">الحالة</th>
                <th className="px-3 py-2.5">التوصية التنفيذية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedRows.map((row) => {
                const isSelected = selectedSupplier?.id === row.id;
                return (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedSupplierId(row.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <td className="px-3 py-3 font-semibold text-slate-900">
                      <div>{row.supplier}</div>
                      <div className="mt-0.5 text-[11px] font-normal text-slate-500">{row.origin}</div>
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      <div className="font-medium">{row.category}</div>
                      <div className="mt-0.5 text-[11px] text-slate-500">{row.productNames.join('، ')}</div>
                    </td>
                    <td className="font-num px-3 py-3 font-semibold text-slate-900">
                      {fmt(row.purchaseM)} م.د
                    </td>
                    <td
                      className={`font-num px-3 py-3 font-bold ${
                        row.costVariancePct > maxCostVarianceLimit
                          ? 'text-rose-700'
                          : row.costVariancePct > 0
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      {row.costVariancePct > 0 ? '+' : ''}
                      {pct(row.costVariancePct)}
                    </td>
                    <td
                      className={`font-num px-3 py-3 font-semibold ${
                        row.costImpactM > 0 ? 'text-rose-700' : 'text-emerald-700'
                      }`}
                    >
                      {row.costImpactM > 0 ? '+' : ''}
                      {fmt2(row.costImpactM)} م.د
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-num font-bold ${
                            row.onTimePct >= minDeliveryTarget
                              ? 'text-[#0F766E]'
                              : row.onTimePct >= minDeliveryTarget - 10
                              ? 'text-amber-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {pct(row.onTimePct)}
                        </span>
                        <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full rounded-full ${
                              row.onTimePct >= minDeliveryTarget
                                ? 'bg-[#0F766E]'
                                : row.onTimePct >= minDeliveryTarget - 10
                                ? 'bg-amber-500'
                                : 'bg-rose-600'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, row.onTimePct))}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="font-num px-3 py-3 text-slate-700">{pct(row.defectPct)}</td>
                    <td className="px-3 py-3">
                      <StateLabel tone={row.statusTone} label={row.statusLabel} />
                    </td>
                    <td className="max-w-[230px] px-3 py-3 text-[11px] leading-relaxed text-slate-600">
                      {row.recommendation}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SurfaceCard>
    </div>
  );
}
