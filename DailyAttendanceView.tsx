import { useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileDown,
  RotateCcw,
  Save,
  Search,
  Umbrella,
  X,
} from 'lucide-react';
import {
  AttendanceStatus,
  ClassRoom,
  DayRecord,
  SchoolProfile,
  StudentAttendanceEntry,
} from '../types/attendance';
import {
  formatMarathiDate,
  getMarathiDayName,
  getTodayIso,
  isSunday,
  shiftIsoDate,
} from '../utils/marathiCalendar';
import {
  downloadDailyAttendancePdf,
  formatExportTimestamp,
} from '../utils/pdfGenerator';

interface DailyAttendanceViewProps {
  school: SchoolProfile;
  classroom: ClassRoom | undefined;
  selectedDate: string;
  onChangeDate: (isoDate: string) => void;
  record: DayRecord | undefined;
  onSaveRecord: (nextRecord: DayRecord) => void;
  onNavigateToClasses: () => void;
}

type FilterMode = 'all' | 'present' | 'absent' | 'leave' | 'unmarked';

export function DailyAttendanceView({
  school,
  classroom,
  selectedDate,
  onChangeDate,
  record,
  onSaveRecord,
  onNavigateToClasses,
}: DailyAttendanceViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [holidayReasonInput, setHolidayReasonInput] = useState('');
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const sortedStudents = useMemo(() => {
    if (!classroom) return [];
    return [...classroom.students].sort((a, b) => a.rollNo - b.rollNo);
  }, [classroom]);

  const entries = record?.entries ?? {};
  const isHoliday = Boolean(record?.isHoliday);
  const dateIsSunday = isSunday(selectedDate);

  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let leave = 0;
    let unmarked = 0;

    for (const s of sortedStudents) {
      const st = entries[s.id]?.status;
      if (st === 'present') present++;
      else if (st === 'absent') absent++;
      else if (st === 'leave') leave++;
      else unmarked++;
    }

    const total = sortedStudents.length;
    const markedCount = present + absent + leave;
    const pct = total > 0 ? Math.round((present / total) * 1000) / 10 : 0;

    return { total, present, absent, leave, unmarked, markedCount, pct };
  }, [sortedStudents, entries]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sortedStudents.filter((s) => {
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        String(s.rollNo).includes(q);
      if (!matchesSearch) return false;

      const status = entries[s.id]?.status;
      if (filterMode === 'all') return true;
      if (filterMode === 'unmarked') return !status;
      return status === filterMode;
    });
  }, [sortedStudents, searchQuery, filterMode, entries]);

  if (!classroom) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <h2 className="text-lg font-semibold text-slate-900">
          कोणताही वर्ग निवडलेला नाही
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          दैनिक हजेरी नोंदवण्यासाठी प्रथम वर्ग आणि विद्यार्थी यादी तयार करा.
        </p>
        <button
          type="button"
          onClick={onNavigateToClasses}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800 transition-colors"
        >
          वर्ग व विद्यार्थी जोडा
        </button>
      </div>
    );
  }

  const updateEntries = (
    nextEntries: Record<string, StudentAttendanceEntry>,
    feedbackText?: string
  ) => {
    const nextRecord: DayRecord = {
      date: selectedDate,
      classId: classroom.id,
      isHoliday: false,
      entries: nextEntries,
      updatedAt: new Date().toISOString(),
    };
    onSaveRecord(nextRecord);
    if (feedbackText) {
      setSaveFeedback(feedbackText);
      window.setTimeout(() => setSaveFeedback(null), 2500);
    }
  };

  const handleSetStatus = (studentId: string, status: AttendanceStatus) => {
    const prev = entries[studentId];
    const nextEntries = {
      ...entries,
      [studentId]: {
        status,
        note: prev?.note,
      },
    };
    updateEntries(nextEntries);
  };

  const handleSetNote = (studentId: string, note: string) => {
    const prev = entries[studentId];
    const nextEntries = {
      ...entries,
      [studentId]: {
        status: prev?.status ?? 'leave',
        note,
      },
    };
    updateEntries(nextEntries);
  };

  const handleMarkAllPresent = () => {
    const nextEntries: Record<string, StudentAttendanceEntry> = {};
    for (const s of sortedStudents) {
      nextEntries[s.id] = {
        status: 'present',
        note: entries[s.id]?.note,
      };
    }
    updateEntries(nextEntries, 'सर्व विद्यार्थी हजर म्हणून नोंदवले गेले.');
  };

  const handleClearDay = () => {
    updateEntries({}, 'आजची नोंद साफ केली आहे.');
  };

  const handleSaveExplicit = () => {
    updateEntries(entries, 'दैनिक हजेरी अचूकपणे जतन झाली.');
  };

  const handleToggleHoliday = () => {
    if (isHoliday) {
      onSaveRecord({
        date: selectedDate,
        classId: classroom.id,
        isHoliday: false,
        entries,
        updatedAt: new Date().toISOString(),
      });
      setShowHolidayForm(false);
    } else {
      setHolidayReasonInput(
        dateIsSunday ? 'रविवार (साप्ताहिक सुट्टी)' : 'शाळा सुट्टी'
      );
      setShowHolidayForm(true);
    }
  };

  const handleConfirmHoliday = () => {
    onSaveRecord({
      date: selectedDate,
      classId: classroom.id,
      isHoliday: true,
      holidayReason: holidayReasonInput.trim() || 'शाळा सुट्टी',
      entries: {},
      updatedAt: new Date().toISOString(),
    });
    setShowHolidayForm(false);
    setSaveFeedback('सुट्टीची नोंद जतन झाली.');
    window.setTimeout(() => setSaveFeedback(null), 2500);
  };

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    try {
      await downloadDailyAttendancePdf(school, classroom, selectedDate, record);
    } finally {
      setIsExporting(false);
    }
  };

  const todayIso = getTodayIso();

  return (
    <div className="space-y-5">
      {/* Top Toolbar: Date Navigation & Primary Actions */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">
              {classroom.standard} · तुकडी {classroom.division} · वर्गशिक्षक: {classroom.teacherName} · शैक्षणिक वर्ष {classroom.academicYear}
            </div>
            <h1 className="mt-1 text-xl font-bold text-slate-900">
              दैनिक हजेरी नोंदवही — {formatMarathiDate(selectedDate)} ({getMarathiDayName(selectedDate)})
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Date Stepper */}
            <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => onChangeDate(shiftIsoDate(selectedDate, -1))}
                className="p-2 rounded-md text-slate-600 hover:bg-white hover:text-slate-900 transition-colors"
                title="मागील दिवस"
                aria-label="मागील दिवस"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="relative flex items-center px-2">
                <Calendar className="h-4 w-4 text-slate-500 mr-1.5 pointer-events-none" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value) onChangeDate(e.target.value);
                  }}
                  className="bg-transparent text-sm font-mono tabular-nums font-medium text-slate-900 focus:outline-none cursor-pointer"
                  aria-label="दिनांक निवडा"
                />
              </div>
              <button
                type="button"
                onClick={() => onChangeDate(shiftIsoDate(selectedDate, 1))}
                className="p-2 rounded-md text-slate-600 hover:bg-white hover:text-slate-900 transition-colors"
                title="पुढील दिवस"
                aria-label="पुढील दिवस"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {selectedDate !== todayIso && (
              <button
                type="button"
                onClick={() => onChangeDate(todayIso)}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                आजचा दिनांक
              </button>
            )}

            <button
              type="button"
              onClick={handleToggleHoliday}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                isHoliday
                  ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Umbrella className="h-4 w-4" />
              <span>{isHoliday ? 'सुट्टी रद्द करा' : 'सुट्टी नोंदवा'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
            >
              <FileDown className="h-4 w-4" />
              <span>{isExporting ? 'PDF तयार होत आहे...' : 'दैनिक PDF डाउनलोड'}</span>
            </button>
          </div>
        </div>

        {/* Inline Holiday Form */}
        {showHolidayForm && !isHoliday && (
          <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <label className="text-sm font-medium text-slate-700 shrink-0">
              सुट्टीचे कारण:
            </label>
            <input
              type="text"
              value={holidayReasonInput}
              onChange={(e) => setHolidayReasonInput(e.target.value)}
              placeholder="उदा. रविवार, सार्वजनिक सुट्टी, दिवाळी सुट्टी"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleConfirmHoliday}
                className="px-4 py-2 rounded-lg bg-amber-600 text-sm font-medium text-white hover:bg-amber-700 transition-colors whitespace-nowrap"
              >
                सुट्टी जतन करा
              </button>
              <button
                type="button"
                onClick={() => setShowHolidayForm(false)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                रद्द करा
              </button>
            </div>
          </div>
        )}

        {/* Sunday gentle notice if not yet marked holiday */}
        {dateIsSunday && !isHoliday && !showHolidayForm && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-800">
            <span>
              टीप: निवडलेला दिनांक रविवार आहे. मासिक कार्यदिवसांच्या अचूक गणनेसाठी हा दिवस सुट्टी म्हणून नोंदवू शकता.
            </span>
            <button
              type="button"
              onClick={() => {
                onSaveRecord({
                  date: selectedDate,
                  classId: classroom.id,
                  isHoliday: true,
                  holidayReason: 'रविवार (साप्ताहिक सुट्टी)',
                  entries: {},
                  updatedAt: new Date().toISOString(),
                });
              }}
              className="font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-700"
            >
              रविवार सुट्टी नोंदवा
            </button>
          </div>
        )}
      </div>

      {/* Holiday Banner OR Live Attendance Register */}
      {isHoliday ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-8 text-center">
          <Umbrella className="mx-auto h-9 w-9 text-amber-700" />
          <h2 className="mt-3 text-lg font-bold text-slate-900">
            या दिवशी शाळेला सुट्टी नोंदवली आहे
          </h2>
          <p className="mt-1 text-sm text-slate-700">
            कारण: {record?.holidayReason || 'शाळा सुट्टी'} · हा दिवस मासिक कार्यदिवसांमध्ये मोजला जाणार नाही.
          </p>
          <button
            type="button"
            onClick={handleToggleHoliday}
            className="mt-5 inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-50 transition-colors"
          >
            सुट्टी रद्द करून हजेरी नोंदवा
          </button>
        </div>
      ) : (
        <>
          {/* Daily Attendance Summary Card (Quick Reference) */}
          <section
            aria-label="दैनिक हजेरी सारांश"
            className="rounded-xl border border-slate-200 bg-white overflow-hidden"
          >
            <div className="px-4 sm:px-5 py-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <h2 className="font-bold text-slate-900">दैनिक हजेरी सारांश</h2>
                <span className="text-slate-400" aria-hidden="true">·</span>
                <span className="font-medium text-slate-600">
                  {formatMarathiDate(selectedDate)} ({getMarathiDayName(selectedDate)})
                </span>
              </div>
              <div className="text-xs font-mono tabular-nums text-slate-600">
                नोंद पूर्ण: <span className="font-semibold text-slate-900">{stats.markedCount}</span> / {stats.total}
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
              <div className="px-4 sm:px-5 py-4">
                <div className="text-xs font-medium text-slate-500">
                  एकूण हजर (Present)
                </div>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono tabular-nums text-green-700">
                    {stats.present}
                  </span>
                  <span className="text-xs font-mono tabular-nums text-slate-500">
                    / {stats.total} विद्यार्थी
                  </span>
                </div>
              </div>

              <div className="px-4 sm:px-5 py-4">
                <div className="text-xs font-medium text-slate-500">
                  एकूण गैरहजर (Absent)
                </div>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono tabular-nums text-red-700">
                    {stats.absent}
                  </span>
                  <span className="text-xs text-slate-500">
                    रजा: <span className="font-mono tabular-nums font-semibold text-amber-700">{stats.leave}</span>
                  </span>
                </div>
              </div>

              <div className="px-4 sm:px-5 py-4">
                <div className="text-xs font-medium text-slate-500">
                  उपस्थिती टक्केवारी (%)
                </div>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono tabular-nums text-blue-700">
                    {stats.pct}%
                  </span>
                  <span className="text-xs text-slate-500">
                    {stats.total > 0 && stats.pct >= 75 ? 'नियमित प्रमाण' : stats.markedCount === 0 ? 'नोंद बाकी' : 'लक्ष द्या'}
                  </span>
                </div>
              </div>

              <div className="px-4 sm:px-5 py-4">
                <div className="text-xs font-medium text-slate-500">
                  एकूण विद्यार्थी व बाकी नोंदी
                </div>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono tabular-nums text-slate-900">
                    {stats.total}
                  </span>
                  <span className="text-xs text-slate-500">
                    बाकी: <span className="font-mono tabular-nums font-semibold text-slate-700">{stats.unmarked}</span>
                  </span>
                </div>
              </div>
            </div>

            {stats.total > 0 && (
              <div className="px-4 sm:px-5 py-3 border-t border-slate-200 bg-slate-50/40">
                <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden flex">
                  {stats.present > 0 && (
                    <div
                      className="h-full bg-green-600 transition-all"
                      style={{ width: `${(stats.present / stats.total) * 100}%` }}
                      title={`हजर: ${stats.present}`}
                    />
                  )}
                  {stats.leave > 0 && (
                    <div
                      className="h-full bg-amber-500 transition-all"
                      style={{ width: `${(stats.leave / stats.total) * 100}%` }}
                      title={`रजा: ${stats.leave}`}
                    />
                  )}
                  {stats.absent > 0 && (
                    <div
                      className="h-full bg-red-600 transition-all"
                      style={{ width: `${(stats.absent / stats.total) * 100}%` }}
                      title={`गैरहजर: ${stats.absent}`}
                    />
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Search, Filter & Batch Action Bar */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
                <div className="relative flex-1 max-w-xs">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="नाव किंवा हजेरी क्रमांक शोधा..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>

                {/* Segmented Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  {(
                    [
                      { id: 'all', label: `सर्व (${stats.total})` },
                      { id: 'present', label: `हजर (${stats.present})` },
                      { id: 'absent', label: `गैरहजर (${stats.absent})` },
                      { id: 'leave', label: `रजा (${stats.leave})` },
                      { id: 'unmarked', label: `बाकी (${stats.unmarked})` },
                    ] as Array<{ id: FilterMode; label: string }>
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFilterMode(tab.id)}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        filterMode === tab.id
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleMarkAllPresent}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-green-200 bg-green-50 text-xs font-semibold text-green-800 hover:bg-green-100 transition-colors whitespace-nowrap shrink-0"
                >
                  <CheckCheck className="h-4 w-4" />
                  <span>सर्व हजर करा</span>
                </button>

                {stats.markedCount > 0 && (
                  <button
                    type="button"
                    onClick={handleClearDay}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>नोंद साफ करा</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSaveExplicit}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>हजेरी जतन करा</span>
                </button>
              </div>
            </div>

            {/* Save confirmation / status strip */}
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <div>
                {saveFeedback ? (
                  <span className="font-semibold text-green-700">{saveFeedback}</span>
                ) : record?.updatedAt ? (
                  <span>
                    अंतिम जतन वेळ: {formatExportTimestamp(record.updatedAt)} · सर्व बदल स्वयंचलित जतन होतात
                  </span>
                ) : (
                  <span>आजची हजेरी अद्याप नोंदवलेली नाही · प्रत्येक विद्यार्थ्यासमोर स्थिती निवडा</span>
                )}
              </div>
              {stats.unmarked > 0 && (
                <div className="font-medium text-amber-700">
                  {stats.unmarked} विद्यार्थ्यांची नोंद बाकी आहे
                </div>
              )}
            </div>

            {/* Student Attendance Table */}
            {sortedStudents.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm text-slate-600">
                  या वर्गात अद्याप कोणताही विद्यार्थी जोडलेला नाही.
                </p>
                <button
                  type="button"
                  onClick={onNavigateToClasses}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
                >
                  विद्यार्थी जोडा
                </button>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                शोध किंवा फिल्टरनुसार कोणताही विद्यार्थी आढळला नाही.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                      <th className="py-3 pl-4 pr-3 w-20">ह. क्र.</th>
                      <th className="py-3 px-3 min-w-[200px]">विद्यार्थ्याचे पूर्ण नाव</th>
                      <th className="py-3 px-3 min-w-[270px]">उपस्थिती नोंदवा</th>
                      <th className="py-3 pl-3 pr-4 min-w-[200px]">शेरा / रजेचे कारण (ऐच्छिक)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {filteredStudents.map((student) => {
                      const entry = entries[student.id];
                      const status = entry?.status;
                      return (
                        <tr
                          key={student.id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="py-2.5 pl-4 pr-3 font-mono tabular-nums font-semibold text-slate-700">
                            {String(student.rollNo).padStart(2, '0')}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-slate-900">
                              {student.name}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleSetStatus(student.id, 'present')}
                                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap min-h-[40px] ${
                                  status === 'present'
                                    ? 'bg-green-700 text-white border-green-700'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-green-50 hover:border-green-300 hover:text-green-800'
                                }`}
                              >
                                <Check className="h-3.5 w-3.5" />
                                <span>हजर</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSetStatus(student.id, 'absent')}
                                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap min-h-[40px] ${
                                  status === 'absent'
                                    ? 'bg-red-700 text-white border-red-700'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-red-50 hover:border-red-300 hover:text-red-800'
                                }`}
                              >
                                <X className="h-3.5 w-3.5" />
                                <span>गैरहजर</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSetStatus(student.id, 'leave')}
                                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap min-h-[40px] ${
                                  status === 'leave'
                                    ? 'bg-amber-600 text-white border-amber-600'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-800'
                                }`}
                              >
                                <Clock className="h-3.5 w-3.5" />
                                <span>रजा</span>
                              </button>
                            </div>
                          </td>
                          <td className="py-2.5 pl-3 pr-4">
                            <input
                              type="text"
                              value={entry?.note ?? ''}
                              onChange={(e) =>
                                handleSetNote(student.id, e.target.value)
                              }
                              placeholder={
                                status === 'leave'
                                  ? 'रजेचे कारण लिहा...'
                                  : status === 'absent'
                                  ? 'अनुपस्थिती शेरा...'
                                  : 'टीप (ऐच्छिक)'
                              }
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none min-h-[38px]"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
