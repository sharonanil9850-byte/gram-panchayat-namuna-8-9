import {
  ConstructionType,
  Namuna9Record,
  PropertyAssessment,
  UsageType,
} from '../types/grampanchayat';

export interface ConstructionRateRule {
  type: ConstructionType;
  labelMarathi: string;
  shortLabel: string;
  minPaisePer1000: number;
  maxPaisePer1000: number;
  defaultPaisePer1000: number;
  defaultReadyReckonerSqM: number;
  defaultLightingTax: number;
  defaultHealthTax: number;
}

/**
 * महाराष्ट्र ग्रामपंचायत कर व फी (सुधारणा) नियम, २०१५ (दि. ३१ डिसेंबर २०१५ शासन निर्णय)
 * नुसार भांडवली मूल्यावर आधारित किमान व कमाल कर दर तक्ता (प्रति ₹१,००० भांडवली मूल्यामागे).
 */
export const CONSTRUCTION_RATE_RULES: Record<ConstructionType, ConstructionRateRule> = {
  hut_mud: {
    type: 'hut_mud',
    labelMarathi: 'झोपडी किंवा मातीचे कच्चे घर',
    shortLabel: 'झोपडी / कच्चे घर',
    minPaisePer1000: 30,
    maxPaisePer1000: 75,
    defaultPaisePer1000: 40,
    defaultReadyReckonerSqM: 3500,
    defaultLightingTax: 30,
    defaultHealthTax: 30,
  },
  stone_brick_mud: {
    type: 'stone_brick_mud',
    labelMarathi: 'दगड-विटांचे मातीचे घर',
    shortLabel: 'दगड-विटा (माती)',
    minPaisePer1000: 60,
    maxPaisePer1000: 120,
    defaultPaisePer1000: 80,
    defaultReadyReckonerSqM: 6500,
    defaultLightingTax: 50,
    defaultHealthTax: 40,
  },
  stone_brick_cement: {
    type: 'stone_brick_cement',
    labelMarathi: 'दगड-विटांचे चुना / सिमेंटचे पक्के घर',
    shortLabel: 'दगड-विटा (सिमेंट पक्के)',
    minPaisePer1000: 75,
    maxPaisePer1000: 150,
    defaultPaisePer1000: 100,
    defaultReadyReckonerSqM: 10500,
    defaultLightingTax: 75,
    defaultHealthTax: 60,
  },
  rcc: {
    type: 'rcc',
    labelMarathi: 'आर.सी.सी. (RCC) पद्धतीचे पक्के बांधकाम',
    shortLabel: 'आर.सी.सी. (RCC)',
    minPaisePer1000: 120,
    maxPaisePer1000: 200,
    defaultPaisePer1000: 150,
    defaultReadyReckonerSqM: 14500,
    defaultLightingTax: 100,
    defaultHealthTax: 80,
  },
  open_plot: {
    type: 'open_plot',
    labelMarathi: 'मोकळी जागा / खुला प्लॉट',
    shortLabel: 'मोकळा प्लॉट',
    minPaisePer1000: 150,
    maxPaisePer1000: 500,
    defaultPaisePer1000: 200,
    defaultReadyReckonerSqM: 2800,
    defaultLightingTax: 30,
    defaultHealthTax: 20,
  },
};

export const USAGE_FACTORS: Record<UsageType, { label: string; factor: number }> = {
  residential: { label: 'निवासी (रहिवाशी)', factor: 1.0 },
  commercial: { label: 'व्यावसायिक / दुकान', factor: 1.25 },
  industrial: { label: 'औद्योगिक / गोदाम', factor: 1.5 },
};

export function sqFtToSqM(sqFt: number): number {
  if (!Number.isFinite(sqFt) || sqFt <= 0) return 0;
  return Number((sqFt * 0.092903).toFixed(2));
}

