import { useState } from 'react';
import {
  Check,
  Edit3,
  ListPlus,
  Plus,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { ClassRoom, Student } from '../types/attendance';

interface ClassStudentManagerProps {
  classes: ClassRoom[];
  activeClassId: string;
  onSelectClass: (classId: string) => void;
  onAddClass: (newClass: Omit<ClassRoom, 'id' | 'students'>) => void;
  onUpdateClass: (classId: string, patch: Partial<Omit<ClassRoom, 'id' | 'students'>>) => void;
  onDeleteClass: (classId: string) => void;
  onAddStudent: (classId: string, student: Omit<Student, 'id'>) => void;
  onBulkAddStudents: (classId: string, names: string[]) => void;
  onUpdateStudent: (classId: string, studentId: string, patch: Partial<Omit<Student, 'id'>>) => void;
  onDeleteStudent: (classId: string, studentId: string) => void;
}

export function ClassStudentManager({
  classes,
  activeClassId,
  onSelectClass,
  onAddClass,
  onUpdateClass,
  onDeleteClass,
  onAddStudent,
  onBulkAddStudents,
  onUpdateStudent,
  onDeleteStudent,
}: ClassStudentManagerProps) {
  const activeClass = classes.find((c) => c.id === activeClassId);

  // Add class form
  const [showAddClass, setShowAddClass] = useState(false);
  const [stdInput, setStdInput] = useState('');
  const [divInput, setDivInput] = useState('');
  const [teacherInput, setTeacherInput] = useState('');
  const [yearInput, setYearInput] = useState('२०२६-२७');

  // Edit class teacher
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editTeacherName, setEditTeacherName] = useState('');

  // Add single student
  const [rollInput, setRollInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');

  // Bulk add students
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // Edit single student
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editRoll, setEditRoll] = useState('');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // Confirm delete state (no window.confirm)
  const [confirmDeleteClassId, setConfirmDeleteClassId] = useState<string | null>(null);
  const [confirmDeleteStudentId, setConfirmDeleteStudentId] = useState<string | null>(null);

  const sortedStudents = activeClass
    ? [...activeClass.students].sort((a, b) => a.rollNo - b.rollNo)
    : [];

  const nextRollNumber =
    sortedStudents.length > 0
      ? Math.max(...sortedStudents.map((s) => s.rollNo)) + 1
      : 1;

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stdInput.trim()) return;
    onAddClass({
      standard: stdInput.trim(),
      division: divInput.trim() || 'अ',
      teacherName: teacherInput.trim() || 'वर्गशिक्षक',
      academicYear: yearInput.trim() || '२०२६-२७',
    });
    setStdInput('');
    setDivInput('');
    setTeacherInput('');
    setShowAddClass(false);
  };

  const handleAddSingleStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClass || !nameInput.trim()) return;
    const parsedRoll = Number(rollInput) || nextRollNumber;
    onAddStudent(activeClass.id, {
      rollNo: parsedRoll,
      name: nameInput.trim(),
      parentPhone: phoneInput.trim() || undefined,
    });
    setRollInput('');
    setNameInput('');
    setPhoneInput('');
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClass) return;
    const names = bulkText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    onBulkAddStudents(activeClass.id, names);
    setBulkText('');
    setShowBulkModal(false);
  };

  const startEditStudent = (s: Student) => {
    setEditingStudentId(s.id);
    setEditRoll(String(s.rollNo));
    setEditName(s.name);
    setEditPhone(s.parentPhone || '');
  };

  const saveEditStudent = (studentId: string) => {
    if (!activeClass || !editName.trim()) return;
    onUpdateStudent(activeClass.id, studentId, {
      rollNo: Number(editRoll) || 1,
      name: editName.trim(),
      parentPhone: editPhone.trim() || undefined,
    });
    setEditingStudentId(null);
  };

  return (
    <div className="space-y-5">
      {/* Classes Management Panel */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              वर्ग व विद्यार्थी व्यवस्थापन
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              नवीन वर्ग तयार करा, वर्गशिक्षकाचे नाव बदला आणि विद्यार्थ्यांची यादी अद्ययावत ठेवा
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddClass((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>नवीन वर्ग जोडा</span>
          </button>
        </div>

        {/* Add Class Form */}
        {showAddClass && (
          <form
            onSubmit={handleCreateClass}
            className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
          >
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                इयत्ता *
              </label>
              <input
                type="text"
                required
                value={stdInput}
                onChange={(e) => setStdInput(e.target.value)}
                placeholder="उदा. इयत्ता ७ वी"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                तुकडी
              </label>
              <input
                type="text"
                value={divInput}
                onChange={(e) => setDivInput(e.target.value)}
                placeholder="उदा. अ"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                वर्गशिक्षकाचे नाव
              </label>
              <input
                type="text"
                value={teacherInput}
                onChange={(e) => setTeacherInput(e.target.value)}
                placeholder="उदा. श्री. पाटील"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                शैक्षणिक वर्ष
              </label>
              <input
                type="text"
                value={yearInput}
                onChange={(e) => setYearInput(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
              >
                तयार करा
              </button>
              <button
                type="button"
                onClick={() => setShowAddClass(false)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                रद्द
              </button>
            </div>
          </form>
        )}

        {/* Class Cards Grid */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {classes.map((cls) => {
            const isSelected = cls.id === activeClassId;
            const isEditing = editingClassId === cls.id;
            const isConfirmingDel = confirmDeleteClassId === cls.id;

            return (
              <div
                key={cls.id}
                className={`rounded-xl border p-4 transition-colors ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/40'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectClass(cls.id)}
                    className="text-left flex-1 min-w-0"
                  >
                    <div className="text-base font-bold text-slate-900 truncate">
                      {cls.standard} - तुकडी {cls.division}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {cls.students.length} विद्यार्थी · वर्ष {cls.academicYear}
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingClassId(cls.id);
                        setEditTeacherName(cls.teacherName);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      title="शिक्षक नाव बदला"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    {classes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteClassId(cls.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700"
                        title="वर्ग काढून टाका"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="text"
                      value={editTeacherName}
                      onChange={(e) => setEditTeacherName(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:border-blue-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (editTeacherName.trim()) {
                          onUpdateClass(cls.id, {
                            teacherName: editTeacherName.trim(),
                          });
                        }
                        setEditingClassId(null);
                      }}
                      className="p-1.5 rounded-lg bg-green-700 text-white hover:bg-green-800"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingClassId(null)}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-slate-600">
                    वर्गशिक्षक: <span className="font-medium text-slate-800">{cls.teacherName}</span>
                  </div>
                )}

                {isConfirmingDel && (
                  <div className="mt-3 pt-3 border-t border-red-200 flex items-center justify-between gap-2 text-xs">
                    <span className="text-red-700 font-medium">हा वर्ग काढायचा का?</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteClass(cls.id);
                          setConfirmDeleteClassId(null);
                        }}
                        className="px-2.5 py-1 rounded bg-red-700 text-white font-medium hover:bg-red-800"
                      >
                        हो, काढा
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteClassId(null)}
                        className="px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-600"
                      >
                        नाही
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Students Table & Add Forms for Active Class */}
      {activeClass && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {activeClass.standard} - तुकडी {activeClass.division} · विद्यार्थी यादी ({sortedStudents.length})
              </h2>
              <p className="text-xs text-slate-500">
                एकूण विद्यार्थी नावे, हजेरी क्रमांक आणि पालक संपर्क क्रमांक व्यवस्थापित करा
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowBulkModal((v) => !v)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
            >
              <ListPlus className="h-4 w-4 text-blue-700" />
              <span>एकाच वेळी अनेक नावे जोडा</span>
            </button>
          </div>

          {/* Bulk Add Panel */}
          {showBulkModal && (
            <form
              onSubmit={handleBulkSubmit}
              className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 space-y-3"
            >
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-800">
                  प्रत्येक ओळीवर एका विद्यार्थ्याचे पूर्ण नाव पेस्ट करा (हजेरी क्रमांक {nextRollNumber} पासून आपोआप दिले जातील):
                </label>
              </div>
              <textarea
                rows={5}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={'उदा.\nअजय रमेश कदम\nस्नेहा सुहास देशपांडे\nरोहित सुनील मोरे'}
                className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
                >
                  यादी जोडा
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  बंद करा
                </button>
              </div>
            </form>
          )}

          {/* Add Single Student Form */}
          <form
            onSubmit={handleAddSingleStudent}
            className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
          >
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                हजेरी क्र.
              </label>
              <input
                type="number"
                min={1}
                value={rollInput}
                onChange={(e) => setRollInput(e.target.value)}
                placeholder={String(nextRollNumber)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono tabular-nums focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-5">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                विद्यार्थ्याचे पूर्ण नाव *
              </label>
              <input
                type="text"
                required
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="प्रथम नाव, वडिलांचे नाव, आडनाव"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                पालक मोबाईल क्र. (ऐच्छिक)
              </label>
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="98XXXXXXXX"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono tabular-nums focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                <UserPlus className="h-4 w-4" />
                <span>विद्यार्थी जोडा</span>
              </button>
            </div>
          </form>

          {/* Student List Table */}
          {sortedStudents.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              या वर्गात अद्याप विद्यार्थी नोंदवलेले नाहीत. वरून नवीन विद्यार्थी जोडा.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-3 pl-4 pr-3 w-24">ह. क्र.</th>
                    <th className="py-3 px-3 min-w-[220px]">विद्यार्थ्याचे पूर्ण नाव</th>
                    <th className="py-3 px-3 w-44">पालक संपर्क</th>
                    <th className="py-3 pl-3 pr-4 text-right w-40">कृती</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {sortedStudents.map((s) => {
                    const isEditing = editingStudentId === s.id;
                    const isConfirmingDel = confirmDeleteStudentId === s.id;

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 pl-4 pr-3 font-mono tabular-nums font-semibold text-slate-700">
                          {isEditing ? (
                            <input
                              type="number"
                              min={1}
                              value={editRoll}
                              onChange={(e) => setEditRoll(e.target.value)}
                              className="w-16 rounded border border-slate-300 px-2 py-1 text-sm font-mono"
                            />
                          ) : (
                            String(s.rollNo).padStart(2, '0')
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full rounded border border-slate-300 px-2.5 py-1 text-sm"
                            />
                          ) : (
                            s.name
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-xs text-slate-600">
                          {isEditing ? (
                            <input
                              type="tel"
                              value={editPhone}
                              onChange={(e) => setEditPhone(e.target.value)}
                              className="w-full rounded border border-slate-300 px-2.5 py-1 text-xs font-mono"
                            />
                          ) : (
                            s.parentPhone || '-'
                          )}
                        </td>
                        <td className="py-2.5 pl-3 pr-4 text-right">
                          {isEditing ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => saveEditStudent(s.id)}
                                className="px-2.5 py-1 rounded bg-green-700 text-xs font-medium text-white hover:bg-green-800"
                              >
                                जतन
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingStudentId(null)}
                                className="px-2.5 py-1 rounded border border-slate-200 text-xs text-slate-600 hover:bg-slate-100"
                              >
                                रद्द
                              </button>
                            </div>
                          ) : isConfirmingDel ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteStudent(activeClass.id, s.id);
                                  setConfirmDeleteStudentId(null);
                                }}
                                className="px-2.5 py-1 rounded bg-red-700 text-xs font-medium text-white hover:bg-red-800"
                              >
                                काढा
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteStudentId(null)}
                                className="px-2.5 py-1 rounded border border-slate-200 text-xs text-slate-600"
                              >
                                रद्द
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => startEditStudent(s)}
                                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                title="माहिती बदला"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteStudentId(s.id)}
                                className="p-1.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700"
                                title="विद्यार्थी काढा"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
