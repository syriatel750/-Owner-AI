import React from 'react';
import { AlertTriangle, BellRing, CheckCircle2, Settings, ShieldAlert, X } from 'lucide-react';
import { fmt, pct, signFmt } from '../data/ownerData';
import { LiquiditySettings, SmartAlert, WorkingCapitalAnalysis } from '../utils/liquidityAlerts';
import { StateLabel, SurfaceCard } from './UiPrimitives';

function severityTone(severity: SmartAlert['severity']): 'danger' | 'warning' | 'success' {
  if (severity === 'critical') return 'danger';
  if (severity === 'warning') return 'warning';
  return 'success';
}

function severityLabel(severity: SmartAlert['severity']): string {
  if (severity === 'critical') return 'حرج · تجاوز الحد الأدنى';
  if (severity === 'warning') return 'تحذير · اقتراب من الحد الأدنى';
  return 'مستقر · ضمن الأمان';
}

function LiquidityGaugeBar({
  analysis,
  settings,
}: {
  analysis: WorkingCapitalAnalysis;
  settings: LiquiditySettings;
}) {
  const maxScale = Math.max(settings.minAvailableLiquidityM * 1.6, analysis.estimatedFreeLiquidity * 1.15, 360);
  const currentPct = Math.min(100, Math.max(2, (analysis.estimatedFreeLiquidity / maxScale) * 100));
  const minPct = Math.min(95, (settings.minAvailableLiquidityM / maxScale) * 100);
  const warnPct = Math.min(98, (analysis.warningFloorM / maxScale) * 100);

  const barColor =
    analysis.liquidityStatus === 'critical'
      ? 'bg-rose-600'
      : analysis.liquidityStatus === 'warning'
        ? 'bg-amber-500'
        : 'bg-emerald-600';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-slate-700">
          السيولة الحرة التقديرية:{' '}
          <strong className="font-num text-sm text-slate-900">{fmt(analysis.estimatedFreeLiquidity)} م.د</strong>
        </span>
        <span className="text-slate-500">
          الحد الأدنى: <strong className="font-num text-slate-800">{fmt(settings.minAvailableLiquidityM, 0)} م.د</strong>
          {' · '}
          نطاق الإنذار المبكر: <strong className="font-num text-slate-800">{fmt(analysis.warningFloorM)} م.د</strong>
        </span>
      </div>

      <div className="relative h-3.5 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200">
        {/* Warning zone tint between minFloor and warningFloor */}
        <div
          className="absolute inset-y-0 bg-amber-100/80"
          style={{ left: `${minPct}%`, width: `${Math.max(0, warnPct - minPct)}%` }}
        />
        {/* Current liquidity fill */}
        <div
          className={`relative z-10 h-full transition-all duration-300 ${barColor}`}
          style={{ width: `${currentPct}%` }}
        />
        {/* Minimum threshold marker */}
        <div
          className="absolute inset-y-0 z-20 w-0.5 bg-slate-900"
          style={{ left: `${minPct}%` }}
          title={`الحد الأدنى: ${fmt(settings.minAvailableLiquidityM, 0)} م.د`}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
        <span>
          الفارق عن الحد الأدنى:{' '}
          <strong
            className={`font-num ${
              analysis.distanceToMinM < 0
                ? 'text-rose-700'
                : analysis.liquidityStatus === 'warning'
                  ? 'text-amber-700'
                  : 'text-emerald-700'
            }`}
          >
            {signFmt(analysis.distanceToMinM)} م.د ({signFmt(analysis.distanceToMinPct)}%)
          </strong>
        </span>
        <span>
          تغطية السيولة: <strong className="font-num text-slate-800">{fmt(analysis.coverageDays)} يوم</strong>
          {' · '}الذمم المتأخرة: <strong className="font-num text-slate-800">{pct(analysis.overdueArPct)}</strong>
          {' · '}المخزون البطيء: <strong className="font-num text-slate-800">{pct(analysis.slowInventoryPct)}</strong>
        </span>
      </div>
    </div>
  );
}

