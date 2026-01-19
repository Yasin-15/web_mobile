"use client";
import { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import { Save, Wand2, Printer, Eye, Edit3, Calendar, User, BookOpen, Clock, Heart, Zap, Sparkles, AlertCircle } from 'lucide-react';
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
    const [isGenerating, setIsGenerating] = useState(false);
    const [genQuality, setGenQuality] = useState(0);

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

    /**
     * Smart School Timetable Generator (SSTG) Engine
     * Focus: Automated Constraint-Based Scheduling
     */
    const handleSSTGGenerate = async () => {
        const cls = classes.find(c => c._id === selectedClassId);
        if (!cls || !cls.subjects || cls.subjects.length === 0) {
            alert("SSTG Error: No subjects assigned to this class configuration. Optimization requires defined faculty-subject pairs.");
            return;
        }

        setIsGenerating(true);
        setGenQuality(0);

        try {
            // 1. Fetch Global State to detect teacher availability conflicts
            const { data: globalData } = await api.get('/timetable');
            const globalSlots = globalData.data;

            // Helper to check if a teacher is busy in another class
            const isTeacherBusy = (teacherId: string, day: string, startTime: string, currentClassId: string) => {
                return globalSlots.some((slot: any) =>
                    slot.teacher?._id === teacherId &&
                    slot.day === day &&
                    slot.startTime === startTime &&
                    slot.class?._id !== currentClassId
                );
            };

            const classSubjects = cls.subjects; // { subject, teachers: [] }
            const newSchedule: any = {};

            // Simulation progress for UI
            for (let i = 0; i <= 100; i += 20) {
                setGenQuality(i);
                await new Promise(r => setTimeout(r, 150));
            }

            // 2. Automated Backtracking Distrubution
            DAYS.forEach(day => {
                newSchedule[day] = {};

                // Shuffle subjects for the day to avoid boring repetition
                const dailyPool = [...classSubjects].sort(() => Math.random() - 0.5);
                let poolIdx = 0;

                TIME_SLOTS.forEach((ts, idx) => {
                    if (ts.type === 'break') {
                        newSchedule[day][idx] = { subject: '', teacher: '' };
                        return;
                    }

                    // Try to find a subject where the teacher is available
                    let foundMatch = false;
                    let attempts = 0;

                    while (!foundMatch && attempts < dailyPool.length) {
                        const candidate = dailyPool[poolIdx % dailyPool.length];
                        const teacherId = candidate.teachers?.[0]?._id || candidate.teachers?.[0];
                        const subjectId = candidate.subject?._id || candidate.subject;

                        if (!isTeacherBusy(teacherId, day, ts.start, selectedClassId)) {
                            const subObj = subjects.find(s => s._id === subjectId);
                            const teacherObj = teachers.find(t => t._id === teacherId);

                            newSchedule[day][idx] = {
                                subject: subObj?._id || '',
                                teacher: teacherObj?._id || '',
                                subjectName: subObj?.name,
                                teacherName: teacherObj ? `${teacherObj.firstName} ${teacherObj.lastName}` : ''
                            };
                            foundMatch = true;
                        }

                        poolIdx++;
                        attempts++;
                    }

                    // Fallback to "Free Period" if all teachers for this class's subjects are busy globally
                    if (!foundMatch) {
                        newSchedule[day][idx] = { subject: '', teacher: '', subjectName: 'Free Period', teacherName: 'Undirected' };
                    }
                });
            });

            setSchedule(newSchedule);
        } catch (err) {
            console.error(err);
            alert("SSTG Engine Fault: Could not fetch global school schedule state.");
        } finally {
            setIsGenerating(false);
        }
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
            alert("Matrix Published: Schedule synchronized globally.");
        } catch (err) {
            console.error(err);
            alert("Synchronization Failed");
        } finally {
            setSaving(false);
        }
    };

    const currentClass = useMemo(() => classes.find(c => c._id === selectedClassId), [classes, selectedClassId]);

    return (
        <div className="p-4 sm:p-8 max-w-[1600px] mx-auto space-y-8 min-h-screen">
            {/* Header section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 print:hidden">
                <div className="flex items-center gap-4">
                    <div className="p-3.5 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-500/20 relative group overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                        <Zap className="text-white relative z-10" size={24} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">SSTG Engine</h1>
                            <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-[10px] font-black rounded-full border border-indigo-500/20 uppercase tracking-widest">v2.0</span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1 font-medium">
                            {viewMode === 'personal' ? 'Your personal teaching itinerary.' : (currentClass ? `${currentClass.name} - Section ${currentClass.section}` : 'Advanced Automated Constraint-Based Scheduling.')}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 w-full lg:w-auto">
                    {/* View Mode Toggle for Teachers */}
                    {currentUser?.role === ROLES.TEACHER && (
                        <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-white/5 shadow-inner">
                            <button
                                onClick={() => setViewMode('personal')}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'personal' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                            >
                                PERSONAL
                            </button>
                            <button
                                onClick={() => setViewMode('class')}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'class' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                            >
                                CLASS
                            </button>
                        </div>
                    )}

                    {/* Class Selector */}
                    {viewMode === 'class' && (
                        <div className="flex-1 min-w-[200px] bg-slate-900/50 p-1 rounded-2xl border border-white/5 shadow-inner flex items-center group focus-within:border-indigo-500/30 transition-all">
                            <Calendar size={16} className="ml-3 text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
                            <select
                                value={selectedClassId}
                                onChange={(e) => setSelectedClassId(e.target.value)}
                                className="bg-transparent text-white text-sm font-bold w-full p-2.5 outline-none cursor-pointer"
                            >
                                <option value="" className="bg-slate-900">Select Target Group...</option>
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
                                title={isEditMode ? "View Mode" : "Edit Mode"}
                            >
                                {isEditMode ? <Eye size={20} /> : <Edit3 size={20} />}
                            </button>
                        )}

                        <button
                            onClick={() => window.print()}
                            className="p-3 rounded-2xl bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 transition-all"
                            title="Print Ledger"
                        >
                            <Printer size={20} />
                        </button>

                        {isEditMode && canEdit && viewMode === 'class' && (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSSTGGenerate}
                                    disabled={!selectedClassId || isGenerating}
                                    className="px-5 py-3.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl font-black flex items-center gap-2 transition-all disabled:opacity-50 active:scale-95 group relative overflow-hidden"
                                >
                                    {isGenerating ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                            <span>SOLVING {genQuality}%</span>
                                        </div>
                                    ) : (
                                        <>
                                            <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
                                            <span>RUN SSTG</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || !selectedClassId || isGenerating}
                                    className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl font-black shadow-xl shadow-indigo-500/20 flex items-center gap-2 transition-all active:scale-95 translate-y-0 hover:-translate-y-0.5"
                                >
                                    <Save size={18} />
                                    <span>{saving ? 'SYNCING...' : 'PUBLISH'}</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* SSTG Optimization Notice */}
            {isEditMode && selectedClassId && !isGenerating && (
                <div className="flex items-center gap-3 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={18} className="text-indigo-400 shrink-0" />
                    <p className="text-xs font-medium text-slate-400">
                        <span className="text-indigo-400 font-bold">Smart Hint:</span> The SSTG engine considers <span className="text-white">Global Teacher Availability</span> across the entire school to prevent scheduling conflicts with other classes.
                    </p>
                </div>
            )}

            {/* Timetable Grid */}
            {viewMode === 'class' && !selectedClassId ? (
                <div className="flex flex-col items-center justify-center py-40 glass-dark rounded-[3rem] border border-dashed border-white/10 animate-in fade-in slide-in-from-bottom-6 duration-700">
                    <div className="w-32 h-32 bg-indigo-600/5 rounded-[2.5rem] flex items-center justify-center text-4xl mb-10 shadow-inner group relative">
                        <div className="absolute inset-0 bg-indigo-500/10 blur-2xl rounded-full animate-pulse group-hover:bg-indigo-500/20 transition-all" />
                        <Calendar size={56} className="text-indigo-400 relative z-10 group-hover:scale-110 transition-transform" />
                    </div>
                    <h3 className="text-3xl font-black text-white tracking-tight">Access Matrix</h3>
                    <p className="text-slate-500 max-w-sm text-center mt-4 px-10 font-medium leading-relaxed">Select specialized student group from the control panel to initialize the academic orchestration engine.</p>
                </div>
            ) : loading ? (
                <div className="py-40 flex flex-col items-center justify-center gap-6">
                    <div className="relative w-16 h-16">
                        <div className="absolute inset-0 border-4 border-indigo-500/10 rounded-full" />
                        <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                    <p className="text-indigo-400 font-black animate-pulse uppercase tracking-[0.3em] text-[10px]">Decoding Schedule Ledger...</p>
                </div>
            ) : (
                <div className="glass-dark rounded-[2.5rem] border border-white/5 overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] overflow-x-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-700">
                    <table className="w-full min-w-[1100px] border-collapse bg-slate-950/20 table-fixed">
                        <thead>
                            <tr className="border-b border-white/5 bg-slate-950/40">
                                <th className="p-8 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest w-24 sticky left-0 z-30 backdrop-blur-3xl border-r border-white/5">
                                    DAY
                                </th>
                                {TIME_SLOTS.map((slot, i) => (
                                    <th key={i} className={`p-6 text-center border-r border-white/5 last:border-r-0 ${slot.type === 'break' ? 'w-24 bg-indigo-600/10' : ''}`}>
                                        <div className="text-xs font-black text-white uppercase tracking-wider">{slot.start}</div>
                                        <div className="text-[10px] text-slate-500 font-bold mt-1.5 uppercase tracking-tighter opacity-60">{slot.label}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-[11px]">
                            {DAYS.map((day) => (
                                <tr key={day} className="group hover:bg-white/[0.02] transition-colors">
                                    <td className="p-8 font-black text-white text-[11px] uppercase tracking-[0.2em] bg-slate-900/90 sticky left-0 z-20 backdrop-blur-3xl border-r border-white/5 transition-colors group-hover:text-indigo-400">
                                        {day.substring(0, 3)}
                                    </td>

                                    {TIME_SLOTS.map((ts, idx) => {
                                        if (ts.type === 'break') {
                                            return (
                                                <td key={idx} className="bg-indigo-600/5 relative overflow-hidden border-r border-white/5 group-hover:bg-indigo-600/10 transition-colors">
                                                    <div className="absolute inset-0 flex items-center justify-center -rotate-90 select-none pointer-events-none opacity-[0.05]">
                                                        <span className="text-[10px] font-black tracking-[0.8em] text-indigo-400 uppercase italic">INTERMISSION</span>
                                                    </div>
                                                </td>
                                            );
                                        }

                                        const cell = schedule[day]?.[idx];
                                        return (
                                            <td key={idx} className="p-4 border-r border-white/5 last:border-r-0 h-40 align-top transition-all">
                                                {isEditMode && viewMode === 'class' ? (
                                                    <div className="h-full flex flex-col gap-2.5">
                                                        <select
                                                            value={cell?.subject || ''}
                                                            onChange={(e) => handleCellChange(day, idx, 'subject', e.target.value)}
                                                            className="w-full text-[10px] font-black p-2.5 bg-slate-900/80 border border-white/10 rounded-xl text-white outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-inner"
                                                        >
                                                            <option value="" className="bg-slate-900 text-slate-500 italic">Select Subject</option>
                                                            {subjects.map((s: any) => (
                                                                <option key={s._id} value={s._id} className="bg-slate-900">{s.name}</option>
                                                            ))}
                                                        </select>
                                                        <select
                                                            value={cell?.teacher || ''}
                                                            onChange={(e) => handleCellChange(day, idx, 'teacher', e.target.value)}
                                                            className="w-full text-[10px] font-bold p-2.5 bg-white/[0.03] border border-white/5 rounded-xl text-indigo-300/80 outline-none focus:ring-1 focus:ring-indigo-500/50 shadow-inner"
                                                        >
                                                            <option value="" className="bg-slate-900 text-slate-500 italic">Assign Faculty</option>
                                                            {teachers.map((t: any) => (
                                                                <option key={t._id} value={t._id} className="bg-slate-900">{t.firstName} {t.lastName}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ) : (
                                                    <div className="h-full">
                                                        {cell?.subjectName ? (
                                                            <div className={`p-4 rounded-[1.5rem] border h-full flex flex-col justify-between transition-all hover:scale-[1.03] ${getSubjectColor(cell.subjectName)} shadow-[0_8px_30px_rgb(0,0,0,0.3)] backdrop-blur-sm relative group/cell overflow-hidden`}>
                                                                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover/cell:opacity-100 transition-opacity">
                                                                    <Sparkles size={10} className="text-white/40" />
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <BookOpen size={12} className="shrink-0 opacity-70" />
                                                                        <span className="text-[11px] font-black uppercase tracking-widest line-clamp-1">{cell.subjectName}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 text-white/50">
                                                                        {viewMode === 'personal' ? <Zap size={10} className="shrink-0" /> : <User size={10} className="shrink-0" />}
                                                                        <span className="text-[10px] font-black line-clamp-1 italic tracking-tight">{viewMode === 'personal' ? cell.className : cell.teacherName}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center justify-between mt-3">
                                                                    <div className="flex items-center gap-1.5 text-[8px] font-black opacity-30 uppercase tracking-widest">
                                                                        <Clock size={10} />
                                                                        {ts.start}
                                                                    </div>
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-current opacity-20" />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="h-full w-full rounded-[1.5rem] border border-dashed border-white/5 flex items-center justify-center bg-white/[0.012] group-hover:bg-white/[0.02] transition-colors">
                                                                <div className="flex flex-col items-center gap-1 opacity-[0.08] group-hover:opacity-20 transition-opacity">
                                                                    <span className="text-[10px] font-black uppercase tracking-[0.4em]">VACANT</span>
                                                                </div>
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
                    body { background: white !important; color: black !important; padding: 0 !important; }
                    .glass-dark { background: white !important; color: black !important; border: 1px solid #000 !important; box-shadow: none !important; border-radius: 0 !important; }
                    th, td { border: 1px solid #ddd !important; color: black !important; }
                    .print\\:hidden { display: none !important; }
                    [class*='bg-'] { background: #f0f0f0 !important; border-color: #000 !important; color: black !important; }
                    .text-white, .text-slate-400, .text-indigo-400 { color: black !important; }
                    table { page-break-inside: avoid; }
                }
                .custom-scrollbar::-webkit-scrollbar { height: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.2); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.4); }
            `}</style>
        </div>
    );
}
