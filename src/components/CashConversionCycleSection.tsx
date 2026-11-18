import React, { useMemo, useState } from 'react';
import {
  OWNER_DATA,
  filterTransactions,
  fmt,
  signFmt,
  sumRows,
} from '../data/ownerData';
import { CashConversionCycleChart, CccChartPoint } from './Charts';
import { KpiMetricCard, StateLabel, StatusNotice, SurfaceCard } from './UiPrimitives';

type CccViewMode = 'monthly' | 'departments';

interface DeptCccConfig {
  id: string;
  label: string;
  productIds: string[];
  dpoBenchmarkDays: number;
}

const DEPT_CONFIGS: DeptCccConfig[] = [
  { id: 'private', label: 'العلامة الخاصة', productIds: ['P07', 'P08'], dpoBenchmarkDays: 55 },
  { id: 'nonfood', label: 'غير غذائية', productIds: ['P06'], dpoBenchmarkDays: 58 },
  { id: 'canned', label: 'المعلبات', productIds: ['P02'], dpoBenchmarkDays: 45 },
  { id: 'dry', label: 'الأغذية الجافة', productIds: ['P01', 'P03', 'P04'], dpoBenchmarkDays: 38 },
  { id: 'cold', label: 'المجمدات', productIds: ['P05', 'P09'], dpoBenchmarkDays: 28 },
];

