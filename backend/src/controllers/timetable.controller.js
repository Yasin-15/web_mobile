const Timetable = require('../models/timetable.model');
const User = require('../models/user.model');
const Subject = require('../models/subject.model');
const Class = require('../models/class.model');
const { logAction } = require('../utils/logger');


// @desc    Validate a slot for conflicts without saving
// @route   POST /api/timetable/validate
exports.validateTimetableSlot = async (req, res) => {
    try {
        const { classId, teacherId, day, startTime, endTime, room, excludedId } = req.body;
        const tenantId = req.user.tenantId;

        const conflicts = [];

        // 1. Teacher Conflict
        const teacherConflict = await Timetable.findOne({
            tenantId,
            teacher: teacherId,
            day,
            _id: { $ne: excludedId },
            $or: [
                { startTime: { $lt: endTime, $gte: startTime } },
                { endTime: { $gt: startTime, $lte: endTime } },
                { startTime: { $lte: startTime }, endTime: { $gte: endTime } }
            ]
        }).populate('teacher', 'firstName lastName').populate('class', 'name section');

        if (teacherConflict) {
            conflicts.push(`Teacher conflict: ${teacherConflict.teacher.firstName} is already teaching Class ${teacherConflict.class.name}-${teacherConflict.class.section} during this time.`);
        }

        // 2. Class Conflict
        const classConflict = await Timetable.findOne({
            tenantId,
            class: classId,
            day,
            _id: { $ne: excludedId },
            $or: [
                { startTime: { $lt: endTime, $gte: startTime } },
                { endTime: { $gt: startTime, $lte: endTime } },
                { startTime: { $lte: startTime }, endTime: { $gte: endTime } }
            ]
        }).populate('subject', 'name');

        if (classConflict) {
            conflicts.push(`Class conflict: This class already has ${classConflict.subject.name} scheduled during this time.`);
        }

        // 3. Room Conflict
        if (room) {
            const roomConflict = await Timetable.findOne({
                tenantId,
                room,
                day,
                _id: { $ne: excludedId },
                $or: [
                    { startTime: { $lt: endTime, $gte: startTime } },
                    { endTime: { $gt: startTime, $lte: endTime } },
                    { startTime: { $lte: startTime }, endTime: { $gte: endTime } }
                ]
            }).populate('class', 'name section');

            if (roomConflict) {
                conflicts.push(`Room conflict: ${room} is occupied by Class ${roomConflict.class.name}-${roomConflict.class.section}.`);
            }
        }

        // 4. Resource Optimization: Check teacher's total weekly load
        const teacherSlots = await Timetable.find({ teacher: teacherId, tenantId });
        let totalMinutes = 0;
        teacherSlots.forEach(s => {
            const start = s.startTime.split(':').map(Number);
            const end = s.endTime.split(':').map(Number);
            totalMinutes += (end[0] * 60 + end[1]) - (start[0] * 60 + start[1]);
        });
        const currentWorkload = (totalMinutes / 60).toFixed(1);

        res.status(200).json({
            success: true,
            isValid: conflicts.length === 0,
            conflicts,
            teacherWorkload: currentWorkload
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Add a slot to the timetable
// @route   POST /api/timetable
exports.addTimetableSlot = async (req, res) => {
    try {
        const { classId, subjectId, teacherId, day, startTime, endTime, room } = req.body;
        const tenantId = req.user.tenantId;

        // Perform validation
        const teacherConflict = await Timetable.findOne({
            tenantId,
            teacher: teacherId,
            day,
            $or: [
                { startTime: { $lt: endTime, $gte: startTime } },
                { endTime: { $gt: startTime, $lte: endTime } },
                { startTime: { $lte: startTime }, endTime: { $gte: endTime } }
            ]
        }).populate('teacher', 'firstName lastName');

        if (teacherConflict) {
            return res.status(400).json({
                message: `Instructor conflict: ${teacherConflict.teacher.firstName} ${teacherConflict.teacher.lastName} is already scheduled elsewhere during this window.`
            });
        }

        const classConflict = await Timetable.findOne({
            tenantId,
            class: classId,
            day,
            $or: [
                { startTime: { $lt: endTime, $gte: startTime } },
                { endTime: { $gt: startTime, $lte: endTime } },
                { startTime: { $lte: startTime }, endTime: { $gte: endTime } }
            ]
        });

        if (classConflict) {
            return res.status(400).json({ message: 'Class conflict: This group already has a session scheduled during this time window.' });
        }

        if (room) {
            const roomConflict = await Timetable.findOne({
                tenantId,
                room,
                day,
                $or: [
                    { startTime: { $lt: endTime, $gte: startTime } },
                    { endTime: { $gt: startTime, $lte: endTime } },
                    { startTime: { $lte: startTime }, endTime: { $gte: endTime } }
                ]
            });
            if (roomConflict) return res.status(400).json({ message: `Room conflict: Facility ${room} is occupied at this time.` });
        }

        const slot = await Timetable.create({
            class: classId,
            subject: subjectId,
            teacher: teacherId,
            day,
            startTime,
            endTime,
            room,
            tenantId
        });

        await logAction({
            action: 'CREATE',
            module: 'TIMETABLE',
            details: `Scheduled ${day} ${startTime}-${endTime} for class ${classId}`,
            userId: req.user._id,
            tenantId
        });

        res.status(201).json({ success: true, data: slot });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get timetable for a class
// @route   GET /api/timetable/class/:classId
exports.getClassTimetable = async (req, res) => {
    try {
        const slots = await Timetable.find({
            class: req.params.classId,
            tenantId: req.user.tenantId
        })
            .populate('subject', 'name code')
            .populate('teacher', 'firstName lastName')
            .sort({ day: 1, startTime: 1 });

        res.status(200).json({ success: true, data: slots });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get timetable for current student
// @route   GET /api/timetable/student/me
exports.getStudentTimetable = async (req, res) => {
    try {
        const student = await User.findById(req.user._id);
        if (!student || student.role !== 'student') {
            return res.status(403).json({ message: 'Only students can access this route' });
        }

        const className = student.profile.class;
        const section = student.profile.section;

        if (!className) {
            return res.status(400).json({ message: 'Student is not assigned to a class' });
        }

        // Find the class object to get its ID
        const targetClass = await Class.findOne({
            name: className,
            section: section || 'A',
            tenantId: req.user.tenantId
        });

        if (!targetClass) {
            return res.status(404).json({ message: 'Class record not found' });
        }

        const slots = await Timetable.find({
            class: targetClass._id,
            tenantId: req.user.tenantId
        })
            .populate('subject', 'name code')
            .populate('teacher', 'firstName lastName')
            .sort({ day: 1, startTime: 1 });

        res.status(200).json({ success: true, data: slots });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get timetable for current teacher
// @route   GET /api/timetable/teacher/me
exports.getTeacherTimetable = async (req, res) => {
    try {
        const slots = await Timetable.find({
            teacher: req.user._id,
            tenantId: req.user.tenantId
        })
            .populate('subject', 'name code')
            .populate('class', 'name section')
            .sort({ day: 1, startTime: 1 });

        res.status(200).json({ success: true, data: slots });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete a timetable slot
exports.deleteTimetableSlot = async (req, res) => {
    try {
        const slot = await Timetable.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!slot) return res.status(404).json({ message: 'Slot not found' });

        await Timetable.deleteOne({ _id: req.params.id });

        await logAction({
            action: 'DELETE',
            module: 'TIMETABLE',
            details: `Removed timetable slot: ${slot.day} ${slot.startTime}`,
            userId: req.user._id,
            tenantId: req.user.tenantId
        });

        res.status(200).json({ success: true, message: 'Slot removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get teacher workload (hours per week)
// @route   GET /api/timetable/teacher/workload
exports.getTeacherWorkload = async (req, res) => {
    try {
        const slots = await Timetable.find({
            teacher: req.user._id,
            tenantId: req.user.tenantId
        });

        // Calculate total hours
        let totalMinutes = 0;
        slots.forEach(slot => {
            const start = slot.startTime.split(':').map(Number);
            const end = slot.endTime.split(':').map(Number);
            totalMinutes += (end[0] * 60 + end[1]) - (start[0] * 60 + start[1]);
        });

        const totalHours = (totalMinutes / 60).toFixed(2);

        res.status(200).json({
            success: true,
            data: {
                totalHours,
                totalSlots: slots.length
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Bulk update timetable for a class
// @route   POST /api/timetable/bulk
exports.bulkUpdateClassTimetable = async (req, res) => {
    try {
        const { classId, slots } = req.body;
        const tenantId = req.user.tenantId;

        if (!classId || !Array.isArray(slots)) {
            return res.status(400).json({ message: 'Invalid data provided' });
        }

        // 1. Clear existing timetable for this class
        // Note: This is a destructive operation for the class's schedule. 
        // We assume the frontend sends the *complete* schedule state.
        await Timetable.deleteMany({ class: classId, tenantId });

        // 2. Prepare new slots
        const newSlots = slots.map(slot => ({
            class: classId,
            subject: slot.subjectId,
            teacher: slot.teacherId,
            day: slot.day,
            startTime: slot.startTime,
            endTime: slot.endTime,
            room: slot.room, // Optional
            tenantId
        }));

        // 3. Insert new slots
        if (newSlots.length > 0) {
            await Timetable.insertMany(newSlots);
        }

        await logAction({
            action: 'UPDATE',
            module: 'TIMETABLE',
            details: `Bulk updated timetable for class ${classId} (${newSlots.length} slots)`,
            userId: req.user._id,
            tenantId
        });

        res.status(200).json({ success: true, message: 'Timetable updated successfully', count: newSlots.length });
    } catch (error) {
        console.error("Bulk update error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all timetable slots for current tenant
// @route   GET /api/timetable
exports.getAllTimetable = async (req, res) => {
    try {
        const slots = await Timetable.find({ tenantId: req.user.tenantId })
            .populate('subject', 'name')
            .populate('teacher', 'firstName lastName')
            .populate('class', 'name section');
        res.status(200).json({ success: true, data: slots });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
