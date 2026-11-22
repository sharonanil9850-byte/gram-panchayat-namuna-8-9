import {
  AppState,
  ClassRoom,
  DayRecord,
  MonthlyStudentSummary,
  StudentAttendanceEntry,
} from '../types/attendance';
import {
  formatIsoForDay,
  getDaysInMonth,
  getTodayIso,
  isSunday,
  makeRecordKey,
} from '../utils/marathiCalendar';

const STORAGE_KEY = 'shala_hajeri_app_state_v1';

const CLASS_5A_STUDENTS = [
  { id: 's5a-1', rollNo: 1, name: 'आरव संदीप कुलकर्णी', parentPhone: '9822011201' },
  { id: 's5a-2', rollNo: 2, name: 'आर्या अमोल देशमुख', parentPhone: '9822011202' },
  { id: 's5a-3', rollNo: 3, name: 'ओमकार प्रदीप पाटील', parentPhone: '9822011203' },
  { id: 's5a-4', rollNo: 4, name: 'काव्या नितीन जोशी', parentPhone: '9822011204' },
  { id: 's5a-5', rollNo: 5, name: 'तन्मय विजय जाधव', parentPhone: '9822011205' },
  { id: 's5a-6', rollNo: 6, name: 'दिशा महेश शिंदे', parentPhone: '9822011206' },
  { id: 's5a-7', rollNo: 7, name: 'प्रणव सुभाष भोसले', parentPhone: '9822011207' },
  { id: 's5a-8', rollNo: 8, name: 'मनस्वी राजेश पवार', parentPhone: '9822011208' },
  { id: 's5a-9', rollNo: 9, name: 'यश दत्तात्रय चव्हाण', parentPhone: '9822011209' },
  { id: 's5a-10', rollNo: 10, name: 'रिया सचिन गायकवाड', parentPhone: '9822011210' },
  { id: 's5a-11', rollNo: 11, name: 'रोहन विकास मोरे', parentPhone: '9822011211' },
  { id: 's5a-12', rollNo: 12, name: 'सई संजय कदम', parentPhone: '9822011212' },
  { id: 's5a-13', rollNo: 13, name: 'स्वरा किरण सावंत', parentPhone: '9822011213' },
  { id: 's5a-14', rollNo: 14, name: 'सोहम आनंद गोखले', parentPhone: '9822011214' },
  { id: 's5a-15', rollNo: 15, name: 'अन्वी योगेश राऊत', parentPhone: '9822011215' },
  { id: 's5a-16', rollNo: 16, name: 'वेद प्रकाश माने', parentPhone: '9822011216' },
  { id: 's5a-17', rollNo: 17, name: 'ईशा गणेश महाजन', parentPhone: '9822011217' },
  { id: 's5a-18', rollNo: 18, name: 'अथर्व प्रशांत साठे', parentPhone: '9822011218' },
];

const CLASS_6B_STUDENTS = [
  { id: 's6b-1', rollNo: 1, name: 'अद्वैत रवींद्र आपटे', parentPhone: '9850022101' },
  { id: 's6b-2', rollNo: 2, name: 'गार्गी अशोक फडके', parentPhone: '9850022102' },
  { id: 's6b-3', rollNo: 3, name: 'तेजस शरद नलावडे', parentPhone: '9850022103' },
  { id: 's6b-4', rollNo: 4, name: 'नंदिनी बाळासाहेब सुतार', parentPhone: '9850022104' },
  { id: 's6b-5', rollNo: 5, name: 'पार्थ अभिजित वाघमारे', parentPhone: '9850022105' },
  { id: 's6b-6', rollNo: 6, name: 'प्रांजल मिलिंद काळे', parentPhone: '9850022106' },
  { id: 's6b-7', rollNo: 7, name: 'मिहिर विवेक बर्वे', parentPhone: '9850022107' },
  { id: 's6b-8', rollNo: 8, name: 'रचना सुनील पानसे', parentPhone: '9850022108' },
  { id: 's6b-9', rollNo: 9, name: 'वरद हेमंत तांबे', parentPhone: '9850022109' },
  { id: 's6b-10', rollNo: 10, name: 'श्रावणी प्रमोद लोखंडे', parentPhone: '9850022110' },
  { id: 's6b-11', rollNo: 11, name: 'सिद्धार्थ संजय दातार', parentPhone: '9850022111' },
  { id: 's6b-12', rollNo: 12, name: 'स्नेहल प्रकाश परब', parentPhone: '9850022112' },
  { id: 's6b-13', rollNo: 13, name: 'हर्षद राजेंद्र खैरे', parentPhone: '9850022113' },
  { id: 's6b-14', rollNo: 14, name: 'ज्ञानेश्वरी अविनाश निकम', parentPhone: '9850022114' },
  { id: 's6b-15', rollNo: 15, name: 'रुद्र किशोर माळी', parentPhone: '9850022115' },
];