export function getDepreciationFactor(
  constructionYear: number,
  constructionType: ConstructionType,
  referenceYear = 2026
): { ageYears: number; factor: number; label: string } {
  if (constructionType === 'open_plot') {
    return { ageYears: 0, factor: 1.0, label: 'लागू नाही (मोकळी जागा १.००)' };
  }
  const ageYears = Math.max(0, referenceYear - (constructionYear || referenceYear));
  if (ageYears <= 5) {
    return { ageYears, factor: 1.0, label: '०–५ वर्षे (१.०० — घसारा नाही)' };
  }
  if (ageYears <= 15) {
    return { ageYears, factor: 0.9, label: '६–१५ वर्षे (०.९० — १०% घसारा)' };
  }
  if (ageYears <= 30) {
    return { ageYears, factor: 0.8, label: '१६–३० वर्षे (०.८० — २०% घसारा)' };
  }
  if (ageYears <= 50) {
    return { ageYears, factor: 0.7, label: '३१–५० वर्षे (०.७० — ३०% घसारा)' };
  }
  return { ageYears, factor: 0.6, label: '५०+ वर्षे (०.६० — ४०% घसारा)' };
}

export interface TaxCalculationInput {
  constructionType: ConstructionType;
  usageType: UsageType;
  constructionYear: number;
  areaSqFt: number;
  readyReckonerRate: number;
  ratePaisePer1000: number;
  lightingTax: number;
  healthTax: number;
  generalWaterTax: number;
  hasPrivateTap: boolean;
  specialWaterTax: number;
}

export interface TaxCalculationResult {
  areaSqM: number;
  depreciationFactor: number;
  depreciationLabel: string;
  usageFactor: number;
  capitalValue: number;
  rateRsPer1000: number;
  houseTax: number;
  lightingTax: number;
  healthTax: number;
  generalWaterTax: number;
  specialWaterTax: number;
  totalAnnualTax: number;
  isRateWithinGovtLimits: boolean;
}

export function calculateMaharashtraGpTax(input: TaxCalculationInput): TaxCalculationResult {
  const rule = CONSTRUCTION_RATE_RULES[input.constructionType];
  const areaSqM = sqFtToSqM(input.areaSqFt);
  const dep = getDepreciationFactor(input.constructionYear, input.constructionType);
  const usageFactor = USAGE_FACTORS[input.usageType].factor;

  const capitalValue = Math.round(
    areaSqM * Math.max(0, input.readyReckonerRate) * dep.factor * usageFactor
  );

  const clampedPaise = Math.max(0, input.ratePaisePer1000);
  const rateRsPer1000 = Number((clampedPaise / 100).toFixed(2));
  const houseTax = Math.round((capitalValue / 1000) * rateRsPer1000);

  const lightingTax = Math.max(0, Math.round(input.lightingTax));
  const healthTax = Math.max(0, Math.round(input.healthTax));
  const generalWaterTax = Math.max(0, Math.round(input.generalWaterTax));
  const specialWaterTax = input.hasPrivateTap
    ? Math.max(0, Math.round(input.specialWaterTax))
    : 0;

  const totalAnnualTax =
    houseTax + lightingTax + healthTax + generalWaterTax + specialWaterTax;

  const isRateWithinGovtLimits =
    clampedPaise >= rule.minPaisePer1000 && clampedPaise <= rule.maxPaisePer1000;

  return {
    areaSqM,
    depreciationFactor: dep.factor,
    depreciationLabel: dep.label,
    usageFactor,
    capitalValue,
    rateRsPer1000,
    houseTax,
    lightingTax,
    healthTax,
    generalWaterTax,
    specialWaterTax,
    totalAnnualTax,
    isRateWithinGovtLimits,
  };
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(Math.round(amount || 0));
}

export interface ConsolidatedNamuna9Row {
  ownerKey: string;
  ownerName: string;
  spouseNames: string;
  propertyNos: string[];
  wardNos: string[];
  propertyCount: number;
  previousArrears: number;
  houseTax: number;
  lightingTax: number;
  healthTax: number;
  waterTax: number;
  totalAnnualTax: number;
  penaltyOrInterest: number;
  rebateOrDiscount: number;
  grossDemand: number;
  totalPaid: number;
  balanceDue: number;
  receiptCount: number;
  status: 'paid' | 'partial' | 'due';
}

