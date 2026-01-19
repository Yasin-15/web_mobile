"use client";
import { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import { Save, Wand2, Printer, Eye, Edit3, Calendar, User, BookOpen, Clock, Heart } from 'lucide-react';
import { PermissionGuard } from '../../../components/PermissionGuard';
import { usePermission, RESOURCES, ACTIONS, ROLES } from '../../../hooks/usePermission';

const DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

const TIME_SLOTS = [
    { start: '08:00', end: '08:45', label: 'Period 1' },
    { start: '08:45', end: '09:30', label: 'Period 2' },
    { start: '09:30', end: '10:15', label: 'Period 3' },
    { start: '10:15', end: '10:45', label: 'Break', type: 'break' },
    { start: '10:45', end: '11:30', label: 'Period 4' },
    { start: '11:30', end: '12:15', label: 'Period 5' },
    { start: '12:15', end: '13:00', label: 'Period 6' },
];

const SUBJECT_COLORS: any = {
    'Math': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'Science': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'English': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'History': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'Geography': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    'Physics': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    'Chemistry': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    'Biology': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    'ICT': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    'Break': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
};

const getSubjectColor = (name: string) => {
    if (!name) return 'bg-white/5 text-white/70 border-white/10';
    for (const [key, color] of Object.entries(SUBJECT_COLORS)) {
        if (name?.toLowerCase().includes(key.toLowerCase())) return color;
    }
    return 'bg-white/5 text-white/70 border-white/10';
};

export default function TimetablePage() {
    const [classes, setClasses] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [viewMode, setViewMode] = useState<'class' | 'personal'>('class');
    
    // Schedule state: { [day]: { [slotIndex]: { subject: '', teacher: '' } } }
    const [schedule, setSchedule] = useState<any>({});
    const [currentUser, setCurrentUser] = useState<any>(null);

    const { hasPermission, userRole } = usePermission();
    const canEdit = hasPermission(RESOURCES.SCHEDULES, ACTIONS.UPDATE);

    // Initial setup
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const userStr = localStorage.getItem('user');
                let userObj: any = null;
                if (userStr) {
                    userObj = JSON.parse(userStr);
                    setCurrentUser(userObj);
                }

                const [clsRes, subRes, tchRes] = await Promise.all([
                    api.get('/classes?limit=100'),
                    api.get('/subjects?limit=100'),
                    api.get('/teachers?limit=100')
                ]);
                
                setClasses(clsRes.data.data);
                setSubjects(subRes.data.data);
                setTeachers(tchRes.data.data);

                // Default view mode for teachers
                if (userObj?.role === ROLES.TEACHER) {
                    setViewMode('personal');
                } else if (userObj?.role === ROLES.STUDENT && userObj.profile?.class) {
                    const studentClass = clsRes.data.data.find((c: any) => 
                        c.name === userObj.profile.class && c.section === userObj.profile.section
                    );
                    if (studentClass) setSelectedClassId(studentClass._id);
                }

                if (userObj?.role === ROLES.SCHOOL_ADMIN || userObj?.role === ROLES.SUPER_ADMIN) {
                    setIsEditMode(true);
                }
            } catch (err) {
                console.error("Failed to fetch initial data", err);
            }
        };
        fetchInitialData();
    }, []);

    // Load timetable
    useEffect(() => {
        const fetchTimetable = async () => {
            if (viewMode === 'class' && !selectedClassId) {
                const initial: any = {};
                DAYS.forEach(day => { initial[day] = {}; TIME_SLOTS.forEach((_, idx) => { initial[day][idx] = { subject: '', teacher: '' }; }); });
                setSchedule(initial);
                return;
            }

            setLoading(true);
            try {
                const endpoint = viewMode === 'personal' && currentUser?.role === ROLES.TEACHER
                    ? '/timetable/teacher/me'
                    : `/timetable/class/${selectedClassId}`;
                
                const { data } = await api.get(endpoint);
                
                const newSchedule: any = {};
                DAYS.forEach(day => {
                    newSchedule[day] = {};
                    TIME_SLOTS.forEach((_, idx) => {
                        newSchedule[day][idx] = { subject: '', teacher: '' };
                    });
                });

                data.data.forEach((slot: any) => {
                    if (DAYS.includes(slot.day)) {
                        const slotIndex = TIME_SLOTS.findIndex(ts => ts.start === slot.startTime);
                        if (slotIndex !== -1) {
                            newSchedule[slot.day][slotIndex] = {
                                subject: slot.subject?._id || slot.subject,
                                teacher: slot.teacher?._id || slot.teacher,
                                subjectName: slot.subject?.name,
                                teacherName: slot.teacher ? `${slot.teacher?.firstName} ${slot.teacher?.lastName}` : '',
                                className: slot.class?.name ? `${slot.class.name}-${slot.class.section}` : ''
                            };
                        }
                    }
                });

                setSchedule(newSchedule);
            } catch (err) {
                console.error("Failed to fetch timetable", err);
            } finally {
                setLoading(false);
            }
        };

        fetchTimetable();
    }, [selectedClassId, viewMode, currentUser]);

    const handleCellChange = (day: string, slotIdx: number, field: string, value: string) => {
        setSchedule((prev: any) => {
            const newCell = { ...prev[day][slotIdx], [field]: value };
            if (field === 'subject') {
                const sub = subjects.find(s => s._id === value);
                newCell.subjectName = sub?.name;
            }
            if (field === 'teacher') {
                const teach = teachers.find(t => t._id === value);
                newCell.teacherName = teach ? `${teach.firstName} ${teach.lastName}` : '';
            }
            return { ...prev, [day]: { ...prev[day], [slotIdx]: newCell } };
        });
    };

    const handleSave = async () => {
        if (!selectedClassId) return;
        setSaving(true);
        try {
            const slotsToSave: any[] = [];
            DAYS.forEach(day => {
                TIME_SLOTS.forEach((ts, idx) => {
                    const cell = schedule[day][idx];
                    if (cell.subject && cell.teacher) {
                        slotsToSave.push({
                            day,
                            startTime: ts.start,
                            endTime: ts.end,
                            subjectId: cell.subject,
                            teacherId: cell.teacher
                        });
                    }
                });
            });
            await api.post('/timetable/bulk', { classId: selectedClassId, slots: slotsToSave });
            alert("Schedule published successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to save schedule");
        } finally {
            setSaving(false);
        }
    };

    const handleAutoGenerate = () => {
        const cls = classes.find(c => c._id === selectedClassId);
        if (!cls || !cls.subjects || cls.subjects.length === 0) {
            alert("This class has no subjects assigned to it. Assign subjects first in the Classes page.");
            return;
        }

        if (!confirm("This will automatically distribute assigned subjects across the week. Continue?")) return;

        const classSubjects = cls.subjects;
        const newSchedule: any = {};
        let subjectIndex = 0;

        DAYS.forEach(day => {
            newSchedule[day] = {};
            TIME_SLOTS.forEach((ts, idx) => {
                if (ts.type === 'break') {
                    newSchedule[day][idx] = { subject: '', teacher: '' };
                    return;
                }
                const currentSlotSubject = classSubjects[subjectIndex % classSubjects.length];
                const subObj = subjects.find(s => s._id === (currentSlotSubject.subject?._id || currentSlotSubject.subject));
                const teacherObj = teachers.find(t => t._id === (currentSlotSubject.teachers?.[0]?._id || currentSlotSubject.teachers?.[0]));

                newSchedule[day][idx] = {
                    subject: subObj?._id || '',
                    teacher: teacherObj?._id || '',
                    subjectName: subObj?.name,
                    teacherName: teacherObj ? `${teacherObj.firstName} ${teacherObj.lastName}` : ''
                };
                subjectIndex++;
            });
        });
        setSchedule(newSchedule);
    };

    const currentClass = useMemo(() => classes.find(c => c._id === selectedClassId), [classes, selectedClassId]);

    return (
        <div className="p-4 sm:p-8 max-w-[1600px] mx-auto space-y-8 min-h-screen">
            {/* Header section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 print:hidden">
                <div className="flex items-center gap-4">
                    <div className="p-3.5 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-500/20">
                        <Calendar className="text-white" size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Academic Timetable</h1>
                        <p className="text-sm text-slate-500 mt-1 font-medium">
                            {viewMode === 'personal' ? 'Your personal teaching itinerary.' : (currentClass ? `${currentClass.name} - Section ${currentClass.section}` : 'Orchestrate academic schedules.')}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 w-full lg:w-auto">
                    {/* View Mode Toggle for Teachers */}
                    {currentUser?.role === ROLES.TEACHER && (
                        <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-white/5">
                            <button
                                onClick={() => setViewMode('personal')}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'personal' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                            >
                                My Schedule
                            </button>
                            <button
                                onClick={() => setViewMode('class')}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'class' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                            >
                                Class View
                            </button>
                        </div>
                    )}

                    {/* Class Selector (only if in class view) */}
                    {viewMode === 'class' && (
                        <div className="flex-1 min-w-[200px] bg-slate-900/50 p-1 rounded-2xl border border-white/5 shadow-inner flex items-center">
                            <select
                                value={selectedClassId}
                                onChange={(e) => setSelectedClassId(e.target.value)}
                                className="bg-transparent text-white text-sm font-bold w-full p-2 outline-none cursor-pointer"
                            >
                                <option value="" className="bg-slate-900">Select Class...</option>
                                {classes.map((c: any) => (
                                    <option key={c._id} value={c._id} className="bg-slate-900">{c.name} - {c.section}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex gap-2">
                        {canEdit && viewMode === 'class' && (
                            <button
                                onClick={() => setIsEditMode(!isEditMode)}
                                className={`p-3 rounded-2xl border transition-all ${isEditMode ? 'bg-indigo-600 text-white border-transparent' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'}`}
                                title={isEditMode ? "Switch to View Mode" : "Switch to Edit Mode"}
                            >
                                {isEditMode ? <Eye size={20} /> : <Edit3 size={20} />}
                            </button>
                        )}
                        
                        <button 
                            onClick={() => window.print()}
                            className="p-3 rounded-2xl bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 transition-all"
                            title="Print Timetable"
                        >
                            <Printer size={20} />
                        </button>

                        {isEditMode && canEdit && viewMode === 'class' && (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleAutoGenerate}
                                    disabled={!selectedClassId}
                                    className="px-4 py-3 bg-fuchsia-600/20 hover:bg-fuchsia-600/30 text-fuchsia-400 border border-fuchsia-600/30 rounded-2xl font-black flex items-center gap-2 transition-all disabled:opacity-50 active:scale-95"
                                >
                                    <Wand2 size={18} />
                                    <span className="hidden sm:inline">Auto-Fill</span>
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || !selectedClassId}
                                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl font-black shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all active:scale-95"
                                >
                                    <Save size={18} />
                                    <span>{saving ? 'Sync' : 'Publish'}</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Timetable Grid */}
            {viewMode === 'class' && !selectedClassId ? (
                <div className="flex flex-col items-center justify-center py-32 glass-dark rounded-[2.5rem] border border-dashed border-white/10 animate-in fade-in slide-in-from-bottom-4">
                    <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center text-4xl mb-8 shadow-2xl">
                        <Calendar size={40} className="text-indigo-400" />
                    </div>
                    <h3 className="text-2xl font-black text-white tracking-tight">No Class Selected</h3>
                    <p className="text-slate-500 max-w-sm text-center mt-3 px-6 font-medium">Please select a class group to orchestrate its schedule.</p>
                </div>
            ) : loading ? (
                <div className="py-32 flex flex-col items-center justify-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                    <p className="text-indigo-400 font-black animate-pulse uppercase tracking-[0.2em] text-xs">Synchronizing Matrix</p>
                </div>
            ) : (
                <div className="glass-dark rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl overflow-x-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-500">
                    <table className="w-full min-w-[1000px] border-collapse bg-slate-950/20 table-fixed">
                        <thead>
                            <tr className="border-b border-white/5 bg-slate-950/40">
                                <th className="p-8 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest w-28 sticky left-0 z-30 backdrop-blur-xl border-r border-white/5">
                                    DAY
                                </th>
                                {TIME_SLOTS.map((slot, i) => (
                                    <th key={i} className={`p-6 text-center border-r border-white/5 last:border-r-0 ${slot.type === 'break' ? 'w-24 bg-indigo-600/10' : ''}`}>
                                        <div className="text-xs font-black text-white uppercase tracking-wider">{slot.start}</div>
                                        <div className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-tighter">{slot.label}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {DAYS.map((day) => (
                                <tr key={day} className="group hover:bg-white/5 transition-colors">
                                    <td className="p-8 font-black text-white text-xs uppercase tracking-widest bg-slate-900/80 sticky left-0 z-20 backdrop-blur-xl border-r border-white/5">
                                        {day.substring(0, 3)}
                                    </td>

                                    {TIME_SLOTS.map((ts, idx) => {
                                        if (ts.type === 'break') {
                                            return (
                                                <td key={idx} className="bg-indigo-600/5 relative overflow-hidden border-r border-white/5">
                                                    <div className="absolute inset-0 flex items-center justify-center -rotate-90 select-none pointer-events-none opacity-20">
                                                        <span className="text-[10px] font-black tracking-[0.5em] text-indigo-400 uppercase italic">BREAK</span>
                                                    </div>
                                                </td>
                                            );
                                        }

                                        const cell = schedule[day]?.[idx];
                                        return (
                                            <td key={idx} className="p-3 border-r border-white/5 last:border-r-0 h-32 align-top">
                                                {isEditMode && viewMode === 'class' ? (
                                                    <div className="h-full flex flex-col gap-2">
                                                        <select
                                                            value={cell?.subject || ''}
                                                            onChange={(e) => handleCellChange(day, idx, 'subject', e.target.value)}
                                                            className="w-full text-[10px] font-black p-2 bg-slate-900/50 border border-white/5 rounded-xl text-white outline-none"
                                                        >
                                                            <option value="" className="bg-slate-900 text-slate-500">Subject...</option>
                                                            {subjects.map((s: any) => (
                                                                <option key={s._id} value={s._id} className="bg-slate-900">{s.name}</option>
                                                            ))}
                                                        </select>
                                                        <select
                                                            value={cell?.teacher || ''}
                                                            onChange={(e) => handleCellChange(day, idx, 'teacher', e.target.value)}
                                                            className="w-full text-[10px] font-bold p-2 bg-indigo-500/5 border border-indigo-500/10 rounded-xl text-indigo-300 outline-none"
                                                        >
                                                            <option value="" className="bg-slate-900 text-indigo-500/50">Faculty...</option>
                                                            {teachers.map((t: any) => (
                                                                <option key={t._id} value={t._id} className="bg-slate-900">{t.firstName} {t.lastName}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ) : (
                                                    <div className="h-full">
                                                        {cell?.subjectName ? (
                                                            <div className={`p-3 rounded-2xl border h-full flex flex-col justify-between transition-all hover:scale-[1.02] ${getSubjectColor(cell.subjectName)} shadow-lg shadow-black/20`}>
                                                                <div>
                                                                    <div className="flex items-center gap-1.5 mb-1.5">
                                                                        <BookOpen size={10} className="shrink-0" />
                                                                        <span className="text-[10px] font-black uppercase tracking-wider line-clamp-1">{cell.subjectName}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 opacity-80">
                                                                        {viewMode === 'personal' ? <Heart size={10} className="shrink-0" /> : <User size={10} className="shrink-0" />}
                                                                        <span className="text-[9px] font-bold line-clamp-1 italic">{viewMode === 'personal' ? cell.className : cell.teacherName}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="mt-2 text-[8px] font-black opacity-30 uppercase tracking-widest">{ts.start} - {ts.end}</div>
                                                            </div>
                                                        ) : (
                                                            <div className="h-full w-full rounded-2xl border border-dashed border-white/5 flex items-center justify-center bg-white/[0.01]">
                                                                <span className="text-[9px] font-black text-slate-800 uppercase tracking-widest">Free</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    body { background: white !important; color: black !important; }
                    .glass-dark { background: white !important; color: black !important; border: 1px solid #ddd !important; box-shadow: none !important; border-radius: 0 !important; }
                    th, td { border: 1px solid #eee !important; color: black !important; }
                    .print\\:hidden { display: none !important; }
                    [class*='bg-'] { background: #f5f5f5 !important; border-color: #ddd !important; color: black !important; }
                }
            `}</style>
        </div>
    );
}
