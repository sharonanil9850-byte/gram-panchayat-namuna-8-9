import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Download,
  RotateCcw,
  Save,
  Upload,
} from 'lucide-react';
import {
  FeeTransaction,
  GPAppState,
  OwnerPaymentAccount,
  PanchayatProfile,
} from '../types/grampanchayat';
import { formatINR } from '../utils/taxCalculator';

interface AccountSettingsViewProps {
  panchayat: PanchayatProfile;
  paymentAccount: OwnerPaymentAccount;
  feeTransactions: FeeTransaction[];
  fullState: GPAppState;
  onSavePanchayat: (next: PanchayatProfile) => void;
  onSavePaymentAccount: (next: OwnerPaymentAccount) => void;
  onImportState: (imported: GPAppState) => void;
  onResetToSeed: () => void;
}

export function AccountSettingsView({
  panchayat,
  paymentAccount,
  feeTransactions,
  fullState,
  onSavePanchayat,
  onSavePaymentAccount,
  onImportState,
  onResetToSeed,
}: AccountSettingsViewProps) {
  const [accountForm, setAccountForm] = useState<OwnerPaymentAccount>(paymentAccount);
  const [gpForm, setGpForm] = useState<PanchayatProfile>(panchayat);
  const [savedBanner, setSavedBanner] = useState<string>('');
  const [importError, setImportError] = useState<string>('');

  useEffect(() => {
    setGpForm(panchayat);
  }, [panchayat]);

  useEffect(() => {
    setAccountForm(paymentAccount);
  }, [paymentAccount]);

  const totalEarned = feeTransactions.reduce((sum, tx) => sum + tx.amountRs, 0);

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    onSavePaymentAccount({
      ...accountForm,
      utaraFeeRs: Math.max(1, Math.round(accountForm.utaraFeeRs || 10)),
    });
    setSavedBanner('तुमचे UPI व बँक खाते तपशील यशस्वीरित्या जतन केले आहेत. आता सर्व गावांमधील ₹१० उतारा शुल्क थेट याच खात्यात जमा होतील.');
    setTimeout(() => setSavedBanner(''), 4000);
  };

  const handleSaveGp = (e: React.FormEvent) => {
    e.preventDefault();
    onSavePanchayat(gpForm);
    setSavedBanner(`"${gpForm.panchayatName}" ची कार्यालय माहिती अद्ययावत केली आहे.`);
    setTimeout(() => setSavedBanner(''), 3500);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(fullState, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grampanchayat_namuna_8_9_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError('');
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as GPAppState;
        if (!parsed || !Array.isArray(parsed.villages) || parsed.villages.length === 0) {
          setImportError('अवैध बॅकअप फाइल. कृपया योग्य JSON फाइल निवडा.');
          return;
        }
        onImportState(parsed);
        setSavedBanner('सर्व गावांचा बॅकअप डेटा यशस्वीरित्या रिस्टोअर केला आहे.');
      } catch {
        setImportError('फाइल वाचताना त्रुटी आली.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {savedBanner && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs sm:text-sm font-medium text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
          <span>{savedBanner}</span>
        </div>
      )}

      {/* Top Two-Column Forms: Direct Account + Active GP Office */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Owner UPI / Bank Account Form */}
        <form
          onSubmit={handleSaveAccount}
          className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
        >
          <div>
            <h2 className="text-base font-bold text-slate-900">
              १. माझे थेट पेमेंट खाते (₹१० उतारा शुल्क प्राप्ती)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              कोणत्याही गावाचा नमुना ८ व नमुना ९ PDF उतारा डाउनलोड करताना आकारले जाणारे ₹१० थेट खालील UPI व बँक खात्यावर येतील.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                खातेदाराचे पूर्ण नाव (बँक/UPI प्रमाणे)
              </label>
              <input
                type="text"
                required
                value={accountForm.accountHolderName}
                onChange={(e) =>
                  setAccountForm({ ...accountForm, accountHolderName: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                थेट UPI ID (GPay / PhonePe / Paytm / BHIM)
              </label>
              <input
                type="text"
                required
                value={accountForm.upiId}
                onChange={(e) =>
                  setAccountForm({ ...accountForm, upiId: e.target.value.trim() })
                }
                placeholder="उदा. 9850123456@ybl किंवा name@okaxis"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 focus:border-blue-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">बँकेचे नाव</label>
              <input
                type="text"
                value={accountForm.bankName}
                onChange={(e) =>
                  setAccountForm({ ...accountForm, bankName: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                खाते क्र. (शेवटचे ४ अंक)
              </label>
              <input
                type="text"
                maxLength={4}
                value={accountForm.accountLast4}
                onChange={(e) =>
                  setAccountForm({ ...accountForm, accountLast4: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:border-blue-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">IFSC कोड</label>
              <input
                type="text"
                value={accountForm.ifscCode}
                onChange={(e) =>
                  setAccountForm({ ...accountForm, ifscCode: e.target.value.toUpperCase() })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:border-blue-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                प्रति उतारा शुल्क (₹)
              </label>
              <input
                type="number"
                min={1}
                value={accountForm.utaraFeeRs}
                onChange={(e) =>
                  setAccountForm({ ...accountForm, utaraFeeRs: Number(e.target.value) || 10 })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-blue-700 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-blue-800 transition-colors whitespace-nowrap"
          >
            <Save className="h-4 w-4" />
            पेमेंट खाते जतन करा
          </button>
        </form>

        {/* Active Panchayat Office Form */}
        <form
          onSubmit={handleSaveGp}
          className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
        >
          <div>
            <h2 className="text-base font-bold text-slate-900">
              २. सक्रिय ग्रामपंचायत कार्यालय माहिती (PDF उतारा शीर्षक)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              डाउनलोड होणाऱ्या नमुना ८ व नमुना ९ PDF उताऱ्यावर या ग्रामपंचायतीचे नाव व पत्ता छापला जाईल.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">ग्रामपंचायतीचे नाव</label>
              <input
                type="text"
                required
                value={gpForm.panchayatName}
                onChange={(e) => setGpForm({ ...gpForm, panchayatName: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">तालुका</label>
              <input
                type="text"
                value={gpForm.taluka}
                onChange={(e) => setGpForm({ ...gpForm, taluka: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">जिल्हा</label>
              <input
                type="text"
                value={gpForm.district}
                onChange={(e) => setGpForm({ ...gpForm, district: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">ग्रामसेवक नाव</label>
              <input
                type="text"
                value={gpForm.gramsevakName}
                onChange={(e) => setGpForm({ ...gpForm, gramsevakName: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">सरपंच नाव</label>
              <input
                type="text"
                value={gpForm.sarpanchName}
                onChange={(e) => setGpForm({ ...gpForm, sarpanchName: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">आर्थिक वर्ष</label>
              <input
                type="text"
                value={gpForm.financialYear}
                onChange={(e) => setGpForm({ ...gpForm, financialYear: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">कर दर ठराव क्र.</label>
              <input
                type="text"
                value={gpForm.resolutionNo}
                onChange={(e) => setGpForm({ ...gpForm, resolutionNo: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-700 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <Save className="h-4 w-4" />
            ग्रामपंचायत माहिती जतन करा
          </button>
        </form>
      </div>

      {/* Rs 10 Fee Collection Ledger */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              ३. उतारा डाउनलोड शुल्क जमा वही (सर्व गावांमधून थेट खात्यावर जमा रक्कम)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              डाउनलोड केलेल्या प्रत्येक नमुना ८ व ९ उताऱ्याचे ₹१० व्यवहार व पावती तपशील
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">एकूण जमा शुल्क ({feeTransactions.length} उतारे)</div>
            <div className="text-lg font-bold font-mono tabular-nums text-emerald-700">
              ₹ {formatINR(totalEarned)}.00
            </div>
          </div>
        </div>

        {feeTransactions.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            अद्याप कोणतेही उतारा डाउनलोड व्यवहार झालेले नाहीत.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="py-2.5 px-4 font-semibold">पावती क्र.</th>
                  <th className="py-2.5 px-4 font-semibold">ग्रामपंचायत</th>
                  <th className="py-2.5 px-4 font-semibold">नमुना प्रकार</th>
                  <th className="py-2.5 px-4 font-semibold">मिळकत क्र. / मालक</th>
                  <th className="py-2.5 px-4 font-semibold">UTR / Ref क्र.</th>
                  <th className="py-2.5 px-4 font-semibold text-right">रक्कम</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {feeTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono text-xs font-semibold text-slate-900">
                      {tx.receiptNo}
                    </td>
                    <td className="py-2.5 px-4 text-xs font-medium text-slate-700">
                      {tx.panchayatName || panchayat.panchayatName}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700">
                      {tx.documentType === 'namuna8'
                        ? 'नमुना क्र. ८ उतारा'
                        : tx.documentType === 'namuna9'
                        ? 'नमुना क्र. ९ बिल'
                        : tx.documentType === 'namuna8_register'
                        ? 'नमुना क्र. ८ पूर्ण रजिस्टर'
                        : 'नमुना क्र. ९ पूर्ण रजिस्टर'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-900">
                      <span className="font-mono font-semibold">{tx.propertyNo}</span> · {tx.ownerName}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs text-slate-700">
                      {tx.utrNumber}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold tabular-nums text-emerald-700">
                      +₹{tx.amountRs}.00
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Backup & Reset */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">सर्व गावांचा डेटा बॅकअप व रिस्टोअर</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            सर्व ग्रामपंचायतींचे नमुना ८, नमुना ९ व पावती नोंदी JSON फाइल स्वरूपात सुरक्षित ठेवा.
          </p>
          {importError && <p className="text-xs text-red-700 mt-1">{importError}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            बॅकअप डाउनलोड
          </button>

          <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap">
            <Upload className="h-3.5 w-3.5" />
            बॅकअप रिस्टोअर
            <input
              type="file"
              accept="application/json"
              onChange={handleImportJson}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={onResetToSeed}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            नमुना डेटा रीसेट
          </button>
        </div>
      </div>
    </div>
  );
}
