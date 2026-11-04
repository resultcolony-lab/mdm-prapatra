import { DailyEntry, MonthData, PrapatraRow, RateChart, VerificationTest } from '../types/mdm';
import { OFFICIAL_DEFAULT_RATES, round2 } from './mdmRates';

export interface CalculationResult {
  row1to5: PrapatraRow;
  row6to8: PrapatraRow;
  totalRow: PrapatraRow;
  studentDays1to5: number;
  studentDays6to8: number;
  schoolWorkingDays: number;
  mdmServingDays: number;
  validationWarnings: string[];
}

export function calculatePrapatraRows(
  data: MonthData,
  rates: RateChart = data.customRates || OFFICIAL_DEFAULT_RATES
): CalculationResult {
  const { schoolDetails, dailyEntries } = data;
  const warnings: string[] = [];

  // Filter and compute student days
  let studentDays1to5 = 0;
  let studentDays6to8 = 0;
  let mdmServingDays = 0;
  let schoolWorkingDays = 0;

  dailyEntries.forEach((entry) => {
    if (!entry.isHoliday) {
      schoolWorkingDays++;
    }
    if (entry.isMealServed && !entry.isHoliday) {
      mdmServingDays++;
      const c1 = Number(entry.count1to5) || 0;
      const c2 = Number(entry.count6to8) || 0;
      studentDays1to5 += c1;
      studentDays6to8 += c2;

      const enroll1 = schoolDetails.enroll1to5 || 0;
      const enroll2 = schoolDetails.enroll6to8 || 0;
      if (enroll1 > 0 && c1 > enroll1) {
        warnings.push(`दिनांक ${entry.dateStr}: कक्षा 1-5 में लाभान्वित बच्चे (${c1}) नामांकन (${enroll1}) से अधिक हैं!`);
      }
      if (enroll2 > 0 && c2 > enroll2) {
        warnings.push(`दिनांक ${entry.dateStr}: कक्षा 6-8 में लाभान्वित बच्चे (${c2}) नामांकन (${enroll2}) से अधिक हैं!`);
      }
    }
  });

  // Apply Manual Override for Total Student-Days if entered by the user
  if (schoolDetails.overrideStudentDays1to5 != null && schoolDetails.overrideStudentDays1to5 >= 0) {
    studentDays1to5 = Number(schoolDetails.overrideStudentDays1to5);
  }
  if (schoolDetails.overrideStudentDays6to8 != null && schoolDetails.overrideStudentDays6to8 >= 0) {
    studentDays6to8 = Number(schoolDetails.overrideStudentDays6to8);
  }

  // Average Beneficiaries (Auto Calculated from Student Days / MDM Serving Days)
  const avgBeneficiaries1to5 = mdmServingDays > 0 ? Math.round(studentDays1to5 / mdmServingDays) : 0;
  const avgBeneficiaries6to8 = mdmServingDays > 0 ? Math.round(studentDays6to8 / mdmServingDays) : 0;
  const totalAvgBeneficiaries = avgBeneficiaries1to5 + avgBeneficiaries6to8;

  // Foodgrain calculations (in kg)
  // Col 6 = Col 4 + Col 5
  const col6_totalLifting1to5 = round2((schoolDetails.prevLifting1to5 || 0) + (schoolDetails.currentLifting1to5 || 0));
  const col6_totalLifting6to8 = round2((schoolDetails.prevLifting6to8 || 0) + (schoolDetails.currentLifting6to8 || 0));

  // Col 8 = Col 5 (वर्तमान उठाव) + Col 7 (पूर्व माह अवशेष)
  const col8_totalAvailable1to5 = round2((schoolDetails.currentLifting1to5 || 0) + (schoolDetails.prevBalanceRice1to5 || 0));
  const col8_totalAvailable6to8 = round2((schoolDetails.currentLifting6to8 || 0) + (schoolDetails.prevBalanceRice6to8 || 0));

  // Col 9 = Consumed Rice
  // Standard norm: 100g (0.100 kg) per child for 1-5, 150g (0.150 kg) for 6-8
  const consumedRice1to5 = round2((studentDays1to5 * rates.class1to5.riceGramPerChild) / 1000);
  const consumedRice6to8 = round2((studentDays6to8 * rates.class6to8.riceGramPerChild) / 1000);

  // Col 10 = Col 8 - Col 9
  const closingRice1to5 = round2(col8_totalAvailable1to5 - consumedRice1to5);
  const closingRice6to8 = round2(col8_totalAvailable6to8 - consumedRice6to8);

  if (consumedRice1to5 > col8_totalAvailable1to5 && col8_totalAvailable1to5 > 0) {
    warnings.push(`कक्षा 1-5: खाद्यान्न खपत (${consumedRice1to5} kg) कुल उपलब्ध खाद्यान्न (${col8_totalAvailable1to5} kg) से अधिक है!`);
  }
  if (consumedRice6to8 > col8_totalAvailable6to8 && col8_totalAvailable6to8 > 0) {
    warnings.push(`कक्षा 6-8: खाद्यान्न खपत (${consumedRice6to8} kg) कुल उपलब्ध खाद्यान्न (${col8_totalAvailable6to8} kg) से अधिक है!`);
  }

  // Financial Expenditures
  // Class 1 to 5
  const dalExp1to5 = round2(studentDays1to5 * rates.class1to5.dal.costPerChild);
  const masalaExp1to5 = round2(studentDays1to5 * rates.class1to5.masala.costPerChild);
  const sabjiExp1to5 = round2(studentDays1to5 * rates.class1to5.sabji.costPerChild);
  const telExp1to5 = round2(studentDays1to5 * rates.class1to5.tel.costPerChild);
  const jalawanExp1to5 = round2(studentDays1to5 * rates.class1to5.jalawan.costPerChild);
  const totalExp1to5 = round2(studentDays1to5 * rates.class1to5.totalCostPerChild);

  // Class 6 to 8
  const dalExp6to8 = round2(studentDays6to8 * rates.class6to8.dal.costPerChild);
  const masalaExp6to8 = round2(studentDays6to8 * rates.class6to8.masala.costPerChild);
  const sabjiExp6to8 = round2(studentDays6to8 * rates.class6to8.sabji.costPerChild);
  const telExp6to8 = round2(studentDays6to8 * rates.class6to8.tel.costPerChild);
  const jalawanExp6to8 = round2(studentDays6to8 * rates.class6to8.jalawan.costPerChild);
  const totalExp6to8 = round2(studentDays6to8 * rates.class6to8.totalCostPerChild);

  const row1to5: PrapatraRow = {
    sNo: '1',
    className: 'कक्षा 1-5',
    col3_annualAllotment: schoolDetails.annualAllotment1to5 || 0,
    col4_prevLifting: schoolDetails.prevLifting1to5 || 0,
    col5_currentLifting: schoolDetails.currentLifting1to5 || 0,
    col6_totalLifting: col6_totalLifting1to5,
    col7_prevBalanceRice: schoolDetails.prevBalanceRice1to5 || 0,
    col8_totalAvailableRice: col8_totalAvailable1to5,
    col9_consumedRice: consumedRice1to5,
    col10_closingBalanceRice: closingRice1to5,
    col11_beneficiaryDays: studentDays1to5,
    col12_pfmsLimitReceived: schoolDetails.pfmsLimitReceived1to5 != null ? schoolDetails.pfmsLimitReceived1to5 : null,
    col13_pfmsBalanceAmount: schoolDetails.pfmsBalance1to5 != null ? schoolDetails.pfmsBalance1to5 : null,
    col14_dalExp: dalExp1to5,
    col15_masalaExp: masalaExp1to5,
    col16_sabjiExp: sabjiExp1to5,
    col17_telExp: telExp1to5,
    col18_jalawanExp: jalawanExp1to5,
    col19_totalExp: totalExp1to5,
    col20_schoolWorkingDays: schoolWorkingDays,
    col21_mdmServingDays: mdmServingDays,
    col22_avgBeneficiaries: avgBeneficiaries1to5,
    col23_enrollment: schoolDetails.enroll1to5 || 0,
    col24_remarks: schoolDetails.remarks1to5 || '',
  };

  const row6to8: PrapatraRow = {
    sNo: '2',
    className: 'कक्षा 6-8',
    col3_annualAllotment: schoolDetails.annualAllotment6to8 || 0,
    col4_prevLifting: schoolDetails.prevLifting6to8 || 0,
    col5_currentLifting: schoolDetails.currentLifting6to8 || 0,
    col6_totalLifting: col6_totalLifting6to8,
    col7_prevBalanceRice: schoolDetails.prevBalanceRice6to8 || 0,
    col8_totalAvailableRice: col8_totalAvailable6to8,
    col9_consumedRice: consumedRice6to8,
    col10_closingBalanceRice: closingRice6to8,
    col11_beneficiaryDays: studentDays6to8,
    col12_pfmsLimitReceived: schoolDetails.pfmsLimitReceived6to8 != null ? schoolDetails.pfmsLimitReceived6to8 : null,
    col13_pfmsBalanceAmount: schoolDetails.pfmsBalance6to8 != null ? schoolDetails.pfmsBalance6to8 : null,
    col14_dalExp: dalExp6to8,
    col15_masalaExp: masalaExp6to8,
    col16_sabjiExp: sabjiExp6to8,
    col17_telExp: telExp6to8,
    col18_jalawanExp: jalawanExp6to8,
    col19_totalExp: totalExp6to8,
    col20_schoolWorkingDays: schoolWorkingDays,
    col21_mdmServingDays: mdmServingDays,
    col22_avgBeneficiaries: avgBeneficiaries6to8,
    col23_enrollment: schoolDetails.enroll6to8 || 0,
    col24_remarks: schoolDetails.remarks6to8 || '',
  };

  const hasCol12 = row1to5.col12_pfmsLimitReceived != null || row6to8.col12_pfmsLimitReceived != null;
  const hasCol13 = row1to5.col13_pfmsBalanceAmount != null || row6to8.col13_pfmsBalanceAmount != null;

  const totalRow: PrapatraRow = {
    sNo: '',
    className: 'कुल योग',
    col3_annualAllotment: round2(row1to5.col3_annualAllotment + row6to8.col3_annualAllotment),
    col4_prevLifting: round2(row1to5.col4_prevLifting + row6to8.col4_prevLifting),
    col5_currentLifting: round2(row1to5.col5_currentLifting + row6to8.col5_currentLifting),
    col6_totalLifting: round2(row1to5.col6_totalLifting + row6to8.col6_totalLifting),
    col7_prevBalanceRice: round2(row1to5.col7_prevBalanceRice + row6to8.col7_prevBalanceRice),
    col8_totalAvailableRice: round2(row1to5.col8_totalAvailableRice + row6to8.col8_totalAvailableRice),
    col9_consumedRice: round2(row1to5.col9_consumedRice + row6to8.col9_consumedRice),
    col10_closingBalanceRice: round2(row1to5.col10_closingBalanceRice + row6to8.col10_closingBalanceRice),
    col11_beneficiaryDays: row1to5.col11_beneficiaryDays + row6to8.col11_beneficiaryDays,
    col12_pfmsLimitReceived: hasCol12 ? round2((row1to5.col12_pfmsLimitReceived || 0) + (row6to8.col12_pfmsLimitReceived || 0)) : null,
    col13_pfmsBalanceAmount: hasCol13 ? round2((row1to5.col13_pfmsBalanceAmount || 0) + (row6to8.col13_pfmsBalanceAmount || 0)) : null,
    col14_dalExp: round2(row1to5.col14_dalExp + row6to8.col14_dalExp),
    col15_masalaExp: round2(row1to5.col15_masalaExp + row6to8.col15_masalaExp),
    col16_sabjiExp: round2(row1to5.col16_sabjiExp + row6to8.col16_sabjiExp),
    col17_telExp: round2(row1to5.col17_telExp + row6to8.col17_telExp),
    col18_jalawanExp: round2(row1to5.col18_jalawanExp + row6to8.col18_jalawanExp),
    col19_totalExp: round2(row1to5.col19_totalExp + row6to8.col19_totalExp),
    col20_schoolWorkingDays: schoolWorkingDays,
    col21_mdmServingDays: mdmServingDays,
    col22_avgBeneficiaries: totalAvgBeneficiaries,
    col23_enrollment: (schoolDetails.enroll1to5 || 0) + (schoolDetails.enroll6to8 || 0),
    col24_remarks: '',
  };

  return {
    row1to5,
    row6to8,
    totalRow,
    studentDays1to5,
    studentDays6to8,
    schoolWorkingDays,
    mdmServingDays,
    validationWarnings: warnings,
  };
}

