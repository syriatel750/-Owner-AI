export interface MetaInfo {
  company: string;
  sector: string;
  today: string;
  eyebrow: string;
  dataTag: string;
  sourceWarning: string;
  erpImportCount: number;
  srcTag: string;
  sideNote: string;
  coverage: string;
  footnote: string;
  setupNote: string;
  skippedRows: number;
  demo: boolean;
}

export interface MonthInfo {
  id: string;
  label: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  cat: string;
  brand: string;
  price: number;
  cost: number;
  discount: number;
}

export interface TransactionRow {
  period: string;
  region: string;
  product: string;
  cat: string;
  brand: string;
  quantity: number;
  revenue: number;
  cogs: number;
  gp: number;
  price: number;
  cost: number;
  discount: number;
}

export interface PlanRow {
  period: string;
  region: string;
  product: string;
  cat: string;
  brand: string;
  quantity: number;
  revenue: number;
  cogs: number;
  gp: number;
}

export interface ArRow {
  region: string;
  current: number;
  overdue: number;
}

export interface InventoryRow {
  product: string;
  category: string;
  value: number;
  slow: number;
}

export interface CommercialBridgePeriod {
  engineVersion: string;
  period: string;
  previousPeriod: string | null;
  status: string;
  unit: string;
  waterfall: {
    grossSales: number;
    discounts: number;
    netRevenue: number;
    cogs: number;
    grossProfit: number;
    grossMarginPct: number;
  };
  salesRows: number;
  comparison: {
    baselineGrossProfit: number;
    currentGrossProfit: number;
    change: number;
    factors: {
      volume: number;
      price: number;
      discount: number;
      unitCost: number;
      newItems: number;
      removedItems: number;
    };
    reconciliationResidual: number;
    matchedRegionProductPairs: number;
    newRegionProductPairs: number;
    removedRegionProductPairs: number;
    method: string;
    evidenceStatus: string;
  } | null;
  source: string;
  limitations: string[];
}

export interface CaseHistoryItem {
  date: string;
  note: string;
}

export interface CaseItem {
  id: string;
  title: string;
  desc: string;
  type: 'profit' | 'capital';
  status: string;
  closed: boolean;
  history: CaseHistoryItem[];
}

export interface DiagnosticProduct {
  productId: string;
  productName: string;
  category: string;
  salesRows: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  discountValue: number;
  quantity: number;
  regions: string[];
  grossMarginPct: number | null;
  evidence: { source: string; period: string; rowCount: number; unit: string };
}

export interface ContributionProduct {
  productId: string;
  productName: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMarginPct: number;
  variableServiceCosts: number;
  contribution: number;
  contributionMarginPct: number;
  serviceCoverage: string;
  sourceRows: number;
  matchedRows: number;
  missingRows: number;
  regions: string[];
}

export interface SavedScenario {
  id: string;
  name: string;
  scope: { period: string; region: string; cat: string; product: string };
  price: number;
  demand: number;
  cost: number;
  discountPoints: number;
  baseGp: number;
  nextGp: number;
  delta: number;
  baseRev: number;
  nextRev: number;
  createdAt: string;
}

export interface DecisionRecord {
  id: string;
  recommendationKey: string;
  title: string;
  action: string;
  period: string;
  status: 'proposed' | 'under_review' | 'trial_authorized' | 'rejected' | 'completed';
  version: number;
  baselineValue: number | null;
  baselineSource: 'manual' | 'verified_source';
  outcomes: Array<{
    observedPeriod: string;
    observedValue: number;
    observedChange: number;
    externalFactors: string;
    evidenceNote: string;
    recordedAt: string;
  }>;
  history: Array<{ date: string; note: string }>;
}

export interface ChannelSaleRow {
  period: string;
  channel: string;
  net_revenue_miqd: number;
  cogs_miqd: number;
  quantity: number;
}

export interface SupplierPurchaseRow {
  period: string;
  supplier: string;
  purchase_miqd: number;
  on_time_pct: number;
  defect_pct: number;
  cost_variance_pct?: number;
}

