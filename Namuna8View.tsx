import { useMemo, useState } from 'react';
import {
  Download,
  Eye,
  FilePlus2,
  Pencil,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  ConstructionType,
  PanchayatProfile,
  PropertyAssessment,
  UsageType,
} from '../types/grampanchayat';
import {
  calculateMaharashtraGpTax,
  CONSTRUCTION_RATE_RULES,
  formatINR,
  USAGE_FACTORS,
} from '../utils/taxCalculator';

interface Namuna8ViewProps {
  panchayat: PanchayatProfile;
  properties: PropertyAssessment[];
  utaraFeeRs: number;
  onAddProperty: (prop: Omit<PropertyAssessment, 'id' | 'updatedAt'>) => void;
  onUpdateProperty: (id: string, prop: Omit<PropertyAssessment, 'id' | 'updatedAt'>) => void;
  onDeleteProperty: (id: string) => void;
  onRequestPdfDownload: (property: PropertyAssessment) => void;
  onRequestFullRegisterPdf: () => void;
}

interface PropertyFormState {
  propertyNo: string;
  wardNo: string;
  wardName: string;
  surveyOrGutNo: string;
  ownerName: string;
  spouseName: string;
  occupantName: string;
  constructionType: ConstructionType;
  usageType: UsageType;
  constructionYear: number;
  lengthFt: number;
  widthFt: number;
  readyReckonerRate: number;
  ratePaisePer1000: number;
  lightingTax: number;
  healthTax: number;
  generalWaterTax: number;
  hasPrivateTap: boolean;
  specialWaterTax: number;
  encumbranceOrRemarks: string;
  pageNo: string;
  rrLandRate: number;
  rrBuildingRate: number;
  rrConstructionRate: number;
}

function getDefaultFormState(): PropertyFormState {
  const r = CONSTRUCTION_RATE_RULES.rcc;
  return {
    propertyNo: '',
    wardNo: '१',
    wardName: 'मुख्य रस्ता',
    surveyOrGutNo: 'गट क्र. ',
    ownerName: '',
    spouseName: '',
    occupantName: 'स्वतः',
    constructionType: 'rcc',
    usageType: 'residential',
    constructionYear: 2020,
    lengthFt: 30,
    widthFt: 25,
    readyReckonerRate: r.defaultReadyReckonerSqM,
    ratePaisePer1000: r.defaultPaisePer1000,
    lightingTax: r.defaultLightingTax,
    healthTax: r.defaultHealthTax,
    generalWaterTax: 150,
    hasPrivateTap: true,
    specialWaterTax: 600,
    encumbranceOrRemarks: 'बोजा नाही',
    pageNo: '१',
    rrLandRate: Math.round(r.defaultReadyReckonerSqM * 0.25),
    rrBuildingRate: r.defaultReadyReckonerSqM,
    rrConstructionRate: Math.round(r.defaultReadyReckonerSqM * 0.75),
  };
}

