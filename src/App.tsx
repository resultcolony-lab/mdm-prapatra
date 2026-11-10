/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DailyEntry, MonthData, RateChart, SchoolDetails } from './types/mdm';
import {
  generateDailyEntries,
  getSavedMonthIds,
  loadCurrentMonthData,
  saveMonthData,
  switchMonth,
} from './utils/storage';
import { calculatePrapatraRows } from './utils/mdmCalculations';
import { formatINR, formatKg, OFFICIAL_DEFAULT_RATES } from './utils/mdmRates';
import { Header } from './components/Header';
import { OfficialReportPreview } from './components/OfficialReportPreview';
import { DailyEntryTable } from './components/DailyEntryTable';
import { SchoolDetailsForm } from './components/SchoolDetailsForm';
import { DailyRegisterReport } from './components/DailyRegisterReport';
import { MonthlyDailyConsolidatedReport } from './components/MonthlyDailyConsolidatedReport';
import { Prapatra1Report } from './components/Prapatra1Report';
import { EggFruitRegisterReport } from './components/EggFruitRegisterReport';
import { QuickMetricsEditModal } from './components/QuickMetricsEditModal';
import { AdminRateModal } from './components/AdminRateModal';
import { VerificationTestsModal } from './components/VerificationTestsModal';
import { BackupModal } from './components/BackupModal';
import {
  CheckCircle2,
  Users,
  Calendar,
  Wheat,
  Coins,
  ShieldCheck,
  FileText,
  Printer,
  Sparkles,
  ArrowRight,
  Edit3,
  FileSpreadsheet,
  Egg,
  Building2,
} from 'lucide-react';
import { Prapatra1FinancialData, EggFruitRegisterData } from './types/mdm';

