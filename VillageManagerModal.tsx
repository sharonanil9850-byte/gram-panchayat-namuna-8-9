import { useEffect, useState } from 'react';
import { Building2, Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { PanchayatProfile, VillageWorkspace } from '../types/grampanchayat';

interface VillageManagerModalProps {
  isOpen: boolean;
  initialTab?: 'edit' | 'switch' | 'add';
  villages: VillageWorkspace[];
  activeVillage: VillageWorkspace;
  onClose: () => void;
  onSelectVillage: (villageId: string) => void;
  onUpdateVillagePanchayat: (villageId: string, next: PanchayatProfile) => void;
  onAddVillage: (panchayat: PanchayatProfile, includeStarterProperty: boolean) => void;
  onDeleteVillage: (villageId: string) => void;
}

function emptyPanchayatTemplate(): PanchayatProfile {
  return {
    panchayatName: 'ग्रामपंचायत ',
    taluka: '',
    district: '',
    pinCode: '',
    gramsevakName: '',
    sarpanchName: '',
    financialYear: '२०२६-२०२७',
    resolutionNo: 'ठराव क्र. ०१/२०२६',
    resolutionDate: '२०२६-०४-०१',
  };
}

export function VillageManagerModal({
  isOpen,
  initialTab = 'edit',
  villages,
  activeVillage,
  onClose,
  onSelectVillage,
  onUpdateVillagePanchayat,
  onAddVillage,
  onDeleteVillage,
}: VillageManagerModalProps) {
  const [tab, setTab] = useState<'edit' | 'switch' | 'add'>(initialTab);
  const [editForm, setEditForm] = useState<PanchayatProfile>(activeVillage.panchayat);
  const [newForm, setNewForm] = useState<PanchayatProfile>(emptyPanchayatTemplate);
  const [includeStarter, setIncludeStarter] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setEditForm(activeVillage.panchayat);
      setNewForm(emptyPanchayatTemplate());
    }
  }, [isOpen, initialTab, activeVillage]);

  if (!isOpen) return null;

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.panchayatName.trim()) return;
    onUpdateVillagePanchayat(activeVillage.id, {
      ...editForm,
      panchayatName: editForm.panchayatName.trim(),
    });
    onClose();
  };

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.panchayatName.trim()) return;
    onAddVillage(
      {
        ...newForm,
        panchayatName: newForm.panchayatName.trim(),
      },
      includeStarter
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="village-manager-title"
    >
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 id="village-manager-title" className="text-base font-bold text-slate-900">
              ग्रामपंचायत नाव बदला / इतर गावे जोडा
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              प्रत्येक गावाची नमुना ८ व ९ नोंदवही वेगळी राहील आणि सर्व ₹१० शुल्क तुमच्याच खात्यावर येतील.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
            aria-label="बंद करा"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="px-5 pt-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
            <button
              type="button"
              onClick={() => setTab('edit')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                tab === 'edit'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Pencil className="h-3.5 w-3.5 inline mr-1" />
              सध्याच्या गावाचे नाव बदला
            </button>
            <button
              type="button"
              onClick={() => setTab('switch')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                tab === 'switch'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="h-3.5 w-3.5 inline mr-1" />
              सर्व गावे ({villages.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('add')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                tab === 'add'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Plus className="h-3.5 w-3.5 inline mr-1" />
              नवीन गाव जोडा
            </button>
          </div>
          <div className="h-3" />
        </div>

        <div className="p-5 max-h-[75vh] overflow-y-auto">
          {tab === 'edit' && (
            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    ग्रामपंचायतीचे नाव *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.panchayatName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, panchayatName: e.target.value })
                    }
                    placeholder="उदा. ग्रामपंचायत वाघोली"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">तालुका</label>
                  <input
                    type="text"
                    value={editForm.taluka}
                    onChange={(e) => setEditForm({ ...editForm, taluka: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">जिल्हा</label>
                  <input
                    type="text"
                    value={editForm.district}
                    onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ग्रामसेवक नाव</label>
                  <input
                    type="text"
                    value={editForm.gramsevakName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, gramsevakName: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">सरपंच नाव</label>
                  <input
                    type="text"
                    value={editForm.sarpanchName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, sarpanchName: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">पिन कोड</label>
                  <input
                    type="text"
                    value={editForm.pinCode}
                    onChange={(e) => setEditForm({ ...editForm, pinCode: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">आर्थिक वर्ष</label>
                  <input
                    type="text"
                    value={editForm.financialYear}
                    onChange={(e) =>
                      setEditForm({ ...editForm, financialYear: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    कर दर ठराव क्रमांक
                  </label>
                  <input
                    type="text"
                    value={editForm.resolutionNo}
                    onChange={(e) =>
                      setEditForm({ ...editForm, resolutionNo: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-700 px-5 py-2 font-semibold text-white hover:bg-blue-800"
                >
                  ग्रामपंचायत नाव जतन करा
                </button>
              </div>
            </form>
          )}

          {tab === 'switch' && (
            <div className="space-y-3">
              {villages.map((v) => {
                const isActive = v.id === activeVillage.id;
                return (
                  <div
                    key={v.id}
                    className={`flex items-center justify-between gap-3 rounded-lg border p-3.5 ${
                      isActive
                        ? 'border-blue-300 bg-blue-50/70'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate">
                        {v.panchayat.panchayatName}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        ता. {v.panchayat.taluka || '-'} · जि. {v.panchayat.district || '-'} ·{' '}
                        <span className="font-mono font-semibold text-slate-700">
                          {v.properties.length}
                        </span>{' '}
                        मिळकती
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-800 px-2.5 py-1">
                          <Check className="h-3.5 w-3.5" />
                          सक्रिय गाव
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectVillage(v.id);
                            onClose();
                          }}
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
                        >
                          निवडा
                        </button>
                      )}

                      {villages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onDeleteVillage(v.id)}
                          title="गाव हटवा"
                          className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setTab('add')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                >
                  <Plus className="h-4 w-4" />
                  नवीन ग्रामपंचायत जोडा
                </button>
              </div>
            </div>
          )}

          {tab === 'add' && (
            <form onSubmit={handleAddNew} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    नवीन ग्रामपंचायतीचे नाव *
                  </label>
                  <input
                    type="text"
                    required
                    value={newForm.panchayatName}
                    onChange={(e) =>
                      setNewForm({ ...newForm, panchayatName: e.target.value })
                    }
                    placeholder="उदा. ग्रामपंचायत रांजणगाव"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">तालुका *</label>
                  <input
                    type="text"
                    required
                    value={newForm.taluka}
                    onChange={(e) => setNewForm({ ...newForm, taluka: e.target.value })}
                    placeholder="उदा. शिरूर"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">जिल्हा *</label>
                  <input
                    type="text"
                    required
                    value={newForm.district}
                    onChange={(e) => setNewForm({ ...newForm, district: e.target.value })}
                    placeholder="उदा. पुणे"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ग्रामसेवक नाव</label>
                  <input
                    type="text"
                    value={newForm.gramsevakName}
                    onChange={(e) =>
                      setNewForm({ ...newForm, gramsevakName: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">सरपंच नाव</label>
                  <input
                    type="text"
                    value={newForm.sarpanchName}
                    onChange={(e) =>
                      setNewForm({ ...newForm, sarpanchName: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeStarter}
                  onChange={(e) => setIncludeStarter(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-700"
                />
                <span className="text-slate-700">
                  सुरुवातीसाठी १ नमुना मिळकत नोंद (१०१) तयार ठेवा (नंतर बदलता येईल)
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-700 px-5 py-2 font-semibold text-white hover:bg-blue-800"
                >
                  नवीन गाव तयार करा
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
