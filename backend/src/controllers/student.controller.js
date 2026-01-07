const User = require('../models/user.model');
const Timetable = require('../models/timetable.model');
const Class = require('../models/class.model');
const { logAction } = require('../utils/logger');
const generatePassword = require('../utils/generatePassword');

// @desc    Register a new student
// @route   POST /api/students
// @access  School Admin / Registrar
exports.createStudent = async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            password,
            profile,
            parentDetails, // Optional: { firstName, lastName, email, phone, relationship }
            parentRelationship // Optional: Father, Mother, Guardian, Other
        } = req.body;

        // Age Validation
        if (profile?.dob) {
            const birthDate = new Date(profile.dob);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }

            if (age < 3 || age > 25) {
                return res.status(400).json({ success: false, message: 'Student age must be between 3 and 25 years' });
            }
        }

        const generatedPassword = password || generatePassword();

        // A school admin should only create students for their own tenant
        const tenantId = req.user.tenantId;

        const studentExists = await User.findOne({ email });
        if (studentExists) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        let parentId = null;
        if (parentDetails && parentDetails.email) {
            let parent = await User.findOne({ email: parentDetails.email, tenantId, role: 'parent' });
            if (!parent) {
                parent = await User.create({
                    firstName: parentDetails.firstName,
                    lastName: parentDetails.lastName,
                    email: parentDetails.email,
                    password: 'parent123',
                    role: 'parent',
                    tenantId,
                    profile: { phone: parentDetails.phone }
                });
            }
            parentId = parent._id;
        }

        // Auto-generate Admission Number if blank
        let admissionNo = profile?.admissionNo;
        if (!admissionNo) {
            const studentCount = await User.countDocuments({ tenantId, role: 'student' });
            const year = new Date().getFullYear().toString().slice(-2);
            admissionNo = `${year}${String(studentCount + 1).padStart(4, '0')}`;
        }

        // Auto-generate Student ID if blank
        let studentId = profile?.studentId;
        if (!studentId) {
            const studentCount = await User.countDocuments({ tenantId, role: 'student' });
            const year = new Date().getFullYear();
            studentId = `STU-${year}-${String(studentCount + 1).padStart(4, '0')}`;
        }

        // Auto-generate Roll Number if blank
        let rollNo = profile?.rollNo;
        if (!rollNo && profile?.class) {
            const lastStudent = await User.findOne({
                tenantId,
                role: 'student',
                'profile.class': profile.class,
                'profile.section': profile.section
            }).sort({ 'profile.rollNo': -1 });

            if (lastStudent && lastStudent.profile.rollNo) {
                const lastRoll = parseInt(lastStudent.profile.rollNo);
                rollNo = !isNaN(lastRoll) ? (lastRoll + 1).toString() : "1";
            } else {
                rollNo = "1";
            }
        }

        const student = await User.create({
            firstName,
            lastName,
            email,
            password: generatedPassword,
            password_plain: generatedPassword,
            role: 'student',
            tenantId,
            profile: {
                ...profile,
                admissionNo: admissionNo,
                studentId: studentId,
                rollNo: rollNo || profile?.rollNo,
                parentIds: parentId ? [parentId] : [],
                parentRelationship: parentRelationship || parentDetails?.relationship || 'Guardian'
            }
        });

        await logAction({
            action: 'CREATE',
            module: 'USER',
            details: `Admitted student: ${firstName} ${lastName} (${student.profile.admissionNo})`,
            userId: req.user._id,
            tenantId
        });

        res.status(201).json({
            success: true,
            message: 'Student registered successfully',
            data: student,
            tempPassword: generatedPassword // Return the password so the admin can copy it
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all students for the current tenant
// @route   GET /api/students
// @access  Full Staff Access (within tenant)
exports.getStudents = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const role = req.user.role;
        const { sortBy, order = 'asc' } = req.query;

        let query = { tenantId, role: 'student' };

        // If teacher, find students only in the classes they teach or are in charge of
        if (role === 'teacher') {
            const [slots, assignedClasses, subjectClasses] = await Promise.all([
                Timetable.find({ teacher: req.user._id, tenantId }).populate('class'),
                Class.find({ classTeacher: req.user._id, tenantId }),
                Class.find({ 'subjects.teachers': req.user._id, tenantId })
            ]);

            const classNames = new Set([
                ...slots.map(s => s.class?.name),
                ...assignedClasses.map(c => c.name),
                ...subjectClasses.map(c => c.name)
            ]);

            const validClassNames = Array.from(classNames).filter(Boolean);

            if (validClassNames.length > 0) {
                query['profile.class'] = { $in: validClassNames };
            } else {
                return res.status(200).json({ success: true, count: 0, data: [] });
            }
        }

        // Support filtering by classId in query
        if (req.query.class) {
            const targetClass = await Class.findOne({ _id: req.query.class, tenantId });
            if (targetClass) {
                query['profile.class'] = targetClass.name;
                query['profile.section'] = targetClass.section;
            } else {
                // If classId is invalid or not in tenant
                return res.status(200).json({ success: true, count: 0, data: [] });
            }
        }

        // Sorting logic
        let sortQuery = { createdAt: -1 };
        if (sortBy) {
            const sortOrder = order === 'desc' ? -1 : 1;
            if (sortBy === 'name') {
                sortQuery = { firstName: sortOrder, lastName: sortOrder };
            } else if (sortBy === 'class') {
                sortQuery = { 'profile.class': sortOrder, 'profile.section': sortOrder };
            }
        }

        const students = await User.find(query).sort(sortQuery);

        res.status(200).json({
            success: true,
            count: students.length,
            data: students
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get student by ID
// @route   GET /api/students/:id
exports.getStudentById = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenantId;

        // Validation
        if (!id || id === 'undefined' || id === 'null') {
            return res.status(400).json({ success: false, message: 'Invalid Student ID' });
        }

        const student = await User.findOne({
            _id: id,
            tenantId: tenantId,
            role: 'student'
        }).populate('profile.parentIds', 'firstName lastName email profile.phone');

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found in this school'
            });
        }

        res.status(200).json({ success: true, data: student });
    } catch (error) {
        console.error('Error in getStudentById:', error);
        // If the error is a CastError (invalid ObjectId format)
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: `Invalid ID format: ${error.value}`
            });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update student
