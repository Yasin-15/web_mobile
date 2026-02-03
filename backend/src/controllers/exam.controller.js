const Exam = require('../models/exam.model');
const Mark = require('../models/mark.model');
const Timetable = require('../models/timetable.model');
const GradeSystem = require('../models/gradeSystem.model');
const ExamComplaint = require('../models/examComplaint.model');
const Subject = require('../models/subject.model');
const User = require('../models/user.model');
const Tenant = require('../models/tenant.model');
const Class = require('../models/class.model');
const { logAction } = require('../utils/logger');
const { generateExcelMatrix, generateReportCardPDF } = require('../utils/reportGenerator');
const { emitToTenant } = require('../config/socket');

// @desc    Create a new exam
// @route   POST /api/exams
exports.createExam = async (req, res) => {
    try {
        const exam = await Exam.create({
            ...req.body,
            tenantId: req.user.tenantId
        });

        await logAction({
            action: 'CREATE',
            module: 'EXAM',
            details: `Created exam: ${exam.name}`,
            userId: req.user._id,
            tenantId: req.user.tenantId
        });

        // Emit Socket Event
        emitToTenant(req.user.tenantId, 'exam:created', exam);

        res.status(201).json({ success: true, data: exam });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all exams for tenant
// @route   GET /api/exams
exports.getExams = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const exams = await Exam.find({ tenantId })
            .populate('classes', 'name section')
            .sort({ startDate: -1 });
        res.status(200).json({ success: true, count: exams.length, data: exams });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update exam
exports.updateExam = async (req, res) => {
    try {
        const exam = await Exam.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.user.tenantId },
            req.body,
            { new: true, runValidators: true }
        );
        if (!exam) return res.status(404).json({ message: 'Exam not found' });

        // Emit Socket Event
        emitToTenant(req.user.tenantId, 'exam:updated', exam);

        res.status(200).json({ success: true, data: exam });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Marking system - Bulk upload marks
// @route   POST /api/marks/bulk
exports.bulkMarkEntry = async (req, res) => {
    try {
        const { examId, subjectId, classId, marks, maxMarks: globalMaxMarks } = req.body;
        const tenantId = req.user.tenantId;

        if (!examId || !subjectId || !classId || !marks) {
            return res.status(400).json({ success: false, message: 'Missing required fields: examId, subjectId, classId, and marks are required.' });
        }

        // Check if exam exists and is approved
        const exam = await Exam.findOne({ _id: examId, tenantId });
        if (!exam) return res.status(404).json({ message: 'Exam not found' });

        // if (exam.isApproved && req.user.role !== 'school-admin') {
        //     return res.status(400).json({ success: false, message: 'Marks are locked for this exam as it has been approved. Contact admin to revert approval.' });
        // }

        // Authority Check for teachers
        if (req.user.role === 'teacher') {
            const [isAssigned, isClassTeacher] = await Promise.all([
                Timetable.findOne({ teacher: req.user._id, class: classId, subject: subjectId, tenantId }),
                Class.findOne({ _id: classId, classTeacher: req.user._id, tenantId })
            ]);

            if (!isAssigned && !isClassTeacher) {
                return res.status(403).json({ success: false, message: 'Access denied. You are not assigned to this class and subject.' });
            }
        }

        const filteredMarks = marks.filter(m => m.studentId && m.score !== undefined && m.score !== null && m.score !== '');

        if (filteredMarks.length === 0) {
            return res.status(200).json({ success: true, message: 'No valid marks provided to update.' });
        }

        // Validation: Check if any marks exceed max marks
        const { validateMarkEntry } = require('../utils/validation');
        for (const m of filteredMarks) {
            const marksObtained = String(m.score);
            const mMax = Number(m.maxMarks) || Number(globalMaxMarks) || 100;

            const validation = validateMarkEntry(marksObtained, mMax);
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid marks for student ${m.studentId}: ${validation.message}`
                });
            }
        }

        // Fetch active grade system to calculate grades
        const gradeSystem = await GradeSystem.findOne({ tenantId, isActive: true });
        const gradeConfigs = gradeSystem ? gradeSystem.grades : [];

        const bulkOps = filteredMarks.map(m => {
            const marksObtained = Number(m.score);
            const mMax = Number(m.maxMarks) || Number(globalMaxMarks) || 100;
            const percentage = (marksObtained / mMax) * 100;

            // Calculate grade, gpa, and remarks
            let grade = null;
            let gpa = null;
            let gradeRemarks = null;

            if (gradeConfigs.length > 0) {
                const gradeInfo = gradeConfigs.find(
                    g => percentage >= g.minPercentage && percentage <= g.maxPercentage
                );
                if (gradeInfo) {
                    grade = gradeInfo.grade;
                    gpa = gradeInfo.gpa;
                    gradeRemarks = gradeInfo.remarks;
                }
            }

            return {
                updateOne: {
                    filter: { student: m.studentId, exam: examId, subject: subjectId, tenantId },
                    update: {
                        $set: {
                            marksObtained,
                            maxMarks: mMax,
                            remarks: m.remarks || '',
                            grade,
                            gpa,
                            gradeRemarks,
                            class: classId,
                            gradedBy: req.user._id
                        }
                    },
                    upsert: true
                }
            };
        });

        await Mark.bulkWrite(bulkOps);

        await logAction({
            action: 'UPDATE',
            module: 'MARK',
            details: `Entered marks for Exam ${examId}, Subject ${subjectId}`,
            userId: req.user._id,
            tenantId
        });

        // Emit Socket Event
        emitToTenant(tenantId, 'marks:updated', { examId, subjectId, classId });

        res.status(200).json({ success: true, message: 'Marks updated successfully' });
    } catch (error) {
        console.error('Bulk Mark Entry Error:', error);
        if (error.name === 'ValidationError' || error.name === 'CastError') {
            return res.status(400).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'Internal server error while saving marks' });
    }
};

// @desc    Delete a single mark entry
// @route   DELETE /api/exams/marks/:markId
exports.deleteMark = async (req, res) => {
    try {
        const { markId } = req.params;
        const tenantId = req.user.tenantId;

        const mark = await Mark.findOne({ _id: markId, tenantId });

        if (!mark) {
            return res.status(404).json({ success: false, message: 'Mark not found' });
        }

        // Check if exam is approved
        const exam = await Exam.findOne({ _id: mark.exam, tenantId });
        // if (exam && exam.isApproved && req.user.role !== 'school-admin') {
        //     return res.status(400).json({
        //         success: false,
        //         message: 'Cannot delete marks for approved exams. Contact admin to revert approval.'
        //     });
        // }

        // Authority Check for teachers
        if (req.user.role === 'teacher') {
            const [isAssigned, isClassTeacher] = await Promise.all([
                Timetable.findOne({ teacher: req.user._id, class: mark.class, subject: mark.subject, tenantId }),
                Class.findOne({ _id: mark.class, classTeacher: req.user._id, tenantId })
            ]);

            if (!isAssigned && !isClassTeacher) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You are not assigned to this class and subject.'
                });
            }
        }

        await Mark.findByIdAndDelete(markId);

        await logAction({
            action: 'DELETE',
            module: 'MARK',
            details: `Deleted mark for student ${mark.student}`,
            userId: req.user._id,
            tenantId
        });

        // Emit Socket Event
        emitToTenant(tenantId, 'mark:deleted', { markId, studentId: mark.student, examId: mark.exam });

        res.status(200).json({ success: true, message: 'Mark deleted successfully' });
    } catch (error) {
        console.error('Delete Mark Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error while deleting mark' });
    }
};

// @desc    Bulk delete marks
// @route   DELETE /api/exams/marks/bulk
exports.bulkDeleteMarks = async (req, res) => {
    try {
        const { examId, subjectId, classId, studentIds } = req.body;
        const tenantId = req.user.tenantId;

        if (!examId || !subjectId || !classId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: examId, subjectId, and classId are required.'
            });
        }

        // Check if exam is approved
        const exam = await Exam.findOne({ _id: examId, tenantId });
        if (!exam) {
            return res.status(404).json({ message: 'Exam not found' });
        }

        // if (exam.isApproved && req.user.role !== 'school-admin') {
        //     return res.status(400).json({
        //         success: false,
        //         message: 'Cannot delete marks for approved exams. Contact admin to revert approval.'
        //     });
        // }

        // Authority Check for teachers
        if (req.user.role === 'teacher') {
            const [isAssigned, isClassTeacher] = await Promise.all([
                Timetable.findOne({ teacher: req.user._id, class: classId, subject: subjectId, tenantId }),
                Class.findOne({ _id: classId, classTeacher: req.user._id, tenantId })
            ]);

            if (!isAssigned && !isClassTeacher) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You are not assigned to this class and subject.'
                });
            }
        }

        const deleteQuery = {
            exam: examId,
            subject: subjectId,
            class: classId,
            tenantId
        };

        // If specific students are provided, delete only those
        if (studentIds && studentIds.length > 0) {
            deleteQuery.student = { $in: studentIds };
        }

        const result = await Mark.deleteMany(deleteQuery);

        await logAction({
            action: 'DELETE',
            module: 'MARK',
            details: `Bulk deleted ${result.deletedCount} marks for Exam ${examId}, Subject ${subjectId}`,
            userId: req.user._id,
            tenantId
        });

        // Emit Socket Event
        emitToTenant(tenantId, 'marks:bulk-deleted', { examId, subjectId, classId, deletedCount: result.deletedCount });

        res.status(200).json({
            success: true,
            message: `Successfully deleted ${result.deletedCount} mark(s)`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Bulk Delete Marks Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error while deleting marks' });
    }
};

// @desc    Get marks for a class/subject/exam
exports.getMarks = async (req, res) => {
    try {
        const { examId, subjectId, classId, studentId } = req.query;
        const query = { tenantId: req.user.tenantId };

        if (examId) query.exam = examId;
        if (subjectId) query.subject = subjectId;
        if (classId) query.class = classId;

        // Security & Filter: Students can only see their own marks
        if (req.user.role === 'student') {
            query.student = req.user._id;
        } else if (studentId) {
            query.student = studentId;
        }

        const marks = await Mark.find(query)
            .populate('student', 'firstName lastName profile.rollNo')
            .populate('subject', 'name code')
            .populate('exam', 'name term isApproved startDate endDate');

        res.status(200).json({ success: true, data: marks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const calculateGrade = (percentage, gradeConfigs) => {
    if (!gradeConfigs || gradeConfigs.length === 0) {
        // Fallback
        if (percentage >= 90) return { grade: 'A+', gpa: 4.0 };
        if (percentage >= 80) return { grade: 'A', gpa: 3.7 };
        if (percentage >= 70) return { grade: 'B', gpa: 3.0 };
        if (percentage >= 60) return { grade: 'C', gpa: 2.0 };
        if (percentage >= 50) return { grade: 'D', gpa: 1.0 };
        return { grade: 'F', gpa: 0.0 };
    }
    const config = gradeConfigs.find(g => percentage >= g.minPercentage && percentage <= g.maxPercentage);
    return config ? { grade: config.grade, gpa: config.gpa } : { grade: 'F', gpa: 0.0 };
};

// @desc    Generate Student Report Card data
// @route   GET /api/exams/report/:examId/:studentId
exports.getStudentReport = async (req, res) => {
    try {
        const { examId, studentId } = req.params;
        const tenantId = req.user.tenantId;

        const [exam, marks, gradeSystem] = await Promise.all([
            Exam.findOne({ _id: examId, tenantId }),
            Mark.find({ student: studentId, exam: examId, tenantId })
                .populate('subject', 'name code')
                .populate('student', 'firstName lastName profile.rollNo')
                .populate('class', 'name section'),
            GradeSystem.findOne({ tenantId, isActive: true })
        ]);

        if (!exam) return res.status(404).json({ message: 'Exam not found' });
        if (marks.length === 0) return res.status(404).json({ message: 'No marks found' });

        const gradeConfigs = gradeSystem ? gradeSystem.grades : [];

        // Calculate grades for each mark
        const marksWithGrades = marks.map(m => {
            const perc = (m.marksObtained / m.maxMarks) * 100;
            const { grade, gpa } = calculateGrade(perc, gradeConfigs);
            return { ...m.toObject(), grade, gpa };
        });

        // Calculate summary
        const totalObtained = marksWithGrades.reduce((sum, m) => sum + m.marksObtained, 0);
        const totalMax = marksWithGrades.reduce((sum, m) => sum + m.maxMarks, 0);
        const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
        const { grade, gpa } = calculateGrade(percentage, gradeConfigs);

        // --- Rank Calculation ---
        const classId = marks[0].class._id;
        const allClassMarks = await Mark.find({ class: classId, exam: examId, tenantId });

        // Group by student and calculate totals
        const studentTotals = {};
        allClassMarks.forEach(m => {
            if (!studentTotals[m.student]) studentTotals[m.student] = 0;
            studentTotals[m.student] += m.marksObtained;
        });

        const sortedTotals = Object.values(studentTotals).sort((a, b) => b - a);
        const rank = sortedTotals.indexOf(totalObtained) + 1;
        const totalStudents = sortedTotals.length;

        const data = {
            student: marksWithGrades[0].student,
            class: marksWithGrades[0].class,
            exam: { name: exam.name, term: exam.term },
            marks: marksWithGrades,
            summary: {
                totalObtained,
                totalMax,
                percentage,
                grade,
                gpa,
                rank,
                totalStudents
            }
        };

        if (req.query.format === 'pdf') {
            const tenant = await Tenant.findOne({ tenantId });
            const doc = generateReportCardPDF(data, tenant);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=report-${studentId}.pdf`);
            doc.pipe(res);
            doc.end();
        } else {
            res.status(200).json({ success: true, data });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Approve Results
exports.approveResults = async (req, res) => {
    try {
        const exam = await Exam.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.user.tenantId },
            {
                isApproved: true,
                approvedBy: req.user._id,
                approvalDate: new Date(),
                status: 'completed'
            },
            { new: true }
        );
        res.status(200).json({ success: true, data: exam });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Unapprove Results (Unlock for editing)
// @route   PUT /api/exams/:id/unapprove
exports.unapproveResults = async (req, res) => {
    try {
        const exam = await Exam.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.user.tenantId },
            {
                isApproved: false,
                approvedBy: null,
                approvalDate: null,
                status: 'active'
            },
            { new: true }
        );

        if (!exam) {
            return res.status(404).json({ success: false, message: 'Exam not found' });
        }

        await logAction({
            action: 'UPDATE',
            module: 'EXAM',
            details: `Unapproved exam: ${exam.name} - Marks unlocked for editing`,
            userId: req.user._id,
            tenantId: req.user.tenantId
        });

        res.status(200).json({ success: true, data: exam, message: 'Exam unlocked successfully. Teachers can now edit marks.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Export Excel Matrix
exports.exportExcelMatrix = async (req, res) => {
    try {
        const { examId, classId } = req.query;
        const tenantId = req.user.tenantId;

        const subjects = await Subject.find({ tenantId });
        const marks = await Mark.find({ exam: examId, class: classId, tenantId })
            .populate('student', 'firstName lastName profile.rollNo');

        const students = await User.find({ role: 'student', tenantId, 'profile.class': (await Exam.findById(examId)).classes.includes(classId) ? undefined : undefined });
        // Logic to get students in that class... 
        // Simplified: Group marks by student
        const studentMap = {};
        marks.forEach(m => {
            if (!studentMap[m.student._id]) {
                studentMap[m.student._id] = {
                    student: m.student,
                    marks: {},
                    total: 0,
                    count: 0
                };
            }
            studentMap[m.student._id].marks[m.subject] = m.marksObtained;
            studentMap[m.student._id].total += m.marksObtained;
            studentMap[m.student._id].count++;
        });

        const rows = Object.values(studentMap).map(s => {
            const avg = s.total / subjects.length;
            const { grade } = calculateGrade((s.total / (subjects.length * 100)) * 100);
            return { ...s, average: avg, grade };
        });

        const tenant = await Tenant.findOne({ tenantId });
        const workbook = await generateExcelMatrix({ subjects, rows }, tenant);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=grades-matrix.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Grade System Management
exports.getGradeSystem = async (req, res) => {
    try {
        let system = await GradeSystem.findOne({ tenantId: req.user.tenantId });
        if (!system) {
            system = await GradeSystem.create({
                tenantId: req.user.tenantId,
                grades: [
                    { grade: 'A+', minPercentage: 90, maxPercentage: 100, gpa: 4.0 },
                    { grade: 'A', minPercentage: 80, maxPercentage: 89, gpa: 3.7 },
                    { grade: 'B', minPercentage: 70, maxPercentage: 79, gpa: 3.0 },
                    { grade: 'C', minPercentage: 60, maxPercentage: 69, gpa: 2.0 },
                    { grade: 'D', minPercentage: 50, maxPercentage: 59, gpa: 1.0 },
                    { grade: 'F', minPercentage: 0, maxPercentage: 49, gpa: 0.0 }
                ]
            });
        }
        res.status(200).json({ success: true, data: system });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateGradeSystem = async (req, res) => {
    try {
        const system = await GradeSystem.findOneAndUpdate(
            { tenantId: req.user.tenantId },
            req.body,
            { new: true, upsert: true }
        );
        res.status(200).json({ success: true, data: system });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Complaints
exports.submitComplaint = async (req, res) => {
    try {
        const complaint = await ExamComplaint.create({
            ...req.body,
            student: req.user._id,
            tenantId: req.user.tenantId
        });
        res.status(201).json({ success: true, data: complaint });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getComplaints = async (req, res) => {
    try {
        const query = { tenantId: req.user.tenantId };
        if (req.user.role === 'student') query.student = req.user._id;

        if (req.user.role === 'teacher') {
            const slots = await Timetable.find({ teacher: req.user._id, tenantId: req.user.tenantId });
            const subjectIds = [...new Set(slots.map(s => s.subject.toString()))];
            query.subject = { $in: subjectIds };
        }

        const complaints = await ExamComplaint.find(query)
            .populate('student', 'firstName lastName')
            .populate('exam', 'name')
            .populate('subject', 'name');

        res.status(200).json({ success: true, data: complaints });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get Exam Statistical Analysis
// @route   GET /api/exams/analytics/:examId
exports.getExamAnalytics = async (req, res) => {
    try {
        const { examId } = req.params;
        const { classId } = req.query;
        const tenantId = req.user.tenantId;

        const query = { exam: examId, tenantId };
        if (classId) query.class = classId;

        const marks = await Mark.find(query).populate('subject', 'name');

        if (marks.length === 0) {
            return res.status(200).json({ success: true, data: { message: 'No data available' } });
        }

        // Group by subject
        const subjectStats = {};
        marks.forEach(m => {
            const subjectName = m.subject.name;
            if (!subjectStats[subjectName]) {
                subjectStats[subjectName] = {
                    name: subjectName,
                    scores: [],
                    total: 0,
                    passed: 0,
                    failed: 0,
                    maxPossible: m.maxMarks
                };
            }
            subjectStats[subjectName].scores.push(m.marksObtained);
            subjectStats[subjectName].total += m.marksObtained;

            const percentage = (m.marksObtained / m.maxMarks) * 100;
            if (percentage >= 50) subjectStats[subjectName].passed++;
            else subjectStats[subjectName].failed++;
        });

        const analytics = Object.values(subjectStats).map(s => ({
            subject: s.name,
            average: (s.total / s.scores.length).toFixed(2),
            highest: Math.max(...s.scores),
            lowest: Math.min(...s.scores),
            passRate: ((s.passed / s.scores.length) * 100).toFixed(1),
            count: s.scores.length
        }));

        // Overall summary
        const totalStudents = new Set(marks.map(m => m.student.toString())).size;

        res.status(200).json({
            success: true,
            data: {
                totalStudents,
                subjectAnalytics: analytics,
                performanceDistribution: {
                    excellent: marks.filter(m => (m.marksObtained / m.maxMarks) >= 0.9).length,
                    good: marks.filter(m => (m.marksObtained / m.maxMarks) >= 0.7 && (m.marksObtained / m.maxMarks) < 0.9).length,
                    average: marks.filter(m => (m.marksObtained / m.maxMarks) >= 0.5 && (m.marksObtained / m.maxMarks) < 0.7).length,
                    belowAverage: marks.filter(m => (m.marksObtained / m.maxMarks) < 0.5).length
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get top performers for an exam in a class
// @route   GET /api/exams/top-performers/:examId/:classId
exports.getTopPerformers = async (req, res) => {
    try {
        const { examId, classId } = req.params;
        const tenantId = req.user.tenantId;

        // Get all marks for this exam and class
        const marks = await Mark.find({ exam: examId, class: classId, tenantId })
            .populate('student', 'firstName lastName admissionNumber profile.rollNo');

        if (marks.length === 0) {
            return res.status(200).json({ success: true, data: [] });
        }

        // Group by student and calculate total marks
        const studentTotals = {};
        marks.forEach(m => {
            const studentId = m.student._id.toString();
            if (!studentTotals[studentId]) {
                studentTotals[studentId] = {
                    student: m.student,
                    totalObtained: 0,
                    totalMax: 0,
                    count: 0
                };
            }
            studentTotals[studentId].totalObtained += m.marksObtained;
            studentTotals[studentId].totalMax += m.maxMarks;
            studentTotals[studentId].count++;
        });

        // Convert to array and sort
        const results = Object.values(studentTotals)
            .map(s => ({
                ...s,
                percentage: (s.totalObtained / s.totalMax) * 100
            }))
            .sort((a, b) => b.totalObtained - a.totalObtained) // Sort by total marks
            .slice(0, 3); // Top 3

        // Assign ranks
        results.forEach((r, index) => {
            r.rank = index + 1;
        });

        res.status(200).json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all term grades and GPA for a student
// @route   GET /api/exams/student-grades/:studentId
exports.getStudentGrades = async (req, res) => {
    try {
        const studentId = req.params.studentId || req.user._id;
        const tenantId = req.user.tenantId;

        const [marks, gradeSystem] = await Promise.all([
            Mark.find({ student: studentId, tenantId })
                .populate('subject', 'name code credits')
                .populate('exam', 'name term isApproved startDate')
                .sort({ 'exam.startDate': -1 }),
            GradeSystem.findOne({ tenantId, isActive: true })
        ]);

        if (marks.length === 0) {
            return res.status(200).json({
                success: true,
                data: { terms: [], cumulativeGpa: 0, totalCredits: 0 }
            });
        }

        const gradeConfigs = gradeSystem ? gradeSystem.grades : [];

        // Group by exam
        const termsMap = {};
        marks.forEach(m => {
            if (!m.exam || !m.exam.isApproved) return;

            const examId = m.exam._id.toString();
            if (!termsMap[examId]) {
                termsMap[examId] = {
                    id: examId,
                    name: m.exam.name,
                    term: m.exam.term,
                    startDate: m.exam.startDate,
                    courses: [],
                    totalCredits: 0,
                    weightedGpaSum: 0
                };
            }

            const perc = (m.marksObtained / m.maxMarks) * 100;
            const { grade, gpa } = calculateGrade(perc, gradeConfigs);
            const credits = m.subject.credits || 3;

            termsMap[examId].courses.push({
                subjectName: m.subject.name,
                subjectCode: m.subject.code,
                credits,
                marksObtained: m.marksObtained,
                maxMarks: m.maxMarks,
                percentage: perc.toFixed(1),
                grade,
                gpa
            });

            termsMap[examId].totalCredits += credits;
            termsMap[examId].weightedGpaSum += (gpa * credits);
        });

        // Convert map to array and calculate term GPAs
        const terms = Object.values(termsMap).map(term => {
            term.gpa = term.totalCredits > 0 ? (term.weightedGpaSum / term.totalCredits).toFixed(2) : 0;
            return term;
        }).sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

        // Calculate cumulative GPA
        let totalWeightedGpa = 0;
        let totalCredits = 0;
        terms.forEach(term => {
            totalWeightedGpa += term.weightedGpaSum;
            totalCredits += term.totalCredits;
        });

        const cumulativeGpa = totalCredits > 0 ? (totalWeightedGpa / totalCredits).toFixed(2) : 0;

        res.status(200).json({
            success: true,
            data: {
                terms,
                cumulativeGpa,
                totalCredits
            }
        });
    } catch (error) {
        console.error('getStudentGrades Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

