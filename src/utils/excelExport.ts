import * as XLSX from 'xlsx';
import { MonthData, PrapatraRow } from '../types/mdm';
import { calculatePrapatraRows } from './mdmCalculations';
import { OFFICIAL_DEFAULT_RATES } from './mdmRates';

export function exportToExcel(data: MonthData): void {
  const { schoolDetails, dailyEntries } = data;
  const rates = data.customRates || OFFICIAL_DEFAULT_RATES;
  const calc = calculatePrapatraRows(data, rates);

  const wb = XLSX.utils.book_new();

  // 1. Sheet 1: प्रपत्र-क (24 Columns Official Report)
  const prapatraHeaders = [
    'क्र० सं०',
    'कक्षा (1-8)',
    'वित्तीय वर्ष में खाद्यान्न का आवंटन',
    'गत माह तक उठाव',
    'वर्तमान माह में उठाव',
    'कुल उठाव (4+5=6)',
    'विद्यालय में पूर्व माह तक का अवशेष खाद्यान्न (किग्रा)',
    'विद्यालय में वर्तमान माह में कुल खाद्यान्न (किग्रा) (5+7=8)',
    'विद्यालय द्वारा माह में उपयोग की गई कुल खाद्यान्न (किग्रा)',
    'अवशेष खाद्यान्न (किग्रा) (8-9=10)',
    'लाभान्वित छात्र/छात्राओं की संख्या',
    'विद्यालय को प्राप्त लिमिट राशि',
    'वर्तमान में PFMS में अवशेष राशि',
    'दाल क्रय मद में व्यय की गयी राशि',
    'नमक एवं मसाला मद में व्यय की गयी राशि',
    'सब्जी मद में व्यय की गयी राशि',
    'तेल मद में व्यय की गयी राशि',
    'जलावन अथवा गैस मद में व्यय की गयी राशि',
    'कुल व्यय की गयी राशि',
    'कार्य दिवस',
    'मध्याह्न भोजन कार्य दिवस',
    'औसत लाभान्वित',
    'नामांकन',
    'अभ्युक्ति',
  ];

  const colNumbers = Array.from({ length: 24 }, (_, i) => String(i + 1));

  const mapRowToExcel = (row: PrapatraRow) => [
    row.sNo,
    row.className,
    row.col3_annualAllotment,
    row.col4_prevLifting,
    row.col5_currentLifting,
    row.col6_totalLifting,
    row.col7_prevBalanceRice,
    row.col8_totalAvailableRice,
    row.col9_consumedRice,
    row.col10_closingBalanceRice,
    row.col11_beneficiaryDays,
    row.col12_pfmsLimitReceived != null ? row.col12_pfmsLimitReceived : '',
    row.col13_pfmsBalanceAmount != null ? row.col13_pfmsBalanceAmount : '',
    row.col14_dalExp,
    row.col15_masalaExp,
    row.col16_sabjiExp,
    row.col17_telExp,
    row.col18_jalawanExp,
    row.col19_totalExp,
    row.col20_schoolWorkingDays,
    row.col21_mdmServingDays,
    row.col22_avgBeneficiaries,
    row.col23_enrollment,
    row.col24_remarks,
  ];

  const prapatraData = [
    ['बिहार राज्य प्रधानमंत्री पोषण शक्ति निर्माण योजना, ' + (schoolDetails.districtName || 'पूर्णियाँ')],
    ['विद्यालय द्वारा भरा जाएगा प्रपत्र-क (मध्याह्न भोजन संचालन का विवरण) - परिशिष्ट- 11'],
    [
      `विद्यालय: ${schoolDetails.schoolName}`,
      `प्रखंड: ${schoolDetails.blockName}`,
      `जिला: ${schoolDetails.districtName}`,
      `माह: ${schoolDetails.month}`,
      `वर्ष: ${schoolDetails.year}`,
      `MIS क्रमांक: ${schoolDetails.misCode}`,
      `U-DISE कोड: ${schoolDetails.udiseCode || ''}`,
    ],
    [],
    prapatraHeaders,
    colNumbers,
    mapRowToExcel(calc.row1to5),
    mapRowToExcel(calc.row6to8),
    mapRowToExcel(calc.totalRow),
    [],
    ['नोट:- प्रमाणित किया जाता है कि वित्तीय, विद्यालय में संधारित एवं उपलब्ध पोषाहार पंजी के आधार पर तैयार की गई है जो पूर्णरूपेण सही है।'],
    [`प्रधानाध्यापक: ${schoolDetails.hmName}`, `प्रबंध समिति अध्यक्ष/सचिव: ${schoolDetails.smcSecretaryName}`],
  ];

  const wsPrapatra = XLSX.utils.aoa_to_sheet(prapatraData);
  XLSX.utils.book_append_sheet(wb, wsPrapatra, 'प्रपत्र-क (मासिक प्रतिवेदन)');

  // 2. Sheet 2: दैनिक पंजी (31-day Register)
  const dailyHeaders = [
    'तारीख',
    'दिन',
    'स्थिति',
    'कारण/टिप्पणी',
    'लाभान्वित (1-5)',
    'लाभान्वित (6-8)',
    'कुल लाभान्वित',
    'चावल (किग्रा)',
    'दाल (₹)',
    'मसाला/नमक (₹)',
    'सब्जी (₹)',
    'तेल (₹)',
    'जलावन (₹)',
    'कुल दैनिक व्यय (₹)',
  ];

  const dailyRows = dailyEntries.map((e) => {
    const isServed = e.isMealServed && !e.isHoliday;
    const c1 = isServed ? e.count1to5 : 0;
    const c2 = isServed ? e.count6to8 : 0;
    const riceKg = isServed ? (c1 * rates.class1to5.riceGramPerChild + c2 * rates.class6to8.riceGramPerChild) / 1000 : 0;
    const dalCost = isServed ? c1 * rates.class1to5.dal.costPerChild + c2 * rates.class6to8.dal.costPerChild : 0;
    const masalaCost = isServed ? c1 * rates.class1to5.masala.costPerChild + c2 * rates.class6to8.masala.costPerChild : 0;
    const sabjiCost = isServed ? c1 * rates.class1to5.sabji.costPerChild + c2 * rates.class6to8.sabji.costPerChild : 0;
    const telCost = isServed ? c1 * rates.class1to5.tel.costPerChild + c2 * rates.class6to8.tel.costPerChild : 0;
    const jalawanCost = isServed ? c1 * rates.class1to5.jalawan.costPerChild + c2 * rates.class6to8.jalawan.costPerChild : 0;
    const totalDayCost = isServed ? c1 * rates.class1to5.totalCostPerChild + c2 * rates.class6to8.totalCostPerChild : 0;

    return [
      e.dateStr,
      e.dayOfWeekHindi,
      e.isHoliday ? 'अवकाश' : isServed ? 'भोजन बना' : 'भोजन नहीं बना',
      e.holidayReason || e.remarks || '',
      c1,
      c2,
      c1 + c2,
      Number(riceKg.toFixed(3)),
      Number(dalCost.toFixed(2)),
      Number(masalaCost.toFixed(2)),
      Number(sabjiCost.toFixed(2)),
      Number(telCost.toFixed(2)),
      Number(jalawanCost.toFixed(2)),
      Number(totalDayCost.toFixed(2)),
    ];
  });

  const wsDaily = XLSX.utils.aoa_to_sheet([dailyHeaders, ...dailyRows]);
  XLSX.utils.book_append_sheet(wb, wsDaily, 'दैनिक पंजी (MDM Register)');

  // 3. Sheet 3: दर तालिका (Rate Chart)
  const rateData = [
    ['बिहार सरकार - मध्याह्न भोजन योजना परिवर्तन लागत दरें (01-05-2025 से प्रभावी)'],
    [],
    ['कक्षा 01 से 05 के लिए:'],
    ['सामग्री', 'वजन प्रति छात्र', 'दर प्रति किलो', 'मूल्य प्रति छात्र'],
    ['दाल', '20 Gram', '120.00', '2.40'],
    ['सब्जी', '50 Gram', '35.00', '1.75'],
    ['तेल', '5 Gram', '160.00', '0.80'],
    ['मसाला / नमक', '5 Gram', '126.00', '0.63'],
    ['जलावन', '100 Gram', '12.00', '1.20'],
    ['कुल', '', '', '6.78'],
    [],
    ['कक्षा 06 से 08 के लिए:'],
    ['सामग्री', 'वजन प्रति छात्र', 'दर प्रति किलो', 'मूल्य प्रति छात्र'],
    ['दाल', '30 Gram', '120.00', '3.60'],
    ['सब्जी', '75 Gram', '35.00', '2.62'],
    ['तेल', '7.5 Gram', '160.00', '1.20'],
    ['मसाला / नमक', '7.5 Gram', '126.00', '0.95'],
    ['जलावन', '150 Gram', '12.00', '1.80'],
    ['कुल', '', '', '10.17'],
  ];
  const wsRate = XLSX.utils.aoa_to_sheet(rateData);
  XLSX.utils.book_append_sheet(wb, wsRate, 'दर तालिका (MDM Rate Chart)');

  const fileName = `Bihar_MDM_Report_${schoolDetails.month}_${schoolDetails.year}_${schoolDetails.schoolName.replace(/\s+/g, '_')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