export function CashConversionCycleSection({ period }: { period: string }) {
  const [viewMode, setViewMode] = useState<CccViewMode>('monthly');
  const [targetCccDays, setTargetCccDays] = useState<number>(75);
  const [dioDeltaDays, setDioDeltaDays] = useState<number>(0);
  const [dsoDeltaDays, setDsoDeltaDays] = useState<number>(0);
  const [dpoDays, setDpoDays] = useState<number>(41.5);

  const periodLabel = OWNER_DATA.months.find((m) => m.id === period)?.label ?? period;

  const analysis = useMemo(() => {
    const invTotal = OWNER_DATA.inventory.reduce((s, r) => s + r.value, 0);
    const arTotal = OWNER_DATA.ar.reduce((s, r) => s + r.current + r.overdue, 0);

    // Compute exact monthly series across all 3 periods
    const monthlySeries: CccChartPoint[] = OWNER_DATA.months.map((m, idx) => {
      const totals = sumRows(filterTransactions(OWNER_DATA.transactions, { period: m.id }));
      // Scale snapshot balances realistically for earlier months or keep exact latest snapshot
      const histFactor = idx === 0 ? 0.92 : idx === 1 ? 0.96 : 1.0;
      const periodInv = invTotal * histFactor;
      const periodAr = arTotal * histFactor;

      const dailyCogs = totals.cogs > 0 ? totals.cogs / 30 : 1;
      const dailyRev = totals.revenue > 0 ? totals.revenue / 30 : 1;

      const dio = periodInv / dailyCogs;
      const dso = periodAr / dailyRev;
      const dpo = 41.5;
      const operatingCycle = dio + dso;
      const ccc = operatingCycle - dpo;
      const apEstimate = dpo * dailyCogs;
      const tiedCapitalM = periodInv + periodAr - apEstimate;

      return {
        id: m.id,
        label: m.label,
        dioDays: dio,
        dsoDays: dso,
        dpoDays: dpo,
        dpoDaysNeg: -dpo,
        operatingCycleDays: operatingCycle,
        cccDays: ccc,
        tiedCapitalM,
      };
    });

    // Current selected period base vs simulated
    const curTotals = sumRows(filterTransactions(OWNER_DATA.transactions, { period }));
    const curDailyCogs = curTotals.cogs > 0 ? curTotals.cogs / 30 : 1;
    const curDailyRev = curTotals.revenue > 0 ? curTotals.revenue / 30 : 1;

    const baseDio = invTotal / curDailyCogs;
    const baseDso = arTotal / curDailyRev;
    const baseDpo = 41.5;
    const baseCcc = baseDio + baseDso - baseDpo;
    const baseTiedCapitalM = invTotal + arTotal - baseDpo * curDailyCogs;

    const simDio = Math.max(15, baseDio + dioDeltaDays);
    const simDso = Math.max(15, baseDso + dsoDeltaDays);
    const simDpo = dpoDays;
    const simOpCycle = simDio + simDso;
    const simCcc = simOpCycle - simDpo;

    const simInvM = simDio * curDailyCogs;
    const simArM = simDso * curDailyRev;
    const simApM = simDpo * curDailyCogs;
    const simTiedCapitalM = simInvM + simArM - simApM;
    const cashReleasedM = baseTiedCapitalM - simTiedCapitalM;

    const hasSimulation = dioDeltaDays !== 0 || dsoDeltaDays !== 0 || Math.abs(dpoDays - 41.5) > 0.05;
    const monthlyChartData: CccChartPoint[] = hasSimulation
      ? [
          ...monthlySeries,
          {
            id: 'sim-target',
            label: 'بعد تحسين الدورة',
            dioDays: simDio,
            dsoDays: simDso,
            dpoDays: simDpo,
            dpoDaysNeg: -simDpo,
            operatingCycleDays: simOpCycle,
            cccDays: simCcc,
            tiedCapitalM: simTiedCapitalM,
          },
        ]
      : monthlySeries;

    // Department breakdown for selected period
    const periodTx = filterTransactions(OWNER_DATA.transactions, { period });
    const invMap = new Map(OWNER_DATA.inventory.map((i) => [i.product, i.value]));
    const dpoAdjustment = dpoDays - 41.5;

    const deptChartData: CccChartPoint[] = DEPT_CONFIGS.map((dept) => {
      const rows = periodTx.filter((t) => dept.productIds.includes(t.product));
      const totals = sumRows(rows);
      const deptInv = dept.productIds.reduce((s, id) => s + (invMap.get(id) ?? 0), 0);
      const revShare = curTotals.revenue > 0 ? totals.revenue / curTotals.revenue : 0;
      const deptAr = arTotal * revShare;

      const dCogs = totals.cogs > 0 ? totals.cogs / 30 : 1;
      const dRev = totals.revenue > 0 ? totals.revenue / 30 : 1;

      const dDio = Math.max(12, deptInv / dCogs + dioDeltaDays);
      const dDso = Math.max(12, deptAr / dRev + dsoDeltaDays);
      const dDpo = Math.max(15, dept.dpoBenchmarkDays + dpoAdjustment);
      const dOp = dDio + dDso;
      const dCcc = dOp - dDpo;
      const dTied = dDio * dCogs + dDso * dRev - dDpo * dCogs;

      return {
        id: dept.id,
        label: dept.label,
        dioDays: dDio,
        dsoDays: dDso,
        dpoDays: dDpo,
        dpoDaysNeg: -dDpo,
        operatingCycleDays: dOp,
        cccDays: dCcc,
        tiedCapitalM: dTied,
      };
    });

    return {
      monthlyChartData,
      deptChartData,
      baseDio,
      baseDso,
      baseDpo,
      baseCcc,
      simDio,
      simDso,
      simDpo,
      simCcc,
      simTiedCapitalM,
      cashReleasedM,
      hasSimulation,
    };
  }, [period, dioDeltaDays, dsoDeltaDays, dpoDays]);

  const activeData = viewMode === 'monthly' ? analysis.monthlyChartData : analysis.deptChartData;

  return (
    <SurfaceCard
      title="معدل التحويل النقدي (Cash Conversion Cycle)"
      subtitle={`تحليل العلاقة بين فترة التخزين (DIO) وفترة التحصيل (DSO) وفترة الدفع للموردين (DPO) لفترة ${periodLabel}`}
      action={
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
          {(
            [
              { id: 'monthly', label: 'التطور الشهري والمحاكاة' },
              { id: 'departments', label: 'حسب الأقسام التشغيلية' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setViewMode(tab.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="mb-5">
        <StatusNotice tone="neutral" title="معادلة دورة التحويل النقدي ومصدر البيانات">
          <strong>معدل التحويل النقدي (CCC) = فترة التخزين (DIO) + فترة التحصيل (DSO) − فترة الدفع للموردين (DPO)</strong>. تُحسب فترتا التخزين والتحصيل مباشرة من أرصدة المخزون والذمم ومعدلات المبيعات والتكلفة في <strong>{periodLabel}</strong>، بينما تُقدّر فترة السداد للموردين وفق متوسط شروط التوريد ويمكنك تعديلها تفاعلياً أدناه.
        </StatusNotice>
      </div>

      {/* 4 KPI Cards */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiMetricCard
          label="معدل التحويل النقدي (CCC)"
          value={analysis.simCcc}
          unit="يوماً"
          varianceText={
            analysis.hasSimulation
              ? `الأساس: ${fmt(analysis.baseCcc, 1)} يوماً (${signFmt(analysis.simCcc - analysis.baseCcc, 1)} يوم)`
              : analysis.simCcc <= targetCccDays
              ? `ضمن المستهدف (≤ ${targetCccDays} يوماً)`
              : `أطول من المستهدف بـ ${fmt(analysis.simCcc - targetCccDays, 1)} يوماً`
          }
          varianceTone={analysis.simCcc <= targetCccDays ? 'good' : 'bad'}
        />
        <KpiMetricCard
          label="فترة التخزين (DIO)"
          value={analysis.simDio}
          unit="يوماً"
          varianceText={`دورة التصريف المخزني (${dioDeltaDays === 0 ? 'فعلي' : `${signFmt(dioDeltaDays, 0)} يوم`})`}
          varianceTone={analysis.simDio <= 75 ? 'good' : 'warn'}
        />
        <KpiMetricCard
          label="فترة التحصيل (DSO)"
          value={analysis.simDso}
          unit="يوماً"
          varianceText={`تحصيل الذمم المدينة (${dsoDeltaDays === 0 ? 'فعلي' : `${signFmt(dsoDeltaDays, 0)} يوم`})`}
          varianceTone={analysis.simDso <= 55 ? 'good' : 'warn'}
        />
        <KpiMetricCard
          label="فترة الدفع للموردين (DPO)"
          value={analysis.simDpo}
          unit="يوماً"
          varianceText={
            analysis.cashReleasedM > 0.5
              ? `سيولة محررة: +${fmt(analysis.cashReleasedM, 1)} م.د`
              : analysis.cashReleasedM < -0.5
              ? `سيولة إضافية محتجزة: ${fmt(Math.abs(analysis.cashReleasedM), 1)} م.د`
              : `رأس المال المحتجز: ${fmt(analysis.simTiedCapitalM, 0)} م.د`
          }
          varianceTone={analysis.cashReleasedM > 0.5 ? 'good' : analysis.cashReleasedM < -0.5 ? 'bad' : 'neutral'}
        />
      </div>

      {/* Interactive Working Capital Levers */}
      <div className="mb-5 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>تعديل فترة التخزين (DIO)</span>
            <span className="font-num font-bold text-[#1D63B8]">
              {dioDeltaDays === 0 ? '0 يوم' : `${signFmt(dioDeltaDays, 0)} يوم`}
            </span>
          </div>
          <input
            type="range"
            min={-30}
            max={15}
            step={1}
            value={dioDeltaDays}
            onChange={(e) => setDioDeltaDays(Number(e.target.value))}
            className="w-full accent-[#1D63B8]"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>تعديل فترة التحصيل (DSO)</span>
            <span className="font-num font-bold text-[#0F766E]">
              {dsoDeltaDays === 0 ? '0 يوم' : `${signFmt(dsoDeltaDays, 0)} يوم`}
            </span>
          </div>
          <input
            type="range"
            min={-25}
            max={15}
            step={1}
            value={dsoDeltaDays}
            onChange={(e) => setDsoDeltaDays(Number(e.target.value))}
            className="w-full accent-[#0F766E]"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>فترة الدفع للموردين (DPO)</span>
            <span className="font-num font-bold text-emerald-700">{fmt(dpoDays, 1)} يوماً</span>
          </div>
          <input
            type="range"
            min={25}
            max={75}
            step={1}
            value={dpoDays}
            onChange={(e) => setDpoDays(Number(e.target.value))}
            className="w-full accent-[#059669]"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>الحد المستهدف لـ CCC</span>
            <span className="font-num font-bold text-rose-700">{targetCccDays} يوماً</span>
          </div>
          <input
            type="range"
            min={45}
            max={110}
            step={5}
            value={targetCccDays}
            onChange={(e) => setTargetCccDays(Number(e.target.value))}
            className="w-full accent-[#DC2626]"
          />
        </div>
      </div>

      {/* Main Chart */}
      <CashConversionCycleChart
        data={activeData}
        targetCccDays={targetCccDays}
        height={350}
      />

      {/* Detailed CCC Breakdown Table */}
      <div className="mt-6 overflow-x-auto border-t border-slate-200 pt-4">
        <table className="w-full border-collapse text-right text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600">
              <th className="px-3 py-2.5">{viewMode === 'monthly' ? 'الفترة / السيناريو' : 'القسم التشغيلي'}</th>
              <th className="px-3 py-2.5">فترة التخزين (DIO)</th>
              <th className="px-3 py-2.5">فترة التحصيل (DSO)</th>
              <th className="px-3 py-2.5">الدورة التشغيلية (DIO+DSO)</th>
              <th className="px-3 py-2.5">الدفع للموردين (DPO)</th>
              <th className="px-3 py-2.5">معدل التحويل النقدي (CCC)</th>
              <th className="px-3 py-2.5">رأس المال المحتجز</th>
              <th className="px-3 py-2.5">التقييم</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {activeData.map((row) => {
              const healthy = row.cccDays <= targetCccDays;
              const warning = row.cccDays > targetCccDays && row.cccDays <= targetCccDays + 20;
              return (
                <tr key={row.id} className="hover:bg-slate-50/70">
                  <td className="px-3 py-2.5 font-semibold text-slate-900">{row.label}</td>
                  <td className="font-num px-3 py-2.5 font-semibold text-[#1D63B8]">{fmt(row.dioDays, 1)} يوم</td>
                  <td className="font-num px-3 py-2.5 font-semibold text-[#0F766E]">{fmt(row.dsoDays, 1)} يوم</td>
                  <td className="font-num px-3 py-2.5 text-slate-700">{fmt(row.operatingCycleDays, 1)} يوم</td>
                  <td className="font-num px-3 py-2.5 font-semibold text-emerald-700">−{fmt(row.dpoDays, 1)} يوم</td>
                  <td
                    className={`font-num px-3 py-2.5 font-extrabold ${
                      healthy ? 'text-emerald-700' : warning ? 'text-amber-700' : 'text-rose-700'
                    }`}
                  >
                    {fmt(row.cccDays, 1)} يوم
                  </td>
                  <td className="font-num px-3 py-2.5 font-semibold text-slate-900">
                    {fmt(row.tiedCapitalM, 0)} م.د
                  </td>
                  <td className="px-3 py-2.5">
                    <StateLabel
                      tone={healthy ? 'success' : warning ? 'warning' : 'danger'}
                      label={healthy ? 'كفاءة عالية' : warning ? 'تحت المراقبة' : 'بطء تحصيل / تخزين'}
                    />
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
