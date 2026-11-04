import React, { useState } from 'react';
import { MonthData } from '../types/mdm';
import { runAutomatedVerificationTests } from '../utils/mdmCalculations';
import { calculatePrapatraRows } from '../utils/mdmCalculations';
import { formatINR, OFFICIAL_DEFAULT_RATES } from '../utils/mdmRates';
import { CheckCircle2, XCircle, ShieldCheck, RefreshCw, AlertTriangle, FileCheck2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: MonthData;
}

export const VerificationTestsModal: React.FC<Props> = ({ isOpen, onClose, data }) => {
  const [running, setRunning] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'standard' | 'audit'>('standard');

  if (!isOpen) return null;

  const standardTests = runAutomatedVerificationTests(data.customRates || OFFICIAL_DEFAULT_RATES);
  const calc = calculatePrapatraRows(data, data.customRates || OFFICIAL_DEFAULT_RATES);

  // Live Month Integrity Audit
  const dailyTotalSum = data.dailyEntries.reduce((sum, e) => {
    if (!e.isMealServed || e.isHoliday) return sum;
    const c1 = Number(e.count1to5 || 0);
    const c2 = Number(e.count6to8 || 0);
    const r1 = data.customRates?.class1to5.totalCostPerChild || OFFICIAL_DEFAULT_RATES.class1to5.totalCostPerChild;
    const r2 = data.customRates?.class6to8.totalCostPerChild || OFFICIAL_DEFAULT_RATES.class6to8.totalCostPerChild;
    return sum + (c1 * r1 + c2 * r2);
  }, 0);

  const monthlyTotalSum = calc.totalRow.col19_totalExp;
  const isSumMatching = Math.abs(dailyTotalSum - monthlyTotalSum) < 0.1;

  const isRiceStockValid =
    calc.totalRow.col9_consumedRice <= calc.totalRow.col8_totalAvailableRice || calc.totalRow.col8_totalAvailableRice === 0;

  const enroll1 = data.schoolDetails.enroll1to5 || 0;
  const enroll2 = data.schoolDetails.enroll6to8 || 0;
  const isEnrollmentValid =
    (enroll1 === 0 || calc.row1to5.col22_avgBeneficiaries <= enroll1) &&
    (enroll2 === 0 || calc.row6to8.col22_avgBeneficiaries <= enroll2);

  const noNegativeValues =
    calc.totalRow.col19_totalExp >= 0 &&
    calc.totalRow.col9_consumedRice >= 0 &&
    calc.totalRow.col10_closingBalanceRice >= 0;

  const handleReRun = () => {
    setRunning(true);
    setTimeout(() => {
      setRunning(false);
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-bold">
                स्वचालित गणना एवं सत्यापन टेस्ट सिस्टम (Automated Audit Suite)
              </h2>
              <p className="text-xs text-slate-300">
                बिहार सरकार PM POSHAN गणितीय एवं सांख्यिकीय सटीकता परीक्षण
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl font-bold ml-2 transition"
          >
            ✕
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('standard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'standard'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              मानक सरकारी टेस्ट (TEST 1 to TEST 6)
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'audit'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              वर्तमान माह लाइव डेटा ऑडिट (Live Integrity)
            </button>
          </div>

          <button
            onClick={handleReRun}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 shadow-xs transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${running ? 'animate-spin text-blue-600' : ''}`} />
            पुनः जाँचें
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          {activeTab === 'standard' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-600">
                सरकारी गाइडलाइन एवं अपलोड किए गए रेट चार्ट के आधार पर अनिवार्य परीक्षण:
              </div>

              {standardTests.map((t) => (
                <div
                  key={t.id}
                  className={`p-4 rounded-xl border transition ${
                    t.passed
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                      : 'bg-rose-50 border-rose-200 text-rose-950'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      {t.passed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-bold text-xs">{t.title}</div>
                        <div className="text-[11px] text-slate-600 mt-0.5">{t.description}</div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          t.passed
                            ? 'bg-emerald-200 text-emerald-900'
                            : 'bg-rose-200 text-rose-900'
                        }`}
                      >
                        {t.passed ? 'सफल (PASSED)' : 'त्रुटि (FAILED)'}
                      </span>
                      <div className="text-[10px] text-slate-500 font-mono mt-1">
                        अपेक्षित: {t.expected} | वास्तविक: {t.actual}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-600">
                वर्तमान चयनित माह ({data.schoolDetails.month} {data.schoolDetails.year}) के डेटा का सत्यापन:
              </div>

              {/* Check 1: Daily vs Monthly total */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {isSumMatching ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  )}
                  <div>
                    <span className="font-semibold text-slate-900">दैनिक व्यय और मासिक प्रपत्र-क योग मिलान:</span>
                    <div className="text-[11px] text-slate-500">
                      दैनिक पंजी योग: ₹{formatINR(dailyTotalSum)} | प्रपत्र-क योग: ₹{formatINR(monthlyTotalSum)}
                    </div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${isSumMatching ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {isSumMatching ? '100% सुमेलित' : 'असंगत'}
                </span>
              </div>

              {/* Check 2: Rice Stock limit */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {isRiceStockValid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  )}
                  <div>
                    <span className="font-semibold text-slate-900">खाद्यान्न (चावल) स्टॉक उपलब्धता:</span>
                    <div className="text-[11px] text-slate-500">
                      कुल उपलब्ध: {calc.totalRow.col8_totalAvailableRice} kg | कुल खपत: {calc.totalRow.col9_consumedRice} kg | अवशेष: {calc.totalRow.col10_closingBalanceRice} kg
                    </div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${isRiceStockValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {isRiceStockValid ? 'स्टॉक सामान्य' : 'स्टॉक से अधिक खपत!'}
                </span>
              </div>

              {/* Check 3: Enrollment verification */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {isEnrollmentValid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  )}
                  <div>
                    <span className="font-semibold text-slate-900">नामांकन सीमा सत्यापन:</span>
                    <div className="text-[11px] text-slate-500">
                      कक्षा 1-5 औसत: {calc.row1to5.col22_avgBeneficiaries} (नामांकन: {data.schoolDetails.enroll1to5 || '---'}) | कक्षा 6-8 औसत: {calc.row6to8.col22_avgBeneficiaries} (नामांकन: {data.schoolDetails.enroll6to8 || '---'})
                    </div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${isEnrollmentValid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {isEnrollmentValid ? 'वैध' : 'नामांकन से अधिक उपस्थिति'}
                </span>
              </div>

              {/* Check 4: No Negative Numbers */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {noNegativeValues ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600" />
                  )}
                  <div>
                    <span className="font-semibold text-slate-900">नकारात्मक मान (Negative Values) निषेध:</span>
                    <div className="text-[11px] text-slate-500">
                      सभी राशियाँ और वजन शून्य अथवा धनात्मक हैं।
                    </div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${noNegativeValues ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {noNegativeValues ? 'शून्य त्रुटि' : 'नकारात्मक मान मिला!'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-3.5 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-semibold transition"
          >
            सत्यापन पूर्ण (बंद करें)
          </button>
        </div>
      </div>
    </div>
  );
};