function generateSeedRecords(classes: ClassRoom[]): Record<string, DayRecord> {
  const records: Record<string, DayRecord> = {};
  const todayIso = getTodayIso();
  const [todayY, todayM, todayD] = todayIso.split('-').map(Number);
  const year = todayY;
  const month0 = todayM - 1;
  const maxSeedDay = Math.max(1, todayD - 1);
  const daysInMonth = getDaysInMonth(year, month0);
  const limitDay = Math.min(maxSeedDay, daysInMonth);

  for (const cls of classes) {
    for (let day = 1; day <= limitDay; day++) {
      const iso = formatIsoForDay(year, month0, day);
      const key = makeRecordKey(cls.id, iso);

      if (isSunday(iso)) {
        records[key] = {
          date: iso,
          classId: cls.id,
          isHoliday: true,
          holidayReason: 'रविवार (साप्ताहिक सुट्टी)',
          entries: {},
          updatedAt: new Date(year, month0, day, 9, 0).toISOString(),
        };
        continue;
      }

      const entries: Record<string, StudentAttendanceEntry> = {};
      cls.students.forEach((student, idx) => {
        const hash = (day * 17 + idx * 13 + cls.id.charCodeAt(4)) % 29;
        // Make roll 5 and roll 14 have lower attendance (<75%) for realistic month-end alerts
        if ((student.rollNo === 5 || student.rollNo === 14) && (day + idx) % 3 === 0) {
          entries[student.id] = {
            status: (day % 4 === 0) ? 'leave' : 'absent',
            note: day % 4 === 0 ? 'आजारपण (पालक निरोप)' : 'कळवले नाही',
          };
        } else if (hash === 0) {
          entries[student.id] = { status: 'absent', note: 'अनुपस्थित' };
        } else if (hash === 7) {
          entries[student.id] = { status: 'leave', note: 'घरगुती कार्य' };
        } else {
          entries[student.id] = { status: 'present' };
        }
      });

      records[key] = {
        date: iso,
        classId: cls.id,
        isHoliday: false,
        entries,
        updatedAt: new Date(year, month0, day, 10, 15).toISOString(),
      };
    }
  }

  return records;
}

export function createInitialSeedState(): AppState {
  const classes: ClassRoom[] = [
    {
      id: 'class-5a',
      standard: 'इयत्ता ५ वी',
      division: 'अ',
      teacherName: 'सौ. सुनीता कुलकर्णी',
      academicYear: '२०२६-२७',
      students: CLASS_5A_STUDENTS,
    },
    {
      id: 'class-6b',
      standard: 'इयत्ता ६ वी',
      division: 'ब',
      teacherName: 'श्री. राजेश देशमुख',
      academicYear: '२०२६-२७',
      students: CLASS_6B_STUDENTS,
    },
  ];

  return {
    school: {
      schoolName: 'विद्या मंदिर प्राथमिक व माध्यमिक विद्यालय',
      address: 'ता. हवेली, जि. पुणे - ४११०३८',
      principalName: 'श्री. अरविंद महादेवराव जोशी',
      udiseCode: '27250901402',
    },
    classes,
    records: generateSeedRecords(classes),
    activeClassId: 'class-5a',
  };
}

