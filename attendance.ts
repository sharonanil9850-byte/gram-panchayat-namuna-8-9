export type AttendanceStatus = 'present' | 'absent' | 'leave';

export interface Student {
  id: string;
  rollNo: number;
  name: string;
  parentPhone?: string;
}

export interface ClassRoom {
  id: string;
  standard: string;
  division: string;
  teacherName: string;
  academicYear: string;
  students: Student[];
}

export interface StudentAttendanceEntry {
  status: AttendanceStatus;
  note?: string;
}

export interface DayRecord {
  date: string; // YYYY-MM-DD
  classId: string;
  isHoliday?: boolean;
  holidayReason?: string;
  entries: Record<string, StudentAttendanceEntry>; // keyed by student.id
  updatedAt: string;
}

export interface SchoolProfile {
  schoolName: string;
  address: string;
  principalName: string;
  udiseCode: string;
}

export interface AppState {
  school: SchoolProfile;
  classes: ClassRoom[];
  records: Record<string, DayRecord>; // key: `${classId}__${date}`
  activeClassId: string;
}

export interface MonthlyStudentSummary {
  student: Student;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  unmarkedDays: number;
  percentage: number;
}
