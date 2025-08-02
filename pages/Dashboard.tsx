import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CollegeInfo, ClassInfo, Student, Holiday, ViewType, AttendanceData, AttendanceStatus, DailyAttendance } from '../types';
import { db } from '../services/db';
import { 
    Button, Card, Input, Modal, Select, Spinner, Toast,
    PlusIcon, EditIcon, TrashIcon, UploadIcon, LogoutIcon, MenuIcon, CloseIcon
} from '../components/common';

// Helper to generate unique IDs
const generateId = () => `_${Math.random().toString(36).substr(2, 9)}`;

// Helper to get random time in a range, e.g., ('09:00', '10:00')
const getRandomTimeInRange = (start: string, end: string): string => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const startTotalMinutes = startH * 60 + startM;
    const endTotalMinutes = endH * 60 + endM;
    const randomTotalMinutes = Math.floor(Math.random() * (endTotalMinutes - startTotalMinutes + 1)) + startTotalMinutes;
    const hours = Math.floor(randomTotalMinutes / 60);
    const minutes = randomTotalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};


// --- Sub-Components for Different Views ---

const DashboardHome: React.FC<{ stats: { classes: number; students: number; holidays: number } }> = ({ stats }) => (
    <Card>
        <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="text-center">
                <p className="text-4xl font-bold">{stats.classes}</p>
                <p className="text-gray-500">Classes</p>
            </Card>
            <Card className="text-center">
                <p className="text-4xl font-bold">{stats.students}</p>
                <p className="text-gray-500">Total Students</p>
            </Card>
            <Card className="text-center">
                <p className="text-4xl font-bold">{stats.holidays}</p>
                <p className="text-gray-500">Holidays</p>
            </Card>
        </div>
    </Card>
);

const CollegeInfoManager: React.FC<{ info: CollegeInfo; onSave: (info: CollegeInfo) => Promise<void> }> = ({ info, onSave }) => {
    const [formData, setFormData] = useState(info);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        await onSave(formData);
        setIsSaving(false);
    };

    return (
        <Card>
            <h2 className="text-2xl font-bold mb-4">Institute Details</h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Institute Name</label>
                    <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                    <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                </div>
                <Button onClick={handleSave} isLoading={isSaving}>Save Changes</Button>
            </div>
        </Card>
    );
};

const ClassManager: React.FC<{ classes: ClassInfo[]; onSave: (classes: ClassInfo[]) => Promise<void>; onSelectClass: (id: string) => void }> = ({ classes, onSave, onSelectClass }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentClass, setCurrentClass] = useState<Partial<ClassInfo> | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const openModal = (cls: Partial<ClassInfo> | null = null) => {
        setCurrentClass(cls || { id: '', name: '' });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!currentClass?.name) return;
        setIsSaving(true);
        let updatedClasses;
        if (currentClass.id) {
            updatedClasses = classes.map(c => c.id === currentClass.id ? { ...c, name: currentClass.name! } : c);
        } else {
            updatedClasses = [...classes, { id: generateId(), name: currentClass.name }];
        }
        await onSave(updatedClasses);
        setIsSaving(false);
        setIsModalOpen(false);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this class and all its students?')) {
            onSave(classes.filter(c => c.id !== id));
        }
    };
    
    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Manage Classes</h2>
                <Button onClick={() => openModal()}><PlusIcon className="w-5 h-5"/> Add Class</Button>
            </div>
            <ul className="space-y-2">
                {classes.map(cls => (
                    <li key={cls.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-gray-100 dark:bg-gray-700 rounded-md gap-2">
                        <span className="font-medium">{cls.name}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <Button variant="secondary" size="sm" onClick={() => onSelectClass(cls.id)}>View Students</Button>
                            <Button variant="secondary" size="sm" onClick={() => openModal(cls)}><EditIcon /></Button>
                            <Button variant="danger" size="sm" onClick={() => handleDelete(cls.id)}><TrashIcon /></Button>
                        </div>
                    </li>
                ))}
            </ul>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={currentClass?.id ? 'Edit Class' : 'Add Class'}>
                <div className="space-y-4">
                    <Input placeholder="Class Name" value={currentClass?.name || ''} onChange={e => setCurrentClass({ ...currentClass, name: e.target.value })} />
                    <Button onClick={handleSave} isLoading={isSaving}>Save</Button>
                </div>
            </Modal>
        </Card>
    );
};

