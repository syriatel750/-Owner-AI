import * as XLSX from 'xlsx';
import {
  ArRow,
  CaseItem,
  DecisionRecord,
  OWNER_DATA,
  SumTotals,
  filterTransactions,
} from '../data/ownerData';

function createRtlSheet(rows: Array<Record<string, string | number>>): XLSX.WorkSheet {
  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet['!views'] = [{ rightToLeft: true }];
  if (rows.length > 0) {
    const keys = Object.keys(rows[0]);
    sheet['!cols'] = keys.map((k) => {
      const maxLen = Math.max(
        k.length,
        ...rows.map((r) => String(r[k] ?? '').length)
      );
      return { wch: Math.min(42, Math.max(14, maxLen + 4)) };
    });
  }
  return sheet;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface CockpitExportPayload {
  period: string;
  periodLabel: string;
  activeTabLabel: string;
  periodTotals: SumTotals;
  planTotals: SumTotals;
  regionSummary: Array<{
    region: string;
    revenue: number;
    cogs: number;
    gp: number;
    margin: number;
    quantity: number;
  }>;
  skuMatrix: Array<{
    product: string;
    name: string;
    cat: string;
    quantity: number;
    revenue: number;
    cogs: number;
    gp: number;
    margin: number;
    discountPct: number;
  }>;
  ar: ArRow[];
  invWithNames: Array<{
    product: string;
    name: string;
    category: string;
    value: number;
    slow: number;
    slowValue: number;
  }>;
  decisions: DecisionRecord[];
}

export function exportCockpitToExcel(payload: CockpitExportPayload): string {
  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };

  const marginPct = payload.periodTotals.revenue
    ? (100 * payload.periodTotals.gp) / payload.periodTotals.revenue
    : 0;
  const planMarginPct = payload.planTotals.revenue
    ? (100 * payload.planTotals.gp) / payload.planTotals.revenue
    : 0;

  // Sheet 1: Executive Summary
  const summaryRows = [
    { البند: 'الشركة', القيمة: OWNER_DATA.meta.company, الوحدة: '—' },
    { البند: 'اللوحة المصدّرة', القيمة: `مركز المالك التنفيذي · ${payload.activeTabLabel}`, الوحدة: '—' },
    { البند: 'الفترة المالية', القيمة: payload.periodLabel, الوحدة: payload.period },
    { البند: 'تاريخ التصدير', القيمة: new Date().toISOString().slice(0, 10), الوحدة: '—' },
    { البند: 'صافي المبيعات الفعلي', القيمة: round2(payload.periodTotals.revenue), الوحدة: 'مليون د.ع' },
    { البند: 'صافي المبيعات المخطط', القيمة: round2(payload.planTotals.revenue), الوحدة: 'مليون د.ع' },
    { البند: 'تكلفة البضاعة المبيعة (COGS)', القيمة: round2(payload.periodTotals.cogs), الوحدة: 'مليون د.ع' },
    { البند: 'الربح الإجمالي الفعلي', القيمة: round2(payload.periodTotals.gp), الوحدة: 'مليون د.ع' },
    { البند: 'الربح الإجمالي المخطط', القيمة: round2(payload.planTotals.gp), الوحدة: 'مليون د.ع' },
    { البند: 'انحراف الربح الإجمالي عن الخطة', القيمة: round2(payload.periodTotals.gp - payload.planTotals.gp), الوحدة: 'مليون د.ع' },
    { البند: 'نسبة الهامش الإجمالي الفعلي', القيمة: round2(marginPct), الوحدة: '%' },
    { البند: 'نسبة الهامش الإجمالي المخطط', القيمة: round2(planMarginPct), الوحدة: '%' },
    { البند: 'إجمالي الكميات المباعة', القيمة: payload.periodTotals.qty, الوحدة: 'وحدة' },
  ];
  XLSX.utils.book_append_sheet(wb, createRtlSheet(summaryRows), 'ملخص مركز المالك');

  // Sheet 2: Regions
  const regionRows = payload.regionSummary.map((r) => ({
    المنطقة: r.region,
    'صافي المبيعات (م.د)': round2(r.revenue),
    'تكلفة البضاعة (م.د)': round2(r.cogs),
    'الربح الإجمالي (م.د)': round2(r.gp),
    'الهامش الإجمالي (%)': round2(r.margin),
    'الكمية المباعة': r.quantity,
  }));
  XLSX.utils.book_append_sheet(wb, createRtlSheet(regionRows), 'تحليل المناطق');

  // Sheet 3: SKUs
  const skuRows = payload.skuMatrix.map((s) => ({
    'رمز الصنف': s.product,
    'اسم الصنف': s.name,
    القطاع: s.cat,
    'الكمية المباعة': s.quantity,
    'صافي المبيعات (م.د)': round2(s.revenue),
    'التكلفة (م.د)': round2(s.cogs),
    'الربح الإجمالي (م.د)': round2(s.gp),
    'الهامش (%)': round2(s.margin),
    'متوسط الخصم (%)': round2(s.discountPct),
  }));
  XLSX.utils.book_append_sheet(wb, createRtlSheet(skuRows), 'ربحية الأصناف');

  // Sheet 4: Working Capital (AR + Inventory)
  const arRows = payload.ar.map((a) => {
    const total = a.current + a.overdue;
    return {
      النوع: 'ذمم مدينة',
      'المنطقة / الصنف': a.region,
      'الرصيد الجاري / الطبيعي (م.د)': round2(a.current),
      'الرصيد المتأخر / البطيء (م.د)': round2(a.overdue),
      'الإجمالي (م.د)': round2(total),
      'نسبة التعرض (%)': total ? round2((100 * a.overdue) / total) : 0,
    };
  });
  const invRows = payload.invWithNames.map((i) => ({
    النوع: 'مخزون سلعي',
    'المنطقة / الصنف': `${i.name} (${i.category})`,
    'الرصيد الجاري / الطبيعي (م.د)': round2(i.value - i.slowValue),
    'الرصيد المتأخر / البطيء (م.د)': round2(i.slowValue),
    'الإجمالي (م.د)': round2(i.value),
    'نسبة التعرض (%)': round2(i.slow * 100),
  }));
  XLSX.utils.book_append_sheet(wb, createRtlSheet([...arRows, ...invRows]), 'رأس المال العامل');

  // Sheet 5: Asset Efficiency by Operating Department
  const periodTx = filterTransactions(OWNER_DATA.transactions, { period: payload.period });
  const totalPeriodRev = periodTx.reduce((s, r) => s + r.revenue, 0);
  const totalArM = payload.ar.reduce((s, r) => s + r.current + r.overdue, 0);
  const invMap = new Map(OWNER_DATA.inventory.map((i) => [i.product, i]));
  const deptSpecs = [
    { name: 'قسم التعبئة والعلامة الخاصة', ids: ['P07', 'P08'], fixed: 120, opex: 7.4 },
    { name: 'قسم المنظفات والسلع غير الغذائية', ids: ['P06'], fixed: 88, opex: 5.2 },
    { name: 'قسم المعلبات والمنتجات المحفوظة', ids: ['P02'], fixed: 94, opex: 5.5 },
    { name: 'قسم الأغذية الجافة المستوردة', ids: ['P01', 'P03', 'P04'], fixed: 315, opex: 17.8 },
    { name: 'قسم المجمدات وسلسلة التبريد', ids: ['P05', 'P09'], fixed: 465, opex: 13.6 },
  ];
  const deptRows = deptSpecs.map((d) => {
    const rows = periodTx.filter((t) => d.ids.includes(t.product));
    const rev = rows.reduce((s, r) => s + r.revenue, 0);
    const cogs = rows.reduce((s, r) => s + r.cogs, 0);
    const gp = rows.reduce((s, r) => s + r.gp, 0);
    const invVal = d.ids.reduce((s, id) => s + (invMap.get(id)?.value ?? 0), 0);
    const arShare = totalPeriodRev > 0 ? totalArM * (rev / totalPeriodRev) : 0;
    const totalAssets = invVal + arShare + d.fixed;
    const annualCogs = cogs * 12;
    const annualOpProfit = (gp - d.opex) * 12;
    const turnover = invVal > 0 ? annualCogs / invVal : 0;
    const roa = totalAssets > 0 ? (100 * annualOpProfit) / totalAssets : 0;
    return {
      'القسم التشغيلي': d.name,
      'الأصول التشغيلية (م.د)': round2(totalAssets),
      'قيمة المخزون (م.د)': round2(invVal),
      'التكلفة السنوية COGS (م.د)': round2(annualCogs),
      'معدل دوران المخزون (مرة/سنة)': round2(turnover),
      'أيام بقاء المخزون (DIO)': turnover > 0 ? Math.round(365 / turnover) : 0,
      'العائد على الأصول ROA (%)': round2(roa),
    };
  });
  XLSX.utils.book_append_sheet(wb, createRtlSheet(deptRows), 'كفاءة الأصول');

  // Sheet 6: Decisions if present
  if (payload.decisions.length > 0) {
    const decRows = payload.decisions.map((d) => ({
      المعرف: d.id,
      القرار: d.title,
      الإجراء: d.action,
      الفترة: d.period,
      الحالة: d.status,
      'خط الأساس (م.د)': d.baselineValue ?? 0,
    }));
    XLSX.utils.book_append_sheet(wb, createRtlSheet(decRows), 'سجل القرارات');
  }

  const filename = `OwnerAI_Cockpit_${payload.period}.xlsx`;
  XLSX.writeFile(wb, filename);
  return filename;
}

