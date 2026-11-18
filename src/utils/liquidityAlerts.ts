import { OWNER_DATA, filterTransactions, sumRows, fmt, pct } from '../data/ownerData';

export interface LiquiditySettings {
  minAvailableLiquidityM: number; // الحد الأدنى للسيولة المتاحة (مليون د.ع)
  warningBufferPct: number; // هامش الإنذار المبكر قبل الحد الأدنى (%)
  minCoverageDays: number; // الحد الأدنى لأيام التغطية النقدية لتكلفة المبيعات
  maxOverdueArPct: number; // السقف الأقصى لنسبة الذمم المتأخرة (%)
  maxSlowInventoryPct: number; // السقف الأقصى للمخزون بطيء الحركة (%)
  alertsEnabled: boolean; // تفعيل التنبيهات البصرية داخل التطبيق
}

export const DEFAULT_LIQUIDITY_SETTINGS: LiquiditySettings = {
  minAvailableLiquidityM: 250,
  warningBufferPct: 15,
  minCoverageDays: 10,
  maxOverdueArPct: 25,
  maxSlowInventoryPct: 20,
  alertsEnabled: true,
};

export const LIQUIDITY_SETTINGS_STORAGE_KEY = 'owner_ai_liquidity_settings_v1';

export type AlertSeverity = 'critical' | 'warning' | 'healthy';

export interface SmartAlert {
  id: string;
  severity: AlertSeverity;
  category: 'liquidity' | 'coverage' | 'ar' | 'inventory';
  title: string;
  message: string;
  metricValue: string;
  thresholdValue: string;
  actionLabel: string;
  targetTab: 'capital' | 'margin' | 'settings';
}

export interface WorkingCapitalAnalysis {
  period: string;
  periodLabel: string;
  arTotal: number;
  arCurrent: number;
  arOverdue: number;
  overdueArPct: number;
  topOverdueRegion: { region: string; overdue: number; pct: number };
  invTotal: number;
  invSlow: number;
  slowInventoryPct: number;
  topSlowProduct: { product: string; name: string; slowValue: number; slowPct: number };
  periodRevenue: number;
  periodCogs: number;
  periodGp: number;
  dailyCogsOutflow: number;
  workingCapitalDrag: number;
  estimatedFreeLiquidity: number;
  warningFloorM: number;
  distanceToMinM: number;
  distanceToMinPct: number;
  coverageDays: number;
  liquidityStatus: AlertSeverity;
  alerts: SmartAlert[];
}