const StudentManager: React.FC<{ students: Student[]; classes: ClassInfo[]; classId: string; onSave: (students: Student[]) => Promise<void>; onBack: () => void; }> = ({ students, classes, classId, onSave, onBack }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentStudent, setCurrentStudent] = useState<Partial<Student> | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const openModal = (student: Partial<Student> | null = null) => {
        setCurrentStudent(student || { id: '', studentId: '', name: '', fatherName: '', motherName: '', classId });
        setIsModalOpen(true);
    };
    
    const handleSave = async () => {
        if (!currentStudent?.name || !currentStudent.studentId) return;
        setIsSaving(true);
        let updatedStudents;
        if (currentStudent.id) {
            updatedStudents = students.map(s => s.id === currentStudent.id ? { ...currentStudent as Student } : s);
        } else {
            updatedStudents = [...students, { ...currentStudent, id: generateId(), classId } as Student];
        }
        await onSave(updatedStudents);
        setIsSaving(false);
        setIsModalOpen(false);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure?')) {
            onSave(students.filter(s => s.id !== id));
        }
    };
    
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            const lines = text.split('\n').slice(1);
            const newStudents = lines.map(line => {
                const [studentId, name, fatherName, motherName] = line.split(',');
                if (studentId && name && fatherName && motherName) {
                    return { id: generateId(), studentId: studentId.trim(), name: name.trim(), fatherName: fatherName.trim(), motherName: motherName.trim(), classId };
                }
                return null;
            }).filter(Boolean) as Student[];

            if(newStudents.length > 0) {
                 await onSave([...students, ...newStudents]);
                 alert(`${newStudents.length} students added successfully.`);
            } else {
                 alert('Could not parse CSV or file is empty. Expected format: StudentId,Name,FatherName,MotherName');
            }
        };
        reader.readAsText(file);
        if(fileInputRef.current) fileInputRef.current.value = "";
    };

    const currentClassName = classes.find(c => c.id === classId)?.name || '...';
    const classStudents = students.filter(s => s.classId === classId);

    return (
        <Card>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-2">
                <div>
                    <Button onClick={onBack} variant="secondary" className="mb-2">&larr; Back to Classes</Button>
                    <h2 className="text-2xl font-bold">Students in {currentClassName}</h2>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                     <Button onClick={() => fileInputRef.current?.click()}><UploadIcon/> Bulk Add</Button>
                     <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
                     <Button onClick={() => openModal()}><PlusIcon /> Add Student</Button>
                </div>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b dark:border-gray-600">
                            <th className="p-2">Student ID</th><th className="p-2">Name</th><th className="p-2 hidden md:table-cell">Father's Name</th><th className="p-2 hidden md:table-cell">Mother's Name</th><th className="p-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {classStudents.map(s => (
                            <tr key={s.id} className="border-b dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700">
                                <td className="p-2">{s.studentId}</td><td className="p-2">{s.name}</td><td className="p-2 hidden md:table-cell">{s.fatherName}</td><td className="p-2 hidden md:table-cell">{s.motherName}</td>
                                <td className="p-2 flex gap-2">
                                    <Button size="sm" variant="secondary" onClick={() => openModal(s)}><EditIcon/></Button>
                                    <Button size="sm" variant="danger" onClick={() => handleDelete(s.id)}><TrashIcon/></Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={currentStudent?.id ? 'Edit Student' : 'Add Student'}>
                <div className="space-y-4">
                    <Input placeholder="Student ID" value={currentStudent?.studentId || ''} onChange={e => setCurrentStudent({ ...currentStudent, studentId: e.target.value })} />
                    <Input placeholder="Full Name" value={currentStudent?.name || ''} onChange={e => setCurrentStudent({ ...currentStudent, name: e.target.value })} />
                    <Input placeholder="Father's Name" value={currentStudent?.fatherName || ''} onChange={e => setCurrentStudent({ ...currentStudent, fatherName: e.target.value })} />
                    <Input placeholder="Mother's Name" value={currentStudent?.motherName || ''} onChange={e => setCurrentStudent({ ...currentStudent, motherName: e.target.value })} />
                    <Button onClick={handleSave} isLoading={isSaving}>Save</Button>
                </div>
            </Modal>
        </Card>
    );
};


