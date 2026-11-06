import React, { useRef, useState, useMemo } from 'react';
import { downloadSinglePagePdf } from '../utils/pdfExport';
import {
  Download,
  Printer,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2,
  Egg,
  Apple,
  RefreshCw,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { DailyEntry, MonthData, SchoolDetails, EggFruitRegisterData } from '../types/mdm';
import { autoTranslateToHindi, translateToHindiAsync } from '../utils/hindiTransliterator';
import { formatINR } from '../utils/mdmRates';

interface Props {
  data: MonthData;
  onUpdateSchoolDetails?: (updated: SchoolDetails) => void;
  onUpdateEggFruitData?: (updated: EggFruitRegisterData) => void;
  onUpdateDailyEntries?: (updated: DailyEntry[]) => void;
}

export const EggFruitRegisterReport: React.FC<Props> = ({
  data,
  onUpdateSchoolDetails,
  onUpdateEggFruitData,
  onUpdateDailyEntries,
}) => {
  const { schoolDetails, dailyEntries } = data;
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [translatingField, setTranslatingField] = useState<string | null>(null);

  // Egg & Fruit Register Data state
  const eggFruitData = data.eggFruitData || {};
  const districtTitle = eggFruitData.districtTitle || 'बिहार राज्य मध्याह्न भोजन योजना समिति, पूर्णियाँ';
  const panchayatName = schoolDetails.panchayatName || eggFruitData.panchayatName || '';
  const sankulName = schoolDetails.sankulName || eggFruitData.sankulName || '';
  
  // Official Rates: default ₹5.00 per egg and ₹5.00 per seasonal fruit
  const eggRate = eggFruitData.eggRate != null ? eggFruitData.eggRate : 5.0;
  const fruitRate = eggFruitData.fruitRate != null ? eggFruitData.fruitRate : 5.0;
  const openingBalance = eggFruitData.openingBalanceCashbook != null ? eggFruitData.openingBalanceCashbook : 0.0;

  // Extract Friday or Sunday Serving dates for Egg & Fruit from DailyEntries
  // In Bihar MDM:
  // - General schools (Sunday closed): Egg/Fruit served on Fridays (शुक्रवार)
  // - Urdu / Madarsa schools (Friday closed): Egg/Fruit served on Sundays (रविवार)
  const isFridayClose =
    schoolDetails.weeklyOff === 'friday' ||
    (dailyEntries.filter((e) => e.dayOfWeekHindi === 'शुक्रवार' && e.isHoliday).length >= 3 &&
     dailyEntries.filter((e) => (e.dayOfWeekHindi === 'रविवार' || e.isSunday) && e.isMealServed).length >= 1) ||
    dailyEntries.some((e) => (e.dayOfWeekHindi === 'रविवार' || e.isSunday) && e.isMealServed && ((e.count1to5 || 0) + (e.count6to8 || 0) > 0));

  const eggFruitDays = useMemo(() => {
    // If Friday-closed school, look for Sundays (रविवार)
    if (isFridayClose) {
      const sundays = dailyEntries.filter((e) => e.dayOfWeekHindi === 'रविवार');
      if (sundays.length > 0) return sundays;
    } else {
      // General Sunday-closed school, look for Fridays (शुक्रवार)
      const fridays = dailyEntries.filter((e) => e.dayOfWeekHindi === 'शुक्रवार');
      if (fridays.length > 0) return fridays;
    }
    // Fallback: entries where eggCount or fruitCount > 0
    const withCount = dailyEntries.filter((e) => (e.eggCount && e.eggCount > 0) || (e.fruitCount && e.fruitCount > 0));
    if (withCount.length > 0) return withCount;
    // Otherwise take first 5 working days as sample
    return dailyEntries.slice(0, 5);
  }, [dailyEntries, isFridayClose]);

  // Compute 5 Rows Data
  const rows = useMemo(() => {
    const list = [];
    let runningBalance = Number(openingBalance) || 0;

    for (let i = 0; i < 5; i++) {
      const weekNum = i + 1;
      const dayEntry = eggFruitDays[i];
      const manual = eggFruitData.manualEntries?.[weekNum] || {};

      let dateStr = manual.dateStr != null ? manual.dateStr : (dayEntry ? dayEntry.dateStr : '-');

      // Counts: default from dailyEntry or average student ratio (80% egg, 20% fruit)
      let eggCount = manual.eggCount;
      let fruitCount = manual.fruitCount;

      if (eggCount == null) {
        if (dayEntry && dayEntry.eggCount != null && dayEntry.eggCount > 0) {
          eggCount = dayEntry.eggCount;
        } else if (dayEntry && !dayEntry.isHoliday && dayEntry.isMealServed) {
          const totalMeal = (dayEntry.count1to5 || 0) + (dayEntry.count6to8 || 0);
          eggCount = Math.round(totalMeal * 0.85); // approx 85% eat egg
        } else {
          eggCount = 0;
        }
      }

      if (fruitCount == null) {
        if (dayEntry && dayEntry.fruitCount != null && dayEntry.fruitCount > 0) {
          fruitCount = dayEntry.fruitCount;
        } else if (dayEntry && !dayEntry.isHoliday && dayEntry.isMealServed) {
          const totalMeal = (dayEntry.count1to5 || 0) + (dayEntry.count6to8 || 0);
          fruitCount = Math.max(0, totalMeal - (Number(eggCount) || 0));
        } else {
          fruitCount = 0;
        }
      }

      const totalBeneficiaries = Number(eggCount) + Number(fruitCount);
      const eggCost = Number(eggCount) * eggRate;
      const fruitCost = Number(fruitCount) * fruitRate;
      const totalCost = eggCost + fruitCost;

      // Cashbook allotment for this week
      const receiptAllotment = manual.receiptAllotment != null ? Number(manual.receiptAllotment) : 0;
      const prevBal = runningBalance;
      const totalFunds = prevBal + receiptAllotment;
      const expenditure = totalCost;
      const closingBal = totalFunds - expenditure;
      runningBalance = closingBal;

      const defaultRemark = totalCost > 0 ? 'अण्डा एवं मौसमी फल क्रय कर वितरित किया गया' : (dayEntry?.isHoliday ? 'अवकाश' : '');
      const remarks = manual.remarks != null ? manual.remarks : defaultRemark;

      list.push({
        weekNum,
        dateStr,
        eggCount,
        fruitCount,
        totalBeneficiaries,
        eggCost,
        fruitCost,
        totalCost,
        openingBalance: prevBal,
        receiptAllotment,
        totalFunds,
        expenditure,
        closingBalance: closingBal,
        remarks,
      });
    }

    return list;
  }, [eggFruitDays, eggFruitData, eggRate, fruitRate, openingBalance, schoolDetails.month, schoolDetails.year]);

  // Compute Totals
  const totals = useMemo(() => {
    const sumEggCount = rows.reduce((s, r) => s + (Number(r.eggCount) || 0), 0);
    const sumFruitCount = rows.reduce((s, r) => s + (Number(r.fruitCount) || 0), 0);
    const sumBeneficiaries = rows.reduce((s, r) => s + (Number(r.totalBeneficiaries) || 0), 0);
    const sumEggCost = rows.reduce((s, r) => s + (Number(r.eggCost) || 0), 0);
    const sumFruitCost = rows.reduce((s, r) => s + (Number(r.fruitCost) || 0), 0);
    const sumTotalCost = rows.reduce((s, r) => s + (Number(r.totalCost) || 0), 0);
    const sumReceipts = rows.reduce((s, r) => s + (Number(r.receiptAllotment) || 0), 0);
    const totalAvailableFunds = Number(openingBalance) + sumReceipts;
    const totalSpent = sumTotalCost;
    const finalBalance = totalAvailableFunds - totalSpent;

    return {
      sumEggCount,
      sumFruitCount,
      sumBeneficiaries,
      sumEggCost,
      sumFruitCost,
      sumTotalCost,
      sumReceipts,
      totalAvailableFunds,
      totalSpent,
      finalBalance,
    };
  }, [rows, openingBalance]);

  // Handlers
  const handleUpdateField = (field: keyof EggFruitRegisterData, value: any) => {
    const updated = {
      ...eggFruitData,
      [field]: value,
    };
    onUpdateEggFruitData?.(updated);
  };

  const handleUpdateManualRow = (weekNum: number, field: string, value: any) => {
    const currentManual = eggFruitData.manualEntries || {};
    const rowManual = currentManual[weekNum] || {};
    const updated = {
      ...eggFruitData,
      manualEntries: {
        ...currentManual,
        [weekNum]: {
          ...rowManual,
          [field]: value,
        },
      },
    };
    onUpdateEggFruitData?.(updated);
  };

  const handleUpdatePanchayat = (val: string) => {
    handleUpdateField('panchayatName', val);
    if (onUpdateSchoolDetails) {
      onUpdateSchoolDetails({ ...schoolDetails, panchayatName: val });
    }
  };

  const handleUpdateSankul = (val: string) => {
    handleUpdateField('sankulName', val);
    if (onUpdateSchoolDetails) {
      onUpdateSchoolDetails({ ...schoolDetails, sankulName: val });
    }
  };

  const handleTranslateField = async (field: 'panchayatName' | 'sankulName') => {
    const val = field === 'panchayatName' ? panchayatName : sankulName;
    if (!val || !val.trim()) return;
    setTranslatingField(field);
    try {
      const quick = autoTranslateToHindi(val);
      if (field === 'panchayatName') handleUpdatePanchayat(quick);
      else handleUpdateSankul(quick);
      const enhanced = await translateToHindiAsync(val);
      if (enhanced && enhanced !== quick) {
        if (field === 'panchayatName') handleUpdatePanchayat(enhanced);
        else handleUpdateSankul(enhanced);
      }
    } finally {
      setTranslatingField(null);
    }
  };

  const handleFitToScreen = () => {
    if (typeof window !== 'undefined') {
      const screenW = window.innerWidth;
      if (screenW < 640) {
        setZoomLevel(Math.max(30, Math.floor(((screenW - 24) / 1050) * 100)));
      } else if (screenW < 1024) {
        setZoomLevel(Math.max(45, Math.floor(((screenW - 48) / 1120) * 100)));
      } else {
        setZoomLevel(100);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    try {
      setIsGeneratingPdf(true);
      const filename = `अण्डा_मौसमी_फल_पोषाहार_पंजी_${schoolDetails.month || 'माह'}_${schoolDetails.year || 'वर्ष'}_${(schoolDetails.schoolName || 'विद्यालय').replace(/\s+/g, '_')}.pdf`;
      await downloadSinglePagePdf({
        element: printAreaRef.current,
        fileName: filename,
        orientation: 'landscape',
        marginMm: 3,
      });
    } catch (err) {
      console.error('Egg fruit PDF error:', err);
      alert('PDF निर्माण में समस्या आई। कृपया "प्रिंट करें" बटन से सेव करें।');
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
            height: auto !important;
            margin: 0 !important;
            padding: 3mm 4mm !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        }
      `}</style>

      {/* Top Action Bar & Live Rate Controls */}
      <div className="no-print bg-white p-4 rounded-xl shadow-xs border border-slate-200 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />
              बिहार PM पोषण अण्डा/मौसमी फल पोषाहार पंजी (PDF प्रारूप)
            </span>
            <span className="text-xs text-slate-500 font-medium hidden md:inline">
              (A4 Landscape | जैसा अपलोड किए गए मूल CamScanner PDF में है)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Zoom Controls */}
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
                className="px-2 py-1 hover:bg-white rounded text-amber-900 font-semibold transition border-l border-slate-200 flex items-center gap-1 text-[11px]"
                title="स्क्रीन के अनुसार आकार दें"
              >
                📱 स्क्रीन फिट
              </button>
            </div>

            {/* Download PDF Button */}
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold shadow-xs transition disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {isGeneratingPdf ? 'PDF तैयार हो रहा है...' : 'अण्डा/फल PDF डाउनलोड (.pdf)'}
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-semibold shadow-xs transition"
            >
              <Printer className="w-4 h-4" />
              प्रिंट करें
            </button>
          </div>
        </div>

        {/* Real-time Rate & Accounting Settings */}
        <div className="bg-amber-50/60 p-3 rounded-lg border border-amber-200/80 flex flex-wrap items-center gap-4 text-xs">
          {/* Egg Rate */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-bold text-amber-950">
              <Egg className="w-4 h-4 text-amber-700" />
              प्रति अण्डा दर:
            </span>
            <div className="flex items-center gap-1">
              <span className="font-bold text-slate-600">₹</span>
              <input
                type="number"
                step="0.1"
                min="1"
                value={eggRate}
                onChange={(e) => handleUpdateField('eggRate', parseFloat(e.target.value) || 0)}
                className="w-16 px-2 py-1 bg-white border border-amber-300 rounded font-mono font-bold text-amber-900 focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="flex gap-1">
              {[5.0, 6.0, 6.5].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleUpdateField('eggRate', r)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${
                    eggRate === r ? 'bg-amber-700 text-white' : 'bg-white text-amber-900 border border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  ₹{r}
                </button>
              ))}
            </div>
          </div>

          <div className="h-4 w-px bg-amber-300 hidden sm:block"></div>

          {/* Fruit Rate */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-bold text-emerald-950">
              <Apple className="w-4 h-4 text-emerald-700" />
              प्रति फल दर:
            </span>
            <div className="flex items-center gap-1">
              <span className="font-bold text-slate-600">₹</span>
              <input
                type="number"
                step="0.1"
                min="1"
                value={fruitRate}
                onChange={(e) => handleUpdateField('fruitRate', parseFloat(e.target.value) || 0)}
                className="w-16 px-2 py-1 bg-white border border-emerald-300 rounded font-mono font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex gap-1">
              {[5.0, 6.0, 6.5].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleUpdateField('fruitRate', r)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${
                    fruitRate === r ? 'bg-emerald-700 text-white' : 'bg-white text-emerald-900 border border-emerald-300 hover:bg-emerald-100'
                  }`}
                >
                  ₹{r}
                </button>
              ))}
            </div>
          </div>

          {/* Panchayat & Sankul Quick Inputs */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">पंचायत:</span>
            <input
              type="text"
              value={panchayatName}
              onChange={(e) => handleUpdatePanchayat(e.target.value)}
              onBlur={() => handleTranslateField('panchayatName')}
              placeholder="पंचायत का नाम"
              className="w-28 px-2 py-1 bg-white border border-slate-300 rounded text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">संकुल:</span>
            <input
              type="text"
              value={sankulName}
              onChange={(e) => handleUpdateSankul(e.target.value)}
              onBlur={() => handleTranslateField('sankulName')}
              placeholder="संकुल का नाम"
              className="w-28 px-2 py-1 bg-white border border-slate-300 rounded text-xs"
            />
          </div>
        </div>
      </div>

      {/* Main Viewport for Official Landscape Document Sheet */}
      <div className="overflow-x-auto bg-slate-200/70 p-4 sm:p-6 rounded-2xl flex flex-col items-center custom-scrollbar">
        <div
          style={{
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease',
          }}
          className="print:transform-none"
        >
          {/* A4 Landscape Document Sheet (1123px x 794px at ~96 DPI) */}
          <div
            ref={printAreaRef}
            className="report-page-container bg-white text-black p-6 sm:p-7 rounded-sm shadow-xl border border-slate-300 print:border-none print:shadow-none flex flex-col justify-between"
            style={{
              width: '1123px', // A4 Landscape width
              minHeight: '794px', // A4 Landscape height
              boxSizing: 'border-box',
              fontFamily: "'Noto Sans Devanagari', 'Mangal', 'Arial', sans-serif",
            }}
          >
            <div>
              {/* Official Header */}
              <div className="text-center mb-2">
                <h1 className="text-[18px] font-extrabold text-black leading-snug">
                  {districtTitle}
                </h1>
                <h2 className="text-[15px] font-extrabold text-black mt-0.5">
                  अण्डा/मौसमी फल से संबंधित पोषाहार पंजी
                </h2>
              </div>

              {/* School & Location Metadata Row (Matching uploaded PDF layout) */}
              <div className="grid grid-cols-2 gap-x-8 text-[12px] font-semibold text-black mt-3 mb-2">
                {/* Left Column */}
                <div className="space-y-1.5">
                  <div className="flex items-baseline">
                    <span className="shrink-0 w-32 font-bold">विद्यालय का नाम</span>
                    <span className="mr-1">:</span>
                    <input
                      type="text"
                      value={schoolDetails.schoolName}
                      onChange={(e) => onUpdateSchoolDetails?.({ ...schoolDetails, schoolName: e.target.value })}
                      placeholder="........................................................................"
                      className="flex-1 font-bold text-black border-b border-dotted border-black px-1 bg-transparent focus:bg-amber-50 focus:outline-hidden"
                    />
                  </div>

                  <div className="flex items-baseline">
                    <span className="shrink-0 w-32 font-bold">विद्यालय का डाईस कोड</span>
                    <span className="mr-1">:</span>
                    <input
                      type="text"
                      value={schoolDetails.misCode}
                      onChange={(e) => onUpdateSchoolDetails?.({ ...schoolDetails, misCode: e.target.value })}
                      placeholder="........................................................................"
                      className="flex-1 font-mono font-bold text-black border-b border-dotted border-black px-1 bg-transparent focus:bg-amber-50 focus:outline-hidden"
                    />
                  </div>

                  <div className="flex items-baseline">
                    <span className="shrink-0 w-32 font-bold">प्रखंड का नाम</span>
                    <span className="mr-1">:</span>
                    <input
                      type="text"
                      value={schoolDetails.blockName}
                      onChange={(e) => onUpdateSchoolDetails?.({ ...schoolDetails, blockName: e.target.value })}
                      placeholder="........................................................................"
                      className="flex-1 font-bold text-black border-b border-dotted border-black px-1 bg-transparent focus:bg-amber-50 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-1.5">
                  <div className="flex items-baseline">
                    <span className="shrink-0 w-28 font-bold">माह का नाम</span>
                    <span className="mr-1">:</span>
                    <input
                      type="text"
                      value={`${schoolDetails.month || ''} ${schoolDetails.year || ''}`}
                      onChange={(e) => onUpdateSchoolDetails?.({ ...schoolDetails, month: e.target.value })}
                      placeholder="................................................................"
                      className="flex-1 font-bold text-black border-b border-dotted border-black px-1 bg-transparent focus:bg-amber-50 focus:outline-hidden"
                    />
                  </div>

                  <div className="flex items-baseline">
                    <span className="shrink-0 w-28 font-bold">पंचायत का नाम</span>
                    <span className="mr-1">:</span>
                    <input
                      type="text"
                      value={panchayatName}
                      onChange={(e) => handleUpdatePanchayat(e.target.value)}
                      onBlur={() => handleTranslateField('panchayatName')}
                      placeholder="................................................................"
                      className="flex-1 font-bold text-black border-b border-dotted border-black px-1 bg-transparent focus:bg-amber-50 focus:outline-hidden"
                    />
                  </div>

                  <div className="flex items-baseline">
                    <span className="shrink-0 w-28 font-bold">संकुल का नाम</span>
                    <span className="mr-1">:</span>
                    <input
                      type="text"
                      value={sankulName}
                      onChange={(e) => handleUpdateSankul(e.target.value)}
                      onBlur={() => handleTranslateField('sankulName')}
                      placeholder="................................................................"
                      className="flex-1 font-bold text-black border-b border-dotted border-black px-1 bg-transparent focus:bg-amber-50 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Instruction Sentence */}
              <div className="text-[10.5px] italic text-center text-black font-semibold mt-2 mb-2 leading-relaxed px-2">
                अण्डा मद का संधारण करने से संबंधित रोकड़ बही एवं साप्ताहिक / मासिक अण्डा / फल खाने वाले बच्चों का आँकड़ा से संबंधित पंजी जो संबंधित विद्यालय के संबंधित तिथि के छात्र उपस्थिति पंजी को आधार मानते हुये संधारित किया जायेगा।
              </div>

              {/* The 14-Column Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border-2 border-black text-black text-center text-[10px] leading-tight">
                  <thead>
                    {/* Header Row 1: Section Super-headers */}
                    <tr className="bg-slate-100 font-extrabold h-[26px]">
                      <th className="border border-black p-1 text-center text-[11px]" colSpan={8}>
                        अण्डा एवं मौसमी फल वितरण विवरणी
                      </th>
                      <th className="border border-black p-1 text-center text-[11px]" colSpan={5}>
                        अण्डा मद का रोकड़ बही
                      </th>
                      <th className="border border-black p-1 text-center text-[11px]" colSpan={1}>
                        अभ्युक्ति
                      </th>
                    </tr>

                    {/* Header Row 2: 14 Columns */}
                    <tr className="bg-slate-100 font-extrabold text-[9.5px] leading-tight h-[42px]">
                      <th className="border border-black p-1 w-8 text-center align-middle">
                        क्र० सं०
                      </th>
                      <th className="border border-black p-1 w-28 text-center align-middle">
                        संबंधित माह के सप्ताह के प्रत्येक शुक्रवार / रविवार की तिथि
                      </th>
                      <th className="border border-black p-1 w-16 text-center align-middle">
                        अण्डे खाने वाले बच्चों की संख्या
                      </th>
                      <th className="border border-black p-1 w-16 text-center align-middle">
                        फल खाने वाले बच्चों की संख्या
                      </th>
                      <th className="border border-black p-1 w-20 text-center align-middle">
                        कुल लाभान्वित बच्चों की संख्या
                        <div className="text-[8.5px] font-normal">(3+4=5)</div>
                      </th>
                      <th className="border border-black p-1 w-20 text-center align-middle">
                        अण्डा क्रय करने में व्यय राशि
                        <div className="text-[8.5px] font-normal font-mono">(@₹{eggRate})</div>
                      </th>
                      <th className="border border-black p-1 w-20 text-center align-middle">
                        फल क्रय करने में व्यय राशि
                        <div className="text-[8.5px] font-normal font-mono">(@₹{fruitRate})</div>
                      </th>
                      <th className="border border-black p-1 w-20 text-center align-middle">
                        कुल व्यय की गयी राशि
                        <div className="text-[8.5px] font-normal">(6+7=8)</div>
                      </th>
                      <th className="border border-black p-1 w-18 text-center align-middle">
                        प्रारंभिक शेष
                        <div className="text-[8.5px] font-normal">(रुपये में)</div>
                      </th>
                      <th className="border border-black p-1 w-18 text-center align-middle">
                        प्राप्त राशि / आवंटन
                        <div className="text-[8.5px] font-normal">(रुपये में)</div>
                      </th>
                      <th className="border border-black p-1 w-20 text-center align-middle">
                        कुल योग (रुपये में)
                        <div className="text-[8.5px] font-normal">(9+10=11)</div>
                      </th>
                      <th className="border border-black p-1 w-20 text-center align-middle">
                        कुल व्यय राशि
                        <div className="text-[8.5px] font-normal">(रुपये में)</div>
                      </th>
                      <th className="border border-black p-1 w-20 text-center align-middle">
                        अवशेष राशि
                        <div className="text-[8.5px] font-normal">(रुपये में)</div>
                      </th>
                      <th className="border border-black p-1 w-24 text-center align-middle">
                        अभ्युक्ति
                      </th>
                    </tr>

                    {/* Header Row 3 (Column Index Numbers: 1 to 14) */}
                    <tr className="bg-slate-200/90 font-mono font-bold text-[9.5px]">
                      <th className="border border-black py-0.5">1</th>
                      <th className="border border-black py-0.5">2</th>
                      <th className="border border-black py-0.5">3</th>
                      <th className="border border-black py-0.5">4</th>
                      <th className="border border-black py-0.5">5</th>
                      <th className="border border-black py-0.5">6</th>
                      <th className="border border-black py-0.5">7</th>
                      <th className="border border-black py-0.5">8</th>
                      <th className="border border-black py-0.5">9</th>
                      <th className="border border-black py-0.5">10</th>
                      <th className="border border-black py-0.5">11</th>
                      <th className="border border-black py-0.5">12</th>
                      <th className="border border-black py-0.5">13</th>
                      <th className="border border-black py-0.5">14</th>
                    </tr>
                  </thead>

                  <tbody>
                    {/* Rows 1 to 5 */}
                    {rows.map((row) => {
                      const hasRowData = Boolean(
                        (row.dateStr && row.dateStr !== '-') ||
                        (row.eggCount && row.eggCount > 0) ||
                        (row.fruitCount && row.fruitCount > 0)
                      );

                      return (
                        <tr key={row.weekNum} className="h-11 hover:bg-amber-50/20 transition-colors">
                          {/* Col 1: Serial No */}
                          <td className="border border-black p-1 font-mono font-bold text-[11px]">
                            {row.weekNum}
                          </td>

                          {/* Col 2: Date */}
                          <td className="border border-black p-1 font-mono font-semibold text-[11px] whitespace-nowrap">
                            {row.dateStr && row.dateStr !== '-' ? row.dateStr : '-'}
                          </td>

                          {/* Col 3: Egg Eaters */}
                          <td className="border border-black p-1 font-mono font-bold text-[11px]">
                            {hasRowData ? (
                              <input
                                type="number"
                                min="0"
                                value={row.eggCount > 0 ? row.eggCount : ''}
                                placeholder="-"
                                onChange={(e) => handleUpdateManualRow(row.weekNum, 'eggCount', parseInt(e.target.value) || 0)}
                                className="w-full text-center bg-transparent font-mono font-bold focus:bg-amber-50 focus:outline-hidden"
                              />
                            ) : (
                              <span className="font-bold text-slate-800">-</span>
                            )}
                          </td>

                          {/* Col 4: Fruit Eaters */}
                          <td className="border border-black p-1 font-mono font-bold text-[11px]">
                            {hasRowData ? (
                              <input
                                type="number"
                                min="0"
                                value={row.fruitCount > 0 ? row.fruitCount : ''}
                                placeholder="-"
                                onChange={(e) => handleUpdateManualRow(row.weekNum, 'fruitCount', parseInt(e.target.value) || 0)}
                                className="w-full text-center bg-transparent font-mono font-bold focus:bg-amber-50 focus:outline-hidden"
                              />
                            ) : (
                              <span className="font-bold text-slate-800">-</span>
                            )}
                          </td>

                          {/* Col 5: Total Beneficiaries (3+4) */}
                          <td className="border border-black p-1 font-mono font-extrabold text-[11.5px] bg-slate-50/50">
                            {row.totalBeneficiaries > 0 ? row.totalBeneficiaries : '-'}
                          </td>

                          {/* Col 6: Egg Cost */}
                          <td className="border border-black p-1 font-mono font-bold text-[11px]">
                            {row.eggCost > 0 ? row.eggCost.toFixed(2) : '-'}
                          </td>

                          {/* Col 7: Fruit Cost */}
                          <td className="border border-black p-1 font-mono font-bold text-[11px]">
                            {row.fruitCost > 0 ? row.fruitCost.toFixed(2) : '-'}
                          </td>

                          {/* Col 8: Total Expenditure (6+7) */}
                          <td className="border border-black p-1 font-mono font-extrabold text-[11.5px] bg-amber-50/40">
                            {row.totalCost > 0 ? row.totalCost.toFixed(2) : '-'}
                          </td>

                          {/* Col 9: Opening Balance (खाली -> '-') */}
                          <td className="border border-black p-1 font-mono text-center font-bold text-[12px]">-</td>

                          {/* Col 10: Received Allotment (खाली -> '-') */}
                          <td className="border border-black p-1 font-mono text-center font-bold text-[12px]">-</td>

                          {/* Col 11: Total Available (खाली -> '-') */}
                          <td className="border border-black p-1 font-mono text-center font-bold text-[12px]">-</td>

                          {/* Col 12: Total Exp (Col 8) */}
                          <td className="border border-black p-1 font-mono font-bold text-[11px]">
                            {row.expenditure > 0 ? row.expenditure.toFixed(2) : '-'}
                          </td>

                          {/* Col 13: Closing Balance (खाली -> '-') */}
                          <td className="border border-black p-1 font-mono text-center font-bold text-[12px]">-</td>

                          {/* Col 14: Remarks (खाली -> '-') */}
                          <td className="border border-black p-1 font-mono text-center font-bold text-[12px]">-</td>
                        </tr>
                      );
                    })}

                    {/* Total Row (कुल योग :-) */}
                    <tr className="bg-slate-200/90 font-extrabold h-12 border-t-2 border-black">
                      <td colSpan={2} className="border border-black p-1 text-center font-bold text-[12px]">
                        कुल योग :-
                      </td>
                      <td className="border border-black p-1 font-mono text-[12px] font-extrabold">
                        {totals.sumEggCount > 0 ? totals.sumEggCount : '-'}
                      </td>
                      <td className="border border-black p-1 font-mono text-[12px] font-extrabold">
                        {totals.sumFruitCount > 0 ? totals.sumFruitCount : '-'}
                      </td>
                      <td className="border border-black p-1 font-mono text-[12px] font-extrabold">
                        {totals.sumBeneficiaries > 0 ? totals.sumBeneficiaries : '-'}
                      </td>
                      <td className="border border-black p-1 font-mono text-[12px] font-extrabold">
                        {totals.sumEggCost > 0 ? totals.sumEggCost.toFixed(2) : '-'}
                      </td>
                      <td className="border border-black p-1 font-mono text-[12px] font-extrabold">
                        {totals.sumFruitCost > 0 ? totals.sumFruitCost.toFixed(2) : '-'}
                      </td>
                      <td className="border border-black p-1 font-mono text-[13px] font-extrabold text-slate-950 bg-amber-100/60">
                        {totals.sumTotalCost > 0 ? totals.sumTotalCost.toFixed(2) : '-'}
                      </td>
                      {/* Col 9: खाली -> '-' */}
                      <td className="border border-black p-1 font-mono text-center font-bold text-[12px]">-</td>
                      {/* Col 10: खाली -> '-' */}
                      <td className="border border-black p-1 font-mono text-center font-bold text-[12px]">-</td>
                      {/* Col 11: खाली -> '-' */}
                      <td className="border border-black p-1 font-mono text-center font-bold text-[12px]">-</td>
                      {/* Col 12: कुल व्यय राशि */}
                      <td className="border border-black p-1 font-mono text-[12px] font-extrabold">
                        {totals.totalSpent > 0 ? totals.totalSpent.toFixed(2) : '-'}
                      </td>
                      {/* Col 13: खाली -> '-' */}
                      <td className="border border-black p-1 font-mono text-center font-bold text-[12px]">-</td>
                      {/* Col 14: खाली -> '-' */}
                      <td className="border border-black p-1 font-mono text-center font-bold text-[12px]">-</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Footer Section: Statutory Note & HM Signature */}
            <div className="mt-4 pt-2">
              <div className="flex justify-between items-start text-black">
                {/* Left Note */}
                <div className="max-w-[550px] text-[11px] font-bold leading-relaxed">
                  नोट :- अण्डा / फल क्रय का अभिप्रमाणित विपत्र संबंधित विद्यालय के प्रभारी प्रधानाध्यापक को संचिका में रक्षित रखना अनिवार्य है।
                </div>

                {/* Right Signature Area */}
                <div className="text-center min-w-[320px]">
                  <div className="h-10 border-b border-dotted border-black/50 mb-1"></div>
                  <div className="text-[11.5px] font-bold text-black">
                    संबंधित विद्यालय के प्रभारी प्रधानाध्यापक / प्रधानाध्यापक
                  </div>
                  <div className="text-[11px] font-bold text-black">
                    का हस्ताक्षर तिथि सहित
                  </div>
                  {schoolDetails.hmName && (
                    <div className="text-[10.5px] font-semibold text-slate-800 mt-0.5">
                      ({schoolDetails.hmName})
                    </div>
                  )}
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
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="px-3.5 py-1.5 text-xs bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg flex items-center gap-1 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> {isGeneratingPdf ? 'तैयार...' : 'अण्डा/फल PDF'}
          </button>
        </div>
      </div>
    </div>
  );
};
