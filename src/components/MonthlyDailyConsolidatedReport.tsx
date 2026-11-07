import React, { useRef, useState } from 'react';
import {
  Download,
  Printer,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2,
  FileSpreadsheet,
  Maximize2,
  Loader2,
} from 'lucide-react';
import { DailyEntry, MonthData, SchoolDetails } from '../types/mdm';
import { autoTranslateToHindi, translateToHindiAsync } from '../utils/hindiTransliterator';
import { downloadMultiPagePdf } from '../utils/pdfExport';

interface Props {
  data: MonthData;
  onUpdateSchoolDetails?: (updated: SchoolDetails) => void;
  onUpdateDailyEntries?: (updated: DailyEntry[]) => void;
}

export const MonthlyDailyConsolidatedReport: React.FC<Props> = ({
  data,
  onUpdateSchoolDetails,
  onUpdateDailyEntries,
}) => {
  const { schoolDetails, dailyEntries } = data;
  const printContainerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [teacherSignatures, setTeacherSignatures] = useState<string[]>(Array(10).fill(''));
  
  // Row height setting to guarantee Page 1 is a magnificent full page (39px default fills exact A4)
  const [rowHeightMode, setRowHeightMode] = useState<'full' | 'compact'>('full');
  const [translatingField, setTranslatingField] = useState<string | null>(null);

  const rowHeightPx = rowHeightMode === 'full' ? 39 : 32;

  const handleTranslateField = async (field: 'schoolName' | 'blockName') => {
    const val = schoolDetails[field];
    if (!val || !val.trim()) return;
    setTranslatingField(field);
    try {
      const quick = autoTranslateToHindi(val);
      onUpdateSchoolDetails?.({ ...schoolDetails, [field]: quick });
      const enhanced = await translateToHindiAsync(val);
      if (enhanced && enhanced !== quick) {
        onUpdateSchoolDetails?.({ ...schoolDetails, [field]: enhanced });
      }
    } finally {
      setTranslatingField(null);
    }
  };

  const handleFitToScreen = () => {
    if (typeof window !== 'undefined') {
      const screenW = window.innerWidth;
      if (screenW < 640) {
        setZoomLevel(Math.max(35, Math.floor(((screenW - 24) / 820) * 100)));
      } else if (screenW < 1024) {
        setZoomLevel(Math.max(50, Math.floor(((screenW - 48) / 900) * 100)));
      } else {
        setZoomLevel(100);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printContainerRef.current) return;
    try {
      setIsGeneratingPdf(true);
      const pages = printContainerRef.current.querySelectorAll<HTMLDivElement>('.report-sheet-page');
      if (pages.length === 0) return;

      const filename = `समेकित_मासिक_प्रतिवेदन_${schoolDetails.month || 'माह'}_${schoolDetails.year || 'वर्ष'}_${(schoolDetails.schoolName || 'विद्यालय').replace(/\s+/g, '_')}.pdf`;
      await downloadMultiPagePdf({
        pageElements: Array.from(pages),
        fileName: filename,
        orientation: 'portrait',
        marginMm: 3,
      });
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('PDF निर्माण में समस्या आई। आप "प्रिंट करें" बटन दबाकर "Save as PDF" चुन सकते हैं।');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Split daily entries: Page 1 has days 1 to 22, Page 2 has days 23 to 31
  const page1Entries = dailyEntries.slice(0, 22);
  const page2Entries = dailyEntries.slice(22, 31);

  // Smart Friday-close detection:
  // 1. Explicitly selected weeklyOff === 'friday'
  // 2. OR at least 3 Fridays marked holiday and at least 1 Sunday with meal served
  // 3. OR if any Sunday has meal served and students attending
  const isFridayClose =
    schoolDetails.weeklyOff === 'friday' ||
    (dailyEntries.filter((e) => e.dayOfWeekHindi === 'शुक्रवार' && e.isHoliday).length >= 3 &&
     dailyEntries.filter((e) => (e.dayOfWeekHindi === 'रविवार' || e.isSunday) && e.isMealServed).length >= 1) ||
    dailyEntries.some((e) => (e.dayOfWeekHindi === 'रविवार' || e.isSunday) && e.isMealServed && ((e.count1to5 || 0) + (e.count6to8 || 0) > 0));

  // Helper function to extract or auto-calculate separate Egg and Fruit numbers:
  // - For Friday close: separate egg and fruit appear on Sunday (रविवार)
  // - For Sunday close: separate egg and fruit appear on Friday (शुक्रवार)
  // - Also, whenever any Sunday has meal served, egg and fruit appear for that Sunday
  const getEggFruitNumbers = (entry: any, isServed: boolean) => {
    if (!entry || !isServed) return { egg: '', fruit: '', isSpecialServingDay: false };
    const isSunday = entry.dayOfWeekHindi === 'रविवार' || entry.isSunday;
    const isFriday = entry.dayOfWeekHindi === 'शुक्रवार';
    const isSpecialServingDay = isFridayClose ? isSunday : (isFriday || (isSunday && isServed));

    let egg = '';
    let fruit = '';

    if (entry.eggCount != null && entry.eggCount > 0) {
      egg = String(entry.eggCount);
    }
    if (entry.fruitCount != null && entry.fruitCount > 0) {
      fruit = String(entry.fruitCount);
    }

    const totalM = (entry.mdmTotalCount != null ? entry.mdmTotalCount : ((Number(entry.count1to5) || 0) + (Number(entry.count6to8) || 0))) || 0;

    // Auto-calculate separate counts on the designated serving day if not explicitly populated
    if (isSpecialServingDay && totalM > 0 && (!egg || !fruit)) {
      const eCount = Math.round(totalM * 0.85);
      const fCount = Math.max(0, totalM - eCount);
      egg = String(eCount);
      fruit = String(fCount);
    }

    return { egg, fruit, isSpecialServingDay };
  };

  // Compute Totals
  const totalPhysicalAttendance = dailyEntries.reduce((sum, e) => {
    if (e.isHoliday || !e.isMealServed) return sum;
    const phys = e.physicalAttendance != null ? e.physicalAttendance : e.count1to5 + e.count6to8;
    return sum + (Number(phys) || 0);
  }, 0);

  const totalMdmCount = dailyEntries.reduce((sum, e) => {
    if (e.isHoliday || !e.isMealServed) return sum;
    const mdm = e.mdmTotalCount != null ? e.mdmTotalCount : e.count1to5 + e.count6to8;
    return sum + (Number(mdm) || 0);
  }, 0);

  const totalEggCount = dailyEntries.reduce((sum, e) => {
    if (e.isHoliday || !e.isMealServed) return sum;
    const isSunday = e.dayOfWeekHindi === 'रविवार' || e.isSunday;
    const isFriday = e.dayOfWeekHindi === 'शुक्रवार';
    const isSpecialServingDay = isFridayClose ? isSunday : (isFriday || (isSunday && e.isMealServed));
    if (e.eggCount != null && e.eggCount > 0) return sum + Number(e.eggCount);
    if (isSpecialServingDay) {
      const totalM = (e.mdmTotalCount != null ? e.mdmTotalCount : (e.count1to5 + e.count6to8)) || 0;
      return sum + Math.round(totalM * 0.85);
    }
    return sum;
  }, 0);

  const totalFruitCount = dailyEntries.reduce((sum, e) => {
    if (e.isHoliday || !e.isMealServed) return sum;
    const isSunday = e.dayOfWeekHindi === 'रविवार' || e.isSunday;
    const isFriday = e.dayOfWeekHindi === 'शुक्रवार';
    const isSpecialServingDay = isFridayClose ? isSunday : (isFriday || (isSunday && e.isMealServed));
    if (e.fruitCount != null && e.fruitCount > 0) return sum + Number(e.fruitCount);
    if (isSpecialServingDay) {
      const totalM = (e.mdmTotalCount != null ? e.mdmTotalCount : (e.count1to5 + e.count6to8)) || 0;
      const egg = Math.round(totalM * 0.85);
      return sum + Math.max(0, totalM - egg);
    }
    return sum;
  }, 0);

  return (
    <div className="space-y-4">
      {/* Dynamic Print Styles for Portrait Output */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait !important;
            margin: 4mm !important;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .report-sheet-page {
            width: 100% !important;
            max-width: 100% !important;
            height: 289mm !important;
            min-height: 289mm !important;
            box-shadow: none !important;
            border: none !important;
            padding: 5mm 6mm !important;
            page-break-after: always !important;
            break-after: page !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }
          .report-sheet-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>

      {/* Top Action Bar */}
      <div className="no-print bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            मूल सरकारी समेकित रिपोर्ट (वर्ग 01 से 08)
          </span>
          <span className="text-xs text-slate-600 font-medium hidden sm:inline">
            (2 पृष्ठ A4 Portrait प्रारूप | प्रथम पृष्ठ पूर्ण पृष्ठ भरा हुआ)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Row Height / Full Page Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-medium">
            <button
              onClick={() => setRowHeightMode('full')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                rowHeightMode === 'full'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="प्रथम पृष्ठ को पूरे A4 पेज पर विस्तार से भरें (अनुशंसित)"
            >
              <Maximize2 className="w-3 h-3" />
              <span>फुल पेज (Full Page)</span>
            </button>
            <button
              onClick={() => setRowHeightMode('compact')}
              className={`px-2.5 py-1 rounded-md transition ${
                rowHeightMode === 'compact'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="कम्पैक्ट पंक्ति ऊँचाई"
            >
              <span>कम्पैक्ट</span>
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50 text-xs">
            <button
              onClick={() => setZoomLevel((z) => Math.max(60, z - 10))}
              className="p-1 hover:bg-white rounded text-slate-600 transition"
              title="ज़ूम कम करें"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono font-medium text-slate-700">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(130, z + 10))}
              className="p-1 hover:bg-white rounded text-slate-600 transition"
              title="ज़ूम बढ़ाएं"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomLevel(100)}
              className="p-1 hover:bg-white rounded text-slate-600 transition"
              title="रीसेट"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleFitToScreen}
              className="px-2 py-1 hover:bg-white rounded text-indigo-700 font-semibold transition border-l border-slate-200 flex items-center gap-1 text-[11px]"
              title="स्क्रीन के अनुसार आकार दें"
            >
              📱 स्क्रीन फिट
            </button>
          </div>

          {/* Download 2-Page Filled PDF */}
          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-semibold shadow-xs transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isGeneratingPdf ? 'PDF तैयार हो रहा है...' : 'समेकित PDF डाउनलोड (.pdf)'}
          </button>

          {/* Native Print */}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <Printer className="w-4 h-4" />
            प्रिंट करें / PDF सेव करें
          </button>
        </div>
      </div>

      {/* Viewport for 2 Pages */}
      <div className="overflow-x-auto bg-slate-200/70 p-4 sm:p-6 rounded-2xl flex flex-col items-center gap-8 custom-scrollbar">
        <div
          ref={printContainerRef}
          style={{
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease',
          }}
          className="flex flex-col items-center gap-8 print:transform-none"
        >
          {/* ========================================================= */}
          {/* PAGE 1: Days 1 to 22 (Full A4 Page)                       */}
          {/* ========================================================= */}
          <div
            className="report-sheet-page bg-white text-black px-8 py-6 rounded-sm shadow-xl border border-slate-300 print:border-none print:shadow-none flex flex-col justify-between"
            style={{
              width: '794px', // A4 Portrait width at ~96 DPI
              height: '1123px', // Exact A4 Portrait height
              minHeight: '1123px',
              boxSizing: 'border-box',
              fontFamily: "'Noto Sans Devanagari', 'Mangal', 'Arial', sans-serif",
              pageBreakAfter: 'always',
            }}
          >
            {/* Top Header Section */}
            <div className="text-center mb-1 shrink-0">
              <h1 className="text-[18px] font-extrabold tracking-tight text-black">
                मध्याह्न भोजन योजना अंतर्गत सम्पूर्ण माह का समेकित रिपोर्ट
              </h1>

              <div className="mt-1 text-[13px] font-bold flex items-center justify-center gap-2">
                <span>माह :</span>
                <input
                  type="text"
                  value={schoolDetails.month}
                  onChange={(e) => onUpdateSchoolDetails?.({ ...schoolDetails, month: e.target.value })}
                  placeholder="........................"
                  className="border-b border-dotted border-black px-1 font-bold text-center bg-transparent focus:bg-amber-50 focus:outline-hidden min-w-[120px]"
                />
                <span className="ml-2">वर्ष :</span>
                <input
                  type="text"
                  value={schoolDetails.year}
                  onChange={(e) => onUpdateSchoolDetails?.({ ...schoolDetails, year: e.target.value })}
                  placeholder="2025"
                  className="border-b border-dotted border-black px-1 font-bold text-center bg-transparent focus:bg-amber-50 focus:outline-hidden w-20 font-mono"
                />
              </div>

              {/* School Name & Block Row */}
              <div className="flex justify-between items-baseline mt-3 text-[12px] font-semibold text-black">
                <div className="flex-1 flex items-baseline mr-4">
                  <span className="shrink-0">विद्यालय का नाम</span>
                  <input
                    type="text"
                    value={schoolDetails.schoolName}
                    onChange={(e) => onUpdateSchoolDetails?.({ ...schoolDetails, schoolName: e.target.value })}
                    onBlur={() => handleTranslateField('schoolName')}
                    placeholder=".................................................................................."
                    className="flex-1 ml-1 border-b border-dotted border-black px-1 font-bold text-black bg-transparent focus:bg-amber-50 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => handleTranslateField('schoolName')}
                    className="no-print translate-helper-btn ml-1 text-[10px] text-indigo-700 hover:text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200"
                    data-no-print="true"
                    data-translate-btn="true"
                    title="अंग्रेजी से शुद्ध हिन्दी में बदलें"
                  >
                    {translatingField === 'schoolName' ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : '🌐 हिन्दी'}
                  </button>
                </div>
                <div className="flex items-baseline shrink-0">
                  <span className="shrink-0">प्रखण्ड</span>
                  <input
                    type="text"
                    value={schoolDetails.blockName}
                    onChange={(e) => onUpdateSchoolDetails?.({ ...schoolDetails, blockName: e.target.value })}
                    onBlur={() => handleTranslateField('blockName')}
                    placeholder="..............................."
                    className="w-32 ml-1 border-b border-dotted border-black px-1 font-bold text-black bg-transparent focus:bg-amber-50 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => handleTranslateField('blockName')}
                    className="no-print translate-helper-btn ml-1 text-[10px] text-indigo-700 hover:text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200"
                    data-no-print="true"
                    data-translate-btn="true"
                    title="अंग्रेजी से शुद्ध हिन्दी में बदलें"
                  >
                    {translatingField === 'blockName' ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : '🌐 हिन्दी'}
                  </button>
                </div>
              </div>
            </div>

            {/* Main Table for Days 1 to 22 (Fills the entire height smoothly) */}
            <div className="flex-1 flex flex-col justify-start my-1 overflow-hidden">
              <table className="w-full border-collapse border-2 border-black text-black text-center text-[11px] leading-tight">
                <thead>
                  <tr className="bg-slate-100 font-extrabold h-[26px]">
                    <th className="border border-black p-1 text-center text-[12px]" colSpan={6}>
                      वर्ग 01 से 08 (समेकित प्रतिदिन रिपोर्ट)
                    </th>
                  </tr>
                  <tr className="bg-slate-100 font-extrabold h-[36px] text-[10.5px]">
                    <th className="border border-black p-1 w-11 text-center align-middle">
                      क्र०सं०
                    </th>
                    <th className="border border-black p-1 w-24 text-center align-middle">
                      दिनांक
                    </th>
                    <th className="border border-black p-1 w-28 text-center align-middle">
                      भौतिक उपस्थिति
                    </th>
                    <th className="border border-black p-1 w-36 text-center align-middle">
                      म०भो० ग्रहण करने वाले बच्चों की संख्या
                    </th>
                    <th className="border border-black p-1 w-36 text-center align-middle">
                      अण्डा खाने वाले बच्चों की संख्या ({isFridayClose ? 'रविवार' : 'शुक्रवार'})
                    </th>
                    <th className="border border-black p-1 w-44 text-center align-middle">
                      मौसमी फल सेव या केला खाने वाले बच्चों की संख्या ({isFridayClose ? 'रविवार' : 'शुक्रवार'})
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 22 }, (_, idx) => {
                    const dayNum = idx + 1;
                    const entry = page1Entries.find((e) => e.day === dayNum);
                    const isServed = entry ? entry.isMealServed && !entry.isHoliday : false;
                    const phys = entry
                      ? entry.physicalAttendance != null
                        ? entry.physicalAttendance
                        : isServed
                        ? entry.count1to5 + entry.count6to8
                        : ''
                      : '';
                    const mdm = entry
                      ? entry.mdmTotalCount != null
                        ? entry.mdmTotalCount
                        : isServed
                        ? entry.count1to5 + entry.count6to8
                        : ''
                      : '';
                    const { egg, fruit, isSpecialServingDay } = getEggFruitNumbers(entry, isServed);

                    return (
                      <tr
                        key={dayNum}
                        style={{ height: `${rowHeightPx}px` }}
                        className="border-b border-black hover:bg-amber-50/20 transition-colors"
                      >
                        <td className="border border-black p-1 font-mono font-bold text-[11.5px]">
                          {dayNum}
                        </td>
                        <td className="border border-black p-1 font-mono font-semibold text-[11px] whitespace-nowrap">
                          {entry ? entry.dateStr : ''}
                        </td>
                        <td className="border border-black p-1 font-mono font-semibold text-[11.5px]">
                          {phys !== '' ? phys : entry?.isHoliday ? entry.holidayReason || 'अवकाश' : ''}
                        </td>
                        <td className="border border-black p-1 font-mono font-extrabold text-[12.5px] text-slate-950">
                          {mdm !== '' ? mdm : entry?.isHoliday ? entry.holidayReason || 'अवकाश' : ''}
                        </td>
                        <td
                          className={`border border-black p-1 font-mono font-bold text-[11.5px] ${
                            isSpecialServingDay && isServed ? 'bg-amber-50/50' : ''
                          }`}
                        >
                          {egg}
                        </td>
                        <td
                          className={`border border-black p-1 font-mono font-bold text-[11.5px] ${
                            isSpecialServingDay && isServed ? 'bg-amber-50/50' : ''
                          }`}
                        >
                          {fruit}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Footer Note of Page 1 */}
            <div className="pt-2 border-t border-black/40 flex items-center justify-end text-[10.5px] font-bold text-slate-700 shrink-0">
              <div className="font-mono text-black font-extrabold">
                पृष्ठ 1 / 2
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* PAGE 2: Days 23 to 31, Totals, Certificate & Signatures   */}
          {/* ========================================================= */}
          <div
            className="report-sheet-page bg-white text-black px-8 py-6 rounded-sm shadow-xl border border-slate-300 print:border-none print:shadow-none flex flex-col justify-between"
            style={{
              width: '794px',
              height: '1123px', // Exact A4 Portrait height matching Page 1
              minHeight: '1123px',
              boxSizing: 'border-box',
              fontFamily: "'Noto Sans Devanagari', 'Mangal', 'Arial', sans-serif",
            }}
          >
            <div>
              {/* Top Mini-Header on Page 2 */}
              <div className="flex justify-between items-center border-b border-black/30 pb-1 mb-2 text-[11px] font-bold text-black">
                <span>मध्याह्न भोजन योजना अंतर्गत सम्पूर्ण माह का समेकित रिपोर्ट (पृष्ठ- 2)</span>
                <span>
                  {schoolDetails.schoolName ? `${schoolDetails.schoolName} • ` : ''}
                  माह: {schoolDetails.month || '---'} | वर्ष: {schoolDetails.year || '2025'}
                </span>
              </div>

              {/* Header on page 2 table */}
              <table className="w-full border-collapse border-2 border-black text-black text-center text-[11px] leading-tight">
                <thead>
                  <tr className="bg-slate-100 font-extrabold h-[26px]">
                    <th className="border border-black p-1 text-center text-[12px]" colSpan={6}>
                      वर्ग 01 से 08 (समेकित प्रतिदिन रिपोर्ट)
                    </th>
                  </tr>
                  <tr className="bg-slate-100 font-extrabold h-[36px] text-[10.5px]">
                    <th className="border border-black p-1 w-11 text-center align-middle">
                      क्र०सं०
                    </th>
                    <th className="border border-black p-1 w-24 text-center align-middle">
                      दिनांक
                    </th>
                    <th className="border border-black p-1 w-28 text-center align-middle">
                      भौतिक उपस्थिति
                    </th>
                    <th className="border border-black p-1 w-36 text-center align-middle">
                      म०भो० ग्रहण करने वाले बच्चों की संख्या
                    </th>
                    <th className="border border-black p-1 w-36 text-center align-middle">
                      अण्डा खाने वाले बच्चों की संख्या ({isFridayClose ? 'रविवार' : 'शुक्रवार'})
                    </th>
                    <th className="border border-black p-1 w-44 text-center align-middle">
                      मौसमी फल सेव या केला खाने वाले बच्चों की संख्या ({isFridayClose ? 'रविवार' : 'शुक्रवार'})
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Days 23 to 31 */}
                  {Array.from({ length: 9 }, (_, idx) => {
                    const dayNum = idx + 23;
                    const entry = dailyEntries.find((e) => e.day === dayNum);
                    const isServed = entry ? entry.isMealServed && !entry.isHoliday : false;
                    const phys = entry
                      ? entry.physicalAttendance != null
                        ? entry.physicalAttendance
                        : isServed
                        ? entry.count1to5 + entry.count6to8
                        : ''
                      : '';
                    const mdm = entry
                      ? entry.mdmTotalCount != null
                        ? entry.mdmTotalCount
                        : isServed
                        ? entry.count1to5 + entry.count6to8
                        : ''
                      : '';
                    const { egg, fruit, isSpecialServingDay } = getEggFruitNumbers(entry, isServed);

                    return (
                      <tr
                        key={dayNum}
                        style={{ height: `${rowHeightPx}px` }}
                        className="border-b border-black hover:bg-amber-50/20 transition-colors"
                      >
                        <td className="border border-black p-1 font-mono font-bold text-[11.5px]">
                          {dayNum}
                        </td>
                        <td className="border border-black p-1 font-mono font-semibold text-[11px] whitespace-nowrap">
                          {entry ? entry.dateStr : ''}
                        </td>
                        <td className="border border-black p-1 font-mono font-semibold text-[11.5px]">
                          {phys !== '' ? phys : entry?.isHoliday ? entry.holidayReason || 'अवकाश' : ''}
                        </td>
                        <td className="border border-black p-1 font-mono font-extrabold text-[12.5px] text-slate-950">
                          {mdm !== '' ? mdm : entry?.isHoliday ? entry.holidayReason || 'अवकाश' : ''}
                        </td>
                        <td
                          className={`border border-black p-1 font-mono font-bold text-[11.5px] ${
                            isSpecialServingDay && isServed ? 'bg-amber-50/50' : ''
                          }`}
                        >
                          {egg}
                        </td>
                        <td
                          className={`border border-black p-1 font-mono font-bold text-[11.5px] ${
                            isSpecialServingDay && isServed ? 'bg-amber-50/50' : ''
                          }`}
                        >
                          {fruit}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Total Row (कुल :-) */}
                  <tr className="bg-slate-200 font-extrabold h-[36px] border-t-2 border-black">
                    <td colSpan={2} className="border border-black p-1 text-right pr-4 text-[12px]">
                      कुल :-
                    </td>
                    <td className="border border-black p-1 font-mono text-[12px] font-extrabold">
                      {totalPhysicalAttendance || ''}
                    </td>
                    <td className="border border-black p-1 font-mono text-[13px] font-extrabold text-slate-950">
                      {totalMdmCount || ''}
                    </td>
                    <td className="border border-black p-1 font-mono text-[12px] font-extrabold">
                      {totalEggCount || ''}
                    </td>
                    <td className="border border-black p-1 font-mono text-[12px] font-extrabold">
                      {totalFruitCount || ''}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Certification Note */}
              <div className="mt-4 text-[11px] font-semibold text-black leading-relaxed bg-slate-50 p-2.5 rounded border border-black/30">
                प्रमाणित किया जाता है कि उपरोक्त सभी आँकड़े सही है जिसका मिलान तिथिवार प्रपत्र एवं पोषाहार पंजी/छात्रोपस्थिति पंजी से किया गया और परोसा गया, मध्याह्न भोजन निर्धारित मेनू एवं मात्रा के अनुसार है। भोजन की गुणवत्ता अच्छी है। मध्याह्न भोजन बच्चों को हमारे समक्ष परोसा गया है।
              </div>

              {/* Teachers' Signatures Grid */}
              <div className="mt-4">
                <div className="text-[11.5px] font-extrabold text-black mb-1">
                  सभी शिक्षकों का हस्ताक्षर :-
                </div>
                <table className="w-full border-collapse border-2 border-black text-left text-[10.5px]">
                  <tbody>
                    {[0, 2, 4, 6, 8].map((rowIdx) => (
                      <tr key={rowIdx} className="h-10">
                        <td className="border border-black p-1.5 w-1/2 align-top">
                          <span className="font-bold mr-1.5">{rowIdx + 1}.</span>
                          <input
                            type="text"
                            value={teacherSignatures[rowIdx]}
                            onChange={(e) => {
                              const updated = [...teacherSignatures];
                              updated[rowIdx] = e.target.value;
                              setTeacherSignatures(updated);
                            }}
                            className="bg-transparent text-[10.5px] w-4/5 focus:outline-hidden"
                          />
                        </td>
                        <td className="border border-black p-1.5 w-1/2 align-top">
                          <span className="font-bold mr-1.5">{rowIdx + 2}.</span>
                          <input
                            type="text"
                            value={teacherSignatures[rowIdx + 1]}
                            onChange={(e) => {
                              const updated = [...teacherSignatures];
                              updated[rowIdx + 1] = e.target.value;
                              setTeacherSignatures(updated);
                            }}
                            className="bg-transparent text-[10.5px] w-4/5 focus:outline-hidden"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* HM Signature Box */}
              <div className="mt-7 flex justify-end text-center text-[11.5px] font-bold text-black pr-4">
                <div className="min-w-[240px]">
                  <div className="h-10 border-b border-dotted border-black/40 mb-1"></div>
                  <div>विद्यालय प्रधान/प्र०अ० का हस्ताक्षर एवं मुहर</div>
                  {schoolDetails.hmName && (
                    <div className="text-[10.5px] font-semibold text-slate-800 mt-0.5">
                      ({schoolDetails.hmName})
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Statutory Warning Note at Bottom */}
            <div className="pt-2 border-t border-black text-[10px] font-bold text-black leading-tight flex justify-between items-center">
              <div>
                नोट :- इस प्रपत्र के बिना कोई मध्याह्न भोजन का विपत्र मान्य नहीं होगी। प्रतिवेदन गलत होने पर सहमति व्यक्त करने वाले सभी शिक्षकों पर एकमुश्त कार्रवाई होगी।
              </div>
              <div className="font-mono text-black font-extrabold ml-4 shrink-0">
                पृष्ठ 2 / 2
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Mobile Action Dock */}
      <div className="fixed bottom-14 left-3 right-3 z-30 md:hidden flex items-center justify-between gap-2 p-2 bg-slate-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-slate-700 text-white no-print">
        <button
          onClick={handleFitToScreen}
          className="px-2.5 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-1 font-medium border border-slate-600"
          title="मोबाइल स्क्रीन के अनुसार आकार सेट करें"
        >
          📱 {zoomLevel}%
        </button>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg flex items-center gap-1 font-medium"
          >
            <Printer className="w-3.5 h-3.5" /> प्रिंट
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="px-3.5 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg flex items-center gap-1 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> {isGeneratingPdf ? 'तैयार...' : 'समेकित PDF'}
          </button>
        </div>
      </div>
    </div>
  );
};
