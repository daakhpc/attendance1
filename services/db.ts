import { CollegeInfo, ClassInfo, Student, Holiday, AttendanceData } from '../types';

const DB_PREFIX = 'attendanceApp_';

// --- LocalStorage Wrapper ---
const getFromLS = <T,>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(`${DB_PREFIX}${key}`);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error getting item ${key} from localStorage`, error);
    return defaultValue;
  }
};

const setInLS = <T,>(key: string, value: T): void => {
  try {
    localStorage.setItem(`${DB_PREFIX}${key}`, JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting item ${key} in localStorage`, error);
  }
};

// --- API Simulation Layer ---
// This function simulates a network request to a database.
// It uses localStorage as the data source for this frontend-only app.
const simulateDB = <T,>(action: () => T, latency: number = 200): Promise<T> => {
    return new Promise(resolve => {
        setTimeout(() => {
            const result = action();
            resolve(result);
        }, latency);
    });
};

export const db = {
  // College Info
  getCollegeInfo: (): Promise<CollegeInfo> => 
    simulateDB(() => getFromLS('collegeInfo', { name: 'My Institute', address: '123 Education Lane' })),
  
  saveCollegeInfo: (info: CollegeInfo): Promise<void> => 
    simulateDB(() => setInLS('collegeInfo', info)),

  // Classes
  getClasses: (): Promise<ClassInfo[]> => 
    simulateDB(() => getFromLS('classes', [])),

  saveClasses: (classes: ClassInfo[]): Promise<void> => 
    simulateDB(() => setInLS('classes', classes)),

  // Students
  getStudents: (): Promise<Student[]> => 
    simulateDB(() => getFromLS('students', [])),

  saveStudents: (students: Student[]): Promise<void> => 
    simulateDB(() => setInLS('students', students)),

  // Holidays
  getHolidays: (): Promise<Holiday[]> => 
    simulateDB(() => getFromLS('holidays', [])),
    
  saveHolidays: (holidays: Holiday[]): Promise<void> => 
    simulateDB(() => setInLS('holidays', holidays)),
  
  // Attendance
  getAttendance: (): Promise<AttendanceData> => 
    simulateDB(() => getFromLS('attendance', {})),
    
  saveAttendance: (attendance: AttendanceData): Promise<void> => 
    simulateDB(() => setInLS('attendance', attendance), 500), // Longer latency for bigger data
};