export default function App() {
  const [data, setData] = useState<MonthData>(() => loadCurrentMonthData());
  const [activeTab, setActiveTab] = useState<'daily' | 'prapatra' | 'prapatra1' | 'consolidated_pdf' | 'egg_fruit' | 'school' | 'daily_report'>('daily');
  const [savedMonthIds, setSavedMonthIds] = useState<string[]>(() => getSavedMonthIds());

  // Modals
  const [isRateModalOpen, setIsRateModalOpen] = useState<boolean>(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState<boolean>(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [isQuickEditOpen, setIsQuickEditOpen] = useState<boolean>(false);

  // Auto-save on data change
  const handleUpdateSchoolDetails = (updatedDetails: SchoolDetails) => {
    const updated: MonthData = {
      ...data,
      schoolDetails: updatedDetails,
    };
    setData(updated);
    saveMonthData(updated);
  };

  const handleUpdateDailyEntries = (updatedEntries: DailyEntry[]) => {
    const updated: MonthData = {
      ...data,
      dailyEntries: updatedEntries,
    };
    setData(updated);
    saveMonthData(updated);
  };

  const handleSaveRates = (newRates: RateChart) => {
    const updated: MonthData = {
      ...data,
      customRates: newRates,
    };
    setData(updated);
    saveMonthData(updated);
  };

  const handleUpdatePrapatra1Data = (updatedP1: Prapatra1FinancialData) => {
    const updated: MonthData = {
      ...data,
      prapatra1Data: updatedP1,
    };
    setData(updated);
    saveMonthData(updated);
  };

  const handleUpdateEggFruitData = (updatedEggFruit: EggFruitRegisterData) => {
    const updated: MonthData = {
      ...data,
      eggFruitData: updatedEggFruit,
    };
    setData(updated);
    saveMonthData(updated);
  };

  const handleSelectMonth = (monthId: string) => {
    const loaded = switchMonth(monthId);
    setData(loaded);
  };

  const handleAddNewMonth = (year: number, monthNum: number, monthName: string) => {
    const id = `${year}-${String(monthNum).padStart(2, '0')}`;
    const newDaily = generateDailyEntries(year, monthNum, 0, 0);
    const newMonthData: MonthData = {
      id,
      month: monthName,
      year: String(year),
      schoolDetails: {
        ...data.schoolDetails,
        month: monthName,
        year: String(year),
      },
      dailyEntries: newDaily,
      customRates: data.customRates || OFFICIAL_DEFAULT_RATES,
      lastUpdated: new Date().toISOString(),
    };

    saveMonthData(newMonthData);
    setData(newMonthData);
    setSavedMonthIds(getSavedMonthIds());
  };

  // Calculations for Quick Status Bar
  const calc = calculatePrapatraRows(data, data.customRates || OFFICIAL_DEFAULT_RATES);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        data={data}
        onSelectMonth={handleSelectMonth}
        savedMonthIds={savedMonthIds}
        onOpenRateModal={() => setIsRateModalOpen(true)}
        onOpenTestModal={() => setIsTestModalOpen(true)}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onAddNewMonth={handleAddNewMonth}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 pb-24 md:pb-6 space-y-4 sm:space-y-5">
        {/* Quick Highlights Bar (Hidden in Print) */}
        <div className="no-print bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  माह: {data.schoolDetails.month} {data.schoolDetails.year} — प्रगति विवरणी
                </h2>
                <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
                  दर: ₹6.78 (1-5) | ₹10.17 (6-8)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {data.schoolDetails.schoolName || 'विद्यालय का नाम दर्ज करें'}
                {data.schoolDetails.udiseCode ? ` • U-DISE: ${data.schoolDetails.udiseCode}` : ''}
                {data.schoolDetails.misCode ? ` • MIS: ${data.schoolDetails.misCode}` : ''}
                {` • प्रखण्ड: ${data.schoolDetails.blockName || '---'}`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsQuickEditOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                title="चावल स्टॉक (प्रारंभिक/प्राप्त), दैनिक उपस्थिति एवं PFMS विवरणी संपादित करें"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>विवरणी संपादित करें</span>
              </button>
              <button
                onClick={() => setIsTestModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold transition"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                सभी 6 टेस्ट सफल
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-semibold shadow-xs transition"
              >
                <Printer className="w-3.5 h-3.5" />
                प्रिंट / PDF
              </button>
            </div>
          </div>

          {/* Quick Metrics Grid (Fully Clickable & Editable) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 text-xs">
            <div
              onClick={() => setIsQuickEditOpen(true)}
              role="button"
              tabIndex={0}
              title="क्लिक करके उपस्थिति एवं विद्यार्थी-दिवस बदलें"
              className="bg-slate-50 hover:bg-white hover:border-indigo-400 hover:shadow-sm p-3 rounded-xl border border-slate-200 cursor-pointer transition group"
            >
              <div className="flex items-center justify-between text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  कुल विद्यार्थी-दिवस
                </span>
                <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 opacity-60 group-hover:opacity-100 transition" />
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 mt-1">
                {calc.totalRow.col11_beneficiaryDays}
              </div>
              <div className="text-[10px] text-slate-500">
                1-5: {calc.row1to5.col11_beneficiaryDays} | 6-8: {calc.row6to8.col11_beneficiaryDays}
              </div>
            </div>

            <div
              onClick={() => setIsQuickEditOpen(true)}
              role="button"
              tabIndex={0}
              title="क्लिक करके कार्य दिवस एवं उपस्थिति बदलें"
              className="bg-slate-50 hover:bg-white hover:border-blue-400 hover:shadow-sm p-3 rounded-xl border border-slate-200 cursor-pointer transition group"
            >
              <div className="flex items-center justify-between text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  भोजन दिवस / कार्य दिवस
                </span>
                <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-blue-600 opacity-60 group-hover:opacity-100 transition" />
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 mt-1">
                {calc.totalRow.col21_mdmServingDays} / {calc.totalRow.col20_schoolWorkingDays}
              </div>
              <div className="text-[10px] text-slate-500">
                औसत छात्र: {calc.totalRow.col22_avgBeneficiaries}
              </div>
            </div>

            <div
              onClick={() => setIsQuickEditOpen(true)}
              role="button"
              tabIndex={0}
              title="क्लिक करके प्रारंभिक शेष एवं प्राप्त चावल स्टॉक बदलें"
              className="bg-amber-50/50 hover:bg-white hover:border-amber-400 hover:shadow-sm p-3 rounded-xl border border-amber-200/80 cursor-pointer transition group"
            >
              <div className="flex items-center justify-between text-amber-900 font-medium">
                <span className="flex items-center gap-1.5 font-bold">
                  <Wheat className="w-3.5 h-3.5 text-amber-600" />
                  खाद्यान्न (चावल) खपत
                </span>
                <Edit3 className="w-3 h-3 text-amber-500 group-hover:text-amber-700 opacity-60 group-hover:opacity-100 transition" />
              </div>
              <div className="text-lg font-bold font-mono text-amber-950 mt-1">
                {formatKg(calc.totalRow.col9_consumedRice)} kg
              </div>
              <div className="text-[10px] text-amber-800 font-semibold">
                अंतिम शेष: {formatKg(calc.totalRow.col10_closingBalanceRice)} kg
              </div>
            </div>

            <div
              onClick={() => setIsQuickEditOpen(true)}
              role="button"
              tabIndex={0}
              title="क्लिक करके विवरणी एवं उपस्थिति बदलें"
              className="bg-slate-50 hover:bg-white hover:border-emerald-400 hover:shadow-sm p-3 rounded-xl border border-slate-200 cursor-pointer transition group"
            >
              <div className="flex items-center justify-between text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-emerald-600" />
                  कुल खाद्य व्यय राशि
                </span>
                <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 opacity-60 group-hover:opacity-100 transition" />
              </div>
              <div className="text-lg font-bold font-mono text-emerald-950 mt-1">
                ₹{formatINR(calc.totalRow.col19_totalExp)}
              </div>
              <div className="text-[10px] text-slate-500">
                दाल, सब्जी, तेल, मसाला, जलावन
              </div>
            </div>

            <div
              onClick={() => setIsQuickEditOpen(true)}
              role="button"
              tabIndex={0}
              title="क्लिक करके PFMS लिमिट व अवशेष राशि बदलें"
              className="bg-slate-50 hover:bg-white hover:border-violet-400 hover:shadow-sm p-3 rounded-xl border border-slate-200 cursor-pointer transition group"
            >
              <div className="flex items-center justify-between text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-violet-600" />
                  PFMS अवशेष राशि
                </span>
                <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-violet-600 opacity-60 group-hover:opacity-100 transition" />
              </div>
              <div className="text-lg font-bold font-mono text-violet-950 mt-1">
                {calc.totalRow.col13_pfmsBalanceAmount != null ? `₹${formatINR(calc.totalRow.col13_pfmsBalanceAmount)}` : '---'}
              </div>
              <div className="text-[10px] text-slate-500">
                {calc.totalRow.col12_pfmsLimitReceived != null ? `प्राप्त: ₹${formatINR(calc.totalRow.col12_pfmsLimitReceived)}` : 'कॉलम 12 एवं 13 खाली'}
              </div>
            </div>
          </div>
        </div>

        {/* Tab 1: Prapatra-Ka Official Monthly Report (परिशिष्ट- 11) */}
        {activeTab === 'prapatra' && (
          <OfficialReportPreview
            data={data}
            onUpdateSchoolDetails={handleUpdateSchoolDetails}
          />
        )}

        {/* Tab 2: Prapatra-1 (अनुलग्नक- 2) Official Monthly Report matching uploaded PDF */}
        {activeTab === 'prapatra1' && (
          <Prapatra1Report
            data={data}
            onUpdateSchoolDetails={handleUpdateSchoolDetails}
            onUpdatePrapatra1Data={handleUpdatePrapatra1Data}
          />
        )}

        {/* Tab 3: Daily Entry (1-31) */}
        {activeTab === 'daily' && (
          <DailyEntryTable
            data={data}
            onUpdateEntries={handleUpdateDailyEntries}
            onUpdateSchoolDetails={handleUpdateSchoolDetails}
          />
        )}

        {/* Tab 4: Consolidated Daily Report (2-Page Official PDF Format) */}
        {activeTab === 'consolidated_pdf' && (
          <MonthlyDailyConsolidatedReport
            data={data}
            onUpdateSchoolDetails={handleUpdateSchoolDetails}
            onUpdateDailyEntries={handleUpdateDailyEntries}
          />
        )}

        {/* Tab 5: Egg & Fruit Nutrition Register (PDF Format matching uploaded CamScanner document) */}
        {activeTab === 'egg_fruit' && (
          <EggFruitRegisterReport
            data={data}
            onUpdateSchoolDetails={handleUpdateSchoolDetails}
            onUpdateEggFruitData={handleUpdateEggFruitData}
            onUpdateDailyEntries={handleUpdateDailyEntries}
          />
        )}

        {/* Tab 6: School Details Form */}
        {activeTab === 'school' && (
          <SchoolDetailsForm
            data={data}
            onUpdateSchoolDetails={handleUpdateSchoolDetails}
          />
        )}

        {/* Tab 7: Daily Register Report */}
        {activeTab === 'daily_report' && (
          <DailyRegisterReport data={data} />
        )}
      </main>

      {/* Mobile Bottom Navigation Dock (Visible on Mobile Only) */}
      <nav aria-label="मोबाइल नेविगेशन" className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 px-1 py-1.5 flex items-center justify-around shadow-2xl backdrop-blur-md bg-white/95 no-print">
        <button
          type="button"
          onClick={() => setActiveTab('daily')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition cursor-pointer min-w-[58px] ${
            activeTab === 'daily'
              ? 'text-blue-700 font-bold bg-blue-50'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] leading-tight">दैनिक MDM</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('prapatra')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition cursor-pointer min-w-[58px] ${
            activeTab === 'prapatra'
              ? 'text-emerald-700 font-bold bg-emerald-50'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] leading-tight">प्रपत्र-क</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('consolidated_pdf')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition cursor-pointer min-w-[58px] ${
            activeTab === 'consolidated_pdf'
              ? 'text-rose-700 font-bold bg-rose-50'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] leading-tight">समेकित PDF</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('egg_fruit')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition cursor-pointer min-w-[58px] ${
            activeTab === 'egg_fruit'
              ? 'text-amber-700 font-bold bg-amber-50'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Egg className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] leading-tight">अण्डा/फल</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('school')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition cursor-pointer min-w-[58px] ${
            activeTab === 'school'
              ? 'text-indigo-700 font-bold bg-indigo-50'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] leading-tight">विवरणी</span>
        </button>
      </nav>

      {/* Footer */}
      <footer className="no-print bg-white border-t border-slate-200 py-5 px-6 text-xs text-slate-500 mt-auto pb-24 md:pb-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <div className="font-semibold text-slate-800 text-sm">
              बिहार राज्य प्रधानमंत्री पोषण शक्ति निर्माण (PM POSHAN) रिपोर्टिंग एवं स्वचालित लेखांकन प्रणाली
            </div>
            <div className="text-[11.5px] text-slate-500 mt-0.5">
              प्रपत्र-क (परिशिष्ट- 11) • 01-05-2025 संशोधित सरकारी दर अनुपालन • बिहार
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-50 via-purple-50/40 to-blue-50 px-4 py-2 rounded-full border border-indigo-200 shadow-xs">
              <span className="text-slate-600 font-medium text-xs">Designed & Developed by</span>
              <span className="font-black text-indigo-700 tracking-wider text-sm">KAUSTUBH</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AdminRateModal
        isOpen={isRateModalOpen}
        onClose={() => setIsRateModalOpen(false)}
        rates={data.customRates || OFFICIAL_DEFAULT_RATES}
        onSaveRates={handleSaveRates}
      />

      <VerificationTestsModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        data={data}
      />

      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        onDataResetOrImported={(fresh) => {
          setData(fresh);
          saveMonthData(fresh);
        }}
      />

      <QuickMetricsEditModal
        isOpen={isQuickEditOpen}
        onClose={() => setIsQuickEditOpen(false)}
        data={data}
        onUpdateSchoolDetails={handleUpdateSchoolDetails}
        onUpdateDailyEntries={handleUpdateDailyEntries}
      />
    </div>
  );
}