export interface ReviewExportPayload {
  period: string;
  periodLabel: string;
  filters: {
    sector: string;
    cat: string;
    city: string;
    product: string;
  };
  actual: SumTotals;
  plan: SumTotals;
  regionData: Array<{
    region: string;
    revenue: number;
    cogs: number;
    gp: number;
    margin: number;
    quantity: number;
  }>;
  productsSummary: Array<{
    key: string;
    name: string;
    revenue: number;
    cogs: number;
    gp: number;
    margin: number;
    qty: number;
  }>;
  cases: CaseItem[];
}

export function exportReviewToExcel(payload: ReviewExportPayload): string {
  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };

  const margin = payload.actual.revenue ? (100 * payload.actual.gp) / payload.actual.revenue : 0;
  const planMargin = payload.plan.revenue ? (100 * payload.plan.gp) / payload.plan.revenue : 0;

  const summaryRows = [
    { البند: 'الشركة', القيمة: OWNER_DATA.meta.company, التفاصيل: '—' },
    { البند: 'اللوحة المصدّرة', القيمة: 'المراجعة التنفيذية (مراجعتي)', التفاصيل: '—' },
    { البند: 'الفترة المالية', القيمة: payload.periodLabel, التفاصيل: payload.period },
    {
      البند: 'نطاق التصفية المطبق',
      القيمة: `${payload.filters.sector} · ${payload.filters.cat} · ${payload.filters.city}`,
      التفاصيل: payload.filters.product,
    },
    { البند: 'تاريخ التصدير', القيمة: new Date().toISOString().slice(0, 10), التفاصيل: '—' },
    { البند: 'صافي المبيعات الفعلي (م.د)', القيمة: round2(payload.actual.revenue), التفاصيل: `الخطة: ${round2(payload.plan.revenue)}` },
    { البند: 'الربح الإجمالي الفعلي (م.د)', القيمة: round2(payload.actual.gp), التفاصيل: `الخطة: ${round2(payload.plan.gp)}` },
    { البند: 'نسبة الهامش الإجمالي (%)', القيمة: round2(margin), التفاصيل: `المخطط: ${round2(planMargin)}%` },
    { البند: 'الكمية المباعة', القيمة: payload.actual.qty, التفاصيل: 'وحدة' },
  ];
  XLSX.utils.book_append_sheet(wb, createRtlSheet(summaryRows), 'ملخص المراجعة');

  const regionRows = payload.regionData.map((r) => ({
    المنطقة: r.region,
    'المبيعات (م.د)': round2(r.revenue),
    'التكلفة (م.د)': round2(r.cogs),
    'الربح الإجمالي (م.د)': round2(r.gp),
    'الهامش (%)': round2(r.margin),
    الكمية: r.quantity,
  }));
  XLSX.utils.book_append_sheet(wb, createRtlSheet(regionRows), 'أداء المناطق');

  const prodRows = [...payload.productsSummary]
    .sort((x, y) => y.gp - x.gp)
    .map((p) => ({
      'رمز الصنف': p.key,
      'اسم الصنف': p.name,
      الكمية: p.qty,
      'المبيعات (م.د)': round2(p.revenue),
      'التكلفة (م.د)': round2(p.cogs),
      'الربح الإجمالي (م.د)': round2(p.gp),
      'الهامش (%)': round2(p.margin),
    }));
  XLSX.utils.book_append_sheet(wb, createRtlSheet(prodRows), 'أداء الأصناف');

  const caseRows = payload.cases.map((c) => ({
    المعرف: c.id,
    القضية: c.title,
    النوع: c.type === 'profit' ? 'ربحية' : 'رأس مال عامل',
    الحالة: c.status,
    مغلقة: c.closed ? 'نعم' : 'لا',
    'آخر ملاحظة': c.history[0]?.note ?? '',
  }));
  XLSX.utils.book_append_sheet(wb, createRtlSheet(caseRows), 'القضايا المفتوحة');

  const filename = `OwnerAI_Review_${payload.period}.xlsx`;
  XLSX.writeFile(wb, filename);
  return filename;
}
