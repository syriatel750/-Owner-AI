import React, { useEffect, useState } from 'react';
import {
  LayoutGrid,
  Compass,
  FolderKanban,
  SlidersHorizontal,
  MessageSquareText,
  Settings,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import {
  OWNER_DATA,
  CaseItem,
  SavedScenario,
  DecisionRecord,
} from './data/ownerData';
import { CockpitView } from './components/CockpitView';
import { ReviewView } from './components/ReviewView';
import { CasesView } from './components/CasesView';
import { TwinView, TwinTabId } from './components/TwinView';
import { AskView } from './components/AskView';
import { CaseModal, DecisionModal, SetupModal, TrustModal } from './components/Modals';
import {
  DEFAULT_LIQUIDITY_SETTINGS,
  LIQUIDITY_SETTINGS_STORAGE_KEY,
  LiquiditySettings,
} from './utils/liquidityAlerts';

type NavView = 'cockpit' | 'review' | 'cases' | 'twin' | 'ask';

const NAV_ITEMS: Array<{ id: NavView; label: string; shortLabel: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'cockpit', label: 'مركز المالك التنفيذي', shortLabel: 'مركز المالك', icon: LayoutGrid },
  { id: 'review', label: 'مراجعتي', shortLabel: 'مراجعتي', icon: Compass },
  { id: 'cases', label: 'القضايا الجوهرية', shortLabel: 'القضايا', icon: FolderKanban },
  { id: 'twin', label: 'التوأم الاقتصادي', shortLabel: 'التوأم', icon: SlidersHorizontal },
  { id: 'ask', label: 'اسأل وقيّم', shortLabel: 'اسأل وقيّم', icon: MessageSquareText },
];

// Task-oriented navigation; existing views and routes are retained.
const NAV_GROUPS: Array<{ id: string; label: string; items: NavView[] }> = [
  { id: 'vision', label: 'الرؤية التنفيذية', items: ['cockpit', 'review'] },
  { id: 'analysis', label: 'التحليل والسيناريوهات', items: ['twin', 'ask'] },
  { id: 'control', label: 'القرارات والرقابة', items: ['cases'] },
];

const VIEW_TITLES: Record<NavView, string> = {
  cockpit: 'مركز المالك · الاستخبارات الاقتصادية',
  review: 'المراجعة التنفيذية',
  cases: 'سجل القضايا الجوهرية',
  twin: 'التوأم الاقتصادي الرقمي',
  ask: 'الاستفسارات وتقييم القرارات',
};

