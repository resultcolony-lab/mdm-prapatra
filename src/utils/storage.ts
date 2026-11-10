import { DailyEntry, MonthData, SchoolDetails } from '../types/mdm';
import { OFFICIAL_DEFAULT_RATES } from './mdmRates';

const STORAGE_KEY_PREFIX = 'bihar_pm_poshan_data_';
const ACTIVE_MONTH_KEY = 'bihar_pm_poshan_active_month_id';

const HINDI_DAYS = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];

export function generateDailyEntries(
  year: number,
  month: number,
  default1to5: number = 0,
  default6to8: number = 0,
  weeklyOff: 'sunday' | 'friday' = 'sunday'
): DailyEntry[] {
  // month is 1-indexed (1 to 12)
  const daysInMonth = new Date(year, month, 0).getDate();
  const entries: DailyEntry[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    const dayOfWeekIdx = d.getDay();
    const isSunday = dayOfWeekIdx === 0;
    const isFriday = dayOfWeekIdx === 5;
    const dayOfWeekHindi = HINDI_DAYS[dayOfWeekIdx];
    const dateStr = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;

    // By default, check weekly off
    const isWeeklyOff = weeklyOff === 'friday' ? isFriday : isSunday;
    const isHoliday = isWeeklyOff;
    const holidayReason = isWeeklyOff ? (weeklyOff === 'friday' ? 'शुक्रवार' : 'रविवार') : '';
    const isMealServed = !isWeeklyOff;

    entries.push({
      day,
      dateStr,
      dayOfWeekHindi,
      isSunday,
      isHoliday,
      holidayReason,
      isMealServed,
      count1to5: isMealServed ? default1to5 : 0,
      count6to8: isMealServed ? default6to8 : 0,
      remarks: '',
    });
  }

  return entries;
}

export function getDefaultDemoMonthData(): MonthData {
  const schoolDetails: SchoolDetails = {
    weeklyOff: 'sunday',
    schoolName: '',
    blockName: '',
    districtName: 'पूर्णियाँ',
    month: 'मई',
    year: '2025',
    financialYear: '2025-26',
    misCode: '',
    udiseCode: '',
    hmName: '',
    smcSecretaryName: '',
    panchayatName: '',
    sankulName: '',

    enroll1to5: undefined,
    enroll6to8: undefined,

    annualAllotment1to5: undefined,
    annualAllotment6to8: undefined,
    prevLifting1to5: undefined,
    prevLifting6to8: undefined,
    currentLifting1to5: undefined,
    currentLifting6to8: undefined,
    prevBalanceRice1to5: undefined,
    prevBalanceRice6to8: undefined,

    // Columns 12 and 13 khali (null)
    pfmsLimitReceived1to5: null,
    pfmsLimitReceived6to8: null,
    pfmsBalance1to5: null,
    pfmsBalance6to8: null,

    remarks1to5: '',
    remarks6to8: '',
  };

  const dailyEntries = generateDailyEntries(2025, 5, 0, 0);

  return {
    id: '2025-05',
    month: 'मई',
    year: '2025',
    schoolDetails,
    dailyEntries,
    customRates: OFFICIAL_DEFAULT_RATES,
    lastUpdated: new Date().toISOString(),
  };
}

export function loadCurrentMonthData(): MonthData {
  try {
    const activeId = localStorage.getItem(ACTIVE_MONTH_KEY) || '2025-05';
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + activeId);
    if (raw) {
      const parsed = JSON.parse(raw);
      // If previous version had the hardcoded demo school name or pre-filled PFMS values, reset to clean placeholders
      if (parsed.schoolDetails?.schoolName === 'राजकीय मध्य विद्यालय, पूर्णियाँ' || parsed.schoolDetails?.pfmsLimitReceived1to5 === 15000) {
        const cleanData = getDefaultDemoMonthData();
        saveMonthData(cleanData);
        return cleanData;
      }
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load from localStorage', e);
  }
  const defaultData = getDefaultDemoMonthData();
  saveMonthData(defaultData);
  return defaultData;
}

export function saveMonthData(data: MonthData): void {
  try {
    const payload = {
      ...data,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY_PREFIX + data.id, JSON.stringify(payload));
    localStorage.setItem(ACTIVE_MONTH_KEY, data.id);
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
}

export function getSavedMonthIds(): string[] {
  const ids: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        ids.push(key.replace(STORAGE_KEY_PREFIX, ''));
      }
    }
  } catch (e) {
    console.error(e);
  }
  if (!ids.includes('2025-05')) {
    ids.unshift('2025-05');
  }
  return ids.sort().reverse();
}

export function switchMonth(monthId: string): MonthData {
  localStorage.setItem(ACTIVE_MONTH_KEY, monthId);
  return loadCurrentMonthData();
}

export function exportAllDataToJson(): string {
  const exportObj: Record<string, any> = {
    exportDate: new Date().toISOString(),
    version: '1.0',
    months: {},
  };
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        const id = key.replace(STORAGE_KEY_PREFIX, '');
        exportObj.months[id] = JSON.parse(localStorage.getItem(key) || '{}');
      }
    }
  } catch (e) {
    console.error(e);
  }
  return JSON.stringify(exportObj, null, 2);
}

export function importAllDataFromJson(jsonStr: string): boolean {
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.months) {
      Object.keys(parsed.months).forEach((id) => {
        localStorage.setItem(STORAGE_KEY_PREFIX + id, JSON.stringify(parsed.months[id]));
      });
      const firstId = Object.keys(parsed.months)[0];
      if (firstId) {
        localStorage.setItem(ACTIVE_MONTH_KEY, firstId);
      }
      return true;
    }
  } catch (e) {
    console.error('Import failed', e);
  }
  return false;
}
