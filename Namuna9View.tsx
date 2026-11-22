import { useMemo, useState } from 'react';
import {
  Download,
  IndianRupee,
  Pencil,
  PlusCircle,
  Search,
  X,
} from 'lucide-react';
import {
  Namuna9Record,
  PanchayatProfile,
  PropertyAssessment,
  TaxCollectionPayment,
} from '../types/grampanchayat';
import { buildAlphabeticalNamuna9Rows, formatINR } from '../utils/taxCalculator';

interface Namuna9ViewProps {
  panchayat: PanchayatProfile;
  properties: PropertyAssessment[];
  namuna9Records: Record<string, Namuna9Record>;
  utaraFeeRs: number;
  onUpdateNamuna9Adjustments: (
    propertyId: string,
    patch: { previousArrears: number; penaltyOrInterest: number; rebateOrDiscount: number }
  ) => void;
  onRecordPayment: (propertyId: string, payment: Omit<TaxCollectionPayment, 'id'>) => void;
  onRequestPdfDownload: (property: PropertyAssessment) => void;
  onRequestFullRegisterPdf: () => void;
}

type StatusFilter = 'all' | 'paid' | 'partial' | 'due';

export function Namuna9View({
  panchayat,
  properties,
  namuna9Records,
  utaraFeeRs,
  onUpdateNamuna9Adjustments,
  onRecordPayment,
  onRequestPdfDownload,
  onRequestFullRegisterPdf,
}: Namuna9ViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useState<'property' | 'consolidated'>('property');

  const [paymentModalProp, setPaymentModalProp] = useState<PropertyAssessment | null>(null);
  const [payReceiptNo, setPayReceiptNo] = useState('');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<'UPI' | 'नगद' | 'धनादेश'>('UPI');
  const [payNote, setPayNote] = useState('');

  const [adjModalProp, setAdjModalProp] = useState<PropertyAssessment | null>(null);
  const [prevArrears, setPrevArrears] = useState<number>(0);
  const [penalty, setPenalty] = useState<number>(0);
  const [rebate, setRebate] = useState<number>(0);

  const rows = useMemo(() => {
    return properties.map((prop) => {
      const rec: Namuna9Record = namuna9Records[prop.id] ?? {
        propertyId: prop.id,
        financialYear: panchayat.financialYear,
        previousArrears: 0,
        penaltyOrInterest: 0,
        rebateOrDiscount: 0,
        payments: [],
      };
      const grossDemand = Math.max(
        0,
        rec.previousArrears + prop.totalAnnualTax + rec.penaltyOrInterest - rec.rebateOrDiscount
      );
      const totalPaid = rec.payments.reduce((s, p) => s + p.amountPaid, 0);
      const balanceDue = Math.max(0, grossDemand - totalPaid);
      const status: 'paid' | 'partial' | 'due' =
        balanceDue === 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'due';

      return {
        prop,
        rec,
        grossDemand,
        totalPaid,
        balanceDue,
        status,
      };
    });
  }, [properties, namuna9Records, panchayat.financialYear]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.prop.propertyNo.toLowerCase().includes(q) ||
        r.prop.ownerName.toLowerCase().includes(q) ||
        r.prop.wardName.toLowerCase().includes(q)
      );
    });
  }, [rows, searchQuery, statusFilter]);

  const consolidatedRows = useMemo(
    () => buildAlphabeticalNamuna9Rows(properties, namuna9Records, panchayat.financialYear),
    [properties, namuna9Records, panchayat.financialYear]
  );

  const filteredConsolidatedRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return consolidatedRows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.ownerName.toLowerCase().includes(q) ||
        r.spouseNames.toLowerCase().includes(q) ||
        r.propertyNos.some((p) => p.toLowerCase().includes(q))
      );
    });
  }, [consolidatedRows, searchQuery, statusFilter]);

  const kpis = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.totalDemand += r.grossDemand;
        acc.totalCollected += r.totalPaid;
        acc.totalBalance += r.balanceDue;
        if (r.status === 'paid') acc.paidCount += 1;
        return acc;
      },
      { totalDemand: 0, totalCollected: 0, totalBalance: 0, paidCount: 0 }
    );
  }, [rows]);

  const openPaymentModal = (prop: PropertyAssessment, balanceDue: number) => {
    setPaymentModalProp(prop);
    setPayReceiptNo(`GP-10/2026/${String(Math.floor(100 + Math.random() * 899))}`);
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayAmount(balanceDue > 0 ? balanceDue : prop.totalAnnualTax);
    setPayMode('UPI');
    setPayNote('वार्षिक कर वसुली');
  };

  const openAdjModal = (prop: PropertyAssessment, rec: Namuna9Record) => {
    setAdjModalProp(prop);
    setPrevArrears(rec.previousArrears);
    setPenalty(rec.penaltyOrInterest);
    setRebate(rec.rebateOrDiscount);
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalProp || payAmount <= 0) return;
    onRecordPayment(paymentModalProp.id, {
      receiptNo: payReceiptNo.trim() || `GP-10/${Date.now()}`,
      date: payDate,
      amountPaid: Math.round(payAmount),
      mode: payMode,
      note: payNote.trim(),
    });
    setPaymentModalProp(null);
  };

  const handleSaveAdjustments = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjModalProp) return;
    onUpdateNamuna9Adjustments(adjModalProp.id, {
      previousArrears: Math.max(0, Math.round(prevArrears)),
      penaltyOrInterest: Math.max(0, Math.round(penalty)),
      rebateOrDiscount: Math.max(0, Math.round(rebate)),
    });
    setAdjModalProp(null);
  };

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">एकूण कर मागणी (नमुना ९)</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            ₹{formatINR(kpis.totalDemand)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">थकबाकी + चालू पट्टी</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">एकूण कर वसुली</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
            ₹{formatINR(kpis.totalCollected)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">जमा झालेल्या पावत्या</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">येणे बाकी (शिल्लक थकबाकी)</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-red-700 mt-1">
            ₹{formatINR(kpis.totalBalance)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">वसुली प्रलंबित रक्कम</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">पूर्ण कर भरलेले खातेदार</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-blue-800 mt-1">
            {kpis.paidCount} / {rows.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">आर्थिक वर्ष {panchayat.financialYear}</div>
        </div>
      </div>

      {/* Filter & Register Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit overflow-x-auto">
              <button
                type="button"
                onClick={() => setViewMode('property')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  viewMode === 'property'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                मिळकतनिहाय नोंदवही ({rows.length})
              </button>
              <button
                type="button"
                onClick={() => setViewMode('consolidated')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  viewMode === 'consolidated'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                खातेदारनिहाय एकत्रित — अल्फाबेटिकल ({consolidatedRows.length})
              </button>
            </div>

            <button
              type="button"
              disabled={properties.length === 0}
              onClick={onRequestFullRegisterPdf}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="h-4 w-4" />
              पूर्ण रजिस्टर PDF (₹{utaraFeeRs})
            </button>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="मिळकत क्र. किंवा खातेदाराचे नाव शोधा..."
                className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0 overflow-x-auto">
              {(
                [
                  { id: 'all', label: 'सर्व' },
                  { id: 'due', label: 'थकीत' },
                  { id: 'partial', label: 'अंशतः जमा' },
                  { id: 'paid', label: 'पूर्ण जमा' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    statusFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {viewMode === 'consolidated' ? (
          filteredConsolidatedRows.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              निवडलेल्या स्थितीनुसार कोणतीही खातेदार नोंद आढळली नाही.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="py-2.5 px-3.5 font-semibold">अ.क्र.</th>
                    <th className="py-2.5 px-3.5 font-semibold">खातेदाराचे नाव (अ–ज्ञ)</th>
                    <th className="py-2.5 px-3.5 font-semibold">एकत्रित मिळकत क्र.</th>
                    <th className="py-2.5 px-3.5 font-semibold text-right">मागील थकबाकी</th>
                    <th className="py-2.5 px-3.5 font-semibold text-right">चालू कर (एकत्रित)</th>
                    <th className="py-2.5 px-3.5 font-semibold text-right">एकूण देय</th>
                    <th className="py-2.5 px-3.5 font-semibold text-right">वसूल रक्कम</th>
                    <th className="py-2.5 px-3.5 font-semibold text-right">शिल्लक</th>
                    <th className="py-2.5 px-3.5 font-semibold">स्थिती</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredConsolidatedRows.map((row, idx) => (
                    <tr key={row.ownerKey} className="hover:bg-slate-50">
                      <td className="py-3 px-3.5 font-mono text-slate-600">{idx + 1}</td>
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-slate-900">{row.ownerName}</div>
                        {row.spouseNames && (
                          <div className="text-[11px] text-slate-500">
                            सहधारक: {row.spouseNames}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="font-mono font-bold text-slate-900">
                          {row.propertyNos.join(', ')}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          वार्ड {row.wardNos.join(', ')}
                          {row.propertyCount > 1
                            ? ` · ${row.propertyCount} नोंदींची बेरीज एकत्रित`
                            : ' · १ मिळकत'}
                        </div>
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono tabular-nums text-slate-700">
                        ₹{formatINR(row.previousArrears)}
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <div className="font-mono font-semibold tabular-nums text-slate-800">
                          ₹{formatINR(row.totalAnnualTax)}
                        </div>
                        <div className="text-[10.5px] font-mono tabular-nums text-slate-500">
                          घर: ₹{formatINR(row.houseTax)} · पाणी: ₹{formatINR(row.waterTax)}
                        </div>
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono font-semibold tabular-nums text-slate-900">
                        ₹{formatINR(row.grossDemand)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono font-semibold tabular-nums text-emerald-700">
                        ₹{formatINR(row.totalPaid)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono font-bold tabular-nums text-red-700">
                        ₹{formatINR(row.balanceDue)}
                      </td>
                      <td className="py-3 px-3.5">
                        <span
                          className={`text-xs font-semibold ${
                            row.status === 'paid'
                              ? 'text-emerald-700'
                              : row.status === 'partial'
                              ? 'text-amber-700'
                              : 'text-red-700'
                          }`}
                        >
                          {row.status === 'paid'
                            ? 'पूर्ण जमा'
                            : row.status === 'partial'
                            ? 'अंशतः जमा'
                            : 'थकीत'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : filteredRows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            निवडलेल्या स्थितीनुसार कोणतीही नोंद आढळली नाही.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="py-2.5 px-3.5 font-semibold">मिळकत क्र.</th>
                  <th className="py-2.5 px-3.5 font-semibold">खातेदाराचे नाव</th>
                  <th className="py-2.5 px-3.5 font-semibold text-right">मागील थकबाकी</th>
                  <th className="py-2.5 px-3.5 font-semibold text-right">चालू कर (नमुना ८)</th>
                  <th className="py-2.5 px-3.5 font-semibold text-right">एकूण देय</th>
                  <th className="py-2.5 px-3.5 font-semibold text-right">वसूल रक्कम</th>
                  <th className="py-2.5 px-3.5 font-semibold text-right">शिल्लक</th>
                  <th className="py-2.5 px-3.5 font-semibold">स्थिती</th>
                  <th className="py-2.5 px-3.5 font-semibold text-right">कृती</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredRows.map(({ prop, rec, grossDemand, totalPaid, balanceDue, status }) => (
                  <tr key={prop.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3.5 font-mono font-bold text-slate-900">
                      {prop.propertyNo}
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="font-semibold text-slate-900">{prop.ownerName}</div>
                      <div className="text-[11px] text-slate-500">
                        वार्ड {prop.wardNo} · {rec.payments.length} पावत्या
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono tabular-nums text-slate-700">
                      ₹{formatINR(rec.previousArrears)}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono tabular-nums text-slate-700">
                      ₹{formatINR(prop.totalAnnualTax)}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-semibold tabular-nums text-slate-900">
                      ₹{formatINR(grossDemand)}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-semibold tabular-nums text-emerald-700">
                      ₹{formatINR(totalPaid)}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-bold tabular-nums text-red-700">
                      ₹{formatINR(balanceDue)}
                    </td>
                    <td className="py-3 px-3.5">
                      <span
                        className={`text-xs font-semibold ${
                          status === 'paid'
                            ? 'text-emerald-700'
                            : status === 'partial'
                            ? 'text-amber-700'
                            : 'text-red-700'
                        }`}
                      >
                        {status === 'paid'
                          ? 'पूर्ण जमा'
                          : status === 'partial'
                          ? 'अंशतः जमा'
                          : 'थकीत'}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openAdjModal(prop, rec)}
                          title="थकबाकी / दंड संपादन"
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                        >
                          <Pencil className="h-3 w-3 inline mr-1" />
                          थकबाकी
                        </button>
                        <button
                          type="button"
                          onClick={() => openPaymentModal(prop, balanceDue)}
                          className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 whitespace-nowrap"
                        >
                          <PlusCircle className="h-3 w-3 inline mr-1" />
                          वसुली नोंद
                        </button>
                        <button
                          type="button"
                          onClick={() => onRequestPdfDownload(prop)}
                          className="rounded-md bg-blue-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-800 whitespace-nowrap"
                        >
                          <Download className="h-3 w-3 inline mr-1" />
                          PDF (₹{utaraFeeRs})
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Tax Collection Payment Modal */}
      {paymentModalProp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">कर वसुली पावती नोंद (नमुना ९/१०)</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  मिळकत क्र. {paymentModalProp.propertyNo} · {paymentModalProp.ownerName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalProp(null)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">पावती क्रमांक</label>
                <input
                  type="text"
                  required
                  value={payReceiptNo}
                  onChange={(e) => setPayReceiptNo(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-slate-900 focus:border-blue-700 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">दिनांक</label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">माध्यम</label>
                  <select
                    value={payMode}
                    onChange={(e) => setPayMode(e.target.value as 'UPI' | 'नगद' | 'धनादेश')}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-700 focus:outline-none"
                  >
                    <option value="UPI">UPI</option>
                    <option value="नगद">नगद</option>
                    <option value="धनादेश">धनादेश</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">जमा रक्कम (₹)</label>
                <div className="relative">
                  <IndianRupee className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min={1}
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(Number(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-2 font-mono font-bold text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">शेरा</label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-700 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalProp(null)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800"
                >
                  पावती जमा करा
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Arrears / Penalty / Rebate Modal */}
      {adjModalProp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">मागील थकबाकी व दंड/सूट सुधारणा</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  मिळकत क्र. {adjModalProp.propertyNo} · {adjModalProp.ownerName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAdjModalProp(null)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustments} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">मागील थकबाकी (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={prevArrears}
                  onChange={(e) => setPrevArrears(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-slate-900 focus:border-blue-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">दंड / व्याज (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={penalty}
                  onChange={(e) => setPenalty(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-slate-900 focus:border-blue-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">सूट / माफी (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={rebate}
                  onChange={(e) => setRebate(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-slate-900 focus:border-blue-700 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjModalProp(null)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800"
                >
                  बदल जतन करा
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
