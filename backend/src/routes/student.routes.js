const express = require('express');
const router = express.Router();
const {
    createStudent,
    getStudents,
    getStudentById,
    updateStudent,
    deleteStudent,
    promoteStudents,
    getChildren,
    bulkImportStudents,
    resetStudentPassword
} = require('../controllers/student.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

// All student management routes require authentication
router.use(protect);

router.get('/my-children', authorize('parent'), getChildren);
router.post('/promote', authorize('school-admin'), promoteStudents);
router.post('/bulk-import', authorize('school-admin'), bulkImportStudents);

// Restricted to roles that can manage students
router.route('/')
    .get(authorize('school-admin', 'teacher', 'receptionist'), getStudents)
    .post(authorize('school-admin', 'receptionist'), createStudent);

router.post('/:id/reset-password', authorize('school-admin', 'receptionist'), resetStudentPassword);

router.route('/:id')
    .get(authorize('school-admin', 'teacher', 'parent', 'receptionist'), getStudentById)
    .put(authorize('school-admin', 'teacher'), updateStudent)
    .delete(authorize('school-admin'), deleteStudent);

module.exports = router;