export const OWNER_DATA = {
  meta: {
    company: 'مجموعة روافد العراق',
    sector: 'التوزيع · الاستيراد · التعبئة',
    today: '2026-11-18',
    eyebrow: 'المراجعة التنفيذية · أكتوبر 2026',
    dataTag: 'بيانات اصطناعية · أكتوبر 2026',
    sourceWarning: 'بيانات اصطناعية للتجربة والاختبار فقط؛ لا تمثل سجلات ERP فعلية.',
    erpImportCount: 0,
    srcTag: 'نموذج محلي تفاعلي',
    sideNote: 'نموذج تفاعلي — بيانات اصطناعية',
    coverage: 'سجلات المبيعات المحمّلة: 108',
    footnote: 'الأهداف والبيانات هنا اصطناعية للتجربة.',
    setupNote: 'قيم وأهداف التجربة ليست مستخرجة من ERP فعلي، وتستخدم لتوضيح منطق المراجعة الاقتصادية.',
    skippedRows: 0,
    demo: true,
  } as MetaInfo,
  regions: ['بغداد', 'البصرة', 'أربيل', 'الموصل'],
  months: [
    { id: '2026-08', label: 'أغسطس 2026', name: 'أغسطس' },
    { id: '2026-09', label: 'سبتمبر 2026', name: 'سبتمبر' },
    { id: '2026-10', label: 'أكتوبر 2026', name: 'أكتوبر' },
  ] as MonthInfo[],
  latestPeriod: '2026-10',
  prevPeriod: '2026-09',
  products: [
    { id: 'P01', name: 'أرز الواحة 5 كغ', cat: 'الأغذية الجافة', brand: 'مستورد', price: 19.998, cost: 15.939, discount: 0.039330881369533235 },
    { id: 'P02', name: 'معجون طماطم الأصيل', cat: 'المعلبات', brand: 'مستورد', price: 13.938, cost: 11.0745, discount: 0.04967791411042945 },
    { id: 'P03', name: 'زيت دوار الشمس 1 لتر', cat: 'الأغذية الجافة', brand: 'مستورد', price: 18.109, cost: 17.4105, discount: 0.09667919010123735 },
    { id: 'P04', name: 'بسكويت روابي', cat: 'الأغذية الجافة', brand: 'مستورد', price: 11.615, cost: 7.866, discount: 0.06468270332187857 },
    { id: 'P05', name: 'دجاج مجمد 1 كغ', cat: 'المجمدات', brand: 'مستورد', price: 22.624, cost: 21.1335, discount: 0.03933880597014925 },
    { id: 'P06', name: 'منظفات نهرين', cat: 'غير غذائية', brand: 'مستورد', price: 14.746, cost: 9.8325, discount: 0.044337590227651304 },
    { id: 'P07', name: 'عدس روافد 1 كغ', cat: 'الأغذية الجافة', brand: 'علامة خاصة', price: 9.494, cost: 6.1065, discount: 0.0293325457767277 },
    { id: 'P08', name: 'سكر روافد 1 كغ', cat: 'الأغذية الجافة', brand: 'علامة خاصة', price: 8.282, cost: 5.796, discount: 0.029773573200992557 },
    { id: 'P09', name: 'أسماك مجمدة اقتصادي', cat: 'المجمدات', brand: 'مستورد', price: 15.352, cost: 16.6635, discount: 0.049676438255771345 },
  ] as Product[],
  transactions: [
    { period: '2026-08', region: 'أربيل', product: 'P01', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1353, revenue: 25.8518, cogs: 20.8362, gp: 5.0156, price: 19.8, cost: 15.4, discount: 0.035 },
    { period: '2026-08', region: 'أربيل', product: 'P02', cat: 'المعلبات', brand: 'مستورد', quantity: 1146, revenue: 15.1031, cogs: 12.2622, gp: 2.8409, price: 13.8, cost: 10.7, discount: 0.045 },
    { period: '2026-08', region: 'أربيل', product: 'P03', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1737, revenue: 29.4005, cogs: 27.6183, gp: 1.7822, price: 18.2, cost: 15.9, discount: 0.07 },
    { period: '2026-08', region: 'أربيل', product: 'P04', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1537, revenue: 16.615, cogs: 11.6812, gp: 4.9338, price: 11.5, cost: 7.6, discount: 0.06 },
    { period: '2026-08', region: 'أربيل', product: 'P05', cat: 'المجمدات', brand: 'مستورد', quantity: 1457, revenue: 31.4945, cogs: 28.1201, gp: 3.3744, price: 22.4, cost: 19.3, discount: 0.035 },
    { period: '2026-08', region: 'أربيل', product: 'P06', cat: 'غير غذائية', brand: 'مستورد', quantity: 979, revenue: 13.7217, cogs: 9.3005, gp: 4.4212, price: 14.6, cost: 9.5, discount: 0.04 },
    { period: '2026-08', region: 'أربيل', product: 'P07', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 1226, revenue: 11.2363, cogs: 7.2334, gp: 4.0029, price: 9.4, cost: 5.9, discount: 0.025 },
    { period: '2026-08', region: 'أربيل', product: 'P08', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 1693, revenue: 13.5355, cogs: 9.4808, gp: 4.0547, price: 8.2, cost: 5.6, discount: 0.025 },
    { period: '2026-08', region: 'أربيل', product: 'P09', cat: 'المجمدات', brand: 'مستورد', quantity: 533, revenue: 7.737, cogs: 8.5813, gp: -0.8443, price: 15.2, cost: 16.1, discount: 0.045 },
    { period: '2026-08', region: 'البصرة', product: 'P01', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1720, revenue: 32.864, cogs: 26.488, gp: 6.376, price: 19.8, cost: 15.4, discount: 0.035 },
    { period: '2026-08', region: 'البصرة', product: 'P02', cat: 'المعلبات', brand: 'مستورد', quantity: 1279, revenue: 16.8559, cogs: 13.6853, gp: 3.1706, price: 13.8, cost: 10.7, discount: 0.045 },
    { period: '2026-08', region: 'البصرة', product: 'P03', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1937, revenue: 32.7857, cogs: 30.7983, gp: 1.9874, price: 18.2, cost: 15.9, discount: 0.07 },
    { period: '2026-08', region: 'البصرة', product: 'P04', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1711, revenue: 18.4959, cogs: 13.0036, gp: 5.4923, price: 11.5, cost: 7.6, discount: 0.06 },
    { period: '2026-08', region: 'البصرة', product: 'P05', cat: 'المجمدات', brand: 'مستورد', quantity: 1847, revenue: 39.9248, cogs: 35.6471, gp: 4.2777, price: 22.4, cost: 19.3, discount: 0.035 },
    { period: '2026-08', region: 'البصرة', product: 'P06', cat: 'غير غذائية', brand: 'مستورد', quantity: 1242, revenue: 17.4079, cogs: 11.799, gp: 5.6089, price: 14.6, cost: 9.5, discount: 0.04 },
    { period: '2026-08', region: 'البصرة', product: 'P07', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 1558, revenue: 14.2791, cogs: 9.1922, gp: 5.0869, price: 9.4, cost: 5.9, discount: 0.025 },
    { period: '2026-08', region: 'البصرة', product: 'P08', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 2154, revenue: 17.2212, cogs: 12.0624, gp: 5.1588, price: 8.2, cost: 5.6, discount: 0.025 },
    { period: '2026-08', region: 'البصرة', product: 'P09', cat: 'المجمدات', brand: 'مستورد', quantity: 595, revenue: 8.637, cogs: 9.5795, gp: -0.9425, price: 15.2, cost: 16.1, discount: 0.045 },
    { period: '2026-08', region: 'الموصل', product: 'P01', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1137, revenue: 21.7247, cogs: 17.5098, gp: 4.2149, price: 19.8, cost: 15.4, discount: 0.035 },
    { period: '2026-08', region: 'الموصل', product: 'P02', cat: 'المعلبات', brand: 'مستورد', quantity: 846, revenue: 11.1494, cogs: 9.0522, gp: 2.0972, price: 13.8, cost: 10.7, discount: 0.045 },
    { period: '2026-08', region: 'الموصل', product: 'P03', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1281, revenue: 21.6822, cogs: 20.3679, gp: 1.3143, price: 18.2, cost: 15.9, discount: 0.07 },
    { period: '2026-08', region: 'الموصل', product: 'P04', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1132, revenue: 12.2369, cogs: 8.6032, gp: 3.6337, price: 11.5, cost: 7.6, discount: 0.06 },
    { period: '2026-08', region: 'الموصل', product: 'P05', cat: 'المجمدات', brand: 'مستورد', quantity: 1072, revenue: 23.1724, cogs: 20.6896, gp: 2.4828, price: 22.4, cost: 19.3, discount: 0.035 },
    { period: '2026-08', region: 'الموصل', product: 'P06', cat: 'غير غذائية', brand: 'مستورد', quantity: 821, revenue: 11.5071, cogs: 7.7995, gp: 3.7076, price: 14.6, cost: 9.5, discount: 0.04 },
    { period: '2026-08', region: 'الموصل', product: 'P07', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 1030, revenue: 9.44, cogs: 6.077, gp: 3.363, price: 9.4, cost: 5.9, discount: 0.025 },
    { period: '2026-08', region: 'الموصل', product: 'P08', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 1424, revenue: 11.3849, cogs: 7.9744, gp: 3.4105, price: 8.2, cost: 5.6, discount: 0.025 },
    { period: '2026-08', region: 'الموصل', product: 'P09', cat: 'المجمدات', brand: 'مستورد', quantity: 393, revenue: 5.7048, cogs: 6.3273, gp: -0.6225, price: 15.2, cost: 16.1, discount: 0.045 },
    { period: '2026-08', region: 'بغداد', product: 'P01', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 2402, revenue: 45.895, cogs: 36.9908, gp: 8.9042, price: 19.8, cost: 15.4, discount: 0.035 },
    { period: '2026-08', region: 'بغداد', product: 'P02', cat: 'المعلبات', brand: 'مستورد', quantity: 2035, revenue: 26.8193, cogs: 21.7745, gp: 5.0448, price: 13.8, cost: 10.7, discount: 0.045 },
    { period: '2026-08', region: 'بغداد', product: 'P03', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 3086, revenue: 52.2336, cogs: 49.0674, gp: 3.1662, price: 18.2, cost: 15.9, discount: 0.07 },
    { period: '2026-08', region: 'بغداد', product: 'P04', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 2729, revenue: 29.5005, cogs: 20.7404, gp: 8.7601, price: 11.5, cost: 7.6, discount: 0.06 },
    { period: '2026-08', region: 'بغداد', product: 'P05', cat: 'المجمدات', brand: 'مستورد', quantity: 2588, revenue: 55.9422, cogs: 49.9484, gp: 5.9938, price: 22.4, cost: 19.3, discount: 0.035 },
    { period: '2026-08', region: 'بغداد', product: 'P06', cat: 'غير غذائية', brand: 'مستورد', quantity: 1738, revenue: 24.3598, cogs: 16.511, gp: 7.8488, price: 14.6, cost: 9.5, discount: 0.04 },
    { period: '2026-08', region: 'بغداد', product: 'P07', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 2176, revenue: 19.943, cogs: 12.8384, gp: 7.1046, price: 9.4, cost: 5.9, discount: 0.025 },
    { period: '2026-08', region: 'بغداد', product: 'P08', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 3425, revenue: 27.3829, cogs: 19.18, gp: 8.2029, price: 8.2, cost: 5.6, discount: 0.025 },
    { period: '2026-08', region: 'بغداد', product: 'P09', cat: 'المجمدات', brand: 'مستورد', quantity: 947, revenue: 13.7467, cogs: 15.2467, gp: -1.5, price: 15.2, cost: 16.1, discount: 0.045 },
    { period: '2026-09', region: 'أربيل', product: 'P01', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1506, revenue: 28.919, cogs: 23.7026, gp: 5.2164, price: 19.899, cost: 15.7388, discount: 0.035 },
    { period: '2026-09', region: 'أربيل', product: 'P02', cat: 'المعلبات', brand: 'مستورد', quantity: 1119, revenue: 14.821, cogs: 12.2367, gp: 2.5843, price: 13.869, cost: 10.9354, discount: 0.045 },
    { period: '2026-09', region: 'أربيل', product: 'P03', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1694, revenue: 28.816, cogs: 27.5272, gp: 1.2888, price: 18.291, cost: 16.2498, discount: 0.07 },
    { period: '2026-09', region: 'أربيل', product: 'P04', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1706, revenue: 18.5341, cogs: 13.2508, gp: 5.2832, price: 11.5575, cost: 7.7672, discount: 0.06 },
    { period: '2026-09', region: 'أربيل', product: 'P05', cat: 'المجمدات', brand: 'مستورد', quantity: 1619, revenue: 35.1713, cogs: 31.9341, gp: 3.2372, price: 22.512, cost: 19.7246, discount: 0.035 },
    { period: '2026-09', region: 'أربيل', product: 'P06', cat: 'غير غذائية', brand: 'مستورد', quantity: 1088, revenue: 15.3257, cogs: 10.5634, gp: 4.7623, price: 14.673, cost: 9.709, discount: 0.04 },
    { period: '2026-09', region: 'أربيل', product: 'P07', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 1364, revenue: 12.5636, cogs: 8.2246, gp: 4.3389, price: 9.447, cost: 6.0298, discount: 0.025 },
    { period: '2026-09', region: 'أربيل', product: 'P08', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 1885, revenue: 15.1459, cogs: 10.7882, gp: 4.3577, price: 8.241, cost: 5.7232, discount: 0.025 },
    { period: '2026-09', region: 'أربيل', product: 'P09', cat: 'المجمدات', brand: 'مستورد', quantity: 520, revenue: 7.5861, cogs: 8.5562, gp: -0.9701, price: 15.276, cost: 16.4542, discount: 0.045 },
    { period: '2026-09', region: 'البصرة', product: 'P01', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1911, revenue: 36.696, cogs: 30.0768, gp: 6.6192, price: 19.899, cost: 15.7388, discount: 0.035 },
    { period: '2026-09', region: 'البصرة', product: 'P02', cat: 'المعلبات', brand: 'مستورد', quantity: 1422, revenue: 18.8342, cogs: 15.5501, gp: 3.2841, price: 13.869, cost: 10.9354, discount: 0.045 },
    { period: '2026-09', region: 'البصرة', product: 'P03', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 2154, revenue: 36.6409, cogs: 35.0021, gp: 1.6388, price: 18.291, cost: 16.2498, discount: 0.07 },
    { period: '2026-09', region: 'البصرة', product: 'P04', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1904, revenue: 20.6852, cogs: 14.7887, gp: 5.8964, price: 11.5575, cost: 7.7672, discount: 0.06 },
    { period: '2026-09', region: 'البصرة', product: 'P05', cat: 'المجمدات', brand: 'مستورد', quantity: 1804, revenue: 39.1902, cogs: 35.5832, gp: 3.6071, price: 22.512, cost: 19.7246, discount: 0.035 },
    { period: '2026-09', region: 'البصرة', product: 'P06', cat: 'غير غذائية', brand: 'مستورد', quantity: 1211, revenue: 17.0582, cogs: 11.7576, gp: 5.3006, price: 14.673, cost: 9.709, discount: 0.04 },
    { period: '2026-09', region: 'البصرة', product: 'P07', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 1730, revenue: 15.9347, cogs: 10.4316, gp: 5.5032, price: 9.447, cost: 6.0298, discount: 0.025 },
    { period: '2026-09', region: 'البصرة', product: 'P08', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 2393, revenue: 19.2277, cogs: 13.6956, gp: 5.5321, price: 8.241, cost: 5.7232, discount: 0.025 },
    { period: '2026-09', region: 'البصرة', product: 'P09', cat: 'المجمدات', brand: 'مستورد', quantity: 661, revenue: 9.6431, cogs: 10.8762, gp: -1.2332, price: 15.276, cost: 16.4542, discount: 0.045 },
    { period: '2026-09', region: 'الموصل', product: 'P01', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1263, revenue: 24.2528, cogs: 19.8781, gp: 4.3747, price: 19.899, cost: 15.7388, discount: 0.035 },
    { period: '2026-09', region: 'الموصل', product: 'P02', cat: 'المعلبات', brand: 'مستورد', quantity: 940, revenue: 12.4502, cogs: 10.2793, gp: 2.1709, price: 13.869, cost: 10.9354, discount: 0.045 },
    { period: '2026-09', region: 'الموصل', product: 'P03', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1424, revenue: 24.2231, cogs: 23.1397, gp: 1.0834, price: 18.291, cost: 16.2498, discount: 0.07 },
    { period: '2026-09', region: 'الموصل', product: 'P04', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1259, revenue: 13.6778, cogs: 9.7789, gp: 3.8989, price: 11.5575, cost: 7.7672, discount: 0.06 },
    { period: '2026-09', region: 'الموصل', product: 'P05', cat: 'المجمدات', brand: 'مستورد', quantity: 1193, revenue: 25.9168, cogs: 23.5314, gp: 2.3854, price: 22.512, cost: 19.7246, discount: 0.035 },
    { period: '2026-09', region: 'الموصل', product: 'P06', cat: 'غير غذائية', brand: 'مستورد', quantity: 801, revenue: 11.283, cogs: 7.7769, gp: 3.506, price: 14.673, cost: 9.709, discount: 0.04 },
    { period: '2026-09', region: 'الموصل', product: 'P07', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 1143, revenue: 10.528, cogs: 6.8921, gp: 3.6359, price: 9.447, cost: 6.0298, discount: 0.025 },
    { period: '2026-09', region: 'الموصل', product: 'P08', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 1581, revenue: 12.7033, cogs: 9.0484, gp: 3.6549, price: 8.241, cost: 5.7232, discount: 0.025 },
    { period: '2026-09', region: 'الموصل', product: 'P09', cat: 'المجمدات', brand: 'مستورد', quantity: 437, revenue: 6.3752, cogs: 7.1905, gp: -0.8153, price: 15.276, cost: 16.4542, discount: 0.045 },
    { period: '2026-09', region: 'بغداد', product: 'P01', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 2673, revenue: 51.3284, cogs: 42.0698, gp: 9.2586, price: 19.899, cost: 15.7388, discount: 0.035 },
    { period: '2026-09', region: 'بغداد', product: 'P02', cat: 'المعلبات', brand: 'مستورد', quantity: 1986, revenue: 26.3044, cogs: 21.7177, gp: 4.5867, price: 13.869, cost: 10.9354, discount: 0.045 },
    { period: '2026-09', region: 'بغداد', product: 'P03', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 3425, revenue: 58.2614, cogs: 55.6556, gp: 2.6058, price: 18.291, cost: 16.2498, discount: 0.07 },
    { period: '2026-09', region: 'بغداد', product: 'P04', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 3031, revenue: 32.9289, cogs: 23.5424, gp: 9.3866, price: 11.5575, cost: 7.7672, discount: 0.06 },
    { period: '2026-09', region: 'بغداد', product: 'P05', cat: 'المجمدات', brand: 'مستورد', quantity: 2876, revenue: 62.4785, cogs: 56.7279, gp: 5.7505, price: 22.512, cost: 19.7246, discount: 0.035 },
    { period: '2026-09', region: 'بغداد', product: 'P06', cat: 'غير غذائية', brand: 'مستورد', quantity: 1932, revenue: 27.2143, cogs: 18.7578, gp: 8.4565, price: 14.673, cost: 9.709, discount: 0.04 },
    { period: '2026-09', region: 'بغداد', product: 'P07', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 2422, revenue: 22.3086, cogs: 14.6042, gp: 7.7044, price: 9.447, cost: 6.0298, discount: 0.025 },
    { period: '2026-09', region: 'بغداد', product: 'P08', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 3345, revenue: 26.877, cogs: 19.1441, gp: 7.7329, price: 8.241, cost: 5.7232, discount: 0.025 },
    { period: '2026-09', region: 'بغداد', product: 'P09', cat: 'المجمدات', brand: 'مستورد', quantity: 923, revenue: 13.4653, cogs: 15.1872, gp: -1.722, price: 15.276, cost: 16.4542, discount: 0.045 },
    { period: '2026-10', region: 'أربيل', product: 'P01', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1617, revenue: 31.205, cogs: 25.7734, gp: 5.4316, price: 19.998, cost: 15.939, discount: 0.035 },
    { period: '2026-10', region: 'أربيل', product: 'P02', cat: 'المعلبات', brand: 'مستورد', quantity: 1202, revenue: 15.9996, cogs: 13.3115, gp: 2.688, price: 13.938, cost: 11.0745, discount: 0.045 },
    { period: '2026-10', region: 'أربيل', product: 'P03', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1820, revenue: 29.9262, cogs: 31.6871, gp: -1.7609, price: 18.109, cost: 17.4105, discount: 0.092 },
    { period: '2026-10', region: 'أربيل', product: 'P04', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1608, revenue: 17.5563, cogs: 12.6485, gp: 4.9078, price: 11.615, cost: 7.866, discount: 0.06 },
    { period: '2026-10', region: 'أربيل', product: 'P05', cat: 'المجمدات', brand: 'مستورد', quantity: 1736, revenue: 37.9006, cogs: 36.6878, gp: 1.2129, price: 22.624, cost: 21.1335, discount: 0.035 },
    { period: '2026-10', region: 'أربيل', product: 'P06', cat: 'غير غذائية', brand: 'مستورد', quantity: 1167, revenue: 16.5202, cogs: 11.4745, gp: 5.0457, price: 14.746, cost: 9.8325, discount: 0.04 },
    { period: '2026-10', region: 'أربيل', product: 'P07', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 1464, revenue: 13.5517, cogs: 8.9399, gp: 4.6118, price: 9.494, cost: 6.1065, discount: 0.025 },
    { period: '2026-10', region: 'أربيل', product: 'P08', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 2024, revenue: 16.3437, cogs: 11.7311, gp: 4.6126, price: 8.282, cost: 5.796, discount: 0.025 },
    { period: '2026-10', region: 'أربيل', product: 'P09', cat: 'المجمدات', brand: 'مستورد', quantity: 559, revenue: 8.1956, cogs: 9.3149, gp: -1.1193, price: 15.352, cost: 16.6635, discount: 0.045 },
    { period: '2026-10', region: 'البصرة', product: 'P01', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1799, revenue: 34.0697, cogs: 28.6743, gp: 5.3954, price: 19.998, cost: 15.939, discount: 0.053 },
    { period: '2026-10', region: 'البصرة', product: 'P02', cat: 'المعلبات', brand: 'مستورد', quantity: 1525, revenue: 19.9164, cogs: 16.8886, gp: 3.0277, price: 13.938, cost: 11.0745, discount: 0.063 },
    { period: '2026-10', region: 'البصرة', product: 'P03', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 2311, revenue: 37.2464, cogs: 40.2357, gp: -2.9893, price: 18.109, cost: 17.4105, discount: 0.11 },
    { period: '2026-10', region: 'البصرة', product: 'P04', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 2044, revenue: 21.8893, cogs: 16.0781, gp: 5.8112, price: 11.615, cost: 7.866, discount: 0.078 },
    { period: '2026-10', region: 'البصرة', product: 'P05', cat: 'المجمدات', brand: 'مستورد', quantity: 1938, revenue: 41.5215, cogs: 40.9567, gp: 0.5648, price: 22.624, cost: 21.1335, discount: 0.053 },
    { period: '2026-10', region: 'البصرة', product: 'P06', cat: 'غير غذائية', brand: 'مستورد', quantity: 1302, revenue: 18.0857, cogs: 12.8019, gp: 5.2838, price: 14.746, cost: 9.8325, discount: 0.058 },
    { period: '2026-10', region: 'البصرة', product: 'P07', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 1630, revenue: 14.8098, cogs: 9.9536, gp: 4.8562, price: 9.494, cost: 6.1065, discount: 0.043 },
    { period: '2026-10', region: 'البصرة', product: 'P08', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 2565, revenue: 20.3299, cogs: 14.8667, gp: 5.4631, price: 8.282, cost: 5.796, discount: 0.043 },
    { period: '2026-10', region: 'البصرة', product: 'P09', cat: 'المجمدات', brand: 'مستورد', quantity: 709, revenue: 10.1988, cogs: 11.8144, gp: -1.6156, price: 15.352, cost: 16.6635, discount: 0.063 },
    { period: '2026-10', region: 'الموصل', product: 'P01', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1190, revenue: 22.9647, cogs: 18.9674, gp: 3.9973, price: 19.998, cost: 15.939, discount: 0.035 },
    { period: '2026-10', region: 'الموصل', product: 'P02', cat: 'المعلبات', brand: 'مستورد', quantity: 1007, revenue: 13.404, cogs: 11.152, gp: 2.2519, price: 13.938, cost: 11.0745, discount: 0.045 },
    { period: '2026-10', region: 'الموصل', product: 'P03', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1528, revenue: 25.1249, cogs: 26.6032, gp: -1.4784, price: 18.109, cost: 17.4105, discount: 0.092 },
    { period: '2026-10', region: 'الموصل', product: 'P04', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1351, revenue: 14.7504, cogs: 10.627, gp: 4.1234, price: 11.615, cost: 7.866, discount: 0.06 },
    { period: '2026-10', region: 'الموصل', product: 'P05', cat: 'المجمدات', brand: 'مستورد', quantity: 1282, revenue: 27.9888, cogs: 27.0931, gp: 0.8957, price: 22.624, cost: 21.1335, discount: 0.035 },
    { period: '2026-10', region: 'الموصل', product: 'P06', cat: 'غير غذائية', brand: 'مستورد', quantity: 861, revenue: 12.1885, cogs: 8.4658, gp: 3.7227, price: 14.746, cost: 9.8325, discount: 0.04 },
    { period: '2026-10', region: 'الموصل', product: 'P07', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 1078, revenue: 9.9787, cogs: 6.5828, gp: 3.3959, price: 9.494, cost: 6.1065, discount: 0.025 },
    { period: '2026-10', region: 'الموصل', product: 'P08', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 1489, revenue: 12.0236, cogs: 8.6302, gp: 3.3934, price: 8.282, cost: 5.796, discount: 0.025 },
    { period: '2026-10', region: 'الموصل', product: 'P09', cat: 'المجمدات', brand: 'مستورد', quantity: 469, revenue: 6.8761, cogs: 7.8152, gp: -0.9391, price: 15.352, cost: 16.6635, discount: 0.045 },
    { period: '2026-10', region: 'بغداد', product: 'P01', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 2871, revenue: 55.4048, cogs: 45.7609, gp: 9.6439, price: 19.998, cost: 15.939, discount: 0.035 },
    { period: '2026-10', region: 'بغداد', product: 'P02', cat: 'المعلبات', brand: 'مستورد', quantity: 2134, revenue: 28.4052, cogs: 23.633, gp: 4.7722, price: 13.938, cost: 11.0745, discount: 0.045 },
    { period: '2026-10', region: 'بغداد', product: 'P03', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 3231, revenue: 53.1272, cogs: 56.2533, gp: -3.1261, price: 18.109, cost: 17.4105, discount: 0.092 },
    { period: '2026-10', region: 'بغداد', product: 'P04', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 2854, revenue: 31.1603, cogs: 22.4496, gp: 8.7107, price: 11.615, cost: 7.866, discount: 0.06 },
    { period: '2026-10', region: 'بغداد', product: 'P05', cat: 'المجمدات', brand: 'مستورد', quantity: 3084, revenue: 67.3304, cogs: 65.1757, gp: 2.1547, price: 22.624, cost: 21.1335, discount: 0.035 },
    { period: '2026-10', region: 'بغداد', product: 'P06', cat: 'غير غذائية', brand: 'مستورد', quantity: 2073, revenue: 29.3457, cogs: 20.3828, gp: 8.9629, price: 14.746, cost: 9.8325, discount: 0.04 },
    { period: '2026-10', region: 'بغداد', product: 'P07', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 2600, revenue: 24.0673, cogs: 15.8769, gp: 8.1904, price: 9.494, cost: 6.1065, discount: 0.025 },
    { period: '2026-10', region: 'بغداد', product: 'P08', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 3594, revenue: 29.0214, cogs: 20.8308, gp: 8.1905, price: 8.282, cost: 5.796, discount: 0.025 },
    { period: '2026-10', region: 'بغداد', product: 'P09', cat: 'المجمدات', brand: 'مستورد', quantity: 992, revenue: 14.5439, cogs: 16.5302, gp: -1.9863, price: 15.352, cost: 16.6635, discount: 0.045 },
  ] as TransactionRow[],
  planRows: [
    { period: '2026-08', region: 'أربيل', product: 'P01', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1473, revenue: 28.1446, cogs: 22.6842, gp: 5.4604 },
    { period: '2026-08', region: 'أربيل', product: 'P02', cat: 'المعلبات', brand: 'مستورد', quantity: 1117, revenue: 14.7209, cogs: 11.9519, gp: 2.769 },
    { period: '2026-08', region: 'أربيل', product: 'P03', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1727, revenue: 29.2312, cogs: 27.4593, gp: 1.7719 },
    { period: '2026-08', region: 'أربيل', product: 'P04', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1557, revenue: 16.8312, cogs: 11.8332, gp: 4.998 },
    { period: '2026-08', region: 'أربيل', product: 'P05', cat: 'المجمدات', brand: 'مستورد', quantity: 1507, revenue: 32.5753, cogs: 29.0851, gp: 3.4902 },
    { period: '2026-08', region: 'أربيل', product: 'P06', cat: 'غير غذائية', brand: 'مستورد', quantity: 1033, revenue: 14.4785, cogs: 9.8135, gp: 4.665 },
    { period: '2026-08', region: 'أربيل', product: 'P07', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 1367, revenue: 12.5286, cogs: 8.0653, gp: 4.4633 },
    { period: '2026-08', region: 'أربيل', product: 'P08', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 1927, revenue: 15.4064, cogs: 10.7912, gp: 4.6152 },
    { period: '2026-08', region: 'أربيل', product: 'P09', cat: 'المجمدات', brand: 'مستورد', quantity: 525, revenue: 7.6209, cogs: 8.4525, gp: -0.8316 },
    { period: '2026-08', region: 'البصرة', product: 'P01', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1761, revenue: 33.6474, cogs: 27.1194, gp: 6.528 },
    { period: '2026-08', region: 'البصرة', product: 'P02', cat: 'المعلبات', brand: 'مستورد', quantity: 1336, revenue: 17.6071, cogs: 14.2952, gp: 3.3119 },
    { period: '2026-08', region: 'البصرة', product: 'P03', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 2064, revenue: 34.9353, cogs: 32.8176, gp: 2.1177 },
    { period: '2026-08', region: 'البصرة', product: 'P04', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1862, revenue: 20.1282, cogs: 14.1512, gp: 5.977 },
    { period: '2026-08', region: 'البصرة', product: 'P05', cat: 'المجمدات', brand: 'مستورد', quantity: 1801, revenue: 38.9304, cogs: 34.7593, gp: 4.1711 },
    { period: '2026-08', region: 'البصرة', product: 'P06', cat: 'غير غذائية', brand: 'مستورد', quantity: 1235, revenue: 17.3098, cogs: 11.7325, gp: 5.5773 },
    { period: '2026-08', region: 'البصرة', product: 'P07', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 1634, revenue: 14.9756, cogs: 9.6406, gp: 5.335 },
    { period: '2026-08', region: 'البصرة', product: 'P08', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 2304, revenue: 18.4205, cogs: 12.9024, gp: 5.5181 },
    { period: '2026-08', region: 'البصرة', product: 'P09', cat: 'المجمدات', brand: 'مستورد', quantity: 627, revenue: 9.1015, cogs: 10.0947, gp: -0.9932 },
    { period: '2026-08', region: 'الموصل', product: 'P01', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1153, revenue: 22.0304, cogs: 17.7562, gp: 4.2742 },
    { period: '2026-08', region: 'الموصل', product: 'P02', cat: 'المعلبات', brand: 'مستورد', quantity: 874, revenue: 11.5184, cogs: 9.3518, gp: 2.1666 },
    { period: '2026-08', region: 'الموصل', product: 'P03', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1351, revenue: 22.867, cogs: 21.4809, gp: 1.3861 },
    { period: '2026-08', region: 'الموصل', product: 'P04', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1219, revenue: 13.1774, cogs: 9.2644, gp: 3.913 },
    { period: '2026-08', region: 'الموصل', product: 'P05', cat: 'المجمدات', brand: 'مستورد', quantity: 1179, revenue: 25.4853, cogs: 22.7547, gp: 2.7306 },
    { period: '2026-08', region: 'الموصل', product: 'P06', cat: 'غير غذائية', brand: 'مستورد', quantity: 808, revenue: 11.3249, cogs: 7.676, gp: 3.6489 },
    { period: '2026-08', region: 'الموصل', product: 'P07', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 1070, revenue: 9.8065, cogs: 6.313, gp: 3.4935 },
    { period: '2026-08', region: 'الموصل', product: 'P08', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 1508, revenue: 12.0565, cogs: 8.4448, gp: 3.6117 },
    { period: '2026-08', region: 'الموصل', product: 'P09', cat: 'المجمدات', brand: 'مستورد', quantity: 411, revenue: 5.9661, cogs: 6.6171, gp: -0.651 },
    { period: '2026-08', region: 'بغداد', product: 'P01', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 2641, revenue: 50.4616, cogs: 40.6714, gp: 9.7902 },
    { period: '2026-08', region: 'بغداد', product: 'P02', cat: 'المعلبات', brand: 'مستورد', quantity: 2004, revenue: 26.4107, cogs: 21.4428, gp: 4.9679 },
    { period: '2026-08', region: 'بغداد', product: 'P03', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 3097, revenue: 52.4198, cogs: 49.2423, gp: 3.1775 },
    { period: '2026-08', region: 'بغداد', product: 'P04', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 2793, revenue: 30.1923, cogs: 21.2268, gp: 8.9655 },
    { period: '2026-08', region: 'بغداد', product: 'P05', cat: 'المجمدات', brand: 'مستورد', quantity: 2702, revenue: 58.4064, cogs: 52.1486, gp: 6.2578 },
    { period: '2026-08', region: 'بغداد', product: 'P06', cat: 'غير غذائية', brand: 'مستورد', quantity: 1852, revenue: 25.9576, cogs: 17.594, gp: 8.3636 },
    { period: '2026-08', region: 'بغداد', product: 'P07', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 2451, revenue: 22.4634, cogs: 14.4609, gp: 8.0025 },
    { period: '2026-08', region: 'بغداد', product: 'P08', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 3456, revenue: 27.6307, cogs: 19.3536, gp: 8.2771 },
    { period: '2026-08', region: 'بغداد', product: 'P09', cat: 'المجمدات', brand: 'مستورد', quantity: 941, revenue: 13.6596, cogs: 15.1501, gp: -1.4905 },
    { period: '2026-09', region: 'أربيل', product: 'P01', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1601, revenue: 30.5903, cogs: 24.6554, gp: 5.9349 },
    { period: '2026-09', region: 'أربيل', product: 'P02', cat: 'المعلبات', brand: 'مستورد', quantity: 1214, revenue: 15.9993, cogs: 12.9898, gp: 3.0095 },
    { period: '2026-09', region: 'أربيل', product: 'P03', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1877, revenue: 31.7701, cogs: 29.8443, gp: 1.9258 },
    { period: '2026-09', region: 'أربيل', product: 'P04', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1693, revenue: 18.3013, cogs: 12.8668, gp: 5.4345 },
    { period: '2026-09', region: 'أربيل', product: 'P05', cat: 'المجمدات', brand: 'مستورد', quantity: 1638, revenue: 35.407, cogs: 31.6134, gp: 3.7936 },
    { period: '2026-09', region: 'أربيل', product: 'P06', cat: 'غير غذائية', brand: 'مستورد', quantity: 1122, revenue: 15.726, cogs: 10.659, gp: 5.067 },
    { period: '2026-09', region: 'أربيل', product: 'P07', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 1485, revenue: 13.61, cogs: 8.7615, gp: 4.8485 },
    { period: '2026-09', region: 'أربيل', product: 'P08', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 2095, revenue: 16.7495, cogs: 11.732, gp: 5.0175 },
    { period: '2026-09', region: 'أربيل', product: 'P09', cat: 'المجمدات', brand: 'مستورد', quantity: 570, revenue: 8.2741, cogs: 9.177, gp: -0.9029 },
    { period: '2026-09', region: 'البصرة', product: 'P01', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1914, revenue: 36.5708, cogs: 29.4756, gp: 7.0952 },
    { period: '2026-09', region: 'البصرة', product: 'P02', cat: 'المعلبات', brand: 'مستورد', quantity: 1452, revenue: 19.1359, cogs: 15.5364, gp: 3.5995 },
    { period: '2026-09', region: 'البصرة', product: 'P03', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 2244, revenue: 37.9819, cogs: 35.6796, gp: 2.3023 },
    { period: '2026-09', region: 'البصرة', product: 'P04', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 2024, revenue: 21.8794, cogs: 15.3824, gp: 6.497 },
    { period: '2026-09', region: 'البصرة', product: 'P05', cat: 'المجمدات', brand: 'مستورد', quantity: 1958, revenue: 42.3241, cogs: 37.7894, gp: 4.5347 },
    { period: '2026-09', region: 'البصرة', product: 'P06', cat: 'غير غذائية', brand: 'مستورد', quantity: 1342, revenue: 18.8095, cogs: 12.749, gp: 6.0605 },
    { period: '2026-09', region: 'البصرة', product: 'P07', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 1776, revenue: 16.277, cogs: 10.4784, gp: 5.7986 },
    { period: '2026-09', region: 'البصرة', product: 'P08', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 2505, revenue: 20.0275, cogs: 14.028, gp: 5.9995 },
    { period: '2026-09', region: 'البصرة', product: 'P09', cat: 'المجمدات', brand: 'مستورد', quantity: 682, revenue: 9.8999, cogs: 10.9802, gp: -1.0803 },
    { period: '2026-09', region: 'الموصل', product: 'P01', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1253, revenue: 23.9411, cogs: 19.2962, gp: 4.6449 },
    { period: '2026-09', region: 'الموصل', product: 'P02', cat: 'المعلبات', brand: 'مستورد', quantity: 950, revenue: 12.52, cogs: 10.165, gp: 2.355 },
    { period: '2026-09', region: 'الموصل', product: 'P03', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1469, revenue: 24.8643, cogs: 23.3571, gp: 1.5072 },
    { period: '2026-09', region: 'الموصل', product: 'P04', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1325, revenue: 14.3232, cogs: 10.07, gp: 4.2532 },
    { period: '2026-09', region: 'الموصل', product: 'P05', cat: 'المجمدات', brand: 'مستورد', quantity: 1282, revenue: 27.7117, cogs: 24.7426, gp: 2.9691 },
    { period: '2026-09', region: 'الموصل', product: 'P06', cat: 'غير غذائية', brand: 'مستورد', quantity: 878, revenue: 12.306, cogs: 8.341, gp: 3.965 },
    { period: '2026-09', region: 'الموصل', product: 'P07', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 1163, revenue: 10.6589, cogs: 6.8617, gp: 3.7972 },
    { period: '2026-09', region: 'الموصل', product: 'P08', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 1639, revenue: 13.1038, cogs: 9.1784, gp: 3.9254 },
    { period: '2026-09', region: 'الموصل', product: 'P09', cat: 'المجمدات', brand: 'مستورد', quantity: 446, revenue: 6.4741, cogs: 7.1806, gp: -0.7065 },
    { period: '2026-09', region: 'بغداد', product: 'P01', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 2871, revenue: 54.8562, cogs: 44.2134, gp: 10.6428 },
    { period: '2026-09', region: 'بغداد', product: 'P02', cat: 'المعلبات', brand: 'مستورد', quantity: 2178, revenue: 28.7039, cogs: 23.3046, gp: 5.3993 },
    { period: '2026-09', region: 'بغداد', product: 'P03', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 3366, revenue: 56.9729, cogs: 53.5194, gp: 3.4535 },
    { period: '2026-09', region: 'بغداد', product: 'P04', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 3036, revenue: 32.8192, cogs: 23.0736, gp: 9.7456 },
    { period: '2026-09', region: 'بغداد', product: 'P05', cat: 'المجمدات', brand: 'مستورد', quantity: 2937, revenue: 63.4862, cogs: 56.6841, gp: 6.8021 },
    { period: '2026-09', region: 'بغداد', product: 'P06', cat: 'غير غذائية', brand: 'مستورد', quantity: 2013, revenue: 28.2142, cogs: 19.1235, gp: 9.0907 },
    { period: '2026-09', region: 'بغداد', product: 'P07', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 2664, revenue: 24.4156, cogs: 15.7176, gp: 8.698 },
    { period: '2026-09', region: 'بغداد', product: 'P08', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 3757, revenue: 30.0372, cogs: 21.0392, gp: 8.998 },
    { period: '2026-09', region: 'بغداد', product: 'P09', cat: 'المجمدات', brand: 'مستورد', quantity: 1023, revenue: 14.8499, cogs: 16.4703, gp: -1.6204 },
    { period: '2026-10', region: 'أربيل', product: 'P01', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1697, revenue: 32.4246, cogs: 26.1338, gp: 6.2908 },
    { period: '2026-10', region: 'أربيل', product: 'P02', cat: 'المعلبات', brand: 'مستورد', quantity: 1287, revenue: 16.9614, cogs: 13.7709, gp: 3.1905 },
    { period: '2026-10', region: 'أربيل', product: 'P03', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1989, revenue: 33.6658, cogs: 31.6251, gp: 2.0407 },
    { period: '2026-10', region: 'أربيل', product: 'P04', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1794, revenue: 19.3931, cogs: 13.6344, gp: 5.7587 },
    { period: '2026-10', region: 'أربيل', product: 'P05', cat: 'المجمدات', brand: 'مستورد', quantity: 1736, revenue: 37.5254, cogs: 33.5048, gp: 4.0206 },
    { period: '2026-10', region: 'أربيل', product: 'P06', cat: 'غير غذائية', brand: 'مستورد', quantity: 1190, revenue: 16.679, cogs: 11.305, gp: 5.374 },
    { period: '2026-10', region: 'أربيل', product: 'P07', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 1575, revenue: 14.4349, cogs: 9.2925, gp: 5.1424 },
    { period: '2026-10', region: 'أربيل', product: 'P08', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 2221, revenue: 17.7569, cogs: 12.4376, gp: 5.3193 },
    { period: '2026-10', region: 'أربيل', product: 'P09', cat: 'المجمدات', brand: 'مستورد', quantity: 605, revenue: 8.7822, cogs: 9.7405, gp: -0.9583 },
    { period: '2026-10', region: 'البصرة', product: 'P01', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 2029, revenue: 38.7681, cogs: 31.2466, gp: 7.5215 },
    { period: '2026-10', region: 'البصرة', product: 'P02', cat: 'المعلبات', brand: 'مستورد', quantity: 1539, revenue: 20.2825, cogs: 16.4673, gp: 3.8152 },
    { period: '2026-10', region: 'البصرة', product: 'P03', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 2379, revenue: 40.267, cogs: 37.8261, gp: 2.4409 },
    { period: '2026-10', region: 'البصرة', product: 'P04', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 2145, revenue: 23.1874, cogs: 16.302, gp: 6.8854 },
    { period: '2026-10', region: 'البصرة', product: 'P05', cat: 'المجمدات', brand: 'مستورد', quantity: 2075, revenue: 44.8532, cogs: 40.0475, gp: 4.8057 },
    { period: '2026-10', region: 'البصرة', product: 'P06', cat: 'غير غذائية', brand: 'مستورد', quantity: 1423, revenue: 19.9448, cogs: 13.5185, gp: 6.4263 },
    { period: '2026-10', region: 'البصرة', product: 'P07', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 1883, revenue: 17.2577, cogs: 11.1097, gp: 6.148 },
    { period: '2026-10', region: 'البصرة', product: 'P08', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 2655, revenue: 21.2267, cogs: 14.868, gp: 6.3587 },
    { period: '2026-10', region: 'البصرة', product: 'P09', cat: 'المجمدات', brand: 'مستورد', quantity: 723, revenue: 10.4951, cogs: 11.6403, gp: -1.1452 },
    { period: '2026-10', region: 'الموصل', product: 'P01', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1328, revenue: 25.3741, cogs: 20.4512, gp: 4.9229 },
    { period: '2026-10', region: 'الموصل', product: 'P02', cat: 'المعلبات', brand: 'مستورد', quantity: 1007, revenue: 13.2713, cogs: 10.7749, gp: 2.4964 },
    { period: '2026-10', region: 'الموصل', product: 'P03', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1557, revenue: 26.3538, cogs: 24.7563, gp: 1.5975 },
    { period: '2026-10', region: 'الموصل', product: 'P04', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 1404, revenue: 15.1772, cogs: 10.6704, gp: 4.5068 },
    { period: '2026-10', region: 'الموصل', product: 'P05', cat: 'المجمدات', brand: 'مستورد', quantity: 1358, revenue: 29.3545, cogs: 26.2094, gp: 3.1451 },
    { period: '2026-10', region: 'الموصل', product: 'P06', cat: 'غير غذائية', brand: 'مستورد', quantity: 931, revenue: 13.0489, cogs: 8.8445, gp: 4.2044 },
    { period: '2026-10', region: 'الموصل', product: 'P07', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 1232, revenue: 11.2913, cogs: 7.2688, gp: 4.0225 },
    { period: '2026-10', region: 'الموصل', product: 'P08', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 1738, revenue: 13.8953, cogs: 9.7328, gp: 4.1625 },
    { period: '2026-10', region: 'الموصل', product: 'P09', cat: 'المجمدات', brand: 'مستورد', quantity: 473, revenue: 6.8661, cogs: 7.6153, gp: -0.7492 },
    { period: '2026-10', region: 'بغداد', product: 'P01', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 3043, revenue: 58.1426, cogs: 46.8622, gp: 11.2804 },
    { period: '2026-10', region: 'بغداد', product: 'P02', cat: 'المعلبات', brand: 'مستورد', quantity: 2309, revenue: 30.4303, cogs: 24.7063, gp: 5.724 },
    { period: '2026-10', region: 'بغداد', product: 'P03', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 3568, revenue: 60.392, cogs: 56.7312, gp: 3.6608 },
    { period: '2026-10', region: 'بغداد', product: 'P04', cat: 'الأغذية الجافة', brand: 'مستورد', quantity: 3218, revenue: 34.7866, cogs: 24.4568, gp: 10.3298 },
    { period: '2026-10', region: 'بغداد', product: 'P05', cat: 'المجمدات', brand: 'مستورد', quantity: 3113, revenue: 67.2906, cogs: 60.0809, gp: 7.2097 },
    { period: '2026-10', region: 'بغداد', product: 'P06', cat: 'غير غذائية', brand: 'مستورد', quantity: 2134, revenue: 29.9101, cogs: 20.273, gp: 9.6371 },
    { period: '2026-10', region: 'بغداد', product: 'P07', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 2824, revenue: 25.882, cogs: 16.6616, gp: 9.2204 },
    { period: '2026-10', region: 'بغداد', product: 'P08', cat: 'الأغذية الجافة', brand: 'علامة خاصة', quantity: 3982, revenue: 31.8361, cogs: 22.2992, gp: 9.5369 },
    { period: '2026-10', region: 'بغداد', product: 'P09', cat: 'المجمدات', brand: 'مستورد', quantity: 1084, revenue: 15.7353, cogs: 17.4524, gp: -1.7171 },
  ] as PlanRow[],
  ar: [
    { region: 'أربيل', current: 260, overdue: 72 },
    { region: 'البصرة', current: 350, overdue: 210 },
    { region: 'الموصل', current: 185, overdue: 83 },
    { region: 'بغداد', current: 540, overdue: 178 },
  ] as ArRow[],
  inventory: [
    { product: 'P01', category: 'الأغذية الجافة', value: 357.28, slow: 0.11 },
    { product: 'P02', category: 'المعلبات', value: 176.55, slow: 0.25 },
    { product: 'P03', category: 'الأغذية الجافة', value: 480.18, slow: 0.41 },
    { product: 'P04', category: 'الأغذية الجافة', value: 107.92, slow: 0.11 },
    { product: 'P05', category: 'المجمدات', value: 461.27, slow: 0.3 },
    { product: 'P06', category: 'غير غذائية', value: 166.25, slow: 0.11 },
    { product: 'P07', category: 'الأغذية الجافة', value: 94.99, slow: 0.11 },
    { product: 'P08', category: 'الأغذية الجافة', value: 106.4, slow: 0.11 },
    { product: 'P09', category: 'المجمدات', value: 151.34, slow: 0.11 },
  ] as InventoryRow[],
  economicDiagnostics: {
    engineVersion: 'diagnostics-v1.0',
    period: '2026-10',
    unit: 'million_IQD',
    coverage: { source: 'sales + products', rowsSeen: 36, rowsUsed: 36, rowsRejected: 0, complete: true },
    totals: { revenue: 882.972003, cogs: 766.668735, grossProfit: 116.303268, discountValue: 48.45137, quantity: 62708, grossMarginPct: 13.171796 },
    products: [
      { productId: 'P03', productName: 'زيت دوار الشمس 1 لتر', category: 'الأغذية الجافة', salesRows: 4, revenue: 145.424723, cogs: 154.779345, grossProfit: -9.354622, discountValue: 15.564287, quantity: 8890, regions: ['أربيل', 'البصرة', 'الموصل', 'بغداد'], grossMarginPct: -6.432622, evidence: { source: 'sales + products', period: '2026-10', rowCount: 4, unit: 'million_IQD' } },
      { productId: 'P09', productName: 'أسماك مجمدة اقتصادي', category: 'المجمدات', salesRows: 4, revenue: 39.814383, cogs: 45.474691, grossProfit: -5.660308, discountValue: 2.081225, quantity: 2729, regions: ['أربيل', 'البصرة', 'الموصل', 'بغداد'], grossMarginPct: -14.216742, evidence: { source: 'sales + products', period: '2026-10', rowCount: 4, unit: 'million_IQD' } },
      { productId: 'P05', productName: 'دجاج مجمد 1 كغ', category: 'المجمدات', salesRows: 4, revenue: 174.741351, cogs: 169.91334, grossProfit: 4.828011, discountValue: 7.155609, quantity: 8040, regions: ['أربيل', 'البصرة', 'الموصل', 'بغداد'], grossMarginPct: 2.762947, evidence: { source: 'sales + products', period: '2026-10', rowCount: 4, unit: 'million_IQD' } },
      { productId: 'P02', productName: 'معجون طماطم الأصيل', category: 'المعلبات', salesRows: 4, revenue: 77.725118, cogs: 64.985166, grossProfit: 12.739952, discountValue: 4.063066, quantity: 5868, regions: ['أربيل', 'البصرة', 'الموصل', 'بغداد'], grossMarginPct: 16.391035, evidence: { source: 'sales + products', period: '2026-10', rowCount: 4, unit: 'million_IQD' } },
      { productId: 'P07', productName: 'عدس روافد 1 كغ', category: 'الأغذية الجافة', salesRows: 4, revenue: 62.40748, cogs: 41.353218, grossProfit: 21.054262, discountValue: 1.885888, quantity: 6772, regions: ['أربيل', 'البصرة', 'الموصل', 'بغداد'], grossMarginPct: 33.73676, evidence: { source: 'sales + products', period: '2026-10', rowCount: 4, unit: 'million_IQD' } },
      { productId: 'P08', productName: 'سكر روافد 1 كغ', category: 'الأغذية الجافة', salesRows: 4, revenue: 77.718536, cogs: 56.058912, grossProfit: 21.659624, discountValue: 2.384968, quantity: 9672, regions: ['أربيل', 'البصرة', 'الموصل', 'بغداد'], grossMarginPct: 27.869316, evidence: { source: 'sales + products', period: '2026-10', rowCount: 4, unit: 'million_IQD' } },
      { productId: 'P06', productName: 'منظفات نهرين', category: 'غير غذائية', salesRows: 4, revenue: 76.140145, cogs: 53.124998, grossProfit: 23.015148, discountValue: 3.532493, quantity: 5403, regions: ['أربيل', 'البصرة', 'الموصل', 'بغداد'], grossMarginPct: 30.227349, evidence: { source: 'sales + products', period: '2026-10', rowCount: 4, unit: 'million_IQD' } },
      { productId: 'P04', productName: 'بسكويت روابي', category: 'الأغذية الجافة', salesRows: 4, revenue: 85.356173, cogs: 61.803162, grossProfit: 23.553011, discountValue: 5.902882, quantity: 7857, regions: ['أربيل', 'البصرة', 'الموصل', 'بغداد'], grossMarginPct: 27.593799, evidence: { source: 'sales + products', period: '2026-10', rowCount: 4, unit: 'million_IQD' } },
      { productId: 'P01', productName: 'أرز الواحة 5 كغ', category: 'الأغذية الجافة', salesRows: 4, revenue: 143.644094, cogs: 119.175903, grossProfit: 24.468191, discountValue: 5.880952, quantity: 7477, regions: ['أربيل', 'البصرة', 'الموصل', 'بغداد'], grossMarginPct: 17.0339, evidence: { source: 'sales + products', period: '2026-10', rowCount: 4, unit: 'million_IQD' } },
    ] as DiagnosticProduct[],
    findings: [
      { id: 'NEG_GP:2026-10:P03', kind: 'observed_negative_gross_profit', status: 'verified_arithmetic', productId: 'P03', title: 'ربح إجمالي سالب', observedGrossProfit: -9.354622, potentialSaving: null, cashRelease: null, evidence: { source: 'sales + products', period: '2026-10', rowCount: 4, unit: 'million_IQD' }, suggestedAction: 'تحقق من التكلفة والخصومات والمرتجعات قبل تغيير السعر' },
      { id: 'NEG_GP:2026-10:P09', kind: 'observed_negative_gross_profit', status: 'verified_arithmetic', productId: 'P09', title: 'ربح إجمالي سالب', observedGrossProfit: -5.660308, potentialSaving: null, cashRelease: null, evidence: { source: 'sales + products', period: '2026-10', rowCount: 4, unit: 'million_IQD' }, suggestedAction: 'تحقق من التكلفة والخصومات والمرتجعات قبل تغيير السعر' },
    ],
    reconciliation: { productGrossProfitMatchesTotal: true },
    limitations: [
      'الربح الإجمالي فقط؛ بيانات العملاء وتكلفة الخدمة غير متوفرة في هذا الجدول',
      'الخصومات لا تُفترض تلقائياً كوفورات قابلة للاسترداد',
      'الإشارات على نفس الصنف قد تتداخل: لا تجمع المبالغ باعتبارها منافع مؤكدة',
    ],
  },
  contributionAnalysis: {
    engineVersion: 'contribution-v1.0',
    period: '2026-10',
    unit: 'million_IQD',
    coverage: { complete: true, salesRows: 36, invalidRows: 0, productsWithCompleteCost: 9, productsTotal: 9 },
    totals: { revenue: 882.972003, grossProfit: 116.303269, variableServiceCosts: 38.40765, contribution: 77.895619 },
    products: [
      { productId: 'P01', productName: 'أرز الواحة 5 كغ', revenue: 143.644094, cogs: 119.175903, grossProfit: 24.468191, grossMarginPct: 17.0339, variableServiceCosts: 3.028185, contribution: 21.440006, contributionMarginPct: 14.925783, serviceCoverage: 'complete', sourceRows: 4, matchedRows: 4, missingRows: 0, regions: ['أربيل', 'البصرة', 'الموصل', 'بغداد'] },
      { productId: 'P02', productName: 'معجون طماطم الأصيل', revenue: 77.725118, cogs: 64.985166, grossProfit: 12.739952, grossMarginPct: 16.391035, variableServiceCosts: 2.69928, contribution: 10.040672, contributionMarginPct: 12.918181, serviceCoverage: 'complete', sourceRows: 4, matchedRows: 4, missingRows: 0, regions: ['أربيل', 'البصرة', 'الموصل', 'بغداد'] },
      { productId: 'P03', productName: 'زيت دوار الشمس 1 لتر', revenue: 145.424723, cogs: 154.779345, grossProfit: -9.354622, grossMarginPct: -6.432622, variableServiceCosts: 4.57835, contribution: -13.932972, contributionMarginPct: -9.580883, serviceCoverage: 'complete', sourceRows: 4, matchedRows: 4, missingRows: 0, regions: ['أربيل', 'البصرة', 'الموصل', 'بغداد'] },
      { productId: 'P04', productName: 'بسكويت روابي', revenue: 85.356173, cogs: 61.803162, grossProfit: 23.553011, grossMarginPct: 27.593799, variableServiceCosts: 4.47849, contribution: 19.074521, contributionMarginPct: 22.346973, serviceCoverage: 'complete', sourceRows: 4, matchedRows: 4, missingRows: 0, regions: ['أربيل', 'البصرة', 'الموصل', 'بغداد'] },
      { productId: 'P05', productName: 'دجاج مجمد 1 كغ', revenue: 174.741351, cogs: 169.91334, grossProfit: 4.828011, grossMarginPct: 2.762947, variableServiceCosts: 5.025, contribution: -0.196989, contributionMarginPct: -0.112732, serviceCoverage: 'complete', sourceRows: 4, matchedRows: 4, missingRows: 0, regions: ['أربيل', 'البصرة', 'الموصل', 'بغداد'] },
      { productId: 'P06', productName: 'منظفات نهرين', revenue: 76.140145, cogs: 53.124998, grossProfit: 23.015148, grossMarginPct: 30.227349, variableServiceCosts: 3.67404, contribution: 19.341108, contributionMarginPct: 25.401984, serviceCoverage: 'complete', sourceRows: 4, matchedRows: 4, missingRows: 0, regions: ['أربيل', 'البصرة', 'الموصل', 'بغداد'] },
      { productId: 'P07', productName: 'عدس روافد 1 كغ', revenue: 62.40748, cogs: 41.353218, grossProfit: 21.054262, grossMarginPct: 33.73676, variableServiceCosts: 4.97742, contribution: 16.076842, contributionMarginPct: 25.761082, serviceCoverage: 'complete', sourceRows: 4, matchedRows: 4, missingRows: 0, regions: ['أربيل', 'البصرة', 'الموصل', 'بغداد'] },
      { productId: 'P08', productName: 'سكر روافد 1 كغ', revenue: 77.718536, cogs: 56.058912, grossProfit: 21.659624, grossMarginPct: 27.869316, variableServiceCosts: 7.64088, contribution: 14.018744, contributionMarginPct: 18.037839, serviceCoverage: 'complete', sourceRows: 4, matchedRows: 4, missingRows: 0, regions: ['أربيل', 'البصرة', 'الموصل', 'بغداد'] },
      { productId: 'P09', productName: 'أسماك مجمدة اقتصادي', revenue: 39.814383, cogs: 45.474691, grossProfit: -5.660308, grossMarginPct: -14.216742, variableServiceCosts: 2.306005, contribution: -7.966313, contributionMarginPct: -20.008631, serviceCoverage: 'complete', sourceRows: 4, matchedRows: 4, missingRows: 0, regions: ['أربيل', 'البصرة', 'الموصل', 'بغداد'] },
    ] as ContributionProduct[],
    recommendations: [
      { id: 'NEG_CONTRIBUTION:2026-10:P03', productId: 'P03', kind: 'economic_review', status: 'يتطلب مراجعة المالك', title: 'هامش مساهمة سالب', action: 'راجع دقة تكاليف الخدمة وشروط البيع والتسعير؛ اختبر البدائل قبل تعديل التغطية أو الأسعار.', observedContribution: -13.932972, evidence: { source: 'sales + service_costs', period: '2026-10', salesRows: 4, matchedRows: 4 } },
      { id: 'NEG_CONTRIBUTION:2026-10:P05', productId: 'P05', kind: 'economic_review', status: 'يتطلب مراجعة المالك', title: 'هامش مساهمة سالب بعد تكلفة الخدمة', action: 'راجع تكاليف التبريد والخدمة المتغيرة وشروط التسعير؛ الدجاج يحقق ربحاً إجمالياً موجباً لكنه يتحول لسالب بعد الخدمة.', observedContribution: -0.196989, evidence: { source: 'sales + service_costs', period: '2026-10', salesRows: 4, matchedRows: 4 } },
      { id: 'NEG_CONTRIBUTION:2026-10:P09', productId: 'P09', kind: 'economic_review', status: 'يتطلب مراجعة المالك', title: 'هامش مساهمة سالب', action: 'راجع دقة تكاليف الخدمة وشروط البيع والتسعير؛ اختبر البدائل قبل تعديل التغطية أو الأسعار.', observedContribution: -7.966313, evidence: { source: 'sales + service_costs', period: '2026-10', salesRows: 4, matchedRows: 4 } },
    ],
  },
  commercialBridge: {
    '2026-08': {
      engineVersion: 'commercial-bridge-1.0',
      period: '2026-08',
      previousPeriod: null,
      status: 'available',
      unit: 'million_IQD',
      waterfall: { grossSales: 823.1485, discounts: 36.156324, netRevenue: 786.992176, cogs: 644.0679, grossProfit: 142.924276, grossMarginPct: 18.160826 },
      salesRows: 36,
      comparison: null,
      source: 'sales.period,region,product_id,quantity,list_price,discount_pct,unit_cost',
      limitations: ['الهامش الإجمالي فقط؛ المرتجعات وحوافز الموردين والمصروفات الثابتة والضرائب غير مشمولة.', 'الجسر تفكيك حسابي محدد، وليس إثباتاً للسبب التجاري للتغير.'],
    },
    '2026-09': {
      engineVersion: 'commercial-bridge-1.0',
      period: '2026-09',
      previousPeriod: '2026-08',
      status: 'available',
      unit: 'million_IQD',
      waterfall: { grossSales: 892.58874, discounts: 39.218878, netRevenue: 853.369862, cogs: 709.467903, grossProfit: 143.901959, grossMarginPct: 16.862789 },
      salesRows: 36,
      comparison: {
        baselineGrossProfit: 142.924276,
        currentGrossProfit: 143.901959,
        change: 0.977683,
        factors: { volume: 12.004365, price: 4.245621, discount: 0, unitCost: -15.272303, newItems: 0, removedItems: 0 },
        reconciliationResidual: 0,
        matchedRegionProductPairs: 36,
        newRegionProductPairs: 0,
        removedRegionProductPairs: 0,
        method: 'weighted_average_region_product_exact_accounting_bridge',
        evidenceStatus: 'arithmetically_reconciled_not_causal',
      },
      source: 'sales.period,region,product_id,quantity,list_price,discount_pct,unit_cost',
      limitations: ['الهامش الإجمالي فقط؛ المرتجعات وحوافز الموردين والمصروفات الثابتة والضرائب غير مشمولة.', 'الجسر تفكيك حسابي محدد، وليس إثباتاً للسبب التجاري للتغير.'],
    },
    '2026-10': {
      engineVersion: 'commercial-bridge-1.0',
      period: '2026-10',
      previousPeriod: '2026-09',
      status: 'available',
      unit: 'million_IQD',
      waterfall: { grossSales: 931.423373, discounts: 48.45137, netRevenue: 882.972003, cogs: 766.668735, grossProfit: 116.303268, grossMarginPct: 13.171796 },
      salesRows: 36,
      comparison: {
        baselineGrossProfit: 143.901959,
        currentGrossProfit: 116.303268,
        change: -27.598691,
        factors: { volume: 5.179528, price: 2.163578, discount: -7.744228, unitCost: -27.197569, newItems: 0, removedItems: 0 },
        reconciliationResidual: 0,
        matchedRegionProductPairs: 36,
        newRegionProductPairs: 0,
        removedRegionProductPairs: 0,
        method: 'weighted_average_region_product_exact_accounting_bridge',
        evidenceStatus: 'arithmetically_reconciled_not_causal',
      },
      source: 'sales.period,region,product_id,quantity,list_price,discount_pct,unit_cost',
      limitations: ['الهامش الإجمالي فقط؛ المرتجعات وحوافز الموردين والمصروفات الثابتة والضرائب غير مشمولة.', 'الجسر تفكيك حسابي محدد، وليس إثباتاً للسبب التجاري للتغير.'],
    },
  } as Record<string, CommercialBridgePeriod>,
  owners: {
    strategy: 'النمو المربح مع حماية السيولة وتوسيع العلامة الخاصة تدريجياً',
    risk: 'لا زيادة جوهرية برأس المال العامل دون عائد واضح',
    scope: 'استراتيجية المجموعة ونتائجها، لا الإدارة اليومية',
  },
  initialCases: [
    {
      id: 'OAI-GP',
      title: 'المبيعات والربح الإجمالي دون الخطة',
      desc: 'الربح الإجمالي في أكتوبر 2026 أقل من الخطة بنسبة 32.6%؛ تغير التكلفة والخصومات وهامش بعض الأصناف يتطلب مراجعة اقتصادية.',
      type: 'profit',
      status: 'قيد الاستقصاء',
      closed: false,
      history: [{ date: '2026-10-31', note: '2026-10: الربح الإجمالي 116.3 مقابل خطة 172.6 مليون (فجوة -32.6%)، المبيعات 93.6% من الخطة، 2 منتجات بربح إجمالي سالب' }],
    },
    {
      id: 'OAI-WC',
      title: 'رأس مال عامل يقلّص مرونة التوسع',
      desc: 'جزء من المخزون والذمم يقيّد قدرة المجموعة على تمويل النمو. هذه أرصدة تعرض وليست خسائر محققة.',
      type: 'capital',
      status: 'قيد الاستقصاء',
      closed: false,
      history: [{ date: '2026-10-31', note: '2026-10-31: الذمم المتأخرة 28.9% من إجمالي الذمم، المخزون بطيء الحركة 23.2% من قيمة المخزون' }],
    },
  ] as CaseItem[],
};

