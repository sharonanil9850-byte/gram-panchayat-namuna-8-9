import {
  GPAppState,
  Namuna9Record,
  PanchayatProfile,
  PropertyAssessment,
  VillageWorkspace,
} from '../types/grampanchayat';
import { calculateMaharashtraGpTax } from '../utils/taxCalculator';

const STORAGE_KEY = 'gp_namuna_8_9_state_v2';
const LEGACY_STORAGE_KEY = 'gp_namuna_8_9_state_v1';

export function buildSeedProperty(params: {
  id: string;
  propertyNo: string;
  wardNo: string;
  wardName: string;
  surveyOrGutNo: string;
  ownerName: string;
  spouseName: string;
  occupantName: string;
  constructionType: PropertyAssessment['constructionType'];
  usageType: PropertyAssessment['usageType'];
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
}): PropertyAssessment {
  const areaSqFt = Math.round(params.lengthFt * params.widthFt);
  const calc = calculateMaharashtraGpTax({
    constructionType: params.constructionType,
    usageType: params.usageType,
    constructionYear: params.constructionYear,
    areaSqFt,
    readyReckonerRate: params.readyReckonerRate,
    ratePaisePer1000: params.ratePaisePer1000,
    lightingTax: params.lightingTax,
    healthTax: params.healthTax,
    generalWaterTax: params.generalWaterTax,
    hasPrivateTap: params.hasPrivateTap,
    specialWaterTax: params.specialWaterTax,
  });

  return {
    id: params.id,
    propertyNo: params.propertyNo,
    wardNo: params.wardNo,
    wardName: params.wardName,
    surveyOrGutNo: params.surveyOrGutNo,
    ownerName: params.ownerName,
    spouseName: params.spouseName,
    occupantName: params.occupantName,
    constructionType: params.constructionType,
    usageType: params.usageType,
    constructionYear: params.constructionYear,
    lengthFt: params.lengthFt,
    widthFt: params.widthFt,
    areaSqFt,
    areaSqM: calc.areaSqM,
    readyReckonerRate: params.readyReckonerRate,
    depreciationFactor: calc.depreciationFactor,
    usageFactor: calc.usageFactor,
    capitalValue: calc.capitalValue,
    houseTaxRatePer1000: calc.rateRsPer1000,
    houseTax: calc.houseTax,
    lightingTax: calc.lightingTax,
    healthTax: calc.healthTax,
    generalWaterTax: calc.generalWaterTax,
    hasPrivateTap: params.hasPrivateTap,
    specialWaterTax: calc.specialWaterTax,
    totalAnnualTax: calc.totalAnnualTax,
    encumbranceOrRemarks: params.encumbranceOrRemarks,
    updatedAt: '2026-04-01T10:00:00.000Z',
  };
}

