"use client";
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Save } from 'lucide-react';

import { PermissionGuard } from '../../../components/PermissionGuard';
import { usePermission, RESOURCES, ACTIONS } from '../../../hooks/usePermission';

const DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday'];

const TIME_SLOTS = [
    { start: '07:40', end: '08:20', id: 'slot1' },
    { start: '08:20', end: '09:00', id: 'slot2' },
    { start: '09:00', end: '09:30', id: 'slot3' },
    // BREAK is implicitly handled
    { start: '10:00', end: '10:40', id: 'slot4' },
    { start: '10:40', end: '11:20', id: 'slot5' },
    { start: '11:20', end: '12:00', id: 'slot6' },
];

const BREAK_SLOT = { start: '09:30', end: '10:00', label: 'BREAK' };

export default function TimetableGenerator() {
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Schedule state: { [day]: { [slotIndex]: { subject: '', teacher: '' } } }
    const [schedule, setSchedule] = useState<any>({});
    const [user, setUser] = useState<any>(null);

    const { hasPermission } = usePermission();
    const canEdit = hasPermission(RESOURCES.SCHEDULES, ACTIONS.UPDATE);

    useEffect(() => {
        // Init schedule structure
        const initialSchedule: any = {};
        DAYS.forEach(day => {
            initialSchedule[day] = {};
            TIME_SLOTS.forEach((_, idx) => {
                initialSchedule[day][idx] = { subject: '', teacher: '' };
            });
        });
        setSchedule(initialSchedule);

        const fetchBaseData = async () => {
            try {
                const userStr = localStorage.getItem('user');
                if (userStr) setUser(JSON.parse(userStr));

                const [classRes, subRes, teachRes] = await Promise.all([
                    api.get('/classes?limit=100'),
                    api.get('/subjects?limit=100'),
                    api.get('/teachers?limit=100')
                ]);
                setClasses(classRes.data.data);
                setSubjects(subRes.data.data);
                setTeachers(teachRes.data.data);
            } catch (err) {
                console.error("Base data fetch failed", err);
            }
        };
        fetchBaseData();
    }, []);

    useEffect(() => {
        if (!selectedClass) return;

        const fetchTimetable = async () => {
            setLoading(true);
            try {
                const { data } = await api.get(`/timetable/class/${selectedClass}`);

                // Map API data to grid state
                const newSchedule: any = {};
                DAYS.forEach(day => {
                    newSchedule[day] = {};
                    TIME_SLOTS.forEach((_, idx) => {
                        newSchedule[day][idx] = { subject: '', teacher: '' };
                    });
                });

                data.data.forEach((slot: any) => {
                    if (DAYS.includes(slot.day)) {
                        // Find matching time slot index
                        const slotIndex = TIME_SLOTS.findIndex(ts => ts.start === slot.startTime);
                        if (slotIndex !== -1) {
                            newSchedule[slot.day][slotIndex] = {
                                subject: slot.subject?._id || slot.subject,
                                teacher: slot.teacher?._id || slot.teacher
                            };
                        }
                    }
                });

                setSchedule(newSchedule);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchTimetable();
    }, [selectedClass]);

    const handleCellChange = (day: string, slotIdx: number, field: 'subject' | 'teacher', value: string) => {
        setSchedule((prev: any) => ({
            ...prev,
            [day]: {
                ...prev[day],
                [slotIdx]: {
                    ...prev[day][slotIdx],
                    [field]: value
                }
            }
        }));
    };

    const handleSave = async () => {
        if (!selectedClass) return alert("Please select a class first");
        if (!confirm("This will overwrite the existing timetable for this class. Continue?")) return;

        setSaving(true);
        try {
            const slotsToSave: any[] = [];

            DAYS.forEach(day => {
                TIME_SLOTS.forEach((timeSlot, idx) => {
                    const cell = schedule[day][idx];
                    if (cell.subject && cell.teacher) {
                        slotsToSave.push({
                            day,
                            startTime: timeSlot.start,
                            endTime: timeSlot.end,
                            subjectId: cell.subject,
                            teacherId: cell.teacher,
                            // room: '' // Could add room handling if needed
                        });
                    }
                });
            });

            await api.post('/timetable/bulk', {
                classId: selectedClass,
                slots: slotsToSave
            });

            alert("Timetable saved successfully!");
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.message || "Failed to save timetable");
        } finally {
            setSaving(false);
        }
    };

    // Filter subjects and teachers based on input? No, dropdowns are better for now.
    // For large lists, a searchable select is better but standard select works for prototype.

    return (
        <div className="p-4 sm:p-8 max-w-[1600px] mx-auto space-y-8 min-h-screen">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3.5 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-500/20">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Academic Timetable</h1>
                        <p className="text-sm text-slate-500 mt-1 font-medium">Coordinate class schedules and faculty assignments.</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                    <div className="flex-1 lg:w-64 bg-slate-900/50 p-1 rounded-2xl border border-white/5 shadow-inner">
                        <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="w-full bg-transparent text-white text-xs font-black outline-none px-4 py-2.5 cursor-pointer"
                        >
                            <option value="" className="bg-slate-900">Select Class...</option>
                            {classes.map((c: any) => (
                                <option key={c._id} value={c._id} className="bg-slate-900">{c.name} - {c.section}</option>
                            ))}
                        </select>
                    </div>

                    <PermissionGuard resource={RESOURCES.SCHEDULES} action={ACTIONS.UPDATE}>
                        <button
                            onClick={handleSave}
                            disabled={saving || !selectedClass}
                            className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            <Save size={18} />
                            {saving ? 'Syncing...' : 'Publish Changes'}
                        </button>
                    </PermissionGuard>
                </div>
            </div>

            {!selectedClass ? (
                <div className="flex flex-col items-center justify-center py-20 glass-dark rounded-[2.5rem] border border-dashed border-white/10 animate-in fade-in slide-in-from-bottom-4">
                    <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center text-4xl mb-6 shadow-2xl">📅</div>
                    <h3 className="text-xl font-black text-white">No Class Selected</h3>
                    <p className="text-slate-500 max-w-sm text-center mt-2 px-6">Select a class group from the dropdown menu above to view and orchestrate its academic schedule.</p>
                </div>
            ) : loading ? (
                <div className="py-20 text-center text-indigo-400 font-bold animate-pulse italic">Decoding schedule matrix...</div>
            ) : (
                <div className="glass-dark rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl overflow-x-auto custom-scrollbar animate-in fade-in slide-in-from-bottom-4">
                    <table className="w-full min-w-[1200px] border-collapse bg-slate-950/20">
                        <thead>
                            <tr className="border-b border-white/5 bg-slate-950/40">
                                <th className="p-8 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest w-40 sticky left-0 z-20 backdrop-blur-xl border-r border-white/5">
                                    Day / Time
                                </th>
                                {/* First 3 Slots */}
                                {TIME_SLOTS.slice(0, 3).map((slot, i) => (
                                    <th key={i} className="p-6 text-center min-w-[200px] border-r border-white/5 last:border-r-0">
                                        <div className="text-xs font-black text-white uppercase tracking-wider">{slot.start} - {slot.end}</div>
                                        <div className="text-[10px] text-slate-500 font-bold mt-1">Period {i + 1}</div>
                                    </th>
                                ))}

                                {/* Break Column Header */}
                                <th className="p-6 w-32 bg-indigo-600/10 text-center border-r border-white/5">
                                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{BREAK_SLOT.start} - {BREAK_SLOT.end}</div>
                                    <div className="text-[10px] font-black text-white uppercase tracking-[0.3em] mt-1.5 opacity-40">BREAK</div>
                                </th>

                                {/* Remaining Slots */}
                                {TIME_SLOTS.slice(3).map((slot, i) => (
                                    <th key={i + 3} className="p-6 text-center min-w-[200px] border-r border-white/5 last:border-r-0">
                                        <div className="text-xs font-black text-white uppercase tracking-wider">{slot.start} - {slot.end}</div>
                                        <div className="text-[10px] text-slate-500 font-bold mt-1">Period {i + 4}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {DAYS.map((day) => (
                                <tr key={day} className="group hover:bg-white/5 transition-colors">
                                    <td className="p-8 font-black text-white text-sm uppercase tracking-widest bg-slate-950/80 sticky left-0 z-10 backdrop-blur-xl border-r border-white/5 transition-colors">
                                        {day}
                                    </td>

                                    {TIME_SLOTS.slice(0, 3).map((_, idx) => (
                                        <td key={idx} className="p-4 border-r border-white/5 last:border-r-0">
                                            <SlotCell
                                                day={day}
                                                idx={idx}
                                                schedule={schedule}
                                                subjects={subjects}
                                                teachers={teachers}
                                                onChange={handleCellChange}
                                                readOnly={!canEdit}
                                            />
                                        </td>
                                    ))}

                                    {/* Break Column Cell */}
                                    <td className="bg-indigo-600/5 relative overflow-hidden border-r border-white/5">
                                        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none">
                                            <span className="text-4xl font-black rotate-90 tracking-[1em] text-white">BREAK</span>
                                        </div>
                                    </td>

                                    {TIME_SLOTS.slice(3).map((_, idx) => (
                                        <td key={idx + 3} className="p-4 border-r border-white/5 last:border-r-0">
                                            <SlotCell
                                                day={day}
                                                idx={idx + 3}
                                                schedule={schedule}
                                                subjects={subjects}
                                                teachers={teachers}
                                                onChange={handleCellChange}
                                                readOnly={!canEdit}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function SlotCell({ day, idx, schedule, subjects, teachers, onChange, readOnly }: any) {
    const cell = schedule[day]?.[idx] || { subject: '', teacher: '' };

    return (
        <div className="flex flex-col gap-2.5">
            <select
                value={cell.subject}
                onChange={(e) => onChange(day, idx, 'subject', e.target.value)}
                disabled={readOnly}
                className={`w-full p-2.5 bg-slate-900/50 border border-white/5 rounded-xl text-[11px] font-bold text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <option value="" className="bg-slate-900 text-slate-500">Subject...</option>
                {subjects.map((s: any) => (
                    <option key={s._id} value={s._id} className="bg-slate-900">{s.name}</option>
                ))}
            </select>

            <select
                value={cell.teacher}
                onChange={(e) => onChange(day, idx, 'teacher', e.target.value)}
                disabled={readOnly}
                className={`w-full p-2 bg-indigo-500/5 border border-indigo-500/10 rounded-xl text-[10px] text-indigo-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <option value="" className="bg-slate-900 text-indigo-500/50">Faculty...</option>
                {teachers.map((t: any) => (
                    <option key={t._id} value={t._id} className="bg-slate-900">{t.firstName} {t.lastName}</option>
                ))}
            </select>
        </div>
    );
}
