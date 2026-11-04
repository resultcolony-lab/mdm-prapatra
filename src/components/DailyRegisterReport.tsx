import React, { useRef, useState } from 'react';
import { MonthData } from '../types/mdm';
import { formatINR, formatKg, OFFICIAL_DEFAULT_RATES } from '../utils/mdmRates';
import { Printer, Download, BookOpen } from 'lucide-react';
import { exportToExcel } from '../utils/excelExport';
import { downloadSinglePagePdf } from '../utils/pdfExport';

interface Props {
  data: MonthData;
}

export const DailyRegisterReport: React.FC<Props> = ({ data }) => {
  const { schoolDetails, dailyEntries } = data;
  const rates = data.customRates || OFFICIAL_DEFAULT_RATES;

  const printAreaRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    try {
      setIsGeneratingPdf(true);
      const filename = `दैनिक_पोषाहार_पंजी_${schoolDetails.month || 'माह'}_${schoolDetails.year || 'वर्ष'}_${(schoolDetails.schoolName || 'विद्यालय').replace(/\s+/g, '_')}.pdf`;
      await downloadSinglePagePdf({
        element: printAreaRef.current,
        fileName: filename,
        orientation: 'landscape',
        marginMm: 3,
      });
    } catch (err) {
      console.error('PDF error:', err);
      alert('PDF निर्माण में समस्या आई। कृपया "प्रिंट करें" बटन से सेव करें।');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Summary totals
  let totalC1 = 0;
  let totalC2 = 0;
  let totalRice = 0;
  let totalDal = 0;
  let totalMasala = 0;
  let totalSabji = 0;
  let totalTel = 0;
  let totalJalawan = 0;
  let totalCost = 0;
  let totalServingDays = 0;

  dailyEntries.forEach((e) => {
    if (e.isMealServed && !e.isHoliday) {
      totalServingDays++;
      const c1 = Number(e.count1to5 || 0);
      const c2 = Number(e.count6to8 || 0);
      totalC1 += c1;
      totalC2 += c2;

      const rice = (c1 * rates.class1to5.riceGramPerChild + c2 * rates.class6to8.riceGramPerChild) / 1000;
      const dal = c1 * rates.class1to5.dal.costPerChild + c2 * rates.class6to8.dal.costPerChild;
      const masala = c1 * rates.class1to5.masala.costPerChild + c2 * rates.class6to8.masala.costPerChild;
      const sabji = c1 * rates.class1to5.sabji.costPerChild + c2 * rates.class6to8.sabji.costPerChild;
      const tel = c1 * rates.class1to5.tel.costPerChild + c2 * rates.class6to8.tel.costPerChild;
      const jalawan = c1 * rates.class1to5.jalawan.costPerChild + c2 * rates.class6to8.jalawan.costPerChild;
      const dayTotal = c1 * rates.class1to5.totalCostPerChild + c2 * rates.class6to8.totalCostPerChild;

      totalRice += rice;
      totalDal += dal;
      totalMasala += masala;
      totalSabji += sabji;
      totalTel += tel;
      totalJalawan += jalawan;
      totalCost += dayTotal;
    }
  });

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="no-print bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-700" />
          <span className="font-bold text-slate-800 text-sm">
            दैनिक पोषाहार उपभोग एवं उपस्थिति पंजी (Daily Consumption Register)
          </span>
          <span className="text-xs text-slate-500">
            माह: {schoolDetails.month} {schoolDetails.year} | {schoolDetails.schoolName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToExcel(data)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-medium shadow-xs transition"
          >
            <Download className="w-4 h-4" />
            Excel डाउनलोड
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-semibold shadow-xs transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isGeneratingPdf ? 'PDF तैयार हो रहा है...' : 'PDF डाउनलोड (.pdf)'}
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <Printer className="w-4 h-4" />
            दैनिक पंजी प्रिंट करें
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div ref={printAreaRef} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-black">
        {/* Header */}
        <div className="text-center border-b border-black pb-3 mb-3">
          <h2 className="text-base font-extrabold text-black">
            बिहार सरकार - मध्याह्न भोजन योजना (PM POSHAN)
          </h2>
          <h3 className="text-sm font-bold text-slate-800">
            दैनिक पोषाहार उपभोग एवं उपस्थिति पंजी
          </h3>
          <div className="flex flex-wrap justify-between text-xs font-semibold mt-2 px-2">
            <div>विद्यालय: <span className="underline">{schoolDetails.schoolName}</span></div>
            <div>प्रखंड: <span className="underline">{schoolDetails.blockName}</span></div>
            <div>जिला: <span className="underline">{schoolDetails.districtName}</span></div>
            <div>माह / वर्ष: <span className="underline">{schoolDetails.month} {schoolDetails.year}</span></div>
            <div>MIS कोड: <span className="underline font-mono">{schoolDetails.misCode}</span></div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-[9px] border-collapse border border-black text-center">
            <thead className="bg-slate-100 font-bold">
              <tr>
                <th className="border border-black p-1 w-8" rowSpan={2}>दिनांक</th>
                <th className="border border-black p-1 w-12" rowSpan={2}>दिन</th>
                <th className="border border-black p-1 w-16" rowSpan={2}>स्थिति</th>
                <th className="border border-black p-1 text-center" colSpan={3}>लाभान्वित छात्र</th>
                <th className="border border-black p-1 w-14" rowSpan={2}>चावल (kg)</th>
                <th className="border border-black p-1 text-center" colSpan={5}>सामग्रीवार व्यय (₹)</th>
                <th className="border border-black p-1 w-16" rowSpan={2}>कुल दैनिक व्यय (₹)</th>
                <th className="border border-black p-1 w-20" rowSpan={2}>रसोइया / HM हस्ताक्षर</th>
              </tr>
              <tr>
                <th className="border border-black p-1 w-10">कक्षा 1-5</th>
                <th className="border border-black p-1 w-10">कक्षा 6-8</th>
                <th className="border border-black p-1 w-10">कुल छात्र</th>
                <th className="border border-black p-1 w-11">दाल</th>
                <th className="border border-black p-1 w-11">मसाला/नमक</th>
                <th className="border border-black p-1 w-11">सब्जी</th>
                <th className="border border-black p-1 w-11">तेल</th>
                <th className="border border-black p-1 w-11">जलावन</th>
              </tr>
            </thead>
            <tbody>
              {dailyEntries.map((e) => {
                const isServed = e.isMealServed && !e.isHoliday;
                const c1 = isServed ? Number(e.count1to5 || 0) : 0;
                const c2 = isServed ? Number(e.count6to8 || 0) : 0;
                const totalStudents = c1 + c2;

                const rice = isServed ? (c1 * rates.class1to5.riceGramPerChild + c2 * rates.class6to8.riceGramPerChild) / 1000 : 0;
                const dal = isServed ? c1 * rates.class1to5.dal.costPerChild + c2 * rates.class6to8.dal.costPerChild : 0;
                const masala = isServed ? c1 * rates.class1to5.masala.costPerChild + c2 * rates.class6to8.masala.costPerChild : 0;
                const sabji = isServed ? c1 * rates.class1to5.sabji.costPerChild + c2 * rates.class6to8.sabji.costPerChild : 0;
                const tel = isServed ? c1 * rates.class1to5.tel.costPerChild + c2 * rates.class6to8.tel.costPerChild : 0;
                const jalawan = isServed ? c1 * rates.class1to5.jalawan.costPerChild + c2 * rates.class6to8.jalawan.costPerChild : 0;
                const dayTotal = isServed ? c1 * rates.class1to5.totalCostPerChild + c2 * rates.class6to8.totalCostPerChild : 0;

                return (
                  <tr key={e.day} className={e.isSunday ? 'bg-red-50/50' : e.isHoliday ? 'bg-amber-50/50' : ''}>
                    <td className="border border-black p-1 font-mono">{String(e.day).padStart(2, '0')}</td>
                    <td className="border border-black p-1">{e.dayOfWeekHindi}</td>
                    <td className="border border-black p-1 text-[8.5px]">
                      {e.isHoliday ? (e.holidayReason || 'अवकाश') : isServed ? 'भोजन बना' : 'भोजन नहीं'}
                    </td>
                    <td className="border border-black p-1 font-mono">{isServed ? c1 : '-'}</td>
                    <td className="border border-black p-1 font-mono">{isServed ? c2 : '-'}</td>
                    <td className="border border-black p-1 font-mono font-bold">{isServed ? totalStudents : '-'}</td>
                    <td className="border border-black p-1 font-mono">{isServed ? formatKg(rice) : '-'}</td>
                    <td className="border border-black p-1 font-mono text-right">{isServed ? formatINR(dal) : '-'}</td>
                    <td className="border border-black p-1 font-mono text-right">{isServed ? formatINR(masala) : '-'}</td>
                    <td className="border border-black p-1 font-mono text-right">{isServed ? formatINR(sabji) : '-'}</td>
                    <td className="border border-black p-1 font-mono text-right">{isServed ? formatINR(tel) : '-'}</td>
                    <td className="border border-black p-1 font-mono text-right">{isServed ? formatINR(jalawan) : '-'}</td>
                    <td className="border border-black p-1 font-mono font-bold text-right">
                      {isServed ? formatINR(dayTotal) : '0.00'}
                    </td>
                    <td className="border border-black p-1 text-[8px] text-slate-400"></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-200 font-bold border-t-2 border-black">
              <tr>
                <td colSpan={3} className="border border-black p-1.5 text-center">
                  माह का कुल योग ({totalServingDays} भोजन दिवस)
                </td>
                <td className="border border-black p-1 font-mono">{totalC1}</td>
                <td className="border border-black p-1 font-mono">{totalC2}</td>
                <td className="border border-black p-1 font-mono font-extrabold">{totalC1 + totalC2}</td>
                <td className="border border-black p-1 font-mono font-bold">{formatKg(totalRice)}</td>
                <td className="border border-black p-1 font-mono text-right">{formatINR(totalDal)}</td>
                <td className="border border-black p-1 font-mono text-right">{formatINR(totalMasala)}</td>
                <td className="border border-black p-1 font-mono text-right">{formatINR(totalSabji)}</td>
                <td className="border border-black p-1 font-mono text-right">{formatINR(totalTel)}</td>
                <td className="border border-black p-1 font-mono text-right">{formatINR(totalJalawan)}</td>
                <td className="border border-black p-1 font-mono font-extrabold text-right text-[10px]">
                  ₹{formatINR(totalCost)}
                </td>
                <td className="border border-black p-1"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer Signatures */}
        <div className="mt-8 flex justify-between items-end text-xs font-bold pt-4 px-6 border-t border-dotted border-black/40">
          <div className="text-center">
            <div>रसोइया सह सहायक का हस्ताक्षर</div>
          </div>
          <div className="text-center">
            <div>प्रभारी शिक्षक (MDM)</div>
          </div>
          <div className="text-center">
            <div>प्रधानाध्यापक का हस्ताक्षर एवं मोहर</div>
            <div className="text-[10px] font-normal text-slate-700">({schoolDetails.hmName})</div>
          </div>
        </div>
      </div>
    </div>
  );
};
