import React, { useState } from 'react';
import { exportAllDataToJson, importAllDataFromJson, getDefaultDemoMonthData } from '../utils/storage';
import { Download, Upload, RotateCcw, Database, CheckCircle2, AlertCircle } from 'lucide-react';
import { MonthData } from '../types/mdm';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onDataResetOrImported: (freshData: MonthData) => void;
}

export const BackupModal: React.FC<Props> = ({ isOpen, onClose, onDataResetOrImported }) => {
  const [importStatus, setImportStatus] = useState<string>('');
  const [errorStatus, setErrorStatus] = useState<string>('');

  if (!isOpen) return null;

  const handleExportJson = () => {
    const jsonStr = exportAllDataToJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bihar_pm_poshan_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const success = importAllDataFromJson(content);
        if (success) {
          setImportStatus('डेटा सफलतापूर्वक पुनर्स्थापित हो गया!');
          setErrorStatus('');
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          setErrorStatus('बैकअप फ़ाइल अमान्य है।');
        }
      } catch (err) {
        setErrorStatus('फ़ाइल पढ़ने में त्रुटि!');
      }
    };
    reader.readAsText(file);
  };

  const handleResetDemo = () => {
    if (confirm('क्या आप डेमो डेटा (राजकीय मध्य विद्यालय, पूर्णियाँ) पर रीसेट करना चाहते हैं?')) {
      const demo = getDefaultDemoMonthData();
      onDataResetOrImported(demo);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold">डेटा बैकअप एवं सुरक्षित प्रबंधन</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-bold text-lg">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs">
          {importStatus && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {importStatus}
            </div>
          )}

          {errorStatus && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              {errorStatus}
            </div>
          )}

          {/* Export */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <h4 className="font-bold text-slate-800 text-sm">1. डेटा बैकअप डाउनलोड (JSON Export)</h4>
            <p className="text-slate-500">
              सभी महीनों का पूरा डेटा, विद्यालय विवरणी और दैनिक पंजी सुरक्षित JSON फाइल के रूप में अपने कंप्यूटर/मोबाइल में सेव करें।
            </p>
            <button
              onClick={handleExportJson}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs transition"
            >
              <Download className="w-4 h-4" />
              बैकअप फ़ाइल डाउनलोड करें (.json)
            </button>
          </div>

          {/* Import */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <h4 className="font-bold text-slate-800 text-sm">2. बैकअप फ़ाइल से डेटा पुनर्स्थापित करें (Restore)</h4>
            <p className="text-slate-500">
              पहले से सेव की गई JSON बैकअप फ़ाइल चुनकर डेटा लोड करें।
            </p>
            <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold shadow-xs cursor-pointer transition">
              <Upload className="w-4 h-4" />
              बैकअप फ़ाइल चुनें
              <input
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
              />
            </label>
          </div>

          {/* Reset Demo */}
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 space-y-2">
            <h4 className="font-bold text-rose-900 text-sm">3. नमूना / डिफ़ॉल्ट डेटा लोड करें</h4>
            <p className="text-rose-700">
              राजकीय मध्य विद्यालय, पूर्णियाँ के मूल प्रारूप और भरी हुई दैनिक पंजी के साथ रीसेट करें।
            </p>
            <button
              onClick={handleResetDemo}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold shadow-xs transition"
            >
              <RotateCcw className="w-4 h-4" />
              डिफ़ॉल्ट डेमो डेटा लोड करें
            </button>
          </div>
        </div>

        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition"
          >
            बंद करें
          </button>
        </div>
      </div>
    </div>
  );
};