exports.updateStudent = async (req, res) => {
    try {
        let student = await User.findOne({
            _id: req.params.id,
            tenantId: req.user.tenantId,
            role: 'student'
        });

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Age Validation
        if (req.body.profile?.dob) {
            const birthDate = new Date(req.body.profile.dob);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }

            if (age < 3 || age > 25) {
                return res.status(400).json({ success: false, message: 'Student age must be between 3 and 25 years' });
            }
        }

        student = await User.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        await logAction({
            action: 'UPDATE',
            module: 'USER',
            details: `Updated student profile: ${student.firstName} ${student.lastName}`,
            userId: req.user._id,
            tenantId: req.user.tenantId
        });

        res.status(200).json({ success: true, data: student });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete student
exports.deleteStudent = async (req, res) => {
    try {
        const student = await User.findOne({
            _id: req.params.id,
            tenantId: req.user.tenantId,
            role: 'student'
        });

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        await User.deleteOne({ _id: req.params.id });

        await logAction({
            action: 'DELETE',
            module: 'USER',
            details: `Removed student: ${student.firstName} ${student.lastName}`,
            userId: req.user._id,
            tenantId: req.user.tenantId
        });

        res.status(200).json({ success: true, message: 'Student record deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Promote students to next class
// @route   POST /api/students/promote
exports.promoteStudents = async (req, res) => {
    try {
        const { studentIds, nextClass, nextSection } = req.body;
        const tenantId = req.user.tenantId;

        if (!studentIds || !Array.isArray(studentIds)) {
            return res.status(400).json({ message: 'Please provide an array of student IDs' });
        }

        const result = await User.updateMany(
            { _id: { $in: studentIds }, tenantId, role: 'student' },
            {
                $set: {
                    'profile.class': nextClass,
                    'profile.section': nextSection || 'A'
                }
            }
        );

        await logAction({
            action: 'UPDATE',
            module: 'USER',
            details: `Promoted ${result.modifiedCount} students to ${nextClass}`,
            userId: req.user._id,
            tenantId
        });

        res.status(200).json({
            success: true,
            message: `Successfully promoted ${result.modifiedCount} students`,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all children for a parent
// @route   GET /api/students/my-children
exports.getChildren = async (req, res) => {
    try {
        const children = await User.find({
            'profile.parentIds': req.user._id,
            tenantId: req.user.tenantId,
            role: 'student'
        });
        res.status(200).json({ success: true, data: children });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Bulk Import Students
// @route   POST /api/students/bulk-import
exports.bulkImportStudents = async (req, res) => {
    try {
        const { students } = req.body; // Array of student objects
        const tenantId = req.user.tenantId;

        if (!students || !Array.isArray(students)) {
            return res.status(400).json({ message: 'Invalid data format. Expected an array of students.' });
        }

        const importResults = [];
        for (const s of students) {
            try {
                const generatedPassword = s.password || generatePassword();

                // Basic validation
                if (!s.firstName || !s.lastName || !s.email) {
                    importResults.push({ email: s.email, status: 'failed', reason: 'Missing required fields' });
                    continue;
                }

                const exists = await User.findOne({ email: s.email });
                if (exists) {
                    importResults.push({ email: s.email, status: 'failed', reason: 'Email already exists' });
                    continue;
                }

                // Age Validation
                if (s.dob) {
                    const birthDate = new Date(s.dob);
                    const today = new Date();
                    let age = today.getFullYear() - birthDate.getFullYear();
                    const m = today.getMonth() - birthDate.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                        age--;
                    }

                    if (age < 3 || age > 25) {
                        importResults.push({ email: s.email, status: 'failed', reason: 'Student age must be between 3 and 25 years' });
                        continue;
                    }
                }

                const studentCount = await User.countDocuments({ tenantId, role: 'student' });
                const year = new Date().getFullYear();
                const admissionYearStr = year.toString().slice(-2);
                const admissionNo = s.admissionNo || `${admissionYearStr}${String(studentCount + 1).padStart(4, '0')}`;
                const studentId = s.studentId || `STU-${year}-${String(studentCount + 1).padStart(4, '0')}`;

                await User.create({
                    firstName: s.firstName,
                    lastName: s.lastName,
                    email: s.email,
                    password: generatedPassword,
                    password_plain: generatedPassword,
                    role: 'student',
                    tenantId,
                    profile: {
                        admissionNo,
                        studentId,
                        class: s.class,
                        section: s.section || 'A',
                        gender: s.gender || 'male',
                        phone: s.phone
                    }
                });
                importResults.push({ email: s.email, status: 'success' });
            } catch (err) {
                importResults.push({ email: s.email, status: 'failed', reason: err.message });
            }
        }

        await logAction({
            action: 'CREATE',
            module: 'USER',
            details: `Bulk imported ${importResults.filter(r => r.status === 'success').length} students`,
            userId: req.user._id,
            tenantId
        });

        res.status(200).json({
            success: true,
            results: importResults,
            summary: {
                total: students.length,
                success: importResults.filter(r => r.status === 'success').length,
                failed: importResults.filter(r => r.status === 'failed').length
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Reset student password
// @route   POST /api/students/:id/reset-password
// @access  School Admin / Receptionist
exports.resetStudentPassword = async (req, res) => {
    try {
        const student = await User.findOne({
            _id: req.params.id,
            tenantId: req.user.tenantId,
            role: 'student'
        });

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const newPassword = generatePassword();

        student.password = newPassword;
        student.password_plain = newPassword;
        await student.save();

        await logAction({
            action: 'UPDATE',
            module: 'USER',
            details: `Reset password for student: ${student.firstName} ${student.lastName}`,
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
