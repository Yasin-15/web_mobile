const Mark = require('../models/mark.model');
const Attendance = require('../models/attendance.model');
const User = require('../models/user.model');
const Class = require('../models/class.model');
const Invoice = require('../models/invoice.model');
const Timetable = require('../models/timetable.model');
const mongoose = require('mongoose');

// @desc    Get class performance analytics
// @route   GET /api/analytics/class/:classId
// @access  Private (Teacher, Admin)
exports.getClassAnalytics = async (req, res) => {
    try {
        const { classId } = req.params;
        const tenantId = req.user.tenantId;

        // 1. Average Marks by Subject
        const marksAnalysis = await Mark.aggregate([
            { $match: { class: new mongoose.Types.ObjectId(classId), tenantId } },
            {
                $group: {
                    _id: '$subject',
                    avgScore: { $avg: '$marksObtained' },
                    maxScore: { $max: '$marksObtained' },
                    minScore: { $min: '$marksObtained' }
                }
            },
            {
                $lookup: {
                    from: 'subjects',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'subject'
                }
            },
            { $unwind: '$subject' },
            {
                $project: {
                    subjectName: '$subject.name',
                    avgScore: 1,
                    maxScore: 1,
                    minScore: 1
                }
            }
        ]);

        // 2. Attendance Trends (Last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const attendanceAnalysis = await Attendance.aggregate([
            { $match: { class: new mongoose.Types.ObjectId(classId), tenantId, date: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
                    presentCount: {
                        $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
                    },
                    totalCount: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // 3. Grade Matrix (Student-wise marks for most recent exams)
        const gradeMatrix = await Mark.aggregate([
            { $match: { class: new mongoose.Types.ObjectId(classId), tenantId } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'student',
                    foreignField: '_id',
                    as: 'studentInfo'
                }
            },
            { $unwind: '$studentInfo' },
            {
                $lookup: {
                    from: 'subjects',
                    localField: 'subject',
                    foreignField: '_id',
                    as: 'subjectInfo'
                }
            },
            { $unwind: '$subjectInfo' },
            {
                $group: {
                    _id: '$student',
                    studentName: { $first: { $concat: ['$studentInfo.firstName', ' ', '$studentInfo.lastName'] } },
                    marks: {
                        $push: {
                            subject: '$subjectInfo.name',
                            score: '$marksObtained'
                        }
                    }
                }
            }
        ]);

        // 4. Low Attendance Alerts (< 75%)
        const lowAttendanceAlerts = await Attendance.aggregate([
            { $match: { class: new mongoose.Types.ObjectId(classId), tenantId } },
            {
                $group: {
                    _id: '$student',
                    presentCount: {
                        $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
                    },
                    totalCount: { $sum: 1 }
                }
            },
            {
                $project: {
                    attendanceRate: { $multiply: [{ $divide: ['$presentCount', '$totalCount'] }, 100] }
                }
            },
            { $match: { attendanceRate: { $lt: 75 } } },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'studentInfo'
                }
            },
            { $unwind: '$studentInfo' },
            {
                $project: {
                    studentName: { $concat: ['$studentInfo.firstName', ' ', '$studentInfo.lastName'] },
                    attendanceRate: 1
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: {
                marksBySubject: marksAnalysis,
                attendanceTrends: attendanceAnalysis,
                gradeMatrix,
                lowAttendanceAlerts
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get student individual performance
// @route   GET /api/analytics/student/:studentId
// @access  Private
exports.getStudentAnalytics = async (req, res) => {
    try {
        const { studentId } = req.params;
        const tenantId = req.user.tenantId;

        // 1. Marks History
        const marks = await Mark.find({ student: studentId, tenantId })
            .populate('subject', 'name')
            .populate('exam', 'name')
            .sort({ createdAt: 1 });

        // 2. Attendance Summary
        const attendance = await Attendance.aggregate([
            { $match: { student: new mongoose.Types.ObjectId(studentId), tenantId } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: {
                marks,
                attendanceSummary: attendance
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get Admin Dashboard Overview Stats
// @route   GET /api/analytics/admin/overview
// @access  Private (Admin)
exports.getAdminDashboardStats = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;

        // 1. Overview Totals
        const [studentCount, teacherCount, parentCount, invoiceStats] = await Promise.all([
            User.countDocuments({ tenantId, role: 'student' }),
            User.countDocuments({ tenantId, role: 'teacher' }),
            User.countDocuments({ tenantId, role: 'parent' }),
            Invoice.aggregate([
                { $match: { tenantId } },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: '$totalAmount' },
                        collected: { $sum: '$paidAmount' },
                        pending: { $sum: { $subtract: ['$totalAmount', '$paidAmount'] } }
                    }
                }
            ])
        ]);

        // 2. Attendance Today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const attendanceToday = await Attendance.aggregate([
            { $match: { tenantId, date: { $gte: startOfDay, $lte: endOfDay } } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const totalAttending = attendanceToday.reduce((acc, curr) => acc + curr.count, 0);
        const presentCount = attendanceToday.find(a => a._id === 'present')?.count || 0;
        const attendanceRate = totalAttending > 0 ? Math.round((presentCount / totalAttending) * 100) : 0;

        // 3. Financial Trends (Last 6 Months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const financeTrends = await Invoice.aggregate([
            { $match: { tenantId, createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: { $month: '$createdAt' },
                    revenue: { $sum: '$totalAmount' },
                    collected: { $sum: '$paidAmount' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // 4. Student Enrollment Growth
        const enrollmentGrowth = await User.aggregate([
            { $match: { tenantId, role: 'student', createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: { $month: '$createdAt' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // 5. Student Distribution by Class
        const classDistribution = await User.aggregate([
            { $match: { tenantId, role: 'student' } },
            {
                $group: {
                    _id: '$profile.class',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // 6. Gender Demographics
        const genderDemographics = await User.aggregate([
            { $match: { tenantId, role: 'student' } },
            {
                $group: {
                    _id: '$profile.gender',
                    count: { $sum: 1 }
                }
            }
        ]);

        // 7. Attendance Trend (Last 14 Days)
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        const attendanceTrend = await Attendance.aggregate([
            { $match: { tenantId, date: { $gte: fourteenDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
                    rate: {
                        $avg: { $cond: [{ $eq: ['$status', 'present'] }, 100, 0] }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                counts: {
                    students: studentCount,
                    teachers: teacherCount,
                    parents: parentCount
                },
                finance: invoiceStats[0] || { totalRevenue: 0, collected: 0, pending: 0 },
                attendance: {
                    rate: attendanceRate,
                    total: totalAttending,
                    present: presentCount,
                    trends: attendanceTrend
                },
                trends: {
                    finance: financeTrends,
                    enrollment: enrollmentGrowth
                },
                distribution: {
                    classes: classDistribution
                },
                demographics: {
                    gender: genderDemographics
                }
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get Detailed Finance Analytics
// @route   GET /api/analytics/finance
// @access  Private (Admin)
exports.getFinanceAnalytics = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;

        // 1. Revenue by Category (Fee Types)
        const revenueByCategory = await Invoice.aggregate([
            { $match: { tenantId } },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.name',
                    total: { $sum: '$items.amount' }
                }
            }
        ]);

        // 2. Outstanding Invoices
        const outstanding = await Invoice.find({
            tenantId,
            status: { $in: ['unpaid', 'partially_paid'] }
        })
            .populate('student', 'firstName lastName')
            .sort({ dueDate: 1 })
            .limit(10);

        res.status(200).json({
            success: true,
            data: {
                revenueByCategory,
                outstanding
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get Staff Workload Analytics
// @route   GET /api/analytics/staff
// @access  Private (Admin)
exports.getStaffAnalytics = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;

        // 1. Teacher Workload (Periods per week)
        const workload = await Timetable.aggregate([
            { $match: { tenantId } },
            {
                $group: {
                    _id: '$teacher',
                    periodsCount: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'teacherInfo'
                }
            },
            { $unwind: '$teacherInfo' },
            {
                $project: {
                    teacherName: { $concat: ['$teacherInfo.firstName', ' ', '$teacherInfo.lastName'] },
                    periodsCount: 1
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: {
                workload
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