export function Namuna8View({
  panchayat,
  properties,
  utaraFeeRs,
  onAddProperty,
  onUpdateProperty,
  onDeleteProperty,
  onRequestPdfDownload,
  onRequestFullRegisterPdf,
}: Namuna8ViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [wardFilter, setWardFilter] = useState<string>('all');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(
    properties[0]?.id ?? ''
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<PropertyFormState>(getDefaultFormState());

  const wards = useMemo(() => {
    const set = new Set(properties.map((p) => p.wardNo));
    return Array.from(set);
  }, [properties]);

  const filteredProperties = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return properties.filter((p) => {
      if (wardFilter !== 'all' && p.wardNo !== wardFilter) return false;
      if (!q) return true;
      return (
        p.propertyNo.toLowerCase().includes(q) ||
        p.ownerName.toLowerCase().includes(q) ||
        p.spouseName.toLowerCase().includes(q) ||
        p.surveyOrGutNo.toLowerCase().includes(q) ||
        p.wardName.toLowerCase().includes(q)
      );
    });
  }, [properties, searchQuery, wardFilter]);

  const selectedProperty =
    properties.find((p) => p.id === selectedPropertyId) ??
    filteredProperties[0] ??
    null;

  const totals = useMemo(() => {
    return properties.reduce(
      (acc, p) => {
        acc.capital += p.capitalValue;
        acc.houseTax += p.houseTax;
        acc.totalTax += p.totalAnnualTax;
        return acc;
      },
      { capital: 0, houseTax: 0, totalTax: 0 }
    );
  }, [properties]);

  const liveCalc = useMemo(() => {
    const areaSqFt = Math.max(0, Math.round(formState.lengthFt * formState.widthFt));
    return {
      areaSqFt,
      ...calculateMaharashtraGpTax({
        constructionType: formState.constructionType,
        usageType: formState.usageType,
        constructionYear: formState.constructionYear,
        areaSqFt,
        readyReckonerRate: formState.readyReckonerRate,
        ratePaisePer1000: formState.ratePaisePer1000,
        lightingTax: formState.lightingTax,
        healthTax: formState.healthTax,
        generalWaterTax: formState.generalWaterTax,
        hasPrivateTap: formState.hasPrivateTap,
        specialWaterTax: formState.specialWaterTax,
      }),
    };
  }, [formState]);

  const openAddModal = () => {
    setEditingId(null);
    setFormState(getDefaultFormState());
    setIsFormOpen(true);
  };

  const openEditModal = (prop: PropertyAssessment) => {
    setEditingId(prop.id);
    setFormState({
      propertyNo: prop.propertyNo,
      wardNo: prop.wardNo,
      wardName: prop.wardName,
      surveyOrGutNo: prop.surveyOrGutNo,
      ownerName: prop.ownerName,
      spouseName: prop.spouseName,
      occupantName: prop.occupantName,
      constructionType: prop.constructionType,
      usageType: prop.usageType,
      constructionYear: prop.constructionYear,
      lengthFt: prop.lengthFt,
      widthFt: prop.widthFt,
      readyReckonerRate: prop.readyReckonerRate,
      ratePaisePer1000: Math.round(prop.houseTaxRatePer1000 * 100),
      lightingTax: prop.lightingTax,
      healthTax: prop.healthTax,
      generalWaterTax: prop.generalWaterTax,
      hasPrivateTap: prop.hasPrivateTap,
      specialWaterTax: prop.specialWaterTax,
      encumbranceOrRemarks: prop.encumbranceOrRemarks,
      pageNo: prop.pageNo ?? '१',
      rrLandRate:
        prop.rrLandRate ??
        (prop.constructionType === 'open_plot'
          ? prop.readyReckonerRate
          : Math.round(prop.readyReckonerRate * 0.25)),
      rrBuildingRate:
        prop.rrBuildingRate ??
        (prop.constructionType === 'open_plot' ? 0 : prop.readyReckonerRate),
      rrConstructionRate:
        prop.rrConstructionRate ??
        (prop.constructionType === 'open_plot'
          ? 0
          : Math.round(prop.readyReckonerRate * 0.75)),
    });
    setIsFormOpen(true);
  };

  const handleConstructionTypeChange = (nextType: ConstructionType) => {
    const r = CONSTRUCTION_RATE_RULES[nextType];
    const isPlot = nextType === 'open_plot';
    setFormState((prev) => ({
      ...prev,
      constructionType: nextType,
      readyReckonerRate: r.defaultReadyReckonerSqM,
      ratePaisePer1000: r.defaultPaisePer1000,
      lightingTax: r.defaultLightingTax,
      healthTax: r.defaultHealthTax,
      rrLandRate: isPlot
        ? r.defaultReadyReckonerSqM
        : Math.round(r.defaultReadyReckonerSqM * 0.25),
      rrBuildingRate: isPlot ? 0 : r.defaultReadyReckonerSqM,
      rrConstructionRate: isPlot
        ? 0
        : Math.round(r.defaultReadyReckonerSqM * 0.75),
    }));
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Omit<PropertyAssessment, 'id' | 'updatedAt'> = {
      propertyNo: formState.propertyNo.trim(),
      wardNo: formState.wardNo.trim(),
      wardName: formState.wardName.trim(),
      surveyOrGutNo: formState.surveyOrGutNo.trim(),
      ownerName: formState.ownerName.trim(),
      spouseName: formState.spouseName.trim(),
      occupantName: formState.occupantName.trim() || 'स्वतः',
      constructionType: formState.constructionType,
      usageType: formState.usageType,
      constructionYear: formState.constructionYear,
      lengthFt: formState.lengthFt,
      widthFt: formState.widthFt,
      areaSqFt: liveCalc.areaSqFt,
      areaSqM: liveCalc.areaSqM,
      readyReckonerRate: formState.readyReckonerRate,
      depreciationFactor: liveCalc.depreciationFactor,
      usageFactor: liveCalc.usageFactor,
      capitalValue: liveCalc.capitalValue,
      houseTaxRatePer1000: liveCalc.rateRsPer1000,
      houseTax: liveCalc.houseTax,
      lightingTax: liveCalc.lightingTax,
      healthTax: liveCalc.healthTax,
      generalWaterTax: liveCalc.generalWaterTax,
      hasPrivateTap: formState.hasPrivateTap,
      specialWaterTax: liveCalc.specialWaterTax,
      totalAnnualTax: liveCalc.totalAnnualTax,
      encumbranceOrRemarks: formState.encumbranceOrRemarks.trim() || 'बोजा नाही',
      pageNo: formState.pageNo.trim() || '१',
      rrLandRate: formState.rrLandRate,
      rrBuildingRate: formState.rrBuildingRate,
      rrConstructionRate: formState.rrConstructionRate,
    };

    if (editingId) {
      onUpdateProperty(editingId, payload);
      setSelectedPropertyId(editingId);
    } else {
      onAddProperty(payload);
    }
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">एकूण नोंदणीकृत मिळकती</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {properties.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">नमुना क्र. ८ नोंदवही</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">एकूण भांडवली मूल्य</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            ₹{formatINR(totals.capital)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">रेडीरेकनर व घसारा आधारित</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">एकूण वार्षिक घरपट्टी</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-blue-800 mt-1">
            ₹{formatINR(totals.houseTax)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">{panchayat.resolutionNo}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">एकूण कर आकारणी (सर्व पट्टी)</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
            ₹{formatINR(totals.totalTax)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">उतारा PDF शुल्क: ₹{utaraFeeRs}</div>
        </div>
      </div>

      {/* Register Table & Full-Width Official 27-Col Extract Preview */}
      <div className="space-y-6">
        {/* Property Register Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-2 min-w-0">
              <div className="relative flex-1 min-w-0">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="मिळकत क्र., घरमालकाचे नाव किंवा गट क्र. शोधा..."
                  className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                />
              </div>

              <select
                value={wardFilter}
                onChange={(e) => setWardFilter(e.target.value)}
                aria-label="वार्ड निवडा"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-700 focus:outline-none shrink-0"
              >
                <option value="all">सर्व वार्ड</option>
                {wards.map((w) => (
                  <option key={w} value={w}>
                    वार्ड {w}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={properties.length === 0}
                onClick={onRequestFullRegisterPdf}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-700 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="h-4 w-4" />
                पूर्ण रजिस्टर PDF (₹{utaraFeeRs})
              </button>

              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
              >
                <FilePlus2 className="h-4 w-4" />
                नवीन मिळकत जोडा
              </button>
            </div>
          </div>

          {filteredProperties.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <div className="text-sm font-semibold text-slate-700">
                शोधलेल्या निकषानुसार कोणतीही मालमत्ता आढळली नाही.
              </div>
              <p className="text-xs text-slate-500">
                कृपया शोध शब्द बदला किंवा नवीन मिळकत नमुना ८ मध्ये नोंदवा.
              </p>
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
              >
                <FilePlus2 className="h-4 w-4" />
                पहिली मिळकत नोंदवा
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="py-2.5 px-3.5 font-semibold">मिळकत क्र.</th>
                    <th className="py-2.5 px-3.5 font-semibold">मालक व पती/पत्नी</th>
                    <th className="py-2.5 px-3.5 font-semibold">प्रकार / क्षेत्रफळ</th>
                    <th className="py-2.5 px-3.5 font-semibold text-right">एकूण कर (₹)</th>
                    <th className="py-2.5 px-3.5 font-semibold text-right">कृती</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredProperties.map((prop) => {
                    const isSelected = selectedProperty?.id === prop.id;
                    return (
                      <tr
                        key={prop.id}
                        onClick={() => setSelectedPropertyId(prop.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-3.5 align-top">
                          <div className="font-mono font-bold text-slate-900">
                            {prop.propertyNo}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            वार्ड {prop.wardNo} · {prop.surveyOrGutNo}
                          </div>
                        </td>
                        <td className="py-3 px-3.5 align-top">
                          <div className="font-semibold text-slate-900">{prop.ownerName}</div>
                          {prop.spouseName && (
                            <div className="text-[11px] text-slate-500">
                              सहधारक: {prop.spouseName}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3.5 align-top">
                          <div className="text-slate-800">
                            {CONSTRUCTION_RATE_RULES[prop.constructionType].shortLabel}
                          </div>
                          <div className="text-[11px] font-mono tabular-nums text-slate-500">
                            {prop.areaSqFt} चौ.फूट ({prop.areaSqM} चौ.मी.)
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-right align-top">
                          <div className="font-mono font-bold tabular-nums text-slate-900">
                            ₹{formatINR(prop.totalAnnualTax)}
                          </div>
                          <div className="text-[11px] font-mono tabular-nums text-slate-500">
                            घरपट्टी: ₹{formatINR(prop.houseTax)}
                          </div>
                        </td>
                        <td
                          className="py-3 px-3.5 text-right align-top"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedPropertyId(prop.id)}
                              title="उतारा पहा"
                              className="rounded-md p-1.5 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(prop)}
                              title="संपादन करा"
                              className="rounded-md p-1.5 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteProperty(prop.id)}
                              title="नोंद हटवा"
                              className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Full-Width Official 27-Column Namuna 8 Register Extract Preview */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {selectedProperty ? (
            <>
              <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">
                    अधिकृत नमुना नं. ८ उतारा प्रिव्ह्यू (२७ रकाने आडवे स्वरूप)
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                    मिळकत क्र. {selectedProperty.propertyNo} — {selectedProperty.ownerName}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onRequestPdfDownload(selectedProperty)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="h-4 w-4" />
                  नमुना ८ उतारा PDF डाउनलोड (₹{utaraFeeRs})
                </button>
              </div>

              <div className="p-4 sm:p-6 overflow-x-auto bg-white">
                <div className="min-w-[980px] border border-slate-300 p-5 bg-white text-slate-900">
                  {/* Top Header Row matching screenshot */}
                  <div className="flex items-center justify-between gap-4">
                    <span className="inline-block rounded-lg border-2 border-sky-400 px-4 py-1 text-sm font-bold text-slate-900">
                      नमुना नं. ८
                    </span>
                    <div className="text-center text-sm sm:text-base font-bold text-slate-900">
                      सन {panchayat.financialYear} या वर्षासाठी कर आकारणी नोंदवही
                    </div>
                    <span className="inline-block rounded-lg border-2 border-sky-400 px-4 py-1 text-xs sm:text-sm font-bold text-slate-900">
                      पान क्र. {selectedProperty.pageNo || '१'}
                    </span>
                  </div>

                  {/* Office Line */}
                  <div className="text-center text-xs sm:text-sm font-bold text-slate-900 mt-3 mb-4">
                    कार्यालय ग्रामपंचायत {panchayat.panchayatName} &nbsp;&nbsp;&nbsp; ता. {panchayat.taluka || '------'} &nbsp;&nbsp;&nbsp; जि. {panchayat.district || '------'}
                  </div>

                  {/* Table Part 1: Columns १ to १२ */}
                  <table className="w-full border-collapse border border-slate-900 text-[11px] text-center">
                    <thead>
                      <tr className="font-bold bg-slate-50/70">
                        <th rowSpan={2} className="border border-slate-900 px-1.5 py-2 w-10">अ.क्र</th>
                        <th rowSpan={2} className="border border-slate-900 px-2 py-2">रस्त्याचे नाव</th>
                        <th rowSpan={2} className="border border-slate-900 px-2 py-2">सिटी सर्व्हे क्र.</th>
                        <th rowSpan={2} className="border border-slate-900 px-2 py-2">मालमत्ता क्र</th>
                        <th rowSpan={2} className="border border-slate-900 px-2 py-2">मालकाचे नाव</th>
                        <th rowSpan={2} className="border border-slate-900 px-2 py-2">भोगवटादाराचे नाव</th>
                        <th rowSpan={2} className="border border-slate-900 px-2 py-2">मालमत्तेचे वर्णन</th>
                        <th rowSpan={2} className="border border-slate-900 px-1.5 py-2">मिळकत बांधकामाचे वर्ष</th>
                        <th rowSpan={2} className="border border-slate-900 px-2 py-2">क्षेत्रफळ चौ. फुट / चौ.मी.</th>
                        <th colSpan={3} className="border border-slate-900 px-2 py-1.5">
                          रेडिरेकनर दर प्रति चौ.मि. (रुपये)
                        </th>
                      </tr>
                      <tr className="font-bold bg-slate-50/70">
                        <th className="border border-slate-900 px-1.5 py-1.5">जमीन</th>
                        <th className="border border-slate-900 px-1.5 py-1.5">इमारत</th>
                        <th className="border border-slate-900 px-1.5 py-1.5">बांधकाम</th>
                      </tr>
                      <tr className="font-semibold bg-white">
                        {['१', '२', '३', '४', '५', '६', '७', '८', '९', '१०', '११', '१२'].map((n) => (
                          <th key={n} className="border border-slate-900 py-1 font-medium">
                            {n}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="align-middle h-24">
                        <td className="border border-slate-900 px-1.5 py-2 font-mono">१</td>
                        <td className="border border-slate-900 px-2 py-2">
                          वार्ड {selectedProperty.wardNo} - {selectedProperty.wardName}
                        </td>
                        <td className="border border-slate-900 px-2 py-2">
                          {selectedProperty.surveyOrGutNo || '-'}
                        </td>
                        <td className="border border-slate-900 px-2 py-2 font-mono font-bold">
                          {selectedProperty.propertyNo}
                        </td>
                        <td className="border border-slate-900 px-2 py-2 font-semibold">
                          {selectedProperty.ownerName}
                          {selectedProperty.spouseName ? ` व ${selectedProperty.spouseName}` : ''}
                        </td>
                        <td className="border border-slate-900 px-2 py-2">
                          {selectedProperty.occupantName || 'स्वतः'}
                        </td>
                        <td className="border border-slate-900 px-2 py-2">
                          {CONSTRUCTION_RATE_RULES[selectedProperty.constructionType].shortLabel} ({USAGE_FACTORS[selectedProperty.usageType].label}), {selectedProperty.lengthFt}×{selectedProperty.widthFt} फूट
                        </td>
                        <td className="border border-slate-900 px-2 py-2 font-mono">
                          {selectedProperty.constructionYear}
                        </td>
                        <td className="border border-slate-900 px-2 py-2 font-mono tabular-nums">
                          {selectedProperty.areaSqFt} चौ.फूट / {selectedProperty.areaSqM} चौ.मी.
                        </td>
                        <td className="border border-slate-900 px-1.5 py-2 font-mono tabular-nums">
                          {(() => {
                            const land =
                              selectedProperty.rrLandRate ??
                              (selectedProperty.constructionType === 'open_plot'
                                ? selectedProperty.readyReckonerRate
                                : Math.round(selectedProperty.readyReckonerRate * 0.25));
                            return land > 0 ? formatINR(land) : '-';
                          })()}
                        </td>
                        <td className="border border-slate-900 px-1.5 py-2 font-mono tabular-nums">
                          {(() => {
                            const bld =
                              selectedProperty.rrBuildingRate ??
                              (selectedProperty.constructionType === 'open_plot'
                                ? 0
                                : selectedProperty.readyReckonerRate);
                            return bld > 0 ? formatINR(bld) : '-';
                          })()}
                        </td>
                        <td className="border border-slate-900 px-1.5 py-2 font-mono tabular-nums">
                          {(() => {
                            const cons =
                              selectedProperty.rrConstructionRate ??
                              (selectedProperty.constructionType === 'open_plot'
                                ? 0
                                : Math.round(selectedProperty.readyReckonerRate * 0.75));
                            return cons > 0 ? formatINR(cons) : '-';
                          })()}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Table Part 2: Columns १३ to २७ */}
                  <table className="w-full border-collapse border border-slate-900 text-[11px] text-center mt-5">
                    <thead>
                      <tr className="font-bold bg-slate-50/70">
                        <th rowSpan={2} className="border border-slate-900 px-1.5 py-2">घसारा दर</th>
                        <th rowSpan={2} className="border border-slate-900 px-1.5 py-2">इमारतीच्या वापरानुसार भारांक</th>
                        <th rowSpan={2} className="border border-slate-900 px-2 py-2">भांडवली मुल्य (रुपये)</th>
                        <th rowSpan={2} className="border border-slate-900 px-1.5 py-2">कराचा दर (पैसे)</th>
                        <th colSpan={5} className="border border-slate-900 px-2 py-1.5">
                          कराची रक्कम रुपये
                        </th>
                        <th colSpan={5} className="border border-slate-900 px-2 py-1.5">
                          अपिलाचे निकाल आणि त्यानंतर केलेले फेरफार
                        </th>
                        <th rowSpan={2} className="border border-slate-900 px-2 py-2 w-56 text-[10px] leading-snug">
                          नंतर वाढ किंवा घट झाल्याच्या बाबतीत आदेशाच्या संदर्भांसह शेरा (टीप- शेरा व दुरुस्त्या सरपंचाने अनुप्रमाणित कराव्यात.)
                        </th>
                      </tr>
                      <tr className="font-bold bg-slate-50/70">
                        <th className="border border-slate-900 px-1.5 py-1.5">घरपट्टी कर</th>
                        <th className="border border-slate-900 px-1.5 py-1.5">दिवाबत्ती कर</th>
                        <th className="border border-slate-900 px-1.5 py-1.5">आरोग्य कर</th>
                        <th className="border border-slate-900 px-1.5 py-1.5">पाणीपट्टी कर</th>
                        <th className="border border-slate-900 px-1.5 py-1.5">एकूण</th>
                        <th className="border border-slate-900 px-1.5 py-1.5">घरपट्टी कर</th>
                        <th className="border border-slate-900 px-1.5 py-1.5">दिवाबत्ती कर</th>
                        <th className="border border-slate-900 px-1.5 py-1.5">आरोग्य कर</th>
                        <th className="border border-slate-900 px-1.5 py-1.5">पाणीपट्टी कर</th>
                        <th className="border border-slate-900 px-1.5 py-1.5">एकूण</th>
                      </tr>
                      <tr className="font-semibold bg-white">
                        {['१३', '१४', '१५', '१६', '१७', '१८', '१९', '२०', '२१', '२२', '२३', '२४', '२५', '२६', '२७'].map((n) => (
                          <th key={n} className="border border-slate-900 py-1 font-medium">
                            {n}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="align-middle h-24">
                        <td className="border border-slate-900 px-1.5 py-2 font-mono">
                          {selectedProperty.depreciationFactor.toFixed(2)}
                        </td>
                        <td className="border border-slate-900 px-1.5 py-2 font-mono">
                          {selectedProperty.usageFactor.toFixed(2)}
                        </td>
                        <td className="border border-slate-900 px-2 py-2 font-mono font-semibold tabular-nums">
                          ₹{formatINR(selectedProperty.capitalValue)}
                        </td>
                        <td className="border border-slate-900 px-1.5 py-2 font-mono">
                          {Math.round(selectedProperty.houseTaxRatePer1000 * 100)} पैसे
                        </td>
                        <td className="border border-slate-900 px-1.5 py-2 font-mono tabular-nums">
                          {formatINR(selectedProperty.houseTax)}
                        </td>
                        <td className="border border-slate-900 px-1.5 py-2 font-mono tabular-nums">
                          {formatINR(selectedProperty.lightingTax)}
                        </td>
                        <td className="border border-slate-900 px-1.5 py-2 font-mono tabular-nums">
                          {formatINR(selectedProperty.healthTax)}
                        </td>
                        <td className="border border-slate-900 px-1.5 py-2 font-mono tabular-nums">
                          {formatINR(selectedProperty.generalWaterTax + selectedProperty.specialWaterTax)}
                        </td>
                        <td className="border border-slate-900 px-1.5 py-2 font-mono font-bold text-blue-900 tabular-nums">
                          {formatINR(selectedProperty.totalAnnualTax)}
                        </td>
                        <td className="border border-slate-900 px-1.5 py-2">-</td>
                        <td className="border border-slate-900 px-1.5 py-2">-</td>
                        <td className="border border-slate-900 px-1.5 py-2">-</td>
                        <td className="border border-slate-900 px-1.5 py-2">-</td>
                        <td className="border border-slate-900 px-1.5 py-2">-</td>
                        <td className="border border-slate-900 px-2 py-2 text-left text-[10.5px]">
                          {selectedProperty.encumbranceOrRemarks} ({panchayat.resolutionNo})
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Footer Signatures */}
                  <div className="flex items-end justify-between mt-6 pt-2 text-xs text-slate-800">
                    <div>
                      दिनांक: {new Date().toLocaleDateString('en-GB')}
                    </div>
                    <div className="text-center">
                      <div className="font-bold">सरपंच</div>
                      <div className="text-[11px] text-slate-500">{panchayat.sarpanchName}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold">
                        ग्रामसेवक/ग्रामविकास अधिकारी ग्रा.पं. {panchayat.panchayatName}
                      </div>
                      <div className="text-[11px] text-slate-500">{panchayat.gramsevakName}</div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-sm text-slate-500">
              उतारा पाहण्यासाठी वरील यादीतून एक मिळकत निवडा किंवा नवीन मिळकत नोंदवा.
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Property Modal with Live Maha.gov Calculator */}
      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-base font-bold text-slate-900">
                {editingId ? 'नमुना ८ मिळकत दुरुस्ती' : 'नवीन मिळकत नोंदणी (नमुना क्र. ८)'}
              </h2>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">मिळकत क्र. *</label>
                  <input
                    type="text"
                    required
                    value={formState.propertyNo}
                    onChange={(e) => setFormState({ ...formState, propertyNo: e.target.value })}
                    placeholder="उदा. १०७"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">वार्ड क्र. *</label>
                  <input
                    type="text"
                    required
                    value={formState.wardNo}
                    onChange={(e) => setFormState({ ...formState, wardNo: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">गट / सर्व्हे क्र.</label>
                  <input
                    type="text"
                    value={formState.surveyOrGutNo}
                    onChange={(e) => setFormState({ ...formState, surveyOrGutNo: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">घरमालकाचे पूर्ण नाव *</label>
                  <input
                    type="text"
                    required
                    value={formState.ownerName}
                    onChange={(e) => setFormState({ ...formState, ownerName: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    पती / पत्नीचे नाव (संयुक्त नोंद)
                  </label>
                  <input
                    type="text"
                    value={formState.spouseName}
                    onChange={(e) => setFormState({ ...formState, spouseName: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">वार्ड / गल्लीचे नाव</label>
                  <input
                    type="text"
                    value={formState.wardName}
                    onChange={(e) => setFormState({ ...formState, wardName: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">भोगवटादाराचे नाव</label>
                  <input
                    type="text"
                    value={formState.occupantName}
                    onChange={(e) => setFormState({ ...formState, occupantName: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                </div>
              </div>

              {/* Construction & Auto Tax Params */}
              <div className="border-t border-slate-200 pt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">बांधकामाचा प्रकार</label>
                  <select
                    value={formState.constructionType}
                    onChange={(e) => handleConstructionTypeChange(e.target.value as ConstructionType)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-700 focus:outline-none"
                  >
                    {Object.values(CONSTRUCTION_RATE_RULES).map((r) => (
                      <option key={r.type} value={r.type}>
                        {r.labelMarathi}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">वापर</label>
                  <select
                    value={formState.usageType}
                    onChange={(e) => setFormState({ ...formState, usageType: e.target.value as UsageType })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-700 focus:outline-none"
                  >
                    {Object.entries(USAGE_FACTORS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label} ({v.factor}x)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">लांबी (फूट)</label>
                  <input
                    type="number"
                    min={1}
                    value={formState.lengthFt}
                    onChange={(e) => setFormState({ ...formState, lengthFt: Number(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">रुंदी (फूट)</label>
                  <input
                    type="number"
                    min={1}
                    value={formState.widthFt}
                    onChange={(e) => setFormState({ ...formState, widthFt: Number(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">बांधकाम वर्ष</label>
                  <input
                    type="number"
                    min={1940}
                    max={2026}
                    value={formState.constructionYear}
                    onChange={(e) =>
                      setFormState({ ...formState, constructionYear: Number(e.target.value) || 2020 })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">रेडीरेकनर दर (₹/चौ.मी.)</label>
                  <input
                    type="number"
                    value={formState.readyReckonerRate}
                    onChange={(e) =>
                      setFormState({ ...formState, readyReckonerRate: Number(e.target.value) || 0 })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    कर दर (पैसे प्रति ₹१०००)
                  </label>
                  <input
                    type="number"
                    value={formState.ratePaisePer1000}
                    onChange={(e) =>
                      setFormState({ ...formState, ratePaisePer1000: Number(e.target.value) || 0 })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">दिवाबत्ती कर (₹)</label>
                  <input
                    type="number"
                    value={formState.lightingTax}
                    onChange={(e) => setFormState({ ...formState, lightingTax: Number(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">आरोग्य कर (₹)</label>
                  <input
                    type="number"
                    value={formState.healthTax}
                    onChange={(e) => setFormState({ ...formState, healthTax: Number(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">सामान्य पाणीपट्टी (₹)</label>
                  <input
                    type="number"
                    value={formState.generalWaterTax}
                    onChange={(e) =>
                      setFormState({ ...formState, generalWaterTax: Number(e.target.value) || 0 })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    विशेष नळ पाणीपट्टी (₹)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formState.hasPrivateTap}
                      onChange={(e) => setFormState({ ...formState, hasPrivateTap: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-blue-700"
                    />
                    <input
                      type="number"
                      disabled={!formState.hasPrivateTap}
                      value={formState.specialWaterTax}
                      onChange={(e) =>
                        setFormState({ ...formState, specialWaterTax: Number(e.target.value) || 0 })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-slate-900 disabled:bg-slate-100 focus:border-blue-700 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">पान क्र. (उताऱ्यावर)</label>
                  <input
                    type="text"
                    value={formState.pageNo}
                    onChange={(e) => setFormState({ ...formState, pageNo: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    शेरा / बोजा / फेरफार नोंद (रकाना २७)
                  </label>
                  <input
                    type="text"
                    value={formState.encumbranceOrRemarks}
                    onChange={(e) =>
                      setFormState({ ...formState, encumbranceOrRemarks: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                </div>
              </div>

              {/* Live Calculation Summary */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-slate-600">
                    क्षेत्रफळ: <strong className="font-mono">{liveCalc.areaSqM} चौ.मी.</strong> · भांडवली मूल्य:{' '}
                    <strong className="font-mono">₹{formatINR(liveCalc.capitalValue)}</strong>
                  </div>
                  <div className="text-slate-600 mt-0.5">
                    घरपट्टी: <strong className="font-mono">₹{formatINR(liveCalc.houseTax)}</strong> · इतर पट्टी:{' '}
                    <strong className="font-mono">
                      ₹{formatINR(liveCalc.lightingTax + liveCalc.healthTax + liveCalc.generalWaterTax + liveCalc.specialWaterTax)}
                    </strong>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-blue-800 font-semibold">एकूण वार्षिक कर</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-blue-900">
                    ₹{formatINR(liveCalc.totalAnnualTax)}.00
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-700 px-5 py-2 font-semibold text-white hover:bg-blue-800"
                >
                  {editingId ? 'बदल जतन करा' : 'नमुना ८ मध्ये नोंदवा'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
