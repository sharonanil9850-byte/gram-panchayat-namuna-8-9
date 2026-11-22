export type ConstructionType =
  | 'hut_mud'
  | 'stone_brick_mud'
  | 'stone_brick_cement'
  | 'rcc'
  | 'open_plot';

export type UsageType = 'residential' | 'commercial' | 'industrial';

export interface PropertyAssessment {
  id: string;
  propertyNo: string; // मिळकत क्रमांक (उदा. 101/A)
  wardNo: string; // वार्ड क्र.
  wardName: string; // वार्ड / गल्ली / रस्त्याचे नाव
  surveyOrGutNo: string; // गट क्र. / सर्व्हे क्र.
  ownerName: string; // घरमालकाचे पूर्ण नाव
  spouseName: string; // पती / पत्नीचे नाव (संयुक्त नोंद - शासन नियम २००३)
  occupantName: string; // भोगवटादाराचे नाव
  constructionType: ConstructionType;
  usageType: UsageType;
  constructionYear: number; // बांधकाम वर्ष
  lengthFt: number; // लांबी (फूट)
  widthFt: number; // रुंदी (फूट)
  areaSqFt: number; // एकूण क्षेत्रफळ (चौ. फूट)
  areaSqM: number; // क्षेत्रफळ (चौ. मी.)
  readyReckonerRate: number; // रेडीरेकनर दर (₹ प्रति चौ. मी.)
  depreciationFactor: number; // वयोमान / घसारा घटक
  usageFactor: number; // वापर भारांक
  capitalValue: number; // भांडवली मूल्य (₹)
  houseTaxRatePer1000: number; // ग्रामपंचायत ठराव दर (₹ प्रति ₹१००० मूल्यामागे)
  houseTax: number; // वार्षिक घरपट्टी (₹)
  lightingTax: number; // दिवाबत्ती कर (₹)
  healthTax: number; // आरोग्य / स्वच्छता कर (₹)
  generalWaterTax: number; // सामान्य पाणीपट्टी (₹)
  hasPrivateTap: boolean; // वैयक्तिक नळ जोडणी आहे का?
  specialWaterTax: number; // विशेष नळ पाणीपट्टी (₹)
  totalAnnualTax: number; // एकूण वार्षिक कर (नमुना ८)
  encumbranceOrRemarks: string; // बोजा / कर्ज / फेरफार शेरा
  pageNo?: string; // पान क्र.
  rrLandRate?: number; // रेडिरेकनर जमीन दर
  rrBuildingRate?: number; // रेडिरेकनर इमारत दर
  rrConstructionRate?: number; // रेडिरेकनर बांधकाम दर
  updatedAt: string;
}

export interface TaxCollectionPayment {
  id: string;
  receiptNo: string; // ग्रामपंचायत नमुना १० / पावती क्र.
  date: string; // ISO YYYY-MM-DD
  amountPaid: number;
  mode: 'नगद' | 'UPI' | 'धनादेश';
  note?: string;
}

export interface Namuna9Record {
  propertyId: string;
  financialYear: string; // उदा. "२०२६-२०२७"
  previousArrears: number; // मागील थकबाकी (₹)
  penaltyOrInterest: number; // दंड / व्याज (₹)
  rebateOrDiscount: number; // सूट / माफी (₹)
  payments: TaxCollectionPayment[];
}

export interface PanchayatProfile {
  panchayatName: string;
  taluka: string;
  district: string;
  pinCode: string;
  gramsevakName: string;
  sarpanchName: string;
  financialYear: string;
  resolutionNo: string; // घरपट्टी दर ठराव क्रमांक
  resolutionDate: string;
}

export interface OwnerPaymentAccount {
  accountHolderName: string;
  upiId: string;
  bankName: string;
  accountLast4: string;
  ifscCode: string;
  mobileNumber: string;
  utaraFeeRs: number; // ₹10 fixed per download
}

export interface FeeTransaction {
  id: string;
  receiptNo: string; // GP-FEE-2026-XXXX
  panchayatName?: string; // कोणत्या ग्रामपंचायतीचा उतारा
  documentType: 'namuna8' | 'namuna9' | 'namuna8_register' | 'namuna9_register';
  propertyNo: string;
  ownerName: string;
  amountRs: number; // ₹10
  utrNumber: string; // 12-digit UPI UTR or counter ref
  paidToUpi: string;
  paidAt: string; // ISO timestamp
  status: 'verified';
}

export interface VillageWorkspace {
  id: string;
  panchayat: PanchayatProfile;
  properties: PropertyAssessment[];
  namuna9Records: Record<string, Namuna9Record>;
}

export interface GPAppState {
  activeVillageId: string;
  villages: VillageWorkspace[];
  paymentAccount: OwnerPaymentAccount;
  feeTransactions: FeeTransaction[];
}
