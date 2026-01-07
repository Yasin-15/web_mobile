const express = require('express');
const router = express.Router();
const {
    createAssignment,
    getAssignments,
    submitAssignment,
    getSubmissions,
    gradeSubmission
} = require('../controllers/assignment.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.use(protect);

router.route('/')
    .get(getAssignments)
    .post(authorize('teacher', 'school-admin'), createAssignment);

router.route('/:id/submit')
    .post(authorize('student'), submitAssignment);

router.route('/:id/submissions')
    .get(authorize('teacher', 'school-admin'), getSubmissions);

router.route('/submissions/:id/grade')
    .post(authorize('teacher', 'school-admin'), gradeSubmission);

module.exports = router;