const STORAGE_KEYS = {
  cases: 'owner_ai_cases_v1',
  scenarios: 'owner_ai_scenarios_v1',
  decisions: 'owner_ai_decisions_v1',
};

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [activeNav, setActiveNav] = useState<NavView>('cockpit');
  const activeGroupId = NAV_GROUPS.find((g) => g.items.includes(activeNav))?.id ?? 'vision';
  const [twinTab, setTwinTab] = useState<TwinTabId>('model');

  const [cases, setCases] = useState<CaseItem[]>(() => loadJson(STORAGE_KEYS.cases, OWNER_DATA.initialCases));
  const [scenarios, setScenarios] = useState<SavedScenario[]>(() => loadJson(STORAGE_KEYS.scenarios, []));
  const [decisions, setDecisions] = useState<DecisionRecord[]>(() => loadJson(STORAGE_KEYS.decisions, []));
  const [liquiditySettings, setLiquiditySettings] = useState<LiquiditySettings>(() =>
    loadJson(LIQUIDITY_SETTINGS_STORAGE_KEY, DEFAULT_LIQUIDITY_SETTINGS)
  );

  const [openCaseId, setOpenCaseId] = useState<string | null>(null);
  const [decisionModal, setDecisionModal] = useState<{ kind: 'warehouse' | 'private' | 'pricing'; productId?: string } | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [showTrust, setShowTrust] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [askPreset, setAskPreset] = useState<{
    region: string;
    category: string;
    period: string;
    question: string;
  } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.cases, JSON.stringify(cases));
    } catch {}
  }, [cases]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.scenarios, JSON.stringify(scenarios));
    } catch {}
  }, [scenarios]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.decisions, JSON.stringify(decisions));
    } catch {}
  }, [decisions]);

  useEffect(() => {
    try {
      localStorage.setItem(LIQUIDITY_SETTINGS_STORAGE_KEY, JSON.stringify(liquiditySettings));
    } catch {}
  }, [liquiditySettings]);

  const navigate = (view: NavView, nextTwinTab?: string) => {
    setActiveNav(view);
    if (view === 'twin' && nextTwinTab) {
      setTwinTab(nextTwinTab as TwinTabId);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateCaseStatus = (caseId: string, status: string, reason: string) => {
    const today = new Date().toISOString().slice(0, 10);
    setCases((prev) =>
      prev.map((c) =>
        c.id === caseId
          ? {
              ...c,
              status,
              closed: status === 'مغلقة',
              history: [{ date: today, note: `${status} — ${reason}` }, ...c.history],
            }
          : c
      )
    );
  };

  const handleCreateDecision = (rec: {
    recommendationKey: string;
    title: string;
    action: string;
    period: string;
    baselineValue: number | null;
    baselineSource: 'manual' | 'verified_source';
  }) => {
    const today = new Date().toISOString().slice(0, 10);
    const next: DecisionRecord = {
      id: `DEC-${Date.now()}`,
      recommendationKey: rec.recommendationKey,
      title: rec.title,
      action: rec.action,
      period: rec.period,
      status: 'proposed',
      version: 1,
      baselineValue: rec.baselineValue,
      baselineSource: rec.baselineSource,
      outcomes: [],
      history: [{ date: today, note: 'تم إنشاء مسودة القرار محلياً' }],
    };
    setDecisions((prev) => [next, ...prev]);
  };

  const handleTransitionDecision = (id: string, nextStatus: DecisionRecord['status'], reason: string) => {
    const today = new Date().toISOString().slice(0, 10);
    setDecisions((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              status: nextStatus,
              version: d.version + 1,
              history: [{ date: today, note: `${nextStatus}: ${reason}` }, ...d.history],
            }
          : d
      )
    );
  };

  const handleRecordOutcome = (
    id: string,
    observedPeriod: string,
    observedValue: number,
    externalFactors: string,
    evidenceNote: string
  ) => {
    const today = new Date().toISOString().slice(0, 10);
    setDecisions((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const change = d.baselineValue !== null ? observedValue - d.baselineValue : 0;
        return {
          ...d,
          version: d.version + 1,
          outcomes: [
            {
              observedPeriod,
              observedValue,
              observedChange: change,
              externalFactors,
              evidenceNote,
              recordedAt: today,
            },
            ...d.outcomes,
          ],
        };
      })
    );
  };

  const handleResetAll = () => {
    setCases(OWNER_DATA.initialCases);
    setScenarios([]);
    setDecisions([]);
    setLiquiditySettings(DEFAULT_LIQUIDITY_SETTINGS);
    setShowResetConfirm(false);
    navigate('cockpit');
  };

  const activeCase = openCaseId ? cases.find((c) => c.id === openCaseId) || null : null;

  return (
    <div className="min-h-screen bg-[#F4F7FA] text-[#14243B] lg:flex">
      {/* Desktop Executive Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:sticky lg:top-0 lg:h-screen bg-[#0D1B2A] text-slate-200 px-4 py-6 border-l border-slate-800">
        <div className="pb-5 border-b border-white/10 px-2">
          <div className="font-display text-2xl font-black tracking-tight text-white">
            OWNER <span className="text-teal-400">AI</span>
          </div>
          <div className="mt-1 text-[11px] font-medium text-slate-400">
            مراجعة الأعمال والاستخبارات الاقتصادية
          </div>
        </div>

        <div className="my-5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-3">
          <div className="text-sm font-bold text-white">{OWNER_DATA.meta.company}</div>
          <div className="mt-0.5 text-[11px] text-slate-400">{OWNER_DATA.meta.sector}</div>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto" aria-label="التنقل الرئيسي">
          {NAV_GROUPS.map((group) => (
            <div key={group.id} className="space-y-1">
              <div className="px-3.5 pb-1 text-[10px] font-bold tracking-wide text-slate-400">{group.label}</div>
              {group.items.map((id) => {
                const item = NAV_ITEMS.find((n) => n.id === id);
                if (!item) return null;
                const Icon = item.icon;
                const active = activeNav === item.id;
                return (
                  <button key={item.id} type="button" onClick={() => navigate(item.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-right text-xs font-semibold transition-colors ${
                      active ? 'bg-[#0F766E] text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}>
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="mt-auto border-t border-white/10 pt-4 space-y-1 text-xs">
          <button
            type="button"
            onClick={() => setShowSetup(true)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-right text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <Settings className="h-3.5 w-3.5 shrink-0" />
            <span>سياق الشركة والأهداف</span>
          </button>
          <button
            type="button"
            onClick={() => setShowTrust(true)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-right text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <span>الثقة وحدود البيانات</span>
          </button>
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-right text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0" />
            <span>إعادة ضبط التجربة</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sticky Nav (<= 15% viewport height) */}
      <div className="no-print sticky top-0 z-30 border-b border-slate-800 bg-[#0D1B2A] px-3 py-2 text-white lg:hidden">
        <div className="flex items-center justify-between gap-2 pb-2">
          <div className="font-display text-base font-black">
            OWNER <span className="text-teal-400">AI</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSetup(true)}
              className="rounded-md bg-white/10 px-2.5 py-1 text-[11px] text-slate-200"
            >
              الإعدادات
            </button>
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label="مجموعات التنقل">
          {NAV_GROUPS.map((group) => (
            <button key={group.id} type="button" role="tab" aria-selected={activeGroupId === group.id}
              onClick={() => navigate(group.items[0])}
              className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold ${
                activeGroupId === group.id ? 'bg-teal-700 text-white' : 'text-slate-300 hover:bg-white/10'
              }`}>
              {group.label}
            </button>
          ))}
        </div>
        <nav className="flex items-center gap-1 overflow-x-auto pb-0.5" aria-label="صفحات المجموعة">
          {NAV_ITEMS.filter((item) => NAV_GROUPS.find((g) => g.id === activeGroupId)?.items.includes(item.id)).map((item) => {
            const active = activeNav === item.id;
            return (
              <button key={item.id} type="button" onClick={() => navigate(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold whitespace-nowrap ${
                  active ? 'bg-[#0F766E] text-white' : 'text-slate-300 hover:bg-white/10'
                }`}>
                {item.shortLabel}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Workspace */}
      <div className="min-w-0 flex-1 flex flex-col">
        {/* Clean 1-Row Top Bar */}
        <header className="no-print hidden lg:flex h-16 items-center justify-between gap-8 border-b border-slate-200 bg-white px-8">
          <div className="flex items-center gap-2.5 text-sm">
            <span className="font-semibold text-slate-400">OWNER AI</span>
            <span className="text-slate-300">/</span>
            <h1 className="font-bold text-slate-900">{VIEW_TITLES[activeNav]}</h1>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500 whitespace-nowrap shrink-0">
            <span>{OWNER_DATA.meta.dataTag}</span>
            <span aria-hidden="true">·</span>
            <span>نموذج تفاعلي محلي</span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-8 sm:py-7">
          {activeNav === 'cockpit' && (
            <CockpitView
              onNavigate={navigate}
              onOpenDecision={(kind) => setDecisionModal({ kind })}
              decisions={decisions}
              liquiditySettings={liquiditySettings}
              onOpenSettings={() => setShowSetup(true)}
            />
          )}

          {activeNav === 'review' && (
            <ReviewView
              cases={cases}
              onOpenCase={(id) => setOpenCaseId(id)}
              onOpenDecision={(kind) => setDecisionModal({ kind })}
              onNavigate={navigate}
              onAskWithPreset={(opts) => {
                setAskPreset(opts);
                navigate('ask');
              }}
            />
          )}

          {activeNav === 'cases' && (
            <CasesView cases={cases} onOpenCase={(id) => setOpenCaseId(id)} />
          )}

          {activeNav === 'twin' && (
            <TwinView
              activeTab={twinTab}
              onTabChange={setTwinTab}
              scenarios={scenarios}
              onSaveScenario={(s) => setScenarios((prev) => [s, ...prev])}
              decisions={decisions}
              onCreateDecision={handleCreateDecision}
              onTransitionDecision={handleTransitionDecision}
              onRecordOutcome={handleRecordOutcome}
              onOpenDecisionModal={(kind, productId) => setDecisionModal({ kind, productId })}
            />
          )}

          {activeNav === 'ask' && (
            <AskView
              preset={askPreset}
              onClearPreset={() => setAskPreset(null)}
              onOpenDecision={(kind) => setDecisionModal({ kind })}
              onNavigateTwin={() => navigate('twin', 'simulate')}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      {activeCase && (
        <CaseModal
          caseItem={activeCase}
          onClose={() => setOpenCaseId(null)}
          onUpdateStatus={handleUpdateCaseStatus}
          onOpenPricing={() => setDecisionModal({ kind: 'pricing' })}
        />
      )}

      {decisionModal && (
        <DecisionModal
          kind={decisionModal.kind}
          initialProductId={decisionModal.productId}
          onClose={() => setDecisionModal(null)}
        />
      )}

      {showSetup && (
        <SetupModal
          onClose={() => setShowSetup(false)}
          liquiditySettings={liquiditySettings}
          onSaveLiquiditySettings={setLiquiditySettings}
        />
      )}
      {showTrust && <TrustModal onClose={() => setShowTrust(false)} />}

      {showResetConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-base font-bold text-slate-900">إعادة ضبط بيانات التجربة؟</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              سيؤدي هذا الإجراء إلى إعادة حالات القضايا ومسح السيناريوهات والقرارات المحفوظة في المتصفح والعودة إلى الحالة الافتراضية.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleResetAll}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
              >
                تأكيد إعادة الضبط
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
