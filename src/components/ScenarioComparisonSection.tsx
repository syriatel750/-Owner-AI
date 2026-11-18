import React, { useMemo, useState } from 'react';
import { ArrowLeftRight, BookmarkPlus } from 'lucide-react';
import {
  OWNER_DATA,
  SavedScenario,
  TransactionRow,
  computeTwinSimulation,
  fmt,
  pct,
  signFmt,
} from '../data/ownerData';
import { ScenarioSideBySideChart } from './Charts';
import { StateLabel, StatusNotice, SurfaceCard } from './UiPrimitives';

interface ComparisonConfig {
  label: string;
  pricePct: number;
  demandPct: number;
  costPct: number;
  discountPoints: number;
  arRecoveryPct: number;
  inventoryReleasePct: number;
}

const PRESET_SCENARIOS: Array<{ id: string; label: string; config: ComparisonConfig }> = [
  {
    id: 'preset-margin-discipline',
    label: 'ضبط الخصومات ورفع السعر',
    config: {
      label: 'ضبط الخصومات ورفع السعر',
      pricePct: 5,
      demandPct: -3,
      costPct: 0,
      discountPoints: -2,
      arRecoveryPct: 20,
      inventoryReleasePct: 15,
    },
  },
  {
    id: 'preset-growth-volume',
    label: 'التوسع وزيادة الحجم السوقي',
    config: {
      label: 'التوسع وزيادة الحجم السوقي',
      pricePct: -2,
      demandPct: 14,
      costPct: 1,
      discountPoints: 1,
      arRecoveryPct: 10,
      inventoryReleasePct: 25,
    },
  },
  {
    id: 'preset-liquidity-shield',
    label: 'حماية السيولة وتقليص رأس المال المقيّد',
    config: {
      label: 'حماية السيولة وتقليص رأس المال المقيّد',
      pricePct: 3,
      demandPct: -5,
      costPct: -2,
      discountPoints: -3,
      arRecoveryPct: 40,
      inventoryReleasePct: 35,
    },
  },
  {
    id: 'preset-baseline',
    label: 'الوضع الأساسي دون تعديل',
    config: {
      label: 'الوضع الأساسي دون تعديل',
      pricePct: 0,
      demandPct: 0,
      costPct: 0,
      discountPoints: 0,
      arRecoveryPct: 0,
      inventoryReleasePct: 0,
    },
  },
];

interface EvaluatedScenario {
  config: ComparisonConfig;
  sim: ReturnType<typeof computeTwinSimulation>;
  grossMarginPct: number;
  profitCashDelta: number;
  arCashImpact: number;
  invCashImpact: number;
  netLiquidityImpact: number;
  endingLockedCapital: number;
  workingCapitalReliefPct: number;
}

