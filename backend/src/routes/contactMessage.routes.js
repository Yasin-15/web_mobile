const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const {
    createContactMessage,
    getContactMessages,
    getContactMessageById,
    updateContactMessageStatus,
    deleteContactMessage,
    getContactStats
} = require('../controllers/contactMessage.controller');

// Public route - anyone can submit a contact form
router.post('/', createContactMessage);

// Protected routes - super-admin only
router.get('/', protect, authorize('super-admin'), getContactMessages);
router.get('/stats', protect, authorize('super-admin'), getContactStats);
router.get('/:id', protect, authorize('super-admin'), getContactMessageById);
router.patch('/:id', protect, authorize('super-admin'), updateContactMessageStatus);
router.delete('/:id', protect, authorize('super-admin'), deleteContactMessage);

module.exports = router;
