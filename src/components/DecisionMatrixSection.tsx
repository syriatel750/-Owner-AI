import React, { useEffect, useMemo, useState } from 'react';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import { fmt, fmt2 } from '../data/ownerData';
import { DecisionMatrixPoint, DecisionPriorityMatrixChart } from './Charts';
import { StateLabel, SurfaceCard } from './UiPrimitives';

export type DecisionQuadrant = 'immediate' | 'strategic' | 'quickwin' | 'defer';
export type DecisionTaskStatus = 'قيد الانتظار' | 'قيد التنفيذ' | 'مكتمل';

export interface DecisionTaskItem {
  id: string;
  title: string;
  owner: string;
  impactM: number; // Expected financial impact in million IQD
  riskScore: number; // 1 to 10
  status: DecisionTaskStatus;
  notes?: string;
}

const STORAGE_KEY = 'owner_ai_decision_matrix_v1';

const DEFAULT_DECISIONS: DecisionTaskItem[] = [
  {
    id: 'D-01',
    title: 'إيقاف نزيف هامش زيت دوار الشمس (P03) وتقييد سقف الخصم',
    owner: 'المبيعات والتسعير',
    impactM: 145,
    riskScore: 2.5,
    status: 'قيد التنفيذ',
    notes: 'خفض سقف الخصم في بغداد والنجف يوقف البيع دون التكلفة فوراً.',
  },
  {
    id: 'D-02',
    title: 'خطة تحصيل الذمم المتأخرة في البصرة (210 م.د)',
    owner: 'التحصيل والائتمان',
    impactM: 125,
    riskScore: 3.5,
    status: 'قيد الانتظار',
    notes: 'جدولة سداد أسبوعية لكبار العملاء وربط السقف الائتماني بالتحصيل.',
  },
  {
    id: 'D-03',
    title: 'مراجعة تكلفة خدمة الدجاج المجمد (P05) ومسارات الشحن المبرد',
    owner: 'سلسلة الإمداد',
    impactM: 95,
    riskScore: 4.5,
    status: 'قيد الانتظار',
    notes: 'دمج رحلات التوزيع المبرد لتقليص كلفة الخدمة المتغيرة لكل وحدة.',
  },
  {
    id: 'D-04',
    title: 'تقييم إنشاء مخزن جديد في البصرة (استثمار 550 م.د)',
    owner: 'الإدارة العليا',
    impactM: 185,
    riskScore: 8.0,
    status: 'قيد الانتظار',
    notes: 'أثر استراتيجي مرتفع على النمو لكنه يتطلب التزاماً رأسمالياً عالياً.',
  },
  {
    id: 'D-05',
    title: 'توسيع خط العلامة الخاصة (عدس وسكر روافد)',
    owner: 'التطوير التجاري',
    impactM: 115,
    riskScore: 6.5,
    status: 'قيد الانتظار',
    notes: 'هامش مستهدف أعلى يتطلب تثبيت عقود التعبئة والطلب المبدئي.',
  },
  {
    id: 'D-06',
    title: 'تصريف المخزون بطيء الحركة بعروض تجميعية محدودة المدة',
    owner: 'إدارة المخزون',
    impactM: 65,
    riskScore: 3.0,
    status: 'قيد الانتظار',
    notes: 'تحرير سيولة مجمدة دون كسر تسعير الأصناف الأساسية.',
  },
  {
    id: 'D-07',
    title: 'إعادة تسعير الأسماك المجمدة (P09) أو استبدال المورد',
    owner: 'المشتريات',
    impactM: 58,
    riskScore: 7.2,
    status: 'قيد الانتظار',
    notes: 'انخفاض الهامش مقابل حساسية السعر ومخاطر تغير المورد.',
  },
];

const QUADRANT_META: Record<
  DecisionQuadrant,
  {
    title: string;
    rule: string;
    actionHint: string;
    tone: 'success' | 'neutral' | 'warning' | 'danger';
  }
