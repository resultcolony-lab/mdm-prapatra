import React, { useState } from 'react';
import { RateChart } from '../types/mdm';
import { OFFICIAL_DEFAULT_RATES, round2 } from '../utils/mdmRates';
import { Lock, Unlock, ShieldCheck, RotateCcw, AlertTriangle, Eye, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  rates: RateChart;
  onSaveRates: (updatedRates: RateChart) => void;
}

export const AdminRateModal: React.FC<Props> = ({ isOpen, onClose, rates, onSaveRates }) => {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'chart' | 'edit' | 'notice'>('chart');

  // Editable local state
  const [formRates, setFormRates] = useState<RateChart>(JSON.parse(JSON.stringify(rates)));

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'admin123' || passwordInput === 'biharmdm2025') {
      setIsAdminLoggedIn(true);
      setAuthError('');
      setActiveTab('edit');
    } else {
      setAuthError('गलत पासवर्ड! कृपया सही एडमिन पासवर्ड दर्ज करें (डिफ़ॉल्ट: admin123)');
    }
  };

  const handleFieldChange = (
    classGroup: 'class1to5' | 'class6to8',
    itemKey: 'dal' | 'sabji' | 'tel' | 'masala' | 'jalawan',
    field: 'weightGram' | 'ratePerKg' | 'costPerChild',
    val: number
  ) => {
    const updated = { ...formRates };
    const item = { ...updated[classGroup][itemKey], [field]: val };
    
    // Auto recompute costPerChild if weight or rate changed
    if (field === 'weightGram' || field === 'ratePerKg') {
      item.costPerChild = round2((item.weightGram / 1000) * item.ratePerKg);
    }
    updated[classGroup][itemKey] = item;

    // Recompute total
    const total = round2(
      updated[classGroup].dal.costPerChild +
      updated[classGroup].sabji.costPerChild +
      updated[classGroup].tel.costPerChild +
      updated[classGroup].masala.costPerChild +
      updated[classGroup].jalawan.costPerChild
    );
    updated[classGroup].totalCostPerChild = total;

    setFormRates(updated);
  };

  const handleResetToOfficial = () => {
    if (confirm('क्या आप दरों को बिहार सरकार के मूल 01-05-2025 रेट चार्ट पर रीसेट करना चाहते हैं?')) {
      setFormRates(JSON.parse(JSON.stringify(OFFICIAL_DEFAULT_RATES)));
    }
  };

  const handleSave = () => {
    onSaveRates(formRates);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-bold">
                बिहार सरकार MDM परिवर्तन मूल्य दर तालिका (Rate Chart)
              </h2>
              <p className="text-xs text-slate-300">
                {formRates.effectiveDate || '01-05-2025 से प्रभावी (Official Government Rates)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdminLoggedIn ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-900/80 text-emerald-200 border border-emerald-500">
                <Unlock className="w-3.5 h-3.5" />
                एडमिन मोड सक्रिय
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                <Lock className="w-3.5 h-3.5" />
                केवल दृश्य (Protected)
              </span>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-xl font-bold ml-2 transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('chart')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'chart'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              दर तालिका विवरणी
            </button>

            {isAdminLoggedIn && (
              <button
                onClick={() => setActiveTab('edit')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'edit'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                दरें संपादित करें (Edit Rates)
              </button>
            )}

            <button
              onClick={() => setActiveTab('notice')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'notice'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5 inline mr-1" />
              मूल सरकारी आदेश (Rate Notice)
            </button>
          </div>

          {!isAdminLoggedIn && (
            <div className="text-xs text-slate-500">
              दरें बदलने के लिए एडमिन पासवर्ड दर्ज करें
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* Admin Login Box (if locked and not logged in) */}
          {!isAdminLoggedIn && (
            <form onSubmit={handleLogin} className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600" />
                <span className="font-semibold text-slate-800">
                  दरों को बदलने के लिए एडमिन अनलॉक करें:
                </span>
                <span className="text-slate-500 font-mono text-[11px]">(डिफ़ॉल्ट पासवर्ड: admin123)</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  placeholder="एडमिन पासवर्ड"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-mono"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg font-semibold text-xs shadow-xs transition"
                >
                  अनलॉक करें
                </button>
              </div>
              {authError && (
                <div className="w-full text-rose-600 text-xs font-medium">{authError}</div>
              )}
            </form>
          )}

          {/* TAB 1: Rate Chart View */}
          {activeTab === 'chart' && (
            <div className="space-y-6">
              {/* Class 1 to 5 Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="bg-amber-100/70 border-b border-amber-200 px-4 py-2 flex justify-between items-center">
                  <h3 className="font-bold text-amber-950 text-sm">
                    कक्षा 01 से 05 के लिए निर्धारित दरें
                  </h3>
                  <span className="font-bold text-amber-900 font-mono text-sm">
                    स्वीकृत कुल दर: ₹{formRates.class1to5.totalCostPerChild.toFixed(2)} प्रति छात्र
                  </span>
                </div>
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">सामग्री</th>
                      <th className="p-3 text-right">वजन प्रति छात्र</th>
                      <th className="p-3 text-right">दर प्रति किलो</th>
                      <th className="p-3 text-right">मूल्य प्रति छात्र</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
                    <tr>
                      <td className="p-3 font-semibold">दाल</td>
                      <td className="p-3 text-right font-mono">{formRates.class1to5.dal.weightGram} Gram</td>
                      <td className="p-3 text-right font-mono">₹{formRates.class1to5.dal.ratePerKg.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">₹{formRates.class1to5.dal.costPerChild.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">सब्जी</td>
                      <td className="p-3 text-right font-mono">{formRates.class1to5.sabji.weightGram} Gram</td>
                      <td className="p-3 text-right font-mono">₹{formRates.class1to5.sabji.ratePerKg.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">₹{formRates.class1to5.sabji.costPerChild.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">तेल</td>
                      <td className="p-3 text-right font-mono">{formRates.class1to5.tel.weightGram} Gram</td>
                      <td className="p-3 text-right font-mono">₹{formRates.class1to5.tel.ratePerKg.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">₹{formRates.class1to5.tel.costPerChild.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">मसाला / नमक</td>
                      <td className="p-3 text-right font-mono">{formRates.class1to5.masala.weightGram} Gram</td>
                      <td className="p-3 text-right font-mono">₹{formRates.class1to5.masala.ratePerKg.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">₹{formRates.class1to5.masala.costPerChild.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">जलावन</td>
                      <td className="p-3 text-right font-mono">{formRates.class1to5.jalawan.weightGram} Gram</td>
                      <td className="p-3 text-right font-mono">₹{formRates.class1to5.jalawan.ratePerKg.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">₹{formRates.class1to5.jalawan.costPerChild.toFixed(2)}</td>
                    </tr>
                    <tr className="bg-amber-50 font-bold border-t-2 border-slate-300">
                      <td className="p-3 font-extrabold text-amber-950">कुल (Total)</td>
                      <td colSpan={2} className="p-3 text-right text-slate-500 font-normal">
                        खाद्यान्न (चावल) मानक: 100 ग्राम प्रति छात्र
                      </td>
                      <td className="p-3 text-right font-mono text-base font-extrabold text-amber-950">
                        ₹{formRates.class1to5.totalCostPerChild.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Class 6 to 8 Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="bg-indigo-100/70 border-b border-indigo-200 px-4 py-2 flex justify-between items-center">
                  <h3 className="font-bold text-indigo-950 text-sm">
                    कक्षा 06 से 08 के लिए निर्धारित दरें
                  </h3>
                  <span className="font-bold text-indigo-900 font-mono text-sm">
                    स्वीकृत कुल दर: ₹{formRates.class6to8.totalCostPerChild.toFixed(2)} प्रति छात्र
                  </span>
                </div>
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">सामग्री</th>
                      <th className="p-3 text-right">वजन प्रति छात्र</th>
                      <th className="p-3 text-right">दर प्रति किलो</th>
                      <th className="p-3 text-right">मूल्य प्रति छात्र</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
                    <tr>
                      <td className="p-3 font-semibold">दाल</td>
                      <td className="p-3 text-right font-mono">{formRates.class6to8.dal.weightGram} Gram</td>
                      <td className="p-3 text-right font-mono">₹{formRates.class6to8.dal.ratePerKg.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">₹{formRates.class6to8.dal.costPerChild.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">सब्जी</td>
                      <td className="p-3 text-right font-mono">{formRates.class6to8.sabji.weightGram} Gram</td>
                      <td className="p-3 text-right font-mono">₹{formRates.class6to8.sabji.ratePerKg.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">₹{formRates.class6to8.sabji.costPerChild.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">तेल</td>
                      <td className="p-3 text-right font-mono">{formRates.class6to8.tel.weightGram} Gram</td>
                      <td className="p-3 text-right font-mono">₹{formRates.class6to8.tel.ratePerKg.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">₹{formRates.class6to8.tel.costPerChild.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">मसाला / नमक</td>
                      <td className="p-3 text-right font-mono">{formRates.class6to8.masala.weightGram} Gram</td>
                      <td className="p-3 text-right font-mono">₹{formRates.class6to8.masala.ratePerKg.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">₹{formRates.class6to8.masala.costPerChild.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">जलावन</td>
                      <td className="p-3 text-right font-mono">{formRates.class6to8.jalawan.weightGram} Gram</td>
                      <td className="p-3 text-right font-mono">₹{formRates.class6to8.jalawan.ratePerKg.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">₹{formRates.class6to8.jalawan.costPerChild.toFixed(2)}</td>
                    </tr>
                    <tr className="bg-indigo-50 font-bold border-t-2 border-slate-300">
                      <td className="p-3 font-extrabold text-indigo-950">कुल (Total)</td>
                      <td colSpan={2} className="p-3 text-right text-slate-500 font-normal">
                        खाद्यान्न (चावल) मानक: 150 ग्राम प्रति छात्र
                      </td>
                      <td className="p-3 text-right font-mono text-base font-extrabold text-indigo-950">
                        ₹{formRates.class6to8.totalCostPerChild.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Edit Rates (Admin Only) */}
          {activeTab === 'edit' && isAdminLoggedIn && (
            <div className="space-y-6">
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>सावधानी:</strong> ये दरें पूरे विद्यालय के मासिक व्यय की गणना को सीधे प्रभावित करती हैं। केवल बिहार सरकार द्वारा नया संकल्प या दर संशोधन पत्र जारी होने पर ही इसमें बदलाव करें।
                </div>
              </div>

              {/* Class 1-5 Inputs */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-2">
                  कक्षा 1 से 5 (प्राथमिक दरें)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                  {(['dal', 'sabji', 'tel', 'masala', 'jalawan'] as const).map((k) => (
                    <div key={k} className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                      <div className="font-bold text-slate-800 mb-1.5">{formRates.class1to5[k].name}</div>
                      <div className="space-y-1.5">
                        <div>
                          <span className="text-[10px] text-slate-500">वजन (ग्राम):</span>
                          <input
                            type="number"
                            step="0.1"
                            value={formRates.class1to5[k].weightGram}
                            onChange={(e) => handleFieldChange('class1to5', k, 'weightGram', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500">दर प्रति किलो (₹):</span>
                          <input
                            type="number"
                            step="0.1"
                            value={formRates.class1to5[k].ratePerKg}
                            onChange={(e) => handleFieldChange('class1to5', k, 'ratePerKg', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono"
                          />
                        </div>
                        <div className="pt-1 text-[11px] font-bold text-slate-900">
                          मूल्य: ₹{formRates.class1to5[k].costPerChild.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Class 6-8 Inputs */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-2">
                  कक्षा 6 से 8 (उच्च प्राथमिक दरें)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                  {(['dal', 'sabji', 'tel', 'masala', 'jalawan'] as const).map((k) => (
                    <div key={k} className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                      <div className="font-bold text-slate-800 mb-1.5">{formRates.class6to8[k].name}</div>
                      <div className="space-y-1.5">
                        <div>
                          <span className="text-[10px] text-slate-500">वजन (ग्राम):</span>
                          <input
                            type="number"
                            step="0.1"
                            value={formRates.class6to8[k].weightGram}
                            onChange={(e) => handleFieldChange('class6to8', k, 'weightGram', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500">दर प्रति किलो (₹):</span>
                          <input
                            type="number"
                            step="0.1"
                            value={formRates.class6to8[k].ratePerKg}
                            onChange={(e) => handleFieldChange('class6to8', k, 'ratePerKg', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono"
                          />
                        </div>
                        <div className="pt-1 text-[11px] font-bold text-slate-900">
                          मूल्य: ₹{formRates.class6to8[k].costPerChild.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleResetToOfficial}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  मूल 01-05-2025 सरकारी दरों पर रीसेट करें
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Notice Image View */}
          {activeTab === 'notice' && (
            <div className="space-y-3 text-center">
              <div className="text-xs font-semibold text-slate-700 mb-2">
                बिहार सरकार शिक्षा विभाग / PM POSHAN निदेशालय द्वारा जारी परिवर्तन मूल्य की नई दर की विवरणी (01-05-2025 से प्रभावित)
              </div>
              <div className="border border-slate-300 rounded-xl overflow-hidden p-2 bg-slate-50 inline-block shadow-sm">
                <img
                  src="/public/assets/aistudio/rate_1bfe666d.jpeg"
                  alt="Official Bihar MDM Rate Chart"
                  className="max-h-[500px] w-auto mx-auto object-contain rounded"
                  onError={(e) => {
                    // Fallback to relative path if needed
                    (e.target as HTMLImageElement).src = '/assets/aistudio/rate_1bfe666d.jpeg';
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition"
          >
            बंद करें
          </button>

          {isAdminLoggedIn && activeTab === 'edit' && (
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              संशोधित दरें सहेजें एवं लागू करें
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
