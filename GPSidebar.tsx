import {
  BookOpenCheck,
  Building2,
  FileSpreadsheet,
  IndianRupee,
  Landmark,
  Pencil,
  ReceiptIndianRupee,
  X,
} from 'lucide-react';
import {
  OwnerPaymentAccount,
  PanchayatProfile,
  VillageWorkspace,
} from '../types/grampanchayat';
import { formatINR } from '../utils/taxCalculator';

export type GPAppSection = 'namuna8' | 'namuna9' | 'tax_rules' | 'account_settings';

interface GPSidebarProps {
  activeSection: GPAppSection;
  onSelectSection: (section: GPAppSection) => void;
  panchayat: PanchayatProfile;
  villages: VillageWorkspace[];
  activeVillageId: string;
  onSelectVillage: (villageId: string) => void;
  onOpenVillageManager: (tab: 'edit' | 'switch' | 'add') => void;
  paymentAccount: OwnerPaymentAccount;
  totalProperties: number;
  totalFeeCollected: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: GPAppSection;
  label: string;
  sublabel: string;
  icon: typeof FileSpreadsheet;
}> = [
  {
    id: 'namuna8',
    label: 'नमुना क्र. ८ — उतारा',
    sublabel: 'कर आकारणी व मालमत्ता नोंदवही',
    icon: FileSpreadsheet,
  },
  {
    id: 'namuna9',
    label: 'नमुना क्र. ९ — मागणी वसुली',
    sublabel: 'थकबाकी, पट्टी व पावती नोंद',
    icon: ReceiptIndianRupee,
  },
  {
    id: 'tax_rules',
    label: 'पट्टी व दर नियम (Maha.gov)',
    sublabel: 'शासन निर्णय २०१५ व कॅल्क्युलेटर',
    icon: BookOpenCheck,
  },
  {
    id: 'account_settings',
    label: 'माझे खाते व ₹१० जमा वही',
    sublabel: 'UPI / बँक खाते व ग्रामपंचायत माहिती',
    icon: Landmark,
  },
];

export function GPSidebar({
  activeSection,
  onSelectSection,
  panchayat,
  villages,
  activeVillageId,
  onSelectVillage,
  onOpenVillageManager,
  paymentAccount,
  totalProperties,
  totalFeeCollected,
  mobileOpen,
  onCloseMobile,
}: GPSidebarProps) {
  const sidebarBody = (
    <div className="flex h-full flex-col bg-white border-r border-slate-200 w-[268px]">
      {/* Brand Header */}
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-blue-800 text-white flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900 truncate">
              ग्रामपंचायत नमुना ८ व ९
            </div>
            <div className="text-[11px] text-slate-500 truncate">
              फक्त नमुना ८ व ९ उतारा सेवा
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          aria-label="साइडबार बंद करा"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Active Village Selector & Quick Rename */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-slate-500">
            सक्रिय ग्रामपंचायत ({villages.length} गावे)
          </span>
          <button
            type="button"
            onClick={() => {
              onOpenVillageManager('edit');
              onCloseMobile();
            }}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 whitespace-nowrap"
          >
            <Pencil className="h-3 w-3" />
            नाव बदला
          </button>
        </div>

        {villages.length > 1 ? (
          <select
            value={activeVillageId}
            onChange={(e) => onSelectVillage(e.target.value)}
            aria-label="ग्रामपंचायत निवडा"
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:border-blue-700 focus:outline-none"
          >
            {villages.map((v) => (
              <option key={v.id} value={v.id}>
                {v.panchayat.panchayatName}
              </option>
            ))}
          </select>
        ) : (
          <div className="text-xs font-bold text-slate-900 truncate">
            {panchayat.panchayatName}
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span className="truncate">
            ता. {panchayat.taluka || '-'} · जि. {panchayat.district || '-'}
          </span>
          <span className="font-mono font-semibold text-slate-700 shrink-0 tabular-nums">
            {totalProperties} मिळकती
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            onOpenVillageManager('add');
            onCloseMobile();
          }}
          className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition-colors text-center"
        >
          + इतर गाव / ग्रामपंचायत जोडा
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto" aria-label="मुख्य मेनू">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectSection(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-900 border border-blue-200'
                  : 'text-slate-700 hover:bg-slate-100 border border-transparent'
              }`}
            >
              <Icon
                className={`h-4 w-4 mt-0.5 shrink-0 ${
                  isActive ? 'text-blue-700' : 'text-slate-500'
                }`}
              />
              <div className="min-w-0">
                <div className="text-xs sm:text-[13px] font-semibold truncate">
                  {item.label}
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                  {item.sublabel}
                </div>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Bottom Direct Fee Summary */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>उतारा डाउनलोड शुल्क</span>
          <span className="font-mono font-bold text-slate-900 tabular-nums">
            ₹{paymentAccount.utaraFeeRs}/PDF
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-600 mt-1.5">
          <span>थेट खात्यात जमा</span>
          <span className="inline-flex items-center gap-0.5 font-mono font-bold text-emerald-700 tabular-nums">
            <IndianRupee className="h-3 w-3" />
            {formatINR(totalFeeCollected)}
          </span>
        </div>
        <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] text-slate-500 truncate font-mono">
          UPI: {paymentAccount.upiId}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Static Sidebar */}
      <aside className="hidden lg:block shrink-0 no-print">{sidebarBody}</aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{sidebarBody}</div>
        </div>
      )}
    </>
  );
}
