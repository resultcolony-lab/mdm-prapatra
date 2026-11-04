import React, { useState } from 'react';
import { MonthData, SchoolDetails, DailyEntry } from '../types/mdm';
import { X, Check, Wheat, Users, ShieldCheck, Calendar, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: MonthData;
  onUpdateSchoolDetails: (updated: SchoolDetails) => void;
  onUpdateDailyEntries: (updated: DailyEntry[]) => void;
}

export const QuickMetricsEditModal: React.FC<Props> = ({
  isOpen,
  onClose,
  data,
  onUpdateSchoolDetails,
  onUpdateDailyEntries,
}) => {
  const { schoolDetails, dailyEntries } = data;

  // Local state for stock and PFMS
  const [prevRice1to5, setPrevRice1to5] = useState<string>(
    schoolDetails.prevBalanceRice1to5 != null ? String(schoolDetails.prevBalanceRice1to5) : ''
  );
  const [prevRice6to8, setPrevRice6to8] = useState<string>(
    schoolDetails.prevBalanceRice6to8 != null ? String(schoolDetails.prevBalanceRice6to8) : ''
  );
  const [currRice1to5, setCurrRice1to5] = useState<string>(
    schoolDetails.currentLifting1to5 != null ? String(schoolDetails.currentLifting1to5) : ''
  );
  const [currRice6to8, setCurrRice6to8] = useState<string>(
    schoolDetails.currentLifting6to8 != null ? String(schoolDetails.currentLifting6to8) : ''
  );

  // PFMS Limits
  const [pfmsLimit1to5, setPfmsLimit1to5] = useState<string>(
    schoolDetails.pfmsLimitReceived1to5 != null ? String(schoolDetails.pfmsLimitReceived1to5) : ''
  );
  const [pfmsLimit6to8, setPfmsLimit6to8] = useState<string>(
    schoolDetails.pfmsLimitReceived6to8 != null ? String(schoolDetails.pfmsLimitReceived6to8) : ''
  );
  const [pfmsBal1to5, setPfmsBal1to5] = useState<string>(
    schoolDetails.pfmsBalance1to5 != null ? String(schoolDetails.pfmsBalance1to5) : ''
  );
  const [pfmsBal6to8, setPfmsBal6to8] = useState<string>(
    schoolDetails.pfmsBalance6to8 != null ? String(schoolDetails.pfmsBalance6to8) : ''
  );

  // Total Student-Days (Col 11) Override State
  const [overrideDays1to5, setOverrideDays1to5] = useState<string>(
    schoolDetails.overrideStudentDays1to5 != null ? String(schoolDetails.overrideStudentDays1to5) : ''
  );
  const [overrideDays6to8, setOverrideDays6to8] = useState<string>(
    schoolDetails.overrideStudentDays6to8 != null ? String(schoolDetails.overrideStudentDays6to8) : ''
  );

  // Dynamic auto-calculated averages from current daily records
  const mdmDays = dailyEntries.filter((e) => e.isMealServed && !e.isHoliday).length;
  const currentDays1to5 = dailyEntries.reduce((sum, e) => sum + (e.isMealServed && !e.isHoliday ? Number(e.count1to5 || 0) : 0), 0);
  const currentDays6to8 = dailyEntries.reduce((sum, e) => sum + (e.isMealServed && !e.isHoliday ? Number(e.count6to8 || 0) : 0), 0);

  const autoAvg1 = mdmDays > 0 && currentDays1to5 > 0 ? Math.round(currentDays1to5 / mdmDays) : (schoolDetails.enroll1to5 ? Math.round(schoolDetails.enroll1to5 * 0.75) : 95);
  const autoAvg2 = mdmDays > 0 && currentDays6to8 > 0 ? Math.round(currentDays6to8 / mdmDays) : (schoolDetails.enroll6to8 ? Math.round(schoolDetails.enroll6to8 * 0.75) : 75);

  // Quick Attendance
  const [avg1to5, setAvg1to5] = useState<string>(String(autoAvg1));
  const [avg6to8, setAvg6to8] = useState<string>(String(autoAvg2));
  const [applyAttendanceToAllDays, setApplyAttendanceToAllDays] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleSaveAll = () => {
    // 1. Update School Details
    const updatedDetails: SchoolDetails = {
      ...schoolDetails,
      prevBalanceRice1to5: prevRice1to5 === '' ? undefined : parseFloat(prevRice1to5) || 0,
      prevBalanceRice6to8: prevRice6to8 === '' ? undefined : parseFloat(prevRice6to8) || 0,
      currentLifting1to5: currRice1to5 === '' ? undefined : parseFloat(currRice1to5) || 0,
      currentLifting6to8: currRice6to8 === '' ? undefined : parseFloat(currRice6to8) || 0,
      pfmsLimitReceived1to5: pfmsLimit1to5 === '' ? null : parseFloat(pfmsLimit1to5) || 0,
      pfmsLimitReceived6to8: pfmsLimit6to8 === '' ? null : parseFloat(pfmsLimit6to8) || 0,
      pfmsBalance1to5: pfmsBal1to5 === '' ? null : parseFloat(pfmsBal1to5) || 0,
      pfmsBalance6to8: pfmsBal6to8 === '' ? null : parseFloat(pfmsBal6to8) || 0,
      overrideStudentDays1to5: overrideDays1to5.trim() === '' ? null : Math.max(0, parseInt(overrideDays1to5, 10) || 0),
      overrideStudentDays6to8: overrideDays6to8.trim() === '' ? null : Math.max(0, parseInt(overrideDays6to8, 10) || 0),
    };
    onUpdateSchoolDetails(updatedDetails);

    // 2. If user chose to apply attendance
    if (applyAttendanceToAllDays) {
      const c1 = parseInt(avg1to5, 10) || 0;
      const c2 = parseInt(avg6to8, 10) || 0;
      const total = c1 + c2;

      const updatedEntries = dailyEntries.map((e) => {
        if (e.isHoliday) return e;
        const isFriday = e.dayOfWeekHindi === 'शुक्रवार';
        const egg = isFriday ? Math.round(total * 0.85) : 0;
        const fruit = isFriday ? Math.max(0, total - egg) : 0;
        return {
          ...e,
          isMealServed: true,
          count1to5: c1,
          count6to8: c2,
          mdmTotalCount: total,
          physicalAttendance: e.physicalAttendance || total,
          eggCount: egg,
          fruitCount: fruit,
        };
      });
      onUpdateDailyEntries(updatedEntries);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold">माह की मुख्य विवरणी त्वरित संपादित करें</h3>
              <p className="text-xs text-blue-100">
                खाद्यान्न (चावल) प्रारंभिक शेष/प्राप्ति, PFMS राशि एवं औसत दैनिक उपस्थिति
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-6 space-y-5 text-xs">
          {/* Section 1: खाद्यान्न (चावल) स्टॉक विवरणी */}
          <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200/80 space-y-3">
            <div className="flex items-center gap-2 font-bold text-amber-950 text-sm">
              <Wheat className="w-4 h-4 text-amber-700" />
              <span>1. खाद्यान्न (चावल) स्टॉक विवरणी (kg में)</span>
            </div>
            <p className="text-[11px] text-amber-800">
              यहाँ प्रारंभिक शेष और वर्तमान उठाव दर्ज करें। अंतिम शेष और खपत स्वतः कैल्कुलेट हो जाएँगे।
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  प्रारंभिक शेष चावल - कक्षा 1 से 5 (kg)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={prevRice1to5}
                  onChange={(e) => setPrevRice1to5(e.target.value)}
                  placeholder="उदा० 220.500"
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  प्रारंभिक शेष चावल - कक्षा 6 से 8 (kg)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={prevRice6to8}
                  onChange={(e) => setPrevRice6to8(e.target.value)}
                  placeholder="उदा० 222.800"
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  वर्तमान माह में प्राप्त चावल - कक्षा 1 से 5 (kg)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={currRice1to5}
                  onChange={(e) => setCurrRice1to5(e.target.value)}
                  placeholder="उदा० 0.000"
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  वर्तमान माह में प्राप्त चावल - कक्षा 6 से 8 (kg)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={currRice6to8}
                  onChange={(e) => setCurrRice6to8(e.target.value)}
                  placeholder="उदा० 0.000"
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 2: उपस्थिति एवं कुल विद्यार्थी-दिवस */}
          <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-bold text-blue-950 text-sm">
                <Users className="w-4 h-4 text-blue-700" />
                <span>2. कुल विद्यार्थी-दिवस (कॉलम 11) एवं औसत उपस्थिति</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOverrideDays1to5('');
                    setOverrideDays6to8('');
                    setAvg1to5(String(autoAvg1));
                    setAvg6to8(String(autoAvg2));
                  }}
                  className="text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-white px-2.5 py-1 rounded-md border border-slate-300 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
                  title="दैनिक पंजी के योग पर रीसेट करें"
                >
                  दैनिक योग से रीसेट
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAvg1to5(String(autoAvg1));
                    setAvg6to8(String(autoAvg2));
                    setOverrideDays1to5(String(currentDays1to5));
                    setOverrideDays6to8(String(currentDays6to8));
                  }}
                  className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-white px-2.5 py-1 rounded-md border border-blue-300 shadow-2xs hover:bg-blue-50 transition cursor-pointer"
                >
                  ⚡ दैनिक पंजी से सिंक (1-5: {autoAvg1} | 6-8: {autoAvg2})
                </button>
              </div>
            </div>

            <p className="text-[11px] text-blue-900">
              आप सीधे <strong>कुल विद्यार्थी-दिवस</strong> दर्ज कर सकते हैं (सभी रिपोर्ट एवं चावल खपत इसी पर आधारित होंगी) अथवा नीचे दैनिक औसत सेट कर सकते हैं:
            </p>

            {/* Total Student-Days Direct Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-blue-200">
              <div>
                <label className="block text-blue-950 font-bold mb-1">
                  कुल विद्यार्थी-दिवस: वर्ग 1-5 (Col 11)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    value={overrideDays1to5}
                    onChange={(e) => {
                      setOverrideDays1to5(e.target.value);
                      if (mdmDays > 0 && e.target.value) {
                        setAvg1to5(String(Math.round(parseInt(e.target.value, 10) / mdmDays)));
                      }
                    }}
                    placeholder={`दैनिक योग: ${currentDays1to5}`}
                    className="w-full text-xs font-mono font-bold px-3 py-1.5 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-amber-50/30"
                  />
                  <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">× ₹6.78</span>
                </div>
              </div>

              <div>
                <label className="block text-indigo-950 font-bold mb-1">
                  कुल विद्यार्थी-दिवस: वर्ग 6-8 (Col 11)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    value={overrideDays6to8}
                    onChange={(e) => {
                      setOverrideDays6to8(e.target.value);
                      if (mdmDays > 0 && e.target.value) {
                        setAvg6to8(String(Math.round(parseInt(e.target.value, 10) / mdmDays)));
                      }
                    }}
                    placeholder={`दैनिक योग: ${currentDays6to8}`}
                    className="w-full text-xs font-mono font-bold px-3 py-1.5 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-indigo-50/30"
                  />
                  <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">× ₹10.17</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  कक्षा 1-5 के औसत बच्चे (प्रतिदिन)
                </label>
                <input
                  type="number"
                  value={avg1to5}
                  onChange={(e) => {
                    setAvg1to5(e.target.value);
                    if (mdmDays > 0 && e.target.value) {
                      setOverrideDays1to5(String(parseInt(e.target.value, 10) * mdmDays));
                    }
                  }}
                  placeholder="उदा० 95"
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  कक्षा 6-8 के औसत बच्चे (प्रतिदिन)
                </label>
                <input
                  type="number"
                  value={avg6to8}
                  onChange={(e) => {
                    setAvg6to8(e.target.value);
                    if (mdmDays > 0 && e.target.value) {
                      setOverrideDays6to8(String(parseInt(e.target.value, 10) * mdmDays));
                    }
                  }}
                  placeholder="उदा० 75"
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={applyAttendanceToAllDays}
                onChange={(e) => setApplyAttendanceToAllDays(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-slate-700 font-medium">
                माह के सभी खुले कार्यदिवसों में यह उपस्थिति स्वतः भरें (रविवार एवं अवकाश सुरक्षित रहेंगे)
              </span>
            </label>
          </div>

          {/* Section 3: PFMS वित्तीय विवरण */}
          <div className="bg-violet-50/60 p-4 rounded-xl border border-violet-200/80 space-y-3">
            <div className="flex items-center gap-2 font-bold text-violet-950 text-sm">
              <ShieldCheck className="w-4 h-4 text-violet-700" />
              <span>3. PFMS वित्तीय विवरणी (कॉलम 12 एवं 13 - वैकल्पिक)</span>
            </div>
            <p className="text-[11px] text-violet-800">
              यदि आप कॉलम 12 एवं 13 भरना चाहते हैं तो यहाँ राशि दर्ज करें। अन्यथा इन्हें खाली छोड़ सकते हैं।
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  PFMS प्राप्त लिमिट - वर्ग 1 से 5 (₹)
                </label>
                <input
                  type="number"
                  value={pfmsLimit1to5}
                  onChange={(e) => setPfmsLimit1to5(e.target.value)}
                  placeholder="खाली रखें या राशि दर्ज करें"
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  PFMS प्राप्त लिमिट - वर्ग 6 से 8 (₹)
                </label>
                <input
                  type="number"
                  value={pfmsLimit6to8}
                  onChange={(e) => setPfmsLimit6to8(e.target.value)}
                  placeholder="खाली रखें या राशि दर्ज करें"
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  PFMS अवशेष राशि - वर्ग 1 से 5 (₹)
                </label>
                <input
                  type="number"
                  value={pfmsBal1to5}
                  onChange={(e) => setPfmsBal1to5(e.target.value)}
                  placeholder="खाली रखें या राशि दर्ज करें"
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  PFMS अवशेष राशि - वर्ग 6 से 8 (₹)
                </label>
                <input
                  type="number"
                  value={pfmsBal6to8}
                  onChange={(e) => setPfmsBal6to8(e.target.value)}
                  placeholder="खाली रखें या राशि दर्ज करें"
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition"
          >
            रद्द करें
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition"
          >
            <Check className="w-4 h-4" />
            <span>सहेजें एवं विवरणी अपडेट करें</span>
          </button>
        </div>
      </div>
    </div>
  );
};
