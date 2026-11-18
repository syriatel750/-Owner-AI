import React, { useEffect, useMemo, useState } from 'react';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import { fmt, fmt2, pct } from '../data/ownerData';
import { OpportunityMatrixPoint, OpportunityProfitabilityMatrixChart } from './Charts';
import { KpiMetricCard, StateLabel, SurfaceCard } from './UiPrimitives';

type ProjectTypeFilter = 'all' | 'existing' | 'proposed';
type OppQuadrant = OpportunityMatrixPoint['quadrant'];

interface OpportunityRecord {
  id: string;
  name: string;
  projectType: 'existing' | 'proposed';
  category: string;
  capitalM: number;
  expectedReturnM: number;
  marketRisk: number; // 1-10 (30%)
  supplyRisk: number; // 1-10 (25%)
  executionRisk: number; // 1-10 (25%)
  capitalRisk: number; // 1-10 (20%)
  notes: string;
  custom?: boolean;
}

const STORAGE_KEY = 'owner_ai_opportunity_matrix_v1';

const DEFAULT_OPPORTUNITIES: OpportunityRecord[] = [
  {
    id: 'OPP-01',
    name: 'توسعة شبكة التوزيع المباشر في بغداد',
    projectType: 'existing',
    category: 'التوزيع',
    capitalM: 420,
    expectedReturnM: 118,
    marketRisk: 2.8,
    supplyRisk: 3.0,
    executionRisk: 2.5,
    capitalRisk: 3.2,
    notes: 'استغلال الأسطول القائم لرفع تغطية منافذ التجزئة عالية الدوران.',
  },
  {
    id: 'OPP-02',
    name: 'تطوير وحدة التعبئة المحلية (العلامة الخاصة)',
    projectType: 'existing',
    category: 'العلامة الخاصة',
    capitalM: 185,
    expectedReturnM: 64,
    marketRisk: 2.6,
    supplyRisk: 2.2,
    executionRisk: 3.0,
    capitalRisk: 2.1,
    notes: 'خطوط عدس وسكر روافد تحقق أعلى استقرار في الهوامش.',
  },
  {
    id: 'OPP-03',
    name: 'تشغيل سلسلة التبريد للمجمدات (الدجاج والأسماك)',
    projectType: 'existing',
    category: 'المجمدات',
    capitalM: 310,
    expectedReturnM: 26,
    marketRisk: 7.6,
    supplyRisk: 8.4,
    executionRisk: 6.8,
    capitalRisk: 6.5,
    notes: 'تآكل العائد نتيجة قفزات تكلفة التبريد والشحن والهدر.',
  },
  {
    id: 'OPP-04',
    name: 'قناة الموزعين الإقليميين في الموصل',
    projectType: 'existing',
    category: 'التوزيع',
    capitalM: 140,
    expectedReturnM: 24,
    marketRisk: 4.8,
    supplyRisk: 4.4,
    executionRisk: 4.2,
    capitalRisk: 3.8,
    notes: 'عائد مستقر مع الحاجة لضبط آجال التحصيل والخصومات.',
  },
  {
    id: 'OPP-05',
    name: 'إنشاء مستودع البصرة اللوجستي المركزي',
    projectType: 'proposed',
    category: 'البنية التحتية',
    capitalM: 550,
    expectedReturnM: 178,
    marketRisk: 5.5,
    supplyRisk: 5.0,
    executionRisk: 6.9,
    capitalRisk: 8.2,
    notes: 'يرفع الطاقة الاستيعابية بالجنوب لكنه يتطلب التزاماً رأسمالياً مرتفعاً.',
  },
  {
    id: 'OPP-06',
    name: 'إطلاق خط تعبئة الأغذية الجافة (مرحلة 2)',
    projectType: 'proposed',
    category: 'العلامة الخاصة',
    capitalM: 210,
    expectedReturnM: 86,
    marketRisk: 2.9,
    supplyRisk: 3.1,
    executionRisk: 3.6,
    capitalRisk: 3.4,
    notes: 'توسيع العلامة الخاصة بأرز وحبوب محلية عالية الهامش.',
  },
  {
    id: 'OPP-07',
    name: 'أتمتة تسعير وضبط خصومات المنافذ الكبرى',
    projectType: 'proposed',
    category: 'التحول التجاري',
    capitalM: 45,
    expectedReturnM: 23,
    marketRisk: 2.2,
    supplyRisk: 1.8,
    executionRisk: 2.4,
    capitalRisk: 1.5,
    notes: 'عائد سريع من وقف البيع دون التكلفة وضبط سقوف الخصم.',
  },
  {
    id: 'OPP-08',
    name: 'الاستيراد المباشر لخط الزيوت النباتية بدون وسطاء',
    projectType: 'proposed',
    category: 'المشتريات',
    capitalM: 390,
    expectedReturnM: 92,
    marketRisk: 7.4,
    supplyRisk: 8.0,
    executionRisk: 6.2,
    capitalRisk: 6.8,
    notes: 'يحسن تكلفة الوحدة لكنه يعرّض المجموعة لتقلبات الصرف والشحن.',
  },
  {
    id: 'OPP-09',
    name: 'مركز توزيع مصغر في النجف وكربلاء',
    projectType: 'proposed',
    category: 'التوسع الجغرافي',
    capitalM: 165,
    expectedReturnM: 31,
    marketRisk: 5.4,
    supplyRisk: 4.4,
    executionRisk: 5.2,
    capitalRisk: 4.5,
    notes: 'فرصة متوسطة العائد تحتاج دراسة حجم الطلب المضمون قبل التشغيل.',
  },
];

