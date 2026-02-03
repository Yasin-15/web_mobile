const express = require('express');
const router = express.Router();
const {
    createExam,
    getExams,
    updateExam,
    bulkMarkEntry,
    deleteMark,
    bulkDeleteMarks,
    getMarks,
    getStudentReport,
    approveResults,
    exportExcelMatrix,
    getGradeSystem,
    updateGradeSystem,
    submitComplaint,
    getComplaints,
    getExamAnalytics,
    getTopPerformers,
    getStudentGrades
} = require('../controllers/exam.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.use(protect);

// Grade System
router.route('/grade-system')
    .get(getGradeSystem)
    .put(authorize('school-admin'), updateGradeSystem);

// Exam CRUD
router.route('/')
    .get(authorize('school-admin', 'teacher', 'receptionist', 'student', 'parent'), getExams)
    .post(authorize('school-admin'), createExam);

router.route('/:id')
    .put(authorize('school-admin'), updateExam);

router.put('/:id/approve', authorize('school-admin'), approveResults);

// Mark Entry & Reports
router.post('/marks/bulk', authorize('school-admin', 'teacher'), bulkMarkEntry);
router.delete('/marks/bulk', authorize('school-admin', 'teacher'), bulkDeleteMarks);
router.delete('/marks/:markId', authorize('school-admin', 'teacher'), deleteMark);
router.get('/marks', authorize('school-admin', 'teacher', 'student', 'parent'), getMarks);
router.get('/report/:examId/:studentId', authorize('school-admin', 'teacher', 'student', 'parent'), getStudentReport);
router.get('/student-grades/:studentId?', authorize('school-admin', 'teacher', 'student', 'parent'), getStudentGrades);
router.get('/export-matrix', authorize('school-admin', 'teacher'), exportExcelMatrix);

// Complaints
router.route('/complaints')
    .get(getComplaints)
    .post(authorize('student'), submitComplaint);

router.get('/analytics/:examId', authorize('school-admin', 'teacher'), getExamAnalytics);
router.get('/top-performers/:examId/:classId', authorize('school-admin', 'teacher'), getTopPerformers);

module.exports = router;
