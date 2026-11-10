import React, { useRef, useState } from 'react';
import { Download, FileSpreadsheet, Printer, ZoomIn, ZoomOut, RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { MonthData, SchoolDetails } from '../types/mdm';
import { calculatePrapatraRows } from '../utils/mdmCalculations';
import { formatINR, formatKg, OFFICIAL_DEFAULT_RATES } from '../utils/mdmRates';
import { exportToExcel } from '../utils/excelExport';
import { autoTranslateToHindi, translateToHindiAsync } from '../utils/hindiTransliterator';
import { downloadSinglePagePdf } from '../utils/pdfExport';

interface Props {
  data: MonthData;
  onUpdateSchoolDetails?: (updated: SchoolDetails) => void;
}

export const OfficialReportPreview: React.FC<Props> = ({ data, onUpdateSchoolDetails }) => {
  const { schoolDetails } = data;
  const rates = data.customRates || OFFICIAL_DEFAULT_RATES;
  const calc = calculatePrapatraRows(data, rates);

  const has6to8Data = Boolean(
    (calc.row6to8.col11_beneficiaryDays && calc.row6to8.col11_beneficiaryDays > 0) ||
    (schoolDetails.enroll6to8 != null && schoolDetails.enroll6to8 > 0) ||
    (schoolDetails.overrideStudentDays6to8 != null && schoolDetails.overrideStudentDays6to8 > 0) ||
    (calc.row6to8.col5_currentLifting && calc.row6to8.col5_currentLifting > 0) ||
    (calc.row6to8.col7_prevBalanceRice && calc.row6to8.col7_prevBalanceRice > 0) ||
    (calc.row6to8.col19_totalExp && calc.row6to8.col19_totalExp > 0) ||
    (calc.row6to8.col9_consumedRice && calc.row6to8.col9_consumedRice > 0)
  );

  const printAreaRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  const handleAutoTranslate = async (field: keyof SchoolDetails, val: string) => {
    if (!val || !val.trim()) return;
    const quick = autoTranslateToHindi(val);
    onUpdateSchoolDetails?.({ ...schoolDetails, [field]: quick });
    try {
      const enhanced = await translateToHindiAsync(val);
      if (enhanced && enhanced !== quick) {
        onUpdateSchoolDetails?.({ ...schoolDetails, [field]: enhanced });
      }
    } catch {
      // already applied
    }
  };

  const handleFitToScreen = () => {
    if (typeof window !== 'undefined') {
      const screenW = window.innerWidth;
      if (screenW < 640) {
        setZoomLevel(Math.max(35, Math.floor(((screenW - 24) / 980) * 100)));
      } else if (screenW < 1024) {
        setZoomLevel(Math.max(50, Math.floor(((screenW - 48) / 1050) * 100)));
      } else {
        setZoomLevel(100);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatValKg = (val: number | undefined | null) => {
    if (val === undefined || val === null || val <= 0) return '-';
    return formatKg(val);
  };

  const formatValINR = (val: number | undefined | null) => {
    if (val === undefined || val === null || val <= 0) return '-';
    return formatINR(val);
  };

  const handleDownloadDirectPdf = async () => {
    if (!printAreaRef.current) return;
    try {
      setIsGeneratingPdf(true);
      const filename = `प्रपत्र-क_${schoolDetails.month || 'माह'}_${schoolDetails.year || 'वर्ष'}_${(schoolDetails.schoolName || 'विद्यालय').replace(/\s+/g, '_')}.pdf`;
      await downloadSinglePagePdf({
        element: printAreaRef.current,
        fileName: filename,
        orientation: 'landscape',
        marginMm: 3,
      });
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('PDF निर्माण में समस्या आई। आप "प्रिंट करें" बटन दबाकर "Save as PDF" चुन सकते हैं।');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Landscape Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape !important;
            margin: 3mm !important;
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
          .report-page-container {
            width: 100% !important;
            max-width: 100% !important;
            height: 100vh !important;
            min-height: 100vh !important;
            margin: 0 !important;
            padding: 3mm 4mm !important;
            box-shadow: none !important;
            border: none !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>

      {/* Top Action Toolbar (Hidden in Print) */}
      <div className="no-print bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            मूल सरकारी प्रपत्र-क (परिशिष्ट- 11) प्रारूप
          </span>
          <span className="text-xs text-blue-700 font-medium bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            ✍️ शीर्ष विवरणी सीधे प्रपत्र पर क्लिक करके एडिट करें
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50 text-xs">
            <button
              onClick={() => setZoomLevel((z) => Math.max(30, z - 10))}
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
              type="button"
              onClick={handleFitToScreen}
              className="px-2 py-0.5 hover:bg-white rounded text-[11px] font-semibold text-blue-700 transition"
              title="मोबाइल स्क्रीन में पूरा फिट करें"
            >
              📱 स्क्रीन फिट
            </button>
            <button
              onClick={() => setZoomLevel(100)}
              className="p-1 hover:bg-white rounded text-slate-600 transition"
              title="रीसेट 100%"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Export to Excel */}
          <button
            onClick={() => exportToExcel(data)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-medium shadow-xs transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel डाउनलोड (.xlsx)
          </button>

          {/* Direct PDF Download */}
          <button
            onClick={handleDownloadDirectPdf}
            disabled={isGeneratingPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-medium shadow-xs transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isGeneratingPdf ? 'PDF बन रहा है...' : 'PDF डाउनलोड (.pdf)'}
          </button>

          {/* Native Print / Vector PDF */}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <Printer className="w-4 h-4" />
            प्रिंट करें / PDF सेव करें
          </button>
        </div>
      </div>

      {/* Validation Warnings Alert (if any) */}
      {calc.validationWarnings.length > 0 && (
        <div className="no-print bg-amber-50 border border-amber-300 rounded-xl p-3 text-amber-900 text-xs">
          <div className="flex items-center gap-1.5 font-bold mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            सत्यापन सूचनाएँ (Validation Alerts):
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-amber-800">
            {calc.validationWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Official Government Prapatra-Ka Form Viewport */}
      <div className="overflow-x-auto bg-slate-200/70 p-3 sm:p-6 rounded-2xl flex justify-center custom-scrollbar">
        <div
          style={{
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease',
          }}
        >
          {/* Printable Report Sheet */}
          <div
            ref={printAreaRef}
            id="official-prapatra-k"
            className="report-page-container bg-white text-black rounded-sm shadow-xl border border-slate-300"
            style={{
              width: '1140px',
              minHeight: '796px',
              padding: '18px 20px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              fontFamily: "'Noto Sans Devanagari', 'Mangal', 'Arial', sans-serif",
            }}
          >
            {/* 1. Header Titles */}
            <div className="text-center mb-1 relative">
              <div className="absolute right-0 top-0 text-[11px] font-bold tracking-wide">
                परिशिष्ट- 11
              </div>

              <h1 className="text-[17px] font-extrabold text-black leading-snug flex items-baseline justify-center gap-1">
                <span>बिहार राज्य प्रधानमंत्री पोषण शक्ति निर्माण योजना,</span>
                <input
                  type="text"
                  value={schoolDetails.districtName || 'पूर्णियाँ'}
                  onChange={(e) => onUpdateSchoolDetails?.({ ...schoolDetails, districtName: e.target.value })}
                  onBlur={(e) => handleAutoTranslate('districtName', e.target.value)}
                  placeholder="पूर्णियाँ"
                  className="border-b border-dotted border-black px-1 font-extrabold text-black bg-transparent focus:bg-amber-50 focus:outline-hidden text-center min-w-[140px]"
                  title="जिला का नाम (क्लिक करके बदलें - स्वतः हिंदी अनुवाद)"
                />
              </h1>
              <h2 className="text-[13px] font-bold text-black mt-0.5">
                विद्यालय द्वारा भरा जाएगा प्रपत्र-क (मध्याह्न भोजन संचालन का विवरण)
              </h2>
            </div>

            {/* 2. Sub-Header Letter Info */}
            <div className="text-[11px] font-medium text-black mb-1.5">
              <div className="flex justify-between items-baseline">
                <div>
                  <span className="font-bold">सेवा में,</span>
                  <div className="pl-6 flex items-baseline">
                    <span>प्रखण्ड साधन सेवी, पी० एम० पोषण योजना,</span>
                    <input
                      type="text"
                      value={schoolDetails.blockName}
                      onChange={(e) => onUpdateSchoolDetails?.({ ...schoolDetails, blockName: e.target.value })}
                      onBlur={(e) => handleAutoTranslate('blockName', e.target.value)}
                      placeholder="............................................"
                      className="ml-2 border-b border-dotted border-black px-2 pb-0.5 font-bold text-black bg-transparent focus:bg-amber-50 focus:outline-hidden min-w-[220px]"
                      title="प्रखण्ड का नाम दर्ज करें (अंग्रेजी में टाइप करने पर स्वतः हिंदी हो जाएगा)"
                    />
                    <button
                      type="button"
                      onClick={() => handleAutoTranslate('blockName', schoolDetails.blockName)}
                      className="no-print translate-helper-btn ml-1 text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-1 py-0.5 rounded border border-slate-300 cursor-pointer"
                      data-no-print="true"
                      data-translate-btn="true"
                      title="हिन्दी में अनुवाद करें"
                    >
                      हिन्दी
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-center font-bold text-[12px] my-1">
                मध्याह्न भोजन योजना कार्यक्रम (मासिक प्रगति प्रतिवेदन कक्षा 01 से 08 तक)
              </div>

              <div className="flex flex-wrap justify-between items-center border-t border-b border-black/80 py-1 px-1 mt-1 font-semibold text-[11px] gap-2">
                <div className="flex items-baseline flex-1 min-w-[340px]">
                  <span>प्राथमिक / मध्य विद्यालय / मदरसा का नाम :-</span>
                  <input
                    type="text"
                    value={schoolDetails.schoolName}
                    onChange={(e) => onUpdateSchoolDetails?.({ ...schoolDetails, schoolName: e.target.value })}
                    onBlur={(e) => handleAutoTranslate('schoolName', e.target.value)}
                    placeholder="...................................................."
                    className="flex-1 ml-1.5 border-b border-dotted border-black px-1.5 font-bold text-black bg-transparent focus:bg-amber-50 focus:outline-hidden"
                    title="विद्यालय का नाम दर्ज करें (अंग्रेजी में टाइप करने पर स्वतः हिंदी हो जाएगा)"
                  />
                  <button
                    type="button"
                    onClick={() => handleAutoTranslate('schoolName', schoolDetails.schoolName)}
                    className="no-print translate-helper-btn ml-1 text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-1 py-0.5 rounded border border-slate-300 cursor-pointer"
                    data-no-print="true"
                    data-translate-btn="true"
                    title="हिन्दी में अनुवाद करें"
                  >
                    हिन्दी
                  </button>
                </div>
                <div className="flex items-baseline">
                  <span>माह :-</span>
                  <input
                    type="text"
                    value={schoolDetails.month}
                    onChange={(e) => onUpdateSchoolDetails?.({ ...schoolDetails, month: e.target.value })}
                    placeholder="मई"
                    className="w-20 ml-1 border-b border-dotted border-black px-1 font-bold text-center bg-transparent focus:bg-amber-50 focus:outline-hidden"
                    title="माह दर्ज करें"
                  />
                </div>
                <div className="flex items-baseline">
                  <span>वर्ष :-</span>
                  <input
                    type="text"
                    value={schoolDetails.year}
                    onChange={(e) => onUpdateSchoolDetails?.({ ...schoolDetails, year: e.target.value })}
                    placeholder="2025"
                    className="w-16 ml-1 border-b border-dotted border-black px-1 font-bold text-center bg-transparent focus:bg-amber-50 focus:outline-hidden"
                    title="वर्ष दर्ज करें"
                  />
                </div>
                <div className="flex items-baseline">
                  <span>MIS क्रमांक:-</span>
                  <input
                    type="text"
                    value={schoolDetails.misCode}
                    onChange={(e) => onUpdateSchoolDetails?.({ ...schoolDetails, misCode: e.target.value })}
                    placeholder=".............."
                    className="w-24 ml-1 border-b border-dotted border-black px-1 font-mono font-bold text-center bg-transparent focus:bg-amber-50 focus:outline-hidden"
                    title="MIS क्रमांक दर्ज करें"
                  />
                </div>
                <div className="flex items-baseline">
                  <span>U-DISE:-</span>
                  <input
                    type="text"
                    value={schoolDetails.udiseCode || ''}
                    onChange={(e) => onUpdateSchoolDetails?.({ ...schoolDetails, udiseCode: e.target.value })}
                    placeholder=".............."
                    className="w-28 ml-1 border-b border-dotted border-black px-1 font-mono font-bold text-center bg-transparent focus:bg-amber-50 focus:outline-hidden"
                    title="11 अंकों का U-DISE कोड दर्ज करें"
                  />
                </div>
              </div>
            </div>

            {/* 3. The 24-Column Official Table */}
            <div className="w-full">
              <table
                className="gov-report-table w-full border-collapse border-2 border-black text-black text-center table-fixed"
                style={{ fontSize: '8.8px', lineHeight: '1.15', tableLayout: 'fixed', width: '100%' }}
              >
                <colgroup>
                  <col style={{ width: '2.6%' }} /> {/* 1. क्र० सं० */}
                  <col style={{ width: '5.4%' }} /> {/* 2. कक्षा (1-8) */}
                  <col style={{ width: '4.3%' }} /> {/* 3. आवंटन */}
                  <col style={{ width: '4.2%' }} /> {/* 4. गत उठाव */}
                  <col style={{ width: '4.2%' }} /> {/* 5. वर्तमान उठाव */}
                  <col style={{ width: '4.4%' }} /> {/* 6. कुल उठाव */}
                  <col style={{ width: '4.4%' }} /> {/* 7. पूर्व अवशेष */}
                  <col style={{ width: '4.4%' }} /> {/* 8. कुल उपलब्ध */}
                  <col style={{ width: '4.4%' }} /> {/* 9. उपयोग */}
                  <col style={{ width: '4.4%' }} /> {/* 10. अवशेष */}
                  <col style={{ width: '4.4%' }} /> {/* 11. लाभान्वित */}
                  <col style={{ width: '4.3%' }} /> {/* 12. लिमिट प्राप्त */}
                  <col style={{ width: '4.3%' }} /> {/* 13. PFMS अवशेष */}
                  <col style={{ width: '4.1%' }} /> {/* 14. दाल */}
                  <col style={{ width: '4.1%' }} /> {/* 15. मसाला */}
                  <col style={{ width: '4.1%' }} /> {/* 16. सब्जी */}
                  <col style={{ width: '4.1%' }} /> {/* 17. तेल */}
                  <col style={{ width: '4.1%' }} /> {/* 18. जलावन */}
                  <col style={{ width: '4.6%' }} /> {/* 19. कुल व्यय */}
                  <col style={{ width: '3.4%' }} /> {/* 20. कार्य दिवस */}
                  <col style={{ width: '3.6%' }} /> {/* 21. MDM दिवस */}
                  <col style={{ width: '3.6%' }} /> {/* 22. औसत लाभान्वित */}
                  <col style={{ width: '3.6%' }} /> {/* 23. नामांकन */}
                  <col style={{ width: '4.4%' }} /> {/* 24. अभ्युक्ति */}
                </colgroup>
                <thead>
                  {/* Top Category Header Row (Row 1) */}
                  <tr className="text-black font-extrabold text-[9px] leading-tight" style={{ height: '24px' }}>
                    <th className="border border-black border-b-0 p-0.5 text-center font-extrabold bg-slate-200 align-bottom">क्र०</th>
                    <th className="border border-black border-b-0 p-0.5 text-center font-extrabold bg-slate-200 align-bottom">कक्षा</th>
                    <th className="border border-black p-0.5 text-center text-[10px] font-extrabold bg-slate-200" colSpan={9}>
                      भौतिक प्रतिवेदन (खाद्यान्न - kg)
                    </th>
                    <th className="border border-black p-0.5 text-center text-[10px] font-extrabold bg-slate-200" colSpan={8}>
                      वित्तीय प्रतिवेदन (परिवर्तन लागत राशि - ₹)
                    </th>
                    <th className="border border-black border-b-0 p-0.5 text-[8.5px] text-center font-extrabold bg-slate-200 align-bottom">कार्य</th>
                    <th className="border border-black border-b-0 p-0.5 text-[8.5px] text-center font-extrabold bg-slate-200 align-bottom">MDM</th>
                    <th className="border border-black border-b-0 p-0.5 text-[8.5px] text-center font-extrabold bg-slate-200 align-bottom">औसत</th>
                    <th className="border border-black border-b-0 p-0.5 text-[8.5px] text-center font-extrabold bg-slate-200 align-bottom">छात्र</th>
                    <th className="border border-black border-b-0 p-0.5 text-[8.5px] text-center font-extrabold bg-slate-200 align-bottom">विशेष</th>
                  </tr>

                  {/* Second Detailed Header Row (Row 2: 24 exact columns) */}
                  <tr className="text-black font-bold align-bottom text-[8px] leading-[1.12]" style={{ height: '36px' }}>
                    <th className="border border-black border-t-0 p-0.5 text-center font-extrabold bg-slate-200 align-top text-[9px]">सं०</th>
                    <th className="border border-black border-t-0 p-0.5 text-center font-extrabold bg-slate-200 align-top text-[9px]">(1-8)</th>

                    {/* Col 3 to 11 (भौतिक) */}
                    <th className="border border-black px-0.5 py-1 font-bold break-words bg-slate-50">खाद्यान्न आवंटन</th>
                    <th className="border border-black px-0.5 py-1 font-bold break-words bg-slate-50">गत माह उठाव</th>
                    <th className="border border-black px-0.5 py-1 font-bold break-words bg-slate-50">वर्तमान उठाव</th>
                    <th className="border border-black px-0.5 py-1 font-extrabold break-words bg-slate-50">कुल उठाव 4+5=6</th>
                    <th className="border border-black px-0.5 py-1 font-bold break-words bg-slate-50">पूर्व माह अवशेष (kg)</th>
                    <th className="border border-black px-0.5 py-1 font-extrabold break-words bg-slate-50">कुल उपलब्ध 5+7=8</th>
                    <th className="border border-black px-0.5 py-1 font-bold break-words bg-slate-50">उपयोग खाद्यान्न</th>
                    <th className="border border-black px-0.5 py-1 font-extrabold break-words bg-slate-50">अवशेष 8-9=10</th>
                    <th className="border border-black px-0.5 py-1 font-extrabold break-words bg-slate-50">लाभान्वित छात्र संख्या</th>

                    {/* Col 12 to 19 (वित्तीय) */}
                    <th className="border border-black px-0.5 py-1 font-bold break-words bg-slate-50">प्राप्त लिमिट राशि</th>
                    <th className="border border-black px-0.5 py-1 font-bold break-words bg-slate-50">PFMS अवशेष राशि</th>
                    <th className="border border-black px-0.5 py-1 font-bold break-words bg-slate-50">दाल क्रय व्यय</th>
                    <th className="border border-black px-0.5 py-1 font-bold break-words bg-slate-50">नमक मसाला व्यय</th>
                    <th className="border border-black px-0.5 py-1 font-bold break-words bg-slate-50">सब्जी मद व्यय</th>
                    <th className="border border-black px-0.5 py-1 font-bold break-words bg-slate-50">तेल मद व्यय</th>
                    <th className="border border-black px-0.5 py-1 font-bold break-words bg-slate-50">जलावन / गैस व्यय</th>
                    <th className="border border-black px-0.5 py-1 font-extrabold break-words bg-slate-50">कुल व्यय राशि</th>

                    {/* Col 20 to 24 */}
                    <th className="border border-black border-t-0 p-0.5 text-center font-extrabold bg-slate-200 align-top text-[8.5px]">दिवस</th>
                    <th className="border border-black border-t-0 p-0.5 text-center font-extrabold bg-slate-200 align-top text-[8.5px]">दिवस</th>
                    <th className="border border-black border-t-0 p-0.5 text-center font-extrabold bg-slate-200 align-top text-[8.5px]">लाभान्वित</th>
                    <th className="border border-black border-t-0 p-0.5 text-center font-extrabold bg-slate-200 align-top text-[8.5px]">नामांकन</th>
                    <th className="border border-black border-t-0 p-0.5 text-center font-extrabold bg-slate-200 align-top text-[8.5px]">अभ्युक्ति</th>
                  </tr>

                  {/* Third Row: Column Numbers 1 to 24 */}
                  <tr className="bg-slate-200 text-black font-extrabold text-[8px]" style={{ height: '18px' }}>
                    {Array.from({ length: 24 }, (_, i) => (
                      <th key={i + 1} className="border border-black p-0.5 font-extrabold">
                        {i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {/* Row 1: कक्षा 1-5 */}
                  <tr className="hover:bg-slate-50 transition" style={{ height: '95px' }}>
                    <td className="border border-black px-0.5 py-1 text-center font-extrabold text-[11px] align-middle">{calc.row1to5.sNo}</td>
                    <td className="border border-black px-0.5 py-1 font-bold whitespace-nowrap overflow-hidden text-ellipsis align-middle text-[11px]">{calc.row1to5.className}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-bold text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{formatValKg(calc.row1to5.col3_annualAllotment)}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-bold text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{formatValKg(calc.row1to5.col4_prevLifting)}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-bold text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{formatValKg(calc.row1to5.col5_currentLifting)}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-bold text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{formatValKg(calc.row1to5.col6_totalLifting)}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-bold text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{formatValKg(calc.row1to5.col7_prevBalanceRice)}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-bold text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{formatValKg(calc.row1to5.col8_totalAvailableRice)}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-bold text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{formatValKg(calc.row1to5.col9_consumedRice)}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-bold text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{calc.row1to5.col8_totalAvailableRice > 0 ? formatValKg(calc.row1to5.col10_closingBalanceRice) : '-'}</td>
                    <td className="border border-black p-0 font-mono font-bold text-center bg-amber-50/70 overflow-hidden align-middle">
                      <input
                        type="number"
                        min="0"
                        value={schoolDetails.overrideStudentDays1to5 ?? (calc.row1to5.col11_beneficiaryDays > 0 ? calc.row1to5.col11_beneficiaryDays : '')}
                        placeholder="-"
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : Math.max(0, parseInt(e.target.value, 10) || 0);
                          onUpdateSchoolDetails?.({ ...schoolDetails, overrideStudentDays1to5: val });
                        }}
                        className="w-full text-center font-mono font-bold bg-transparent outline-none focus:bg-amber-200 rounded text-[11px] py-1"
                        title="कॉलम 11 (कुल विद्यार्थी-दिवस 1-5): सीधे एडिट करें"
                      />
                    </td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-bold text-[9.5px] overflow-hidden whitespace-nowrap align-middle">
                      {calc.row1to5.col12_pfmsLimitReceived != null && calc.row1to5.col12_pfmsLimitReceived > 0 ? formatINR(calc.row1to5.col12_pfmsLimitReceived) : '-'}
                    </td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-bold text-[9.5px] overflow-hidden whitespace-nowrap align-middle">
                      {calc.row1to5.col13_pfmsBalanceAmount != null && calc.row1to5.col13_pfmsBalanceAmount > 0 ? formatINR(calc.row1to5.col13_pfmsBalanceAmount) : '-'}
                    </td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-bold text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{formatValINR(calc.row1to5.col14_dalExp)}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-bold text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{formatValINR(calc.row1to5.col15_masalaExp)}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-bold text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{formatValINR(calc.row1to5.col16_sabjiExp)}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-bold text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{formatValINR(calc.row1to5.col17_telExp)}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-bold text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{formatValINR(calc.row1to5.col18_jalawanExp)}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-bold text-[10px] bg-blue-50/60 overflow-hidden whitespace-nowrap align-middle">{formatValINR(calc.row1to5.col19_totalExp)}</td>
                    <td className="border border-black px-0.5 py-1 font-mono font-bold text-center text-[10px] overflow-hidden whitespace-nowrap align-middle">{calc.row1to5.col20_schoolWorkingDays > 0 ? calc.row1to5.col20_schoolWorkingDays : '-'}</td>
                    <td className="border border-black px-0.5 py-1 font-mono font-bold text-center text-[10px] overflow-hidden whitespace-nowrap align-middle">{calc.row1to5.col21_mdmServingDays > 0 ? calc.row1to5.col21_mdmServingDays : '-'}</td>
                    <td className="border border-black px-0.5 py-1 font-mono font-bold text-center text-[10px] overflow-hidden whitespace-nowrap align-middle">{calc.row1to5.col22_avgBeneficiaries > 0 ? calc.row1to5.col22_avgBeneficiaries : '-'}</td>
                    <td className="border border-black px-0.5 py-1 font-mono font-bold text-center text-[10px] overflow-hidden whitespace-nowrap align-middle">{calc.row1to5.col23_enrollment > 0 ? calc.row1to5.col23_enrollment : '-'}</td>
                    <td className="border border-black p-0.5 text-[8.5px] font-bold text-center overflow-hidden whitespace-nowrap align-middle">{calc.row1to5.col24_remarks || '-'}</td>
                  </tr>

                  {/* Row 2: कक्षा 6-8 */}
                  <tr className="hover:bg-slate-50 transition" style={{ height: '95px' }}>
                    <td className="border border-black px-0.5 py-1 text-center font-extrabold text-[11px] align-middle">{calc.row6to8.sNo}</td>
                    <td className="border border-black px-0.5 py-1 font-bold whitespace-nowrap overflow-hidden text-ellipsis align-middle text-[11px]">{calc.row6to8.className}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-bold text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{has6to8Data ? formatValKg(calc.row6to8.col3_annualAllotment) : '-'}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-bold text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{has6to8Data ? formatValKg(calc.row6to8.col4_prevLifting) : '-'}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-bold text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{has6to8Data ? formatValKg(calc.row6to8.col5_currentLifting) : '-'}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-bold text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{has6to8Data ? formatValKg(calc.row6to8.col6_totalLifting) : '-'}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-bold text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{has6to8Data ? formatValKg(calc.row6to8.col7_prevBalanceRice) : '-'}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-bold text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{has6to8Data ? formatValKg(calc.row6to8.col8_totalAvailableRice) : '-'}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-bold text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{has6to8Data ? formatValKg(calc.row6to8.col9_consumedRice) : '-'}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-bold text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{has6to8Data && calc.row6to8.col8_totalAvailableRice > 0 ? formatValKg(calc.row6to8.col10_closingBalanceRice) : '-'}</td>
                    <td className="border border-black p-0 font-mono font-bold text-center bg-amber-50/70 overflow-hidden align-middle">
                      {has6to8Data ? (
                        <input
                          type="number"
                          min="0"
                          value={schoolDetails.overrideStudentDays6to8 ?? (calc.row6to8.col11_beneficiaryDays > 0 ? calc.row6to8.col11_beneficiaryDays : '')}
                          placeholder="-"
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : Math.max(0, parseInt(e.target.value, 10) || 0);
                            onUpdateSchoolDetails?.({ ...schoolDetails, overrideStudentDays6to8: val });
                          }}
                          className="w-full text-center font-mono font-bold bg-transparent outline-none focus:bg-amber-200 rounded text-[11px] py-1"
                          title="कॉलम 11 (कुल विद्यार्थी-दिवस 6-8): सीधे एडिट करें"
                        />
                      ) : (
                        <span className="text-slate-600 font-bold text-[11px]">-</span>
                      )}
                    </td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-bold text-[9.5px] overflow-hidden whitespace-nowrap align-middle">
                      {has6to8Data && calc.row6to8.col12_pfmsLimitReceived != null && calc.row6to8.col12_pfmsLimitReceived > 0 ? formatINR(calc.row6to8.col12_pfmsLimitReceived) : '-'}
                    </td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-bold text-[9.5px] overflow-hidden whitespace-nowrap align-middle">
                      {has6to8Data && calc.row6to8.col13_pfmsBalanceAmount != null && calc.row6to8.col13_pfmsBalanceAmount > 0 ? formatINR(calc.row6to8.col13_pfmsBalanceAmount) : '-'}
                    </td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-bold text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{has6to8Data ? formatValINR(calc.row6to8.col14_dalExp) : '-'}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-bold text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{has6to8Data ? formatValINR(calc.row6to8.col15_masalaExp) : '-'}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-bold text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{has6to8Data ? formatValINR(calc.row6to8.col16_sabjiExp) : '-'}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-bold text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{has6to8Data ? formatValINR(calc.row6to8.col17_telExp) : '-'}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-bold text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{has6to8Data ? formatValINR(calc.row6to8.col18_jalawanExp) : '-'}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-bold text-[10px] bg-blue-50/60 overflow-hidden whitespace-nowrap align-middle">{has6to8Data ? formatValINR(calc.row6to8.col19_totalExp) : '-'}</td>
                    <td className="border border-black px-0.5 py-1 font-mono font-bold text-center text-[10px] overflow-hidden whitespace-nowrap align-middle">{has6to8Data && calc.row6to8.col20_schoolWorkingDays > 0 ? calc.row6to8.col20_schoolWorkingDays : '-'}</td>
                    <td className="border border-black px-0.5 py-1 font-mono font-bold text-center text-[10px] overflow-hidden whitespace-nowrap align-middle">{has6to8Data && calc.row6to8.col21_mdmServingDays > 0 ? calc.row6to8.col21_mdmServingDays : '-'}</td>
                    <td className="border border-black px-0.5 py-1 font-mono font-bold text-center text-[10px] overflow-hidden whitespace-nowrap align-middle">{has6to8Data && calc.row6to8.col22_avgBeneficiaries > 0 ? calc.row6to8.col22_avgBeneficiaries : '-'}</td>
                    <td className="border border-black px-0.5 py-1 font-mono font-bold text-center text-[10px] overflow-hidden whitespace-nowrap align-middle">{has6to8Data && calc.row6to8.col23_enrollment > 0 ? calc.row6to8.col23_enrollment : '-'}</td>
                    <td className="border border-black p-0.5 text-[8.5px] font-bold text-center overflow-hidden whitespace-nowrap align-middle">{has6to8Data && calc.row6to8.col24_remarks ? calc.row6to8.col24_remarks : '-'}</td>
                  </tr>

                  {/* Row 3: कुल योग */}
                  <tr className="bg-slate-100 font-extrabold border-t-2 border-black" style={{ height: '98px' }}>
                    <td className="border border-black px-0.5 py-1 font-extrabold align-middle text-center text-[11px]">-</td>
                    <td className="border border-black px-0.5 py-1 font-black whitespace-nowrap overflow-hidden text-ellipsis align-middle text-[11.5px]">{calc.totalRow.className}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-black text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{formatValKg(calc.totalRow.col3_annualAllotment)}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-black text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{formatValKg(calc.totalRow.col4_prevLifting)}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-black text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{formatValKg(calc.totalRow.col5_currentLifting)}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-black text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{formatValKg(calc.totalRow.col6_totalLifting)}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-black text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{formatValKg(calc.totalRow.col7_prevBalanceRice)}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-black text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{formatValKg(calc.totalRow.col8_totalAvailableRice)}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-black text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{formatValKg(calc.totalRow.col9_consumedRice)}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-black text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{calc.totalRow.col8_totalAvailableRice > 0 ? formatValKg(calc.totalRow.col10_closingBalanceRice) : '-'}</td>
                    <td className="border border-black px-0.5 py-1 font-mono font-black text-center bg-amber-100 text-[11px] overflow-hidden whitespace-nowrap align-middle">
                      {calc.totalRow.col11_beneficiaryDays > 0 ? calc.totalRow.col11_beneficiaryDays : '-'}
                    </td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-black text-[9.5px] overflow-hidden whitespace-nowrap align-middle">
                      {calc.totalRow.col12_pfmsLimitReceived != null && calc.totalRow.col12_pfmsLimitReceived > 0 ? formatINR(calc.totalRow.col12_pfmsLimitReceived) : '-'}
                    </td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-black text-[9.5px] overflow-hidden whitespace-nowrap align-middle">
                      {calc.totalRow.col13_pfmsBalanceAmount != null && calc.totalRow.col13_pfmsBalanceAmount > 0 ? formatINR(calc.totalRow.col13_pfmsBalanceAmount) : '-'}
                    </td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-black text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{formatValINR(calc.totalRow.col14_dalExp)}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-black text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{formatValINR(calc.totalRow.col15_masalaExp)}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-black text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{formatValINR(calc.totalRow.col16_sabjiExp)}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-black text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{formatValINR(calc.totalRow.col17_telExp)}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-black text-[9.5px] overflow-hidden whitespace-nowrap align-middle">{formatValINR(calc.totalRow.col18_jalawanExp)}</td>
                    <td className="border border-black px-0.5 py-1 text-right font-mono font-black text-[10.5px] bg-blue-100 text-black overflow-hidden whitespace-nowrap align-middle">{formatValINR(calc.totalRow.col19_totalExp)}</td>
                    <td className="border border-black px-0.5 py-1 font-mono font-black text-center text-[10px] overflow-hidden whitespace-nowrap align-middle">{calc.totalRow.col20_schoolWorkingDays > 0 ? calc.totalRow.col20_schoolWorkingDays : '-'}</td>
                    <td className="border border-black px-0.5 py-1 font-mono font-black text-center text-[10px] overflow-hidden whitespace-nowrap align-middle">{calc.totalRow.col21_mdmServingDays > 0 ? calc.totalRow.col21_mdmServingDays : '-'}</td>
                    <td className="border border-black px-0.5 py-1 font-mono font-black text-center text-[10px] overflow-hidden whitespace-nowrap align-middle">{calc.totalRow.col22_avgBeneficiaries > 0 ? calc.totalRow.col22_avgBeneficiaries : '-'}</td>
                    <td className="border border-black px-0.5 py-1 font-mono font-black text-center text-[10px] overflow-hidden whitespace-nowrap align-middle">{calc.totalRow.col23_enrollment > 0 ? calc.totalRow.col23_enrollment : '-'}</td>
                    <td className="border border-black p-0.5 text-center font-bold text-[9px] align-middle">-</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 4. Official Certification Note (Directly beneath the 3 expanded rows) */}
            <div className="mt-2.5 text-[10.5px] font-semibold text-black leading-tight">
              नोट:- प्रमाणित किया जाता है कि वित्तीय, विद्यालय में संधारित एवं उपलब्ध पोषाहार पंजी के आधार पर तैयार की गई है जो पूर्णरूपेण सही है।
            </div>

            {/* 5. Official Signatures Section (Anchored to bottom of page) */}
            <div className="mt-auto pt-2 pb-1">
              <div className="flex justify-between items-end text-[11.5px] font-bold text-black px-6">
                <div className="text-center">
                  <div className="h-16"></div>
                  <div>वि० शि० समिति / प्रबंध समिति</div>
                  <div>अध्यक्ष / सचिव का हस्ताक्षर एवं मोहर</div>
                  <div className="mt-1">
                    <input
                      type="text"
                      value={schoolDetails.smcSecretaryName}
                      onChange={(e) => onUpdateSchoolDetails?.({ ...schoolDetails, smcSecretaryName: e.target.value })}
                      placeholder="(अध्यक्ष/सचिव का नाम)"
                      className="text-[10px] text-center border-b border-dotted border-black bg-transparent focus:bg-amber-50 focus:outline-hidden text-slate-800 w-48"
                    />
                  </div>
                </div>

                <div className="text-center font-bold text-[13px] pb-1">
                  <input
                    type="text"
                    value={schoolDetails.districtName || 'पूर्णियाँ'}
                    onChange={(e) => onUpdateSchoolDetails?.({ ...schoolDetails, districtName: e.target.value })}
                    placeholder="पूर्णियाँ"
                    className="text-center font-bold text-[13px] border-b border-dotted border-black bg-transparent focus:bg-amber-50 focus:outline-hidden min-w-[140px] px-1"
                  />
                </div>

                <div className="text-center">
                  <div className="h-16"></div>
                  <div>प्रभारी प्रधानाध्यापक / प्रधानाध्यापक का हस्ताक्षर एवं मोहर</div>
                  <div className="mt-1">
                    <input
                      type="text"
                      value={schoolDetails.hmName}
                      onChange={(e) => onUpdateSchoolDetails?.({ ...schoolDetails, hmName: e.target.value })}
                      placeholder="(प्रधानाध्यापक का नाम)"
                      className="text-[10px] text-center border-b border-dotted border-black bg-transparent focus:bg-amber-50 focus:outline-hidden text-slate-800 w-48"
                    />
                  </div>
                </div>
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
            onClick={handleDownloadDirectPdf}
            disabled={isGeneratingPdf}
            className="px-3.5 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-1 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> {isGeneratingPdf ? 'तैयार...' : 'PDF डाउनलोड'}
          </button>
        </div>
      </div>
    </div>
  );
};