export function ScenarioComparisonSection({
  actualRows,
  period,
  region,
  cat,
  product,
  scenarios,
  onSaveScenario,
}: {
  actualRows: TransactionRow[];
  period: string;
  region: string;
  cat: string;
  product: string;
  scenarios: SavedScenario[];
  onSaveScenario: (s: SavedScenario) => void;
}) {
  const [scenarioA, setScenarioA] = useState<ComparisonConfig>(PRESET_SCENARIOS[0].config);
  const [scenarioB, setScenarioB] = useState<ComparisonConfig>(PRESET_SCENARIOS[1].config);
  const [presetKeyA, setPresetKeyA] = useState<string>(PRESET_SCENARIOS[0].id);
  const [presetKeyB, setPresetKeyB] = useState<string>(PRESET_SCENARIOS[1].id);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  // Scope Working Capital base (AR & Inventory)
  const wcBase = useMemo(() => {
    const arRows = OWNER_DATA.ar.filter((r) => region === 'الكل' || r.region === region);
    const invRows = OWNER_DATA.inventory.filter(
      (r) => (cat === 'الكل' || r.category === cat) && (product === 'الكل' || r.product === product)
    );
    const totalAr = arRows.reduce((s, r) => s + r.current + r.overdue, 0);
    const overdueAr = arRows.reduce((s, r) => s + r.overdue, 0);
    const totalInventory = invRows.reduce((s, r) => s + r.value, 0);
    const slowInventory = invRows.reduce((s, r) => s + r.value * r.slow, 0);
    const lockedCapital = overdueAr + slowInventory;
    return { totalAr, overdueAr, totalInventory, slowInventory, lockedCapital };
  }, [region, cat, product]);

  const evaluateScenario = (cfg: ComparisonConfig): EvaluatedScenario => {
    const sim = computeTwinSimulation(actualRows, {
      pricePct: cfg.pricePct,
      demandPct: cfg.demandPct,
      costPct: cfg.costPct,
      discountPoints: cfg.discountPoints,
    });
    const grossMarginPct = sim.next.revenue ? (100 * sim.next.gp) / sim.next.revenue : 0;
    const profitCashDelta = sim.delta;

    // Liquidity effects:
    // 1. Overdue AR collection frees cash (+), while incremental credit sales (35% of delta revenue) absorb cash (-)
    const deltaRevenue = sim.next.revenue - sim.base.revenue;
    const arCashImpact = wcBase.overdueAr * (cfg.arRecoveryPct / 100) - deltaRevenue * 0.35;

    // 2. Clearing slow inventory frees cash (+), while higher demand requires proportional inventory build (-)
    const invCashImpact =
      wcBase.slowInventory * (cfg.inventoryReleasePct / 100) -
      wcBase.totalInventory * (cfg.demandPct / 100) * 0.25;

    const netLiquidityImpact = profitCashDelta + arCashImpact + invCashImpact;
    const workingCapitalDelta = arCashImpact + invCashImpact;
    const endingLockedCapital = Math.max(0, wcBase.lockedCapital - workingCapitalDelta);
    const workingCapitalReliefPct = wcBase.lockedCapital
      ? (100 * workingCapitalDelta) / wcBase.lockedCapital
      : 0;

    return {
      config: cfg,
      sim,
      grossMarginPct,
      profitCashDelta,
      arCashImpact,
      invCashImpact,
      netLiquidityImpact,
      endingLockedCapital,
      workingCapitalReliefPct,
    };
  };

  const evalA = useMemo(() => evaluateScenario(scenarioA), [scenarioA, actualRows, wcBase]);
  const evalB = useMemo(() => evaluateScenario(scenarioB), [scenarioB, actualRows, wcBase]);

  const baseTotals = evalA.sim.base;
  const baseMarginPct = baseTotals.revenue ? (100 * baseTotals.gp) / baseTotals.revenue : 0;

  const applySelection = (slot: 'A' | 'B', key: string) => {
    const preset = PRESET_SCENARIOS.find((p) => p.id === key);
    if (preset) {
      if (slot === 'A') {
        setPresetKeyA(key);
        setScenarioA({ ...preset.config });
      } else {
        setPresetKeyB(key);
        setScenarioB({ ...preset.config });
      }
      return;
    }

    const saved = scenarios.find((s) => s.id === key);
    if (saved) {
      const cfg: ComparisonConfig = {
        label: saved.name,
        pricePct: Math.round(saved.price * 100),
        demandPct: Math.round(saved.demand * 100),
        costPct: Math.round(saved.cost * 100),
        discountPoints: Math.round(saved.discountPoints * 100),
        arRecoveryPct: 15,
        inventoryReleasePct: 15,
      };
      if (slot === 'A') {
        setPresetKeyA(key);
        setScenarioA(cfg);
      } else {
        setPresetKeyB(key);
        setScenarioB(cfg);
      }
    }
  };

  const swapScenarios = () => {
    const tempCfg = scenarioA;
    const tempKey = presetKeyA;
    setScenarioA(scenarioB);
    setPresetKeyA(presetKeyB);
    setScenarioB(tempCfg);
    setPresetKeyB(tempKey);
  };

  const saveSlotScenario = (slot: 'A' | 'B', ev: EvaluatedScenario) => {
    onSaveScenario({
      id: `SCN-${Date.now()}`,
      name: ev.config.label,
      scope: { period, region, cat, product },
      price: ev.config.pricePct / 100,
      demand: ev.config.demandPct / 100,
      cost: ev.config.costPct / 100,
      discountPoints: ev.config.discountPoints / 100,
      baseGp: ev.sim.base.gp,
      nextGp: ev.sim.next.gp,
      delta: ev.sim.delta,
      baseRev: ev.sim.base.revenue,
      nextRev: ev.sim.next.revenue,
      createdAt: new Date().toISOString().slice(0, 10),
    });
    setSaveNotice(`تم حفظ "${ev.config.label}" في ذاكرة القرار بنجاح.`);
  };

  const winnerLabel = (valA: number, valB: number, higherIsBetter = true): { label: string; tone: 'neutral' | 'success' | 'warning' } => {
    const diff = valB - valA;
    if (Math.abs(diff) < 0.05) return { label: 'متعادل', tone: 'neutral' };
    const bWins = higherIsBetter ? diff > 0 : diff < 0;
    return bWins
      ? { label: 'أفضل: (ب)', tone: 'success' }
      : { label: 'أفضل: (أ)', tone: 'warning' };
  };

  const chartData = [
    {
      metric: 'صافي المبيعات',
      base: Number(baseTotals.revenue.toFixed(1)),
      scenarioA: Number(evalA.sim.next.revenue.toFixed(1)),
      scenarioB: Number(evalB.sim.next.revenue.toFixed(1)),
      unit: 'م.د',
    },
    {
      metric: 'الربح الإجمالي',
      base: Number(baseTotals.gp.toFixed(1)),
      scenarioA: Number(evalA.sim.next.gp.toFixed(1)),
      scenarioB: Number(evalB.sim.next.gp.toFixed(1)),
      unit: 'م.د',
    },
    {
      metric: 'صافي أثر السيولة',
      base: 0,
      scenarioA: Number(evalA.netLiquidityImpact.toFixed(1)),
      scenarioB: Number(evalB.netLiquidityImpact.toFixed(1)),
      unit: 'م.د',
    },
    {
      metric: 'رأس المال المقيّد',
      base: Number(wcBase.lockedCapital.toFixed(1)),
      scenarioA: Number(evalA.endingLockedCapital.toFixed(1)),
      scenarioB: Number(evalB.endingLockedCapital.toFixed(1)),
      unit: 'م.د',
    },
  ];

  const profitWinner =
    Math.abs(evalB.sim.next.gp - evalA.sim.next.gp) < 0.1
      ? 'الربحية متقاربة بين السيناريوهين'
      : evalB.sim.next.gp > evalA.sim.next.gp
        ? `السيناريو (ب) يحقق ربحاً إجمالياً أعلى بمقدار ${fmt(evalB.sim.next.gp - evalA.sim.next.gp)} مليون د.ع`
        : `السيناريو (أ) يحقق ربحاً إجمالياً أعلى بمقدار ${fmt(evalA.sim.next.gp - evalB.sim.next.gp)} مليون د.ع`;

  const liquidityWinner =
    Math.abs(evalB.netLiquidityImpact - evalA.netLiquidityImpact) < 0.1
      ? 'الأثر على السيولة متعادل تقريباً'
      : evalB.netLiquidityImpact > evalA.netLiquidityImpact
        ? `السيناريو (ب) يولّد سيولة صافية أعلى بمقدار ${fmt(evalB.netLiquidityImpact - evalA.netLiquidityImpact)} مليون د.ع`
        : `السيناريو (أ) يولّد سيولة صافية أعلى بمقدار ${fmt(evalA.netLiquidityImpact - evalB.netLiquidityImpact)} مليون د.ع`;

  const renderConfigurator = (
    slot: 'A' | 'B',
    cfg: ComparisonConfig,
    setCfg: React.Dispatch<React.SetStateAction<ComparisonConfig>>,
    presetKey: string,
    ev: EvaluatedScenario
  ) => {
    const isA = slot === 'A';
    const accentColor = isA ? 'text-[#1D63B8]' : 'text-[#0F766E]';
    const accentSlider = isA ? 'accent-[#1D63B8]' : 'accent-[#0F766E]';
    const title = isA ? 'السيناريو الأول (أ)' : 'السيناريو الثاني (ب)';

    return (
      <SurfaceCard
        title={title}
        subtitle={`صافي أثر السيولة: ${signFmt(ev.netLiquidityImpact)} م.د · الربح المتوقع: ${fmt(ev.sim.next.gp)} م.د`}
        action={
          <button
            type="button"
            onClick={() => saveSlotScenario(slot, ev)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            <BookmarkPlus className="h-3.5 w-3.5" />
            <span>حفظ في الذاكرة</span>
          </button>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-700">
              اختيار قالب أو سيناريو محفوظ
              <select
                value={presetKey}
                onChange={(e) => applySelection(slot, e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
              >
                <optgroup label="سيناريوهات مقترحة">
                  {PRESET_SCENARIOS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </optgroup>
                {scenarios.length > 0 && (
                  <optgroup label="السيناريوهات المحفوظة من مختبر القرارات">
                    {scenarios.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </label>

            <label className="text-xs font-semibold text-slate-700">
              تسمية السيناريو في الجدول
              <input
                type="text"
                value={cfg.label}
                onChange={(e) => {
                  setCfg((prev) => ({ ...prev, label: e.target.value }));
                  if (slot === 'A') setPresetKeyA('custom');
                  else setPresetKeyB('custom');
                }}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-700">
              <div className="flex justify-between">
                <span>تغير سعر البيع</span>
                <span className={`font-num font-bold ${accentColor}`}>{signFmt(cfg.pricePct, 0)}%</span>
              </div>
              <input
                type="range"
                min={-15}
                max={20}
                step={1}
                value={cfg.pricePct}
                onChange={(e) => setCfg((prev) => ({ ...prev, pricePct: Number(e.target.value) }))}
                className={`mt-1.5 w-full ${accentSlider}`}
              />
            </label>

            <label className="text-xs font-semibold text-slate-700">
              <div className="flex justify-between">
                <span>تغير الطلب / الكمية</span>
                <span className={`font-num font-bold ${accentColor}`}>{signFmt(cfg.demandPct, 0)}%</span>
              </div>
              <input
                type="range"
                min={-30}
                max={30}
                step={1}
                value={cfg.demandPct}
                onChange={(e) => setCfg((prev) => ({ ...prev, demandPct: Number(e.target.value) }))}
                className={`mt-1.5 w-full ${accentSlider}`}
              />
            </label>

            <label className="text-xs font-semibold text-slate-700">
              <div className="flex justify-between">
                <span>تغير تكلفة الوحدة</span>
                <span className={`font-num font-bold ${accentColor}`}>{signFmt(cfg.costPct, 0)}%</span>
              </div>
              <input
                type="range"
                min={-15}
                max={20}
                step={1}
                value={cfg.costPct}
                onChange={(e) => setCfg((prev) => ({ ...prev, costPct: Number(e.target.value) }))}
                className={`mt-1.5 w-full ${accentSlider}`}
              />
            </label>

            <label className="text-xs font-semibold text-slate-700">
              <div className="flex justify-between">
                <span>تغير الخصم (نقطة مئوية)</span>
                <span className={`font-num font-bold ${accentColor}`}>{signFmt(cfg.discountPoints, 0)} نقطة</span>
              </div>
              <input
                type="range"
                min={-5}
                max={8}
                step={1}
                value={cfg.discountPoints}
                onChange={(e) => setCfg((prev) => ({ ...prev, discountPoints: Number(e.target.value) }))}
                className={`mt-1.5 w-full ${accentSlider}`}
              />
            </label>

            <label className="text-xs font-semibold text-slate-700">
              <div className="flex justify-between">
                <span>تحصيل الذمم المتأخرة</span>
                <span className={`font-num font-bold ${accentColor}`}>{fmt(cfg.arRecoveryPct, 0)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={60}
                step={5}
                value={cfg.arRecoveryPct}
                onChange={(e) => setCfg((prev) => ({ ...prev, arRecoveryPct: Number(e.target.value) }))}
                className={`mt-1.5 w-full ${accentSlider}`}
              />
            </label>

            <label className="text-xs font-semibold text-slate-700">
              <div className="flex justify-between">
                <span>تصريف المخزون البطيء</span>
                <span className={`font-num font-bold ${accentColor}`}>{fmt(cfg.inventoryReleasePct, 0)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={60}
                step={5}
                value={cfg.inventoryReleasePct}
                onChange={(e) => setCfg((prev) => ({ ...prev, inventoryReleasePct: Number(e.target.value) }))}
                className={`mt-1.5 w-full ${accentSlider}`}
              />
            </label>
          </div>
        </div>
      </SurfaceCard>
    );
  };

  const rows: Array<{
    section?: string;
    label: string;
    baseText: string;
    valAText: string;
    valBText: string;
    diffText: string;
    diffNum: number;
    higherIsBetter?: boolean;
    valANum: number;
    valBNum: number;
    highlight?: boolean;
  }> = [
    {
      section: 'النتائج المالية المتوقعة',
      label: 'الكمية المباعة (وحدة)',
      baseText: fmt(baseTotals.qty, 0),
      valAText: fmt(evalA.sim.next.qty, 0),
      valBText: fmt(evalB.sim.next.qty, 0),
      diffText: signFmt(evalB.sim.next.qty - evalA.sim.next.qty, 0),
      diffNum: evalB.sim.next.qty - evalA.sim.next.qty,
      valANum: evalA.sim.next.qty,
      valBNum: evalB.sim.next.qty,
      higherIsBetter: true,
    },
    {
      label: 'صافي قيمة المبيعات (مليون د.ع)',
      baseText: fmt(baseTotals.revenue),
      valAText: fmt(evalA.sim.next.revenue),
      valBText: fmt(evalB.sim.next.revenue),
      diffText: signFmt(evalB.sim.next.revenue - evalA.sim.next.revenue),
      diffNum: evalB.sim.next.revenue - evalA.sim.next.revenue,
      valANum: evalA.sim.next.revenue,
      valBNum: evalB.sim.next.revenue,
      higherIsBetter: true,
    },
    {
      label: 'تكلفة البضاعة المباعة (مليون د.ع)',
      baseText: fmt(baseTotals.cogs),
      valAText: fmt(evalA.sim.next.cogs),
      valBText: fmt(evalB.sim.next.cogs),
      diffText: signFmt(evalB.sim.next.cogs - evalA.sim.next.cogs),
      diffNum: evalB.sim.next.cogs - evalA.sim.next.cogs,
      valANum: evalA.sim.next.cogs,
      valBNum: evalB.sim.next.cogs,
      higherIsBetter: false,
    },
    {
      label: 'الربح الإجمالي المتوقع (مليون د.ع)',
      baseText: fmt(baseTotals.gp),
      valAText: fmt(evalA.sim.next.gp),
      valBText: fmt(evalB.sim.next.gp),
      diffText: signFmt(evalB.sim.next.gp - evalA.sim.next.gp),
      diffNum: evalB.sim.next.gp - evalA.sim.next.gp,
      valANum: evalA.sim.next.gp,
      valBNum: evalB.sim.next.gp,
      higherIsBetter: true,
      highlight: true,
    },
    {
      label: 'التغير في الربح الإجمالي عن الأساس (مليون د.ع)',
      baseText: '0.0',
      valAText: signFmt(evalA.sim.delta),
      valBText: signFmt(evalB.sim.delta),
      diffText: signFmt(evalB.sim.delta - evalA.sim.delta),
      diffNum: evalB.sim.delta - evalA.sim.delta,
      valANum: evalA.sim.delta,
      valBNum: evalB.sim.delta,
      higherIsBetter: true,
    },
    {
      label: 'هامش الربح الإجمالي المتوقع (%)',
      baseText: pct(baseMarginPct),
      valAText: pct(evalA.grossMarginPct),
      valBText: pct(evalB.grossMarginPct),
      diffText: `${signFmt(evalB.grossMarginPct - evalA.grossMarginPct)}%`,
      diffNum: evalB.grossMarginPct - evalA.grossMarginPct,
      valANum: evalA.grossMarginPct,
      valBNum: evalB.grossMarginPct,
      higherIsBetter: true,
    },
    {
      section: 'التأثير على السيولة ورأس المال العامل',
      label: 'التدفق النقدي من تغير الربحية (مليون د.ع)',
      baseText: '0.0',
      valAText: signFmt(evalA.profitCashDelta),
      valBText: signFmt(evalB.profitCashDelta),
      diffText: signFmt(evalB.profitCashDelta - evalA.profitCashDelta),
      diffNum: evalB.profitCashDelta - evalA.profitCashDelta,
      valANum: evalA.profitCashDelta,
      valBNum: evalB.profitCashDelta,
      higherIsBetter: true,
    },
    {
      label: 'صافي أثر الذمم المدينة والتحصيل على النقد (مليون د.ع)',
      baseText: '0.0',
      valAText: signFmt(evalA.arCashImpact),
      valBText: signFmt(evalB.arCashImpact),
      diffText: signFmt(evalB.arCashImpact - evalA.arCashImpact),
      diffNum: evalB.arCashImpact - evalA.arCashImpact,
      valANum: evalA.arCashImpact,
      valBNum: evalB.arCashImpact,
      higherIsBetter: true,
    },
    {
      label: 'صافي أثر المخزون والتصريف على النقد (مليون د.ع)',
      baseText: '0.0',
      valAText: signFmt(evalA.invCashImpact),
      valBText: signFmt(evalB.invCashImpact),
      diffText: signFmt(evalB.invCashImpact - evalA.invCashImpact),
      diffNum: evalB.invCashImpact - evalA.invCashImpact,
      valANum: evalA.invCashImpact,
      valBNum: evalB.invCashImpact,
      higherIsBetter: true,
    },
    {
      label: 'صافي الأثر الإجمالي على السيولة النقدية (مليون د.ع)',
      baseText: '0.0',
      valAText: signFmt(evalA.netLiquidityImpact),
      valBText: signFmt(evalB.netLiquidityImpact),
      diffText: signFmt(evalB.netLiquidityImpact - evalA.netLiquidityImpact),
      diffNum: evalB.netLiquidityImpact - evalA.netLiquidityImpact,
      valANum: evalA.netLiquidityImpact,
      valBNum: evalB.netLiquidityImpact,
      higherIsBetter: true,
      highlight: true,
    },
    {
      label: 'رأس المال العامل المقيّد بعد القرار (مليون د.ع)',
      baseText: fmt(wcBase.lockedCapital),
      valAText: fmt(evalA.endingLockedCapital),
      valBText: fmt(evalB.endingLockedCapital),
      diffText: signFmt(evalB.endingLockedCapital - evalA.endingLockedCapital),
      diffNum: evalB.endingLockedCapital - evalA.endingLockedCapital,
      valANum: evalA.endingLockedCapital,
      valBNum: evalB.endingLockedCapital,
      higherIsBetter: false,
    },
    {
      label: 'نسبة تحرير رأس المال العامل المقيّد (%)',
      baseText: '0.0%',
      valAText: `${signFmt(evalA.workingCapitalReliefPct)}%`,
      valBText: `${signFmt(evalB.workingCapitalReliefPct)}%`,
      diffText: `${signFmt(evalB.workingCapitalReliefPct - evalA.workingCapitalReliefPct)}%`,
      diffNum: evalB.workingCapitalReliefPct - evalA.workingCapitalReliefPct,
      valANum: evalA.workingCapitalReliefPct,
      valBNum: evalB.workingCapitalReliefPct,
      higherIsBetter: true,
    },
  ];

  return (
    <div className="space-y-6">
      {saveNotice && (
        <StatusNotice tone="success" title="تم الحفظ">
          {saveNotice}
        </StatusNotice>
      )}

      {/* Executive Verdict */}
      <StatusNotice tone="neutral" title="خلاصة المقارنة الثنائية للربحية والسيولة">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div>• <strong>الربحية:</strong> {profitWinner}.</div>
            <div>• <strong>السيولة:</strong> {liquidityWinner}.</div>
          </div>
          <button
            type="button"
            onClick={swapScenarios}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            <span>تبديل (أ ↔ ب)</span>
          </button>
        </div>
      </StatusNotice>

      {/* Two Side-by-Side Scenario Configurators */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {renderConfigurator('A', scenarioA, setScenarioA, presetKeyA, evalA)}
        {renderConfigurator('B', scenarioB, setScenarioB, presetKeyB, evalB)}
      </div>

      {/* Unified Side-by-Side Comparison Table */}
      <SurfaceCard
        title="جدول مقارنة السيناريوهين جنباً إلى جنب (النتائج المالية والسيولة)"
        subtitle={`النطاق الحالي: ذمم متأخرة ${fmt(wcBase.overdueAr)} م.د · مخزون بطيء الحركة ${fmt(wcBase.slowInventory)} م.د`}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                <th className="px-3 py-3 font-bold">البند المالي / مؤشر السيولة</th>
                <th className="px-3 py-3 font-semibold text-slate-500">الأساس الحالي</th>
                <th className="px-3 py-3 font-bold text-[#1D63B8]">
                  (أ) {scenarioA.label}
                </th>
                <th className="px-3 py-3 font-bold text-[#0F766E]">
                  (ب) {scenarioB.label}
                </th>
                <th className="px-3 py-3 font-semibold">الفرق (ب − أ)</th>
                <th className="px-3 py-3 font-semibold">الأفضلية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => {
                const win = winnerLabel(row.valANum, row.valBNum, row.higherIsBetter ?? true);
                const diffGood = row.higherIsBetter === false ? row.diffNum <= 0 : row.diffNum >= 0;
                return (
                  <React.Fragment key={row.label}>
                    {row.section && (
                      <tr className="bg-slate-100/80">
                        <td colSpan={6} className="px-3 py-2 text-[11px] font-bold text-slate-700">
                          {row.section}
                        </td>
                      </tr>
                    )}
                    <tr className={row.highlight ? 'bg-sky-50/50 font-semibold' : 'hover:bg-slate-50/70'}>
                      <td className="px-3 py-3 font-semibold text-slate-900">{row.label}</td>
                      <td className="px-3 py-3 font-num text-slate-500">{row.baseText}</td>
                      <td className="px-3 py-3 font-num font-bold text-[#1D63B8]">{row.valAText}</td>
                      <td className="px-3 py-3 font-num font-bold text-[#0F766E]">{row.valBText}</td>
                      <td
                        className={`px-3 py-3 font-num font-bold ${
                          Math.abs(row.diffNum) < 0.05
                            ? 'text-slate-500'
                            : diffGood
                              ? 'text-emerald-700'
                              : 'text-rose-700'
                        }`}
                      >
                        {row.diffText}
                      </td>
                      <td className="px-3 py-3">
                        <StateLabel tone={win.tone} label={win.label} />
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
          يُحسب صافي أثر السيولة من مجموع: التغير في الربح الإجمالي + النقد المحرر من تحصيل الذمم المتأخرة وتصريف المخزون البطيء − رأس المال العامل الإضافي المطلوب لتمويل زيادة المبيعات أو المخزون.
        </p>
      </SurfaceCard>

      {/* Side-by-Side Comparison Chart */}
      <SurfaceCard
        title="المقارنة البصرية للربحية والسيولة (الأساس مقابل السيناريوهين)"
        subtitle="بالمليون دينار عراقي وفق افتراضات السيناريو الأول والثاني"
      >
        <ScenarioSideBySideChart
          data={chartData}
          nameA={`(أ) ${scenarioA.label}`}
          nameB={`(ب) ${scenarioB.label}`}
        />
      </SurfaceCard>
    </div>
  );
}
