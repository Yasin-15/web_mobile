"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../utils/api';
import Link from 'next/link';

export default function AddTeacherPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        designation: 'Teacher',
        qualification: '',
        phone: '',
        salary: ''
    });

    const handleChange = (e: any) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { data } = await api.post('/teachers', {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                password: formData.password || '', // Trigger auto-gen on backend
                profile: {
                    designation: formData.designation,
                    qualification: formData.qualification,
                    phone: formData.phone,
                    salary: formData.salary
                }
            });

            if (data.tempPassword) {
                alert(`Teacher recruited successfully!\n\nAccess Credentials:\nEmail: ${formData.email}\nPassword: ${data.tempPassword}\n\nPlease copy this password and provide it to the faculty member.`);
            } else {
                alert('Teacher recruited successfully');
            }

            router.push('/dashboard/teachers');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to recruit teacher');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-10">
                <Link href="/dashboard/teachers" className="text-slate-500 hover:text-white transition flex items-center gap-2 mb-4 text-sm font-medium">
                    <span>←</span> Back to Directory
                </Link>
                <h1 className="text-4xl font-black text-white tracking-tight">Faculty Recruitment</h1>
                <p className="text-slate-500 mt-1">Hire a new faculty member into the institutional roster.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-sm font-bold flex items-center gap-2">
                        <span>⚠️</span> {error}
                    </div>
                )}

                {/* Personal Info */}
                <section className="glass-dark p-8 rounded-[2rem] border border-white/5 space-y-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 text-6xl opacity-5 pointer-events-none">👨‍🏫</div>
                    <h2 className="text-xl font-bold text-white border-b border-white/5 pb-4">Personal Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">First Name</label>
                            <input
                                name="firstName" required value={formData.firstName} onChange={handleChange}
                                className="w-full px-5 py-3.5 bg-slate-950 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-purple-500/50 focus:outline-none transition shadow-inner"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Last Name</label>
                            <input
                                name="lastName" required value={formData.lastName} onChange={handleChange}
                                className="w-full px-5 py-3.5 bg-slate-950 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-purple-500/50 focus:outline-none transition shadow-inner"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Contact Email</label>
                            <input
                                type="email" name="email" required value={formData.email} onChange={handleChange}
                                placeholder="teacher@school.com"
                                className="w-full px-5 py-3.5 bg-slate-950 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-purple-500/50 focus:outline-none transition shadow-inner"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Phone Number</label>
                            <input
                                name="phone" value={formData.phone} onChange={handleChange}
                                className="w-full px-5 py-3.5 bg-slate-950 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-purple-500/50 focus:outline-none transition shadow-inner"
                            />
                        </div>
                    </div>
                </section>

                {/* Professional Details */}
                <section className="glass-dark p-8 rounded-[2rem] border border-white/5 space-y-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 text-6xl opacity-5 pointer-events-none">🎓</div>
                    <h2 className="text-xl font-bold text-white border-b border-white/5 pb-4">Professional Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Designation</label>
                            <input
                                name="designation" required value={formData.designation} onChange={handleChange}
                                placeholder="e.g. Senior Math Teacher"
                                className="w-full px-5 py-3.5 bg-slate-950 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-purple-500/50 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Qualification</label>
                            <input
                                name="qualification" value={formData.qualification} onChange={handleChange}
                                placeholder="e.g. M.Sc, B.Ed"
                                className="w-full px-5 py-3.5 bg-slate-950 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-purple-500/50 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Proposed Salary</label>
                            <input
                                type="number" name="salary" value={formData.salary} onChange={handleChange}
                                placeholder="Monthly Amount"
                                className="w-full px-5 py-3.5 bg-slate-950 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-purple-500/50 outline-none"
                            />
                        </div>
                    </div>
                </section>

                {/* Account Security */}
                <section className="glass-dark p-8 rounded-[2rem] border border-white/5 space-y-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 text-6xl opacity-5 pointer-events-none">🔐</div>
                    <h2 className="text-xl font-bold text-white border-b border-white/5 pb-4">Account Security</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Teacher Account Password</label>
                            <input
                                type="password" name="password" value={formData.password} onChange={handleChange}
                                placeholder="Fallback: teacher123"
                                className="w-full px-5 py-3.5 bg-slate-950 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-purple-500/50 outline-none"
                            />
                            <p className="text-[10px] text-slate-500 mt-2 px-1">Set a permanent password for the faculty member's portal access.</p>
                        </div>
                    </div>
                </section>

                <div className="flex gap-4 pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 py-4.5 bg-purple-600 hover:bg-purple-500 text-white rounded-[1.5rem] font-black text-lg transition shadow-xl shadow-purple-500/25 active:scale-95 disabled:opacity-50"
                    >
                        {loading ? 'Processing Recruitment...' : 'Finalize Recruitment'}
                    </button>
                    <Link href="/dashboard/teachers" className="px-10 py-4.5 bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-400 rounded-[1.5rem] font-bold text-center transition">
                        Cancel
                    </Link>
                </div>
            </form>
        </div>
    );
}
