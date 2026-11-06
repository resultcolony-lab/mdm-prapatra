import React, { useState } from 'react';
import { MonthData, SchoolDetails } from '../types/mdm';
import { Building2, Users, Wheat, Landmark, Save, FileText, Check, Sparkles, RefreshCw, Loader2 } from 'lucide-react';
import { autoTranslateToHindi, translateToHindiAsync } from '../utils/hindiTransliterator';

interface Props {
  data: MonthData;
  onUpdateSchoolDetails: (updated: SchoolDetails) => void;
}

export const SchoolDetailsForm: React.FC<Props> = ({ data, onUpdateSchoolDetails }) => {
  const { schoolDetails } = data;
  const [translatingField, setTranslatingField] = useState<string | null>(null);

  const handleChange = (field: keyof SchoolDetails, value: any) => {
    onUpdateSchoolDetails({
      ...schoolDetails,
      [field]: value,
    });
  };

  const handleTranslateField = async (field: keyof SchoolDetails) => {
    const rawVal = schoolDetails[field];
    if (typeof rawVal !== 'string' || !rawVal.trim()) return;
    setTranslatingField(field);
    const instant = autoTranslateToHindi(rawVal);
    handleChange(field, instant);
    try {
      const enhanced = await translateToHindiAsync(rawVal);
      if (enhanced && enhanced !== instant) {
        handleChange(field, enhanced);
      }
    } catch {
      // fallback already applied
    } finally {
      setTranslatingField(null);
    }
  };

  const handleAutoTranslateInput = async (field: keyof SchoolDetails, val: string) => {
    if (!val || !val.trim()) return;
    const instant = autoTranslateToHindi(val);
    handleChange(field, instant);
    try {
      const enhanced = await translateToHindiAsync(val);
      if (enhanced && enhanced !== instant) {
        handleChange(field, enhanced);
      }
    } catch {
      // fallback already applied
    }
  };

  const handleNumberChange = (field: keyof SchoolDetails, value: string) => {
    if (value.trim() === '') {
      handleChange(field, undefined);
      return;
    }
    const num = parseFloat(value);
    handleChange(field, isNaN(num) ? undefined : Math.max(0, num));
  };

  const handlePfmsChange = (field: keyof SchoolDetails, value: string) => {
    if (value.trim() === '') {
      handleChange(field, null);
      return;
    }
    const num = parseFloat(value);
    handleChange(field, isNaN(num) ? null : Math.max(0, num));
  };

  return (
    <div className="space-y-6">
      {/* 1. School Information Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <Building2 className="w-4 h-4 text-indigo-600" />
            विद्यालय एवं पदाधिकारी विवरण (Basic Details)
          </div>
          <span className="text-xs text-slate-500 font-medium">प्रपत्र-क शीर्ष विवरणी</span>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700">
                विद्यालय का नाम <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                disabled={translatingField === 'schoolName'}
                onClick={() => handleTranslateField('schoolName')}
                className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 transition cursor-pointer flex items-center gap-1"
                title="अंग्रेजी से शुद्ध हिन्दी में अनुवाद करें (उदा. UMS Rampur -> उत्क्रमित मध्य विद्यालय रामपुर)"
              >
                {translatingField === 'schoolName' ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                    अनुवाद जारी...
                  </>
                ) : (
                  '🌐 हिन्दी अनुवाद'
                )}
              </button>
            </div>
            <input
              type="text"
              value={schoolDetails.schoolName}
              onChange={(e) => {
                const val = e.target.value;
                handleChange('schoolName', val);
                // If user just typed space after a word (e.g. "UMS ")
                if (val.endsWith('  ')) {
                  handleAutoTranslateInput('schoolName', val);
                }
              }}
              onBlur={(e) => handleAutoTranslateInput('schoolName', e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAutoTranslateInput('schoolName', (e.target as HTMLInputElement).value);
                }
              }}
              placeholder="उदा. UMS Rampur या प्राथमिक विद्यालय..."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              💡 अंग्रेजी में टाइप करके बाहर क्लिक करें या '🌐 हिन्दी अनुवाद' बटन दबाएँ
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700">
                प्रखण्ड (Block) <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                disabled={translatingField === 'blockName'}
                onClick={() => handleTranslateField('blockName')}
                className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 transition cursor-pointer flex items-center gap-1"
                title="अंग्रेजी से शुद्ध हिन्दी में अनुवाद करें"
              >
                {translatingField === 'blockName' ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                    अनुवाद जारी...
                  </>
                ) : (
                  '🌐 हिन्दी अनुवाद'
                )}
              </button>
            </div>
            <input
              type="text"
              value={schoolDetails.blockName}
              onChange={(e) => {
                const val = e.target.value;
                handleChange('blockName', val);
                if (val.endsWith('  ')) {
                  handleAutoTranslateInput('blockName', val);
                }
              }}
              onBlur={(e) => handleAutoTranslateInput('blockName', e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAutoTranslateInput('blockName', (e.target as HTMLInputElement).value);
                }
              }}
              placeholder="उदा. Kasba या धमदाहा..."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              💡 अंग्रेजी प्रखण्ड नाम स्वतः शुद्ध हिन्दी में बदल जाएगा
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700">
                जिला (District) <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                disabled={translatingField === 'districtName'}
                onClick={() => handleTranslateField('districtName')}
                className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 transition cursor-pointer flex items-center gap-1"
                title="अंग्रेजी से शुद्ध हिन्दी में अनुवाद करें"
              >
                {translatingField === 'districtName' ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                    अनुवाद जारी...
                  </>
                ) : (
                  '🌐 हिन्दी अनुवाद'
                )}
              </button>
            </div>
            <input
              type="text"
              value={schoolDetails.districtName}
              onChange={(e) => {
                const val = e.target.value;
                handleChange('districtName', val);
                if (val.endsWith('  ')) {
                  handleAutoTranslateInput('districtName', val);
                }
              }}
              onBlur={(e) => handleAutoTranslateInput('districtName', e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAutoTranslateInput('districtName', (e.target as HTMLInputElement).value);
                }
              }}
              placeholder="उदा. Purnea या पूर्णियाँ..."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              💡 बिहार के सभी 38 जिले सपोर्टेड हैं
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              माह (Month) <span className="text-red-500">*</span>
            </label>
            <select
              value={schoolDetails.month}
              onChange={(e) => handleChange('month', e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {[
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
              ].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              वर्ष (Year) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={schoolDetails.year}
              onChange={(e) => handleChange('year', e.target.value)}
              placeholder="2025"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              वित्तीय वर्ष (Financial Year)
            </label>
            <input
              type="text"
              value={schoolDetails.financialYear}
              onChange={(e) => handleChange('financialYear', e.target.value)}
              placeholder="2025-26"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              MIS क्रमांक (U-DISE / MIS Code) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={schoolDetails.misCode}
              onChange={(e) => handleChange('misCode', e.target.value)}
              placeholder="11 अंकों का U-DISE कोड दर्ज करें"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          {/* Weekly Off / School Type Selector */}
          <div className="sm:col-span-2 lg:col-span-3 bg-gradient-to-r from-amber-50 to-indigo-50/70 p-3.5 rounded-xl border border-amber-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <span>📅 विद्यालय का प्रकार एवं साप्ताहिक अवकाश (Weekly Off):</span>
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  बिहार सरकार नियमानुसार: सामान्य विद्यालयों में <strong>रविवार बंद</strong> (शुक्रवार अंडा/फल), एवं उर्दू/मदरसा विद्यालयों में <strong>शुक्रवार बंद</strong> (रविवार अंडा/फल)।
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-300 shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleChange('weeklyOff', 'sunday')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    (schoolDetails.weeklyOff || 'sunday') === 'sunday'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <span>☀️ रविवार बंद (सामान्य)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('weeklyOff', 'friday')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    schoolDetails.weeklyOff === 'friday'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <span>🕌 शुक्रवार बंद (उर्दू/मदरसा)</span>
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700">
                प्रभारी प्रधानाध्यापक / प्रधानाध्यापक का नाम <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                disabled={translatingField === 'hmName'}
                onClick={() => handleTranslateField('hmName')}
                className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 transition cursor-pointer flex items-center gap-1"
                title="अंग्रेजी से शुद्ध हिन्दी में अनुवाद करें"
              >
                {translatingField === 'hmName' ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                    अनुवाद...
                  </>
                ) : (
                  '🌐 हिन्दी'
                )}
              </button>
            </div>
            <input
              type="text"
              value={schoolDetails.hmName}
              onChange={(e) => {
                const val = e.target.value;
                handleChange('hmName', val);
                if (val.endsWith('  ')) {
                  handleAutoTranslateInput('hmName', val);
                }
              }}
              onBlur={(e) => handleAutoTranslateInput('hmName', e.target.value)}
              placeholder="प्रधानाध्यापक का नाम दर्ज करें"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700">
                वि० शि० समिति / प्रबंध समिति अध्यक्ष या सचिव
              </label>
              <button
                type="button"
                disabled={translatingField === 'smcSecretaryName'}
                onClick={() => handleTranslateField('smcSecretaryName')}
                className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 transition cursor-pointer flex items-center gap-1"
                title="अंग्रेजी से शुद्ध हिन्दी में अनुवाद करें"
              >
                {translatingField === 'smcSecretaryName' ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                    अनुवाद...
                  </>
                ) : (
                  '🌐 हिन्दी'
                )}
              </button>
            </div>
            <input
              type="text"
              value={schoolDetails.smcSecretaryName}
              onChange={(e) => {
                const val = e.target.value;
                handleChange('smcSecretaryName', val);
                if (val.endsWith('  ')) {
                  handleAutoTranslateInput('smcSecretaryName', val);
                }
              }}
              onBlur={(e) => handleAutoTranslateInput('smcSecretaryName', e.target.value)}
              placeholder="अध्यक्ष / सचिव का नाम दर्ज करें"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Panchayat Name */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700">
                पंचायत का नाम (Panchayat)
              </label>
              <button
                type="button"
                disabled={translatingField === 'panchayatName'}
                onClick={() => handleTranslateField('panchayatName')}
                className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 transition cursor-pointer flex items-center gap-1"
                title="अंग्रेजी से शुद्ध हिन्दी में अनुवाद करें"
              >
                {translatingField === 'panchayatName' ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                    अनुवाद...
                  </>
                ) : (
                  '🌐 हिन्दी'
                )}
              </button>
            </div>
            <input
              type="text"
              value={schoolDetails.panchayatName || ''}
              onChange={(e) => {
                const val = e.target.value;
                handleChange('panchayatName', val);
                if (val.endsWith('  ')) {
                  handleAutoTranslateInput('panchayatName', val);
                }
              }}
              onBlur={(e) => handleAutoTranslateInput('panchayatName', e.target.value)}
              placeholder="उदा. Rampur या रामपुर..."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              💡 अण्डा/फल पंजी एवं विवरणी में स्वतः दर्ज होगा
            </p>
          </div>

          {/* Sankul Name */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700">
                संकुल का नाम (Sankul / CRC)
              </label>
              <button
                type="button"
                disabled={translatingField === 'sankulName'}
                onClick={() => handleTranslateField('sankulName')}
                className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 transition cursor-pointer flex items-center gap-1"
                title="अंग्रेजी से शुद्ध हिन्दी में अनुवाद करें"
              >
                {translatingField === 'sankulName' ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                    अनुवाद...
                  </>
                ) : (
                  '🌐 हिन्दी'
                )}
              </button>
            </div>
            <input
              type="text"
              value={schoolDetails.sankulName || ''}
              onChange={(e) => {
                const val = e.target.value;
                handleChange('sankulName', val);
                if (val.endsWith('  ')) {
                  handleAutoTranslateInput('sankulName', val);
                }
              }}
              onBlur={(e) => handleAutoTranslateInput('sankulName', e.target.value)}
              placeholder="उदा. MS Kasba या मध्य विद्यालय..."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              💡 अण्डा/फल पंजी एवं विवरणी में स्वतः दर्ज होगा
            </p>
          </div>
        </div>
      </div>

      {/* 2. Enrollment (Col 23) Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <Users className="w-4 h-4 text-blue-600" />
            विद्यालय में कुल नामांकन (Col 23)
          </div>
          <span className="text-xs text-slate-500 font-medium">कुल पंजीकृत छात्र-छात्राएं</span>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200">
            <label className="block font-bold text-amber-950 mb-1">
              कक्षा 1 से 5 में कुल नामांकन संख्या
            </label>
            <p className="text-[11px] text-amber-700 mb-2">प्राथमिक वर्ग के कुल नामांकित बच्चे</p>
            <input
              type="number"
              min={0}
              placeholder="नामांकन संख्या दर्ज करें"
              value={schoolDetails.enroll1to5 != null ? schoolDetails.enroll1to5 : ''}
              onChange={(e) => handleNumberChange('enroll1to5', e.target.value)}
              className="w-full text-base font-bold font-mono px-3 py-2 bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200">
            <label className="block font-bold text-indigo-950 mb-1">
              कक्षा 6 से 8 में कुल नामांकन संख्या
            </label>
            <p className="text-[11px] text-indigo-700 mb-2">उच्च प्राथमिक वर्ग के कुल नामांकित बच्चे</p>
            <input
              type="number"
              min={0}
              placeholder="नामांकन संख्या दर्ज करें"
              value={schoolDetails.enroll6to8 != null ? schoolDetails.enroll6to8 : ''}
              onChange={(e) => handleNumberChange('enroll6to8', e.target.value)}
              className="w-full text-base font-bold font-mono px-3 py-2 bg-white border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* 2B. Total Student-Days (Col 11) Override Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <Users className="w-4 h-4 text-emerald-600" />
            कुल विद्यार्थी-दिवस (कॉलम 11) सीधा संपादन (Total Student-Days)
          </div>
          <span className="text-xs text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            स्वतः गणना अथवा सीधा इनपुट
          </span>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <p className="text-slate-600">
            सामान्यतः कुल विद्यार्थी-दिवस दैनिक पंजी के आधार पर स्वतः कैल्कुलेट होते हैं। यदि आप सीधे कुल विद्यार्थी-दिवस दर्ज करना चाहते हैं, तो नीचे दर्ज करें। सभी परिवर्तन मूल्य (₹6.78 / ₹10.17) और चावल खपत (100g / 150g) स्वतः तदनुसार अपडेट हो जाएँगे। दैनिक पंजी से स्वतः जोड़ने के लिए इसे खाली छोड़ें।
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-300">
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-amber-950">
                  कक्षा 1 से 5: कुल विद्यार्थी-दिवस (Col 11)
                </label>
                {schoolDetails.overrideStudentDays1to5 != null && (
                  <button
                    type="button"
                    onClick={() => handleChange('overrideStudentDays1to5', null)}
                    className="text-[10px] text-amber-800 underline hover:text-amber-950 cursor-pointer"
                  >
                    रीसेट करें
                  </button>
                )}
              </div>
              <p className="text-[11px] text-amber-700 mb-2">
                दर: ₹6.78 प्रति छात्र • 100g चावल प्रति छात्र
              </p>
              <input
                type="number"
                min={0}
                placeholder="दैनिक पंजी से स्वतः अथवा दर्ज करें"
                value={schoolDetails.overrideStudentDays1to5 != null ? schoolDetails.overrideStudentDays1to5 : ''}
                onChange={(e) => handlePfmsChange('overrideStudentDays1to5', e.target.value)}
                className="w-full text-base font-bold font-mono px-3 py-2 bg-white border border-amber-400 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-300">
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-indigo-950">
                  कक्षा 6 से 8: कुल विद्यार्थी-दिवस (Col 11)
                </label>
                {schoolDetails.overrideStudentDays6to8 != null && (
                  <button
                    type="button"
                    onClick={() => handleChange('overrideStudentDays6to8', null)}
                    className="text-[10px] text-indigo-800 underline hover:text-indigo-950 cursor-pointer"
                  >
                    रीसेट करें
                  </button>
                )}
              </div>
              <p className="text-[11px] text-indigo-700 mb-2">
                दर: ₹10.17 प्रति छात्र • 150g चावल प्रति छात्र
              </p>
              <input
                type="number"
                min={0}
                placeholder="दैनिक पंजी से स्वतः अथवा दर्ज करें"
                value={schoolDetails.overrideStudentDays6to8 != null ? schoolDetails.overrideStudentDays6to8 : ''}
                onChange={(e) => handlePfmsChange('overrideStudentDays6to8', e.target.value)}
                className="w-full text-base font-bold font-mono px-3 py-2 bg-white border border-indigo-400 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Foodgrain Stock & Lifting (Columns 3, 4, 5, 7) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <Wheat className="w-4 h-4 text-amber-600" />
            खाद्यान्न (चावल) उठाव एवं प्रारंभिक स्टॉक (किलोग्राम में)
          </div>
          <span className="text-xs text-slate-500 font-medium">भौतिक प्रतिवेदन इनपुट</span>
        </div>

        <div className="p-5 overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <th className="p-3">कक्षा वर्ग</th>
                <th className="p-3">कॉलम 3: वार्षिक आवंटन (kg)</th>
                <th className="p-3">कॉलम 4: गत माह तक उठाव (kg)</th>
                <th className="p-3">कॉलम 5: वर्तमान माह में उठाव (kg)</th>
                <th className="p-3">कॉलम 7: पूर्व माह का अवशेष (kg)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="p-3 font-bold text-amber-900 bg-amber-50/40">कक्षा 1 से 5 (प्राथमिक)</td>
                <td className="p-2">
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="0.00"
                    value={schoolDetails.annualAllotment1to5 != null ? schoolDetails.annualAllotment1to5 : ''}
                    onChange={(e) => handleNumberChange('annualAllotment1to5', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="0.00"
                    value={schoolDetails.prevLifting1to5 != null ? schoolDetails.prevLifting1to5 : ''}
                    onChange={(e) => handleNumberChange('prevLifting1to5', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="0.00"
                    value={schoolDetails.currentLifting1to5 != null ? schoolDetails.currentLifting1to5 : ''}
                    onChange={(e) => handleNumberChange('currentLifting1to5', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono font-bold"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="0.00"
                    value={schoolDetails.prevBalanceRice1to5 != null ? schoolDetails.prevBalanceRice1to5 : ''}
                    onChange={(e) => handleNumberChange('prevBalanceRice1to5', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono font-bold"
                  />
                </td>
              </tr>

              <tr>
                <td className="p-3 font-bold text-indigo-900 bg-indigo-50/40">कक्षा 6 से 8 (उच्च प्रा०)</td>
                <td className="p-2">
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="0.00"
                    value={schoolDetails.annualAllotment6to8 != null ? schoolDetails.annualAllotment6to8 : ''}
                    onChange={(e) => handleNumberChange('annualAllotment6to8', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="0.00"
                    value={schoolDetails.prevLifting6to8 != null ? schoolDetails.prevLifting6to8 : ''}
                    onChange={(e) => handleNumberChange('prevLifting6to8', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="0.00"
                    value={schoolDetails.currentLifting6to8 != null ? schoolDetails.currentLifting6to8 : ''}
                    onChange={(e) => handleNumberChange('currentLifting6to8', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono font-bold"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="0.00"
                    value={schoolDetails.prevBalanceRice6to8 != null ? schoolDetails.prevBalanceRice6to8 : ''}
                    onChange={(e) => handleNumberChange('prevBalanceRice6to8', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono font-bold"
                  />
                </td>
              </tr>
            </tbody>
          </table>
          <p className="text-[11px] text-slate-500 mt-2">
            * सूत्र: कुल उठाव = कॉलम 4 + 5 | कुल उपलब्ध खाद्यान्न = कॉलम 5 + 7 | अंतिम शेष = कुल उपलब्ध - माह में उपयोग (कॉलम 8 - 9)
          </p>
        </div>
      </div>

      {/* 4. Financial (PFMS) & Remarks (Columns 12, 13, 24) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <Landmark className="w-4 h-4 text-emerald-600" />
            PFMS लिमिट, अवशेष राशि एवं अभ्युक्ति (Col 12, 13, 24)
          </div>
          <span className="text-xs text-slate-500 font-medium">कॉलम 12 एवं 13 (डिफ़ॉल्ट खाली / आवश्यकतानुसार भरें)</span>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Class 1-5 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-2">कक्षा 1 से 5 (प्राथमिक)</h4>
            <div>
              <label className="block text-slate-700 font-medium mb-1">
                कॉलम 12: विद्यालय को प्राप्त लिमिट राशि (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min={0}
                placeholder="खाली छोड़ें"
                value={schoolDetails.pfmsLimitReceived1to5 != null ? schoolDetails.pfmsLimitReceived1to5 : ''}
                onChange={(e) => handlePfmsChange('pfmsLimitReceived1to5', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">
                कॉलम 13: वर्तमान में PFMS में अवशेष राशि (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min={0}
                placeholder="खाली छोड़ें"
                value={schoolDetails.pfmsBalance1to5 != null ? schoolDetails.pfmsBalance1to5 : ''}
                onChange={(e) => handlePfmsChange('pfmsBalance1to5', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">
                कॉलम 24: अभ्युक्ति (Remarks)
              </label>
              <input
                type="text"
                value={schoolDetails.remarks1to5 || ''}
                onChange={(e) => handleChange('remarks1to5', e.target.value)}
                placeholder="अभ्युक्ति (वैकल्पिक)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              />
            </div>
          </div>

          {/* Class 6-8 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-2">कक्षा 6 से 8 (उच्च प्राथमिक)</h4>
            <div>
              <label className="block text-slate-700 font-medium mb-1">
                कॉलम 12: विद्यालय को प्राप्त लिमिट राशि (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min={0}
                placeholder="खाली छोड़ें"
                value={schoolDetails.pfmsLimitReceived6to8 != null ? schoolDetails.pfmsLimitReceived6to8 : ''}
                onChange={(e) => handlePfmsChange('pfmsLimitReceived6to8', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">
                कॉलम 13: वर्तमान में PFMS में अवशेष राशि (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min={0}
                placeholder="खाली छोड़ें"
                value={schoolDetails.pfmsBalance6to8 != null ? schoolDetails.pfmsBalance6to8 : ''}
                onChange={(e) => handlePfmsChange('pfmsBalance6to8', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">
                कॉलम 24: अभ्युक्ति (Remarks)
              </label>
              <input
                type="text"
                value={schoolDetails.remarks6to8 || ''}
                onChange={(e) => handleChange('remarks6to8', e.target.value)}
                placeholder="अभ्युक्ति (वैकल्पिक)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