> = {
  immediate: {
    title: 'أولوية قصوى · تنفيذ فوري',
    rule: 'أثر مالي مرتفع · مخاطرة منخفضة',
    actionHint: 'يُنفّذ فوراً خلال هذا الأسبوع وبأقل تعقيد تشغيلي.',
    tone: 'success',
  },
  strategic: {
    title: 'مشاريع استراتيجية · تخطيط دقيق',
    rule: 'أثر مالي مرتفع · مخاطرة مرتفعة',
    actionHint: 'يتطلب دراسة جدوى، مراحل تنفيذ، وضوابط تحوط للمخاطر.',
    tone: 'neutral',
  },
  quickwin: {
    title: 'تحسينات سريعة · مكاسب فورية',
    rule: 'أثر مالي محدود · مخاطرة منخفضة',
    actionHint: 'يُفوّض للفرق التنفيذية ضمن المتابعة الدورية.',
    tone: 'warning',
  },
  defer: {
    title: 'مراجعة أو تأجيل',
    rule: 'أثر مالي محدود · مخاطرة مرتفعة',
    actionHint: 'يُؤجّل أو يُعاد تصميمه لتقليص المخاطر قبل اعتماد الموارد.',
    tone: 'danger',
  },
};

function classifyDecision(
  impactM: number,
  riskScore: number,
  impactThreshold: number,
  riskThreshold: number
): DecisionQuadrant {
  const highImpact = impactM >= impactThreshold;
  const lowRisk = riskScore <= riskThreshold;
  if (highImpact && lowRisk) return 'immediate';
  if (highImpact && !lowRisk) return 'strategic';
  if (!highImpact && lowRisk) return 'quickwin';
  return 'defer';
}

function calcPriorityScore(impactM: number, riskScore: number): number {
  return (impactM / 10) / (0.5 + riskScore * 0.25);
}

