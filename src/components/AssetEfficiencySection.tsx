import React, { useMemo, useState } from 'react';
import {
  OWNER_DATA,
  filterTransactions,
  fmt,
  fmt2,
  pct,
} from '../data/ownerData';
import { AssetEfficiencyChart, AssetEfficiencyPoint } from './Charts';
import { KpiMetricCard, StateLabel, SurfaceCard } from './UiPrimitives';

interface OperatingDepartmentSpec {
  id: string;
  department: string;
  shortName: string;
  productIds: string[];
  fixedAssetsM: number; // Warehousing, cold-chain, fleet & packaging assets allocated
  monthlyOpexM: number; // Operating & administrative overhead allocated
  assetFocusNote: string;
}

const OPERATING_DEPARTMENTS: OperatingDepartmentSpec[] = [
  {
    id: 'DEPT-PRIVATE',
    department: 'قسم التعبئة والعلامة الخاصة',
    shortName: 'العلامة الخاصة',
    productIds: ['P07', 'P08'],
    fixedAssetsM: 120,
    monthlyOpexM: 7.4,
    assetFocusNote: 'خطوط التعبئة المحلية تحقق أعلى دوران للمخزون وأفضل استغلال للأصول.',
  },
  {
    id: 'DEPT-NONFOOD',
    department: 'قسم المنظفات والسلع غير الغذائية',
    shortName: 'غير غذائية',
    productIds: ['P06'],
    fixedAssetsM: 88,
    monthlyOpexM: 5.2,
    assetFocusNote: 'كفاءة أصول متوازنة بفضل هوامش مستقرة ومخزون بطيء منخفض.',
  },
  {
    id: 'DEPT-CANNED',
    department: 'قسم المعلبات والمنتجات المحفوظة',
    shortName: 'المعلبات',
    productIds: ['P02'],
    fixedAssetsM: 94,
    monthlyOpexM: 5.5,
    assetFocusNote: 'أداء تشغيلي جيد مع فرصة لتقليص المخزون بطيء الحركة بنسبة 25%.',
  },
  {
    id: 'DEPT-DRY',
    department: 'قسم الأغذية الجافة المستوردة',
    shortName: 'الأغذية الجافة',
    productIds: ['P01', 'P03', 'P04'],
    fixedAssetsM: 315,
    monthlyOpexM: 17.8,
    assetFocusNote: 'ضغط واضح على العائد بسبب احتجاز 480 م.د في مخزون الزيت (41% بطيء الحركة) وتآكل هامش P03.',
  },
  {
    id: 'DEPT-COLD',
    department: 'قسم المجمدات وسلسلة التبريد',
    shortName: 'المجمدات',
    productIds: ['P05', 'P09'],
    fixedAssetsM: 465,
    monthlyOpexM: 13.6,
    assetFocusNote: 'أعلى كثافة أصول ثابتة (مستودعات وشاحنات مبردة) مقابل تآكل الربحية في الدجاج والأسماك.',
  },
];

interface DepartmentDetail extends AssetEfficiencyPoint {
  arShareM: number;
  fixedAssetsM: number;
  releasedCashM: number;
  statusLabel: 'كفاءة عالية' | 'دوران مقبول' | 'تجميد أصول / حرج';
  statusTone: 'success' | 'warning' | 'danger';
  recommendation: string;
  assetFocusNote: string;
}