export const fmt = (n: number, maxDigits = 1) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: maxDigits }).format(n);

export const fmt2 = (n: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);

export const money = (n: number) => `${fmt(n)} مليون د.ع`;
export const pct = (n: number) => `${fmt(n)}%`;
export const signFmt = (n: number, digits = 1) => `${n > 0 ? '+' : ''}${fmt(n, digits)}`;

export interface SumTotals {
  revenue: number;
  cogs: number;
  gp: number;
  qty: number;
}

export function sumRows(rows: Array<{ revenue: number; cogs: number; gp: number; quantity: number }>): SumTotals {
  return rows.reduce(
    (acc, r) => {
      acc.revenue += r.revenue;
      acc.cogs += r.cogs;
      acc.gp += r.gp;
      acc.qty += r.quantity;
      return acc;
    },
    { revenue: 0, cogs: 0, gp: 0, qty: 0 }
  );
}

export function filterTransactions<
  T extends { period: string; region: string; cat: string; brand: string; product: string }
>(
  source: T[],
  { period = '2026-10', region = 'الكل', cat = 'الكل', brand = 'الكل', product = 'الكل' }: {
    period?: string;
    region?: string;
    cat?: string;
    brand?: string;
    product?: string;
  }
): T[] {
  return source.filter(
    (r) =>
      (period === 'all' || r.period === period) &&
      (region === 'الكل' || region === 'all' || r.region === region) &&
      (cat === 'الكل' || cat === 'all' || r.cat === cat) &&
      (brand === 'الكل' || brand === 'all' || r.brand === brand) &&
      (product === 'الكل' || product === 'all' || r.product === product)
  );
}

