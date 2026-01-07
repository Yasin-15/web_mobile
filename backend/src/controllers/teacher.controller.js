const User = require('../models/user.model');
const { logAction } = require('../utils/logger');
const generatePassword = require('../utils/generatePassword');

// @desc    Register a new teacher
// @route   POST /api/teachers
exports.createTeacher = async (req, res) => {
    try {
        const { firstName, lastName, email, password, profile } = req.body;
        const tenantId = req.user.tenantId;

        const teacherExists = await User.findOne({ email });
        if (teacherExists) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        const generatedPassword = password || generatePassword();

        const teacher = await User.create({
            firstName,
            lastName,
            email,
            password: generatedPassword,
            password_plain: generatedPassword,
            role: 'teacher',
            tenantId,
            profile: {
                ...profile,
                designation: profile?.designation || 'Teacher'
            }
        });

        await logAction({
            action: 'CREATE',
            module: 'USER',
            details: `Recruited teacher: ${firstName} ${lastName}`,
            userId: req.user._id,
            tenantId
        });

        res.status(201).json({
            success: true,
            message: 'Teacher recruited successfully',
            data: teacher,
            tempPassword: generatedPassword
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all teachers for the tenant
// @route   GET /api/teachers
exports.getTeachers = async (req, res) => {
    try {
        const teachers = await User.find({
            tenantId: req.user.tenantId,
            role: 'teacher'
        }).sort({ createdAt: -1 });

        res.status(200).json({ success: true, count: teachers.length, data: teachers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get teacher by ID
exports.getTeacherById = async (req, res) => {
    try {
        const teacher = await User.findOne({
            _id: req.params.id,
            tenantId: req.user.tenantId,
            role: 'teacher'
        });

        if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
        res.status(200).json({ success: true, data: teacher });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update teacher
exports.updateTeacher = async (req, res) => {
    try {
        let teacher = await User.findOne({
            _id: req.params.id,
            tenantId: req.user.tenantId,
            role: 'teacher'
        });

        if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

        teacher = await User.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        await logAction({
            action: 'UPDATE',
            module: 'USER',
            details: `Updated teacher profile: ${teacher.firstName} ${teacher.lastName}`,
            userId: req.user._id,
            tenantId: req.user.tenantId
        });

        res.status(200).json({ success: true, data: teacher });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete teacher
exports.deleteTeacher = async (req, res) => {
    try {
        const teacher = await User.findOne({
            _id: req.params.id,
            tenantId: req.user.tenantId,
            role: 'teacher'
        });

        if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

        await User.deleteOne({ _id: req.params.id });

        await logAction({
            action: 'DELETE',
            module: 'USER',
            details: `Removed teacher record: ${teacher.firstName} ${teacher.lastName}`,
            userId: req.user._id,
            tenantId: req.user.tenantId
        });

        res.status(200).json({ success: true, message: 'Teacher record deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Reset teacher password
// @route   POST /api/teachers/:id/reset-password
// @access  School Admin / Receptionist
exports.resetTeacherPassword = async (req, res) => {
    try {
        const teacher = await User.findOne({
            _id: req.params.id,
            tenantId: req.user.tenantId,
            role: 'teacher'
        });

        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        const newPassword = generatePassword();

        teacher.password = newPassword;
        teacher.password_plain = newPassword;
        await teacher.save();

        await logAction({
            action: 'UPDATE',
            module: 'USER',
            details: `Reset password for teacher: ${teacher.firstName} ${teacher.lastName}`,
            userId: req.user._id,
            tenantId: req.user.tenantId
        });

        res.status(200).json({
            success: true,
            message: 'Password reset successfully',
            password: newPassword
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
