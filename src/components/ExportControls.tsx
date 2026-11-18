import React, { useState } from 'react';
import { FileSpreadsheet, Printer } from 'lucide-react';
import { OWNER_DATA } from '../data/ownerData';

export function ExportControls({
  onExportExcel,
  dashboardTitle,
  scopeLabel,
}: {
  onExportExcel: () => string;
  dashboardTitle: string;
  scopeLabel: string;
}) {
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleExcel = () => {
    try {
      const filename = onExportExcel();
      setFeedback(`تم تصدير ملف Excel بنجاح (${filename}).`);
    } catch {
      setFeedback('تعذر إنشاء ملف Excel. حاول مرة أخرى.');
    }
  };

  const handlePdfPrint = () => {
    setFeedback(`تم تجهيز تقرير PDF لـ «${dashboardTitle}» — اختر «حفظ بصيغة PDF» من نافذة الطباعة.`);
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        window.print();
      }, 80);
    });
  };

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handlePdfPrint}
        title={`تصدير ${dashboardTitle} إلى PDF`}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
      >
        <Printer className="h-3.5 w-3.5 text-[#1D63B8]" />
        <span>تصدير PDF</span>
      </button>

      <button
        type="button"
        onClick={handleExcel}
        title={`تصدير بيانات ${dashboardTitle} إلى Excel`}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F766E] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0D625B] whitespace-nowrap shrink-0"
      >
        <FileSpreadsheet className="h-3.5 w-3.5" />
        <span>تصدير Excel</span>
      </button>

      {feedback && (
        <span
          role="status"
          aria-label={`تأكيد التصدير: ${scopeLabel}`}
          className="text-[11px] font-medium text-emerald-700"
        >
          {feedback}
        </span>
      )}
    </div>
  );
}

export function PrintReportHeader({
  dashboardTitle,
  periodLabel,
  scopeDetails,
}: {
  dashboardTitle: string;
  periodLabel: string;
  scopeDetails: string;
}) {
  return (
    <div className="print-only mb-5 border-b-2 border-slate-900 pb-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-[#0F766E]">
            OWNER AI · {OWNER_DATA.meta.company}
          </div>
          <h1 className="mt-1 text-xl font-extrabold text-slate-900">{dashboardTitle}</h1>
          <div className="mt-1 text-xs text-slate-600">{scopeDetails}</div>
        </div>
        <div className="text-left text-[11px] text-slate-600">
          <div>الفترة: <strong className="text-slate-900">{periodLabel}</strong></div>
          <div>تاريخ التصدير: <strong className="font-num text-slate-900">{new Date().toISOString().slice(0, 10)}</strong></div>
          <div>{OWNER_DATA.meta.dataTag}</div>
        </div>
      </div>
    </div>
  );
}