const QUADRANT_INFO: Record<
  OppQuadrant,
  {
    label: string;
    tone: 'success' | 'neutral' | 'warning' | 'danger';
    guidance: string;
  }
> = {
  golden: {
    label: 'فرص ذهبية · أولوية توسع',
    tone: 'success',
    guidance: 'عائد يتجاوز الحد المستهدف بمخاطرة منضبطة؛ يُوصى بتسريع التمويل والتنفيذ.',
  },
  strategic: {
    label: 'نمو استراتيجي · يتطلب تحوطاً',
    tone: 'neutral',
    guidance: 'عائد جذاب لكنه يقترن بمخاطرة مرتفعة؛ يُنفّذ على مراحل مع ضمانات تمويلية.',
  },
  defensive: {
    label: 'مشاريع مستقرة · تحسين العائد',
    tone: 'warning',
    guidance: 'مخاطرة منخفضة وعائد دون المستهدف؛ يُركّز على رفع الكفاءة التشغيلية.',
  },
  restructure: {
    label: 'إعادة هيكلة أو استبعاد',
    tone: 'danger',
    guidance: 'عائد منخفض ومخاطرة مرتفعة؛ يتطلب تصحيحاً فورياً أو سحب رأس المال.',
  },
};

function computeCalculatedRisk(item: OpportunityRecord): number {
  const score =
    item.marketRisk * 0.3 +
    item.supplyRisk * 0.25 +
    item.executionRisk * 0.25 +
    item.capitalRisk * 0.2;
  return Math.round(score * 100) / 100;
}

function classifyOpportunity(
  roiPct: number,
  riskScore: number,
  roiHurdlePct: number,
  riskCeiling: number
): OppQuadrant {
  const highRoi = roiPct >= roiHurdlePct;
  const lowRisk = riskScore <= riskCeiling;
  if (highRoi && lowRisk) return 'golden';
  if (highRoi && !lowRisk) return 'strategic';
  if (!highRoi && lowRisk) return 'defensive';
  return 'restructure';
}