export function loadAppState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = createInitialSeedState();
      saveAppState(seed);
      return seed;
    }
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed || !Array.isArray(parsed.classes) || !parsed.school) {
      const seed = createInitialSeedState();
      saveAppState(seed);
      return seed;
    }
    return parsed;
  } catch {
    return createInitialSeedState();
  }
}

export function saveAppState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export interface ComputedMonthlyReport {
  workingDays: number;
  holidayDays: number;
  averagePercentage: number;
  regularCount: number;
  lowAttendanceCount: number;
  studentSummaries: MonthlyStudentSummary[];
  dailyTrend: Array<{
    day: number;
    isoDate: string;
    isHoliday: boolean;
    hasRecord: boolean;
    presentCount: number;
    totalStudents: number;
    percentage: number;
  }>;
}

export function computeMonthlyReport(
  classroom: ClassRoom,
  records: Record<string, DayRecord>,
  year: number,
  monthIndex0: number
): ComputedMonthlyReport {
  const daysInMonth = getDaysInMonth(year, monthIndex0);
  const workingDayIsos: string[] = [];
  let holidayDays = 0;

  const dailyTrend: ComputedMonthlyReport['dailyTrend'] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const iso = formatIsoForDay(year, monthIndex0, day);
    const rec = records[makeRecordKey(classroom.id, iso)];

    if (rec?.isHoliday) {
      holidayDays++;
      dailyTrend.push({
        day,
        isoDate: iso,
        isHoliday: true,
        hasRecord: true,
        presentCount: 0,
        totalStudents: classroom.students.length,
        percentage: 0,
      });
      continue;
    }

    if (rec && Object.keys(rec.entries).length > 0) {
      workingDayIsos.push(iso);
      let presentCount = 0;
      for (const s of classroom.students) {
        if (rec.entries[s.id]?.status === 'present') {
          presentCount++;
        }
      }
      const total = classroom.students.length;
      dailyTrend.push({
        day,
        isoDate: iso,
        isHoliday: false,
        hasRecord: true,
        presentCount,
        totalStudents: total,
        percentage: total > 0 ? Math.round((presentCount / total) * 1000) / 10 : 0,
      });
    } else {
      dailyTrend.push({
        day,
        isoDate: iso,
        isHoliday: isSunday(iso),
        hasRecord: false,
        presentCount: 0,
        totalStudents: classroom.students.length,
        percentage: 0,
      });
    }
  }

  const workingDays = workingDayIsos.length;

  const sortedStudents = [...classroom.students].sort((a, b) => a.rollNo - b.rollNo);
  const studentSummaries: MonthlyStudentSummary[] = sortedStudents.map((student) => {
    let presentDays = 0;
    let absentDays = 0;
    let leaveDays = 0;
    let unmarkedDays = 0;

    for (const iso of workingDayIsos) {
      const rec = records[makeRecordKey(classroom.id, iso)];
      const entry = rec?.entries[student.id];
      if (!entry) {
        unmarkedDays++;
      } else if (entry.status === 'present') {
        presentDays++;
      } else if (entry.status === 'absent') {
        absentDays++;
      } else if (entry.status === 'leave') {
        leaveDays++;
      }
    }

    const effectiveWorking = workingDays - unmarkedDays;
    const percentage =
      effectiveWorking > 0
        ? Math.round((presentDays / effectiveWorking) * 1000) / 10
        : 0;

    return {
      student,
      workingDays: effectiveWorking,
      presentDays,
      absentDays,
      leaveDays,
      unmarkedDays,
      percentage,
    };
  });

  const avgSum = studentSummaries.reduce((acc, s) => acc + s.percentage, 0);
  const averagePercentage =
    studentSummaries.length > 0 && workingDays > 0
      ? Math.round((avgSum / studentSummaries.length) * 10) / 10
      : 0;

  const regularCount =
    workingDays > 0
      ? studentSummaries.filter((s) => s.percentage >= 75).length
      : 0;
  const lowAttendanceCount =
    workingDays > 0
      ? studentSummaries.filter((s) => s.percentage < 75).length
      : 0;

  return {
    workingDays,
    holidayDays,
    averagePercentage,
    regularCount,
    lowAttendanceCount,
    studentSummaries,
    dailyTrend,
  };
}
