import React, { useState } from 'react';
import { DailyEntry, MonthData } from '../types/mdm';
import { formatINR, formatKg, OFFICIAL_DEFAULT_RATES } from '../utils/mdmRates';
import {
  Calendar,
  Check,
  AlertCircle,
  Sparkles,
  Filter,
  Info,
  ShieldAlert,
  ArrowDown,
  Plus,
  Minus,
  Copy,
  Utensils,
  Zap,
  CheckCheck,
  RotateCcw,
  Sliders,
  ChevronDown,
} from 'lucide-react';

interface Props {
  data: MonthData;
  onUpdateEntries: (updated: DailyEntry[]) => void;
}

// Official Bihar MDM Weekly Menu
const OFFICIAL_WEEKLY_MENU: Record<string, string> = {
  'सोमवार': 'चावल, दाल एवं हरी सब्जी',
  'मंगलवार': 'जीरा चावल, सोयाबीन बड़ी व आलू की सब्जी',
  'बुधवार': 'खिचड़ी (चावल, दाल, सब्जी) एवं चोखा',
  'गुरुवार': 'चावल, दाल एवं हरी पत्तेदार सब्जी',
  'शुक्रवार': 'पुलाव, उबला अंडा / मौसमी फल',
  'शनिवार': 'खिचड़ी एवं हरी सब्जी का चोखा',
};

// Common Bihar school holidays
const COMMON_HOLIDAYS = [
  'रविवार',
  'दीपावली / छठ पूजा',
  'दुर्गा पूजा',
  'होली',
  'ईद / मुहर्रम',
  'गर्मी छुट्टी',
  'शीतकालीन अवकाश',
  'स्थानीय अवकाश',
  'बाढ़ / आपदा',
  'परीक्षा दिवस',
];

