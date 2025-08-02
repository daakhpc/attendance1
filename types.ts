export interface CollegeInfo {
  name: string;
  address: string;
}

export interface ClassInfo {
  id: string;
  name: string;
}

export interface Student {
  id: string;
  studentId: string; // The user-facing ID
  name: string;
  fatherName: string;
  motherName: string;
  classId: string;
}

export type AttendanceStatus = 'P' | 'A' | 'L' | 'H' | ''; // Present, Absent, Leave, Holiday

export interface DailyAttendance {
  status: AttendanceStatus;
  inTime: string;
  outTime: string;
}

export interface AttendanceRecord {
  [date: string]: // YYYY-MM-DD
  DailyAttendance;
}

export interface AttendanceData {
  [studentId: string]: AttendanceRecord;
}


export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
}

export type ViewType = 'dashboard' | 'college' | 'classes' | 'students' | 'attendance' | 'holidays';