/* Compact Smart Alert Monitor for Cockpit "Brief" Tab */
export function LiquidityAlertStrip({
  analysis,
  settings,
  onOpenSettings,
  onNavigateTab,
  onTriggerReCheck,
}: {
  analysis: WorkingCapitalAnalysis;
  settings: LiquiditySettings;
  onOpenSettings: () => void;
  onNavigateTab: (tab: 'capital' | 'margin') => void;
  onTriggerReCheck: () => void;
}) {
  const criticalCount = analysis.alerts.filter((a) => a.severity === 'critical').length;
  const warningCount = analysis.alerts.filter((a) => a.severity === 'warning').length;

  return (
    <SurfaceCard
      title="نظام الإنذار الذكي للسيولة ورأس المال العامل"
      subtitle={`تحليل مباشر لفترة ${analysis.periodLabel} مقابل الحدود الدنيا المعتمدة في الإعدادات`}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <StateLabel tone={severityTone(analysis.liquidityStatus)} label={severityLabel(analysis.liquidityStatus)} />
          <button
            type="button"
            onClick={onTriggerReCheck}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <BellRing className="h-3.5 w-3.5" />
            <span>فحص فوري</span>
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>حدود الإعدادات</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <LiquidityGaugeBar analysis={analysis} settings={settings} />

        {analysis.alerts.length > 0 ? (
          <div className="divide-y divide-slate-100 border-t border-slate-100 pt-2">
            {analysis.alerts.map((alert) => (
              <div key={alert.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-2 last:pb-0 text-xs">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  {alert.severity === 'critical' ? (
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900">{alert.title}</span>
                      <span className="font-num text-[11px] font-semibold text-slate-500">
                        ({alert.metricValue} مقابل {alert.thresholdValue})
                      </span>
                    </div>
                    <p className="mt-0.5 text-slate-600 leading-relaxed">{alert.message}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => (alert.targetTab === 'settings' ? onOpenSettings() : onNavigateTab(alert.targetTab))}
                  className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {alert.actionLabel} ←
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-xs text-emerald-900">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
            <span>جميع مؤشرات السيولة ورأس المال العامل تقع حالياً ضمن الحدود الآمنة المحددة في الإعدادات.</span>
          </div>
        )}

        {(criticalCount > 0 || warningCount > 0) && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
            <span>
              التنبيهات النشطة: <strong className="font-num text-rose-700">{criticalCount} حرجة</strong> ·{' '}
              <strong className="font-num text-amber-700">{warningCount} تحذير مبكر</strong>
              {!settings.alertsEnabled && ' (التنبيهات البصرية المنبثقة متوقفة من الإعدادات)'}
            </span>
            <button
              type="button"
              onClick={() => onNavigateTab('capital')}
              className="font-semibold text-[#1D63B8] hover:underline"
            >
              تفكيك كامل لرأس المال العامل ←
            </button>
          </div>
        )}
      </div>
    </SurfaceCard>
  );
}

/* Detailed Working Capital & Liquidity Alert Analyzer for "Capital Shield" Tab */
export function LiquidityAlertFullPanel({
  analysis,
  settings,
  acknowledgedIds,
  onAcknowledge,
  onOpenSettings,
  onTriggerReCheck,
}: {
  analysis: WorkingCapitalAnalysis;
  settings: LiquiditySettings;
  acknowledgedIds: string[];
  onAcknowledge: (id: string) => void;
  onOpenSettings: () => void;
  onTriggerReCheck: () => void;
}) {
  return (
    <SurfaceCard
      title="محلل مخاطر السيولة والإنذار المبكر لرأس المال العامل"
      subtitle={`يقارن السيولة المتاحة التقديرية بالحد الأدنى (${fmt(settings.minAvailableLiquidityM, 0)} م.د) وهامش الإنذار (+${fmt(settings.warningBufferPct, 0)}%)`}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onTriggerReCheck}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <BellRing className="h-3.5 w-3.5" />
            <span>إعادة تقييم وإرسال التنبيهات</span>
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F766E] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0D625B]"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>تعديل حدود الإعدادات</span>
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <LiquidityGaugeBar analysis={analysis} settings={settings} />

        {/* Working capital drag breakdown */}
        <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4 text-xs">
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="text-slate-500">ربح الفترة ({analysis.periodLabel})</div>
            <div className="mt-1 font-num text-base font-bold text-slate-900">{fmt(analysis.periodGp)} م.د</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="text-slate-500">سحب رأس المال المقيّد</div>
            <div className="mt-1 font-num text-base font-bold text-rose-700">-{fmt(analysis.workingCapitalDrag)} م.د</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="text-slate-500">أيام التغطية النقدية</div>
            <div className="mt-1 font-num text-base font-bold text-slate-900">
              {fmt(analysis.coverageDays)} يوم <span className="text-[11px] font-normal text-slate-500">(حد: {fmt(settings.minCoverageDays, 0)})</span>
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="text-slate-500">معدل الصرف اليومي لتكلفة البضاعة</div>
            <div className="mt-1 font-num text-base font-bold text-slate-900">{fmt(analysis.dailyCogsOutflow)} م.د/يوم</div>
          </div>
        </div>

        {/* Alerts List */}
        {analysis.alerts.length > 0 ? (
          <div className="divide-y divide-slate-100 border-t border-slate-200 pt-2">
            {analysis.alerts.map((alert) => {
              const isAck = acknowledgedIds.includes(alert.id);
              return (
                <div key={alert.id} className="flex flex-wrap items-start justify-between gap-4 py-3.5 text-xs">
                  <div className="flex items-start gap-3 flex-1 min-w-[260px]">
                    {alert.severity === 'critical' ? (
                      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    )}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900">{alert.title}</span>
                        <StateLabel tone={severityTone(alert.severity)} label={alert.severity === 'critical' ? 'حرج' : 'تحذير مبكر'} />
                        {isAck && <StateLabel tone="neutral" label="تمت المراجعة" />}
                      </div>
                      <p className="mt-1 text-slate-600 leading-relaxed">{alert.message}</p>
                      <div className="mt-1.5 text-[11px] text-slate-500">
                        القيمة المرصودة: <strong className="font-num text-slate-800">{alert.metricValue}</strong>
                        {' · '}
                        العتبة المعتمدة: <strong className="font-num text-slate-800">{alert.thresholdValue}</strong>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAcknowledge(alert.id)}
                    className={`shrink-0 rounded-lg border px-3 py-1.5 font-semibold transition-colors ${
                      isAck
                        ? 'border-slate-200 bg-slate-50 text-slate-500'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {isAck ? 'مؤكد استلامه' : 'تسجيل الاطلاع'}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-xs text-emerald-900">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
            <span>لا توجد إنذارات نشطة حالياً؛ السيولة ونسب الذمم والمخزون ضمن الحدود المعتمدة.</span>
          </div>
        )}
      </div>
    </SurfaceCard>
  );
}

/* Floating In-App Visual Toast Notifications */
export function InAppLiquidityToasts({
  alerts,
  enabled,
  dismissedIds,
  onDismiss,
  onDismissAll,
  onOpenCapital,
  onOpenSettings,
}: {
  alerts: SmartAlert[];
  enabled: boolean;
  dismissedIds: string[];
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
  onOpenCapital: () => void;
  onOpenSettings: () => void;
}) {
  if (!enabled) return null;

  const visible = alerts.filter((a) => !dismissedIds.includes(a.id)).slice(0, 3);
  if (!visible.length) return null;

  return (
    <aside
      aria-label="تنبيهات السيولة الفورية"
      className="fixed bottom-4 left-4 z-40 flex w-[min(400px,calc(100vw-2rem))] flex-col gap-2.5"
    >
      {visible.length > 1 && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] shadow-md">
          <span className="font-bold text-slate-800">
            تنبيهات السيولة الذكية ({visible.length})
          </span>
          <button
            type="button"
            onClick={onDismissAll}
            className="font-semibold text-slate-500 hover:text-slate-900"
          >
            إخفاء الكل
          </button>
        </div>
      )}

      {visible.map((alert) => {
        const isCritical = alert.severity === 'critical';
        return (
          <div
            key={alert.id}
            role="status"
            className={`rounded-xl border bg-white p-4 shadow-lg ${
              isCritical ? 'border-rose-300' : 'border-amber-300'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                {isCritical ? (
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                )}
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900">{alert.title}</span>
                    <StateLabel
                      tone={isCritical ? 'danger' : 'warning'}
                      label={isCritical ? 'حرج' : 'اقتراب'}
                    />
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{alert.message}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onDismiss(alert.id)}
                aria-label="إغلاق التنبيه"
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-[11px]">
              <span className="font-num font-bold text-slate-700">
                {alert.metricValue} · {alert.thresholdValue}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="font-semibold text-slate-600 hover:text-slate-900"
                >
                  الإعدادات
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onOpenCapital();
                    onDismiss(alert.id);
                  }}
                  className="font-semibold text-[#1D63B8] hover:underline"
                >
                  معالجة ←
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </aside>
  );
}
