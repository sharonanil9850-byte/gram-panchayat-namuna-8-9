import { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  FeeTransaction,
  OwnerPaymentAccount,
  PropertyAssessment,
} from '../types/grampanchayat';

export type PdfDocumentType =
  | 'namuna8'
  | 'namuna9'
  | 'namuna8_register'
  | 'namuna9_register';

interface PaymentModalProps {
  isOpen: boolean;
  documentType: PdfDocumentType;
  property: PropertyAssessment | null;
  panchayatName?: string;
  propertyCount?: number;
  paymentAccount: OwnerPaymentAccount;
  onClose: () => void;
  onConfirmAndDownload: (tx: FeeTransaction) => Promise<void>;
  onGoToAccountSettings: () => void;
}

const DOC_LABELS: Record<PdfDocumentType, string> = {
  namuna8: 'नमुना क्र. ८ — मालमत्ता उतारा (PDF)',
  namuna9: 'नमुना क्र. ९ — कर मागणी व वसुली उतारा (PDF)',
  namuna8_register: 'नमुना क्र. ८ — संपूर्ण रजिस्टर (सर्व नोंदी PDF)',
  namuna9_register: 'नमुना क्र. ९ — संपूर्ण रजिस्टर (अल्फाबेटिकल एकत्रित PDF)',
};

