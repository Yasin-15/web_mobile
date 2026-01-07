const Attendance = require('../models/attendance.model');
const User = require('../models/user.model');
const Class = require('../models/class.model');
const Notification = require('../models/notification.model');
const { logAction } = require('../utils/logger');
const { emitToTenant } = require('../config/socket');
const { generateAttendanceReport } = require('../utils/reportGenerator');

// @desc    Mark bulk attendance for a class
// @route   POST /api/attendance/mark
exports.markAttendance = async (req, res) => {
    try {
        const { classId, subjectId, date, records } = req.body; // records: [{ studentId, status, remarks }]
        const tenantId = req.user.tenantId;

        if (!classId || !date || !records || !Array.isArray(records)) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        // Normalize date to remove time part
        const attendanceDate = new Date(date);
        attendanceDate.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (attendanceDate > today) {
            return res.status(400).json({ success: false, message: 'Cannot mark attendance for future dates' });
        }

        const attendanceRecords = records.map(record => ({
            student: record.studentId,
            class: classId,
            subject: subjectId || null,
            date: attendanceDate,
            status: record.status || 'present',
            remarks: record.remarks || '',
            markedBy: req.user._id,
            tenantId
        }));

        // Upsert logic: Update if exists, otherwise create
        const bulkOps = attendanceRecords.map(record => ({
            updateOne: {
                filter: {
                    student: record.student,
                    class: record.class,
                    subject: record.subject,
                    date: record.date,
                    tenantId
                },
                update: { $set: record },
                upsert: true
            }
        }));

        await Attendance.bulkWrite(bulkOps);

        // Real-time update
        emitToTenant(tenantId, 'attendance-updated', { classId, date: attendanceDate });

        // Trigger notifications for absent students
        const absentRecords = records.filter(r => r.status === 'absent');
        if (absentRecords.length > 0) {
            const [students, classObj] = await Promise.all([
                User.find({ _id: { $in: absentRecords.map(r => r.studentId) } }).select('firstName lastName profile.parentIds'),
                Class.findById(classId).select('name section')
            ]);

            const className = classObj ? `${classObj.name} - ${classObj.section}` : 'Class';

            for (const student of students) {
                // Notify Student
                await Notification.create({
                    title: 'Attendance Alert',
                    message: `You were marked ABSENT in ${className} today.`,
                    type: 'alert',
                    recipient: student._id,
                    tenantId
                });

                // Notify Parents
                if (student.profile?.parentIds && student.profile.parentIds.length > 0) {
                    for (const parentId of student.profile.parentIds) {
                        await Notification.create({
                            title: 'Attendance Alert',
                            message: `${student.firstName} ${student.lastName} was marked ABSENT in ${className} today.`,
                            type: 'alert',
                            recipient: parentId,
                            tenantId
                        });
                    }
                }
            }
        }

        await logAction({
            action: 'CREATE',
            module: 'ATTENDANCE',
            details: `Marked attendance for class ${classId} on ${attendanceDate.toDateString()}`,
            userId: req.user._id,
            tenantId
        });

        res.status(200).json({ success: true, message: 'Attendance marked successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Download attendance report (Excel)
// @route   GET /api/attendance/report/:classId
exports.getAttendanceReport = async (req, res) => {
    try {
        const { classId } = req.params;
        const { startDate, endDate } = req.query;
        const tenantId = req.user.tenantId;

        const filter = { class: classId, tenantId };
        if (startDate && endDate) {
            filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const attendanceRecords = await Attendance.find(filter)
            .populate('student', 'firstName lastName profile.rollNo')
            .sort({ date: -1 });

        const workbook = await generateAttendanceReport(attendanceRecords);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=attendance_${classId}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get attendance for a class on a specific date
// @route   GET /api/attendance/class/:classId
exports.getClassAttendance = async (req, res) => {
    try {
        const { classId } = req.params;
        const { date } = req.query;
        const tenantId = req.user.tenantId;

        const queryDate = new Date(date || Date.now());
        queryDate.setHours(0, 0, 0, 0);

        const attendance = await Attendance.find({
            class: classId,
            date: queryDate,
            tenantId
        }).populate('student', 'firstName lastName email profile.rollNo')
            .populate('subject', 'name code');

        res.status(200).json({ success: true, data: attendance });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get attendance history/stats for a class
// @route   GET /api/attendance/history/:classId
exports.getClassAttendanceHistory = async (req, res) => {
    try {
        const { classId } = req.params;
        const { startDate, endDate } = req.query;
        const tenantId = req.user.tenantId;

        const filter = { class: classId, tenantId };
        if (startDate && endDate) {
            filter.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const history = await Attendance.find(filter)
            .populate('student', 'firstName lastName')
            .populate('subject', 'name code')
            .sort({ date: -1 });

        res.status(200).json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get logged-in student's attendance
// @route   GET /api/attendance/my
exports.getMyAttendance = async (req, res) => {
    try {
        const studentId = req.user._id;
        const tenantId = req.user.tenantId;
        const { startDate, endDate } = req.query;

        const filter = { student: studentId, tenantId };

        if (startDate && endDate) {
            filter.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const attendance = await Attendance.find(filter)
            .populate('subject', 'name code')
            .sort({ date: -1 });

        // Calculate stats
        const total = attendance.length;
        const present = attendance.filter(a => a.status === 'present').length;
        const absent = attendance.filter(a => a.status === 'absent').length;
        const late = attendance.filter(a => a.status === 'late').length;

        res.status(200).json({
            success: true,
            data: {
                records: attendance,
                stats: {
                    total,
                    present,
                    absent,
                    late,
                    percentage: total > 0 ? ((present / total) * 100).toFixed(1) : 0
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