export function AssetEfficiencySection({ period }: { period: string }) {
  const [viewMode, setViewMode] = useState<'combo' | 'scatter'>('combo');
  const [targetRoaPct, setTargetRoaPct] = useState<number>(15);
  const [targetTurnoverX, setTargetTurnoverX] = useState<number>(4.5);
  const [slowClearancePct, setSlowClearancePct] = useState<number>(0);
  const [selectedId, setSelectedId] = useState<string>('DEPT-DRY');

  const periodLabel = OWNER_DATA.months.find((m) => m.id === period)?.label ?? period;

  const departments = useMemo<DepartmentDetail[]>(() => {
    const periodTx = filterTransactions(OWNER_DATA.transactions, { period });
    const totalPeriodRevenue = periodTx.reduce((s, r) => s + r.revenue, 0);
    const totalArM = OWNER_DATA.ar.reduce((s, r) => s + r.current + r.overdue, 0);
    const invMap = new Map(OWNER_DATA.inventory.map((i) => [i.product, i]));

    return OPERATING_DEPARTMENTS.map((dept) => {
      const rows = periodTx.filter((t) => dept.productIds.includes(t.product));
      const monthlyRevenue = rows.reduce((s, r) => s + r.revenue, 0);
      const monthlyCogs = rows.reduce((s, r) => s + r.cogs, 0);
      const monthlyGp = rows.reduce((s, r) => s + r.gp, 0);

      let baseInventoryM = 0;
      let baseSlowM = 0;
      for (const pid of dept.productIds) {
        const inv = invMap.get(pid);
        if (inv) {
          baseInventoryM += inv.value;
          baseSlowM += inv.value * inv.slow;
        }
      }

      const releasedCashM = baseSlowM * (slowClearancePct / 100);
      const adjustedInventoryM = Math.max(10, baseInventoryM - releasedCashM);
      const remainingSlowM = Math.max(0, baseSlowM - releasedCashM);
      const slowPct = adjustedInventoryM > 0 ? (100 * remainingSlowM) / adjustedInventoryM : 0;

      const revenueShare = totalPeriodRevenue > 0 ? monthlyRevenue / totalPeriodRevenue : 0;
      const arShareM = totalArM * revenueShare;
      const totalAssetsM = adjustedInventoryM + arShareM + dept.fixedAssetsM;

      const annualCogsM = monthlyCogs * 12;
      const annualOperatingProfitM = (monthlyGp - dept.monthlyOpexM) * 12;
      const roaPct = totalAssetsM > 0 ? (100 * annualOperatingProfitM) / totalAssetsM : 0;
      const turnoverX = adjustedInventoryM > 0 ? annualCogsM / adjustedInventoryM : 0;
      const dioDays = turnoverX > 0 ? 365 / turnoverX : 0;

      let statusLabel: DepartmentDetail['statusLabel'] = 'كفاءة عالية';
      let statusTone: DepartmentDetail['statusTone'] = 'success';
      let recommendation = 'توجيه سيولة إضافية لتوسيع خطوط هذا القسم لارتفاع عائده على الأصول.';

      if (roaPct < 0 || (roaPct < targetRoaPct && turnoverX < targetTurnoverX)) {
        statusLabel = 'تجميد أصول / حرج';
        statusTone = 'danger';
        recommendation = 'تصفية فورية للمخزون البطيء وتقليص الطاقة المجمدة غير المستغلة وإعادة التسعير.';
      } else if (roaPct < targetRoaPct || turnoverX < targetTurnoverX) {
        statusLabel = 'دوران مقبول';
        statusTone = 'warning';
        recommendation =
          turnoverX < targetTurnoverX
            ? 'تسريع دورة الشراء وتقليص أيام التخزين لرفع معدل الدوران.'
            : 'تحسين هامش الربح التشغيلي عبر خفض تكاليف الخدمة والخصومات.';
      }

      return {
        id: dept.id,
        department: dept.department,
        shortName: dept.shortName,
        totalAssetsM,
        inventoryM: adjustedInventoryM,
        slowInventoryM: remainingSlowM,
        slowPct,
        annualCogsM,
        annualOperatingProfitM,
        roaPct,
        turnoverX,
        dioDays,
        arShareM,
        fixedAssetsM: dept.fixedAssetsM,
        releasedCashM,
        statusLabel,
        statusTone,
        recommendation,
        assetFocusNote: dept.assetFocusNote,
      };
    });
  }, [period, slowClearancePct, targetRoaPct, targetTurnoverX]);

  const totals = useMemo(() => {
    const totalAssets = departments.reduce((s, d) => s + d.totalAssetsM, 0);
    const totalInventory = departments.reduce((s, d) => s + d.inventoryM, 0);
    const totalAnnualCogs = departments.reduce((s, d) => s + d.annualCogsM, 0);
    const totalAnnualProfit = departments.reduce((s, d) => s + d.annualOperatingProfitM, 0);
    const totalReleased = departments.reduce((s, d) => s + d.releasedCashM, 0);

    const portfolioRoa = totalAssets > 0 ? (100 * totalAnnualProfit) / totalAssets : 0;
    const portfolioTurnover = totalInventory > 0 ? totalAnnualCogs / totalInventory : 0;
    const portfolioDio = portfolioTurnover > 0 ? 365 / portfolioTurnover : 0;

    return {
      totalAssets,
      totalInventory,
      portfolioRoa,
      portfolioTurnover,
      portfolioDio,
      totalReleased,
    };
  }, [departments]);

  const selectedDept = useMemo(
    () => departments.find((d) => d.id === selectedId) ?? departments[0] ?? null,
    [departments, selectedId]
  );

  return (
    <SurfaceCard
      title="لوحة معلومات كفاءة الأصول للأقسام التشغيلية الرئيسية"
      subtitle={`تحليل العائد على الأصول (ROA) ومعدل دوران المخزون السنوي استناداً إلى أرصدة المخزون والذمم وأداء ${periodLabel}`}
      action={
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
          {(
            [
              { id: 'combo', label: 'أعمدة ومنحنى مزدوج' },
              { id: 'scatter', label: 'مصفوفة ROA × الدوران' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setViewMode(m.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === m.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      }
    >
      {/* 4 KPI Summary Cards */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiMetricCard
          label="إجمالي الأصول التشغيلية"
          value={totals.totalAssets}
          unit="م.د"
          varianceText={
            totals.totalReleased > 0
              ? `سيولة محررة بالمحاكاة: ${fmt(totals.totalReleased)} م.د`
              : `المخزون يمثل ${pct((100 * totals.totalInventory) / totals.totalAssets)} من الأصول`
          }
          varianceTone={totals.totalReleased > 0 ? 'good' : 'neutral'}
        />
        <KpiMetricCard
          label="العائد على الأصول (ROA) المرجّح"
          value={totals.portfolioRoa}
          unit="%"
          varianceText={
            totals.portfolioRoa >= targetRoaPct
              ? `يتجاوز المستهدف (${targetRoaPct}%)`
              : `أقل من المستهدف (${targetRoaPct}%)`
          }
          varianceTone={totals.portfolioRoa >= targetRoaPct ? 'good' : 'warn'}
        />
        <KpiMetricCard
          label="معدل دوران المخزون السنوي"
          value={totals.portfolioTurnover}
          unit="مرة / سنة"
          varianceText={
            totals.portfolioTurnover >= targetTurnoverX
              ? `أسرع من المستهدف (${fmt(targetTurnoverX, 1)}x)`
              : `أبطأ من المستهدف (${fmt(targetTurnoverX, 1)}x)`
          }
          varianceTone={totals.portfolioTurnover >= targetTurnoverX ? 'good' : 'warn'}
        />
        <KpiMetricCard
          label="متوسط أيام بقاء المخزون (DIO)"
          value={totals.portfolioDio}
          unit="يوم"
          varianceText={`دورة تسييل المخزون لـ ${departments.length} أقسام`}
          varianceTone={totals.portfolioDio <= 85 ? 'good' : 'warn'}
        />
      </div>

      {/* Controls Bar */}
      <div className="mb-5 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 lg:grid-cols-3">
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>المستهدف السنوي للعائد على الأصول (ROA)</span>
            <span className="font-num font-bold text-[#0F766E]">{targetRoaPct}%</span>
          </div>
          <input
            type="range"
            min={8}
            max={28}
            step={1}
            value={targetRoaPct}
            onChange={(e) => setTargetRoaPct(Number(e.target.value))}
            className="w-full accent-[#0F766E]"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>المستهدف لمعدل دوران المخزون</span>
            <span className="font-num font-bold text-[#1D63B8]">{fmt(targetTurnoverX, 1)} مرة</span>
          </div>
          <input
            type="range"
            min={2.5}
            max={7.5}
            step={0.5}
            value={targetTurnoverX}
            onChange={(e) => setTargetTurnoverX(Number(e.target.value))}
            className="w-full accent-[#1D63B8]"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>محاكاة تصفية المخزون بطيء الحركة</span>
            <span className="font-num font-bold text-amber-700">{slowClearancePct}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={70}
            step={5}
            value={slowClearancePct}
            onChange={(e) => setSlowClearancePct(Number(e.target.value))}
            className="w-full accent-[#D97706]"
          />
        </div>
      </div>

      {/* Chart + Selected Department Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <AssetEfficiencyChart
            data={departments}
            viewMode={viewMode}
            targetRoaPct={targetRoaPct}
            targetTurnoverX={targetTurnoverX}
            selectedId={selectedDept?.id ?? null}
            onSelectDepartment={setSelectedId}
            height={345}
          />
        </div>

        <div className="flex flex-col justify-between border-t border-slate-200 pt-4 lg:col-span-4 lg:border-r lg:border-t-0 lg:pr-5 lg:pt-0">
          {selectedDept && (
            <div className="space-y-4">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-slate-500">تشخيص كفاءة أصول القسم</span>
                  <StateLabel tone={selectedDept.statusTone} label={selectedDept.statusLabel} />
                </div>
                <h4 className="mt-1.5 text-sm font-bold text-slate-900">{selectedDept.department}</h4>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{selectedDept.assetFocusNote}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 border-y border-slate-100 py-3 text-xs">
                <div>
                  <div className="text-[11px] text-slate-500">العائد على الأصول (ROA)</div>
                  <div
                    className={`font-num mt-0.5 text-base font-bold ${
                      selectedDept.roaPct >= targetRoaPct
                        ? 'text-[#0F766E]'
                        : selectedDept.roaPct > 0
                        ? 'text-amber-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {pct(selectedDept.roaPct)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">معدل دوران المخزون</div>
                  <div className="font-num mt-0.5 text-base font-bold text-[#1D63B8]">
                    {fmt2(selectedDept.turnoverX)}x
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">أيام بقاء المخزون (DIO)</div>
                  <div className="font-num mt-0.5 font-semibold text-slate-800">
                    {fmt(selectedDept.dioDays, 0)} يوماً
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">صافي العائد التشغيلي السنوي</div>
                  <div className="font-num mt-0.5 font-semibold text-slate-900">
                    {fmt(selectedDept.annualOperatingProfitM, 1)} م.د
                  </div>
                </div>
              </div>

              {/* Asset Composition */}
              <div className="space-y-2 text-[11px]">
                <div className="font-bold text-slate-700">
                  هيكل الأصول المخصصة ({fmt(selectedDept.totalAssetsM, 0)} م.د)
                </div>
                {[
                  { label: 'المخزون السلعي', val: selectedDept.inventoryM, color: 'bg-[#1D63B8]' },
                  { label: 'الذمم المدينة المخصصة', val: selectedDept.arShareM, color: 'bg-[#0F766E]' },
                  { label: 'الأصول الثابتة والتشغيلية', val: selectedDept.fixedAssetsM, color: 'bg-slate-600' },
                ].map((part) => {
                  const share = selectedDept.totalAssetsM > 0 ? (100 * part.val) / selectedDept.totalAssetsM : 0;
                  return (
                    <div key={part.label} className="space-y-1">
                      <div className="flex justify-between text-slate-600">
                        <span>{part.label}</span>
                        <span className="font-num font-semibold text-slate-900">
                          {fmt(part.val, 0)} م.د ({pct(share)})
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${part.color}`} style={{ width: `${share}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-600">
                <span className="font-bold text-slate-800">التوصية التشغيلية: </span>
                {selectedDept.recommendation}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Department Comparison Table */}
      <div className="mt-6 overflow-x-auto border-t border-slate-200 pt-4">
        <table className="w-full border-collapse text-right text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600">
              <th className="px-3 py-2.5">القسم التشغيلي</th>
              <th className="px-3 py-2.5">إجمالي الأصول</th>
              <th className="px-3 py-2.5">قيمة المخزون</th>
              <th className="px-3 py-2.5">المخزون البطيء</th>
              <th className="px-3 py-2.5">التكلفة السنوية (COGS)</th>
              <th className="px-3 py-2.5">معدل دوران المخزون</th>
              <th className="px-3 py-2.5">أيام المخزون (DIO)</th>
              <th className="px-3 py-2.5">العائد على الأصول (ROA)</th>
              <th className="px-3 py-2.5">التصنيف</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {departments.map((d) => {
              const isSelected = selectedDept?.id === d.id;
              return (
                <tr
                  key={d.id}
                  onClick={() => setSelectedId(d.id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/70'
                  }`}
                >
                  <td className="px-3 py-2.5 font-semibold text-slate-900">{d.department}</td>
                  <td className="font-num px-3 py-2.5 font-semibold text-slate-900">{fmt(d.totalAssetsM, 0)} م.د</td>
                  <td className="font-num px-3 py-2.5 text-slate-800">{fmt(d.inventoryM, 1)} م.د</td>
                  <td className="font-num px-3 py-2.5 text-amber-700">{pct(d.slowPct)}</td>
                  <td className="font-num px-3 py-2.5 text-slate-700">{fmt(d.annualCogsM, 0)} م.د</td>
                  <td
                    className={`font-num px-3 py-2.5 font-bold ${
                      d.turnoverX >= targetTurnoverX ? 'text-[#1D63B8]' : 'text-amber-700'
                    }`}
                  >
                    {fmt2(d.turnoverX)}x
                  </td>
                  <td className="font-num px-3 py-2.5 text-slate-700">{fmt(d.dioDays, 0)} يوم</td>
                  <td
                    className={`font-num px-3 py-2.5 font-bold ${
                      d.roaPct >= targetRoaPct
                        ? 'text-[#0F766E]'
                        : d.roaPct > 0
                        ? 'text-amber-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {pct(d.roaPct)}
                  </td>
                  <td className="px-3 py-2.5">
                    <StateLabel tone={d.statusTone} label={d.statusLabel} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SurfaceCard>
  );
}
