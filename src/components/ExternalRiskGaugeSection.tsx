import React, { useMemo, useState } from 'react';
import { OWNER_DATA, fmt, pct, signFmt } from '../data/ownerData';
import {
  ExternalRiskGaugeSvg,
  ExternalRiskRadarChart,
  PortfolioImpactRow,
  PortfolioRiskImpactChart,
  RiskRadarDimension,
} from './Charts';
import { KpiMetricCard, StateLabel, StatusNotice, SurfaceCard } from './UiPrimitives';

type MacroRegimeId = 'baseline_2026' | 'escalation_stress' | 'recovery_2027';

interface ResearchIndicator {
  id: string;
  indicator: string;
  valueText: string;
  source: string;
  riskScore: number;
  severity: 'danger' | 'warning' | 'success';
  severityLabel: string;
  portfolioLink: string;
}

const REGIME_CONFIGS: Record<
  MacroRegimeId,
  {
    label: string;
    subtitle: string;
    freightShockPct: number;
    importCogsShockPct: number;
    demandShockPct: number;
    arDelayDragPct: number;
    privateLabelBoostPct: number;
    capexDiscountPct: number;
    radar: RiskRadarDimension[];
    indicators: ResearchIndicator[];
  }
> = {
  baseline_2026: {
    label: 'الوضع البحثي الراهن (تقديرات 2026)',
    subtitle: 'يعكس قراءات صندوق النقد الدولي والبنك الدولي وتقارير الشحن الإقليمي لعام 2026',
    freightShockPct: 22,
    importCogsShockPct: 4.2,
    demandShockPct: -5.5,
    arDelayDragPct: 7.5,
    privateLabelBoostPct: 6.0,
    capexDiscountPct: 8.5,
    radar: [
      { axis: 'سلاسل الإمداد والشحن', currentRisk: 84, toleranceLimit: 55 },
      { axis: 'انكماش الناتج والطلب', currentRisk: 78, toleranceLimit: 50 },
      { axis: 'تأخر الائتمان والتحصيل', currentRisk: 72, toleranceLimit: 45 },
      { axis: 'ضغوط تكلفة الاستيراد', currentRisk: 68, toleranceLimit: 50 },
      { axis: 'المالية العامة والإنفاق', currentRisk: 66, toleranceLimit: 55 },
    ],
    indicators: [
      {
        id: 'gdp-2026',
        indicator: 'نمو الناتج المحلي الحقيقي (العراق 2026)',
        valueText: '-16.0%',
        source: 'صندوق النقد الدولي (WEO 2026)',
        riskScore: 82,
        severity: 'danger',
        severityLabel: 'خطر مرتفع',
        portfolioLink: 'ضغط على الإنفاق التجاري والسيولة المحلية في البصرة وبغداد وتمدد فترات التحصيل.',
      },
      {
        id: 'freight-2026',
        indicator: 'ممرات الشحن البحري (البحر الأحمر / هرمز)',
        valueText: '+20 إلى +28 يوماً + 4 طبقات رسوم',
        source: 'تقارير اللوجستيات الإقليمية 2025–2026',
        riskScore: 86,
        severity: 'danger',
        severityLabel: 'حرج للشحن',
        portfolioLink: 'تراكم رسوم الحرب (WRS) والوقود والطوارئ يرفع كلفة الأغذية المستوردة والمجمدات.',
      },
      {
        id: 'ca-2026',
        indicator: 'عجز الحساب الجاري من الناتج المحلي',
        valueText: '-10.8% (~26.5 مليار $)',
        source: 'صندوق النقد الدولي (2026)',
        riskScore: 74,
        severity: 'warning',
        severityLabel: 'ضغط عملة وتمويل',
        portfolioLink: 'حساسية تمويل الاعتمادات المستندية وارتفاع كلفة التوريد بالعملة الأجنبية.',
      },
      {
        id: 'debt-2026',
        indicator: 'الدين العام الإجمالي من الناتج المحلي',
        valueText: '71.1%',
        source: 'تقديرات صندوق النقد الدولي (2026)',
        riskScore: 68,
        severity: 'warning',
        severityLabel: 'تقييد مالي',
        portfolioLink: 'تباطؤ المشاريع الحكومية يزيد مخاطر تأخر سداد ذمم كبار عملاء الجملة.',
      },
      {
        id: 'cpi-2026',
        indicator: 'معدل تضخم أسعار المستهلك',
        valueText: '3.5%',
        source: 'صندوق النقد الدولي (2026)',
        riskScore: 44,
        severity: 'warning',
        severityLabel: 'محتوى نسبياً',
        portfolioLink: 'ثبات الأسعار المحلية نسبياً يحدّ من قدرة الشركة على تمرير كامل زيادات كلفة الشحن.',
      },
    ],
  },
  escalation_stress: {
    label: 'سيناريو التصعيد الإقليمي وتشديد الممرات',
    subtitle: 'اختبار ضغط عند اتساع اختناقات الموانئ وارتفاع رسوم مخاطر الحرب والممرات البرية البديلة',
    freightShockPct: 40,
    importCogsShockPct: 8.5,
    demandShockPct: -11.0,
    arDelayDragPct: 14.0,
    privateLabelBoostPct: 11.0,
    capexDiscountPct: 15.0,
    radar: [
      { axis: 'سلاسل الإمداد والشحن', currentRisk: 95, toleranceLimit: 55 },
      { axis: 'انكماش الناتج والطلب', currentRisk: 88, toleranceLimit: 50 },
      { axis: 'تأخر الائتمان والتحصيل', currentRisk: 84, toleranceLimit: 45 },
      { axis: 'ضغوط تكلفة الاستيراد', currentRisk: 86, toleranceLimit: 50 },
      { axis: 'المالية العامة والإنفاق', currentRisk: 79, toleranceLimit: 55 },
    ],
    indicators: [
      {
        id: 'gdp-esc',
        indicator: 'ضغط إضافي على الصادرات والنمو',
        valueText: '-21.5% (سيناريو إجهاد)',
        source: 'محاكاة مخاطر صندوق النقد والبنك الدولي',
        riskScore: 92,
        severity: 'danger',
        severityLabel: 'خطر حرج',
        portfolioLink: 'انكماش حاد بالطلب على السلع الكمالية وتراجع السيولة النقدية في الأسواق.',
      },
      {
        id: 'freight-esc',
        indicator: 'إغلاق جزئي وتحويل بري عبر العقبة والخليج',
        valueText: '+35 يوماً + مضاعفة WRS/ECS',
        source: 'مؤشرات النقل متعدد الوسائط الإقليمية',
        riskScore: 95,
        severity: 'danger',
        severityLabel: 'اضطراب شديد',
        portfolioLink: 'تآكل كامل لهامش المجمدات والزيوت المستوردة ما لم يُعدّل التسعير فوراً.',
      },
      {
        id: 'wc-esc',
        indicator: 'تجمّد رأس المال العامل ومخزون الأمان',
        valueText: 'احتياج +4 أسابيع مخزون إضافي',
        source: 'أبحاث سلاسل الإمداد للمستوردين 2026',
        riskScore: 86,
        severity: 'danger',
        severityLabel: 'ضغط سيولة',
        portfolioLink: 'ارتفاع حاجة التمويل للمخزون وتباطؤ دوران الذمم المدينة في المحافظات.',
      },
      {
        id: 'cpi-esc',
        indicator: 'تمرير تضخم الشحن والتأمين',
        valueText: '6.8% تقديري',
        source: 'حساسية تكلفة الواردات',
        riskScore: 72,
        severity: 'warning',
        severityLabel: 'مرتفع',
        portfolioLink: 'تحوّل المستهلكين نحو البدائل الاقتصادية والعلامة الخاصة المحلية.',
      },
    ],
  },
  recovery_2027: {
    label: 'مسار الاستقرار والتعافي المتوقع (2027)',
    subtitle: 'مشروط باستقرار الملاحة البحرية ورفع القيود الإنتاجية (انتعاش متوقع +19% وفق IMF)',
    freightShockPct: -12,
    importCogsShockPct: -2.0,
    demandShockPct: 8.5,
    arDelayDragPct: -4.0,
    privateLabelBoostPct: 7.5,
    capexDiscountPct: -3.0,
    radar: [
      { axis: 'سلاسل الإمداد والشحن', currentRisk: 42, toleranceLimit: 55 },
      { axis: 'انكماش الناتج والطلب', currentRisk: 34, toleranceLimit: 50 },
      { axis: 'تأخر الائتمان والتحصيل', currentRisk: 40, toleranceLimit: 45 },
      { axis: 'ضغوط تكلفة الاستيراد', currentRisk: 38, toleranceLimit: 50 },
      { axis: 'المالية العامة والإنفاق', currentRisk: 44, toleranceLimit: 55 },
    ],
    indicators: [
      {
        id: 'gdp-2027',
        indicator: 'انتعاش الناتج المحلي الحقيقي المتوقع (2027)',
        valueText: '+19.0%',
        source: 'توقعات صندوق النقد الدولي والبنك الدولي',
        riskScore: 30,
        severity: 'success',
        severityLabel: 'زخم إيجابي',
        portfolioLink: 'توسع الطلب التجاري وتحسن قدرات التوسع الرأسمالي في مخزن البصرة.',
      },
      {
        id: 'freight-2027',
        indicator: 'عودة تدريجية لممرات السويس والبحر الأحمر',
        valueText: 'تقلص الرسوم الإضافية -12% إلى -18%',
        source: 'تقارير شركات الملاحة العالمية',
        riskScore: 42,
        severity: 'warning',
        severityLabel: 'معتدل',
        portfolioLink: 'تحسن مباشر في هوامش الأغذية الجافة والمجمدات المستوردة وتقليص زمن الشحن.',
      },
      {
        id: 'infra-2027',
        indicator: 'مشاريع الطاقة والنقل والربط الإقليمي',
        valueText: 'استثمارات بنية تحتية مليارية',
        source: 'البنك الدولي ومشاريع الطاقة المتكاملة',
        riskScore: 35,
        severity: 'success',
        severityLabel: 'داعم للنمو',
        portfolioLink: 'دعم نشاط التوزيع التجاري والطلب المؤسسي في الفروع الأربعة.',
      },
    ],
  },
};