export function OpportunityProfitabilityMatrixSection() {
  const [items, setItems] = useState<OpportunityRecord[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch {
      // fallback to defaults
    }
    return DEFAULT_OPPORTUNITIES;
  });

  const [typeFilter, setTypeFilter] = useState<ProjectTypeFilter>('all');
  const [roiHurdlePct, setRoiHurdlePct] = useState<number>(22);
  const [riskCeiling, setRiskCeiling] = useState<number>(5.0);
  const [selectedId, setSelectedId] = useState<string>('OPP-06');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  // New project/opportunity form state
  const [draftName, setDraftName] = useState('');
  const [draftType, setDraftType] = useState<'existing' | 'proposed'>('proposed');
  const [draftCategory, setDraftCategory] = useState('التوسع التجاري');
  const [draftCapital, setDraftCapital] = useState('150');
  const [draftReturn, setDraftReturn] = useState('42');
  const [draftMarketRisk, setDraftMarketRisk] = useState(3.5);
  const [draftSupplyRisk, setDraftSupplyRisk] = useState(3.0);
  const [draftExecRisk, setDraftExecRisk] = useState(3.5);
  const [draftCapitalRisk, setDraftCapitalRisk] = useState(3.0);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore storage errors
    }
  }, [items]);

  const enrichedPoints = useMemo<Array<OpportunityMatrixPoint & { notes: string; custom?: boolean }>>(() => {
    return items
      .filter((item) => typeFilter === 'all' || item.projectType === typeFilter)
      .map((item) => {
        const roiPct = item.capitalM > 0 ? (100 * item.expectedReturnM) / item.capitalM : 0;
        const riskScore = computeCalculatedRisk(item);
        const quadrant = classifyOpportunity(roiPct, riskScore, roiHurdlePct, riskCeiling);
        const riskAdjustedScore = riskScore > 0 ? roiPct / riskScore : roiPct;
        return {
          id: item.id,
          name: item.name,
          projectType: item.projectType,
          projectTypeLabel: item.projectType === 'existing' ? 'مشروع قائم' : 'مشروع مقترح',
          category: item.category,
          capitalM: item.capitalM,
          expectedReturnM: item.expectedReturnM,
          roiPct,
          riskScore,
          riskAdjustedScore,
          marketRisk: item.marketRisk,
          supplyRisk: item.supplyRisk,
          executionRisk: item.executionRisk,
          capitalRisk: item.capitalRisk,
          quadrant,
          quadrantLabel: QUADRANT_INFO[quadrant].label,
          notes: item.notes,
          custom: item.custom,
        };
      })
      .sort((a, b) => b.riskAdjustedScore - a.riskAdjustedScore);
  }, [items, typeFilter, roiHurdlePct, riskCeiling]);

  const portfolioSummary = useMemo(() => {
    const totalCapital = enrichedPoints.reduce((s, p) => s + p.capitalM, 0);
    const totalReturn = enrichedPoints.reduce((s, p) => s + p.expectedReturnM, 0);
    const weightedRoi = totalCapital > 0 ? (100 * totalReturn) / totalCapital : 0;
    const weightedRisk =
      totalCapital > 0
        ? enrichedPoints.reduce((s, p) => s + p.riskScore * p.capitalM, 0) / totalCapital
        : 0;
    const goldenCount = enrichedPoints.filter((p) => p.quadrant === 'golden').length;
    const restructureCount = enrichedPoints.filter((p) => p.quadrant === 'restructure').length;

    return {
      totalCapital,
      totalReturn,
      weightedRoi,
      weightedRisk,
      goldenCount,
      restructureCount,
    };
  }, [enrichedPoints]);

  const selectedProject = useMemo(
    () => enrichedPoints.find((p) => p.id === selectedId) ?? enrichedPoints[0] ?? null,
    [enrichedPoints, selectedId]
  );

  const handleAddOpportunity = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = draftName.trim();
    const capitalM = Number(draftCapital);
    const expectedReturnM = Number(draftReturn);
    if (!cleanName || !Number.isFinite(capitalM) || capitalM <= 0 || !Number.isFinite(expectedReturnM)) {
      return;
    }
    const nextItem: OpportunityRecord = {
      id: `OPP-USR-${Date.now()}`,
      name: cleanName,
      projectType: draftType,
      category: draftCategory.trim() || 'فرصة استثمارية',
      capitalM,
      expectedReturnM,
      marketRisk: draftMarketRisk,
      supplyRisk: draftSupplyRisk,
      executionRisk: draftExecRisk,
      capitalRisk: draftCapitalRisk,
      notes: 'فرصة مضافة يدوياً للتقييم ضمن مصفوفة ربحية الفرص.',
      custom: true,
    };
    setItems((prev) => [nextItem, ...prev]);
    setSelectedId(nextItem.id);
    setDraftName('');
    setShowAddForm(false);
  };

  const handleDeleteCustom = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleResetDefaults = () => {
    setItems(DEFAULT_OPPORTUNITIES);
    setTypeFilter('all');
    setRoiHurdlePct(22);
    setRiskCeiling(5.0);
    setSelectedId('OPP-06');
  };

  return (
    <SurfaceCard
      title="مصفوفة تحليل ربحية الفرص (ROI مقابل درجة المخاطرة المحسوبة)"
      subtitle="رسم بياني تحليلي يقارن معدل العائد على الاستثمار المتوقع بدرجة المخاطرة المرجّحة للمشاريع القائمة والمقترحة · حجم الدائرة يمثل رأس المال المستثمر"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D63B8] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#164E94]"
          >
            <Plus className="h-3.5 w-3.5" />
            {showAddForm ? 'إغلاق النموذج' : 'إضافة مشروع / فرصة'}
          </button>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            إعادة ضبط
          </button>
        </div>
      }
    >
      {/* Inline Add Opportunity Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddOpportunity}
          className="mb-6 rounded-xl border border-slate-200 bg-slate-50/70 p-4"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-slate-900">إضافة مشروع قائم أو فرصة استثمارية مقترحة</h4>
            <span className="text-[11px] text-slate-500">
              تُحسب درجة المخاطرة تلقائياً: 30% سوق · 25% توريد · 25% تنفيذ · 20% رأسمال
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <label className="mb-1 block text-[11px] font-semibold text-slate-700">اسم المشروع أو الفرصة</label>
              <input
                type="text"
                required
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="مثال: توسعة خط الألبان في أربيل"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-700">الوضع الحالي</label>
              <select
                value={draftType}
                onChange={(e) => setDraftType(e.target.value as 'existing' | 'proposed')}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800"
              >
                <option value="proposed">مشروع مقترح</option>
                <option value="existing">مشروع قائم</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-700">رأس المال المستثمر (م.د)</label>
              <input
                type="number"
                min={1}
                step="any"
                required
                value={draftCapital}
                onChange={(e) => setDraftCapital(e.target.value)}
                className="font-num w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-700">العائد السنوي الصافي (م.د)</label>
              <input
                type="number"
                step="any"
                required
                value={draftReturn}
                onChange={(e) => setDraftReturn(e.target.value)}
                className="font-num w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-200/80 pt-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-700">التصنيف</label>
              <input
                type="text"
                value={draftCategory}
                onChange={(e) => setDraftCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
              />
            </div>

            <div>
              <div className="mb-1 flex justify-between text-[11px] font-semibold text-slate-700">
                <span>تقلب السوق (30%)</span>
                <span className="font-num">{fmt(draftMarketRisk, 1)}</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={0.5}
                value={draftMarketRisk}
                onChange={(e) => setDraftMarketRisk(Number(e.target.value))}
                className="w-full accent-[#1D63B8]"
              />
            </div>

            <div>
              <div className="mb-1 flex justify-between text-[11px] font-semibold text-slate-700">
                <span>مخاطر التوريد (25%)</span>
                <span className="font-num">{fmt(draftSupplyRisk, 1)}</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={0.5}
                value={draftSupplyRisk}
                onChange={(e) => setDraftSupplyRisk(Number(e.target.value))}
                className="w-full accent-[#1D63B8]"
              />
            </div>

            <div>
              <div className="mb-1 flex justify-between text-[11px] font-semibold text-slate-700">
                <span>تعقيد التنفيذ (25%)</span>
                <span className="font-num">{fmt(draftExecRisk, 1)}</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={0.5}
                value={draftExecRisk}
                onChange={(e) => setDraftExecRisk(Number(e.target.value))}
                className="w-full accent-[#1D63B8]"
              />
            </div>

            <div className="flex flex-col justify-between gap-2">
              <div>
                <div className="mb-1 flex justify-between text-[11px] font-semibold text-slate-700">
                  <span>العبء الرأسمالي (20%)</span>
                  <span className="font-num">{fmt(draftCapitalRisk, 1)}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={0.5}
                  value={draftCapitalRisk}
                  onChange={(e) => setDraftCapitalRisk(Number(e.target.value))}
                  className="w-full accent-[#1D63B8]"
                />
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-3">
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <span>
                ROI المتوقع:{' '}
                <strong className="font-num text-[#0F766E]">
                  {Number(draftCapital) > 0 ? pct((100 * Number(draftReturn)) / Number(draftCapital)) : '—'}
                </strong>
              </span>
              <span>
                درجة المخاطرة المحسوبة:{' '}
                <strong className="font-num text-slate-900">
                  {fmt(
                    draftMarketRisk * 0.3 +
                      draftSupplyRisk * 0.25 +
                      draftExecRisk * 0.25 +
                      draftCapitalRisk * 0.2,
                    2
                  )}{' '}
                  / 10
                </strong>
              </span>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-[#0F766E] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#0D625B]"
            >
              إدراج في المصفوفة
            </button>
          </div>
        </form>
      )}

      {/* Portfolio KPIs */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiMetricCard
          label="إجمالي رأس المال المرصود"
          value={portfolioSummary.totalCapital}
          unit="م.د"
          varianceText={`عائد سنوي متوقع: ${fmt(portfolioSummary.totalReturn)} م.د`}
          varianceTone="neutral"
        />
        <KpiMetricCard
          label="متوسط العائد المرجّح (ROI)"
          value={portfolioSummary.weightedRoi}
          unit="%"
          varianceText={
            portfolioSummary.weightedRoi >= roiHurdlePct
              ? `أعلى من الحد الأدنى (${roiHurdlePct}%)`
              : `أدنى من الحد الأدنى (${roiHurdlePct}%)`
          }
          varianceTone={portfolioSummary.weightedRoi >= roiHurdlePct ? 'good' : 'warn'}
        />
        <KpiMetricCard
          label="متوسط المخاطرة المرجّحة"
          value={portfolioSummary.weightedRisk}
          unit="/ 10"
          varianceText={`سقف المخاطرة المعتمد: ${fmt(riskCeiling, 1)}`}
          varianceTone={portfolioSummary.weightedRisk <= riskCeiling ? 'good' : 'bad'}
        />
        <KpiMetricCard
          label="الفرص الذهبية الجاهزة"
          value={portfolioSummary.goldenCount}
          unit="مشاريع"
          varianceText={
            portfolioSummary.restructureCount > 0
              ? `${portfolioSummary.restructureCount} مشاريع تتطلب إعادة هيكلة`
              : 'لا توجد مشاريع حرجة حالياً'
          }
          varianceTone={portfolioSummary.restructureCount > 0 ? 'warn' : 'good'}
        />
      </div>

      {/* Filter & Quadrant Threshold Toolbar */}
      <div className="mb-5 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">نطاق المشاريع المعروضة</label>
          <div className="inline-flex w-full rounded-lg border border-slate-200 bg-white p-0.5">
            {(
              [
                { id: 'all', label: 'جميع المشاريع' },
                { id: 'existing', label: 'المشاريع القائمة (دائرة)' },
                { id: 'proposed', label: 'المشاريع المقترحة (معين)' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTypeFilter(opt.id)}
                className={`flex-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  typeFilter === opt.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>الحد الأدنى لمعدل العائد (ROI)</span>
            <span className="font-num font-bold text-[#0F766E]">{roiHurdlePct}%</span>
          </div>
          <input
            type="range"
            min={10}
            max={40}
            step={1}
            value={roiHurdlePct}
            onChange={(e) => setRoiHurdlePct(Number(e.target.value))}
            className="w-full accent-[#0F766E]"
          />
        </div>

        <div className="lg:col-span-4">
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>سقف درجة المخاطرة المحسوبة</span>
            <span className="font-num font-bold text-slate-900">{fmt(riskCeiling, 1)} / 10</span>
          </div>
          <input
            type="range"
            min={2.5}
            max={8.0}
            step={0.5}
            value={riskCeiling}
            onChange={(e) => setRiskCeiling(Number(e.target.value))}
            className="w-full accent-[#1D63B8]"
          />
        </div>
      </div>

      {/* Scatter Matrix + Selected Project Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <OpportunityProfitabilityMatrixChart
            data={enrichedPoints}
            roiHurdlePct={roiHurdlePct}
            riskCeiling={riskCeiling}
            selectedId={selectedProject?.id ?? null}
            onSelectProject={setSelectedId}
            height={365}
          />
        </div>

        <div className="flex flex-col justify-between border-t border-slate-200 pt-4 lg:col-span-4 lg:border-r lg:border-t-0 lg:pr-5 lg:pt-0">
          {selectedProject ? (
            <div className="space-y-4">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-slate-500">
                    {selectedProject.projectTypeLabel} · {selectedProject.category}
                  </span>
                  <StateLabel
                    tone={QUADRANT_INFO[selectedProject.quadrant].tone}
                    label={selectedProject.quadrantLabel}
                  />
                </div>
                <h4 className="mt-1.5 text-sm font-bold leading-snug text-slate-900">
                  {selectedProject.name}
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{selectedProject.notes}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 border-y border-slate-100 py-3 text-xs">
                <div>
                  <div className="text-[11px] text-slate-500">العائد المتوقع (ROI)</div>
                  <div className="font-num mt-0.5 text-base font-bold text-[#0F766E]">
                    {pct(selectedProject.roiPct)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">المخاطرة المحسوبة</div>
                  <div className="font-num mt-0.5 text-base font-bold text-slate-900">
                    {fmt(selectedProject.riskScore, 2)} / 10
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">رأس المال / العائد السنوي</div>
                  <div className="font-num mt-0.5 font-semibold text-slate-800">
                    {fmt(selectedProject.capitalM, 0)} / {fmt(selectedProject.expectedReturnM, 0)} م.د
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">كفاءة العائد للمخاطرة</div>
                  <div className="font-num mt-0.5 font-bold text-[#1D63B8]">
                    {fmt2(selectedProject.riskAdjustedScore)}
                  </div>
                </div>
              </div>

              {/* Risk Components Breakdown */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-700">تفكيك درجة المخاطرة المحسوبة (من 10)</div>
                {[
                  { label: 'تقلب السوق والأسعار (30%)', val: selectedProject.marketRisk },
                  { label: 'مخاطر التوريد والشحن (25%)', val: selectedProject.supplyRisk },
                  { label: 'التعقيد التشغيلي والتنفيذ (25%)', val: selectedProject.executionRisk },
                  { label: 'العبء الرأسمالي والسيولة (20%)', val: selectedProject.capitalRisk },
                ].map((factor) => (
                  <div key={factor.label} className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-600">
                      <span>{factor.label}</span>
                      <span className="font-num font-semibold text-slate-900">{fmt(factor.val, 1)}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${
                          factor.val >= 7 ? 'bg-rose-600' : factor.val >= 5 ? 'bg-amber-500' : 'bg-[#0F766E]'
                        }`}
                        style={{ width: `${Math.min(100, factor.val * 10)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-600">
                <span className="font-bold text-slate-800">التوجيه التنفيذي: </span>
                {QUADRANT_INFO[selectedProject.quadrant].guidance}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Ranking & Comparison Table */}
      <div className="mt-6 overflow-x-auto border-t border-slate-200 pt-4">
        <table className="w-full border-collapse text-right text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600">
              <th className="px-3 py-2.5">الترتيب</th>
              <th className="px-3 py-2.5">المشروع / الفرصة</th>
              <th className="px-3 py-2.5">النوع</th>
              <th className="px-3 py-2.5">الاستثمار</th>
              <th className="px-3 py-2.5">العائد السنوي</th>
              <th className="px-3 py-2.5">معدل العائد ROI</th>
              <th className="px-3 py-2.5">المخاطرة المحسوبة</th>
              <th className="px-3 py-2.5">العائد / المخاطرة</th>
              <th className="px-3 py-2.5">التصنيف في المصفوفة</th>
              <th className="px-3 py-2.5">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {enrichedPoints.map((p, idx) => {
              const isSelected = selectedProject?.id === p.id;
              return (
                <tr
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/70'
                  }`}
                >
                  <td className="font-num px-3 py-2.5 font-bold text-slate-500">#{idx + 1}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-semibold text-slate-900">{p.name}</div>
                    <div className="text-[11px] text-slate-500">{p.category}</div>
                  </td>
                  <td className="px-3 py-2.5 text-slate-700">{p.projectTypeLabel}</td>
                  <td className="font-num px-3 py-2.5 font-semibold text-slate-900">{fmt(p.capitalM, 0)} م.د</td>
                  <td className="font-num px-3 py-2.5 font-semibold text-slate-900">{fmt(p.expectedReturnM, 0)} م.د</td>
                  <td
                    className={`font-num px-3 py-2.5 font-bold ${
                      p.roiPct >= roiHurdlePct ? 'text-[#0F766E]' : 'text-amber-700'
                    }`}
                  >
                    {pct(p.roiPct)}
                  </td>
                  <td
                    className={`font-num px-3 py-2.5 font-bold ${
                      p.riskScore > riskCeiling ? 'text-rose-700' : 'text-slate-800'
                    }`}
                  >
                    {fmt(p.riskScore, 2)} / 10
                  </td>
                  <td className="font-num px-3 py-2.5 font-bold text-[#1D63B8]">
                    {fmt2(p.riskAdjustedScore)}
                  </td>
                  <td className="px-3 py-2.5">
                    <StateLabel tone={QUADRANT_INFO[p.quadrant].tone} label={p.quadrantLabel} />
                  </td>
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    {p.custom ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteCustom(p.id)}
                        title="حذف الفرصة المضافة"
                        className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400">أساسي</span>
                    )}
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
