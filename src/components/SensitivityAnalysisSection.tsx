import React, { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { OWNER_DATA, fmt, fmt2, pct, signFmt } from '../data/ownerData';
import {
  SensitivityCurveChart,
  SensitivityCurvePoint,
  SensitivityMarginCompareChart,
  SensitivityProductBarRow,
} from './Charts';
import { KpiMetricCard, StateLabel, StatusNotice, SurfaceCard } from './UiPrimitives';

const SHOCK_STEPS = [-20, -15, -10, -5, 0, 5, 10, 15, 20];

export function SensitivityAnalysisSection() {
  const [selectedProductId, setSelectedProductId] = useState<string>('all');
  const [rawMaterialPct, setRawMaterialPct] = useState<number>(0);
  const [freightCostPct, setFreightCostPct] = useState<number>(0);
  const [sellingPricePct, setSellingPricePct] = useState<number>(0);
  const [discountShiftPts, setDiscountShiftPts] = useState<number>(0);
  const [curveMetric, setCurveMetric] = useState<'marginPct' | 'contribution'>('marginPct');

  const contribProducts = OWNER_DATA.contributionAnalysis.products;

  const baseScope = useMemo(() => {
    if (selectedProductId === 'all') {
      const revenue = contribProducts.reduce((s, p) => s + p.revenue, 0);
      const cogs = contribProducts.reduce((s, p) => s + p.cogs, 0);
      const serviceCost = contribProducts.reduce((s, p) => s + p.variableServiceCosts, 0);
      const contribution = revenue - cogs - serviceCost;
      return {
        label: 'إجمالي محفظة الشركة (9 منتجات)',
        revenue,
        cogs,
        serviceCost,
        contribution,
        marginPct: revenue > 0 ? (100 * contribution) / revenue : 0,
      };
    }
    const found = contribProducts.find((p) => p.productId === selectedProductId) || contribProducts[0];
    return {
      label: found.productName,
      revenue: found.revenue,
      cogs: found.cogs,
      serviceCost: found.variableServiceCosts,
      contribution: found.contribution,
      marginPct: found.contributionMarginPct,
    };
  }, [selectedProductId, contribProducts]);

  const evalDriverAdjustments = (
    base: { revenue: number; cogs: number; serviceCost: number },
    rawPct: number,
    freightPct: number,
    pricePct: number,
    discPts: number
  ) => {
    // Adjust net revenue for selling price & discount shift
    const adjRevenue = Math.max(0.01, base.revenue * (1 + pricePct / 100) * (1 - discPts / 100));
    const adjCogs = Math.max(0, base.cogs * (1 + rawPct / 100));
    const adjService = Math.max(0, base.serviceCost * (1 + freightPct / 100));
    const adjContribution = adjRevenue - adjCogs - adjService;
    const adjMarginPct = adjRevenue > 0 ? (100 * adjContribution) / adjRevenue : 0;
    return {
      adjRevenue,
      adjCogs,
      adjService,
      adjContribution,
      adjMarginPct,
    };
  };

  const currentResult = useMemo(
    () => evalDriverAdjustments(baseScope, rawMaterialPct, freightCostPct, sellingPricePct, discountShiftPts),
    [baseScope, rawMaterialPct, freightCostPct, sellingPricePct, discountShiftPts]
  );

  // Sensitivity curve across shocks relative to current slider position
  const curveData = useMemo<SensitivityCurvePoint[]>(() => {
    return SHOCK_STEPS.map((shock) => {
      const rawSim = evalDriverAdjustments(
        baseScope,
        rawMaterialPct + shock,
        freightCostPct,
        sellingPricePct,
        discountShiftPts
      );
      const freightSim = evalDriverAdjustments(
        baseScope,
        rawMaterialPct,
        freightCostPct + shock,
        sellingPricePct,
        discountShiftPts
      );
      const priceSim = evalDriverAdjustments(
        baseScope,
        rawMaterialPct,
        freightCostPct,
        sellingPricePct + shock,
        discountShiftPts
      );

      return {
        shockPct: shock,
        label: shock === 0 ? '0%' : `${shock > 0 ? '+' : ''}${shock}%`,
        rawMaterialMarginPct: Number(rawSim.adjMarginPct.toFixed(2)),
        freightMarginPct: Number(freightSim.adjMarginPct.toFixed(2)),
        priceMarginPct: Number(priceSim.adjMarginPct.toFixed(2)),
        rawMaterialContrib: Number(rawSim.adjContribution.toFixed(2)),
        freightContrib: Number(freightSim.adjContribution.toFixed(2)),
        priceContrib: Number(priceSim.adjContribution.toFixed(2)),
      };
    });
  }, [baseScope, rawMaterialPct, freightCostPct, sellingPricePct, discountShiftPts]);

  // Per-product comparison bar data
  const productComparison = useMemo<SensitivityProductBarRow[]>(() => {
    return contribProducts
      .map((p) => {
        const res = evalDriverAdjustments(
          { revenue: p.revenue, cogs: p.cogs, serviceCost: p.variableServiceCosts },
          rawMaterialPct,
          freightCostPct,
          sellingPricePct,
          discountShiftPts
        );
        return {
          name: p.productName,
          baseMarginPct: Number(p.contributionMarginPct.toFixed(1)),
          adjustedMarginPct: Number(res.adjMarginPct.toFixed(1)),
          baseContrib: Number(p.contribution.toFixed(2)),
          adjustedContrib: Number(res.adjContribution.toFixed(2)),
        };
      })
      .sort((a, b) => a.adjustedMarginPct - b.adjustedMarginPct);
  }, [contribProducts, rawMaterialPct, freightCostPct, sellingPricePct, discountShiftPts]);

  // Elasticity & breakeven thresholds
  const elasticity = useMemo(() => {
    const per1PctRaw = -(currentResult.adjCogs / 100);
    const per1PctFreight = -(currentResult.adjService / 100);
    const per1PctPrice = currentResult.adjRevenue / 100;

    // Max extra % rise in raw materials before contribution hits 0
    const rawBreakevenExtraPct =
      currentResult.adjCogs > 0 && currentResult.adjContribution > 0
        ? (currentResult.adjContribution / currentResult.adjCogs) * 100
        : null;
    const freightBreakevenExtraPct =
      currentResult.adjService > 0 && currentResult.adjContribution > 0
        ? (currentResult.adjContribution / currentResult.adjService) * 100
        : null;

    return {
      per1PctRaw,
      per1PctFreight,
      per1PctPrice,
      rawBreakevenExtraPct,
      freightBreakevenExtraPct,
    };
  }, [currentResult]);

  const contribDelta = currentResult.adjContribution - baseScope.contribution;
  const marginDeltaPts = currentResult.adjMarginPct - baseScope.marginPct;

  const resetAll = () => {
    setRawMaterialPct(0);
    setFreightCostPct(0);
    setSellingPricePct(0);
    setDiscountShiftPts(0);
  };

  return (
    <div className="space-y-6">
      {/* Scope & Presets Strip */}
      <SurfaceCard
        title="أداة تحليل الحساسية لهامش المساهمة"
        subtitle="حرّك متغيرات أسعار المواد الخام وتكاليف الشحن وسعر البيع لمراقبة أثرها المباشر على هامش المساهمة (فترة 2026-10)"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              aria-label="نطاق تحليل الحساسية"
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800"
            >
              <option value="all">إجمالي الشركة (جميع المنتجات)</option>
              {contribProducts.map((p) => (
                <option key={p.productId} value={p.productId}>
                  {p.productName}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={resetAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>إعادة للوضع الأساسي</span>
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          {/* Interactive Sliders */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-semibold text-slate-700">
              <div className="flex justify-between">
                <span>أسعار المواد الخام / التوريد</span>
                <span className="font-num font-bold text-[#1D63B8]">{signFmt(rawMaterialPct, 0)}%</span>
              </div>
              <input
                type="range"
                min={-20}
                max={25}
                step={1}
                value={rawMaterialPct}
                onChange={(e) => setRawMaterialPct(Number(e.target.value))}
                className="mt-2 w-full accent-[#1D63B8]"
              />
              <div className="mt-1 flex justify-between text-[11px] font-normal text-slate-400">
                <span>-20%</span>
                <span>تكلفة البضاعة: {fmt(currentResult.adjCogs)} م.د</span>
                <span>+25%</span>
              </div>
            </label>

            <label className="text-xs font-semibold text-slate-700">
              <div className="flex justify-between">
                <span>تكاليف الشحن والخدمة المتغيرة</span>
                <span className="font-num font-bold text-amber-700">{signFmt(freightCostPct, 0)}%</span>
              </div>
              <input
                type="range"
                min={-30}
                max={50}
                step={2}
                value={freightCostPct}
                onChange={(e) => setFreightCostPct(Number(e.target.value))}
                className="mt-2 w-full accent-amber-600"
              />
              <div className="mt-1 flex justify-between text-[11px] font-normal text-slate-400">
                <span>-30%</span>
                <span>كلفة الشحن والخدمة: {fmt(currentResult.adjService)} م.د</span>
                <span>+50%</span>
              </div>
            </label>

            <label className="text-xs font-semibold text-slate-700">
              <div className="flex justify-between">
                <span>تغير سعر البيع</span>
                <span className="font-num font-bold text-[#0F766E]">{signFmt(sellingPricePct, 0)}%</span>
              </div>
              <input
                type="range"
                min={-15}
                max={20}
                step={1}
                value={sellingPricePct}
                onChange={(e) => setSellingPricePct(Number(e.target.value))}
                className="mt-2 w-full accent-[#0F766E]"
              />
              <div className="mt-1 flex justify-between text-[11px] font-normal text-slate-400">
                <span>-15%</span>
                <span>صافي الإيراد: {fmt(currentResult.adjRevenue)} م.د</span>
                <span>+20%</span>
              </div>
            </label>

            <label className="text-xs font-semibold text-slate-700">
              <div className="flex justify-between">
                <span>تغير الخصم التجاري</span>
                <span className="font-num font-bold text-slate-800">{signFmt(discountShiftPts, 0)} نقطة</span>
              </div>
              <input
                type="range"
                min={-4}
                max={6}
                step={1}
                value={discountShiftPts}
                onChange={(e) => setDiscountShiftPts(Number(e.target.value))}
                className="mt-2 w-full accent-slate-700"
              />
              <div className="mt-1 flex justify-between text-[11px] font-normal text-slate-400">
                <span>-4 نقاط</span>
                <span>ضبط أو توسع الخصم</span>
                <span>+6 نقاط</span>
              </div>
            </label>
          </div>

          {/* Quick Shock Presets */}
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 text-xs">
            <span className="font-semibold text-slate-500">اختبارات ضغط جاهزة:</span>
            <button
              type="button"
              onClick={() => {
                setRawMaterialPct(8);
                setFreightCostPct(20);
                setSellingPricePct(0);
                setDiscountShiftPts(0);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
            >
              ارتفاع المواد الخام +8% والشحن +20%
            </button>
            <button
              type="button"
              onClick={() => {
                setRawMaterialPct(10);
                setFreightCostPct(24);
                setSellingPricePct(6);
                setDiscountShiftPts(-2);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
            >
              تمرير التكلفة عبر تسعير +6% وضبط الخصم
            </button>
            <button
              type="button"
              onClick={() => {
                setRawMaterialPct(-5);
                setFreightCostPct(-16);
                setSellingPricePct(0);
                setDiscountShiftPts(-1);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
            >
              كفاءة توريد (-5%) وشحن (-16%)
            </button>
          </div>
        </div>
      </SurfaceCard>

      {/* Live Impact KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiMetricCard
          label="هامش المساهمة الأساسي"
          value={baseScope.contribution}
          unit="مليون د.ع"
          subtext={`نسبة الهامش الأساسية: ${pct(baseScope.marginPct)}`}
        />
        <KpiMetricCard
          label="هامش المساهمة بعد التعديل"
          value={currentResult.adjContribution}
          unit="مليون د.ع"
          subtext={baseScope.label}
          varianceText={currentResult.adjContribution >= 0 ? 'مساهمة موجبة' : 'تآكل كامل للمساهمة'}
          varianceTone={currentResult.adjContribution >= 0 ? 'good' : 'bad'}
          badgeText={pct(currentResult.adjMarginPct)}
        />
        <KpiMetricCard
          label="صافي الأثر على المساهمة"
          value={contribDelta}
          unit="مليون د.ع"
          subtext={`تغير نسبة الهامش: ${signFmt(marginDeltaPts)} نقطة مئوية`}
          varianceText={contribDelta >= 0 ? 'تحسّن في الهامش' : 'تآكل في الهامش'}
          varianceTone={contribDelta >= 0 ? 'good' : 'bad'}
        />
        <KpiMetricCard
          label="نسبة هامش المساهمة المتوقعة"
          value={currentResult.adjMarginPct}
          unit="%"
          subtext={`تكاليف الشحن والخدمة: ${fmt(currentResult.adjService)} م.د`}
          varianceText={
            currentResult.adjMarginPct < 0
              ? 'منطقة خسارة تشغيلية'
              : currentResult.adjMarginPct < 5
                ? 'هامش حرج ضيّق'
                : 'نطاق صحي'
          }
          varianceTone={
            currentResult.adjMarginPct < 0 ? 'bad' : currentResult.adjMarginPct < 5 ? 'warn' : 'good'
          }
        />
      </div>

      {/* Warning Notice if Margin turns critical/negative */}
      {currentResult.adjContribution <= 0 && (
        <StatusNotice tone="danger" title="تحذير: تحول هامش المساهمة إلى المنطقة السالبة">
          تحت الافتراضات الحالية ({signFmt(rawMaterialPct, 0)}% مواد خام، {signFmt(freightCostPct, 0)}% شحن)، تتجاوز تكلفة البضاعة والشحن صافي الإيراد بمقدار{' '}
          <strong className="font-num">{fmt(Math.abs(currentResult.adjContribution))}</strong> مليون د.ع.
        </StatusNotice>
      )}

      {/* Interactive Sensitivity Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SurfaceCard
          title="منحنى الحساسية متعدد المتغيرات"
          subtitle="أثر تغير كل متغير منفرداً (-20% إلى +20% من الوضع الحالي) على هامش المساهمة"
          action={
            <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setCurveMetric('marginPct')}
                className={`rounded-md px-2.5 py-1 font-semibold ${
                  curveMetric === 'marginPct' ? 'bg-slate-900 text-white' : 'text-slate-600'
                }`}
              >
                نسبة الهامش %
              </button>
              <button
                type="button"
                onClick={() => setCurveMetric('contribution')}
                className={`rounded-md px-2.5 py-1 font-semibold ${
                  curveMetric === 'contribution' ? 'bg-slate-900 text-white' : 'text-slate-600'
                }`}
              >
                القيمة (م.د)
              </button>
            </div>
          }
        >
          <SensitivityCurveChart data={curveData} metric={curveMetric} />
        </SurfaceCard>

        <SurfaceCard
          title="حساسية هامش المساهمة حسب الصنف (%)"
          subtitle="مقارنة هامش المساهمة الأساسي مقابل الناتج بعد تحريك المتغيرات لكل منتج"
        >
          <SensitivityMarginCompareChart data={productComparison} />
        </SurfaceCard>
      </div>

      {/* Elasticity & Breakeven Tolerance Table */}
      <SurfaceCard
        title="معاملات المرونة وحدود التحمل (نقطة التعادل)"
        subtitle={`حساسية ${baseScope.label} لكل تغير بمقدار 1% وحد الزيادة الأقصى قبل تآكل هامش المساهمة`}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="px-3 py-2.5 font-semibold">المتغير الاقتصادي</th>
                <th className="px-3 py-2.5 font-semibold">القيمة الحالية بعد التعديل</th>
                <th className="px-3 py-2.5 font-semibold">حساسية تغير +1% (م.د)</th>
                <th className="px-3 py-2.5 font-semibold">هامش الأمان قبل التعادل (0%)</th>
                <th className="px-3 py-2.5 font-semibold">درجة الحساسية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-3 py-3 font-bold text-slate-900">أسعار المواد الخام / تكلفة الشراء (COGS)</td>
                <td className="px-3 py-3 font-num">{fmt(currentResult.adjCogs)} م.د</td>
                <td className="px-3 py-3 font-num font-bold text-rose-700">{signFmt(elasticity.per1PctRaw, 2)} م.د</td>
                <td className="px-3 py-3 font-num font-semibold text-slate-800">
                  {elasticity.rawBreakevenExtraPct !== null
                    ? `تتحمل زيادة حتى +${fmt(elasticity.rawBreakevenExtraPct)}%`
                    : 'تجاوز حد التعادل'}
                </td>
                <td className="px-3 py-3">
                  <StateLabel tone="danger" label="تأثير مرتفع جداً" />
                </td>
              </tr>
              <tr>
                <td className="px-3 py-3 font-bold text-slate-900">تكاليف الشحن والخدمة المتغيرة</td>
                <td className="px-3 py-3 font-num">{fmt(currentResult.adjService)} م.د</td>
                <td className="px-3 py-3 font-num font-bold text-amber-700">{signFmt(elasticity.per1PctFreight, 2)} م.د</td>
                <td className="px-3 py-3 font-num font-semibold text-slate-800">
                  {elasticity.freightBreakevenExtraPct !== null
                    ? `تتحمل زيادة حتى +${fmt(elasticity.freightBreakevenExtraPct)}%`
                    : 'تجاوز حد التعادل'}
                </td>
                <td className="px-3 py-3">
                  <StateLabel tone="warning" label="تأثير متوسط (حرج بالمجمدات)" />
                </td>
              </tr>
              <tr>
                <td className="px-3 py-3 font-bold text-slate-900">أسعار البيع المرجعية</td>
                <td className="px-3 py-3 font-num">{fmt(currentResult.adjRevenue)} م.د</td>
                <td className="px-3 py-3 font-num font-bold text-emerald-700">{signFmt(elasticity.per1PctPrice, 2)} م.د</td>
                <td className="px-3 py-3 text-slate-500">رافع مباشر لتعويض تضخم المدخلات</td>
                <td className="px-3 py-3">
                  <StateLabel tone="success" label="الأعلى حساسية إيجابية" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </SurfaceCard>
    </div>
  );
}