export function ExternalRiskGaugeSection() {
  const [regime, setRegime] = useState<MacroRegimeId>('baseline_2026');
  const activeCfg = REGIME_CONFIGS[regime];

  const portfolioAnalysis = useMemo(() => {
    const compositeScore =
      activeCfg.radar.reduce((acc, r) => acc + r.currentRisk, 0) / activeCfg.radar.length;

    const scoreLabel =
      compositeScore >= 70
        ? 'مستوى خطر مرتفع — يتطلب تحوطاً فورياً'
        : compositeScore >= 45
          ? 'مستوى خطر متوسط — مراقبة نشطة'
          : 'بيئة مستقرة — مؤاتية للتوسع';

    // Real Group portfolio pillars grounded in OWNER_DATA
    const octTx = OWNER_DATA.transactions.filter((t) => t.period === OWNER_DATA.latestPeriod);
    const importedRev = octTx.filter((t) => t.brand === 'مستورد').reduce((s, t) => s + t.revenue, 0);
    const importedCogs = octTx.filter((t) => t.brand === 'مستورد').reduce((s, t) => s + t.cogs, 0);
    const importedService = OWNER_DATA.contributionAnalysis.products
      .filter((p) => OWNER_DATA.products.find((pr) => pr.id === p.productId)?.brand === 'مستورد')
      .reduce((s, p) => s + p.variableServiceCosts, 0);

    const privateRev = octTx.filter((t) => t.brand === 'علامة خاصة').reduce((s, t) => s + t.revenue, 0);
    const privateGp = octTx.filter((t) => t.brand === 'علامة خاصة').reduce((s, t) => s + t.gp, 0);

    const totalAr = OWNER_DATA.ar.reduce((s, a) => s + a.current + a.overdue, 0);
    const overdueAr = OWNER_DATA.ar.reduce((s, a) => s + a.overdue, 0);
    const totalInv = OWNER_DATA.inventory.reduce((s, i) => s + i.value, 0);
    const workingCapitalExposure = totalAr + totalInv;

    const plannedCapex = 550 + 95; // Basra Warehouse (550M) + Private Label Launch (95M)

    // Annualized / Portfolio-level Expected Impacts (in million IQD)
    const importedImpactAnnualM =
      (-importedCogs * (activeCfg.importCogsShockPct / 100) -
        importedService * (activeCfg.freightShockPct / 100) +
        (importedRev - importedCogs) * (activeCfg.demandShockPct / 100)) *
      4; // Annualized quarterly run-rate

    const privateLabelImpactAnnualM =
      privateGp * (activeCfg.privateLabelBoostPct / 100) * 4;

    const workingCapitalCashImpactM =
      -(overdueAr * (activeCfg.arDelayDragPct / 100)) -
      (totalInv * 0.25 * (activeCfg.freightShockPct > 0 ? activeCfg.freightShockPct / 100 : 0));

    const capexValuationImpactM =
      -plannedCapex * (activeCfg.capexDiscountPct / 100);

    const rows: PortfolioImpactRow[] = [
      {
        segment: 'محفظة المستوردات الغذائية',
        baselineValue: importedRev * 12,
        expectedImpactM: Number(importedImpactAnnualM.toFixed(1)),
        riskLevel: activeCfg.freightShockPct > 15 ? 'تأثر حاد بالشحن' : 'متوازن',
      },
      {
        segment: 'محفظة العلامة الخاصة',
        baselineValue: privateRev * 12,
        expectedImpactM: Number(privateLabelImpactAnnualM.toFixed(1)),
        riskLevel: 'تحوط دفاعي إيجابي',
      },
      {
        segment: 'الذمم والمخزون (رأس المال)',
        baselineValue: workingCapitalExposure,
        expectedImpactM: Number(workingCapitalCashImpactM.toFixed(1)),
        riskLevel: activeCfg.arDelayDragPct > 0 ? 'ضغط تحصيل وتخزين' : 'تحرر سيولة',
      },
      {
        segment: 'المشاريع الرأسمالية (مخزن وتوسع)',
        baselineValue: plannedCapex,
        expectedImpactM: Number(capexValuationImpactM.toFixed(1)),
        riskLevel: activeCfg.capexDiscountPct > 0 ? 'تمدد فترة الاسترداد' : 'تحسن العائد',
      },
    ];

    const totalPortfolioImpactM = rows.reduce((s, r) => s + r.expectedImpactM, 0);
    const totalPortfolioBaseM = workingCapitalExposure + plannedCapex + (importedRev + privateRev) * 12;

    return {
      compositeScore,
      scoreLabel,
      rows,
      totalPortfolioImpactM,
      totalPortfolioBaseM,
      impactPctOfBase: totalPortfolioBaseM > 0 ? (100 * totalPortfolioImpactM) / totalPortfolioBaseM : 0,
    };
  }, [activeCfg]);

  return (
    <div className="space-y-5 pt-2">
      {/* Section Title & Regime Switcher */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">مقياس المخاطر الخارجية وأثرها على المحفظة</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            تقييم كمي للمخاطر الاقتصادية الإقليمية بالاعتماد على البيانات البحثية (IMF · World Bank · تقارير الشحن 2026) وقياس انعكاسها على محفظة المجموعة
          </p>
        </div>

        <div className="inline-flex flex-wrap rounded-lg border border-slate-300 bg-white p-0.5 text-xs">
          {(
            [
              ['baseline_2026', 'تقديرات 2026 الحالية'],
              ['escalation_stress', 'تصعيد وتشديد الشحن'],
              ['recovery_2027', 'مسار التعافي 2027'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setRegime(id)}
              className={`rounded-md px-3 py-1.5 font-semibold transition-colors ${
                regime === id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiMetricCard
          label="مؤشر المخاطر الخارجية المركب"
          value={portfolioAnalysis.compositeScore}
          unit="/ 100"
          subtext={activeCfg.label}
          varianceText={
            portfolioAnalysis.compositeScore >= 70
              ? 'منطقة حذر وتحوط مرتفع'
              : portfolioAnalysis.compositeScore >= 45
                ? 'مخاطر متوسطة'
                : 'مناخ توسعي داعم'
          }
          varianceTone={
            portfolioAnalysis.compositeScore >= 70
              ? 'bad'
              : portfolioAnalysis.compositeScore >= 45
                ? 'warn'
                : 'good'
          }
        />
        <KpiMetricCard
          label="الأثر الصافي المتوقع على المحفظة"
          value={portfolioAnalysis.totalPortfolioImpactM}
          unit="مليون د.ع"
          subtext="التعرض التشغيلي والاستثماري السنوي"
          varianceText={portfolioAnalysis.totalPortfolioImpactM < 0 ? 'ضغط سلبي مقدر' : 'صافي أثر إيجابي'}
          varianceTone={portfolioAnalysis.totalPortfolioImpactM < 0 ? 'bad' : 'good'}
          badgeText={pct(portfolioAnalysis.impactPctOfBase)}
        />
        <KpiMetricCard
          label="حساسية تكلفة الشحن والتوريد"
          value={activeCfg.freightShockPct}
          unit="%"
          subtext={`تغير تكلفة الاستيراد: ${signFmt(activeCfg.importCogsShockPct)}%`}
          varianceText={activeCfg.freightShockPct > 0 ? 'تصاعد رسوم الممرات' : 'انفراج لوجستي'}
          varianceTone={activeCfg.freightShockPct > 0 ? 'warn' : 'good'}
        />
        <KpiMetricCard
          label="الدرع الدفاعي للعلامة الخاصة"
          value={portfolioAnalysis.rows[1].expectedImpactM}
          unit="مليون د.ع"
          subtext="توسع الطلب على البدائل المحلية المعبأة"
          varianceText="تحوّط إيجابي ضد الاستيراد"
          varianceTone="good"
        />
      </div>

      {/* Gauge + Radar + Portfolio Impact Bar Chart */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <SurfaceCard
          className="lg:col-span-5"
          title="بوصلة ومصفوفة المخاطر الإقليمية"
          subtitle={activeCfg.subtitle}
        >
          <div className="space-y-4">
            <ExternalRiskGaugeSvg
              score={portfolioAnalysis.compositeScore}
              label={portfolioAnalysis.scoreLabel}
            />
            <div className="border-t border-slate-100 pt-3">
              <ExternalRiskRadarChart data={activeCfg.radar} height={260} />
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard
          className="lg:col-span-7"
          title="الأثر المالي المتوقع على قطاعات المحفظة الاستثمارية والتجارية"
          subtitle="مليون د.ع · توزيع التعرض بين المستوردات والعلامة الخاصة ورأس المال العامل والمشاريع الرأسمالية"
        >
          <div className="space-y-4">
            <PortfolioRiskImpactChart data={portfolioAnalysis.rows} height={280} />

            <div className="divide-y divide-slate-100 border-t border-slate-200 pt-2 text-xs">
              {portfolioAnalysis.rows.map((row) => (
                <div key={row.segment} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div>
                    <span className="font-bold text-slate-900">{row.segment}</span>
                    <span className="mr-2 text-[11px] text-slate-500">({row.riskLevel})</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-slate-500">
                      حجم المحفظة: <strong className="font-num text-slate-800">{fmt(row.baselineValue)} م.د</strong>
                    </span>
                    <span
                      className={`font-num font-bold ${
                        row.expectedImpactM < 0 ? 'text-rose-700' : 'text-emerald-700'
                      }`}
                    >
                      {signFmt(row.expectedImpactM)} م.د
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SurfaceCard>
      </div>

      {/* Research Indicators Evidence Table */}
      <SurfaceCard
        title="قاعدة المؤشرات البحثية الإقليمية المعتمدة"
        subtitle="بيانات اقتصادية كلية ولوجستية منشورة ومربوطة مباشرة بمواطن التعرض في محفظة المجموعة"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[740px] text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="px-3 py-2.5 font-semibold">المؤشر البحثي الإقليمي</th>
                <th className="px-3 py-2.5 font-semibold">القراءة المرجعية</th>
                <th className="px-3 py-2.5 font-semibold">المصدر</th>
                <th className="px-3 py-2.5 font-semibold">مستوى الخطر</th>
                <th className="px-3 py-2.5 font-semibold">الأثر المباشر على محفظة روافد العراق</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeCfg.indicators.map((ind) => (
                <tr key={ind.id} className="hover:bg-slate-50/70">
                  <td className="px-3 py-3 font-bold text-slate-900">{ind.indicator}</td>
                  <td className="px-3 py-3 font-num font-bold text-[#1D63B8] whitespace-nowrap">{ind.valueText}</td>
                  <td className="px-3 py-3 text-slate-600">{ind.source}</td>
                  <td className="px-3 py-3">
                    <StateLabel tone={ind.severity} label={ind.severityLabel} />
                  </td>
                  <td className="px-3 py-3 text-slate-700 leading-relaxed">{ind.portfolioLink}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          <StatusNotice
            tone={portfolioAnalysis.compositeScore >= 70 ? 'warning' : 'success'}
            title="توصية إعادة موازنة المحفظة الاستثمارية"
          >
            {portfolioAnalysis.compositeScore >= 70
              ? 'في ظل انكماش الناتج الإقليمي وتصاعد رسوم الشحن البحري في 2026، يُنصح بتحويل أولوية السيولة نحو توسيع خطوط العلامة الخاصة عالية الهامش (عدس وسكر روافد)، وإدراج بنود سقوف رسوم الشحن في عقود الاستيراد، وتأجيل التوسع الرأسمالي الثقيل (مخزن البصرة 550 م.د) إلى ما بعد تحصيل الذمم المتأخرة.'
              : 'مع تراجع مخاطر الممرات البحرية وآفاق الانتعاش الكلي المتوقع (+19% في 2027)، تتحسن جدوى الاستثمار في توسعة الطاقة التخزينية بالبصرة واستعادة هوامش السلع المستوردة.'}
          </StatusNotice>
        </div>
      </SurfaceCard>
    </div>
  );
}
