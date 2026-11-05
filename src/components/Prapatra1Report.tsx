import React, { useRef, useState, useMemo } from 'react';
import { Download, Printer, ZoomIn, ZoomOut, RotateCcw, CheckCircle2, Users, Calendar } from 'lucide-react';
import { MonthData, Prapatra1FinancialData, SchoolDetails } from '../types/mdm';
import { calculatePrapatraRows } from '../utils/mdmCalculations';
import { formatINR, formatKg, OFFICIAL_DEFAULT_RATES, round2 } from '../utils/mdmRates';
import { autoTranslateToHindi, translateToHindiAsync } from '../utils/hindiTransliterator';
import { downloadSinglePagePdf } from '../utils/pdfExport';

interface Props {
  data: MonthData;
  onUpdateSchoolDetails?: (updated: SchoolDetails) => void;
  onUpdatePrapatra1Data?: (updated: Prapatra1FinancialData) => void;
}

export const Prapatra1Report: React.FC<Props> = ({
  data,
  onUpdateSchoolDetails,
  onUpdatePrapatra1Data,
}) => {
  const { schoolDetails, dailyEntries } = data;
  const rates = data.customRates || OFFICIAL_DEFAULT_RATES;
  const calc = calculatePrapatraRows(data, rates);

  const printAreaRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  const handleAutoTranslate = async (field: keyof SchoolDetails, val: string) => {
    if (!val || !val.trim()) return;
    const quick = autoTranslateToHindi(val);
    handleSchoolDetailChange(field, quick);
    try {
      const enhanced = await translateToHindiAsync(val);
      if (enhanced && enhanced !== quick) {
        handleSchoolDetailChange(field, enhanced);
      }
    } catch {
      // fallback applied
    }
  };

  // Auto-calculated defaults from daily records & school details
  const autoValues = useMemo(() => {
    const studentDays1to5 = calc.row1to5.col11_beneficiaryDays;
    const studentDays6to8 = calc.row6to8.col11_beneficiaryDays;
    const totalStudentDays = studentDays1to5 + studentDays6to8;

    const mdmServingDays = calc.totalRow.col21_mdmServingDays;
    const schoolWorkingDays = calc.totalRow.col20_schoolWorkingDays;

    // Student Averages (Auto-Calculated)
    const avgStudents1to5 = mdmServingDays > 0 ? Math.round(studentDays1to5 / mdmServingDays) : 0;
    const avgStudents6to8 = mdmServingDays > 0 ? Math.round(studentDays6to8 / mdmServingDays) : 0;
    const totalAvgStudents = avgStudents1to5 + avgStudents6to8;

    // Fixed Official Rate 01-05-2025: Class 1-5: ₹6.78, Class 6-8: ₹10.17
    // Class 1-5 Breakdown (₹6.78)
    const exp1_dal = round2(studentDays1to5 * rates.class1to5.dal.costPerChild); // ₹2.40
    const exp1_masala = round2(studentDays1to5 * rates.class1to5.masala.costPerChild); // ₹0.63
    const exp1_tel = round2(studentDays1to5 * rates.class1to5.tel.costPerChild); // ₹0.80
    const exp1_sabji = round2(studentDays1to5 * rates.class1to5.sabji.costPerChild); // ₹1.75
    const exp1_jalawan = round2(studentDays1to5 * rates.class1to5.jalawan.costPerChild); // ₹1.20
    const exp1_total = round2(studentDays1to5 * 6.78);

    // Class 6-8 Breakdown (₹10.17)
    const exp6_dal = round2(studentDays6to8 * rates.class6to8.dal.costPerChild); // ₹3.60
    const exp6_masala = round2(studentDays6to8 * rates.class6to8.masala.costPerChild); // ₹0.945 / ₹0.95
    const exp6_tel = round2(studentDays6to8 * rates.class6to8.tel.costPerChild); // ₹1.20
    const exp6_sabji = round2(studentDays6to8 * rates.class6to8.sabji.costPerChild); // ₹2.625 / ₹2.62
    const exp6_jalawan = round2(studentDays6to8 * rates.class6to8.jalawan.costPerChild); // ₹1.80
    const exp6_total = round2(studentDays6to8 * 10.17);

    // Foodgrains (Rice)
    const riceOpening = round2((schoolDetails.prevBalanceRice1to5 || 0) + (schoolDetails.prevBalanceRice6to8 || 0));
    const riceReceived = round2((schoolDetails.currentLifting1to5 || 0) + (schoolDetails.currentLifting6to8 || 0));
    const riceConsumed = calc.totalRow.col9_consumedRice;
    const riceClosing = Math.max(0, round2(riceOpening + riceReceived - riceConsumed));

    // Egg / Fruit
    const eggTotal = dailyEntries.reduce((sum, e) => sum + (e.isMealServed && !e.isHoliday ? Number(e.eggCount || 0) : 0), 0);
    const fruitTotal = dailyEntries.reduce((sum, e) => sum + (e.isMealServed && !e.isHoliday ? Number(e.fruitCount || 0) : 0), 0);
    const eggFruitBeneficiaries = eggTotal + fruitTotal;
    const eggFruitDays = dailyEntries.filter((e) => e.isMealServed && !e.isHoliday && (e.dayOfWeekHindi === 'शुक्रवार' || (e.eggCount || 0) > 0)).length;
    const eggFruitCost = round2(eggFruitBeneficiaries * 5.0);

    return {
      studentDays1to5,
      studentDays6to8,
      totalStudentDays,
      mdmServingDays,
      schoolWorkingDays,
      avgStudents1to5,
      avgStudents6to8,
      totalAvgStudents,
      exp1_dal,
      exp1_masala,
      exp1_tel,
      exp1_sabji,
      exp1_jalawan,
      exp1_total,
      exp6_dal,
      exp6_masala,
      exp6_tel,
      exp6_sabji,
      exp6_jalawan,
      exp6_total,
      riceOpening,
      riceReceived,
      riceConsumed,
      riceClosing,
      eggFruitBeneficiaries,
      eggFruitDays,
      eggFruitCost,
    };
  }, [calc, dailyEntries, schoolDetails, rates]);

  // Merge stored custom data with auto-calculated defaults
  const pData: Prapatra1FinancialData = data.prapatra1Data || {};

  const handleFieldChange = (field: keyof Prapatra1FinancialData, value: any) => {
    const updated = {
      ...pData,
      [field]: value,
    };
    if (onUpdatePrapatra1Data) {
      onUpdatePrapatra1Data(updated);
    }
  };

  const handleSchoolDetailChange = (field: keyof SchoolDetails, value: any) => {
    if (onUpdateSchoolDetails) {
      onUpdateSchoolDetails({
        ...schoolDetails,
        [field]: value,
      });
    }
  };

  const handleResetToAuto = () => {
    if (onUpdatePrapatra1Data) {
      onUpdatePrapatra1Data({});
    }
  };

  // Values resolution (Manual override OR Auto calculated)
  const openingBank = pData.openingBank ?? 0;
  const openingCash = pData.openingCash ?? 0;
  const totalOpening = openingBank + openingCash;

  const receipt1to5 = pData.receiptConversion1to5 ?? autoValues.exp1_total;
  const receipt6to8 = pData.receiptConversion6to8 ?? autoValues.exp6_total;
  const receiptCook = pData.receiptCookHonorarium ?? 0;
  const receiptKitchen = pData.receiptKitchenShed ?? 0;
  const receiptUtensils = pData.receiptUtensils ?? 0;
  const receiptOtherAmount = pData.receiptOtherAmount ?? 0;
  const receiptOtherName = pData.receiptOtherName ?? '';
  const receiptExtra1Amount = pData.receiptExtra1Amount ?? 0;
  const receiptExtra1Name = pData.receiptExtra1Name ?? '';
  const receiptExtra2Amount = pData.receiptExtra2Amount ?? 0;
  const receiptExtra2Name = pData.receiptExtra2Name ?? '';

  const totalReceipts = receipt1to5 + receipt6to8 + receiptCook + receiptKitchen + receiptUtensils + receiptOtherAmount + receiptExtra1Amount + receiptExtra2Amount;
  const grandTotalIncome = totalOpening + totalReceipts;

  // Expenditures 1-5 (At official rate ₹6.78)
  const exp1Dal = pData.exp1to5Dal ?? autoValues.exp1_dal;
  const exp1Masala = pData.exp1to5Masala ?? autoValues.exp1_masala;
  const exp1Tel = pData.exp1to5Tel ?? autoValues.exp1_tel;
  const exp1Sabji = pData.exp1to5Sabji ?? autoValues.exp1_sabji;
  const exp1Jalawan = pData.exp1to5Jalawan ?? autoValues.exp1_jalawan;
  const exp1Total = exp1Dal + exp1Masala + exp1Tel + exp1Sabji + exp1Jalawan;

  // Expenditures 6-8 (At official rate ₹10.17)
  const exp6Dal = pData.exp6to8Dal ?? autoValues.exp6_dal;
  const exp6Masala = pData.exp6to8Masala ?? autoValues.exp6_masala;
  const exp6Tel = pData.exp6to8Tel ?? autoValues.exp6_tel;
  const exp6Sabji = pData.exp6to8Sabji ?? autoValues.exp6_sabji;
  const exp6Jalawan = pData.exp6to8Jalawan ?? autoValues.exp6_jalawan;
  const exp6Total = exp6Dal + exp6Masala + exp6Tel + exp6Sabji + exp6Jalawan;

  const expCook = pData.expCookHonorarium ?? receiptCook;
  const expKitchen = pData.expKitchenShed ?? receiptKitchen;
  const expUtensils = pData.expUtensils ?? receiptUtensils;
  const expOtherAmount = pData.expOtherAmount ?? receiptOtherAmount;
  const expOtherName = pData.expOtherName ?? receiptOtherName;

  const totalExpenditure = exp1Total + exp6Total + expCook + expKitchen + expUtensils + expOtherAmount;

  // Closing balances (Auto calculated as Income - Expenditure, or overrideable)
  const defaultRemaining = Math.max(0, grandTotalIncome - totalExpenditure);
  const closingBank = pData.closingBank ?? defaultRemaining;
  const closingCash = pData.closingCash ?? 0;
  const totalClosing = closingBank + closingCash;
  const grandTotalExpenseAndClosing = totalExpenditure + totalClosing;

  // Material Statement Values
  const riceOpening = pData.riceOpeningKg ?? autoValues.riceOpening;
  const riceReceived = pData.riceReceivedKg ?? autoValues.riceReceived;
  const riceConsumed = pData.riceConsumedKg ?? autoValues.riceConsumed;
  const riceClosing = pData.riceClosingKg ?? Math.max(0, round2(riceOpening + riceReceived - riceConsumed));

  // Egg / Fruit Values
  const eggFruitPrev = pData.eggFruitPrevBalance ?? 0;
  const eggFruitRecv = pData.eggFruitReceived ?? autoValues.eggFruitCost;
  const eggFruitTotalRecv = eggFruitPrev + eggFruitRecv;
  const eggFruitSpent = pData.eggFruitSpent ?? autoValues.eggFruitCost;
  const eggFruitClosing = pData.eggFruitClosingBalance ?? Math.max(0, eggFruitTotalRecv - eggFruitSpent);
  const eggFruitBeneficiaries = pData.eggFruitBeneficiaryCount ?? autoValues.eggFruitBeneficiaries;
  const eggFruitDays = pData.eggFruitDaysCount ?? autoValues.eggFruitDays;

  // PDF Generation (Single A4 Full Page)
  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    try {
      setIsGeneratingPdf(true);
      const filename = `प्रपत्र_1_अनुलग्नक_2_मासिक_प्रगति_प्रतिवेदन_${schoolDetails.month || 'माह'}_${schoolDetails.year || 'वर्ष'}_${(schoolDetails.schoolName || 'विद्यालय').replace(/\s+/g, '_')}.pdf`;
      await downloadSinglePagePdf({
        element: printAreaRef.current,
        fileName: filename,
        orientation: 'portrait',
        marginMm: 3,
      });
    } catch (err) {
      console.error('PDF error:', err);
      alert('PDF निर्माण में त्रुटि। आप "प्रिंट करें" बटन से "Save as PDF" चुन सकते हैं।');
    } finally {
      setIsGeneratingPdf(false);
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

  return (
    <div className="space-y-4">
      {/* Dynamic Print Styles for Single A4 Portrait Output */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait !important;
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
          .report-sheet-page {
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: 290mm !important;
            padding: 3mm 4mm !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        }
      `}</style>

      {/* Control Action Toolbar */}
      <div className="no-print bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isGeneratingPdf ? 'PDF तैयार हो रहा है...' : 'अनुलग्नक-2 PDF डाउनलोड करें'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <Printer className="w-4 h-4" />
            <span>प्रिंट करें (A4 Portrait)</span>
          </button>

          <button
            onClick={handleResetToAuto}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-semibold transition"
            title="दैनिक पंजी से स्वतः पुनः गणना करें"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
            <span>स्वतः गणना पुनः सिंक करें</span>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200 text-xs">
            <button
              onClick={() => setZoomLevel((prev) => Math.max(70, prev - 10))}
              className="p-1 hover:bg-white rounded transition text-slate-700"
              title="ज़ूम कम करें"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono font-bold text-slate-700">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((prev) => Math.min(130, prev + 10))}
              className="p-1 hover:bg-white rounded transition text-slate-700"
              title="ज़ूम बढ़ाएँ"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleFitToScreen}
              className="px-2 py-1 hover:bg-white rounded text-emerald-800 font-semibold transition border-l border-slate-200 flex items-center gap-1 text-[11px]"
              title="स्क्रीन के अनुसार आकार दें"
            >
              📱 स्क्रीन फिट
            </button>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>दर: ₹6.78 (1-5) | ₹10.17 (6-8) अनुपालन</span>
          </div>
        </div>
      </div>

      {/* Auto-Calculated Student Average Bar (Live Sync & Override) */}
      <div className="no-print bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-950 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-blue-900">कुल विद्यार्थी-दिवस संपादन (Student-Days Edit): </span>
            <span className="font-medium text-slate-700">
              भोजन दिवस: <strong className="text-blue-950">{autoValues.mdmServingDays}</strong> / {autoValues.schoolWorkingDays} दिन
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 font-semibold text-[11px]">
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-md border border-blue-200 text-blue-900 shadow-2xs">
            <span>वर्ग 1-5 विद्यार्थी-दिवस:</span>
            <input
              type="number"
              min="0"
              value={schoolDetails.overrideStudentDays1to5 ?? autoValues.studentDays1to5}
              onChange={(e) => {
                const val = e.target.value === '' ? null : Math.max(0, parseInt(e.target.value, 10) || 0);
                handleSchoolDetailChange('overrideStudentDays1to5', val);
              }}
              className="w-16 px-1 py-0.5 border border-blue-300 rounded font-mono font-bold text-center bg-blue-50/50 focus:bg-white outline-none"
              title="सीधे कुल विद्यार्थी दिवस बदलें"
            />
            <span className="text-[10px] text-slate-500 font-normal">
              (औसत: <strong>{autoValues.avgStudents1to5}</strong> × ₹6.78)
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-md border border-indigo-200 text-indigo-900 shadow-2xs">
            <span>वर्ग 6-8 विद्यार्थी-दिवस:</span>
            <input
              type="number"
              min="0"
              value={schoolDetails.overrideStudentDays6to8 ?? autoValues.studentDays6to8}
              onChange={(e) => {
                const val = e.target.value === '' ? null : Math.max(0, parseInt(e.target.value, 10) || 0);
                handleSchoolDetailChange('overrideStudentDays6to8', val);
              }}
              className="w-16 px-1 py-0.5 border border-indigo-300 rounded font-mono font-bold text-center bg-indigo-50/50 focus:bg-white outline-none"
              title="सीधे कुल विद्यार्थी दिवस बदलें"
            />
            <span className="text-[10px] text-slate-500 font-normal">
              (औसत: <strong>{autoValues.avgStudents6to8}</strong> × ₹10.17)
            </span>
          </div>

          {(schoolDetails.overrideStudentDays1to5 != null || schoolDetails.overrideStudentDays6to8 != null) && (
            <button
              onClick={() => {
                if (onUpdateSchoolDetails) {
                  onUpdateSchoolDetails({
                    ...schoolDetails,
                    overrideStudentDays1to5: null,
                    overrideStudentDays6to8: null,
                  });
                }
              }}
              className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded border border-amber-300 text-[10px] font-bold transition cursor-pointer"
              title="दैनिक प्रविष्टि के योग पर रीसेट करें"
            >
              रीसेट
            </button>
          )}

          <span className="bg-emerald-100 text-emerald-950 px-2.5 py-1 rounded-md border border-emerald-300 font-bold font-mono">
            कुल औसत: {autoValues.totalAvgStudents}
          </span>
        </div>
      </div>

      {/* Sheet Preview Wrapper */}
      <div className="overflow-x-auto custom-scrollbar flex justify-center py-2">
        <div
          ref={printAreaRef}
          style={{
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top center',
            width: '210mm',
            minHeight: '297mm',
            boxSizing: 'border-box',
          }}
          className="bg-white text-black px-5 py-4 shadow-xl border border-slate-300 font-sans transition-transform report-sheet-page text-[10px] leading-tight"
        >
          {/* Top Form Header */}
          <div className="flex justify-between items-start text-xs font-bold mb-1">
            <span>प्रपत्र -1</span>
            <span>अनुलग्नक - 2</span>
          </div>

          <div className="text-center font-bold mb-2 space-y-0.5">
            <h1 className="text-sm sm:text-base font-extrabold tracking-tight">
              मध्याह्न भोजन योजना कार्यक्रम (मासिक प्रगति प्रतिवेदन)
            </h1>
            <h2 className="text-xs sm:text-sm font-bold">विद्यालय से संबंधित प्रतिवेदन</h2>
            <div className="flex items-center justify-center gap-1 text-xs pt-0.5">
              <span>प्राप्ति एवं व्यय संबंधी माह का नाम</span>
              <input
                type="text"
                value={schoolDetails.month ? `${schoolDetails.month} ${schoolDetails.year}` : ''}
                onChange={(e) => handleSchoolDetailChange('month', e.target.value)}
                placeholder="....................................."
                className="font-bold border-b border-dotted border-black px-1 text-center bg-transparent focus:bg-amber-50 outline-none w-48 text-xs"
              />
            </div>
          </div>

          {/* School, Block, District Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold mb-2 border-b border-black pb-1.5">
            <div className="flex items-center gap-1 flex-1 min-w-[200px]">
              <span className="whitespace-nowrap">विद्यालय का नाम</span>
              <input
                type="text"
                value={schoolDetails.schoolName}
                onChange={(e) => handleSchoolDetailChange('schoolName', e.target.value)}
                onBlur={(e) => handleAutoTranslate('schoolName', e.target.value)}
                placeholder="............................................................"
                className="font-bold border-b border-dotted border-black px-1 bg-transparent focus:bg-amber-50 outline-none w-full text-xs"
                title="अंग्रेजी या हिंदी में लिखें, बाहर क्लिक करने पर स्वतः हिंदी में अनुवाद हो जाएगा"
              />
              <button
                type="button"
                onClick={() => handleAutoTranslate('schoolName', schoolDetails.schoolName)}
                className="no-print translate-helper-btn text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-1 py-0.5 rounded border border-slate-300 cursor-pointer"
                data-no-print="true"
                data-translate-btn="true"
                title="हिन्दी में अनुवाद करें"
              >
                हिन्दी
              </button>
            </div>

            <div className="flex items-center gap-1 min-w-[160px]">
              <span className="whitespace-nowrap">प्रखंड का नाम</span>
              <input
                type="text"
                value={schoolDetails.blockName}
                onChange={(e) => handleSchoolDetailChange('blockName', e.target.value)}
                onBlur={(e) => handleAutoTranslate('blockName', e.target.value)}
                placeholder="..................................."
                className="font-bold border-b border-dotted border-black px-1 bg-transparent focus:bg-amber-50 outline-none w-32 text-xs"
                title="अंग्रेजी या हिंदी में लिखें, बाहर क्लिक करने पर स्वतः हिंदी में अनुवाद हो जाएगा"
              />
              <button
                type="button"
                onClick={() => handleAutoTranslate('blockName', schoolDetails.blockName)}
                className="no-print translate-helper-btn text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-1 py-0.5 rounded border border-slate-300 cursor-pointer"
                data-no-print="true"
                data-translate-btn="true"
                title="हिन्दी में अनुवाद करें"
              >
                हिन्दी
              </button>
            </div>

            <div className="flex items-center gap-1 min-w-[140px]">
              <span className="whitespace-nowrap">जिला -</span>
              <input
                type="text"
                value={schoolDetails.districtName || 'पूर्णियाँ'}
                onChange={(e) => handleSchoolDetailChange('districtName', e.target.value)}
                onBlur={(e) => handleAutoTranslate('districtName', e.target.value)}
                placeholder="पूर्णियाँ"
                className="font-bold border-b border-dotted border-black px-1 bg-transparent focus:bg-amber-50 outline-none min-w-[140px] text-xs"
                title="जिला का नाम दर्ज करें"
              />
            </div>
          </div>

          {/* Section: वित्तीय विवरणी */}
          <div className="text-center font-extrabold text-xs mb-1 uppercase tracking-wide">
            वित्तीय विवरणी
          </div>

          {/* Table 1: आय एवं व्यय (Separate Rows Exactly as Requested & in Original PDF) */}
          <div className="border border-black mb-2.5">
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="border-b border-black bg-slate-100 font-bold text-center">
                  <th className="border-r border-black p-1 w-[38%] text-center">आय</th>
                  <th className="border-r border-black p-1 w-[12%] text-center">राशि</th>
                  <th className="border-r border-black p-1 w-[38%] text-center">
                    व्यय (पोषाहार पंजी के अनुसार प्रविष्टि के अनुरूप भरा जाय)
                  </th>
                  <th className="p-1 w-[12%] text-center">राशि</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black text-black">
                {/* ROW 1: A प्रारंभिक शेष (Separate Header Row) | C व्यय (Separate Header Row) */}
                <tr className="divide-x divide-black bg-slate-50 font-bold">
                  <td className="p-1">
                    <span className="mr-1">A</span>
                    <span>प्रारंभिक शेष :</span>
                  </td>
                  <td className="p-1 text-center text-slate-400">-</td>
                  <td className="p-1">
                    <span className="mr-1">C</span>
                    <span>व्यय (पोषाहार पंजी के अनुसार प्रविष्टि के अनुरूप भरा जाय)</span>
                  </td>
                  <td className="p-1 text-center text-slate-400">-</td>
                </tr>

                {/* ROW 2: बैंक मे (Separate Row) | 1 परिवर्तन मूल्य (वर्ग i-v) (Separate Row with 6.78 in Rashi column) */}
                <tr className="divide-x divide-black">
                  <td className="p-1 pl-5">बैंक मे</td>
                  <td className="p-1 text-right font-mono">
                    <input
                      type="number"
                      value={openingBank || ''}
                      onChange={(e) => handleFieldChange('openingBank', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full text-right font-mono bg-transparent outline-none"
                    />
                  </td>
                  <td className="p-1 pl-3 font-bold bg-slate-50/60">
                    1 परिवर्तन मूल्य (वर्ग i-v)
                  </td>
                  <td className="p-1 bg-slate-50/60 text-right font-mono font-bold">6.78</td>
                </tr>

                {/* ROW 3: हाथ मे (Separate Row) | (i) दाल (Separate Row) */}
                <tr className="divide-x divide-black">
                  <td className="p-1 pl-5">हाथ मे</td>
                  <td className="p-1 text-right font-mono">
                    <input
                      type="number"
                      value={openingCash || ''}
                      onChange={(e) => handleFieldChange('openingCash', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full text-right font-mono bg-transparent outline-none"
                    />
                  </td>
                  <td className="p-1 pl-6">(i) दाल</td>
                  <td className="p-1 text-right font-mono">{formatINR(exp1Dal)}</td>
                </tr>

                {/* ROW 4: B प्राप्ति (Separate Header Row) | (ii) मसाला / नमक */}
                <tr className="divide-x divide-black">
                  <td className="p-1 font-bold bg-slate-50">
                    <span className="mr-1">B</span>
                    <span>प्राप्ति :</span>
                  </td>
                  <td className="p-1 bg-slate-50 text-center text-slate-400">-</td>
                  <td className="p-1 pl-6">(ii) मसाला / नमक</td>
                  <td className="p-1 text-right font-mono">{formatINR(exp1Masala)}</td>
                </tr>

                {/* ROW 5: परिवर्तन मूल्य (वर्ग i-v) (दर ₹6.78) | (iii) तेल */}
                <tr className="divide-x divide-black">
                  <td className="p-1 pl-5">
                    <span>परिवर्तन मूल्य (वर्ग i-v) </span>
                    <span className="text-[9px] font-semibold text-slate-600">(दर: ₹6.78)</span>
                  </td>
                  <td className="p-1 text-right font-mono">
                    <input
                      type="number"
                      value={receipt1to5 || ''}
                      onChange={(e) => handleFieldChange('receiptConversion1to5', parseFloat(e.target.value) || 0)}
                      placeholder={formatINR(autoValues.exp1_total)}
                      className="w-full text-right font-mono bg-transparent outline-none"
                    />
                  </td>
                  <td className="p-1 pl-6">(iii) तेल</td>
                  <td className="p-1 text-right font-mono">{formatINR(exp1Tel)}</td>
                </tr>

                {/* ROW 6: परिवर्तन मूल्य (वर्ग vi-viii) (दर ₹10.17) | (iv) सब्जी */}
                <tr className="divide-x divide-black">
                  <td className="p-1 pl-5">
                    <span>परिवर्तन मूल्य (वर्ग vi-viii) </span>
                    <span className="text-[9px] font-semibold text-slate-600">(दर: ₹10.17)</span>
                  </td>
                  <td className="p-1 text-right font-mono">
                    <input
                      type="number"
                      value={receipt6to8 || ''}
                      onChange={(e) => handleFieldChange('receiptConversion6to8', parseFloat(e.target.value) || 0)}
                      placeholder={formatINR(autoValues.exp6_total)}
                      className="w-full text-right font-mono bg-transparent outline-none"
                    />
                  </td>
                  <td className="p-1 pl-6">(iv) सब्जी</td>
                  <td className="p-1 text-right font-mono">{formatINR(exp1Sabji)}</td>
                </tr>

                {/* ROW 7: रसोईया सह सहायक मानदेय | (v) जलावन */}
                <tr className="divide-x divide-black">
                  <td className="p-1 pl-5">रसोईया सह सहायक मानदेय</td>
                  <td className="p-1 text-right font-mono">
                    <input
                      type="number"
                      value={receiptCook || ''}
                      onChange={(e) => handleFieldChange('receiptCookHonorarium', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full text-right font-mono bg-transparent outline-none"
                    />
                  </td>
                  <td className="p-1 pl-6">(v) जलावन</td>
                  <td className="p-1 text-right font-mono">{formatINR(exp1Jalawan)}</td>
                </tr>

                {/* ROW 8: रसोई घर निर्माण मद | (vi) कुल योग (वर्ग 1-5 @ ₹6.78) */}
                <tr className="divide-x divide-black bg-slate-50/50">
                  <td className="p-1 pl-5">रसोई घर निर्माण मद</td>
                  <td className="p-1 text-right font-mono">
                    <input
                      type="number"
                      value={receiptKitchen || ''}
                      onChange={(e) => handleFieldChange('receiptKitchenShed', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full text-right font-mono bg-transparent outline-none"
                    />
                  </td>
                  <td className="p-1 pl-6 font-bold">
                    (vi) कुल योग (वर्ग i-v @ ₹6.78)
                  </td>
                  <td className="p-1 text-right font-mono font-bold">{formatINR(exp1Total)}</td>
                </tr>

                {/* ROW 9: बर्तन सामग्री | 2 परिवर्तन मूल्य (वर्ग vi-viii) (SEPARATE ROW with 10.17 in Rashi column) */}
                <tr className="divide-x divide-black">
                  <td className="p-1 pl-5">बर्तन सामग्री</td>
                  <td className="p-1 text-right font-mono">
                    <input
                      type="number"
                      value={receiptUtensils || ''}
                      onChange={(e) => handleFieldChange('receiptUtensils', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full text-right font-mono bg-transparent outline-none"
                    />
                  </td>
                  <td className="p-1 pl-3 font-bold bg-slate-50/60">
                    2 परिवर्तन मूल्य (वर्ग vi-viii)
                  </td>
                  <td className="p-1 bg-slate-50/60 text-right font-mono font-bold">10.17</td>
                </tr>

                {/* ROW 10: अन्य मद (कृपया मद का नाम इंगित करें) | (i) दाल (वर्ग vi-viii) (SEPARATE ROW) */}
                <tr className="divide-x divide-black">
                  <td className="p-1 pl-5">
                    <span>अन्य मद (कृपया मद का नाम इंगित करें)</span>
                    <input
                      type="text"
                      value={receiptOtherName}
                      onChange={(e) => handleFieldChange('receiptOtherName', e.target.value)}
                      placeholder="मद का नाम..."
                      className="w-full text-[9px] border-b border-dotted border-slate-400 bg-transparent outline-none"
                    />
                  </td>
                  <td className="p-1 text-right font-mono">
                    <input
                      type="number"
                      value={receiptOtherAmount || ''}
                      onChange={(e) => handleFieldChange('receiptOtherAmount', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full text-right font-mono bg-transparent outline-none"
                    />
                  </td>
                  <td className="p-1 pl-6">(i) दाल</td>
                  <td className="p-1 text-right font-mono">{formatINR(exp6Dal)}</td>
                </tr>

                {/* ROW 11: अतिरिक्त मद 1 | (ii) मसाला / नमक */}
                <tr className="divide-x divide-black">
                  <td className="p-1 pl-5">
                    <input
                      type="text"
                      value={receiptExtra1Name}
                      onChange={(e) => handleFieldChange('receiptExtra1Name', e.target.value)}
                      placeholder="अतिरिक्त मद 1..."
                      className="w-full text-[9px] bg-transparent outline-none"
                    />
                  </td>
                  <td className="p-1 text-right font-mono">
                    <input
                      type="number"
                      value={receiptExtra1Amount || ''}
                      onChange={(e) => handleFieldChange('receiptExtra1Amount', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full text-right font-mono bg-transparent outline-none"
                    />
                  </td>
                  <td className="p-1 pl-6">(ii) मसाला / नमक</td>
                  <td className="p-1 text-right font-mono">{formatINR(exp6Masala)}</td>
                </tr>

                {/* ROW 12: अतिरिक्त मद 2 | (iii) तेल */}
                <tr className="divide-x divide-black">
                  <td className="p-1 pl-5">
                    <input
                      type="text"
                      value={receiptExtra2Name}
                      onChange={(e) => handleFieldChange('receiptExtra2Name', e.target.value)}
                      placeholder="अतिरिक्त मद 2..."
                      className="w-full text-[9px] bg-transparent outline-none"
                    />
                  </td>
                  <td className="p-1 text-right font-mono">
                    <input
                      type="number"
                      value={receiptExtra2Amount || ''}
                      onChange={(e) => handleFieldChange('receiptExtra2Amount', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full text-right font-mono bg-transparent outline-none"
                    />
                  </td>
                  <td className="p-1 pl-6">(iii) तेल</td>
                  <td className="p-1 text-right font-mono">{formatINR(exp6Tel)}</td>
                </tr>

                {/* ROW 13: - | (iv) सब्जी */}
                <tr className="divide-x divide-black">
                  <td className="p-1 pl-5 text-slate-300 text-center">-</td>
                  <td className="p-1 text-right font-mono text-slate-300 text-center">-</td>
                  <td className="p-1 pl-6">(iv) सब्जी</td>
                  <td className="p-1 text-right font-mono">{formatINR(exp6Sabji)}</td>
                </tr>

                {/* ROW 14: - | (v) जलावन */}
                <tr className="divide-x divide-black">
                  <td className="p-1 pl-5 text-slate-300 text-center">-</td>
                  <td className="p-1 text-right font-mono text-slate-300 text-center">-</td>
                  <td className="p-1 pl-6">(v) जलावन</td>
                  <td className="p-1 text-right font-mono">{formatINR(exp6Jalawan)}</td>
                </tr>

                {/* ROW 15: - | (vi) कुल योग (वर्ग 6-8 @ ₹10.17) */}
                <tr className="divide-x divide-black bg-slate-50/50">
                  <td className="p-1 pl-5 text-slate-300 text-center">-</td>
                  <td className="p-1 text-right font-mono text-slate-300 text-center">-</td>
                  <td className="p-1 pl-6 font-bold">
                    (vi) कुल योग (वर्ग vi-viii @ ₹10.17)
                  </td>
                  <td className="p-1 text-right font-mono font-bold">{formatINR(exp6Total)}</td>
                </tr>

                {/* ROW 16: - | 3 रसोईया सह सहायक मानदेय */}
                <tr className="divide-x divide-black">
                  <td className="p-1 pl-5 text-slate-300 text-center">-</td>
                  <td className="p-1 text-right font-mono text-slate-300 text-center">-</td>
                  <td className="p-1 pl-3">3 रसोईया सह सहायक मानदेय</td>
                  <td className="p-1 text-right font-mono">
                    <input
                      type="number"
                      value={expCook || ''}
                      onChange={(e) => handleFieldChange('expCookHonorarium', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full text-right font-mono bg-transparent outline-none"
                    />
                  </td>
                </tr>

                {/* ROW 17: - | 4 रसोई घर निर्माण मद */}
                <tr className="divide-x divide-black">
                  <td className="p-1 pl-5 text-slate-300 text-center">-</td>
                  <td className="p-1 text-right font-mono text-slate-300 text-center">-</td>
                  <td className="p-1 pl-3">4 रसोई घर निर्माण मद</td>
                  <td className="p-1 text-right font-mono">
                    <input
                      type="number"
                      value={expKitchen || ''}
                      onChange={(e) => handleFieldChange('expKitchenShed', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full text-right font-mono bg-transparent outline-none"
                    />
                  </td>
                </tr>

                {/* ROW 18: - | 5 बर्तन सामग्री */}
                <tr className="divide-x divide-black">
                  <td className="p-1 pl-5 text-slate-300 text-center">-</td>
                  <td className="p-1 text-right font-mono text-slate-300 text-center">-</td>
                  <td className="p-1 pl-3">5 बर्तन सामग्री</td>
                  <td className="p-1 text-right font-mono">
                    <input
                      type="number"
                      value={expUtensils || ''}
                      onChange={(e) => handleFieldChange('expUtensils', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full text-right font-mono bg-transparent outline-none"
                    />
                  </td>
                </tr>

                {/* ROW 19: - | 6 अन्य मद (कृपया मद का नाम इंगित करें) */}
                <tr className="divide-x divide-black">
                  <td className="p-1 pl-5 text-slate-300 text-center">-</td>
                  <td className="p-1 text-right font-mono text-slate-300 text-center">-</td>
                  <td className="p-1 pl-3">
                    <span>6 अन्य मद (कृपया मद का नाम इंगित करें)</span>
                    <input
                      type="text"
                      value={expOtherName}
                      onChange={(e) => handleFieldChange('expOtherName', e.target.value)}
                      placeholder="व्यय मद का नाम..."
                      className="w-full text-[9px] border-b border-dotted border-slate-400 bg-transparent outline-none"
                    />
                  </td>
                  <td className="p-1 text-right font-mono">
                    <input
                      type="number"
                      value={expOtherAmount || ''}
                      onChange={(e) => handleFieldChange('expOtherAmount', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full text-right font-mono bg-transparent outline-none"
                    />
                  </td>
                </tr>

                {/* ROW 20: - | कुल व्यय :- */}
                <tr className="divide-x divide-black bg-slate-100 font-bold">
                  <td className="p-1 pl-5 text-slate-300 text-center">-</td>
                  <td className="p-1 text-right font-mono text-slate-300 text-center">-</td>
                  <td className="p-1 text-right pr-4 font-bold">कुल व्यय :-</td>
                  <td className="p-1 text-right font-mono font-bold">{formatINR(totalExpenditure)}</td>
                </tr>

                {/* ROW 21: - | D अंतिम शेष :- (Separate Header Row) */}
                <tr className="divide-x divide-black bg-slate-50 font-bold">
                  <td className="p-1 text-slate-300 text-center">-</td>
                  <td className="p-1 text-right font-mono text-slate-300 text-center">-</td>
                  <td className="p-1">
                    <span className="mr-1">D</span>
                    <span>अंतिम शेष :-</span>
                  </td>
                  <td className="p-1 text-center text-slate-400">-</td>
                </tr>

                {/* ROW 22: - | 1 बैंक मे */}
                <tr className="divide-x divide-black">
                  <td className="p-1 text-slate-300 text-center">-</td>
                  <td className="p-1 text-right font-mono text-slate-300 text-center">-</td>
                  <td className="p-1 pl-5">1 बैंक मे</td>
                  <td className="p-1 text-right font-mono">
                    <input
                      type="number"
                      value={closingBank || ''}
                      onChange={(e) => handleFieldChange('closingBank', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full text-right font-mono bg-transparent outline-none"
                    />
                  </td>
                </tr>

                {/* ROW 23: - | 2 हाथ मे */}
                <tr className="divide-x divide-black">
                  <td className="p-1 text-slate-300 text-center">-</td>
                  <td className="p-1 text-right font-mono text-slate-300 text-center">-</td>
                  <td className="p-1 pl-5">2 हाथ मे</td>
                  <td className="p-1 text-right font-mono">
                    <input
                      type="number"
                      value={closingCash || ''}
                      onChange={(e) => handleFieldChange('closingCash', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full text-right font-mono bg-transparent outline-none"
                    />
                  </td>
                </tr>

                {/* ROW 24: कुल योग (आय) | कुल योग (व्यय + अंतिम शेष) */}
                <tr className="divide-x divide-black border-t-2 border-black bg-slate-200 font-bold">
                  <td className="p-1 text-center font-bold">कुल योग</td>
                  <td className="p-1 text-right font-mono font-bold">{formatINR(grandTotalIncome)}</td>
                  <td className="p-1 text-center font-bold">कुल योग</td>
                  <td className="p-1 text-right font-mono font-bold">{formatINR(grandTotalExpenseAndClosing)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section: सामग्री की विवरणी */}
          <div className="text-center font-extrabold text-xs mb-1 uppercase tracking-wide">
            सामग्री की विवरणी
          </div>

          {/* Table 2: सामग्री की विवरणी (Exact Table from Uploaded PDF) */}
          <div className="border border-black mb-2.5">
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="border-b border-black bg-slate-100 font-bold text-center">
                  <th className="border-r border-black p-1 w-[38%] text-center">प्राप्ति</th>
                  <th className="border-r border-black p-1 w-[12%] text-center">मात्रा</th>
                  <th className="border-r border-black p-1 w-[38%] text-center">खपत</th>
                  <th className="p-1 w-[12%] text-center">मात्रा</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black text-black">
                {/* E प्रारंभिक शेष चावल / G खपत चावल */}
                <tr className="divide-x divide-black">
                  <td className="p-1">
                    <span className="font-bold mr-1">E</span>
                    <span>प्रारंभिक शेष चावल (किलोग्राम मे)</span>
                  </td>
                  <td className="p-1 text-right font-mono">
                    <input
                      type="number"
                      step="0.001"
                      value={riceOpening || ''}
                      onChange={(e) => handleFieldChange('riceOpeningKg', parseFloat(e.target.value) || 0)}
                      placeholder="0.000"
                      className="w-full text-right font-mono bg-transparent outline-none"
                    />
                  </td>
                  <td className="p-1">
                    <span className="font-bold mr-1">G</span>
                    <span>खपत चावल (किलोग्राम मे)</span>
                  </td>
                  <td className="p-1 text-right font-mono">
                    <input
                      type="number"
                      step="0.001"
                      value={riceConsumed || ''}
                      onChange={(e) => handleFieldChange('riceConsumedKg', parseFloat(e.target.value) || 0)}
                      placeholder="0.000"
                      className="w-full text-right font-mono bg-transparent outline-none"
                    />
                  </td>
                </tr>

                {/* प्राप्त / किलोग्राम में */}
                <tr className="divide-x divide-black">
                  <td className="p-1 pl-4 text-slate-500 font-semibold">प्राप्त</td>
                  <td className="p-1 text-right font-mono text-slate-400">-</td>
                  <td className="p-1 pl-4 text-slate-500 font-semibold">किलोग्राम में</td>
                  <td className="p-1 text-right font-mono">{formatKg(riceConsumed)}</td>
                </tr>

                {/* F चावल (खाद्यान्न) किलोग्राम में / H अंतिम खाद्यान्न अवशेष */}
                <tr className="divide-x divide-black">
                  <td className="p-1">
                    <span className="font-bold mr-1">F</span>
                    <span>चावल (खाद्यान्न) किलोग्राम में</span>
                  </td>
                  <td className="p-1 text-right font-mono">
                    <input
                      type="number"
                      step="0.001"
                      value={riceReceived || ''}
                      onChange={(e) => handleFieldChange('riceReceivedKg', parseFloat(e.target.value) || 0)}
                      placeholder="0.000"
                      className="w-full text-right font-mono bg-transparent outline-none"
                    />
                  </td>
                  <td className="p-1 bg-slate-50">
                    <span className="font-bold mr-1">H</span>
                    <span className="font-bold">अंतिम खाद्यान्न अवशेष (किलोग्राम में)</span>
                  </td>
                  <td className="p-1 text-right font-mono font-bold bg-slate-50">
                    <input
                      type="number"
                      step="0.001"
                      value={riceClosing || ''}
                      onChange={(e) => handleFieldChange('riceClosingKg', parseFloat(e.target.value) || 0)}
                      placeholder={formatKg(Math.max(0, riceOpening + riceReceived - riceConsumed))}
                      className="w-full text-right font-mono font-bold bg-transparent outline-none"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section: I अण्डा / मौसमी फल उपयोगिता प्रमाण पत्र */}
          <div className="border border-black mb-2.5">
            <div className="bg-slate-100 font-bold p-1 text-center border-b border-black text-[10px]">
              <span className="font-bold mr-1">I</span>
              <span>अण्डा / मौसमी फल उपयोगिता प्रमाण पत्र</span>
            </div>
            <table className="w-full border-collapse text-[10px]">
              <tbody className="divide-y divide-black text-black">
                {/* पूर्व माह का अवशेष राशि / इस माह व्यय की गई राशि */}
                <tr className="divide-x divide-black">
                  <td className="p-1 w-[38%]">अण्डा/मौसमी फल में पूर्व माह का अवशेष राशि</td>
                  <td className="p-1 w-[12%] text-right font-mono">
                    <input
                      type="number"
                      value={eggFruitPrev || ''}
                      onChange={(e) => handleFieldChange('eggFruitPrevBalance', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full text-right font-mono bg-transparent outline-none"
                    />
                  </td>
                  <td className="p-1 w-[38%]">अण्डा / मौसमी फल मद में इस माह व्यय की गई राशि</td>
                  <td className="p-1 w-[12%] text-right font-mono">
                    <input
                      type="number"
                      value={eggFruitSpent || ''}
                      onChange={(e) => handleFieldChange('eggFruitSpent', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full text-right font-mono bg-transparent outline-none"
                    />
                  </td>
                </tr>

                {/* इस माह में प्राप्त राशि / अवशेष राशि */}
                <tr className="divide-x divide-black">
                  <td className="p-1">अण्डा/मौसमी फल मद में इस माह में प्राप्त राशि</td>
                  <td className="p-1 text-right font-mono">
                    <input
                      type="number"
                      value={eggFruitRecv || ''}
                      onChange={(e) => handleFieldChange('eggFruitReceived', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full text-right font-mono bg-transparent outline-none"
                    />
                  </td>
                  <td className="p-1 font-semibold bg-slate-50">अण्डा/मौसमी फल में अवशेष राशि</td>
                  <td className="p-1 text-right font-mono font-bold bg-slate-50">
                    <input
                      type="number"
                      value={eggFruitClosing || ''}
                      onChange={(e) => handleFieldChange('eggFruitClosingBalance', parseFloat(e.target.value) || 0)}
                      placeholder={formatINR(Math.max(0, eggFruitTotalRecv - eggFruitSpent))}
                      className="w-full text-right font-mono font-bold bg-transparent outline-none"
                    />
                  </td>
                </tr>

                {/* कुल राशि :- */}
                <tr className="divide-x divide-black bg-slate-50 font-bold">
                  <td className="p-1 text-right pr-4">कुल राशि :-</td>
                  <td className="p-1 text-right font-mono">{formatINR(eggFruitTotalRecv)}</td>
                  <td className="p-1 text-slate-300 text-center">-</td>
                  <td className="p-1 text-right font-mono text-slate-300 text-center">-</td>
                </tr>

                {/* लाभान्वित कुल बच्चों की संख्या / दिये गये दिनों की संख्या */}
                <tr className="divide-x divide-black">
                  <td className="p-1">अण्डा/मौसमी फल से लाभान्वित कुल बच्चों की संख्या</td>
                  <td className="p-1 text-right font-mono font-bold">
                    <input
                      type="number"
                      value={eggFruitBeneficiaries || ''}
                      onChange={(e) => handleFieldChange('eggFruitBeneficiaryCount', parseInt(e.target.value, 10) || 0)}
                      placeholder={String(autoValues.eggFruitBeneficiaries)}
                      className="w-full text-right font-mono font-bold bg-transparent outline-none"
                    />
                  </td>
                  <td className="p-1">अण्डा/मौसमी फल माह मे दिये गये दिनों की संख्या</td>
                  <td className="p-1 text-right font-mono font-bold">
                    <input
                      type="number"
                      value={eggFruitDays || ''}
                      onChange={(e) => handleFieldChange('eggFruitDaysCount', parseInt(e.target.value, 10) || 0)}
                      placeholder={String(autoValues.eggFruitDays)}
                      className="w-full text-right font-mono font-bold bg-transparent outline-none"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Statutory Note */}
          <div className="text-[9px] italic mb-4 text-justify">
            <span className="font-bold not-italic">नोट :- </span>
            प्रमाणित किया जाता है कि उपर्युक्त वित्तीय एवं सामग्री की उपयोगिता विवरणी विद्यालय में संधारित एवं उपलब्ध पोषाहार पंजी के आधार पर तैयार की गई है जो पूर्णरूपेण सही है।
          </div>

          {/* Signatures */}
          <div className="pt-4 flex justify-between items-end text-[11px] font-bold">
            <div className="text-center">
              <div className="h-8"></div>
              <div className="border-t border-black pt-1 w-48">
                प्रखंड साधन सेवी, म०भो० हस्ताक्षर
              </div>
            </div>

            <div className="text-center font-bold text-xs">
              <input
                type="text"
                value={pData.districtNameText || schoolDetails.districtName || 'पूर्णियाँ'}
                onChange={(e) => handleFieldChange('districtNameText', e.target.value)}
                placeholder="पूर्णियाँ"
                className="font-bold text-center border-b border-dotted border-black bg-transparent outline-none min-w-[140px] px-1 text-xs"
              />
            </div>

            <div className="text-center">
              <div className="h-8"></div>
              <div className="border-t border-black pt-1 w-48">
                प्रधानाध्यापक का हस्ताक्षर एवं मुहर
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
            onClick={() => window.print()}
            className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg flex items-center gap-1 font-medium"
          >
            <Printer className="w-3.5 h-3.5" /> प्रिंट
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="px-3.5 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-1 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> {isGeneratingPdf ? 'तैयार...' : 'अनुलग्नक-2 PDF'}
          </button>
        </div>
      </div>
    </div>
  );
};
