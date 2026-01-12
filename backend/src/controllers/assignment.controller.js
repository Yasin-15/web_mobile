const Assignment = require('../models/assignment.model');
const Submission = require('../models/submission.model');
const User = require('../models/user.model');
const Class = require('../models/class.model');

// @desc    Create a new assignment
// @route   POST /api/assignments
exports.createAssignment = async (req, res) => {
    try {
        const { title, description, classId, subjectId, dueDate } = req.body;

        const assignment = await Assignment.create({
            tenantId: req.user.tenantId,
            title,
            description,
            class: classId,
            subject: subjectId,
            teacher: req.user._id, // Assumes user is teacher
            dueDate: new Date(dueDate)
        });

        res.status(201).json({ success: true, data: assignment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get assignments
// @route   GET /api/assignments
exports.getAssignments = async (req, res) => {
    try {
        const query = { tenantId: req.user.tenantId };

        // If teacher, see assignments they created
        if (req.user.role === 'teacher') {
            query.teacher = req.user._id;
        }
        // If student, see assignments for their class
        else if (req.user.role === 'student') {
            // Find student's class first
            const student = await User.findOne({ _id: req.user._id });
            if (!student) return res.status(404).json({ message: 'Student not found' });

            const studentClassStr = student.profile?.class;
            const studentSectionStr = student.profile?.section;

            if (studentClassStr) {
                // Find class ID
                const classObj = await Class.findOne({
                    name: studentClassStr,
                    section: studentSectionStr,
                    tenantId: req.user.tenantId
                });

                if (classObj) {
                    query.class = classObj._id;
                } else {
                    return res.status(200).json({ success: true, count: 0, data: [] });
                }
            } else {
                return res.status(200).json({ success: true, count: 0, data: [] });
            }
        }

        const assignments = await Assignment.find(query)
            .populate('class', 'name section')
            .populate('subject', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, count: assignments.length, data: assignments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Submit assignment
// @route   POST /api/assignments/:id/submit
exports.submitAssignment = async (req, res) => {
    try {
        const { content, status } = req.body; // status can be 'draft' or 'submitted'
        const filePath = req.file ? req.file.path : req.body.filePath;

        // Check assignment deadline
        const assignment = await Assignment.findById(req.params.id);
        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        // Check deadline / closed status
        if (new Date() > new Date(assignment.dueDate) || assignment.status === 'closed') {
            return res.status(400).json({
                success: false,
                message: 'Assignment deadline has passed or is closed. Modifications are not allowed.'
            });
        }

        // Check for existing submission
        let submission = await Submission.findOne({
            assignment: req.params.id,
            student: req.user._id,
            tenantId: req.user.tenantId
        });

        const submissionData = {
            content,
            filePath,
            status: status || 'submitted',
            submittedAt: new Date()
        };

        if (submission) {
            // Update existing
            submission = await Submission.findByIdAndUpdate(
                submission._id,
                submissionData,
                { new: true }
            );
        } else {
            // Create new
            submission = await Submission.create({
                tenantId: req.user.tenantId,
                assignment: req.params.id,
                student: req.user._id,
                ...submissionData
            });
        }

        res.status(submission ? 200 : 201).json({ success: true, data: submission });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete assignment
// @route   DELETE /api/assignments/:id
exports.deleteAssignment = async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id);

        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        // Verify ownership or permission (Teacher check is done by middleware generally, but ownership is good practice)
        // For now, assuming any teacher can delete if they have permission, but strict req says "Draft Assignment Deletion"

        if (assignment.status !== 'draft') {
            return res.status(400).json({
                success: false,
                message: 'Only draft assignments can be deleted'
            });
        }

        await assignment.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get submissions for an assignment
// @route   GET /api/assignments/:id/submissions
exports.getSubmissions = async (req, res) => {
    try {
        const query = {
            assignment: req.params.id,
            tenantId: req.user.tenantId
        };

        // If student, only see own submission
        if (req.user.role === 'student') {
            query.student = req.user._id;
        }

        const submissions = await Submission.find(query)
            .populate('student', 'firstName lastName')
            .sort({ submittedAt: 1 });

        res.status(200).json({ success: true, count: submissions.length, data: submissions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Grade submission
// @route   POST /api/assignments/submissions/:id/grade
exports.gradeSubmission = async (req, res) => {
    try {
        const { grade, feedback } = req.body;

        const submission = await Submission.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.user.tenantId },
            {
                grade,
                feedback,
                status: 'graded'
            },
            { new: true }
        );

        res.status(200).json({ success: true, data: submission });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