/**
 * नमुना ९ पूर्ण रजिस्टरसाठी मिळकतधारकाच्या नावानुसार अल्फाबेटिकल (मराठी क्रम) यादी तयार करते.
 * एकाच मिळकतधारकाच्या दोन किंवा अधिक नोंदी असल्यास सर्व करांची व मागणीची बेरीज करून एकाच नावापुढे दाखवते.
 */
export function buildAlphabeticalNamuna9Rows(
  properties: PropertyAssessment[],
  namuna9Records: Record<string, Namuna9Record>,
  financialYear: string
): ConsolidatedNamuna9Row[] {
  const grouped = new Map<string, ConsolidatedNamuna9Row>();

  for (const prop of properties) {
    const cleanOwner = prop.ownerName.trim() || 'अज्ञात खातेदार';
    const ownerKey = cleanOwner.replace(/\s+/g, ' ').toLowerCase();

    const rec: Namuna9Record = namuna9Records[prop.id] ?? {
      propertyId: prop.id,
      financialYear,
      previousArrears: 0,
      penaltyOrInterest: 0,
      rebateOrDiscount: 0,
      payments: [],
    };

    const waterTax = prop.generalWaterTax + prop.specialWaterTax;
    const grossDemand = Math.max(
      0,
      rec.previousArrears +
        prop.totalAnnualTax +
        rec.penaltyOrInterest -
        rec.rebateOrDiscount
    );
    const totalPaid = rec.payments.reduce((s, p) => s + p.amountPaid, 0);

    const existing = grouped.get(ownerKey);
    if (!existing) {
      grouped.set(ownerKey, {
        ownerKey,
        ownerName: cleanOwner,
        spouseNames: prop.spouseName.trim(),
        propertyNos: [prop.propertyNo],
        wardNos: [prop.wardNo],
        propertyCount: 1,
        previousArrears: rec.previousArrears,
        houseTax: prop.houseTax,
        lightingTax: prop.lightingTax,
        healthTax: prop.healthTax,
        waterTax,
        totalAnnualTax: prop.totalAnnualTax,
        penaltyOrInterest: rec.penaltyOrInterest,
        rebateOrDiscount: rec.rebateOrDiscount,
        grossDemand,
        totalPaid,
        balanceDue: Math.max(0, grossDemand - totalPaid),
        receiptCount: rec.payments.length,
        status: 'due',
      });
    } else {
      existing.propertyNos.push(prop.propertyNo);
      if (!existing.wardNos.includes(prop.wardNo)) {
        existing.wardNos.push(prop.wardNo);
      }
      if (
        prop.spouseName.trim() &&
        !existing.spouseNames.includes(prop.spouseName.trim())
      ) {
        existing.spouseNames = existing.spouseNames
          ? `${existing.spouseNames}, ${prop.spouseName.trim()}`
          : prop.spouseName.trim();
      }
      existing.propertyCount += 1;
      existing.previousArrears += rec.previousArrears;
      existing.houseTax += prop.houseTax;
      existing.lightingTax += prop.lightingTax;
      existing.healthTax += prop.healthTax;
      existing.waterTax += waterTax;
      existing.totalAnnualTax += prop.totalAnnualTax;
      existing.penaltyOrInterest += rec.penaltyOrInterest;
      existing.rebateOrDiscount += rec.rebateOrDiscount;
      existing.grossDemand += grossDemand;
      existing.totalPaid += totalPaid;
      existing.balanceDue = Math.max(0, existing.grossDemand - existing.totalPaid);
      existing.receiptCount += rec.payments.length;
    }
  }

  const result = Array.from(grouped.values()).map((row) => {
    const status: 'paid' | 'partial' | 'due' =
      row.balanceDue === 0 ? 'paid' : row.totalPaid > 0 ? 'partial' : 'due';
    return { ...row, status };
  });

  result.sort((a, b) =>
    a.ownerName.localeCompare(b.ownerName, 'mr', { sensitivity: 'base' })
  );

  return result;
}
