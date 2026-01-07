const User = require('../models/user.model');
const Attendance = require('../models/attendance.model');
const Mark = require('../models/mark.model');
const Timetable = require('../models/timetable.model');
const Assignment = require('../models/assignment.model');
const Submission = require('../models/submission.model');
const Notification = require('../models/notification.model');
const Exam = require('../models/exam.model');

// Helper to verify child ownership
const verifyChild = async (parentId, studentId, tenantId) => {
    const student = await User.findOne({
        _id: studentId,
        'profile.parentIds': parentId,
        tenantId,
        role: 'student'
    });
    return student;
};

// @desc    Get all children for a parent
// @route   GET /api/parent/children
exports.getMyChildren = async (req, res) => {
    try {
        const children = await User.find({
            'profile.parentIds': req.user._id,
            tenantId: req.user.tenantId,
            role: 'student'
        }).select('firstName lastName email profile status');

        res.status(200).json({ success: true, count: children.length, data: children });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get child attendance
// @route   GET /api/parent/child/:studentId/attendance
exports.getChildAttendance = async (req, res) => {
    try {
        const { studentId } = req.params;
        const child = await verifyChild(req.user._id, studentId, req.user.tenantId);
        if (!child) return res.status(403).json({ message: 'Access denied. Child not linked to parent.' });

        const { startDate, endDate } = req.query;
        const filter = { student: studentId, tenantId: req.user.tenantId };

        if (startDate && endDate) {
            filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const attendance = await Attendance.find(filter).sort({ date: -1 });

        // Stats
        const total = attendance.length;
        const present = attendance.filter(a => a.status === 'present').length;
        const absent = attendance.filter(a => a.status === 'absent').length;

        res.status(200).json({
            success: true,
            data: {
                records: attendance,
                stats: {
                    total,
                    present,
                    absent,
                    percentage: total > 0 ? ((present / total) * 100).toFixed(1) : 0
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get child exam results
// @route   GET /api/parent/child/:studentId/marks
exports.getChildMarks = async (req, res) => {
    try {
        const { studentId } = req.params;
        const child = await verifyChild(req.user._id, studentId, req.user.tenantId);
        if (!child) return res.status(403).json({ message: 'Access denied. Child not linked to parent.' });

        const marks = await Mark.find({ student: studentId, tenantId: req.user.tenantId })
            .populate('subject', 'name code')
            .populate('exam', 'name term isApproved')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: marks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get child timetable
// @route   GET /api/parent/child/:studentId/timetable
exports.getChildTimetable = async (req, res) => {
    try {
        const { studentId } = req.params;
        const child = await verifyChild(req.user._id, studentId, req.user.tenantId);
        if (!child) return res.status(403).json({ message: 'Access denied. Child not linked to parent.' });

        const timetable = await Timetable.find({
            'class': child.profile.class,
            'section': child.profile.section, // If timetable uses section names
            tenantId: req.user.tenantId
        }).populate('teacher', 'firstName lastName')
            .populate('subject', 'name');

        // Wait, timetable usually uses Class ObjectId or Name. Let's check model.
        // Actually, many timetables filter by class name if stored that way.
        // Re-checking how Timetable filters.

        res.status(200).json({ success: true, data: timetable });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get notifications for parent (including child-specific alerts)
// @route   GET /api/parent/notifications
exports.getParentNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({
            recipient: req.user._id,
            tenantId: req.user.tenantId
        }).sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: notifications });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
