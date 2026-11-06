export interface RateItem {
  id: string;
  name: string;
  weightGram: number;
  ratePerKg: number;
  costPerChild: number;
}

export interface ClassRateGroup {
  dal: RateItem;
  sabji: RateItem;
  tel: RateItem;
  masala: RateItem;
  jalawan: RateItem;
  totalCostPerChild: number;
  riceGramPerChild: number;
}

export interface RateChart {
  class1to5: ClassRateGroup;
  class6to8: ClassRateGroup;
  effectiveDate: string;
}

export interface SchoolDetails {
  schoolName: string;
  blockName: string;
  districtName: string;
  month: string;
  year: string;
  financialYear: string;
  misCode: string;
  hmName: string;
  smcSecretaryName: string;
  panchayatName?: string;
  sankulName?: string;
  
  // Enrollment
  enroll1to5?: number;
  enroll6to8?: number;

  // Foodgrain Stock / Lifting Details (in Kilograms)
  annualAllotment1to5?: number;      // Col 3
  annualAllotment6to8?: number;
  prevLifting1to5?: number;          // Col 4: गत माह तक उठाव
  prevLifting6to8?: number;
  currentLifting1to5?: number;       // Col 5: वर्तमान माह में उठाव
  currentLifting6to8?: number;
  prevBalanceRice1to5?: number;      // Col 7: विद्यालय में पूर्व माह तक का अवशेष खाद्यान्न
  prevBalanceRice6to8?: number;

  // Financial (PFMS) - Columns 12 & 13 (default empty/null)
  pfmsLimitReceived1to5?: number | null;    // Col 12: विद्यालय को प्राप्त लिमिट राशि
  pfmsLimitReceived6to8?: number | null;
  pfmsBalance1to5?: number | null;          // Col 13: वर्तमान में PFMS में अवशेष राशि
  pfmsBalance6to8?: number | null;

  // Optional manual override for Total Student-Days (कुल विद्यार्थी दिवस)
  overrideStudentDays1to5?: number | null;  // Col 11 Override
  overrideStudentDays6to8?: number | null;

  // Weekly Off: 'sunday' (General schools) or 'friday' (Urdu/Madarsa schools)
  weeklyOff?: 'sunday' | 'friday';

  // Remarks
  remarks1to5: string;              // Col 24
  remarks6to8: string;
}

export interface DailyEntry {
  day: number;
  dateStr: string;
  dayOfWeekHindi: string;
  isSunday: boolean;
  isHoliday: boolean;
  holidayReason: string;
  isMealServed: boolean;
  count1to5: number;
  count6to8: number;

  // बिहार सरकार समेकित प्रतिदिन रिपोर्ट (वर्ग 01 से 08) के कॉलम
  physicalAttendance?: number;     // भौतिक उपस्थिति
  mdmTotalCount?: number;         // म०भो० ग्रहण करने वाले बच्चों की संख्या
  eggCount?: number;              // अण्डा खाने वाले बच्चों की संख्या (शुक्रवार/रविवार)
  fruitCount?: number;            // मौसमी फल सेव या केला खाने वाले बच्चों की संख्या (शुक्रवार/रविवार)

  menuHindi?: string;
  remarks?: string;
}

export interface Prapatra1FinancialData {
  // A. प्रारंभिक शेष (आय)
  openingBank?: number;
  openingCash?: number;

  // B. प्राप्ति
  receiptConversion1to5?: number;
  receiptConversion6to8?: number;
  receiptCookHonorarium?: number;
  receiptKitchenShed?: number;
  receiptUtensils?: number;
  receiptOtherName?: string;
  receiptOtherAmount?: number;
  receiptExtra1Name?: string;
  receiptExtra1Amount?: number;
  receiptExtra2Name?: string;
  receiptExtra2Amount?: number;

  // C. व्यय (पोषाहार पंजी के अनुसार)
  exp1to5Dal?: number;
  exp1to5Masala?: number;
  exp1to5Tel?: number;
  exp1to5Sabji?: number;
  exp1to5Jalawan?: number;

  exp6to8Dal?: number;
  exp6to8Masala?: number;
  exp6to8Tel?: number;
  exp6to8Sabji?: number;
  exp6to8Jalawan?: number;

  expCookHonorarium?: number;
  expKitchenShed?: number;
  expUtensils?: number;
  expOtherName?: string;
  expOtherAmount?: number;

  // D. अंतिम शेष
  closingBank?: number;
  closingCash?: number;

  // सामग्री की विवरणी
  riceOpeningKg?: number;
  riceReceivedKg?: number;
  riceConsumedKg?: number;
  riceClosingKg?: number;

  // I. अण्डा / मौसमी फल उपयोगिता प्रमाण पत्र
  eggFruitPrevBalance?: number;
  eggFruitReceived?: number;
  eggFruitSpent?: number;
  eggFruitClosingBalance?: number;
  eggFruitBeneficiaryCount?: number;
  eggFruitDaysCount?: number;

  // Officials / Names
  resourcePersonName?: string;
  districtNameText?: string;
}

export interface EggFruitWeekEntry {
  weekNum: number;
  dateStr: string;
  eggCount: number;
  fruitCount: number;
  totalBeneficiaries: number;
  eggCost: number;
  fruitCost: number;
  totalCost: number;
  openingBalance: number;
  receiptAllotment: number;
  totalFunds: number;
  expenditure: number;
  closingBalance: number;
  remarks: string;
}

export interface EggFruitRegisterData {
  districtTitle?: string;
  panchayatName?: string;
  sankulName?: string;
  eggRate?: number;
  fruitRate?: number;
  openingBalanceCashbook?: number;
  weeklyReceipts?: number[];
  manualEntries?: {
    [weekNum: number]: {
      dateStr?: string;
      eggCount?: number;
      fruitCount?: number;
      receiptAllotment?: number;
      remarks?: string;
    };
  };
}

export interface MonthData {
  id: string;
  month: string;
  year: string;
  schoolDetails: SchoolDetails;
  dailyEntries: DailyEntry[];
  customRates?: RateChart;
  prapatra1Data?: Prapatra1FinancialData;
  eggFruitData?: EggFruitRegisterData;
  lastUpdated: string;
}

export interface PrapatraRow {
  sNo: string;
  className: string;
  col3_annualAllotment: number;
  col4_prevLifting: number;
  col5_currentLifting: number;
  col6_totalLifting: number;         // 4 + 5
  col7_prevBalanceRice: number;
  col8_totalAvailableRice: number;   // 5 + 7
  col9_consumedRice: number;
  col10_closingBalanceRice: number;  // 8 - 9
  col11_beneficiaryDays: number;
  col12_pfmsLimitReceived: number | null;
  col13_pfmsBalanceAmount: number | null;
  col14_dalExp: number;
  col15_masalaExp: number;
  col16_sabjiExp: number;
  col17_telExp: number;
  col18_jalawanExp: number;
  col19_totalExp: number;
  col20_schoolWorkingDays: number;
  col21_mdmServingDays: number;
  col22_avgBeneficiaries: number;
  col23_enrollment: number;
  col24_remarks: string;
}

export interface VerificationTest {
  id: string;
  title: string;
  description: string;
  expected: string;
  actual: string;
  passed: boolean;
}