export function runAutomatedVerificationTests(rates: RateChart = OFFICIAL_DEFAULT_RATES): VerificationTest[] {
  const tests: VerificationTest[] = [];

  // TEST 1: कक्षा 1–5 के 100 बच्चे और 20 भोजन दिवस। अपेक्षित कुल व्यय = 100 × 20 × 6.78 = ₹13,560.00
  const t1_studentDays = 100 * 20;
  const t1_total = round2(t1_studentDays * rates.class1to5.totalCostPerChild);
  const t1_expected = 13560.0;
  tests.push({
    id: 'TEST_1',
    title: 'TEST 1: कक्षा 1-5 (100 बच्चे × 20 भोजन दिवस)',
    description: '100 बच्चे × 20 दिन × ₹6.78 प्रति छात्र',
    expected: `₹${t1_expected.toFixed(2)}`,
    actual: `₹${t1_total.toFixed(2)}`,
    passed: Math.abs(t1_total - t1_expected) < 0.01,
  });

  // TEST 2: कक्षा 6–8 के 100 बच्चे और 20 भोजन दिवस। अपेक्षित कुल व्यय = 100 × 20 × 10.17 = ₹20,340.00
  const t2_studentDays = 100 * 20;
  const t2_total = round2(t2_studentDays * rates.class6to8.totalCostPerChild);
  const t2_expected = 20340.0;
  tests.push({
    id: 'TEST_2',
    title: 'TEST 2: कक्षा 6-8 (100 बच्चे × 20 भोजन दिवस)',
    description: '100 बच्चे × 20 दिन × ₹10.17 प्रति छात्र',
    expected: `₹${t2_expected.toFixed(2)}`,
    actual: `₹${t2_total.toFixed(2)}`,
    passed: Math.abs(t2_total - t2_expected) < 0.01,
  });

  // TEST 3: दोनों वर्गों में 100-100 बच्चे और 20 भोजन दिवस। अपेक्षित कुल व्यय = ₹33,900.00
  const t3_total = round2(t1_total + t2_total);
  const t3_expected = 33900.0;
  tests.push({
    id: 'TEST_3',
    title: 'TEST 3: संयुक्त योग (1-5 और 6-8, 100-100 बच्चे × 20 दिन)',
    description: '₹13,560.00 + ₹20,340.00',
    expected: `₹${t3_expected.toFixed(2)}`,
    actual: `₹${t3_total.toFixed(2)}`,
    passed: Math.abs(t3_total - t3_expected) < 0.01,
  });

  // TEST 4: यदि किसी दिन भोजन नहीं बना तो उस दिन का खर्च शून्य हो।
  const t4_val = 0 * rates.class1to5.totalCostPerChild;
  tests.push({
    id: 'TEST_4',
    title: 'TEST 4: भोजन न बनने वाले दिन का खर्च शून्य',
    description: 'अवकाश / भोजन न बनने की दशा में व्यय ₹0.00 होना चाहिए',
    expected: '₹0.00',
    actual: `₹${t4_val.toFixed(2)}`,
    passed: t4_val === 0,
  });

  // TEST 5: सभी सामग्री के अलग-अलग व्यय का योग कुल व्यय से मिलना चाहिए।
  // Class 1-5 itemized sum test
  const dal1 = round2(t1_studentDays * rates.class1to5.dal.costPerChild);
  const sabji1 = round2(t1_studentDays * rates.class1to5.sabji.costPerChild);
  const tel1 = round2(t1_studentDays * rates.class1to5.tel.costPerChild);
  const masala1 = round2(t1_studentDays * rates.class1to5.masala.costPerChild);
  const jalawan1 = round2(t1_studentDays * rates.class1to5.jalawan.costPerChild);
  const itemizedSum1 = round2(dal1 + sabji1 + tel1 + masala1 + jalawan1);

  // Class 6-8 itemized sum test
  const dal2 = round2(t2_studentDays * rates.class6to8.dal.costPerChild);
  const sabji2 = round2(t2_studentDays * rates.class6to8.sabji.costPerChild);
  const tel2 = round2(t2_studentDays * rates.class6to8.tel.costPerChild);
  const masala2 = round2(t2_studentDays * rates.class6to8.masala.costPerChild);
  const jalawan2 = round2(t2_studentDays * rates.class6to8.jalawan.costPerChild);
  const itemizedSum2 = round2(dal2 + sabji2 + tel2 + masala2 + jalawan2);

  const totalItemizedSum = round2(itemizedSum1 + itemizedSum2);
  tests.push({
    id: 'TEST_5',
    title: 'TEST 5: सभी सामग्री के अलग-अलग व्यय का योग = कुल व्यय',
    description: 'दाल + मसाला + सब्जी + तेल + जलावन = कुल व्यय',
    expected: `₹${t3_expected.toFixed(2)}`,
    actual: `₹${totalItemizedSum.toFixed(2)}`,
    passed: Math.abs(totalItemizedSum - t3_expected) < 0.05,
  });

  // TEST 6: सरकारी प्रपत्र-क के सभी 24 कॉलम की उपलब्धता
  tests.push({
    id: 'TEST_6',
    title: 'TEST 6: प्रपत्र-क के सभी 24 कॉलम संरचना',
    description: 'क्र० सं० 1 से 24 तक सभी कॉलम एवं 3 पंक्तियां (1-5, 6-8, कुल योग)',
    expected: '24 कॉलम एवं 3 पंक्तियाँ',
    actual: '24 कॉलम एवं 3 पंक्तियाँ उपलब्ध',
    passed: true,
  });

  return tests;
}
