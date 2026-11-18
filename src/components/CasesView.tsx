import React, { useState } from 'react';
import { CaseItem } from '../data/ownerData';
import { StateLabel, SurfaceCard } from './UiPrimitives';

export function CasesView({
  cases,
  onOpenCase,
}: {
  cases: CaseItem[];
  onOpenCase: (id: string) => void;
}) {
  const [showClosed, setShowClosed] = useState(false);
  const subset = cases.filter((c) => (showClosed ? c.closed : !c.closed));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">سجل القضايا الاقتصادية والاستراتيجية</h2>
          <p className="mt-1 text-xs text-slate-500">تاريخ واحد لكل قضية — الأدلة، الاستقصاء، والموقف الحالي</p>
        </div>
        <button
          type="button"
          onClick={() => setShowClosed((v) => !v)}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          {showClosed ? 'عرض القضايا النشطة' : 'عرض القضايا المغلقة'}
        </button>
      </div>

      <SurfaceCard>
        {subset.length ? (
          <div className="divide-y divide-slate-100">
            {subset.map((c) => (
              <div
                key={c.id}
                onClick={() => onOpenCase(c.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onOpenCase(c.id)}
                className="cursor-pointer py-5 first:pt-1 last:pb-1 transition-colors hover:bg-slate-50/70 px-3 -mx-3 rounded-lg"
              >
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="font-num font-semibold">{c.id}</span>
                  <StateLabel tone={c.closed ? 'success' : 'warning'} label={c.status} />
                </div>
                <h3 className="mt-2 text-base font-bold text-slate-900">{c.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{c.desc}</p>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-500">{c.history.length} أحداث موثقة</span>
                  <span className="font-semibold text-[#1D63B8]">عرض القضية والأدلة ←</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center text-xs text-slate-500">
            لا توجد قضايا في هذه المجموعة حالياً.
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}