const HolidayManager: React.FC<{ holidays: Holiday[]; onSave: (holidays: Holiday[]) => Promise<void> }> = ({ holidays, onSave }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentHoliday, setCurrentHoliday] = useState<Partial<Holiday> | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const openModal = (holiday: Partial<Holiday> | null = null) => {
        setCurrentHoliday(holiday || { id: '', date: '', name: '' });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!currentHoliday?.name || !currentHoliday.date) return;
        setIsSaving(true);
        let updatedHolidays;
        if (currentHoliday.id) {
            updatedHolidays = holidays.map(h => h.id === currentHoliday.id ? { ...currentHoliday as Holiday } : h);
        } else {
            updatedHolidays = [...holidays, { ...currentHoliday, id: generateId() } as Holiday];
        }
        await onSave(updatedHolidays.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        setIsSaving(false);
        setIsModalOpen(false);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure?')) {
            onSave(holidays.filter(h => h.id !== id));
        }
    };
    
    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Manage Holidays</h2>
                <Button onClick={() => openModal()}><PlusIcon /> Add Holiday</Button>
            </div>
            <ul className="space-y-2">
                {holidays.map(h => (
                    <li key={h.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-3 bg-gray-100 dark:bg-gray-700 rounded-md gap-2">
                        <div>
                            <span className="font-medium">{h.name}</span>
                            <span className="text-sm text-gray-500 ml-0 sm:ml-2">({new Date(h.date + 'T00:00:00').toLocaleDateString()})</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <Button variant="secondary" size="sm" onClick={() => openModal(h)}><EditIcon /></Button>
                            <Button variant="danger" size="sm" onClick={() => handleDelete(h.id)}><TrashIcon /></Button>
                        </div>
                    </li>
                ))}
            </ul>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={currentHoliday?.id ? 'Edit Holiday' : 'Add Holiday'}>
                <div className="space-y-4">
                    <Input placeholder="Holiday Name" value={currentHoliday?.name || ''} onChange={e => setCurrentHoliday({ ...currentHoliday, name: e.target.value })} />
                    <Input type="date" value={currentHoliday?.date || ''} onChange={e => setCurrentHoliday({ ...currentHoliday, date: e.target.value })} />
                    <Button onClick={handleSave} isLoading={isSaving}>Save</Button>
                </div>
            </Modal>
        </Card>
    );
};

