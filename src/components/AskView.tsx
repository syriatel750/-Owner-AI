import React, { useEffect, useState } from 'react';
import {
  OWNER_DATA,
  filterTransactions,
  groupRows,
  sumRows,
  calcLeakageBridge,
  fmt,
  money,
  pct,
} from '../data/ownerData';
import {
  CHART_COLORS,
  WaterfallBridgeSvg,
  ProductProfitBarChart,
  RegionGroupedPerfChart,
  WorkingCapitalStackedChart,
  MixDonutChart,
} from './Charts';
import { SurfaceCard, StatusNotice } from './UiPrimitives';

interface AnswerResult {
  title: string;
  summary: string;
  chart?: React.ReactNode;
  table?: {
    headers: string[];
    rows: Array<Array<string | number>>;
  };
  note?: string;
  actionButton?: { label: string; onClick: () => void };
}

export function AskView({
  preset,
  onClearPreset,
  onOpenDecision,
  onNavigateTwin,
}: {
  preset: { region: string; category: string; period: string; question: string } | null;
  onClearPreset: () => void;
  onOpenDecision: (kind: 'warehouse' | 'private' | 'pricing') => void;
  onNavigateTwin: () => void;
}) {
  const [region, setRegion] = useState('الكل');
  const [category, setCategory] = useState('الكل');
  const [period, setPeriod] = useState(OWNER_DATA.latestPeriod);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<AnswerResult | null>(null);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);

  const runAnalysis = (qText: string, reg = region, cat = category, per = period) => {
    const q = qText.trim();
    if (!q) {
      setValidationMsg('اكتب سؤالاً أولاً أو اختر أحد الأسئلة السريعة.');
      return;
    }
    setValidationMsg(null);
    const norm = q.replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي');
    const detectedRegion = OWNER_DATA.regions.find((r) => norm.includes(r.replace(/[أإآ]/g, 'ا'))) || reg;
    const detectedProd = OWNER_DATA.products.find(
      (p) => norm.includes(p.name.replace(/[أإآ]/g, 'ا')) || norm.includes(p.id.toLowerCase())
    );
    const detectedCat = detectedProd?.cat || cat;

    const rs = filterTransactions(OWNER_DATA.transactions, {
      region: detectedRegion,
      cat: detectedCat,
      period: per,
    }).filter((r) => !detectedProd || r.product === detectedProd.id);
    const a = sumRows(rs);

    if (/مخزن|مستودع|افتتاح/.test(norm)) {
      if (norm.includes('بصر')) {
        onOpenDecision('warehouse');
        return;
      }
      setAnswer({
        title: 'القرار يحتاج معلومات إضافية',
        summary: 'محرك تقييم المخازن في هذه النسخة يدعم سيناريو البصرة فقط. لا توجد معطيات استثمار معتمدة لبناء تقييم مخزن في منطقة أخرى.',
      });
      return;
    }

    if (/علامة خاصة|العلامه الخاصه|تعبئ|تصنيع/.test(norm)) {
      onOpenDecision('private');
      return;
    }

    if (/تسرب|سبب|لماذا|انخفض|الربح|ارباح|تكلف/.test(norm) && !/اكثر|منتج|صنف|منطق/.test(norm)) {
      const v = calcLeakageBridge(detectedRegion, detectedCat);
      setAnswer({
        title: `تحليل فجوة الربح الإجمالي (${detectedRegion} · ${detectedCat})`,
        summary: `بلغ الربح الإجمالي في الفترة الأخيرة ${money(v.A.gp)} مقابل ${money(v.B.gp)} في الفترة السابقة، بتغير صافي قدره ${money(v.total)}.`,
        chart: (
          <WaterfallBridgeSvg
            steps={[
              { name: 'ربح سبتمبر', value: v.B.gp, type: 'total', note: 'الفترة السابقة' },
              { name: 'الكميات', value: v.bridge.volume, type: 'delta', note: 'تغير حجم المبيعات' },
              { name: 'السعر', value: v.bridge.price, type: 'delta', note: 'تغير السعر قبل الخصم' },
              { name: 'الخصومات', value: v.bridge.discount, type: 'delta', note: 'أثر الخصم التجاري' },
              { name: 'تكلفة الوحدة', value: v.bridge.cost, type: 'delta', note: 'تغير كلفة البضاعة' },
              { name: 'ربح أكتوبر', value: v.A.gp, type: 'total', note: 'الفترة الحالية' },
            ]}
          />
        ),
        note: 'هذا تفكيك محاسبي لتغير الربح الإجمالي وليس إثباتاً للسبب الإداري أو التجاري.',
      });
      return;
    }

    if (/ذمم|تحصيل|سيول|اموال|مخزون|راس مال/.test(norm)) {
      const overdue = OWNER_DATA.ar.reduce((acc, r) => acc + r.overdue, 0);
      const stock = OWNER_DATA.inventory.reduce((acc, r) => acc + r.value, 0);
      const slow = OWNER_DATA.inventory.reduce((acc, r) => acc + r.value * r.slow, 0);
      setAnswer({
        title: 'الأموال العاملة والتعرض الاقتصادي',
        summary: `إجمالي الذمم المتأخرة ${money(overdue)}، وإجمالي قيمة المخزون ${money(stock)} منها ${money(slow)} مخزون بطيء الحركة (تقديري). هذه أرصدة تعرض وليست خسائر محققة.`,
        chart: (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <WorkingCapitalStackedChart
              data={OWNER_DATA.ar}
              labelKey="region"
              firstKey="current"
              firstName="ذمم جارية"
              firstColor={CHART_COLORS.teal}
              secondKey="overdue"
              secondName="ذمم متأخرة"
              secondColor={CHART_COLORS.rose}
            />
            <MixDonutChart
              slices={[
                { label: 'مخزون طبيعي', value: stock - slow, color: CHART_COLORS.cobalt },
                { label: 'مخزون بطيء الحركة', value: slow, color: CHART_COLORS.amber },
              ]}
            />
          </div>
        ),
        table: {
          headers: ['المنطقة', 'ذمم جارية', 'ذمم متأخرة', 'نسبة التأخر'],
          rows: OWNER_DATA.ar.map((r) => [
            r.region,
            fmt(r.current),
            fmt(r.overdue),
            pct((100 * r.overdue) / (r.current + r.overdue)),
          ]),
        },
        note: 'لا تتوفر التزامات نقدية مجدولة لتحديد عجز نقدي مستقبلي مؤكد.',
      });
      return;
    }

    if (/خصم|خصومات|خصوم|اسعار|سعر|تسعير/.test(norm)) {
      const detail = groupRows(rs, 'product')
        .map((x) => ({ ...x, name: OWNER_DATA.products.find((p) => p.id === x.key)?.name || x.key }))
        .sort((x, y) => x.margin - y.margin);
      setAnswer({
        title: 'الأسعار والخصومات والربحية',
        summary: 'يظهر الهامش بعد الخصم وتكلفة البضاعة؛ ولا يثبت وحده أن رفع السعر سيحسن الربح دون اختبار حساسية الطلب.',
        chart: <ProductProfitBarChart data={detail} dataKey="margin" unit="%" />,
        table: {
          headers: ['الصنف', 'صافي المبيعات (مليون)', 'الربح الإجمالي (مليون)', 'الهامش'],
          rows: detail.map((x) => [x.name, fmt(x.revenue), fmt(x.gp), pct(x.margin)]),
        },
        actionButton: { label: 'اختبر تغيير السعر بافتراضات قابلة للتعديل ←', onClick: () => onOpenDecision('pricing') },
      });
      return;
    }

    if (/منتج|اصناف|صنف|الافضل|اكثر|اقل|ربحي|هامش/.test(norm) || detectedProd) {
      const isWeak = /اقل|ضعيف/.test(norm);
      const g = groupRows(rs, 'product')
        .map((x) => ({ ...x, name: OWNER_DATA.products.find((p) => p.id === x.key)?.name || x.key }))
        .sort((x, y) => (isWeak ? x.margin - y.margin : y.gp - x.gp));
      setAnswer({
        title: detectedProd ? `نتائج ${detectedProd.name}` : 'المساهمة والربحية حسب المنتجات',
        summary: `التحليل مبني على المبيعات والتكاليف في نطاق ${detectedRegion} / ${detectedCat} (${isWeak ? 'الأضعف هامشاً أولاً' : 'الأعلى ربحاً أولاً'}).`,
        chart: <ProductProfitBarChart data={g} dataKey="gp" />,
        table: {
          headers: ['الصنف', 'صافي المبيعات (مليون)', 'الربح الإجمالي (مليون)', 'الهامش'],
          rows: g.map((x) => [x.name, fmt(x.revenue), fmt(x.gp), pct(x.margin)]),
        },
        note: 'الهامش = الربح الإجمالي ÷ صافي المبيعات، قبل المصاريف التشغيلية الثابتة.',
      });
      return;
    }

    if (/قارن|مقارن|بغداد|البصرة|اربيل|الموصل|منطق|فرع|سوق/.test(norm)) {
      const g = groupRows(
        filterTransactions(OWNER_DATA.transactions, { region: 'الكل', cat: detectedCat, period: per }),
        'region'
      )
        .map((x) => ({
          region: x.key,
          revenue: x.revenue,
          cogs: x.cogs,
          gp: x.gp,
          margin: x.margin,
          quantity: x.qty,
        }))
        .sort((x, y) => y.gp - x.gp);
      setAnswer({
        title: 'مقارنة المناطق الاقتصادية',
        summary: 'المقارنة حسب صافي المبيعات والربح الإجمالي قبل تحميل المصاريف التشغيلية الخاصة بكل فرع.',
        chart: <RegionGroupedPerfChart data={g} />,
        table: {
          headers: ['المنطقة', 'صافي المبيعات (مليون)', 'الربح الإجمالي (مليون)', 'الهامش'],
          rows: g.map((x) => [x.region, fmt(x.revenue), fmt(x.gp), pct(x.margin)]),
        },
        note: 'أعلى ربح إجمالي لا يساوي بالضرورة أعلى ربح صافٍ بعد تكلفة التوزيع.',
      });
      return;
    }

    if (/مبيعات|اداء|نتائج|شركة|ماذا/.test(norm)) {
      const g = groupRows(rs, 'region').map((x) => ({
        region: x.key,
        revenue: x.revenue,
        cogs: x.cogs,
        gp: x.gp,
        margin: x.margin,
        quantity: x.qty,
      }));
      setAnswer({
        title: 'النتائج التجارية الأساسية',
        summary: `صافي المبيعات ${money(a.revenue)} والربح الإجمالي ${money(a.gp)} بهامش ${pct(a.revenue ? (100 * a.gp) / a.revenue : 0)}.`,
        chart: <RegionGroupedPerfChart data={g} />,
        table: {
          headers: ['المنطقة', 'صافي المبيعات (مليون)', 'الربح الإجمالي (مليون)', 'الهامش'],
          rows: g.map((x) => [x.region, fmt(x.revenue), fmt(x.gp), pct(x.margin)]),
        },
      });
      return;
    }

    setAnswer({
      title: 'لا تتوفر تغطية موثوقة لهذا السؤال',
      summary: 'لا يستطيع النموذج الحالي تفسير السؤال خارج نطاق بيانات المبيعات والمنتجات والفروع والذمم والمخزون. جرب أحد الأسئلة الجاهزة أعلاه.',
    });
  };

  useEffect(() => {
    if (preset) {
      setRegion(preset.region);
      setCategory(preset.category);
      setPeriod(preset.period);
      setQuestion(preset.question);
      runAnalysis(preset.question, preset.region, preset.category, preset.period);
      onClearPreset();
    }
  }, [preset]);

  const chips = [
    'ما المنتجات الأكثر ربحية؟',
    'قارن بغداد والبصرة',
    'لماذا تغير الربح الإجمالي؟',
    'ما حجم الذمم المتأخرة؟',
    'ما المنتجات ضعيفة الهامش؟',
    'هل الخصومات مجدية؟',
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">اسأل شركتك · قيّم قراراً</h2>
          <p className="mt-1 text-xs text-slate-500">إجابات ورسوم بيانية مباشرة من سجلات المنتجات والمناطق والتكاليف</p>
        </div>
        <button
          type="button"
          onClick={onNavigateTwin}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          مختبر القرار الاقتصادي المتكامل ←
        </button>
      </div>

      <SurfaceCard>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-4">
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            aria-label="المنطقة"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
          >
            <option value="الكل">جميع المناطق</option>
            {OWNER_DATA.regions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="الفئة"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
          >
            <option value="الكل">جميع الفئات</option>
            {[...new Set(OWNER_DATA.products.map((p) => p.cat))].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            aria-label="الفترة"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
          >
            {OWNER_DATA.months.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
            <option value="all">جميع الفترات</option>
          </select>
        </div>

        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey) runAnalysis(question);
          }}
          rows={3}
          placeholder="مثال: ما المنتجات الأكثر ربحية في البصرة؟ أو قارن بغداد وأربيل، أو قيّم مخزناً جديداً في البصرة"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 focus:border-[#1D63B8] focus:outline-none"
        />

        {validationMsg && <div className="mt-2 text-xs font-semibold text-rose-700">{validationMsg}</div>}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] text-slate-500">محرك تحليل محلي محدد القواعد — يستند إلى السجلات المتاحة فقط</span>
          <button
            type="button"
            onClick={() => runAnalysis(question)}
            className="rounded-lg bg-[#1D63B8] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#164E94]"
          >
            حلّل السؤال ←
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setQuestion(c);
                runAnalysis(c);
              }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-sky-50 hover:border-sky-200 hover:text-sky-900 transition-colors"
            >
              {c}
            </button>
          ))}
        </div>

        {answer && (
          <div className="mt-6 border-t border-slate-200 pt-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold text-[#1D63B8]">الاستجابة التحليلية</div>
                <h3 className="mt-1 text-lg font-bold text-slate-900">{answer.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setAnswer(null)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
              >
                مسح الإجابة
              </button>
            </div>

            <p className="text-sm leading-relaxed text-slate-700">{answer.summary}</p>

            {answer.chart && <div className="pt-2">{answer.chart}</div>}

            {answer.table && (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                      {answer.table.headers.map((h) => (
                        <th key={h} className="px-3 py-2.5 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {answer.table.rows.map((row, idx) => (
                      <tr key={idx}>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className={`px-3 py-2.5 ${cIdx > 0 ? 'font-num' : 'font-semibold text-slate-900'}`}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {answer.actionButton && (
              <div>
                <button
                  type="button"
                  onClick={answer.actionButton.onClick}
                  className="rounded-lg bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0D625B]"
                >
                  {answer.actionButton.label}
                </button>
              </div>
            )}

            {answer.note && <StatusNotice tone="neutral">{answer.note}</StatusNotice>}
          </div>
        )}
      </SurfaceCard>

      <div>
        <h3 className="text-base font-bold text-slate-900">محركات القرار المتاحة</h3>
        <p className="mt-0.5 text-xs text-slate-500">غيّر الافتراضات لتلاحظ أثرها الفوري على الرسوم البيانية والتوصية</p>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
          <button
            type="button"
            onClick={() => onOpenDecision('warehouse')}
            className="rounded-xl border border-slate-200 bg-white p-5 text-right transition-colors hover:border-[#1D63B8] hover:bg-slate-50/60"
          >
            <div className="text-sm font-bold text-slate-900">تقييم مخزن جديد (البصرة)</div>
            <div className="mt-1 text-xs text-slate-500">مقارنة الاستثمار بالتخزين الخارجي ومنحنى الاسترداد</div>
          </button>

          <button
            type="button"
            onClick={() => onOpenDecision('private')}
            className="rounded-xl border border-slate-200 bg-white p-5 text-right transition-colors hover:border-[#1D63B8] hover:bg-slate-50/60"
          >
            <div className="text-sm font-bold text-slate-900">فرصة العلامة الخاصة</div>
            <div className="mt-1 text-xs text-slate-500">تحليل نقطة التعادل والتكلفة والعائد المتوقع</div>
          </button>

          <button
            type="button"
            onClick={() => onOpenDecision('pricing')}
            className="rounded-xl border border-slate-200 bg-white p-5 text-right transition-colors hover:border-[#1D63B8] hover:bg-slate-50/60"
          >
            <div className="text-sm font-bold text-slate-900">محاكاة سعر منتج</div>
            <div className="mt-1 text-xs text-slate-500">منحنى حساسية الربح الإجمالي لتغيرات السعر والكمية</div>
          </button>
        </div>
      </div>
    </div>
  );
}
