"use client";
import { useState, useEffect } from 'react';
import api from '@/app/utils/api';
import { toast } from 'react-hot-toast';
import { Save, Search, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';

interface Student {
    _id: string;
    firstName: string;
    lastName: string;
    profile: {
        rollNo: string;
        admissionNo: string;
    };
}

interface MarkInput {
    studentId: string;
    score: string | number;
    maxMarks: number;
    remarks: string;
}

export default function GradesPage() {
    const [exams, setExams] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);

    const [selectedExam, setSelectedExam] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');

    const [students, setStudents] = useState<Student[]>([]);
    const [marksData, setMarksData] = useState<Record<string, MarkInput>>({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [maxMarksGlobal, setMaxMarksGlobal] = useState(100);

    // Initial Data Fetch
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [examsRes, classesRes, subjectsRes] = await Promise.all([
                    api.get('/exams'),
                    api.get('/classes'),
                    api.get('/subjects')
                ]);
                setExams(examsRes.data.data);
                setClasses(classesRes.data.data);
                setSubjects(subjectsRes.data.data);
            } catch (error) {
                console.error(error);
                toast.error('Failed to load initial data');
            }
        };
        fetchData();
    }, []);

    // Load Students & Marks when filters change
    useEffect(() => {
        if (selectedExam && selectedClass && selectedSubject) {
            fetchStudentsAndMarks();
        } else {
            setStudents([]);
            setMarksData({});
        }
    }, [selectedExam, selectedClass, selectedSubject]);

    const fetchStudentsAndMarks = async () => {
        setLoading(true);
        try {
            // 1. Get Students in Class
            // We need to use valid API. Assuming list students by class works.
            const studentsRes = await api.get(`/students?class=${selectedClass}`);
            const fetchedStudents = studentsRes.data.data;

            // 2. Get Existing Marks
            const marksRes = await api.get('/exams/marks', {
                params: {
                    examId: selectedExam,
                    classId: selectedClass,
                    subjectId: selectedSubject
                }
            });
            const existingMarks = marksRes.data.data;

            // 3. Merge Data
            const initialMarks: Record<string, MarkInput> = {};

            fetchedStudents.forEach((s: Student) => {
                const foundMark = existingMarks.find((m: any) => m.student._id === s._id);
                initialMarks[s._id] = {
                    studentId: s._id,
                    score: foundMark ? foundMark.marksObtained : '',
                    maxMarks: foundMark ? foundMark.maxMarks : maxMarksGlobal,
                    remarks: foundMark ? foundMark.remarks : ''
                };
            });

            setStudents(fetchedStudents);
            setMarksData(initialMarks);

        } catch (error) {
            console.error(error);
            toast.error('Failed to load grade book');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkChange = (studentId: string, field: keyof MarkInput, value: any) => {
        setMarksData(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [field]: value
            }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const marksPayload = Object.values(marksData).map(m => ({
                studentId: m.studentId,
                score: m.score === '' ? null : Number(m.score),
                maxMarks: Number(maxMarksGlobal),
                remarks: m.remarks
            }));

            await api.post('/exams/marks/bulk', {
                examId: selectedExam,
                classId: selectedClass,
                subjectId: selectedSubject,
                marks: marksPayload,
                maxMarks: maxMarksGlobal
            });

            toast.success('Grades saved successfully');
            fetchStudentsAndMarks(); // Refresh
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to save grades');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-8 h-8 text-indigo-600" />
                        Grade Book
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Enter and manage student marks.</p>
                </div>
                {selectedExam && selectedClass && selectedSubject && (
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
                    >
                        {saving ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Save Changes
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1 text-slate-600 dark:text-slate-400">Exam</label>
                    <select
                        value={selectedExam}
                        onChange={(e) => setSelectedExam(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">Select Exam...</option>
                        {exams.map(e => (
                            <option key={e._id} value={e._id}>{e.name} ({e.term})</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-slate-600 dark:text-slate-400">Class</label>
                    <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">Select Class...</option>
                        {classes.map(c => (
                            <option key={c._id} value={c._id}>{c.name} {c.section && `(${c.section})`}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-slate-600 dark:text-slate-400">Subject</label>
                    <select
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">Select Subject...</option>
                        {subjects.map(s => (
                            <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-slate-600 dark:text-slate-400">Max Marks</label>
                    <input
                        type="number"
                        value={maxMarksGlobal}
                        onChange={(e) => setMaxMarksGlobal(Number(e.target.value))}
                        className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            </div>

            {/* Results Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full p-12">
                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-slate-500">Loading student list...</p>
                    </div>
                ) : !selectedExam || !selectedClass || !selectedSubject ? (
                    <div className="flex flex-col items-center justify-center h-full p-12 text-slate-400">
                        <Search className="w-12 h-12 mb-4 opacity-20" />
                        <p>Select Exam, Class, and Subject to start grading.</p>
                    </div>
                ) : students.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-12 text-slate-500">
                        <AlertCircle className="w-12 h-12 mb-4 text-amber-500 opacity-50" />
                        <p>No students found in this class.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="p-4 w-16">#</th>
                                    <th className="p-4">Student</th>
                                    <th className="p-4 w-32">Marks Obtained</th>
                                    <th className="p-4 w-24">Max</th>
                                    <th className="p-4">Remarks</th>
                                    <th className="p-4 w-16">State</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {students.map((student, index) => {
                                    const score = marksData[student._id]?.score || '';
                                    const isPass = Number(score) >= (Number(maxMarksGlobal) * 0.4); // Assuming 40% pass
                                    return (
                                        <tr key={student._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                            <td className="p-4 text-slate-500">{index + 1}</td>
                                            <td className="p-4">
                                                <div className="font-medium text-slate-900 dark:text-white">{student.firstName} {student.lastName}</div>
                                                <div className="text-xs text-slate-500">Roll: {student.profile.rollNo}</div>
                                            </td>
                                            <td className="p-4">
                                                <input
                                                    type="number"
                                                    value={score}
                                                    onChange={(e) => handleMarkChange(student._id, 'score', e.target.value)}
                                                    className={`w-full p-2 rounded border focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 ${score !== '' && !isPass
                                                        ? 'border-red-300 text-red-600 bg-red-50 dark:bg-red-900/10'
                                                        : 'border-slate-300 dark:border-slate-600'
                                                        }`}
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td className="p-4 text-slate-500">{maxMarksGlobal}</td>
                                            <td className="p-4">
                                                <input
                                                    type="text"
                                                    value={marksData[student._id]?.remarks || ''}
                                                    onChange={(e) => handleMarkChange(student._id, 'remarks', e.target.value)}
                                                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
                                                    placeholder="Optional..."
                                                />
                                            </td>
                                            <td className="p-4">
                                                {score !== '' && (
                                                    <CheckCircle2 className={`w-5 h-5 ${isPass ? 'text-green-500' : 'text-red-500'}`} />
                                                )}
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