const AttendanceManager: React.FC<{ 
    collegeInfo: CollegeInfo;
    classes: ClassInfo[]; 
    students: Student[]; 
    holidays: Holiday[]; 
    attendance: AttendanceData; 
    onSave: (data: AttendanceData) => Promise<void>;
    onUpdateHolidays: (holidays: Holiday[]) => Promise<void>;
}> = ({ collegeInfo, classes, students, holidays, attendance, onSave, onUpdateHolidays }) => {
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [startMonth, setStartMonth] = useState('');
    const [endMonth, setEndMonth] = useState('');
    const [sheet, setSheet] = useState<any>(null);
    const [currentMonthIndex, setCurrentMonthIndex] = useState(0);
    const [liveAttendance, setLiveAttendance] = useState<AttendanceData>(attendance);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setLiveAttendance(attendance);
    }, [attendance]);

    useEffect(() => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const defaultMonth = `${yyyy}-${mm}`;
        setStartMonth(defaultMonth);
        setEndMonth(defaultMonth);
    }, []);
    
    const calculateDuration = (inTime: string, outTime: string): string => {
        if (!inTime || !outTime) return '-';
        try {
            const start = new Date(`1970-01-01T${inTime}:00`);
            const end = new Date(`1970-01-01T${outTime}:00`);
            if (end <= start) return '-';
            let diff = (end.getTime() - start.getTime()) / 1000 / 60; // diff in minutes
            const hours = Math.floor(diff / 60);
            const minutes = Math.floor(diff % 60);
            return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`;
        } catch (e) {
            return '-';
        }
    }

    const handleGenerateSheet = () => {
        if (!selectedClassId || !startMonth || !endMonth) {
            alert('Please select a class and month range.');
            return;
        }

        const classStudents = students.filter(s => s.classId === selectedClassId).sort((a,b) => a.name.localeCompare(b.name));
        
        const months = [];
        let currentDate = new Date(startMonth + '-01T00:00:00');
        const lastDate = new Date(endMonth + '-01T00:00:00');
        
        while(currentDate <= lastDate) {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const monthName = currentDate.toLocaleString('default', { month: 'long' });
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
            months.push({ year, month, monthName, days });
            currentDate.setMonth(currentDate.getMonth() + 1);
        }

        setSheet({ students: classStudents, months });
        setCurrentMonthIndex(0);
    };

    const holidaySet = useMemo(() => new Set(holidays.map(h => h.date)), [holidays]);

    const getAttendanceForDay = useCallback((studentId: string, dateStr: string): DailyAttendance => {
        const existingData = liveAttendance[studentId]?.[dateStr];
        if (existingData) return existingData;

        const date = new Date(dateStr + 'T00:00:00');
        const isSunday = date.getDay() === 0;
        const isHoliday = holidaySet.has(dateStr);

        if (isSunday || isHoliday) return { status: '', inTime: '', outTime: '' };
        
        return { 
            status: 'P', 
            inTime: getRandomTimeInRange('09:00', '10:00'), 
            outTime: getRandomTimeInRange('16:00', '17:00') 
        };
    }, [liveAttendance, holidaySet]);


    const handleAttendanceChange = (studentId: string, dateStr: string, field: keyof DailyAttendance, value: string) => {
        const updatedAttendance = JSON.parse(JSON.stringify(liveAttendance));
        const baseData = getAttendanceForDay(studentId, dateStr);
        
        if (!updatedAttendance[studentId]) updatedAttendance[studentId] = {};
        
        const newDailyData: DailyAttendance = { ...baseData, ...(updatedAttendance[studentId][dateStr] || {}), [field]: value };

        if (field === 'status') {
            if (value === 'P') {
                newDailyData.inTime = getRandomTimeInRange('09:00', '10:00');
                newDailyData.outTime = getRandomTimeInRange('16:00', '17:00');
            } else {
                newDailyData.inTime = '';
                newDailyData.outTime = '';
            }
        }
        updatedAttendance[studentId][dateStr] = newDailyData;
        setLiveAttendance(updatedAttendance);
    };

    const handleStatusCycle = (studentId: string, dateStr: string) => {
        const currentStatus = getAttendanceForDay(studentId, dateStr).status;
        // Cycle: P -> A -> L -> P ...
        const cycle: AttendanceStatus[] = ['P', 'A', 'L'];
        const currentIndex = cycle.indexOf(currentStatus);
        
        // If status is not P, A, or L (e.g., it's ''), start the cycle at P. Otherwise, move to the next item.
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % cycle.length;
        const nextStatus = cycle[nextIndex];
        
        handleAttendanceChange(studentId, dateStr, 'status', nextStatus);
    };

    const handleSaveAttendance = async () => {
        setIsSaving(true);
        await onSave(liveAttendance);
        setIsSaving(false);
    };
    
    const handlePrint = () => window.print();

    const handleDateHeaderClick = async (dateStr: string) => {
        const existingHoliday = holidays.find(h => h.date === dateStr);
        if (existingHoliday) {
            if (window.confirm(`'${existingHoliday.name}' is set on this day. Do you want to remove it and mark it as a working day?`)) {
                setIsSaving(true);
                await onUpdateHolidays(holidays.filter(h => h.id !== existingHoliday.id));
                setIsSaving(false);
            }
        } else {
            const holidayName = window.prompt("Enter holiday name for this date:");
            if (holidayName && holidayName.trim() !== "") {
                const newHoliday: Holiday = { id: generateId(), date: dateStr, name: holidayName.trim() };
                const updatedHolidays = [...holidays, newHoliday].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                setIsSaving(true);
                await onUpdateHolidays(updatedHolidays);
                setIsSaving(false);
            }
        }
    };

    const getMonthlySummary = useCallback((studentId: string, month: any) => {
        if (!sheet) return { present: 0, absent: 0, leave: 0, workingDays: 0, percentage: "0.00" };
        let present = 0, absent = 0, leave = 0, workingDays = 0;
        month.days.forEach((day: number) => {
            const date = new Date(month.year, month.month, day);
            const dateStr = `${month.year}-${String(month.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayOfWeek = date.getDay();
            if (dayOfWeek !== 0 && !holidaySet.has(dateStr)) { 
                workingDays++;
                const dailyData = getAttendanceForDay(studentId, dateStr);
                if (dailyData.status === 'P') present++;
                else if (dailyData.status === 'A') absent++;
                else if (dailyData.status === 'L') leave++;
            }
        });
        const percentage = workingDays > 0 ? ((present / workingDays) * 100).toFixed(2) : "0.00";
        return { present, absent, leave, workingDays, percentage };
    }, [sheet, getAttendanceForDay, holidaySet]);

    const attendanceLabels = [{ key: 'status', label: 'ST' }, { key: 'inTime', label: 'IN' }, { key: 'outTime', label: 'OT' }, { key: 'duration', label: 'DR' }];

    return (
        <Card className="print-content">
            <div className="hidden mb-6 text-center print-header">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">{collegeInfo.name}</h2>
                <p className="text-sm text-gray-500">{collegeInfo.address}</p>
                {selectedClassId && <p className="text-lg font-semibold mt-2">Attendance Sheet for: {classes.find(c => c.id === selectedClassId)?.name}</p>}
            </div>

            <h2 className="text-2xl font-bold mb-4 no-print">Attendance Sheet</h2>
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-end mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg no-print">
                <div className="flex-grow w-full sm:w-auto">
                    <label className="block text-sm font-medium mb-1">Class</label>
                    <Select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}>
                        <option value="">Select a class</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                </div>
                <div className="flex-grow w-full sm:w-auto">
                    <label className="block text-sm font-medium mb-1">From Month</label>
                    <Input type="month" value={startMonth} onChange={e => setStartMonth(e.target.value)} />
                </div>
                <div className="flex-grow w-full sm:w-auto">
                    <label className="block text-sm font-medium mb-1">To Month</label>
                    <Input type="month" value={endMonth} onChange={e => setEndMonth(e.target.value)} />
                </div>
                <Button onClick={handleGenerateSheet} className="w-full sm:w-auto">Generate Sheet</Button>
            </div>

            {sheet && sheet.months.length > 0 && (() => {
                const month = sheet.months[currentMonthIndex];
                if (!month) return null;
                const monthHolidays = holidays.filter(h => h.date.startsWith(`${month.year}-${String(month.month + 1).padStart(2, '0')}`)).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                return (
                <div>
                    <div key={`${month.year}-${month.month}`}>
                        <h3 className="text-xl font-bold mb-4 text-center">{month.monthName} {month.year}</h3>
                        <div className="overflow-x-auto custom-scrollbar border dark:border-gray-600 rounded-lg">
                            <table className="w-full text-xs text-center whitespace-nowrap border-separate border-spacing-0">
                                <thead className="bg-gray-200 dark:bg-gray-700 font-semibold align-middle text-[10px]">
                                    <tr>
                                        <th className="p-0.5 border-b border-r dark:border-gray-600 text-left sticky left-0 bg-gray-200 dark:bg-gray-700 z-20 w-12 min-w-[48px]">DT</th>
                                        {month.days.map((d: number) => {
                                            const dateStr = `${month.year}-${String(month.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                            const date = new Date(dateStr + 'T00:00:00');
                                            const dayInitial = date.toLocaleDateString('en-US', { weekday: 'short' })[0];
                                            const isSunday = date.getDay() === 0;
                                            const isDeclaredHoliday = holidaySet.has(dateStr);
                                            
                                            let thClass = 'p-0.5 border-b border-r dark:border-gray-600 w-9 cursor-pointer transition-colors duration-200 hover:bg-gray-300 dark:hover:bg-gray-600';
                                            if (isSunday) thClass += ' bg-red-200 dark:bg-red-800/60';
                                            if (isDeclaredHoliday) thClass += ' bg-yellow-200 dark:bg-yellow-800/50';

                                            return (
                                                <th key={`${month.monthName}-${d}`} className={thClass} onClick={() => handleDateHeaderClick(dateStr)} title={isDeclaredHoliday ? holidays.find(h => h.date === dateStr)?.name : isSunday ? 'Sunday' : 'Click to add holiday'}>
                                                    <div>{d}</div><div className="font-normal">({dayInitial})</div>
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {sheet.students.map((s: Student, index: number) => {
                                        const summary = getMonthlySummary(s.id, month);
                                        const percentageColorClass = parseFloat(summary.percentage) < 75 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400';
                                        return (
                                            <React.Fragment key={s.id}>
                                                <tr className="border-t-2 border-gray-400 dark:border-gray-500">
                                                    <td colSpan={1 + month.days.length} className="p-0.5 bg-gray-100 dark:bg-gray-800/50">
                                                        <div className="flex justify-between items-center w-full text-[11px]">
                                                            <div className="flex items-center gap-1 font-bold whitespace-nowrap">
                                                                <span>{index + 1}.</span>
                                                                <div className="text-left ml-1">
                                                                    <div>{s.name}</div>
                                                                    <div className="font-normal text-gray-500">ID: {s.studentId}</div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right p-0.5 text-[10px]">
                                                                <div className="flex justify-end items-center gap-x-2 gap-y-1 flex-wrap">
                                                                    <span>Total: <strong>{summary.workingDays}</strong></span>
                                                                    <span className="text-green-600">P: <strong>{summary.present}</strong></span>
                                                                    <span className="text-red-600">A: <strong>{summary.absent}</strong></span>
                                                                    <span className="text-blue-600">L: <strong>{summary.leave}</strong></span>
                                                                    <span>%: <strong className={percentageColorClass}>{summary.percentage}%</strong></span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {attendanceLabels.map(({key, label}) => {
                                                    const rowClass = `h-8 hover:bg-gray-50 dark:hover:bg-gray-700/50`;
                                                    return (
                                                    <tr key={`${s.id}-${key}`} className={rowClass}>
                                                        <td className="p-0.5 border-b border-r dark:border-gray-600 text-left font-semibold sticky left-0 bg-white dark:bg-gray-800 z-10 w-12 min-w-[48px]">{label}</td>
                                                        {month.days.map((d: number) => {
                                                            const dateStr = `${month.year}-${String(month.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                                            const isDeclaredHoliday = holidaySet.has(dateStr);
                                                            const isSunday = new Date(dateStr + 'T00:00:00').getDay() === 0;
                                                            if (isDeclaredHoliday) return <td key={dateStr} className="p-0 border-b border-r dark:border-gray-600 align-middle bg-yellow-100 dark:bg-yellow-800/50 font-bold text-center text-xs">{key === 'status' ? 'HD' : '-'}</td>;
                                                            if (isSunday) return <td key={dateStr} className="p-0 border-b border-r dark:border-gray-600 align-middle bg-red-100 dark:bg-red-900/50 font-bold text-center text-xs">{key === 'status' ? 'S' : '-'}</td>;
                                                            
                                                            const dailyData = getAttendanceForDay(s.id, dateStr);
                                                            const isPresent = dailyData.status === 'P';
                                                            let cellClass = 'p-0 border-b border-r dark:border-gray-600 align-middle';

                                                            if (key === 'status') {
                                                                if (dailyData.status === 'P') cellClass += ' bg-green-100 dark:bg-green-800/50'; else if (dailyData.status === 'A') cellClass += ' bg-red-100 dark:bg-red-800/50'; else if (dailyData.status === 'L') cellClass += ' bg-blue-100 dark:bg-blue-800/50';
                                                                return (
                                                                    <td
                                                                        key={dateStr}
                                                                        className={`${cellClass} cursor-pointer`}
                                                                        onClick={() => handleStatusCycle(s.id, dateStr)}
                                                                        title={`Status: ${dailyData.status || 'Not set'}. Click to change.`}
                                                                    >
                                                                        <div className="w-full h-full flex items-center justify-center font-semibold">
                                                                            {dailyData.status}
                                                                        </div>
                                                                    </td>
                                                                );
                                                            } else if (key === 'inTime' || key === 'outTime') {
                                                                return <td key={dateStr} className={cellClass}>
                                                                    <input 
                                                                        type="text"
                                                                        pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
                                                                        title="Enter time in 24-hour HH:MM format"
                                                                        placeholder="HH:MM"
                                                                        value={dailyData[key] || ''} 
                                                                        onChange={(e) => handleAttendanceChange(s.id, dateStr, key, e.target.value)} 
                                                                        disabled={!isPresent} 
                                                                        className="bg-transparent w-full h-full outline-none border-0 text-center text-[11px] disabled:cursor-not-allowed p-0"
                                                                    />
                                                                </td>;
                                                            } else if (key === 'duration') {
                                                                 return <td key={dateStr} className={`${cellClass} text-[11px] text-center`}>{calculateDuration(dailyData.inTime, dailyData.outTime)}</td>;
                                                            }
                                                            return null;
                                                        })}
                                                    </tr>
                                                    );
                                                })}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                         {monthHolidays.length > 0 && (
                            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg no-print">
                                <h4 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">Holidays in {month.monthName}</h4>
                                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                                    {monthHolidays.map(h => <li key={h.id}><strong>{new Date(h.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}:</strong> {h.name}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                   
                    <div className="mt-4 border-t pt-4 flex justify-center flex-wrap gap-2 no-print">
                        {sheet.months.map((m: any, index: number) => (
                             <Button
                                key={`${m.year}-${m.month}`}
                                onClick={() => setCurrentMonthIndex(index)}
                                variant={currentMonthIndex === index ? 'primary' : 'secondary'}
                                size="sm"
                            >
                                {m.monthName} {m.year}
                            </Button>
                        ))}
                    </div>

                    <div className="mt-6 flex justify-between items-center no-print">
                        <div className="flex gap-2">
                             <Button
                                onClick={() => setCurrentMonthIndex(i => i - 1)}
                                disabled={currentMonthIndex <= 0}
                                variant="secondary"
                            >
                                &larr; Previous
                            </Button>
                            <Button
                                onClick={() => setCurrentMonthIndex(i => i + 1)}
                                disabled={currentMonthIndex >= sheet.months.length - 1}
                                variant="secondary"
                            >
                                Next &rarr;
                            </Button>
                        </div>
                        <div className="flex justify-end gap-4">
                            <Button variant="secondary" onClick={handlePrint}>Print as PDF</Button>
                            <Button onClick={handleSaveAttendance} isLoading={isSaving}>Save All Changes</Button>
                        </div>
                    </div>
                </div>
                )
            })()}
        </Card>
    );
};

// --- Main Dashboard Component ---
interface DashboardProps { onLogout: () => void; }

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
    const [view, setView] = useState<ViewType>('dashboard');
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    const [collegeInfo, setCollegeInfo] = useState<CollegeInfo>({ name: '', address: '' });
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [attendance, setAttendance] = useState<AttendanceData>({});
    
    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            try {
                const [info, classesData, studentsData, holidaysData, attendanceData] = await Promise.all([
                    db.getCollegeInfo(), db.getClasses(), db.getStudents(), db.getHolidays(), db.getAttendance(),
                ]);
                setCollegeInfo(info); setClasses(classesData); setStudents(studentsData); setHolidays(holidaysData); setAttendance(attendanceData);
            } catch (error) {
                console.error("Failed to load data", error); showToast("Failed to load data from storage.", 'error');
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, []);

    const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });

    const handleSaveCollegeInfo = async (info: CollegeInfo) => {
        await db.saveCollegeInfo(info); setCollegeInfo(info); showToast('Institute info updated!', 'success');
    };

    const handleSaveClasses = async (updatedClasses: ClassInfo[]) => {
        const deletedClassIds = classes.filter(c => !updatedClasses.some(uc => uc.id === c.id)).map(c => c.id);
        if (deletedClassIds.length > 0) {
            const updatedStudents = students.filter(s => !deletedClassIds.includes(s.classId));
            await handleSaveStudents(updatedStudents);
        }
        await db.saveClasses(updatedClasses); setClasses(updatedClasses); showToast('Classes updated!', 'success');
    };

    const handleSaveStudents = async (updatedStudents: Student[]) => {
        await db.saveStudents(updatedStudents); setStudents(updatedStudents); showToast('Students updated!', 'success');
    };
    
    const handleSaveHolidays = async (updatedHolidays: Holiday[]) => {
        await db.saveHolidays(updatedHolidays); setHolidays(updatedHolidays); showToast('Holidays updated!', 'success');
    };
    
    const handleSaveAttendance = async (data: AttendanceData) => {
        await db.saveAttendance(data); setAttendance(data); showToast('Attendance saved!', 'success');
    };

    const handleSelectClassForStudents = (id: string) => { setSelectedClassId(id); setView('students'); };
    
    const stats = useMemo(() => ({ classes: classes.length, students: students.length, holidays: holidays.length }), [classes, students, holidays]);
    
    const renderView = () => {
        if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
        switch (view) {
            case 'college': return <CollegeInfoManager info={collegeInfo} onSave={handleSaveCollegeInfo} />;
            case 'classes': return <ClassManager classes={classes} onSave={handleSaveClasses} onSelectClass={handleSelectClassForStudents}/>;
            case 'students': return selectedClassId ? <StudentManager students={students} classes={classes} classId={selectedClassId} onSave={handleSaveStudents} onBack={() => { setView('classes'); setSelectedClassId(null); }} /> : <div>Please select a class first.</div>;
            case 'holidays': return <HolidayManager holidays={holidays} onSave={handleSaveHolidays} />;
            case 'attendance': return <AttendanceManager collegeInfo={collegeInfo} classes={classes} students={students} holidays={holidays} attendance={attendance} onSave={handleSaveAttendance} onUpdateHolidays={handleSaveHolidays} />;
            default: return <DashboardHome stats={stats} />;
        }
    };
    
    const navItems: { id: ViewType, label: string }[] = [
        { id: 'dashboard', label: 'Dashboard' }, { id: 'college', label: 'Institute Info' }, { id: 'classes', label: 'Classes' }, { id: 'holidays', label: 'Holidays' }, { id: 'attendance', label: 'Attendance' },
    ];

    const handleNavClick = (viewId: ViewType) => {
        setView(viewId);
        setSelectedClassId(null);
        setIsSidebarOpen(false);
    }

    return (
        <div className="relative min-h-screen md:flex bg-gray-100 dark:bg-gray-900">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            {isSidebarOpen && <div className="fixed inset-0 z-20 bg-black opacity-50 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

            <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-800 shadow-lg p-4 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-200 ease-in-out flex flex-col no-print`}>
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400 truncate" title={collegeInfo.name}>{collegeInfo.name}</h1>
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-500 hover:text-gray-800 dark:hover:text-white"><CloseIcon /></button>
                </div>
                <nav className="flex-1">
                    {navItems.map(item => (
                        <button key={item.id} onClick={() => handleNavClick(item.id)} className={`w-full text-left px-3 py-2 rounded-md font-medium transition-colors mb-1 ${view === item.id ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                            {item.label}
                        </button>
                    ))}
                </nav>
                <button onClick={onLogout} className="w-full text-left px-3 py-2 rounded-md font-medium transition-colors hover:bg-red-100 dark:hover:bg-red-900 text-red-700 flex items-center gap-2 mt-auto">
                    <LogoutIcon className="w-5 h-5" /> Logout
                </button>
            </aside>
            
            <main className="flex-1 p-4 sm:p-6 lg:p-8 h-screen overflow-y-auto print-container">
                 <div className="flex items-center mb-4 md:hidden no-print">
                     <button onClick={() => setIsSidebarOpen(true)} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"><MenuIcon /></button>
                     <h2 className="text-lg font-semibold ml-4">{navItems.find(i => i.id === view)?.label}</h2>
                 </div>
                {renderView()}
            </main>
        </div>
    );
};

export default Dashboard;