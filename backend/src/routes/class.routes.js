const express = require('express');
const router = express.Router();
const {
    createClass,
    getClasses,
    getClass,
    updateClass,
    deleteClass
} = require('../controllers/class.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.use(protect);

router.route('/')
    .get(authorize('school-admin', 'teacher', 'receptionist', 'student', 'parent', 'super-admin'), getClasses)
    .post(authorize('school-admin', 'super-admin'), createClass);

router.route('/:id')
    .get(authorize('school-admin', 'teacher', 'receptionist', 'student', 'parent', 'super-admin'), getClass)
    .put(authorize('school-admin', 'super-admin'), updateClass)
    .delete(authorize('school-admin', 'super-admin'), deleteClass);

module.exports = router;
