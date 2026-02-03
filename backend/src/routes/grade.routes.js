const express = require('express');
const router = express.Router();
const gradeController = require('../controllers/grade.controller');
const { protect } = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(protect);

// Create a new grade system
router.post('/', gradeController.createGradeSystem);

// Get active grade system
router.get('/active', gradeController.getActiveGradeSystem);

// Get all grade systems
router.get('/', gradeController.getAllGradeSystems);

// Calculate grade from percentage
router.post('/calculate', gradeController.calculateGrade);

// Get grade system by ID
router.get('/:id', gradeController.getGradeSystemById);

// Update grade system
router.put('/:id', gradeController.updateGradeSystem);

// Delete grade system
router.delete('/:id', gradeController.deleteGradeSystem);

// Toggle grade system status (activate/deactivate)
router.patch('/:id/toggle', gradeController.toggleGradeSystemStatus);

module.exports = router;