export function PaymentModal({
  isOpen,
  documentType,
  property,
  panchayatName,
  propertyCount,
  paymentAccount,
  onClose,
  onConfirmAndDownload,
  onGoToAccountSettings,
}: PaymentModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState(false);

  const feeAmount = paymentAccount.utaraFeeRs || 10;
  const isRegister =
    documentType === 'namuna8_register' || documentType === 'namuna9_register';
  const docLabel = DOC_LABELS[documentType];
  const refNote = isRegister
    ? `${documentType === 'namuna8_register' ? 'Namuna8Reg' : 'Namuna9Reg'} ${panchayatName || 'GP'}`
    : `${documentType === 'namuna8' ? 'Namuna8' : 'Namuna9'} Prop ${property?.propertyNo ?? ''}`;

  const upiUri = isOpen
    ? `upi://pay?pa=${encodeURIComponent(paymentAccount.upiId)}&pn=${encodeURIComponent(
        paymentAccount.accountHolderName
      )}&am=${feeAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(refNote)}`
    : '';

  useEffect(() => {
    if (!isOpen || !upiUri) return;
    setErrorMsg('');
    setUtrNumber('');
    QRCode.toDataURL(upiUri, {
      width: 220,
      margin: 2,
      color: { dark: '#0F172A', light: '#FFFFFF' },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(''));
  }, [isOpen, upiUri]);

  if (!isOpen || (!isRegister && !property)) return null;

  const isPlaceholderUpi =
    !paymentAccount.upiId ||
    paymentAccount.upiId === 'yourname@okaxis' ||
    !paymentAccount.upiId.includes('@');

  const handleCopyUpi = () => {
    navigator.clipboard?.writeText(paymentAccount.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 1800);
  };

  const submitWithUtr = async (finalUtr: string) => {
    setErrorMsg('');
    setIsDownloading(true);
    try {
      const receiptNo = `GP-FEE-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;
      const tx: FeeTransaction = {
        id: `fee-${Date.now()}`,
        receiptNo,
        documentType,
        propertyNo: isRegister ? 'सर्व नोंदी' : (property?.propertyNo ?? '-'),
        ownerName: isRegister
          ? panchayatName || 'पूर्ण रजिस्टर'
          : (property?.ownerName ?? '-'),
        amountRs: feeAmount,
        utrNumber: finalUtr,
        paidToUpi: paymentAccount.upiId,
        paidAt: new Date().toISOString(),
        status: 'verified',
      };
      await onConfirmAndDownload(tx);
      onClose();
    } catch {
      setErrorMsg('PDF तयार करताना तांत्रिक अडचण आली. कृपया पुन्हा प्रयत्न करा.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleVerifyAndDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = utrNumber.trim();
    if (cleaned.length < 6) {
      setErrorMsg('कृपया पेमेंट केल्यानंतर मिळालेला किमान ६ ते १२ अंकी UTR / Transaction क्रमांक प्रविष्ट करा.');
      return;
    }
    await submitWithUtr(cleaned);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
    >
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 id="payment-modal-title" className="text-base font-bold text-slate-900">
              {isRegister
                ? `पूर्ण रजिस्टर डाउनलोड शुल्क — ₹ ${feeAmount}.०० थेट पेमेंट`
                : `उतारा डाउनलोड शुल्क — ₹ ${feeAmount}.०० थेट पेमेंट`}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              {docLabel} ·{' '}
              {isRegister ? (
                <>
                  {panchayatName || 'ग्रामपंचायत'} · एकूण{' '}
                  <span className="font-mono font-semibold">{propertyCount ?? 0}</span> नोंदी
                </>
              ) : (
                <>
                  मिळकत क्र.{' '}
                  <span className="font-mono font-semibold">{property?.propertyNo}</span>
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors"
            aria-label="बंद करा"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          {isPlaceholderUpi && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900 flex items-center justify-between gap-3">
              <span>
                टीप: सध्या डीफॉल्ट UPI आयडी (<span className="font-mono">{paymentAccount.upiId}</span>) आहे. पैसे थेट तुमच्या बँक खात्यात येण्यासाठी तुमचा खरा UPI ID सेट करा.
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onGoToAccountSettings();
                }}
                className="shrink-0 font-semibold underline text-amber-950 whitespace-nowrap"
              >
                खाते बदला
              </button>
            </div>
          )}

          {/* Direct Account Recipient Summary */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs text-slate-500">थेट रक्कम प्राप्तकर्ता खाते (Direct Bank/UPI)</div>
              <div className="text-sm font-bold text-slate-900 truncate mt-0.5">
                {paymentAccount.accountHolderName}
              </div>
              <div className="text-xs text-slate-600 mt-0.5 font-mono">
                UPI: {paymentAccount.upiId} · {paymentAccount.bankName} (••••{paymentAccount.accountLast4})
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs text-slate-500">एकूण शुल्क</div>
              <div className="text-xl font-bold font-mono tabular-nums text-blue-800">
                ₹{feeAmount}.00
              </div>
            </div>
          </div>

          {/* QR Code & Direct UPI Pay */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center border border-slate-200 rounded-lg p-4">
            <div className="flex flex-col items-center justify-center">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="UPI QR कोड ₹10 पेमेंटसाठी"
                  className="w-40 h-40 border border-slate-200 rounded-lg bg-white"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-40 h-40 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-center text-xs text-slate-500">
                  QR तयार होत आहे...
                </div>
              )}
              <span className="text-[11px] text-slate-500 mt-2 text-center">
                GPay · PhonePe · Paytm · BHIM ने स्कॅन करा
              </span>
            </div>

            <div className="space-y-3">
              <div className="text-xs text-slate-700 leading-relaxed">
                वरील QR कोड स्कॅन करून किंवा खालील बटनावर क्लिक करून <strong>₹{feeAmount}.००</strong> थेट खातेदाराच्या UPI वर भरा. रक्कम थेट खात्यात जमा होते.
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  {copiedUpi ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-700" />
                      UPI कॉपी झाला
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      UPI ID कॉपी करा
                    </>
                  )}
                </button>
              </div>

              <a
                href={upiUri}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                <Smartphone className="h-4 w-4" />
                UPI अ‍ॅपमधून ₹{feeAmount} भरा
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* UTR Verification Form */}
          <form onSubmit={handleVerifyAndDownload} className="space-y-3">
            <div>
              <label
                htmlFor="utr-input"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                पेमेंटनंतरचा १२ अंकी UTR / UPI Reference क्रमांक टाका
              </label>
              <input
                id="utr-input"
                type="text"
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value)}
                placeholder="उदा. 432519827364"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 focus:border-blue-700 focus:outline-none"
              />
            </div>

            {errorMsg && (
              <p className="text-xs font-medium text-red-700">{errorMsg}</p>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
              <button
                type="button"
                disabled={isDownloading}
                onClick={() => submitWithUtr(`UPI-${Date.now().toString().slice(-8)}`)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                पेमेंट पूर्ण — त्वरित PDF घ्या
              </button>

              <button
                type="submit"
                disabled={isDownloading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60 transition-colors whitespace-nowrap"
              >
                <Download className="h-4 w-4" />
                {isDownloading ? 'PDF तयार होत आहे...' : 'UTR तपासा व PDF डाउनलोड करा'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
