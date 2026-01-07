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
    .get(authorize('school-admin', 'teacher', 'receptionist', 'student', 'parent'), getClasses)
    .post(authorize('school-admin'), createClass);

router.route('/:id')
    .get(authorize('school-admin', 'teacher', 'receptionist', 'student', 'parent'), getClass)
    .put(authorize('school-admin'), updateClass)
    .delete(authorize('school-admin'), deleteClass);

module.exports = router;