function createSampleProperties(): {
  properties: PropertyAssessment[];
  namuna9Records: Record<string, Namuna9Record>;
} {
  const properties: PropertyAssessment[] = [
    buildSeedProperty({
      id: 'prop-101',
      propertyNo: '१०१',
      wardNo: '१',
      wardName: 'छत्रपती शिवाजी महाराज चौक',
      surveyOrGutNo: 'गट क्र. ४२/१',
      ownerName: 'रमेश दत्तात्रय पाटील',
      spouseName: 'सुनिता रमेश पाटील',
      occupantName: 'स्वतः',
      constructionType: 'rcc',
      usageType: 'residential',
      constructionYear: 2018,
      lengthFt: 40,
      widthFt: 30,
      readyReckonerRate: 14500,
      ratePaisePer1000: 150,
      lightingTax: 100,
      healthTax: 80,
      generalWaterTax: 150,
      hasPrivateTap: true,
      specialWaterTax: 600,
      encumbranceOrRemarks: 'बोजा नाही',
    }),
    buildSeedProperty({
      id: 'prop-102',
      propertyNo: '१०२',
      wardNo: '१',
      wardName: 'महात्मा फुले मार्ग',
      surveyOrGutNo: 'गट क्र. ४२/४',
      ownerName: 'शंकर तुकाराम जाधव',
      spouseName: 'मंगल शंकर जाधव',
      occupantName: 'स्वतः',
      constructionType: 'stone_brick_cement',
      usageType: 'residential',
      constructionYear: 2008,
      lengthFt: 35,
      widthFt: 25,
      readyReckonerRate: 10500,
      ratePaisePer1000: 100,
      lightingTax: 75,
      healthTax: 60,
      generalWaterTax: 150,
      hasPrivateTap: true,
      specialWaterTax: 600,
      encumbranceOrRemarks: 'बोजा नाही',
    }),
    buildSeedProperty({
      id: 'prop-103',
      propertyNo: '१०३/अ',
      wardNo: '२',
      wardName: 'बाजार पेठ मुख्य रस्ता',
      surveyOrGutNo: 'गट क्र. १८/२',
      ownerName: 'विलासराव बाबुराव देशमुख',
      spouseName: 'अलका विलासराव देशमुख',
      occupantName: 'समर्थ कृषी केंद्र (भाडेकरू)',
      constructionType: 'rcc',
      usageType: 'commercial',
      constructionYear: 2022,
      lengthFt: 30,
      widthFt: 20,
      readyReckonerRate: 16000,
      ratePaisePer1000: 180,
      lightingTax: 120,
      healthTax: 100,
      generalWaterTax: 150,
      hasPrivateTap: false,
      specialWaterTax: 0,
      encumbranceOrRemarks: 'बँक ऑफ महाराष्ट्र पीक/दुकान कर्ज नोंद',
    }),
    buildSeedProperty({
      id: 'prop-104',
      propertyNo: '१०४',
      wardNo: '२',
      wardName: 'हनुमान मंदिर आळी',
      surveyOrGutNo: 'गट क्र. १९/१',
      ownerName: 'किसन महादेव शिंदे',
      spouseName: 'पार्वती किसन शिंदे',
      occupantName: 'स्वतः',
      constructionType: 'stone_brick_mud',
      usageType: 'residential',
      constructionYear: 1995,
      lengthFt: 28,
      widthFt: 22,
      readyReckonerRate: 6500,
      ratePaisePer1000: 80,
      lightingTax: 50,
      healthTax: 40,
      generalWaterTax: 150,
      hasPrivateTap: false,
      specialWaterTax: 0,
      encumbranceOrRemarks: 'वारसा हक्क नोंद ठराव क्र. १२ नुसार',
    }),
    buildSeedProperty({
      id: 'prop-105',
      propertyNo: '१०५',
      wardNo: '३',
      wardName: 'आंबेडकर नगर',
      surveyOrGutNo: 'गट क्र. ६१/३',
      ownerName: 'प्रकाश धोंडीबा कांबळे',
      spouseName: 'रेखा प्रकाश कांबळे',
      occupantName: 'स्वतः',
      constructionType: 'hut_mud',
      usageType: 'residential',
      constructionYear: 2012,
      lengthFt: 20,
      widthFt: 18,
      readyReckonerRate: 3500,
      ratePaisePer1000: 40,
      lightingTax: 30,
      healthTax: 30,
      generalWaterTax: 150,
      hasPrivateTap: false,
      specialWaterTax: 0,
      encumbranceOrRemarks: 'बोजा नाही',
    }),
    buildSeedProperty({
      id: 'prop-106',
      propertyNo: '१०६',
      wardNo: '३',
      wardName: 'मराठा कॉलनी परिसर',
      surveyOrGutNo: 'गट क्र. ७४/२',
      ownerName: 'अनिता संदीप कुलकर्णी',
      spouseName: 'संदीप प्रभाकर कुलकर्णी',
      occupantName: 'मोकळा भूखंड',
      constructionType: 'open_plot',
      usageType: 'residential',
      constructionYear: 2024,
      lengthFt: 50,
      widthFt: 40,
      readyReckonerRate: 2800,
      ratePaisePer1000: 200,
      lightingTax: 30,
      healthTax: 20,
      generalWaterTax: 0,
      hasPrivateTap: false,
      specialWaterTax: 0,
      encumbranceOrRemarks: 'खरेदीखत दि. १४/०२/२०२४ नुसार नोंद',
    }),
  ];

  const namuna9Records: Record<string, Namuna9Record> = {
    'prop-101': {
      propertyId: 'prop-101',
      financialYear: '२०२६-२०२७',
      previousArrears: 0,
      penaltyOrInterest: 0,
      rebateOrDiscount: 0,
      payments: [
        {
          id: 'pay-1',
          receiptNo: 'GP-10/2026/001',
          date: '2026-05-12',
          amountPaid: 3272,
          mode: 'UPI',
          note: 'पूर्ण वार्षिक कर भरणा',
        },
      ],
    },
    'prop-102': {
      propertyId: 'prop-102',
      financialYear: '२०२६-२०२७',
      previousArrears: 450,
      penaltyOrInterest: 0,
      rebateOrDiscount: 0,
      payments: [
        {
          id: 'pay-2',
          receiptNo: 'GP-10/2026/008',
          date: '2026-06-18',
          amountPaid: 1000,
          mode: 'नगद',
          note: 'हप्ता क्र. १ जमा',
        },
      ],
    },
    'prop-103': {
      propertyId: 'prop-103',
      financialYear: '२०२६-२०२७',
      previousArrears: 1200,
      penaltyOrInterest: 120,
      rebateOrDiscount: 0,
      payments: [],
    },
    'prop-104': {
      propertyId: 'prop-104',
      financialYear: '२०२६-२०२७',
      previousArrears: 0,
      penaltyOrInterest: 0,
      rebateOrDiscount: 0,
      payments: [],
    },
    'prop-105': {
      propertyId: 'prop-105',
      financialYear: '२०२६-२०२७',
      previousArrears: 0,
      penaltyOrInterest: 0,
      rebateOrDiscount: 0,
      payments: [
        {
          id: 'pay-3',
          receiptNo: 'GP-10/2026/014',
          date: '2026-07-04',
          amountPaid: 334,
          mode: 'नगद',
          note: 'संपूर्ण कर जमा',
        },
      ],
    },
    'prop-106': {
      propertyId: 'prop-106',
      financialYear: '२०२६-२०२७',
      previousArrears: 250,
      penaltyOrInterest: 0,
      rebateOrDiscount: 0,
      payments: [],
    },
  };

  return { properties, namuna9Records };
}