export const DailyEntryTable: React.FC<Props> = ({ data, onUpdateEntries }) => {
  const { dailyEntries, schoolDetails } = data;
  const rates = data.customRates || OFFICIAL_DEFAULT_RATES;

  // Defaults based on enrollment (75% of enrollment or defaults 95/75)
  const default1to5 = schoolDetails.enroll1to5 ? Math.round(schoolDetails.enroll1to5 * 0.75) : 95;
  const default6to8 = schoolDetails.enroll6to8 ? Math.round(schoolDetails.enroll6to8 * 0.75) : 75;

  const [bulkClass1, setBulkClass1] = useState<string>(String(default1to5));
  const [bulkClass2, setBulkClass2] = useState<string>(String(default6to8));
  const [includeVariance, setIncludeVariance] = useState<boolean>(true);
  const [includeMenu, setIncludeMenu] = useState<boolean>(true);
  const [includeFridaySpecials, setIncludeFridaySpecials] = useState<boolean>(true);
  const [filterMode, setFilterMode] = useState<'all' | 'served' | 'holidays'>('all');
  const [showQuickToolbar, setShowQuickToolbar] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Change single field of an entry
  const handleEntryChange = (index: number, field: keyof DailyEntry, value: any) => {
    const updated = [...dailyEntries];
    const item = { ...updated[index], [field]: value };

    // If marked as holiday, meal served is automatically false and counts set to 0
    if (field === 'isHoliday' && value === true) {
      item.isMealServed = false;
      item.count1to5 = 0;
      item.count6to8 = 0;
      item.mdmTotalCount = 0;
      item.eggCount = 0;
      item.fruitCount = 0;
      item.physicalAttendance = 0;
      if (!item.holidayReason) item.holidayReason = item.isSunday ? 'रविवार' : 'अवकाश';
    }

    // If meal served turned false
    if (field === 'isMealServed' && value === false) {
      item.count1to5 = 0;
      item.count6to8 = 0;
      item.mdmTotalCount = 0;
      item.eggCount = 0;
      item.fruitCount = 0;
    }

    // If meal served turned true on holiday, unmark holiday
    if (field === 'isMealServed' && value === true && item.isHoliday) {
      item.isHoliday = false;
      item.holidayReason = '';
    }

    // Auto sync MDM total count and physical attendance when class counts change
    if (field === 'count1to5' || field === 'count6to8') {
      const c1 = field === 'count1to5' ? Number(value || 0) : Number(item.count1to5 || 0);
      const c2 = field === 'count6to8' ? Number(value || 0) : Number(item.count6to8 || 0);
      item.mdmTotalCount = c1 + c2;
      if (!item.physicalAttendance || item.physicalAttendance === (item.count1to5 + item.count6to8)) {
        item.physicalAttendance = c1 + c2;
      }
    }

    updated[index] = item;
    onUpdateEntries(updated);
  };

  // Quick Adjustment (+5 / -5 / +1 / -1)
  const handleQuickAdjust = (index: number, classType: '1to5' | '6to8', delta: number) => {
    const item = dailyEntries[index];
    if (!item.isMealServed || item.isHoliday) return;

    if (classType === '1to5') {
      const current = Number(item.count1to5 || 0);
      const next = Math.max(0, current + delta);
      handleEntryChange(index, 'count1to5', next);
    } else {
      const current = Number(item.count6to8 || 0);
      const next = Math.max(0, current + delta);
      handleEntryChange(index, 'count6to8', next);
    }
  };

  // Copy previous day's attendance to this day
  const handleCopyPreviousDay = (index: number) => {
    if (index <= 0) return;
    const prev = dailyEntries[index - 1];
    const curr = dailyEntries[index];
    if (curr.isHoliday) return;
    const updated = [...dailyEntries];
    updated[index] = {
      ...curr,
      isMealServed: prev.isMealServed,
      count1to5: prev.count1to5,
      count6to8: prev.count6to8,
      mdmTotalCount: prev.mdmTotalCount,
      physicalAttendance: prev.physicalAttendance,
      eggCount: curr.dayOfWeekHindi === 'शुक्रवार' ? Math.round((prev.count1to5 + prev.count6to8) * 0.85) : 0,
      fruitCount: curr.dayOfWeekHindi === 'शुक्रवार' ? Math.round((prev.count1to5 + prev.count6to8) * 0.15) : 0,
    };
    onUpdateEntries(updated);
  };

  // Copy this day's attendance to all subsequent open working days (Fill Down)
  const handleCopyToFollowingDays = (fromIndex: number) => {
    const source = dailyEntries[fromIndex];
    if (!source.isMealServed || source.isHoliday) {
      alert('कृपया किसी खुले भोजन दिवस की उपस्थिति नीचे कॉपी करें।');
      return;
    }

    const updated = dailyEntries.map((e, idx) => {
      if (idx <= fromIndex || e.isHoliday || e.isSunday) return e;
      const total = source.count1to5 + source.count6to8;
      const isFriday = e.dayOfWeekHindi === 'शुक्रवार';
      const egg = isFriday ? Math.round(total * 0.85) : 0;
      const fruit = isFriday ? Math.max(0, total - egg) : 0;
      return {
        ...e,
        isMealServed: true,
        count1to5: source.count1to5,
        count6to8: source.count6to8,
        mdmTotalCount: total,
        physicalAttendance: source.physicalAttendance || total,
        eggCount: egg,
        fruitCount: fruit,
      };
    });

    onUpdateEntries(updated);
  };

  // Copy yesterday's attendance to this day
  const handleCopyFromYesterday = (targetIndex: number) => {
    // Find preceding working day
    for (let i = targetIndex - 1; i >= 0; i--) {
      const prev = dailyEntries[i];
      if (prev.isMealServed && !prev.isHoliday) {
        const total = prev.count1to5 + prev.count6to8;
        const target = dailyEntries[targetIndex];
        const isFriday = target.dayOfWeekHindi === 'शुक्रवार';
        const egg = isFriday ? Math.round(total * 0.85) : 0;
        const fruit = isFriday ? Math.max(0, total - egg) : 0;

        const updated = [...dailyEntries];
        updated[targetIndex] = {
          ...target,
          isMealServed: true,
          isHoliday: false,
          holidayReason: '',
          count1to5: prev.count1to5,
          count6to8: prev.count6to8,
          mdmTotalCount: total,
          physicalAttendance: prev.physicalAttendance || total,
          eggCount: egg,
          fruitCount: fruit,
        };
        onUpdateEntries(updated);
        return;
      }
    }
    alert('इससे पूर्व कोई खुला कार्यदिवस नहीं मिला।');
  };

  // 1-Click Fast Month Auto-Fill
  const handleApplyQuickMonthFill = () => {
    const base1 = parseInt(bulkClass1, 10) || 0;
    const base2 = parseInt(bulkClass2, 10) || 0;

    const updated = dailyEntries.map((e, idx) => {
      if (e.isSunday) {
        return {
          ...e,
          isHoliday: true,
          holidayReason: 'रविवार',
          isMealServed: false,
          count1to5: 0,
          count6to8: 0,
          mdmTotalCount: 0,
          eggCount: 0,
          fruitCount: 0,
          physicalAttendance: 0,
        };
      }
      if (e.isHoliday) return e; // keep explicit holidays

      // Apply light pseudo-random variance (-3 to +3) so daily attendance looks natural
      let c1 = base1;
      let c2 = base2;
      if (includeVariance && base1 > 10) {
        // Deterministic pseudo variance based on date
        const offset1 = ((idx * 7 + 3) % 7) - 3;
        c1 = Math.max(1, base1 + offset1);
      }
      if (includeVariance && base2 > 10) {
        const offset2 = ((idx * 11 + 5) % 7) - 3;
        c2 = Math.max(1, base2 + offset2);
      }

      const total = c1 + c2;
      const isFriday = e.dayOfWeekHindi === 'शुक्रवार';
      const egg = (includeFridaySpecials && isFriday) ? Math.round(total * 0.85) : 0;
      const fruit = (includeFridaySpecials && isFriday) ? Math.max(0, total - egg) : 0;

      // Menu
      const menu = includeMenu ? (OFFICIAL_WEEKLY_MENU[e.dayOfWeekHindi] || e.remarks || '') : e.remarks;

      return {
        ...e,
        isMealServed: true,
        count1to5: c1,
        count6to8: c2,
        mdmTotalCount: total,
        physicalAttendance: total,
        eggCount: egg,
        fruitCount: fruit,
        remarks: menu,
      };
    });

    onUpdateEntries(updated);
  };

  // Apply Enrollment Percentage
  const handleApplyPercentage = (pct: number) => {
    const enroll1 = schoolDetails.enroll1to5 || 100;
    const enroll2 = schoolDetails.enroll6to8 || 80;
    const c1 = Math.round((enroll1 * pct) / 100);
    const c2 = Math.round((enroll2 * pct) / 100);
    setBulkClass1(String(c1));
    setBulkClass2(String(c2));
  };

  // Autofill Official Bihar Weekly Menu to all open working days
  const handleAutoFillMenu = () => {
    const updated = dailyEntries.map((e) => {
      if (e.isHoliday || !e.isMealServed) return e;
      const menu = OFFICIAL_WEEKLY_MENU[e.dayOfWeekHindi];
      return menu ? { ...e, remarks: menu } : e;
    });
    onUpdateEntries(updated);
  };

  // Auto-fill Friday Egg & Fruit
  const autoFillFridayEggFruit = () => {
    const updated = dailyEntries.map((e) => {
      const isFriday = e.dayOfWeekHindi === 'शुक्रवार';
      if (isFriday && e.isMealServed && !e.isHoliday) {
        const total = (e.count1to5 || 0) + (e.count6to8 || 0);
        const egg = Math.round(total * 0.85);
        const fruit = Math.max(0, total - egg);
        return {
          ...e,
          eggCount: egg,
          fruitCount: fruit,
          mdmTotalCount: total,
          physicalAttendance: e.physicalAttendance ?? total,
        };
      }
      return e;
    });
    onUpdateEntries(updated);
  };

  // Mark all Sundays as Holidays
  const markSundaysAsHolidays = () => {
    const updated = dailyEntries.map((e) => {
      if (e.isSunday) {
        return {
          ...e,
          isHoliday: true,
          holidayReason: 'रविवार',
          isMealServed: false,
          count1to5: 0,
          count6to8: 0,
          mdmTotalCount: 0,
          eggCount: 0,
          fruitCount: 0,
          physicalAttendance: 0,
        };
      }
      return e;
    });
    onUpdateEntries(updated);
  };

  // Filtered list
  const filteredEntries = dailyEntries.filter((e) => {
    if (filterMode === 'served') return e.isMealServed && !e.isHoliday;
    if (filterMode === 'holidays') return e.isHoliday;
    return true;
  });

  // Calculate live sums for the footer
  const totalStudentDays1to5 = dailyEntries.reduce((sum, e) => sum + (e.isMealServed && !e.isHoliday ? Number(e.count1to5 || 0) : 0), 0);
  const totalStudentDays6to8 = dailyEntries.reduce((sum, e) => sum + (e.isMealServed && !e.isHoliday ? Number(e.count6to8 || 0) : 0), 0);
  const totalPhysicalAttendance = dailyEntries.reduce((sum, e) => {
    if (e.isHoliday || !e.isMealServed) return sum;
    const p = e.physicalAttendance != null ? e.physicalAttendance : (e.count1to5 + e.count6to8);
    return sum + (Number(p) || 0);
  }, 0);
  const totalMdmBeneficiaries = dailyEntries.reduce((sum, e) => {
    if (e.isHoliday || !e.isMealServed) return sum;
    const m = e.mdmTotalCount != null ? e.mdmTotalCount : (e.count1to5 + e.count6to8);
    return sum + (Number(m) || 0);
  }, 0);
  const totalEggCount = dailyEntries.reduce((sum, e) => sum + (e.isMealServed && !e.isHoliday ? Number(e.eggCount || 0) : 0), 0);
  const totalFruitCount = dailyEntries.reduce((sum, e) => sum + (e.isMealServed && !e.isHoliday ? Number(e.fruitCount || 0) : 0), 0);

  const mdmDaysCount = dailyEntries.filter((e) => e.isMealServed && !e.isHoliday).length;
  const holidaysCount = dailyEntries.filter((e) => e.isHoliday).length;

  const totalRiceKg = (totalStudentDays1to5 * rates.class1to5.riceGramPerChild + totalStudentDays6to8 * rates.class6to8.riceGramPerChild) / 1000;
  const totalFinancialCost = totalStudentDays1to5 * rates.class1to5.totalCostPerChild + totalStudentDays6to8 * rates.class6to8.totalCostPerChild;

  return (
    <div className="space-y-4">
      {/* 1. EASY MDM ENTRY CONTROL CENTER (सुगम दैनिक प्रविष्टि टूलबार) */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 border border-blue-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Zap className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-blue-950 flex items-center gap-2">
                <span>सुगम दैनिक MDM प्रविष्टि (Easy Daily MDM Entry)</span>
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                  1-क्लिक ऑटो-फिल
                </span>
              </h2>
              <p className="text-xs text-blue-800">
                एक क्लिक में पूरे माह की उपस्थिति, मेनू और शुक्रवार अंडा/फल भरें या नीचे एक-एक दिन का विवरण दर्ज करें
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQuickToolbar((prev) => !prev)}
              className="text-xs font-semibold text-blue-700 bg-white hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition flex items-center gap-1 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{showQuickToolbar ? 'त्वरित पैनल छुपाएं' : 'त्वरित पैनल दिखाएं'}</span>
            </button>
          </div>
        </div>

        {showQuickToolbar && (
          <div className="bg-white rounded-xl p-3.5 border border-blue-100 shadow-2xs space-y-3">
            {/* Row 1: Target Attendance Inputs & Percentage Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 bg-amber-50/80 px-2.5 py-1.5 rounded-lg border border-amber-200">
                  <span className="font-bold text-amber-950">वर्ग 1-5 औसत:</span>
                  <input
                    type="number"
                    value={bulkClass1}
                    onChange={(e) => setBulkClass1(e.target.value)}
                    className="w-16 px-1.5 py-0.5 font-mono font-bold text-center border border-amber-300 rounded bg-white text-xs"
                    title="कक्षा 1-5 के दैनिक औसत छात्र"
                  />
                  <span className="text-[10px] text-amber-800 font-medium">(₹6.78)</span>
                </div>

                <div className="flex items-center gap-1.5 bg-indigo-50/80 px-2.5 py-1.5 rounded-lg border border-indigo-200">
                  <span className="font-bold text-indigo-950">वर्ग 6-8 औसत:</span>
                  <input
                    type="number"
                    value={bulkClass2}
                    onChange={(e) => setBulkClass2(e.target.value)}
                    className="w-16 px-1.5 py-0.5 font-mono font-bold text-center border border-indigo-300 rounded bg-white text-xs"
                    title="कक्षा 6-8 के दैनिक औसत छात्र"
                  />
                  <span className="text-[10px] text-indigo-800 font-medium">(₹10.17)</span>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-slate-600">
                  <span className="font-medium">नामांकन का % सेट करें:</span>
                  {[65, 70, 75, 80, 85].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleApplyPercentage(pct)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-blue-600 hover:text-white rounded border border-slate-200 font-mono font-bold transition cursor-pointer"
                      title={`नामांकन का ${pct}% छात्र सेट करें`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleApplyQuickMonthFill}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>🚀 पूरे माह में लागू करें (1-Click Auto Fill)</span>
              </button>
            </div>

            {/* Row 2: Options and Quick Sub-Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 text-[11px]">
              <div className="flex flex-wrap items-center gap-4 text-slate-700">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeVariance}
                    onChange={(e) => setIncludeVariance(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>स्वाभाविक हल्का विचलन (±2 से ±3 बच्चे उतार-चढ़ाव)</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeMenu}
                    onChange={(e) => setIncludeMenu(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>आधिकारिक साप्ताहिक मेनू स्वतः भरें</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeFridaySpecials}
                    onChange={(e) => setIncludeFridaySpecials(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>शुक्रवार अंडा (85%) व फल (15%) भरें</span>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutoFillMenu}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-md font-semibold transition cursor-pointer flex items-center gap-1"
                  title="सोम-शनि आधिकारिक मेनू भरें"
                >
                  <Utensils className="w-3.5 h-3.5 text-amber-700" />
                  <span>साप्ताहिक मेनू भरें</span>
                </button>

                <button
                  type="button"
                  onClick={autoFillFridayEggFruit}
                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-md font-semibold transition cursor-pointer flex items-center gap-1"
                >
                  <span>🥚 शुक्रवार अंडा/फल</span>
                </button>

                <button
                  type="button"
                  onClick={markSundaysAsHolidays}
                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-300 rounded-md font-semibold transition cursor-pointer flex items-center gap-1"
                >
                  <Calendar className="w-3.5 h-3.5 text-rose-600" />
                  <span>रविवार अवकाश करें</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Top Summary KPI Badges & Filter Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                viewMode === 'cards' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>📱 मोबाइल कार्ड</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🖥️ टेबल दृश्य</span>
            </button>
          </div>

          <span className="font-bold text-slate-800">फ़िल्टर:</span>
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${filterMode === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              सभी ({dailyEntries.length})
            </button>
            <button
              onClick={() => setFilterMode('served')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${filterMode === 'served' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              भोजन ({mdmDaysCount})
            </button>
            <button
              onClick={() => setFilterMode('holidays')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${filterMode === 'holidays' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              अवकाश ({holidaysCount})
            </button>
          </div>
        </div>

        {/* Live Counters */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 font-mono font-semibold text-[11px]">
          <span className="bg-emerald-50 text-emerald-900 px-2 py-1 rounded border border-emerald-200">
            भोजन: <strong>{mdmDaysCount}</strong>/{dailyEntries.length}
          </span>
          <span className="bg-amber-50 text-amber-900 px-2 py-1 rounded border border-amber-200">
            छात्र-दिवस: <strong>{totalStudentDays1to5 + totalStudentDays6to8}</strong>
          </span>
          <span className="bg-blue-50 text-blue-900 px-2 py-1 rounded border border-blue-200">
            चावल: <strong>{formatKg(totalRiceKg)} kg</strong>
          </span>
          <span className="bg-purple-50 text-purple-900 px-2 py-1 rounded border border-purple-200">
            व्यय: <strong>₹{formatINR(totalFinancialCost)}</strong>
          </span>
        </div>
      </div>

      {/* 3A. Mobile Touch Cards View (Zero sideways scrolling on phones) */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredEntries.map((entry) => {
            const originalIndex = dailyEntries.findIndex((e) => e.day === entry.day);
            const isServed = entry.isMealServed && !entry.isHoliday;
            const isFriday = entry.dayOfWeekHindi === 'शुक्रवार';
            const c1 = isServed ? Number(entry.count1to5 || 0) : 0;
            const c2 = isServed ? Number(entry.count6to8 || 0) : 0;
            const totalStudents = c1 + c2;
            const riceKg = (c1 * rates.class1to5.riceGramPerChild + c2 * rates.class6to8.riceGramPerChild) / 1000;
            const dayTotal = c1 * rates.class1to5.totalCostPerChild + c2 * rates.class6to8.totalCostPerChild;

            return (
              <div
                key={entry.day}
                className={`rounded-2xl border p-3.5 shadow-xs transition ${
                  entry.isSunday
                    ? 'bg-rose-50/50 border-rose-200'
                    : entry.isHoliday
                    ? 'bg-amber-50/50 border-amber-200'
                    : isFriday
                    ? 'bg-amber-50/30 border-amber-300'
                    : isServed
                    ? 'bg-white border-slate-200 hover:border-blue-300'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                {/* Card Top Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-extrabold text-sm shadow-xs ${
                        entry.isSunday
                          ? 'bg-rose-600 text-white'
                          : isFriday
                          ? 'bg-amber-600 text-white'
                          : 'bg-indigo-600 text-white'
                      }`}
                    >
                      {String(entry.day).padStart(2, '0')}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                        <span>{entry.dayOfWeekHindi}</span>
                        {isFriday && (
                          <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-semibold">
                            🥚 अंडा/फल
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">{entry.dateStr}</div>
                    </div>
                  </div>

                  {/* Meal Toggle */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleEntryChange(originalIndex, 'isMealServed', !entry.isMealServed)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                        isServed
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      {isServed ? <Check className="w-3.5 h-3.5" /> : null}
                      <span>भोजन: {isServed ? 'हाँ' : 'नहीं'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleEntryChange(originalIndex, 'isHoliday', !entry.isHoliday)}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        entry.isHoliday
                          ? 'bg-rose-100 text-rose-800 font-bold border border-rose-300'
                          : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {entry.isHoliday ? 'अवकाश' : 'खुला'}
                    </button>
                  </div>
                </div>

                {/* Card Body */}
                {entry.isHoliday ? (
                  <div className="py-3 space-y-2 text-xs">
                    <div className="bg-rose-100/70 p-2 rounded-xl text-rose-900 font-semibold flex items-center justify-between">
                      <span>अवकाश का दिन</span>
                      <span className="text-[11px] font-bold text-rose-800 font-mono">0 छात्र</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={entry.holidayReason}
                        onChange={(e) => handleEntryChange(originalIndex, 'holidayReason', e.target.value)}
                        placeholder="अवकाश का कारण लिखें..."
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                      />
                      <select
                        onChange={(e) => e.target.value && handleEntryChange(originalIndex, 'holidayReason', e.target.value)}
                        className="text-xs py-1.5 px-2 bg-slate-100 border border-slate-300 rounded-lg"
                      >
                        <option value="">कारण चुनें</option>
                        {COMMON_HOLIDAYS.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : isServed ? (
                  <div className="py-2.5 space-y-2.5 text-xs">
                    {/* Class 1-5 Counter */}
                    <div className="bg-amber-50/70 p-2 rounded-xl border border-amber-200/80">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-amber-950 flex items-center gap-1">
                          वर्ग 1-5 छात्र
                          <span className="text-[10px] font-normal text-amber-800">(@₹6.78)</span>
                        </span>
                        <span className="font-mono text-[11px] text-amber-900 font-bold">
                          ₹{(c1 * rates.class1to5.totalCostPerChild).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleQuickAdjust(originalIndex, '1to5', -5)}
                            className="w-8 h-8 rounded-lg bg-white hover:bg-amber-100 text-amber-900 font-bold border border-amber-300 flex items-center justify-center text-xs shadow-2xs"
                          >
                            -5
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickAdjust(originalIndex, '1to5', -1)}
                            className="w-8 h-8 rounded-lg bg-white hover:bg-amber-100 text-amber-900 font-bold border border-amber-300 flex items-center justify-center text-xs shadow-2xs"
                          >
                            -1
                          </button>
                        </div>
                        <input
                          type="number"
                          min="0"
                          value={entry.count1to5 || ''}
                          placeholder="0"
                          onChange={(e) => handleEntryChange(originalIndex, 'count1to5', parseInt(e.target.value) || 0)}
                          className="w-20 text-center font-mono font-bold text-base py-1 border border-amber-400 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-amber-500"
                        />
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleQuickAdjust(originalIndex, '1to5', 1)}
                            className="w-8 h-8 rounded-lg bg-white hover:bg-amber-100 text-amber-900 font-bold border border-amber-300 flex items-center justify-center text-xs shadow-2xs"
                          >
                            +1
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickAdjust(originalIndex, '1to5', 5)}
                            className="w-8 h-8 rounded-lg bg-white hover:bg-amber-100 text-amber-900 font-bold border border-amber-300 flex items-center justify-center text-xs shadow-2xs"
                          >
                            +5
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Class 6-8 Counter */}
                    <div className="bg-indigo-50/70 p-2 rounded-xl border border-indigo-200/80">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-indigo-950 flex items-center gap-1">
                          वर्ग 6-8 छात्र
                          <span className="text-[10px] font-normal text-indigo-800">(@₹10.17)</span>
                        </span>
                        <span className="font-mono text-[11px] text-indigo-900 font-bold">
                          ₹{(c2 * rates.class6to8.totalCostPerChild).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleQuickAdjust(originalIndex, '6to8', -5)}
                            className="w-8 h-8 rounded-lg bg-white hover:bg-indigo-100 text-indigo-900 font-bold border border-indigo-300 flex items-center justify-center text-xs shadow-2xs"
                          >
                            -5
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickAdjust(originalIndex, '6to8', -1)}
                            className="w-8 h-8 rounded-lg bg-white hover:bg-indigo-100 text-indigo-900 font-bold border border-indigo-300 flex items-center justify-center text-xs shadow-2xs"
                          >
                            -1
                          </button>
                        </div>
                        <input
                          type="number"
                          min="0"
                          value={entry.count6to8 || ''}
                          placeholder="0"
                          onChange={(e) => handleEntryChange(originalIndex, 'count6to8', parseInt(e.target.value) || 0)}
                          className="w-20 text-center font-mono font-bold text-base py-1 border border-indigo-400 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                        />
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleQuickAdjust(originalIndex, '6to8', 1)}
                            className="w-8 h-8 rounded-lg bg-white hover:bg-indigo-100 text-indigo-900 font-bold border border-indigo-300 flex items-center justify-center text-xs shadow-2xs"
                          >
                            +1
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickAdjust(originalIndex, '6to8', 5)}
                            className="w-8 h-8 rounded-lg bg-white hover:bg-indigo-100 text-indigo-900 font-bold border border-indigo-300 flex items-center justify-center text-xs shadow-2xs"
                          >
                            +5
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Friday Specials (Egg & Fruit) */}
                    {isFriday && (
                      <div className="bg-amber-100/60 p-2 rounded-xl border border-amber-300/80 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 flex-1">
                          <span className="font-bold text-amber-900 text-[11px]">🥚 अंडा:</span>
                          <input
                            type="number"
                            min="0"
                            value={entry.eggCount != null ? entry.eggCount : Math.round(totalStudents * 0.85)}
                            onChange={(e) => handleEntryChange(originalIndex, 'eggCount', parseInt(e.target.value) || 0)}
                            className="w-14 text-center font-mono font-bold py-1 border border-amber-400 rounded bg-white text-xs"
                          />
                        </div>
                        <div className="flex items-center gap-1 flex-1">
                          <span className="font-bold text-emerald-900 text-[11px]">🍎 फल:</span>
                          <input
                            type="number"
                            min="0"
                            value={entry.fruitCount != null ? entry.fruitCount : Math.max(0, totalStudents - Math.round(totalStudents * 0.85))}
                            onChange={(e) => handleEntryChange(originalIndex, 'fruitCount', parseInt(e.target.value) || 0)}
                            className="w-14 text-center font-mono font-bold py-1 border border-emerald-400 rounded bg-white text-xs"
                          />
                        </div>
                      </div>
                    )}

                    {/* Menu and Actions */}
                    <div className="flex items-center justify-between gap-2 pt-1 text-[11px]">
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <Utensils className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <input
                          type="text"
                          value={entry.menuHindi || OFFICIAL_WEEKLY_MENU[entry.dayOfWeekHindi] || ''}
                          onChange={(e) => handleEntryChange(originalIndex, 'menuHindi', e.target.value)}
                          placeholder="मेनू..."
                          className="w-full text-xs px-2 py-1 border border-slate-200 rounded-lg bg-slate-50 truncate"
                        />
                      </div>

                      {originalIndex > 0 && (
                        <button
                          type="button"
                          onClick={() => handleCopyPreviousDay(originalIndex)}
                          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg font-semibold flex items-center gap-1 shrink-0 border border-blue-200 cursor-pointer"
                          title="कल जैसा कॉपी करें"
                        >
                          <Copy className="w-3 h-3" />
                          <span>कल जैसा</span>
                        </button>
                      )}
                    </div>

                    {/* Bottom Card Summary Pill */}
                    <div className="flex items-center justify-between bg-slate-100 p-2 rounded-xl text-[11px] font-mono font-semibold text-slate-700">
                      <span>छात्र: <strong className="text-slate-900">{totalStudents}</strong></span>
                      <span>चावल: <strong className="text-amber-900">{riceKg.toFixed(3)} kg</strong></span>
                      <span>व्यय: <strong className="text-emerald-900">₹{dayTotal.toFixed(2)}</strong></span>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center text-slate-500 text-xs">
                    <span>इस दिन भोजन नहीं बना</span>
                    <button
                      type="button"
                      onClick={() => handleEntryChange(originalIndex, 'isMealServed', true)}
                      className="mt-1 block mx-auto text-blue-600 font-bold hover:underline"
                    >
                      भोजन चालू करें
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 3B. Daily Data Entry Table (Full Table View) */}
      <div className={`bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden ${viewMode === 'cards' ? 'hidden' : 'block'}`}>
        <div className="p-2 bg-slate-50 border-b border-slate-200 text-xs text-slate-600 flex items-center justify-between">
          <span>💡 मोबाइल पर टेबल को दाएँ-बाएँ (Horizontal) स्वाइप करें</span>
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className="text-blue-600 font-bold hover:underline"
          >
            📱 कार्ड दृश्य में बदलें
          </button>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-2 text-center w-10">दि०</th>
                <th className="p-2 w-16">दिन</th>
                <th className="p-2 text-center w-16">भोजन?</th>
                <th className="p-2 text-center w-16">स्थिति</th>
                <th className="p-2 min-w-[180px]">कारण / मेनू</th>
                <th className="p-2 text-right w-20 bg-slate-50 font-bold" title="अपलोड किए गए PDF का कॉलम 3">
                  भौतिक उप०
                </th>
                <th className="p-2 text-center min-w-[130px] bg-amber-50/40">
                  <span>क० 1-5</span>
                  <span className="block text-[9px] font-normal text-amber-800">(@₹6.78)</span>
                </th>
                <th className="p-2 text-center min-w-[130px] bg-indigo-50/40">
                  <span>क० 6-8</span>
                  <span className="block text-[9px] font-normal text-indigo-800">(@₹10.17)</span>
                </th>
                <th className="p-2 text-right w-20 bg-blue-50/60 font-bold" title="अपलोड किए गए PDF का कॉलम 4">
                  म०भो० कुल
                </th>
                <th className="p-2 text-right w-16 bg-amber-50/50" title="अण्डा (शुक्रवार)">
                  अण्डा
                </th>
                <th className="p-2 text-right w-16 bg-emerald-50/50" title="मौसमी फल (शुक्रवार)">
                  फल
                </th>
                <th className="p-2 text-right w-20 bg-amber-50/40">चावल (kg)</th>
                <th className="p-2 text-right w-20 bg-emerald-50/60 font-bold">व्यय (₹)</th>
                <th className="p-2 text-center w-24">त्वरित क्रिया</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-slate-800">
              {filteredEntries.map((entry) => {
                const originalIndex = dailyEntries.findIndex((e) => e.day === entry.day);
                const isServed = entry.isMealServed && !entry.isHoliday;
                const isFriday = entry.dayOfWeekHindi === 'शुक्रवार';
                const c1 = isServed ? Number(entry.count1to5 || 0) : 0;
                const c2 = isServed ? Number(entry.count6to8 || 0) : 0;
                const totalStudents = c1 + c2;
                const mdmCount = entry.mdmTotalCount != null ? entry.mdmTotalCount : totalStudents;
                const physAttendance = entry.physicalAttendance != null ? entry.physicalAttendance : totalStudents;

                // Daily calculated costs
                const riceKg = (c1 * rates.class1to5.riceGramPerChild + c2 * rates.class6to8.riceGramPerChild) / 1000;
                const dayTotal = c1 * rates.class1to5.totalCostPerChild + c2 * rates.class6to8.totalCostPerChild;

                // Warnings
                const enroll1 = schoolDetails.enroll1to5 || 0;
                const enroll2 = schoolDetails.enroll6to8 || 0;
                const exceedsEnroll1 = enroll1 > 0 && c1 > enroll1;
                const exceedsEnroll2 = enroll2 > 0 && c2 > enroll2;

                return (
                  <tr
                    key={entry.day}
                    className={`transition hover:bg-slate-50 ${
                      entry.isSunday
                        ? 'bg-rose-50/40'
                        : entry.isHoliday
                        ? 'bg-amber-50/30'
                        : isFriday
                        ? 'bg-amber-50/20'
                        : isServed
                        ? 'bg-white'
                        : 'bg-slate-50/70'
                    }`}
                  >
                    {/* Date */}
                    <td className="p-2 text-center font-mono font-bold">
                      {String(entry.day).padStart(2, '0')}
                    </td>

                    {/* Day name */}
                    <td className="p-2 whitespace-nowrap">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                          entry.isSunday
                            ? 'bg-red-100 text-red-800'
                            : isFriday
                            ? 'bg-amber-100 text-amber-900'
                            : 'text-slate-700'
                        }`}
                      >
                        {entry.dayOfWeekHindi}
                      </span>
                    </td>

                    {/* Meal Served toggle */}
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleEntryChange(originalIndex, 'isMealServed', !entry.isMealServed)}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                          isServed
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                      >
                        {isServed ? 'हाँ' : 'नहीं'}
                      </button>
                    </td>

                    {/* Holiday toggle */}
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleEntryChange(originalIndex, 'isHoliday', !entry.isHoliday)}
                        className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                          entry.isHoliday
                            ? 'bg-rose-100 text-rose-800 font-bold border border-rose-300'
                            : 'text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        {entry.isHoliday ? 'अवकाश' : 'खुला'}
                      </button>
                    </td>

                    {/* Reason / Menu */}
                    <td className="p-1.5">
                      {entry.isHoliday ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={entry.holidayReason}
                            onChange={(e) => handleEntryChange(originalIndex, 'holidayReason', e.target.value)}
                            placeholder="अवकाश का कारण"
                            className="w-full text-xs px-1.5 py-1 border border-slate-300 rounded bg-white text-rose-800 font-medium focus:ring-1 focus:ring-rose-500"
                          />
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleEntryChange(originalIndex, 'holidayReason', e.target.value);
                              }
                            }}
                            className="text-[10px] bg-slate-100 border border-slate-300 rounded px-1 py-1 text-slate-700 outline-none cursor-pointer"
                            title="अवकाश का प्रकार चुनें"
                          >
                            <option value="">कारण</option>
                            {COMMON_HOLIDAYS.map((h) => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={entry.remarks || ''}
                          onChange={(e) => handleEntryChange(originalIndex, 'remarks', e.target.value)}
                          placeholder="मेनू / टिप्पणी"
                          className="w-full text-xs px-1.5 py-1 border border-transparent hover:border-slate-300 focus:border-blue-400 rounded bg-transparent focus:bg-white"
                        />
                      )}
                    </td>

                    {/* Physical Attendance (PDF Col 3) */}
                    <td className="p-1.5 text-right bg-slate-50/60">
                      <input
                        type="number"
                        min={0}
                        disabled={!isServed}
                        value={isServed ? (physAttendance || '') : ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? undefined : Math.max(0, parseInt(e.target.value, 10) || 0);
                          handleEntryChange(originalIndex, 'physicalAttendance', val);
                        }}
                        placeholder={isServed ? String(totalStudents) : '-'}
                        className="w-16 text-right font-mono font-medium px-1.5 py-1 rounded border border-slate-200 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs"
                      />
                    </td>

                    {/* Count 1-5 with Quick Adjust */}
                    <td className="p-1.5 text-center bg-amber-50/20">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          disabled={!isServed || (entry.count1to5 || 0) <= 0}
                          onClick={() => handleQuickAdjust(originalIndex, '1to5', -5)}
                          className="no-print p-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30 cursor-pointer"
                          title="-5 बच्चे घटाएं"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={schoolDetails.enroll1to5 || 9999}
                          disabled={!isServed}
                          value={isServed ? (entry.count1to5 || '') : ''}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                            handleEntryChange(originalIndex, 'count1to5', val);
                          }}
                          placeholder={isServed ? '0' : '-'}
                          className={`w-14 text-right font-mono font-bold px-1.5 py-1 rounded border ${
                            !isServed
                              ? 'bg-slate-100 text-slate-400 border-slate-200'
                              : exceedsEnroll1
                              ? 'bg-rose-50 border-rose-400 text-rose-800'
                              : 'bg-white border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                          } text-xs`}
                        />
                        <button
                          type="button"
                          disabled={!isServed}
                          onClick={() => handleQuickAdjust(originalIndex, '1to5', +5)}
                          className="no-print p-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30 cursor-pointer"
                          title="+5 बच्चे बढ़ाएं"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    {/* Count 6-8 with Quick Adjust */}
                    <td className="p-1.5 text-center bg-indigo-50/20">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          disabled={!isServed || (entry.count6to8 || 0) <= 0}
                          onClick={() => handleQuickAdjust(originalIndex, '6to8', -5)}
                          className="no-print p-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30 cursor-pointer"
                          title="-5 बच्चे घटाएं"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={schoolDetails.enroll6to8 || 9999}
                          disabled={!isServed}
                          value={isServed ? (entry.count6to8 || '') : ''}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                            handleEntryChange(originalIndex, 'count6to8', val);
                          }}
                          placeholder={isServed ? '0' : '-'}
                          className={`w-14 text-right font-mono font-bold px-1.5 py-1 rounded border ${
                            !isServed
                              ? 'bg-slate-100 text-slate-400 border-slate-200'
                              : exceedsEnroll2
                              ? 'bg-rose-50 border-rose-400 text-rose-800'
                              : 'bg-white border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                          } text-xs`}
                        />
                        <button
                          type="button"
                          disabled={!isServed}
                          onClick={() => handleQuickAdjust(originalIndex, '6to8', +5)}
                          className="no-print p-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30 cursor-pointer"
                          title="+5 बच्चे बढ़ाएं"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    {/* MDM Total Children (PDF Col 4) */}
                    <td className="p-1.5 text-right bg-blue-50/40">
                      <input
                        type="number"
                        min={0}
                        disabled={!isServed}
                        value={isServed ? (mdmCount || '') : ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? undefined : Math.max(0, parseInt(e.target.value, 10) || 0);
                          handleEntryChange(originalIndex, 'mdmTotalCount', val);
                        }}
                        placeholder={isServed ? String(totalStudents) : '-'}
                        className="w-16 text-right font-mono font-bold px-1.5 py-1 rounded border border-blue-200 bg-white text-blue-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs"
                      />
                    </td>

                    {/* Egg count (PDF Col 5) */}
                    <td className="p-1.5 text-right bg-amber-50/30">
                      <input
                        type="number"
                        min={0}
                        disabled={!isServed}
                        value={isServed ? (entry.eggCount ?? '') : ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? undefined : Math.max(0, parseInt(e.target.value, 10) || 0);
                          handleEntryChange(originalIndex, 'eggCount', val);
                        }}
                        placeholder={isServed && isFriday ? String(Math.round(totalStudents * 0.85)) : '-'}
                        className={`w-14 text-right font-mono font-medium px-1 py-1 rounded border ${
                          isFriday ? 'border-amber-300 bg-amber-50/50 text-amber-950 font-bold' : 'border-slate-200 bg-white text-slate-700'
                        } text-xs`}
                      />
                    </td>

                    {/* Fruit count (PDF Col 6) */}
                    <td className="p-1.5 text-right bg-emerald-50/30">
                      <input
                        type="number"
                        min={0}
                        disabled={!isServed}
                        value={isServed ? (entry.fruitCount ?? '') : ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? undefined : Math.max(0, parseInt(e.target.value, 10) || 0);
                          handleEntryChange(originalIndex, 'fruitCount', val);
                        }}
                        placeholder={isServed && isFriday ? String(Math.max(0, totalStudents - Math.round(totalStudents * 0.85))) : '-'}
                        className={`w-14 text-right font-mono font-medium px-1 py-1 rounded border ${
                          isFriday ? 'border-emerald-300 bg-emerald-50/50 text-emerald-950 font-bold' : 'border-slate-200 bg-white text-slate-700'
                        } text-xs`}
                      />
                    </td>

                    {/* Rice (kg) */}
                    <td className="p-2 text-right font-mono text-amber-900 bg-amber-50/40">
                      {isServed ? formatKg(riceKg) : '-'}
                    </td>

                    {/* Daily Total Cost */}
                    <td className="p-2 text-right font-mono font-bold text-emerald-950 bg-emerald-50/60">
                      {isServed ? `₹${formatINR(dayTotal)}` : '₹0.00'}
                    </td>

                    {/* Quick Row Actions: Copy down / Copy from yesterday */}
                    <td className="p-1 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleCopyToFollowingDays(originalIndex)}
                          disabled={!isServed}
                          className="px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-bold disabled:opacity-30 cursor-pointer flex items-center gap-0.5"
                          title="इस दिन की उपस्थिति माह के अगले सभी खुले दिनों में कॉपी करें"
                        >
                          <ArrowDown className="w-3 h-3 text-blue-600" />
                          <span>नीचे कॉपी</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyFromYesterday(originalIndex)}
                          className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] cursor-pointer"
                          title="पिछले खुले दिन की उपस्थिति इस दिन में कॉपी करें"
                        >
                          <Copy className="w-3 h-3 text-slate-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Table Footer with Column Totals */}
            <tfoot className="bg-slate-200 text-slate-900 font-bold border-t-2 border-slate-400">
              <tr>
                <td colSpan={5} className="p-2.5 text-center uppercase tracking-wide">
                  माह का कुल योग (Total)
                </td>
                <td className="p-2 text-right font-mono text-slate-950 bg-slate-300/70">{totalPhysicalAttendance}</td>
                <td className="p-2 text-center font-mono text-amber-950">{totalStudentDays1to5}</td>
                <td className="p-2 text-center font-mono text-indigo-950">{totalStudentDays6to8}</td>
                <td className="p-2 text-right font-mono text-blue-950 bg-blue-100">{totalMdmBeneficiaries}</td>
                <td className="p-2 text-right font-mono text-amber-950 bg-amber-100">{totalEggCount}</td>
                <td className="p-2 text-right font-mono text-emerald-950 bg-emerald-100">{totalFruitCount}</td>
                <td className="p-2 text-right font-mono text-amber-950 bg-amber-200">{formatKg(totalRiceKg)} kg</td>
                <td className="p-2.5 text-right font-mono text-emerald-950 bg-emerald-200 text-sm">
                  ₹{formatINR(totalFinancialCost)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
