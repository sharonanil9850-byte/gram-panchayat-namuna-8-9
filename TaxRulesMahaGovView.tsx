import { useState } from 'react';
import { Calculator, ExternalLink, Scale } from 'lucide-react';
import { ConstructionType, UsageType } from '../types/grampanchayat';
import {
  calculateMaharashtraGpTax,
  CONSTRUCTION_RATE_RULES,
  formatINR,
  USAGE_FACTORS,
} from '../utils/taxCalculator';

export function TaxRulesMahaGovView() {
  const [constructionType, setConstructionType] = useState<ConstructionType>('rcc');
  const [usageType, setUsageType] = useState<UsageType>('residential');
  const [constructionYear, setConstructionYear] = useState<number>(2018);
  const [lengthFt, setLengthFt] = useState<number>(40);
  const [widthFt, setWidthFt] = useState<number>(30);
  const [readyReckonerRate, setReadyReckonerRate] = useState<number>(14500);
  const [ratePaisePer1000, setRatePaisePer1000] = useState<number>(150);
  const [lightingTax, setLightingTax] = useState<number>(100);
  const [healthTax, setHealthTax] = useState<number>(80);
  const [generalWaterTax, setGeneralWaterTax] = useState<number>(150);
  const [hasPrivateTap, setHasPrivateTap] = useState<boolean>(true);
  const [specialWaterTax, setSpecialWaterTax] = useState<number>(600);

  const areaSqFt = Math.max(0, Math.round(lengthFt * widthFt));
  const sim = calculateMaharashtraGpTax({
    constructionType,
    usageType,
    constructionYear,
    areaSqFt,
    readyReckonerRate,
    ratePaisePer1000,
    lightingTax,
    healthTax,
    generalWaterTax,
    hasPrivateTap,
    specialWaterTax,
  });

  const activeRule = CONSTRUCTION_RATE_RULES[constructionType];

  const handleConstructionChange = (nextType: ConstructionType) => {
    setConstructionType(nextType);
    const r = CONSTRUCTION_RATE_RULES[nextType];
    setReadyReckonerRate(r.defaultReadyReckonerSqM);
    setRatePaisePer1000(r.defaultPaisePer1000);
    setLightingTax(r.defaultLightingTax);
    setHealthTax(r.defaultHealthTax);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-slate-500">
            महाराष्ट्र शासन ग्रामविकास विभाग · maharashtra.gov.in नियम संदर्भ
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
            ग्रामपंचायत पट्टी व घरपट्टी दर आकारणी नियम (शासन निर्णय २०१५)
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
            महाराष्ट्र ग्रामपंचायत अधिनियम कलम १२४ व महाराष्ट्र ग्रामपंचायत कर व फी (सुधारणा) नियम, २०१५ (दि. ३१ डिसेंबर २०१५) नुसार इमारती व मोकळ्या जागांवर भांडवली मूल्याच्या आधारे कर आकारणी केली जाते.
          </p>
        </div>

        <a
          href="https://rdd.maharashtra.gov.in/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
        >
          <span>ग्रामविकास विभाग (maharashtra.gov.in)</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Step-by-step Formula + Interactive Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Formula & Official Rate Table */}
        <div className="lg:col-span-7 space-y-6">
          {/* Official Formula */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-blue-700" />
              <h2 className="text-sm font-bold text-slate-900">
                १. घरपट्टी आकारणीचे शासन मान्य सूत्र (Capital Value Formula)
              </h2>
            </div>

            <div className="space-y-3 text-xs sm:text-[13px] text-slate-700">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <div className="font-semibold text-slate-900">पायरी १: क्षेत्रफळाचे चौ. मीटरमध्ये रूपांतरण</div>
                <div className="font-mono text-slate-700 mt-1">
                  क्षेत्रफळ (चौ.मी.) = क्षेत्रफळ (चौ.फूट) × 0.092903
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <div className="font-semibold text-slate-900">पायरी २: मालमत्तेचे भांडवली मूल्य (Capital Value)</div>
                <div className="font-mono text-slate-700 mt-1">
                  भांडवली मूल्य = क्षेत्रफळ (चौ.मी.) × रेडीरेकनर दर × वयोमान घसारा घटक × वापर भारांक
                </div>
                <div className="text-[11px] text-slate-500 mt-1.5">
                  वापर भारांक: निवासी (१.००x) · व्यावसायिक/दुकान (१.२५x) · औद्योगिक (१.५०x)
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <div className="font-semibold text-slate-900">पायरी ३: वार्षिक घरपट्टी व इतर पट्टी</div>
                <div className="font-mono text-slate-700 mt-1">
                  घरपट्टी (₹) = (भांडवली मूल्य ÷ १०००) × ग्रामपंचायत ठराव दर (प्रति ₹१,०००)
                </div>
                <div className="text-[11px] text-slate-500 mt-1.5">
                  एकूण वार्षिक पट्टी = घरपट्टी + दिवाबत्ती कर + आरोग्य/स्वच्छता कर + सामान्य व विशेष पाणीपट्टी
                </div>
              </div>
            </div>
          </div>

          {/* Min-Max Govt Rate Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-900">
                २. इमारतीच्या प्रकारानुसार शासन निर्धारित किमान व कमाल कराचे दर
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                प्रति ₹१,००० भांडवली मूल्यामागे ग्रामपंचायतीने ठरावाद्वारे ठरवायचे दर (महाराष्ट्र ग्रामपंचायत कर व फी नियम)
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="py-2.5 px-4 font-semibold">इमारतीचा / जागेचा प्रकार</th>
                    <th className="py-2.5 px-4 font-semibold text-right">किमान दर</th>
                    <th className="py-2.5 px-4 font-semibold text-right">कमाल दर</th>
                    <th className="py-2.5 px-4 font-semibold text-right">आदर्श दर</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {Object.values(CONSTRUCTION_RATE_RULES).map((rule) => (
                    <tr key={rule.type} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-medium text-slate-900">
                        {rule.labelMarathi}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                        {rule.minPaisePer1000} पैसे
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                        {rule.maxPaisePer1000} पैसे
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-blue-800">
                        {rule.defaultPaisePer1000} पैसे
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Administrative Rules */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900">
              ३. पट्टी आकारणी व नमुना ८ / ९ बाबत महत्त्वाचे शासकीय नियम
            </h2>
            <ul className="space-y-2 text-xs sm:text-[13px] text-slate-700 list-disc pl-5 leading-relaxed">
              <li>
                <strong>आर्थिक वर्ष व प्रभावी दिनांक:</strong> कर आकारणीचे वर्ष १ एप्रिल ते ३१ मार्च असते. नवीन किंवा सुधारित कर १ एप्रिल, १ जुलै, १ ऑक्टोबर किंवा १ जानेवारीपासून लागू होतात.
              </li>
              <li>
                <strong>३० दिवसांची आक्षेप मुदत:</strong> नमुना ८ यादी जाहीर केल्यानंतर मालमत्ता धारकांना आक्षेप नोंदवण्यासाठी किमान ३० दिवसांची नोटीस देणे बंधनकारक आहे. अंतिम यादी ३१ जुलैपूर्वी प्रमाणित केली जाते.
              </li>
              <li>
                <strong>पती-पत्नी संयुक्त नोंद (GR २००३):</strong> ग्रामपंचायत नमुना ८ मध्ये घरमालकासोबत पती किंवा पत्नीचे संयुक्त नाव नोंदवणे शासनाने बंधनकारक केले आहे.
              </li>
              <li>
                <strong>मालमत्ता हस्तांतरण (नियम १६-अ):</strong> खरेदी, विक्री किंवा वारसाहक्काने मालमत्ता हस्तांतरित झाल्यास १ वर्षाच्या आत ग्रामपंचायतीला कळवून नमुना ८ मध्ये फेरफार करणे आवश्यक असते.
              </li>
              <li>
                <strong>पाणीपट्टी व इतर कर:</strong> सार्वजनिक नळ/विहिरीसाठी सामान्य पाणीपट्टी आणि वैयक्तिक घरगुती नळ जोडणी असल्यास ग्रामसभेच्या ठरावानुसार विशेष पाणीपट्टी आकारली जाते.
              </li>
            </ul>
          </div>
        </div>

        {/* Right: Interactive Tax Simulator */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <Calculator className="h-4 w-4 text-blue-700" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                थेट पट्टी व दर कॅल्क्युलेटर (Maha.gov सूत्रानुसार)
              </h2>
              <p className="text-[11px] text-slate-500">
                मापे आणि दर टाकून घरपट्टी व एकूण वार्षिक कर तपासा
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                बांधकामाचा प्रकार
              </label>
              <select
                value={constructionType}
                onChange={(e) => handleConstructionChange(e.target.value as ConstructionType)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-700 focus:outline-none"
              >
                {Object.values(CONSTRUCTION_RATE_RULES).map((r) => (
                  <option key={r.type} value={r.type}>
                    {r.labelMarathi}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">वापराचा प्रकार</label>
              <select
                value={usageType}
                onChange={(e) => setUsageType(e.target.value as UsageType)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-700 focus:outline-none"
              >
                {Object.entries(USAGE_FACTORS).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label} ({val.factor}x)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">बांधकाम वर्ष</label>
              <input
                type="number"
                value={constructionYear}
                onChange={(e) => setConstructionYear(Number(e.target.value) || 2020)}
                min={1940}
                max={2026}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:border-blue-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">लांबी (फूट)</label>
              <input
                type="number"
                value={lengthFt}
                onChange={(e) => setLengthFt(Number(e.target.value) || 0)}
                min={1}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:border-blue-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">रुंदी (फूट)</label>
              <input
                type="number"
                value={widthFt}
                onChange={(e) => setWidthFt(Number(e.target.value) || 0)}
                min={1}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:border-blue-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                रेडीरेकनर दर (₹/चौ.मी.)
              </label>
              <input
                type="number"
                value={readyReckonerRate}
                onChange={(e) => setReadyReckonerRate(Number(e.target.value) || 0)}
                min={100}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:border-blue-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ठराव दर (पैसे प्रति ₹१०००)
              </label>
              <input
                type="number"
                value={ratePaisePer1000}
                onChange={(e) => setRatePaisePer1000(Number(e.target.value) || 0)}
                min={10}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:border-blue-700 focus:outline-none"
              />
              <div className="text-[10px] text-slate-500 mt-1">
                मर्यादा: {activeRule.minPaisePer1000} ते {activeRule.maxPaisePer1000} पैसे
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">दिवाबत्ती कर (₹)</label>
              <input
                type="number"
                value={lightingTax}
                onChange={(e) => setLightingTax(Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:border-blue-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">आरोग्य कर (₹)</label>
              <input
                type="number"
                value={healthTax}
                onChange={(e) => setHealthTax(Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:border-blue-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">सामान्य पाणीपट्टी (₹)</label>
              <input
                type="number"
                value={generalWaterTax}
                onChange={(e) => setGeneralWaterTax(Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:border-blue-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                विशेष नळ पाणीपट्टी (₹)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={hasPrivateTap}
                  onChange={(e) => setHasPrivateTap(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-700"
                  aria-label="वैयक्तिक नळ जोडणी"
                />
                <input
                  type="number"
                  disabled={!hasPrivateTap}
                  value={specialWaterTax}
                  onChange={(e) => setSpecialWaterTax(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 disabled:bg-slate-100 focus:border-blue-700 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Calculated Result Breakdown */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">एकूण क्षेत्रफळ:</span>
              <span className="font-mono font-semibold tabular-nums text-slate-900">
                {areaSqFt} चौ.फूट ({sim.areaSqM} चौ.मी.)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">घसारा व वापर भारांक:</span>
              <span className="font-mono font-semibold tabular-nums text-slate-900">
                {sim.depreciationFactor.toFixed(2)} × {sim.usageFactor.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">निर्धारित भांडवली मूल्य:</span>
              <span className="font-mono font-bold tabular-nums text-slate-900">
                ₹ {formatINR(sim.capitalValue)}
              </span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between">
              <span className="text-slate-700 font-semibold">वार्षिक घरपट्टी:</span>
              <span className="font-mono font-bold tabular-nums text-blue-800">
                ₹ {formatINR(sim.houseTax)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>इतर कर (दिवाबत्ती + आरोग्य + पाणीपट्टी):</span>
              <span className="font-mono font-semibold tabular-nums">
                ₹ {formatINR(sim.lightingTax + sim.healthTax + sim.generalWaterTax + sim.specialWaterTax)}
              </span>
            </div>
            <div className="border-t border-slate-300 pt-2 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-900">एकूण वार्षिक पट्टी:</span>
              <span className="text-base font-bold font-mono tabular-nums text-emerald-800">
                ₹ {formatINR(sim.totalAnnualTax)}.00
              </span>
            </div>
            {!sim.isRateWithinGovtLimits && (
              <div className="text-[11px] font-medium text-amber-800 pt-1">
                टीप: निवडलेला दर शासन विहित मर्यादेबाहेर ({activeRule.minPaisePer1000}–{activeRule.maxPaisePer1000} पैसे) आहे.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