export function groupRows<T extends { revenue: number; cogs: number; gp: number; quantity: number }>(
  rows: T[],
  key: keyof T
) {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const k = String(r[key]);
    const list = map.get(k);
    if (list) list.push(r);
    else map.set(k, [r]);
  }
  return Array.from(map.entries()).map(([k, rs]) => {
    const s = sumRows(rs);
    return {
      key: k,
      ...s,
      count: rs.length,
      margin: s.revenue ? (100 * s.gp) / s.revenue : 0,
    };
  });
}

export function calcLeakageBridge(region = 'الكل', category = 'الكل') {
  const cur = filterTransactions(OWNER_DATA.transactions, { region, cat: category, period: OWNER_DATA.latestPeriod }) as TransactionRow[];
  const prev = filterTransactions(OWNER_DATA.transactions, { region, cat: category, period: OWNER_DATA.prevPeriod }) as TransactionRow[];
  const A = sumRows(cur);
  const B = sumRows(prev);
  const prevMap = new Map(prev.map((r) => [`${r.region}|${r.product}`, r]));
  const bridge = { volume: 0, price: 0, discount: 0, cost: 0 };
  for (const r of cur) {
    const p = prevMap.get(`${r.region}|${r.product}`);
    if (!p) continue;
    const n0 = p.quantity;
    const n1 = r.quantity;
    const net0 = p.price * (1 - p.discount);
    bridge.volume += ((n1 - n0) * (net0 - p.cost)) / 1000;
    bridge.price += (n1 * (r.price - p.price) * (1 - p.discount)) / 1000;
    bridge.discount += (n1 * r.price * (p.discount - r.discount)) / 1000;
    bridge.cost += (n1 * (p.cost - r.cost)) / 1000;
  }
  const total = A.gp - B.gp;
  const allocated = bridge.volume + bridge.price + bridge.discount + bridge.cost;
  return { A, B, total, bridge, remainder: total - allocated };
}

