import React, { useState } from 'react';
import { MonthData } from '../types/mdm';
import {
  FileText,
  Calendar,
  Building2,
  BookOpen,
  ShieldCheck,
  Coins,
  Database,
  PlusCircle,
  School,
  ChevronDown,
  Printer,
  FileSpreadsheet,
  Egg,
  Menu,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';

interface Props {
  activeTab: 'prapatra' | 'prapatra1' | 'daily' | 'consolidated_pdf' | 'egg_fruit' | 'school' | 'daily_report';
  setActiveTab: (tab: 'prapatra' | 'prapatra1' | 'daily' | 'consolidated_pdf' | 'egg_fruit' | 'school' | 'daily_report') => void;
  data: MonthData;
  onSelectMonth: (monthId: string) => void;
  savedMonthIds: string[];
  onOpenRateModal: () => void;
  onOpenTestModal: () => void;
  onOpenBackupModal: () => void;
  onAddNewMonth: (year: number, monthNum: number, monthName: string) => void;
}

const MONTH_NAMES = [
  'जनवरी',
  'फ़रवरी',
  'मार्च',
  'अप्रैल',
  'मई',
  'जून',
  'जुलाई',
  'अगस्त',
  'सितंबर',
  'अक्टूबर',
  'नवंबर',
  'दिसंबर',
];

export const TABS_LIST = [
  { id: 'daily', name: '1. दैनिक MDM प्रविष्टि (1-31)', short: 'दैनिक प्रविष्टि', icon: Calendar, color: 'text-blue-600' },
  { id: 'prapatra', name: '2. प्रपत्र-क (मासिक प्रतिवेदन)', short: 'प्रपत्र-क', icon: FileText, color: 'text-emerald-600' },
  { id: 'prapatra1', name: '3. प्रपत्र-1 (अनुलग्नक-2 PDF)', short: 'प्रपत्र-1 PDF', icon: FileSpreadsheet, color: 'text-amber-600' },
  { id: 'consolidated_pdf', name: '4. समेकित प्रतिदिन रिपोर्ट (PDF)', short: 'समेकित PDF', icon: FileSpreadsheet, color: 'text-rose-600' },
  { id: 'egg_fruit', name: '5. अण्डा/फल पोषाहार पंजी (PDF)', short: 'अण्डा/फल', icon: Egg, color: 'text-amber-600' },
  { id: 'school', name: '6. विद्यालय विवरणी एवं स्टॉक', short: 'विद्यालय स्टॉक', icon: Building2, color: 'text-indigo-600' },
  { id: 'daily_report', name: '7. दैनिक पोषाहार पंजी', short: 'दैनिक पंजी', icon: BookOpen, color: 'text-amber-600' },
] as const;

export const Header: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  data,
  onSelectMonth,
  savedMonthIds,
  onOpenRateModal,
  onOpenTestModal,
  onOpenBackupModal,
  onAddNewMonth,
}) => {
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showNewMonthModal, setShowNewMonthModal] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [newMonthNum, setNewMonthNum] = useState<number>(6); // June
  const [newYear, setNewYear] = useState<number>(2025);

  const handleCreateMonth = () => {
    onAddNewMonth(newYear, newMonthNum, MONTH_NAMES[newMonthNum - 1]);
    setShowNewMonthModal(false);
  };

  return (
    <header className="bg-white border-b border-slate-200 shadow-xs sticky top-0 z-40 no-print">
      {/* Top Banner with Bihar Government & PM POSHAN Identity */}
      <div className="bg-gradient-to-r from-amber-700 via-emerald-800 to-indigo-900 text-white px-3 py-2 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* Left Brand Identity */}
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Government Emblem Symbol */}
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
              <span className="text-sm sm:text-base font-bold tracking-tighter text-amber-200">बिहार</span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] sm:text-xs uppercase tracking-wider text-amber-200 font-bold truncate">
                  बिहार सरकार • शिक्षा विभाग
                </span>
                <span className="hidden sm:inline-block text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full font-mono">
                  परिशिष्ट-11
                </span>
              </div>
              <h1 className="text-xs sm:text-sm font-extrabold tracking-tight truncate max-w-[200px] sm:max-w-none">
                PM POSHAN (मध्याह्न भोजन) रिपोर्टिंग
              </h1>
            </div>
          </div>

          {/* Quick Header Actions (Desktop + Mobile Hamburger) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-1.5">
              <button
                onClick={onOpenTestModal}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-semibold backdrop-blur-xs transition border border-white/20"
                title="सभी गणनाओं का परीक्षण करें"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span>सत्यापन टेस्ट</span>
              </button>

              <button
                onClick={onOpenRateModal}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/30 hover:bg-amber-500/40 text-amber-100 rounded-lg text-xs font-semibold backdrop-blur-xs transition border border-amber-300/30"
                title="सरकारी रेट चार्ट देखें व बदलें"
              >
                <Coins className="w-3.5 h-3.5 text-amber-300" />
                <span>रेट चार्ट</span>
              </button>

              <button
                onClick={onOpenBackupModal}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium backdrop-blur-xs transition"
                title="डेटा बैकअप एवं रिस्टोर"
              >
                <Database className="w-3.5 h-3.5" />
                <span>बैकअप</span>
              </button>
            </div>

            {/* Mobile Hamburger Toggle Button */}
            <button
              type="button"
              onClick={() => setShowMobileDrawer((prev) => !prev)}
              aria-label="मेनू खोलें"
              className="md:hidden inline-flex items-center gap-1 px-2.5 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold transition cursor-pointer"
            >
              {showMobileDrawer ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              <span className="text-[11px]">मेनू</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation & School/Month Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex flex-col md:flex-row md:items-center justify-between gap-2">
        {/* Current Active School & Month Pill */}
        <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg font-medium truncate max-w-full">
            <School className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="font-bold text-slate-900 truncate">
              {data.schoolDetails.schoolName || 'विद्यालय का नाम दर्ज करें'}
            </span>
            <span className="text-slate-400 hidden sm:inline">|</span>
            <span className="hidden sm:inline">प्रखंड: {data.schoolDetails.blockName || '---'}</span>
          </div>

          {/* Month Selector dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowMonthDropdown(!showMonthDropdown)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-lg text-[11px] sm:text-xs font-bold transition"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>
                {data.schoolDetails.month} {data.schoolDetails.year}
              </span>
              <ChevronDown className="w-3 h-3 text-blue-500" />
            </button>

            {showMonthDropdown && (
              <div className="absolute right-0 sm:left-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
                <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  सहेजे गए महीने
                </div>
                {savedMonthIds.map((id) => (
                  <button
                    key={id}
                    onClick={() => {
                      onSelectMonth(id);
                      setShowMonthDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between ${
                      id === data.id ? 'font-bold text-blue-600 bg-blue-50/50' : 'text-slate-700'
                    }`}
                  >
                    <span>माह ID: {id}</span>
                    {id === data.id && <span className="text-blue-600 text-xs">✓</span>}
                  </button>
                ))}

                <div className="border-t border-slate-100 mt-1 pt-1 px-1">
                  <button
                    onClick={() => {
                      setShowMonthDropdown(false);
                      setShowNewMonthModal(true);
                    }}
                    className="w-full text-left px-2 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg font-semibold flex items-center gap-1.5"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    नया माह जोड़ें
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Report Selector Dropdown (Quick Single-Tap on Mobile) */}
        <div className="md:hidden flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-600 pl-1.5 shrink-0">📄 रिपोर्ट:</span>
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as any)}
            className="w-full text-xs font-bold py-1.5 px-2 bg-white rounded-lg border border-slate-300 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            {TABS_LIST.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.name}
              </option>
            ))}
          </select>
        </div>

        {/* Desktop Navigation Tabs (Horizontal Scrollable with Smooth Momentum) */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold overflow-x-auto max-w-full">
          {TABS_LIST.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${tab.color}`} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile Drawer (Slide-Over Sheet) for Full Easy Actions */}
      {showMobileDrawer && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setShowMobileDrawer(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-4/5 max-w-sm bg-white h-full shadow-2xl flex flex-col z-10 overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-4 bg-gradient-to-r from-amber-700 via-emerald-800 to-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-amber-200">
                  बिहार
                </div>
                <div>
                  <div className="text-xs font-bold">PM POSHAN बिहार</div>
                  <div className="text-[10px] text-amber-200">मेनू एवं त्वरित नेविगेशन</div>
                </div>
              </div>
              <button
                onClick={() => setShowMobileDrawer(false)}
                className="p-1 rounded-lg bg-white/20 hover:bg-white/30 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* School & Active Month Badge */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs">
              <div className="font-bold text-slate-900">{data.schoolDetails.schoolName || 'विद्यालय का नाम दर्ज करें'}</div>
              <div className="text-slate-500 text-[11px] mt-0.5">
                प्रखंड: {data.schoolDetails.blockName || '---'} • माह: {data.schoolDetails.month} {data.schoolDetails.year}
              </div>
            </div>

            {/* Report Tabs List */}
            <div className="p-3 flex-1 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                सभी रिपोर्ट्स एवं प्रपत्र
              </div>
              {TABS_LIST.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      setShowMobileDrawer(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition ${
                      isActive
                        ? 'bg-blue-50 text-blue-900 border border-blue-200 shadow-2xs font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Action Tools in Drawer */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 space-y-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                प्रशासनिक टूल्स
              </div>
              <button
                onClick={() => {
                  onOpenTestModal();
                  setShowMobileDrawer(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-emerald-800 hover:bg-emerald-50"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>सत्यापन ऑडिट टेस्ट (Audit)</span>
              </button>

              <button
                onClick={() => {
                  onOpenRateModal();
                  setShowMobileDrawer(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-amber-900 hover:bg-amber-50"
              >
                <Coins className="w-4 h-4 text-amber-600" />
                <span>सरकारी रेट चार्ट (6.78 / 10.17)</span>
              </button>

              <button
                onClick={() => {
                  onOpenBackupModal();
                  setShowMobileDrawer(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 hover:bg-slate-100"
              >
                <Database className="w-4 h-4 text-blue-600" />
                <span>डेटा बैकअप एवं रिस्टोर</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Month Modal */}
      {showNewMonthModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 text-xs">
            <h3 className="text-base font-bold text-slate-900 mb-1">नया माह जोड़ें</h3>
            <p className="text-slate-500 mb-4">
              नए महीने के लिए प्रपत्र-क एवं 31-दिवसीय दैनिक पंजी तैयार करें।
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">माह चुनें</label>
                <select
                  value={newMonthNum}
                  onChange={(e) => setNewMonthNum(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">वर्ष (Year)</label>
                <input
                  type="number"
                  value={newYear}
                  onChange={(e) => setNewYear(parseInt(e.target.value, 10) || 2025)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNewMonthModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                रद्द करें
              </button>
              <button
                onClick={handleCreateMonth}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs"
              >
                माह बनाएं
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