export function createNewVillageWorkspace(
  panchayat: PanchayatProfile,
  includeStarterProperty: boolean
): VillageWorkspace {
  const id = `gp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  if (!includeStarterProperty) {
    return {
      id,
      panchayat,
      properties: [],
      namuna9Records: {},
    };
  }
  const starterPropId = `prop-${Date.now()}-1`;
  const starter = buildSeedProperty({
    id: starterPropId,
    propertyNo: '१०१',
    wardNo: '१',
    wardName: 'मुख्य रस्ता',
    surveyOrGutNo: 'गट क्र. १',
    ownerName: 'नमुना खातेदार नाव',
    spouseName: '',
    occupantName: 'स्वतः',
    constructionType: 'rcc',
    usageType: 'residential',
    constructionYear: 2020,
    lengthFt: 30,
    widthFt: 25,
    readyReckonerRate: 12000,
    ratePaisePer1000: 150,
    lightingTax: 100,
    healthTax: 80,
    generalWaterTax: 150,
    hasPrivateTap: false,
    specialWaterTax: 0,
    encumbranceOrRemarks: 'बोजा नाही',
  });
  return {
    id,
    panchayat,
    properties: [starter],
    namuna9Records: {
      [starterPropId]: {
        propertyId: starterPropId,
        financialYear: panchayat.financialYear,
        previousArrears: 0,
        penaltyOrInterest: 0,
        rebateOrDiscount: 0,
        payments: [],
      },
    },
  };
}

export function createInitialGPState(): GPAppState {
  const sample = createSampleProperties();
  const defaultVillageId = 'gp-shivpur';

  return {
    activeVillageId: defaultVillageId,
    villages: [
      {
        id: defaultVillageId,
        panchayat: {
          panchayatName: 'ग्रामपंचायत शिवपूर',
          taluka: 'हवेली',
          district: 'पुणे',
          pinCode: '४१२२०७',
          gramsevakName: 'श्री. अनंत यशवंत कुलकर्णी',
          sarpanchName: 'सौ. वैशाली राजेंद्र मोरे',
          financialYear: '२०२६-२०२७',
          resolutionNo: 'ठराव क्र. ०४/२०२६',
          resolutionDate: '२०२६-०४-०१',
        },
        properties: sample.properties,
        namuna9Records: sample.namuna9Records,
      },
    ],
    paymentAccount: {
      accountHolderName: 'ग्रामपंचायत डिजिटल सेवा खाते',
      upiId: 'yourname@okaxis',
      bankName: 'स्टेट बँक ऑफ इंडिया (SBI)',
      accountLast4: '4829',
      ifscCode: 'SBIN0001234',
      mobileNumber: '9850000000',
      utaraFeeRs: 10,
    },
    feeTransactions: [
      {
        id: 'fee-1',
        receiptNo: 'GP-FEE-2026-0001',
        panchayatName: 'ग्रामपंचायत शिवपूर',
        documentType: 'namuna8',
        propertyNo: '१०१',
        ownerName: 'रमेश दत्तात्रय पाटील',
        amountRs: 10,
        utrNumber: '431829401275',
        paidToUpi: 'yourname@okaxis',
        paidAt: '2026-11-18T11:20:00.000Z',
        status: 'verified',
      },
    ],
  };
}

export function loadGPState(): GPAppState {
  if (typeof window === 'undefined') return createInitialGPState();
  try {
    const rawV2 = window.localStorage.getItem(STORAGE_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as GPAppState;
      if (parsed && Array.isArray(parsed.villages) && parsed.villages.length > 0) {
        return parsed;
      }
    }

    // Migrate legacy v1 state seamlessly if present
    const rawV1 = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (rawV1) {
      const legacy = JSON.parse(rawV1) as {
        panchayat?: PanchayatProfile;
        paymentAccount?: GPAppState['paymentAccount'];
        properties?: PropertyAssessment[];
        namuna9Records?: Record<string, Namuna9Record>;
        feeTransactions?: GPAppState['feeTransactions'];
      };
      if (legacy && legacy.panchayat && Array.isArray(legacy.properties)) {
        const initial = createInitialGPState();
        return {
          activeVillageId: 'gp-migrated',
          villages: [
            {
              id: 'gp-migrated',
              panchayat: legacy.panchayat,
              properties: legacy.properties,
              namuna9Records: legacy.namuna9Records ?? {},
            },
          ],
          paymentAccount: legacy.paymentAccount ?? initial.paymentAccount,
          feeTransactions: legacy.feeTransactions ?? [],
        };
      }
    }

    return createInitialGPState();
  } catch {
    return createInitialGPState();
  }
}

export function saveGPState(state: GPAppState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}