export function computeTwinSimulation(
  actual: TransactionRow[],
  params: { pricePct: number; demandPct: number; costPct: number; discountPoints: number }
) {
  const price = params.pricePct / 100;
  const demand = params.demandPct / 100;
  const cost = params.costPct / 100;
  const discountPoints = params.discountPoints / 100;
  const base = sumRows(actual);
  const next = { revenue: 0, cogs: 0, gp: 0, qty: 0 };
  const impact = { volume: 0, price: 0, discount: 0, cost: 0 };

  for (const r of actual) {
    const q1 = r.quantity * (1 + demand);
    const px1 = r.price * (1 + price);
    const discount1 = Math.max(0, Math.min(0.95, r.discount + discountPoints));
    const c1 = r.cost * (1 + cost);
    const originalNet = r.price * (1 - r.discount);
    const grossPriceChange = px1 * (1 - r.discount) - originalNet;
    next.revenue += (q1 * px1 * (1 - discount1)) / 1000;
    next.cogs += (q1 * c1) / 1000;
    next.qty += q1;
    impact.volume += ((q1 - r.quantity) * (originalNet - r.cost)) / 1000;
    impact.price += (q1 * grossPriceChange) / 1000;
    impact.discount += (q1 * px1 * (r.discount - discount1)) / 1000;
    impact.cost += (q1 * (r.cost - c1)) / 1000;
  }
  next.gp = next.revenue - next.cogs;
  const delta = next.gp - base.gp;
  return { base, next, impact, delta };
}
