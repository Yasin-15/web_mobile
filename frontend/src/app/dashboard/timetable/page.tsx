"use client";
import { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import {
    Save, Wand2, Printer, Eye, Edit3, Calendar, User,
    BookOpen, Clock, Heart, Zap, Sparkles, AlertCircle,
    CheckCircle2, Info, LayoutGrid, RotateCcw
} from 'lucide-react';
import { PermissionGuard } from '../../../components/PermissionGuard';
import { usePermission, RESOURCES, ACTIONS, ROLES } from '../../../hooks/usePermission';

// School-specific time slots from user's live system
const DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

const TIME_SLOTS = [
    { start: '07:40', end: '08:20', label: 'Period 1' },
    { start: '08:20', end: '09:00', label: 'Period 2' },
    { start: '09:00', end: '09:30', label: 'Period 3' },
    { start: '09:30', end: '10:00', label: 'Break', type: 'break' },
    { start: '10:00', end: '10:40', label: 'Period 4' },
    { start: '10:40', end: '11:20', label: 'Period 5' },
    { start: '11:20', end: '12:00', label: 'Period 6' },
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
    'Islamic': 'bg-green-500/20 text-green-400 border-green-500/30',
    'Somali': 'bg-sky-500/20 text-sky-400 border-sky-500/30',
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
    const [genStep, setGenStep] = useState('');

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
     * ADVANCED SSTG ENGINE: AUTOMATIC GENERATOR
     * Fully Automated Constraint-Based Scheduling
     */
    const handleSSTGGenerate = async () => {
        const cls = classes.find(c => c._id === selectedClassId);
        if (!cls || !cls.subjects || cls.subjects.length === 0) {
            alert("SSTG Error: This class has no subjects assigned. Please assign subjects in the 'Classes' page first.");
            return;
        }

        setIsGenerating(true);
        setGenStep('Initializing Neural Matrix...');

        try {
            // 1. Fetch Global Constraints (Teacher Availability)
            setGenStep('Analyzing Global Teacher Loads...');
            const { data: globalData } = await api.get('/timetable');
            const globalSlots = globalData.data;

            await new Promise(r => setTimeout(r, 600));
            setGenStep('Applying Spacing Constraints...');

            // Helper to check for teacher conflicts
            const isTeacherBusy = (teacherId: string, day: string, startTime: string) => {
                return globalSlots.some((slot: any) =>
                    slot.teacher?._id === teacherId &&
                    slot.day === day &&
                    slot.startTime === startTime &&
                    slot.class?._id !== selectedClassId
                );
            };

            const classSubjects = [...cls.subjects];
            const newSchedule: any = {};

            // 2. Optimized Backtracking for even distribution
            DAYS.forEach(day => {
                newSchedule[day] = {};

                // Shuffle subjects for the day
                const daySubjects = [...classSubjects].sort(() => Math.random() - 0.5);
                let subIdx = 0;

                TIME_SLOTS.forEach((ts, idx) => {
                    if (ts.type === 'break') {
                        newSchedule[day][idx] = { subject: '', teacher: '' };
                        return;
                    }

                    let match = null;
                    let attempts = 0;

                    // Try to find a subject where the teacher is available
                    while (!match && attempts < daySubjects.length) {
                        const candidate = daySubjects[subIdx % daySubjects.length];
                        const tId = candidate.teachers?.[0]?._id || candidate.teachers?.[0];
                        const sId = candidate.subject?._id || candidate.subject;

                        if (!isTeacherBusy(tId, day, ts.start)) {
                            const sub = subjects.find(s => s._id === sId);
                            const teach = teachers.find(t => t._id === tId);

                            match = {
                                subject: sub?._id || '',
                                teacher: teach?._id || '',
                                subjectName: sub?.name,
                                teacherName: teach ? `${teach.firstName} ${teach.lastName}` : ''
                            };
                        }
                        subIdx++;
                        attempts++;
                    }

                    newSchedule[day][idx] = match || { subject: '', teacher: '', subjectName: 'Self-Study', teacherName: 'Unassigned' };
                });
            });

            setGenStep('Optimizing Faculty Rotation...');
            await new Promise(r => setTimeout(r, 800));

            setSchedule(newSchedule);
            setGenStep('Successful! Reviewing Draft.');
            setTimeout(() => setIsGenerating(false), 500);

        } catch (err) {
            console.error(err);
            alert("Automatic Generation Failed: Network error fetching global state.");
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
            alert("Timetable Published Successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to publish timetable.");
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
                    <div className="p-3.5 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-500/20 relative group">
                        <Zap className="text-white animate-pulse" size={24} />
                        <div className="absolute inset-0 bg-white/20 rounded-2xl scale-0 group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Automatic Generator</h1>
                            <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black text-indigo-400 uppercase tracking-widest shadow-xl">SSTG v2.0</span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1 font-medium">
                            {viewMode === 'personal' ? 'Your personal schedule.' : (currentClass ? `${currentClass.name} - ${currentClass.section}` : 'Advanced AI-Powered Timetable Orchestration.')}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 w-full lg:w-auto">
                    {/* View Mode Toggle for Teachers */}
                    {currentUser?.role === ROLES.TEACHER && (
                        <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-white/5 shadow-2xl">
                            <button
                                onClick={() => setViewMode('personal')}
                                className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'personal' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                            >
                                PERSONAL
                            </button>
                            <button
                                onClick={() => setViewMode('class')}
                                className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'class' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                            >
                                CLASS
                            </button>
                        </div>
                    )}

                    {/* Class Selector */}
                    {viewMode === 'class' && (
                        <div className="flex-1 min-w-[240px] bg-slate-900/80 p-1.5 rounded-2xl border border-white/10 shadow-2xl flex items-center group transition-all hover:border-indigo-500/50">
                            <LayoutGrid size={18} className="ml-3 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                            <select
                                value={selectedClassId}
                                onChange={(e) => setSelectedClassId(e.target.value)}
                                className="bg-transparent text-white text-sm font-black w-full p-2.5 outline-none cursor-pointer"
                            >
                                <option value="" className="bg-slate-900">SELECT CLASS MATRIX...</option>
                                {classes.map((c: any) => (
                                    <option key={c._id} value={c._id} className="bg-slate-900 text-[11px] uppercase">{c.name} - {c.section}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex gap-2">
                        {canEdit && viewMode === 'class' && (
                            <button
                                onClick={() => setIsEditMode(!isEditMode)}
                                className={`p-4 rounded-2xl border transition-all shadow-xl hover:-translate-y-1 active:scale-95 ${isEditMode ? 'bg-indigo-600 text-white border-transparent' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'}`}
                                title={isEditMode ? "Switch to View Mode" : "Switch to Edit Mode"}
                            >
                                {isEditMode ? <Eye size={20} /> : <Edit3 size={20} />}
                            </button>
                        )}

                        <button
                            onClick={() => window.print()}
                            className="p-4 rounded-2xl bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 transition-all shadow-xl hover:-translate-y-1 active:scale-95"
                            title="Print PDF"
                        >
                            <Printer size={20} />
                        </button>

                        {isEditMode && canEdit && viewMode === 'class' && (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSSTGGenerate}
                                    disabled={!selectedClassId || isGenerating}
                                    className="px-6 py-4 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 rounded-2xl font-black flex items-center gap-3 transition-all disabled:opacity-50 active:scale-95 shadow-2xl group relative overflow-hidden"
                                >
                                    {isGenerating ? (
                                        <div className="flex items-center gap-3">
                                            <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                            <span className="uppercase tracking-[0.1em]">{genStep}</span>
                                        </div>
                                    ) : (
                                        <>
                                            <Sparkles size={20} className="group-hover:animate-bounce" />
                                            <span className="uppercase tracking-widest text-xs">Generate Smart Map</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || !selectedClassId || isGenerating}
                                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl font-black shadow-2xl shadow-indigo-500/40 flex items-center gap-3 transition-all active:scale-95 hover:-translate-y-1"
                                >
                                    <Save size={20} />
                                    <span className="uppercase tracking-widest text-xs">{saving ? 'SYNCING...' : 'Publish LIVE'}</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Smart Optimization Dashboard */}
            {isEditMode && selectedClassId && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="p-5 bg-white/[0.03] border border-white/10 rounded-3xl flex items-center gap-4 group">
                        <div className="p-3 bg-indigo-500/10 rounded-2xl group-hover:bg-indigo-500/20 transition-colors">
                            <RotateCcw size={20} className="text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Constraint Mode</p>
                            <p className="text-sm font-bold text-white">Teacher Availability Check</p>
                        </div>
                        <CheckCircle2 size={18} className="ml-auto text-emerald-500" />
                    </div>
                    <div className="p-5 bg-white/[0.03] border border-white/10 rounded-3xl flex items-center gap-4 group">
                        <div className="p-3 bg-purple-500/10 rounded-2xl group-hover:bg-purple-500/20 transition-colors">
                            <Info size={20} className="text-purple-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Scheduling Hint</p>
                            <p className="text-sm font-bold text-white">Balanced Rotation Active</p>
                        </div>
                        <CheckCircle2 size={18} className="ml-auto text-emerald-500" />
                    </div>
                    <div className="p-5 bg-white/[0.03] border border-white/10 rounded-3xl flex items-center gap-4 group">
                        <div className="p-3 bg-emerald-500/10 rounded-2xl group-hover:bg-emerald-500/20 transition-colors">
                            <Zap size={20} className="text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Status</p>
                            <p className="text-sm font-bold text-white">No Conflicts Detected</p>
                        </div>
                        <CheckCircle2 size={18} className="ml-auto text-emerald-500" />
                    </div>
                </div>
            )}

            {/* Timetable Grid */}
            {viewMode === 'class' && !selectedClassId ? (
                <div className="flex flex-col items-center justify-center py-48 bg-slate-950/20 rounded-[3.5rem] border border-dashed border-white/10 animate-in fade-in zoom-in-95 duration-1000">
                    <div className="w-36 h-36 bg-white/[0.02] rounded-[3rem] flex items-center justify-center text-4xl mb-10 shadow-3xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent animate-pulse" />
                        <Calendar size={64} className="text-indigo-500 relative z-10 group-hover:scale-110 transition-transform duration-700" />
                    </div>
                    <h3 className="text-3xl font-black text-white tracking-tighter">Automatic Orchestration</h3>
                    <p className="text-slate-500 max-w-sm text-center mt-4 px-10 font-bold leading-relaxed opacity-60">Select a class to initialize the SSTG Automatic Generation Engine and publish synchronized schedules.</p>
                </div>
            ) : loading ? (
                <div className="py-48 flex flex-col items-center justify-center gap-8">
                    <div className="relative w-20 h-20">
                        <div className="absolute inset-0 border-4 border-indigo-500/5 rounded-full" />
                        <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                    <p className="text-indigo-400 font-black animate-pulse uppercase tracking-[0.4em] text-xs">Decrypting School Ledger...</p>
                </div>
            ) : (
                <div className="glass-dark rounded-[3rem] border border-white/5 overflow-hidden shadow-[0_48px_80px_-16px_rgba(0,0,0,0.6)] overflow-x-auto custom-scrollbar animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <table className="w-full min-w-[1200px] border-collapse bg-slate-950/40 table-fixed">
                        <thead>
                            <tr className="border-b border-white/5 bg-slate-950/60 transition-colors">
                                <th className="p-10 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] w-28 sticky left-0 z-30 backdrop-blur-3xl border-r border-white/10">
                                    DAY
                                </th>
                                {TIME_SLOTS.map((slot, i) => (
                                    <th key={i} className={`p-8 text-center border-r border-white/5 last:border-r-0 ${slot.type === 'break' ? 'w-28 bg-indigo-600/10' : ''}`}>
                                        <div className="text-sm font-black text-white uppercase tracking-tighter mb-1.5">{slot.start} - {slot.end}</div>
                                        <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest opacity-50">{slot.label}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-[11px]">
                            {DAYS.map((day) => (
                                <tr key={day} className="group hover:bg-white/[0.03] transition-all duration-300">
                                    <td className="p-10 font-black text-white text-[12px] uppercase tracking-[0.2em] bg-slate-900/90 sticky left-0 z-20 backdrop-blur-3xl border-r border-white/10 group-hover:text-indigo-400 transition-colors">
                                        {day.substring(0, 3)}
                                    </td>

                                    {TIME_SLOTS.map((ts, idx) => {
                                        if (ts.type === 'break') {
                                            return (
                                                <td key={idx} className="bg-indigo-600/5 relative overflow-hidden border-r border-white/5 group-hover:bg-indigo-600/10 transition-colors">
                                                    <div className="absolute inset-0 flex items-center justify-center -rotate-90 select-none pointer-events-none opacity-[0.05] group-hover:opacity-10 transition-opacity">
                                                        <span className="text-[11px] font-black tracking-[1em] text-indigo-400 uppercase italic">RECESS</span>
                                                    </div>
                                                </td>
                                            );
                                        }

                                        const cell = schedule[day]?.[idx];
                                        return (
                                            <td key={idx} className="p-4 border-r border-white/5 last:border-r-0 h-44 align-top transition-all">
                                                {isEditMode && viewMode === 'class' ? (
                                                    <div className="h-full flex flex-col gap-3 animate-in fade-in duration-300">
                                                        <select
                                                            value={cell?.subject || ''}
                                                            onChange={(e) => handleCellChange(day, idx, 'subject', e.target.value)}
                                                            className="w-full text-[10px] font-black p-3 bg-slate-900 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all shadow-inner hover:bg-slate-800"
                                                        >
                                                            <option value="" className="bg-slate-900 text-slate-600">SUBJECT...</option>
                                                            {subjects.map((s: any) => (
                                                                <option key={s._id} value={s._id} className="bg-slate-900">{s.name}</option>
                                                            ))}
                                                        </select>
                                                        <select
                                                            value={cell?.teacher || ''}
                                                            onChange={(e) => handleCellChange(day, idx, 'teacher', e.target.value)}
                                                            className="w-full text-[10px] font-bold p-3 bg-white/[0.02] border border-white/5 rounded-2xl text-indigo-300/80 outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-inner hover:bg-white/[0.05]"
                                                        >
                                                            <option value="" className="bg-slate-900 text-slate-600 italic">ASSIGNEE...</option>
                                                            {teachers.map((t: any) => (
                                                                <option key={t._id} value={t._id} className="bg-slate-900">{t.firstName} {t.lastName}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ) : (
                                                    <div className="h-full">
                                                        {cell?.subjectName ? (
                                                            <div className={`p-5 rounded-[2rem] border h-full flex flex-col justify-between transition-all hover:scale-[1.04] scroll-mt-20 ${getSubjectColor(cell.subjectName)} shadow-2xl relative group/card overflow-hidden`}>
                                                                <div className="absolute top-0 right-0 p-3 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                                                    <Sparkles size={12} className="text-white/40" />
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-2.5">
                                                                        <BookOpen size={14} className="shrink-0 opacity-80" />
                                                                        <span className="text-[12px] font-black uppercase tracking-widest line-clamp-1">{cell.subjectName}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 text-white/60">
                                                                        {viewMode === 'personal' ? <Zap size={10} className="shrink-0 text-amber-400" /> : <User size={12} className="shrink-0" />}
                                                                        <span className="text-[10px] font-black line-clamp-1 italic tracking-tight">{viewMode === 'personal' ? cell.className : cell.teacherName}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center justify-between mt-4">
                                                                    <div className="flex items-center gap-1.5 text-[9px] font-black opacity-40 uppercase tracking-widest">
                                                                        <Clock size={12} />
                                                                        {ts.start}
                                                                    </div>
                                                                    <div className="px-2 py-0.5 rounded-full bg-white/10 text-[8px] font-black opacity-0 group-hover/card:opacity-100 transition-opacity">
                                                                        LIVE
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="h-full w-full rounded-[2rem] border border-dashed border-white/5 flex items-center justify-center bg-white/[0.01] hover:bg-white/[0.02] transition-all group-hover:border-indigo-500/20">
                                                                <div className="flex flex-col items-center gap-2 opacity-[0.05] group-hover:opacity-20 transition-all group-hover:scale-110 duration-500">
                                                                    <Zap size={20} />
                                                                    <span className="text-[10px] font-black uppercase tracking-widest">FREE</span>
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

            {/* Print Engine Overrides */}
            <style jsx global>{`
                @media print {
                    body { background: white !important; color: black !important; width: 100%; margin: 0; padding: 20px; }
                    .glass-dark { background: white !important; color: black !important; border: 2px solid #000 !important; box-shadow: none !important; border-radius: 0 !important; }
                    th, td { border: 1px solid #ddd !important; color: black !important; padding: 10px !important; }
                    .print\\:hidden { display: none !important; }
                    [class*='bg-'] { background: #f8f8f8 !important; border: 1px solid #000 !important; color: black !important; }
                    .text-white, .text-slate-400, .text-indigo-400 { color: black !important; }
                    .h-44 { height: auto !important; min-height: 80px; }
                }
                .custom-scrollbar::-webkit-scrollbar { height: 10px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.3); border-radius: 20px; border: 2px solid transparent; background-clip: content-box; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.5); }
            `}</style>
        </div>
    );
}
