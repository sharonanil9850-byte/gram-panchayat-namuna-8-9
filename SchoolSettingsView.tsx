import { useRef, useState } from 'react';
import {
  Download,
  RotateCcw,
  Save,
  Upload,
} from 'lucide-react';
import { AppState, SchoolProfile } from '../types/attendance';

interface SchoolSettingsViewProps {
  school: SchoolProfile;
  fullState: AppState;
  onUpdateSchool: (nextSchool: SchoolProfile) => void;
  onImportState: (imported: AppState) => void;
  onResetToSeed: () => void;
}

export function SchoolSettingsView({
  school,
  fullState,
  onUpdateSchool,
  onImportState,
  onResetToSeed,
}: SchoolSettingsViewProps) {
  const [form, setForm] = useState<SchoolProfile>(school);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSchool({
      schoolName: form.schoolName.trim() || 'शाळेचे नाव',
      address: form.address.trim(),
      principalName: form.principalName.trim(),
      udiseCode: form.udiseCode.trim(),
    });
    setSavedMsg('शाळेची माहिती जतन झाली. सर्व PDF अहवालांवर ही माहिती दिसेल.');
    window.setTimeout(() => setSavedMsg(null), 3500);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(fullState, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `शाळा_हजेरी_बॅकअप_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as AppState;
      if (!parsed.school || !Array.isArray(parsed.classes) || !parsed.records) {
        setImportError('अवैध बॅकअप फाईल. कृपया योग्य JSON फाईल निवडा.');
        return;
      }
      onImportState(parsed);
      setForm(parsed.school);
      setSavedMsg('बॅकअप डेटा यशस्वीरित्या पुनर्स्थापित झाला.');
      window.setTimeout(() => setSavedMsg(null), 3500);
    } catch {
      setImportError('फाईल वाचताना त्रुटी आली. कृपया वैध JSON फाईल वापरा.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      {/* School Details Form */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <h1 className="text-xl font-bold text-slate-900">
          शाळेची माहिती व PDF शीर्षक तपशील
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          येथे भरलेली शाळेची माहिती दैनिक व मासिक PDF अहवालांच्या शीर्षकावर व स्वाक्षरी भागात छापली जाते.
        </p>

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              शाळेचे पूर्ण नाव *
            </label>
            <input
              type="text"
              required
              value={form.schoolName}
              onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              पत्ता / तालुका / जिल्हा
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                मुख्याध्यापकांचे नाव
              </label>
              <input
                type="text"
                value={form.principalName}
                onChange={(e) =>
                  setForm({ ...form, principalName: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                UDISE क्रमांक (ऐच्छिक)
              </label>
              <input
                type="text"
                value={form.udiseCode}
                onChange={(e) => setForm({ ...form, udiseCode: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm font-mono tabular-nums text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800 transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>माहिती जतन करा</span>
            </button>
            {savedMsg && (
              <span className="text-sm font-medium text-green-700">
                {savedMsg}
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Backup & Restore */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-base font-bold text-slate-900">
          डेटा बॅकअप व पुनर्स्थापना
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          सर्व वर्ग, विद्यार्थी आणि हजेरी नोंदी तुमच्या ब्राउझरमध्ये सुरक्षित जतन राहतात. दुसऱ्या संगणकावर किंवा मोबाईलवर डेटा नेण्यासाठी बॅकअप डाउनलोड करा.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors"
          >
            <Download className="h-4 w-4 text-blue-700" />
            <span>डेटा बॅकअप डाउनलोड करा (JSON)</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors"
          >
            <Upload className="h-4 w-4 text-slate-600" />
            <span>बॅकअप फाईल अपलोड करा</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />

          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span>नमुना डेटा पुनर्स्थापित करा</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs">
              <span className="font-medium text-red-800">
                सध्याचा डेटा बदलून नमुना डेटा आणायचा का?
              </span>
              <button
                type="button"
                onClick={() => {
                  onResetToSeed();
                  setConfirmReset(false);
                }}
                className="px-2.5 py-1 rounded bg-red-700 text-white font-semibold hover:bg-red-800"
              >
                हो
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-700"
              >
                नाही
              </button>
            </div>
          )}
        </div>

        {importError && (
          <p className="mt-3 text-sm font-medium text-red-700">{importError}</p>
        )}
      </div>
    </div>
  );
}
