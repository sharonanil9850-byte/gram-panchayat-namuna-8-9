import { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Grid3X3,
  ListChecks,
  Search,
} from 'lucide-react';
import { computeMonthlyReport } from '../data/seedData';
import { ClassRoom, DayRecord, SchoolProfile } from '../types/attendance';
import {
  formatIsoForDay,
  getDaysInMonth,
  isSunday,
  makeRecordKey,
  MARATHI_MONTHS,
} from '../utils/marathiCalendar';
import {
  downloadMonthlyMusterGridPdf,
  downloadMonthlySummaryPdf,
} from '../utils/pdfGenerator';

interface MonthlyReportViewProps {
  school: SchoolProfile;
  classroom: ClassRoom | undefined;
  records: Record<string, DayRecord>;
  year: number;
  monthIndex0: number;
  onChangeMonth: (year: number, monthIndex0: number) => void;
  onJumpToDate: (isoDate: string) => void;
  onNavigateToClasses: () => void;
}

type ReportSubTab = 'summary' | 'matrix';
type SortKey = 'roll' | 'pct_asc' | 'pct_desc';

export function MonthlyReportView({
  school,
  classroom,
  records,
  year,
  monthIndex0,
  onChangeMonth,
  onJumpToDate,
  onNavigateToClasses,
}: MonthlyReportViewProps) {
  const [subTab, setSubTab] = useState<ReportSubTab>('summary');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyLowAttendance, setOnlyLowAttendance] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('roll');
  const [exportingType, setExportingType] = useState<'summary' | 'muster' | null>(
    null
  );

  const report = useMemo(() => {
    if (!classroom) return null;
    return computeMonthlyReport(classroom, records, year, monthIndex0);
  }, [classroom, records, year, monthIndex0]);

  const filteredSummaries = useMemo(() => {
    if (!report) return [];
    const q = searchQuery.trim().toLowerCase();
    const list = report.studentSummaries.filter((row) => {
      const matchesQuery =
        !q ||
        row.student.name.toLowerCase().includes(q) ||
        String(row.student.rollNo).includes(q);
      if (!matchesQuery) return false;
      if (onlyLowAttendance) {
        return row.workingDays > 0 && row.percentage < 75;
      }
      return true;
    });

    if (sortBy === 'pct_asc') {
      return [...list].sort((a, b) => a.percentage - b.percentage);
    }
    if (sortBy === 'pct_desc') {
      return [...list].sort((a, b) => b.percentage - a.percentage);
    }
    return [...list].sort((a, b) => a.student.rollNo - b.student.rollNo);
  }, [report, searchQuery, onlyLowAttendance, sortBy]);

  if (!classroom || !report) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <h2 className="text-lg font-semibold text-slate-900">
          अहवाल पाहण्यासाठी वर्ग निवडा
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          प्रथम वर्ग व विद्यार्थी नोंदणी पूर्ण करा.
        </p>
        <button
          type="button"
          onClick={onNavigateToClasses}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800"
        >
          वर्ग व्यवस्थापनाकडे जा
        </button>
      </div>
    );
  }

  const daysInMonth = getDaysInMonth(year, monthIndex0);
  const monthName = MARATHI_MONTHS[monthIndex0];

  const handlePrevMonth = () => {
    if (monthIndex0 === 0) {
      onChangeMonth(year - 1, 11);
    } else {
      onChangeMonth(year, monthIndex0 - 1);
    }
  };

  const handleNextMonth = () => {
    if (monthIndex0 === 11) {
      onChangeMonth(year + 1, 0);
    } else {
      onChangeMonth(year, monthIndex0 + 1);
    }
  };

  const handleExportSummaryPdf = async () => {
    setExportingType('summary');
    try {
      await downloadMonthlySummaryPdf(
        school,
        classroom,
        year,
        monthIndex0,
        report
      );
    } finally {
      setExportingType(null);
    }
  };

  const handleExportMusterPdf = async () => {
    setExportingType('muster');
    try {
      await downloadMonthlyMusterGridPdf(
        school,
        classroom,
        year,
        monthIndex0,
        records,
        report
      );
    } finally {
      setExportingType(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Month Controls */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">
              {classroom.standard} · तुकडी {classroom.division} · वर्गशिक्षक: {classroom.teacherName} · {classroom.students.length} विद्यार्थी
            </div>
            <h1 className="mt-1 text-xl font-bold text-slate-900">
              महिनाअखेर उपस्थिती अहवाल — {monthName} {year}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Month-Year Stepper */}
            <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 rounded-md text-slate-600 hover:bg-white hover:text-slate-900 transition-colors"
                aria-label="मागील महिना"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <select
                value={monthIndex0}
                onChange={(e) => onChangeMonth(year, Number(e.target.value))}
                className="bg-transparent px-2 py-1.5 text-sm font-semibold text-slate-900 focus:outline-none cursor-pointer"
                aria-label="महिना निवडा"
              >
                {MARATHI_MONTHS.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => onChangeMonth(Number(e.target.value), monthIndex0)}
                className="bg-transparent pr-2 py-1.5 text-sm font-mono font-semibold text-slate-900 focus:outline-none cursor-pointer"
                aria-label="वर्ष निवडा"
              >
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 rounded-md text-slate-600 hover:bg-white hover:text-slate-900 transition-colors"
                aria-label="पुढील महिना"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportSummaryPdf}
              disabled={exportingType !== null}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
            >
              <FileDown className="h-4 w-4 text-blue-700" />
              <span>
                {exportingType === 'summary'
                  ? 'तयार होत आहे...'
                  : 'संक्षिप्त अहवाल PDF'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleExportMusterPdf}
              disabled={exportingType !== null}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
            >
              <FileDown className="h-4 w-4" />
              <span>
                {exportingType === 'muster'
                  ? 'तयार होत आहे...'
                  : 'मासिक हजेरी तक्ता PDF'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 4-Column Monthly KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
          <div className="text-xs font-medium text-slate-500">एकूण कार्यदिवस</div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {report.workingDays}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            नोंदलेल्या सुट्ट्या: {report.holidayDays} दिवस
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
          <div className="text-xs font-medium text-slate-500">सरासरी मासिक उपस्थिती</div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-blue-700">
            {report.averagePercentage}%
          </div>
          <div className="mt-1 text-xs text-slate-500">
            संपूर्ण वर्गाची सरासरी
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
          <div className="text-xs font-medium text-slate-500">नियमित विद्यार्थी (≥ ७५%)</div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-green-700">
            {report.regularCount}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            एकूण {classroom.students.length} पैकी
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
          <div className="text-xs font-medium text-slate-500">कमी उपस्थिती (&lt; ७५%)</div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-red-700">
            {report.lowAttendanceCount}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            विशेष लक्ष / पालक संपर्क आवश्यक
          </div>
        </div>
      </div>

      {/* Daily Attendance Trend Chart (Clean SVG) */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              दररोजची उपस्थिती टक्केवारी — {monthName} {year}
            </h2>
            <p className="text-xs text-slate-500">
              कोणत्याही दिवसाच्या स्तंभावर क्लिक करून त्या दिवसाची दैनिक हजेरी उघडता येईल
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span>निळा: कार्यदिवस नोंद</span>
            <span aria-hidden="true">·</span>
            <span>पिवळा: सुट्टी</span>
            <span aria-hidden="true">·</span>
            <span>राखाडी: नोंद नाही</span>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid gap-1 items-end h-32 pt-2 border-b border-slate-200" style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(0, 1fr))` }}>
              {report.dailyTrend.map((d) => {
                const barHeight = d.hasRecord && !d.isHoliday ? Math.max(8, d.percentage) : d.isHoliday ? 16 : 6;
                const barColor = d.isHoliday
                  ? 'bg-amber-200 hover:bg-amber-300'
                  : d.hasRecord
                  ? d.percentage < 75
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-slate-200 hover:bg-slate-300';

                return (
                  <button
                    key={d.day}
                    type="button"
                    onClick={() => onJumpToDate(d.isoDate)}
                    title={
                      d.isHoliday
                        ? `${d.day} ${monthName}: सुट्टी`
                        : d.hasRecord
                        ? `${d.day} ${monthName}: ${d.presentCount}/${d.totalStudents} हजर (${d.percentage}%)`
                        : `${d.day} ${monthName}: नोंद नाही`
                    }
                    className="group flex flex-col items-center justify-end h-full focus:outline-none"
                  >
                    <div
                      className={`w-full max-w-[16px] rounded-t transition-colors ${barColor}`}
                      style={{ height: `${barHeight}%` }}
                    />
                  </button>
                );
              })}
            </div>
            <div
              className="grid gap-1 pt-1.5 text-[10px] font-mono tabular-nums text-slate-500 text-center"
              style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(0, 1fr))` }}
            >
              {report.dailyTrend.map((d) => (
                <span key={d.day} className={d.isHoliday ? 'text-amber-700 font-semibold' : ''}>
                  {d.day}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Report Container with Sub-tabs */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Sub-view Switch */}
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
            <button
              type="button"
              onClick={() => setSubTab('summary')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                subTab === 'summary'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListChecks className="h-3.5 w-3.5" />
              <span>विद्यार्थीनिहाय सारांश</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('matrix')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                subTab === 'matrix'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
              <span>मासिक हजेरी मॅट्रिक्स (१–{daysInMonth})</span>
            </button>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="विद्यार्थी शोधा..."
                className="rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
              />
            </div>

            {subTab === 'summary' && (
              <>
                <button
                  type="button"
                  onClick={() => setOnlyLowAttendance((v) => !v)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${
                    onlyLowAttendance
                      ? 'border-red-300 bg-red-50 text-red-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  फक्त &lt; ७५% विद्यार्थी ({report.lowAttendanceCount})
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSortBy((prev) =>
                      prev === 'roll'
                        ? 'pct_asc'
                        : prev === 'pct_asc'
                        ? 'pct_desc'
                        : 'roll'
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  <span>
                    क्रम:{' '}
                    {sortBy === 'roll'
                      ? 'हजेरी क्र.'
                      : sortBy === 'pct_asc'
                      ? 'कमी % आधी'
                      : 'जास्त % आधी'}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>

        {report.workingDays === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-slate-600">
              {monthName} {year} या महिन्यासाठी अद्याप कोणतीही दैनिक हजेरी नोंदवलेली नाही.
            </p>
            <button
              type="button"
              onClick={() => onJumpToDate(formatIsoForDay(year, monthIndex0, 1))}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
            >
              दैनिक हजेरी नोंदवा
            </button>
          </div>
        ) : subTab === 'summary' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 pl-4 pr-3 w-20">ह. क्र.</th>
                  <th className="py-3 px-3 min-w-[200px]">विद्यार्थ्याचे नाव</th>
                  <th className="py-3 px-3 text-right">कार्यदिवस</th>
                  <th className="py-3 px-3 text-right">हजर</th>
                  <th className="py-3 px-3 text-right">गैरहजर</th>
                  <th className="py-3 px-3 text-right">रजा</th>
                  <th className="py-3 px-3 min-w-[160px]">उपस्थिती %</th>
                  <th className="py-3 pl-3 pr-4 text-right">स्थिती</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredSummaries.map((row) => {
                  const isLow = row.workingDays > 0 && row.percentage < 75;
                  return (
                    <tr
                      key={row.student.id}
                      className={isLow ? 'bg-red-50/40 hover:bg-red-50/70' : 'hover:bg-slate-50'}
                    >
                      <td className="py-3 pl-4 pr-3 font-mono tabular-nums font-semibold text-slate-700">
                        {String(row.student.rollNo).padStart(2, '0')}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-900">
                        {row.student.name}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                        {row.workingDays}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-green-700">
                        {row.presentDays}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-red-700">
                        {row.absentDays}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-amber-700">
                        {row.leaveDays}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isLow ? 'bg-red-600' : 'bg-green-600'
                              }`}
                              style={{ width: `${Math.min(100, row.percentage)}%` }}
                            />
                          </div>
                          <span
                            className={`w-14 text-right font-mono tabular-nums font-bold text-xs ${
                              isLow ? 'text-red-700' : 'text-slate-900'
                            }`}
                          >
                            {row.percentage}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pl-3 pr-4 text-right text-xs font-semibold">
                        {row.workingDays === 0 ? (
                          <span className="text-slate-400">नोंद नाही</span>
                        ) : isLow ? (
                          <span className="text-red-700">कमी उपस्थिती</span>
                        ) : (
                          <span className="text-green-700">नियमित</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Monthly 1..31 Interactive Muster Grid */
          <div className="overflow-x-auto">
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs text-slate-600 flex flex-wrap items-center gap-4">
              <span>संकेत: <strong className="text-green-700">ह</strong> = हजर</span>
              <span><strong className="text-red-700">गै</strong> = गैरहजर</span>
              <span><strong className="text-amber-700">र</strong> = रजा</span>
              <span><strong className="text-amber-800">सु</strong> = सुट्टी</span>
              <span className="text-slate-500">· तारखेवर क्लिक करून त्या दिवसाची हजेरी दुरुस्त करू शकता</span>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700">
                  <th className="py-2.5 pl-3 pr-2 sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                    ह.क्र.
                  </th>
                  <th className="py-2.5 px-3 sticky left-10 bg-slate-50 z-10 border-r border-slate-200 min-w-[160px]">
                    विद्यार्थ्याचे नाव
                  </th>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                    const iso = formatIsoForDay(year, monthIndex0, d);
                    const sun = isSunday(iso);
                    return (
                      <th
                        key={d}
                        className={`py-2 px-1 text-center font-mono tabular-nums min-w-[28px] border-r border-slate-100 ${
                          sun ? 'bg-amber-50 text-amber-800' : ''
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onJumpToDate(iso)}
                          className="w-full hover:underline hover:text-blue-700"
                          title={`${d} ${monthName} हजेरी उघडा`}
                        >
                          {d}
                        </button>
                      </th>
                    );
                  })}
                  <th className="py-2.5 px-2.5 text-right font-semibold text-green-700 bg-slate-50 border-l border-slate-200">
                    हजर
                  </th>
                  <th className="py-2.5 px-2.5 text-right font-semibold text-red-700 bg-slate-50">
                    गैर
                  </th>
                  <th className="py-2.5 pl-2.5 pr-3 text-right font-semibold text-slate-900 bg-slate-50">
                    %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredSummaries.map((row) => {
                  const isLow = row.workingDays > 0 && row.percentage < 75;
                  return (
                    <tr key={row.student.id} className="hover:bg-slate-50">
                      <td className="py-2 pl-3 pr-2 sticky left-0 bg-white z-10 border-r border-slate-200 font-mono tabular-nums font-semibold text-slate-700">
                        {row.student.rollNo}
                      </td>
                      <td className="py-2 px-3 sticky left-10 bg-white z-10 border-r border-slate-200 font-medium text-slate-900 truncate max-w-[180px]">
                        {row.student.name}
                      </td>
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                        (d) => {
                          const iso = formatIsoForDay(year, monthIndex0, d);
                          const rec = records[makeRecordKey(classroom.id, iso)];
                          const sun = isSunday(iso);
                          const entry = rec?.entries[row.student.id];

                          let label = '·';
                          let cls = 'text-slate-300';
                          if (rec?.isHoliday) {
                            label = 'सु';
                            cls = 'text-amber-700 bg-amber-50/70 font-semibold';
                          } else if (entry?.status === 'present') {
                            label = 'ह';
                            cls = 'text-green-700 font-semibold';
                          } else if (entry?.status === 'absent') {
                            label = 'गै';
                            cls = 'text-red-700 bg-red-50/60 font-bold';
                          } else if (entry?.status === 'leave') {
                            label = 'र';
                            cls = 'text-amber-700 bg-amber-50/60 font-semibold';
                          } else if (sun) {
                            label = 'रवि';
                            cls = 'text-amber-600/70 bg-amber-50/40 text-[10px]';
                          }

                          return (
                            <td
                              key={d}
                              className={`py-2 px-0.5 text-center border-r border-slate-100 ${cls}`}
                            >
                              {label}
                            </td>
                          );
                        }
                      )}
                      <td className="py-2 px-2.5 text-right font-mono tabular-nums font-semibold text-green-700 border-l border-slate-200">
                        {row.presentDays}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono tabular-nums font-semibold text-red-700">
                        {row.absentDays}
                      </td>
                      <td
                        className={`py-2 pl-2.5 pr-3 text-right font-mono tabular-nums font-bold ${
                          isLow ? 'text-red-700' : 'text-slate-900'
                        }`}
                      >
                        {row.percentage}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