export function analyzeWorkingCapitalAndLiquidity(
  period: string,
  settings: LiquiditySettings
): WorkingCapitalAnalysis {
  const monthObj = OWNER_DATA.months.find((m) => m.id === period);
  const periodLabel = monthObj ? monthObj.label : period;

  const periodRows = filterTransactions(OWNER_DATA.transactions, { period });
  const totals = sumRows(periodRows);

  const arTotal = OWNER_DATA.ar.reduce((acc, r) => acc + r.current + r.overdue, 0);
  const arOverdue = OWNER_DATA.ar.reduce((acc, r) => acc + r.overdue, 0);
  const arCurrent = arTotal - arOverdue;
  const overdueArPct = arTotal > 0 ? (100 * arOverdue) / arTotal : 0;

  const sortedAr = [...OWNER_DATA.ar]
    .map((r) => ({
      region: r.region,
      overdue: r.overdue,
      pct: r.current + r.overdue > 0 ? (100 * r.overdue) / (r.current + r.overdue) : 0,
    }))
    .sort((a, b) => b.overdue - a.overdue);
  const topOverdueRegion = sortedAr[0] || { region: '—', overdue: 0, pct: 0 };

  const invTotal = OWNER_DATA.inventory.reduce((acc, r) => acc + r.value, 0);
  const invSlow = OWNER_DATA.inventory.reduce((acc, r) => acc + r.value * r.slow, 0);
  const slowInventoryPct = invTotal > 0 ? (100 * invSlow) / invTotal : 0;

  const sortedInv = [...OWNER_DATA.inventory]
    .map((r) => ({
      product: r.product,
      name: OWNER_DATA.products.find((p) => p.id === r.product)?.name || r.product,
      slowValue: r.value * r.slow,
      slowPct: r.slow * 100,
    }))
    .sort((a, b) => b.slowValue - a.slowValue);
  const topSlowProduct = sortedInv[0] || { product: '—', name: '—', slowValue: 0, slowPct: 0 };

  // Transparent Liquidity Proxy anchored to Operating Cash Buffer + Period GP - Excess Working Capital Drag
  const baseCashReserve = 340;
  const excessOverdueDrag = Math.max(0, arOverdue - arTotal * 0.12) * 0.45;
  const excessSlowInvDrag = Math.max(0, invSlow - invTotal * 0.10) * 0.25;
  const workingCapitalDrag = excessOverdueDrag + excessSlowInvDrag;

  const estimatedFreeLiquidity = Math.max(0, baseCashReserve + totals.gp - workingCapitalDrag);
  const dailyCogsOutflow = totals.cogs > 0 ? totals.cogs / 30 : 1;
  const coverageDays = estimatedFreeLiquidity / dailyCogsOutflow;

  const minFloor = settings.minAvailableLiquidityM;
  const warningFloorM = minFloor * (1 + settings.warningBufferPct / 100);
  const distanceToMinM = estimatedFreeLiquidity - minFloor;
  const distanceToMinPct = minFloor > 0 ? (100 * distanceToMinM) / minFloor : 0;

  let liquidityStatus: AlertSeverity = 'healthy';
  if (estimatedFreeLiquidity < minFloor) {
    liquidityStatus = 'critical';
  } else if (estimatedFreeLiquidity <= warningFloorM) {
    liquidityStatus = 'warning';
  }

  const alerts: SmartAlert[] = [];

  // 1. Primary Liquidity Floor Alert
  if (estimatedFreeLiquidity < minFloor) {
    alerts.push({
      id: `liq-floor-${period}`,
      severity: 'critical',
      category: 'liquidity',
      title: 'السيولة دون الحد الأدنى المحدد في الإعدادات',
      message: `انخفضت السيولة الحرة التقديرية إلى ${fmt(estimatedFreeLiquidity)} م.د بفجوة ${fmt(Math.abs(distanceToMinM))} م.د عن الحد الأدنى (${fmt(minFloor, 0)} م.د) نتيجة تراجع الربحية وتقيّد رأس المال العامل.`,
      metricValue: `${fmt(estimatedFreeLiquidity)} م.د`,
      thresholdValue: `الحد الأدنى: ${fmt(minFloor, 0)} م.د`,
      actionLabel: 'فتح درع رأس المال',
      targetTab: 'capital',
    });
  } else if (estimatedFreeLiquidity <= warningFloorM) {
    alerts.push({
      id: `liq-near-${period}`,
      severity: 'warning',
      category: 'liquidity',
      title: 'اقتراب السيولة من الحد الأدنى المحدد',
      message: `السيولة المتاحة (${fmt(estimatedFreeLiquidity)} م.د) تقع ضمن هامش الإنذار المبكر (+${fmt(settings.warningBufferPct, 0)}%) وبفارق ${fmt(distanceToMinM)} م.د فقط فوق الحد الأدنى (${fmt(minFloor, 0)} م.د).`,
      metricValue: `${fmt(estimatedFreeLiquidity)} م.د`,
      thresholdValue: `نطاق الإنذار: ≤ ${fmt(warningFloorM)} م.د`,
      actionLabel: 'مراجعة درع رأس المال',
      targetTab: 'capital',
    });
  }

  // 2. Coverage Days Alert
  const coverageWarningLimit = settings.minCoverageDays * (1 + settings.warningBufferPct / 100);
  if (coverageDays < settings.minCoverageDays) {
    alerts.push({
      id: `cov-floor-${period}`,
      severity: 'critical',
      category: 'coverage',
      title: 'تغطية السيولة التشغيلية أقل من الحد الأدنى',
      message: `الرصيد النقدي التقديري يغطي ${fmt(coverageDays)} يوماً من تكلفة المبيعات اليومية، وهو أقل من الحد الأدنى المعتمد (${fmt(settings.minCoverageDays, 0)} أيام).`,
      metricValue: `${fmt(coverageDays)} يوم`,
      thresholdValue: `الحد الأدنى: ${fmt(settings.minCoverageDays, 0)} يوم`,
      actionLabel: 'ضبط حدود الإعدادات',
      targetTab: 'settings',
    });
  } else if (coverageDays <= coverageWarningLimit) {
    alerts.push({
      id: `cov-near-${period}`,
      severity: 'warning',
      category: 'coverage',
      title: 'اقتراب أيام التغطية النقدية من الحد الأدنى',
      message: `تغطية السيولة (${fmt(coverageDays)} يوم) قريبة من الحد الأدنى (${fmt(settings.minCoverageDays, 0)} أيام) مقارنة بمعدل الخروج اليومي البالغ ${fmt(dailyCogsOutflow)} م.د.`,
      metricValue: `${fmt(coverageDays)} يوم`,
      thresholdValue: `الإنذار المبكر: ≤ ${fmt(coverageWarningLimit)} يوم`,
      actionLabel: 'تحليل الهامش والتكلفة',
      targetTab: 'margin',
    });
  }

  // 3. Overdue AR Concentration Alert
  if (overdueArPct > settings.maxOverdueArPct) {
    alerts.push({
      id: `ar-overdue-${period}`,
      severity: overdueArPct >= settings.maxOverdueArPct + 4 ? 'critical' : 'warning',
      category: 'ar',
      title: 'تجاوز سقف الذمم المتأخرة المسموح',
      message: `تبلغ الذمم المتأخرة ${pct(overdueArPct)} (${fmt(arOverdue)} م.د) متجاوزة السقف (${pct(settings.maxOverdueArPct)}). تتركز أعلى متأخرات في ${topOverdueRegion.region} بمقدار ${fmt(topOverdueRegion.overdue)} م.د.`,
      metricValue: pct(overdueArPct),
      thresholdValue: `السقف: ${pct(settings.maxOverdueArPct)}`,
      actionLabel: 'تفكيك ذمم المناطق',
      targetTab: 'capital',
    });
  }

  // 4. Slow Moving Inventory Alert
  if (slowInventoryPct > settings.maxSlowInventoryPct) {
    alerts.push({
      id: `inv-slow-${period}`,
      severity: slowInventoryPct >= settings.maxSlowInventoryPct + 4 ? 'critical' : 'warning',
      category: 'inventory',
      title: 'تراكم سيولة في المخزون بطيء الحركة',
      message: `المخزون بطيء الحركة يشكّل ${pct(slowInventoryPct)} (${fmt(invSlow)} م.د) مقابل حد أقصى ${pct(settings.maxSlowInventoryPct)}؛ يتصدره "${topSlowProduct.name}" بقيمة ${fmt(topSlowProduct.slowValue)} م.د.`,
      metricValue: pct(slowInventoryPct),
      thresholdValue: `السقف: ${pct(settings.maxSlowInventoryPct)}`,
      actionLabel: 'جدول المخزون البطيء',
      targetTab: 'capital',
    });
  }

  return {
    period,
    periodLabel,
    arTotal,
    arCurrent,
    arOverdue,
    overdueArPct,
    topOverdueRegion,
    invTotal,
    invSlow,
    slowInventoryPct,
    topSlowProduct,
    periodRevenue: totals.revenue,
    periodCogs: totals.cogs,
    periodGp: totals.gp,
    dailyCogsOutflow,
    workingCapitalDrag,
    estimatedFreeLiquidity,
    warningFloorM,
    distanceToMinM,
    distanceToMinPct,
    coverageDays,
    liquidityStatus,
    alerts,
  };
}