export function DecisionMatrixSection() {
  const [decisions, setDecisions] = useState<DecisionTaskItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch {
      // fallback to defaults
    }
    return DEFAULT_DECISIONS;
  });

  const [impactThreshold, setImpactThreshold] = useState<number>(80);
  const [riskThreshold, setRiskThreshold] = useState<number>(5.5);
  const [statusFilter, setStatusFilter] = useState<'الكل' | 'النشطة' | 'مكتمل'>('الكل');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Inline Add Form state
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newOwner, setNewOwner] = useState<string>('المبيعات والتسعير');
  const [newImpact, setNewImpact] = useState<number>(90);
  const [newRisk, setNewRisk] = useState<number>(4.0);
  const [newNotes, setNewNotes] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [confirmReset, setConfirmReset] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions));
    } catch {
      // ignore storage errors
    }
  }, [decisions]);

  const enrichedSorted = useMemo<DecisionMatrixPoint[]>(() => {
    const withScores = decisions.map((d) => {
      const quadrant = classifyDecision(d.impactM, d.riskScore, impactThreshold, riskThreshold);
      const priorityScore = calcPriorityScore(d.impactM, d.riskScore);
      return {
        ...d,
        quadrant,
        quadrantLabel: QUADRANT_META[quadrant].title,
        priorityScore,
        rank: 0,
      };
    });

    // Sort active tasks before completed tasks, then descending by priorityScore
    withScores.sort((a, b) => {
      const aDone = a.status === 'مكتمل' ? 1 : 0;
      const bDone = b.status === 'مكتمل' ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      return b.priorityScore - a.priorityScore;
    });

    return withScores.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
  }, [decisions, impactThreshold, riskThreshold]);

  const visibleItems = useMemo(() => {
    if (statusFilter === 'النشطة') return enrichedSorted.filter((d) => d.status !== 'مكتمل');
    if (statusFilter === 'مكتمل') return enrichedSorted.filter((d) => d.status === 'مكتمل');
    return enrichedSorted;
  }, [enrichedSorted, statusFilter]);

  const summary = useMemo(() => {
    const active = enrichedSorted.filter((d) => d.status !== 'مكتمل');
    const immediate = active.filter((d) => d.quadrant === 'immediate');
    const totalImpact = active.reduce((acc, d) => acc + d.impactM, 0);
    const immediateImpact = immediate.reduce((acc, d) => acc + d.impactM, 0);
    const avgRisk = active.length ? active.reduce((acc, d) => acc + d.riskScore, 0) / active.length : 0;
    return {
      activeCount: active.length,
      immediateCount: immediate.length,
      totalImpact,
      immediateImpact,
      avgRisk,
    };
  }, [enrichedSorted]);

  const byQuadrant = useMemo(() => {
    const groups: Record<DecisionQuadrant, DecisionMatrixPoint[]> = {
      immediate: [],
      strategic: [],
      quickwin: [],
      defer: [],
    };
    visibleItems.forEach((item) => {
      groups[item.quadrant].push(item);
    });
    return groups;
  }, [visibleItems]);

  const handleUpdateDecision = (id: string, patch: Partial<DecisionTaskItem>) => {
    setDecisions((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              ...patch,
              impactM: patch.impactM !== undefined ? Math.max(0, Math.min(500, patch.impactM)) : d.impactM,
              riskScore: patch.riskScore !== undefined ? Math.max(1, Math.min(10, patch.riskScore)) : d.riskScore,
            }
          : d
      )
    );
  };

  const handleDeleteDecision = (id: string) => {
    setDecisions((prev) => prev.filter((d) => d.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleAddDecision = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed) {
      setFormError('يرجى إدخال عنوان القرار أو المهمة قبل الحفظ.');
      return;
    }
    const nextNum =
      decisions.reduce((max, d) => {
        const m = /^D-(\d+)$/.exec(d.id);
        return m ? Math.max(max, Number(m[1])) : max;
      }, decisions.length) + 1;

    const item: DecisionTaskItem = {
      id: `D-${String(nextNum).padStart(2, '0')}`,
      title: trimmed,
      owner: newOwner.trim() || 'الإدارة التنفيذية',
      impactM: Math.max(5, Math.min(500, Number(newImpact) || 0)),
      riskScore: Math.max(1, Math.min(10, Number(newRisk) || 5)),
      status: 'قيد الانتظار',
      notes: newNotes.trim() || undefined,
    };

    setDecisions((prev) => [item, ...prev]);
    setSelectedId(item.id);
    setNewTitle('');
    setNewNotes('');
    setNewImpact(90);
    setNewRisk(4.0);
    setFormError('');
    setShowAddForm(false);
  };

  const handleResetDefaults = () => {
    setDecisions(DEFAULT_DECISIONS);
    setImpactThreshold(80);
    setRiskThreshold(5.5);
    setStatusFilter('الكل');
    setSelectedId(null);
    setConfirmReset(false);
  };

  const statusTone = (status: DecisionTaskStatus): 'neutral' | 'warning' | 'success' => {
    if (status === 'مكتمل') return 'success';
    if (status === 'قيد التنفيذ') return 'warning';
    return 'neutral';
  };

  return (
    <div className="space-y-5">
      {/* Section Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 pt-2">
        <div>
          <h3 className="text-lg font-bold text-slate-900">مصفوفة أولويات القرارات</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            تصنيف القرارات والمهام بناءً على الأثر المالي المتوقع مقابل درجة المخاطرة لترتيب أولوية التنفيذ
            {' · '}
            <span className="font-num font-semibold text-slate-700">{summary.activeCount}</span> قرارات نشطة
            {' · '}
            أثر إجمالي متوقع <span className="font-num font-semibold text-emerald-700">{fmt(summary.totalImpact, 0)}</span> م.د
            {' · '}
            <span className="font-num font-semibold text-slate-700">{summary.immediateCount}</span> للتنفيذ الفوري
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-xs">
            {(['الكل', 'النشطة', 'مكتمل'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
                  statusFilter === tab ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setShowAddForm((v) => !v);
              setFormError('');
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D63B8] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#164E94]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{showAddForm ? 'إغلاق النموذج' : 'إضافة قرار جديد'}</span>
          </button>

          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>استعادة الافتراضي</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs">
              <span className="font-semibold text-amber-900">تأكيد الاستعادة؟</span>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="rounded bg-amber-700 px-2 py-0.5 font-semibold text-white hover:bg-amber-800"
              >
                نعم
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="rounded border border-amber-300 bg-white px-2 py-0.5 font-semibold text-slate-700 hover:bg-slate-50"
              >
                إلغاء
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Inline Add Decision Form */}
      {showAddForm && (
        <SurfaceCard
          title="إضافة قرار أو مهمة جديدة للمصفوفة"
          subtitle="حدّد الأثر المالي المتوقع ودرجة المخاطرة ليُصنّف القرار تلقائياً ضمن الربع المناسب"
        >
          <form onSubmit={handleAddDecision} className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="md:col-span-5">
              <label className="mb-1 block text-xs font-semibold text-slate-700">عنوان القرار / المهمة *</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => {
                  setNewTitle(e.target.value);
                  if (formError) setFormError('');
                }}
                placeholder="مثال: تخفيض خصومات قطاع المخابز في بغداد"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#1D63B8] focus:outline-none"
              />
            </div>

            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-semibold text-slate-700">الجهة / المسؤول</label>
              <input
                type="text"
                value={newOwner}
                onChange={(e) => setNewOwner(e.target.value)}
                placeholder="مثال: المبيعات والتسعير"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#1D63B8] focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-700">الأثر المالي (م.د)</label>
              <input
                type="number"
                min={5}
                max={500}
                step={5}
                value={newImpact}
                onChange={(e) => setNewImpact(Number(e.target.value))}
                className="font-num w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#1D63B8] focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-700">درجة المخاطرة (1–10)</label>
              <input
                type="number"
                min={1}
                max={10}
                step={0.5}
                value={newRisk}
                onChange={(e) => setNewRisk(Number(e.target.value))}
                className="font-num w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#1D63B8] focus:outline-none"
              />
            </div>

            <div className="md:col-span-9">
              <label className="mb-1 block text-xs font-semibold text-slate-700">ملاحظات تنفيذية (اختياري)</label>
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="سبب الأثر المالي أو متطلب تقليل المخاطرة"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#1D63B8] focus:outline-none"
              />
            </div>

            <div className="flex items-end justify-end gap-2 md:col-span-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setFormError('');
                }}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#1D63B8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#164E94]"
              >
                إدراج في المصفوفة
              </button>
            </div>

            {formError && (
              <div className="md:col-span-12 text-xs font-semibold text-rose-700">{formError}</div>
            )}
          </form>
        </SurfaceCard>
      )}

      {/* Visual Matrix: Scatter Chart + Threshold Controls + 2x2 Quadrant Grid */}
      <SurfaceCard
        title="خريطة تصنيف القرارات (الأثر المالي المتوقع × درجة المخاطرة)"
        subtitle="اضغط على أي نقطة في الرسم البياني لتحديدها، أو عدّل الحدود الفاصلة لإعادة المعايرة الفورية"
        action={
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <label className="flex items-center gap-2">
              <span>حد الأثر المرتفع:</span>
              <input
                type="range"
                min={30}
                max={160}
                step={5}
                value={impactThreshold}
                onChange={(e) => setImpactThreshold(Number(e.target.value))}
                className="w-24 accent-[#1D63B8]"
              />
              <span className="font-num font-bold text-slate-900">{fmt(impactThreshold, 0)} م.د</span>
            </label>
            <label className="flex items-center gap-2">
              <span>حد المخاطرة:</span>
              <input
                type="range"
                min={2.5}
                max={8.5}
                step={0.5}
                value={riskThreshold}
                onChange={(e) => setRiskThreshold(Number(e.target.value))}
                className="w-24 accent-[#1D63B8]"
              />
              <span className="font-num font-bold text-slate-900">{fmt(riskThreshold, 1)} / 10</span>
            </label>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Scatter Quadrant Chart */}
          <div className="lg:col-span-7">
            <DecisionPriorityMatrixChart
              data={visibleItems}
              impactThreshold={impactThreshold}
              riskThreshold={riskThreshold}
              selectedId={selectedId}
              onSelectDecision={(id) => setSelectedId((prev) => (prev === id ? null : id))}
              height={340}
            />
          </div>

          {/* Right: 2x2 Quadrant Summary Matrix separated by clean hairline dividers */}
          <div className="grid grid-cols-1 border-t border-slate-200 pt-4 sm:grid-cols-2 lg:col-span-5 lg:border-t-0 lg:border-r lg:border-slate-200 lg:pr-6 lg:pt-0">
            {(['immediate', 'strategic', 'quickwin', 'defer'] as DecisionQuadrant[]).map((qKey, idx) => {
              const meta = QUADRANT_META[qKey];
              const list = byQuadrant[qKey];
              const borderClasses = [
                idx >= 2 ? 'sm:border-t sm:border-slate-200' : '',
                idx % 2 === 1 ? 'sm:border-r sm:border-slate-200 sm:pr-4' : 'sm:pl-4',
              ].join(' ');
              return (
                <div key={qKey} className={`py-3 ${borderClasses}`}>
                  <div className="flex items-center justify-between gap-2">
                    <StateLabel tone={meta.tone} label={meta.title} />
                    <span className="font-num text-xs font-bold text-slate-700">{list.length}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">{meta.rule}</div>

                  {list.length ? (
                    <ul className="mt-2.5 divide-y divide-slate-100 text-xs">
                      {list.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedId(item.id)}
                            className={`flex w-full items-start justify-between gap-2 py-1.5 text-right transition-colors hover:bg-slate-50 ${
                              selectedId === item.id ? 'bg-sky-50/70 font-semibold text-slate-900' : 'text-slate-700'
                            }`}
                          >
                            <span className="leading-snug">
                              <span className="font-num ml-1 text-[11px] font-bold text-slate-400">#{item.rank}</span>
                              <span className={item.status === 'مكتمل' ? 'line-through text-slate-400' : ''}>
                                {item.title}
                              </span>
                            </span>
                            <span className="font-num shrink-0 text-[11px] font-semibold text-slate-600">
                              {fmt(item.impactM, 0)} م
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2.5 text-[11px] text-slate-400">لا توجد قرارات في هذا الربع.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </SurfaceCard>

      {/* Ordered Execution Queue with Inline Reclassification Controls */}
      <SurfaceCard
        title="جدول ترتيب تنفيذ المهام والتصنيف التفاعلي"
        subtitle="مرتب تلقائياً حسب مؤشر الأولوية (الأثر المالي المتوقع ÷ معامل المخاطرة) — عدّل القيم لتحديث التصنيف والترتيب مباشرة"
      >
        {visibleItems.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-right text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="px-3 py-2.5 font-semibold">الترتيب</th>
                  <th className="px-3 py-2.5 font-semibold">القرار / المهمة</th>
                  <th className="px-3 py-2.5 font-semibold">الأثر المالي المتوقع (م.د)</th>
                  <th className="px-3 py-2.5 font-semibold">درجة المخاطرة (1–10)</th>
                  <th className="px-3 py-2.5 font-semibold">التصنيف</th>
                  <th className="px-3 py-2.5 font-semibold">مؤشر الأولوية</th>
                  <th className="px-3 py-2.5 font-semibold">حالة التنفيذ</th>
                  <th className="px-2 py-2.5 font-semibold text-center">إزالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleItems.map((item) => {
                  const meta = QUADRANT_META[item.quadrant];
                  const isSelected = selectedId === item.id;
                  const original = decisions.find((d) => d.id === item.id);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={`transition-colors ${
                        isSelected ? 'bg-sky-50/70' : 'hover:bg-slate-50/80'
                      } ${item.status === 'مكتمل' ? 'opacity-65' : ''}`}
                    >
                      <td className="px-3 py-3 font-num font-bold text-slate-900">#{item.rank}</td>
                      <td className="px-3 py-3 max-w-[270px]">
                        <div className={`font-semibold text-slate-900 ${item.status === 'مكتمل' ? 'line-through' : ''}`}>
                          {item.title}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          {item.id} · {item.owner}
                          {original?.notes ? ` · ${original.notes}` : ''}
                        </div>
                      </td>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min={10}
                            max={300}
                            step={5}
                            value={item.impactM}
                            aria-label={`الأثر المالي للقرار ${item.title}`}
                            onChange={(e) =>
                              handleUpdateDecision(item.id, { impactM: Number(e.target.value) })
                            }
                            className="w-20 accent-[#0F766E]"
                          />
                          <input
                            type="number"
                            min={5}
                            max={500}
                            step={5}
                            value={item.impactM}
                            aria-label={`قيمة الأثر المالي للقرار ${item.title}`}
                            onChange={(e) =>
                              handleUpdateDecision(item.id, { impactM: Number(e.target.value) || 0 })
                            }
                            className="font-num w-14 rounded border border-slate-200 bg-white px-1.5 py-1 text-center text-xs font-semibold text-slate-900"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min={1}
                            max={10}
                            step={0.5}
                            value={item.riskScore}
                            aria-label={`درجة المخاطرة للقرار ${item.title}`}
                            onChange={(e) =>
                              handleUpdateDecision(item.id, { riskScore: Number(e.target.value) })
                            }
                            className="w-20 accent-[#1D63B8]"
                          />
                          <input
                            type="number"
                            min={1}
                            max={10}
                            step={0.5}
                            value={item.riskScore}
                            aria-label={`قيمة درجة المخاطرة للقرار ${item.title}`}
                            onChange={(e) =>
                              handleUpdateDecision(item.id, { riskScore: Number(e.target.value) || 1 })
                            }
                            className="font-num w-12 rounded border border-slate-200 bg-white px-1.5 py-1 text-center text-xs font-semibold text-slate-900"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <StateLabel tone={meta.tone} label={meta.title} />
                      </td>
                      <td className="px-3 py-3 font-num font-bold text-[#1D63B8]">
                        {fmt2(item.priorityScore)}
                      </td>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={item.status}
                          aria-label={`حالة تنفيذ ${item.title}`}
                          onChange={(e) =>
                            handleUpdateDecision(item.id, {
                              status: e.target.value as DecisionTaskStatus,
                            })
                          }
                          className={`rounded-md border px-2 py-1 text-[11px] font-semibold focus:outline-none ${
                            statusTone(item.status) === 'success'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                              : statusTone(item.status) === 'warning'
                              ? 'border-amber-200 bg-amber-50 text-amber-800'
                              : 'border-slate-200 bg-white text-slate-700'
                          }`}
                        >
                          <option value="قيد الانتظار">قيد الانتظار</option>
                          <option value="قيد التنفيذ">قيد التنفيذ</option>
                          <option value="مكتمل">مكتمل</option>
                        </select>
                      </td>
                      <td className="px-2 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleDeleteDecision(item.id)}
                          title="حذف القرار من المصفوفة"
                          className="inline-flex rounded p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center text-xs text-slate-500">
            لا توجد مهام مطابقة لحالة التصفية المختارة.
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}
