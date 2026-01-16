const Class = require('../models/class.model');
const Timetable = require('../models/timetable.model');
const { logAction } = require('../utils/logger');

// @desc    Create a new class
// @route   POST /api/classes
exports.createClass = async (req, res) => {
    try {
        const { name, section, room, classTeacher, gradeLevel, grade } = req.body;
        const tenantId = req.user.tenantId;

        // Check if class already exists in this tenant
        const classExists = await Class.findOne({ name, section, tenantId });
        if (classExists) {
            return res.status(400).json({ message: 'Class with this section already exists' });
        }

        const newClass = await Class.create({
            name,
            section,
            gradeLevel,
            grade,
            room,
            classTeacher,
            tenantId,
            subjects: req.body.subjects || []
        });

        await logAction({
            action: 'CREATE',
            module: 'CLASS',
            details: `Created class: ${name} - ${section} (${grade})`,
            userId: req.user._id,
            tenantId
        });

        res.status(201).json({ success: true, data: newClass });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all classes for current tenant
// @route   GET /api/classes
exports.getClasses = async (req, res) => {
    try {
        const query = { tenantId: req.user.tenantId };
        const role = req.user.role;

        // If user is a teacher, return classes where they are class teacher OR teach a subject
        if (role === 'teacher') {
            const slots = await Timetable.find({ teacher: req.user._id, tenantId: req.user.tenantId });
            const classIdsFromTimetable = slots.map(s => s.class.toString());

            query.$or = [
                { classTeacher: req.user._id },
                { 'subjects.teachers': req.user._id },
                { _id: { $in: classIdsFromTimetable } }
            ];
        } else if (role === 'student') {
            // Students only see their current class
            if (req.user.profile?.class) {
                query.name = req.user.profile.class;
                if (req.user.profile.section) {
                    query.section = req.user.profile.section;
                }
            } else {
                return res.status(200).json({ success: true, count: 0, data: [] });
            }
        } else if (role === 'parent') {
            // Parents see classes of all their children
            const children = await User.find({
                'profile.parentIds': req.user._id,
                tenantId: req.user.tenantId,
                role: 'student'
            });

            if (children.length > 0) {
                const classFilters = children.map(c => ({
                    name: c.profile.class,
                    section: c.profile.section
                })).filter(f => f.name);

                if (classFilters.length > 0) {
                    query.$or = classFilters;
                } else {
                    return res.status(200).json({ success: true, count: 0, data: [] });
                }
            } else {
                return res.status(200).json({ success: true, count: 0, data: [] });
            }
        }

        const classes = await Class.find(query)
            .populate('classTeacher', 'firstName lastName email')
            .populate('subjects.subject', 'name code')
            .populate('subjects.teachers', 'firstName lastName')
            .sort({ name: 1, section: 1 });

        res.status(200).json({ success: true, count: classes.length, data: classes });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single class by ID
// @route   GET /api/classes/:id
exports.getClass = async (req, res) => {
    try {
        const academicClass = await Class.findOne({ _id: req.params.id, tenantId: req.user.tenantId })
            .populate('classTeacher', 'firstName lastName email')
            .populate('subjects.subject', 'name code')
            .populate('subjects.teachers', 'firstName lastName');

        if (!academicClass) {
            return res.status(404).json({ success: false, message: 'Class not found' });
        }

        res.status(200).json({ success: true, data: academicClass });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update class
// @route   PUT /api/classes/:id
exports.updateClass = async (req, res) => {
    try {
        let academicClass = await Class.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!academicClass) return res.status(404).json({ message: 'Class not found' });

        academicClass = await Class.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        await logAction({
            action: 'UPDATE',
            module: 'CLASS',
            details: `Updated class: ${academicClass.name} - ${academicClass.section}`,
            userId: req.user._id,
            tenantId: req.user.tenantId
        });

        res.status(200).json({ success: true, data: academicClass });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete class
// @route   DELETE /api/classes/:id
exports.deleteClass = async (req, res) => {
    try {
        const academicClass = await Class.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!academicClass) return res.status(404).json({ message: 'Class not found' });

        await Class.deleteOne({ _id: req.params.id });

        await logAction({
            action: 'DELETE',
            module: 'CLASS',
            details: `Deleted class: ${academicClass.name} - ${academicClass.section}`,
            userId: req.user._id,
            tenantId: req.user.tenantId
        });

        res.status(200).json({ success: true, message: 'Class deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
