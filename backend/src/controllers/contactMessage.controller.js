const ContactMessage = require('../models/contactMessage.model');

// Create a new contact message (public endpoint)
const createContactMessage = async (req, res) => {
    try {
        const { firstName, lastName, email, institution, message, role } = req.body;

        // Validate required fields
        if (!firstName || !lastName || !email || !message) {
            return res.status(400).json({
                message: 'Please provide all required fields: firstName, lastName, email, and message'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Please provide a valid email address' });
        }

        const contactMessage = new ContactMessage({
            firstName,
            lastName,
            email,
            institution,
            message,
            role: role || 'Other'
        });

        await contactMessage.save();

        res.status(201).json({
            message: 'Thank you for contacting us! We will get back to you soon.',
            data: contactMessage
        });
    } catch (error) {
        console.error('Error creating contact message:', error);
        res.status(500).json({ message: 'Failed to send message. Please try again later.' });
    }
};

// Get all contact messages (super-admin only)
const getContactMessages = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;

        const query = {};
        if (status) {
            query.status = status;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const messages = await ContactMessage.find(query)
            .populate('repliedBy', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await ContactMessage.countDocuments(query);

        res.json({
            messages,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching contact messages:', error);
        res.status(500).json({ message: 'Failed to fetch contact messages' });
    }
};

// Get a single contact message by ID (super-admin only)
const getContactMessageById = async (req, res) => {
    try {
        const message = await ContactMessage.findById(req.params.id)
            .populate('repliedBy', 'firstName lastName email');

        if (!message) {
            return res.status(404).json({ message: 'Contact message not found' });
        }

        // Mark as read if it's new
        if (message.status === 'new') {
            message.status = 'read';
            await message.save();
        }

        res.json(message);
    } catch (error) {
        console.error('Error fetching contact message:', error);
        res.status(500).json({ message: 'Failed to fetch contact message' });
    }
};

// Update contact message status (super-admin only)
const updateContactMessageStatus = async (req, res) => {
    try {
        const { status, reply } = req.body;

        if (!['new', 'read', 'replied', 'archived'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }

        const message = await ContactMessage.findById(req.params.id);

        if (!message) {
            return res.status(404).json({ message: 'Contact message not found' });
        }

        message.status = status;

        if (reply && status === 'replied') {
            message.reply = reply;
            message.repliedBy = req.user._id;
            message.repliedAt = new Date();
        }

        await message.save();

        const updatedMessage = await ContactMessage.findById(message._id)
            .populate('repliedBy', 'firstName lastName email');

        res.json({
            message: 'Contact message updated successfully',
            data: updatedMessage
        });
    } catch (error) {
        console.error('Error updating contact message:', error);
        res.status(500).json({ message: 'Failed to update contact message' });
    }
};

// Delete a contact message (super-admin only)
const deleteContactMessage = async (req, res) => {
    try {
        const message = await ContactMessage.findByIdAndDelete(req.params.id);

        if (!message) {
            return res.status(404).json({ message: 'Contact message not found' });
        }

        res.json({ message: 'Contact message deleted successfully' });
    } catch (error) {
        console.error('Error deleting contact message:', error);
        res.status(500).json({ message: 'Failed to delete contact message' });
    }
};

// Get contact message statistics (super-admin only)
const getContactStats = async (req, res) => {
    try {
        const stats = await ContactMessage.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const total = await ContactMessage.countDocuments();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayCount = await ContactMessage.countDocuments({
            createdAt: { $gte: today }
        });

        const statusCounts = {
            new: 0,
            read: 0,
            replied: 0,
            archived: 0
        };

        stats.forEach(stat => {
            statusCounts[stat._id] = stat.count;
        });

        res.json({
            total,
            todayCount,
            statusCounts
        });
    } catch (error) {
        console.error('Error fetching contact stats:', error);
        res.status(500).json({ message: 'Failed to fetch contact statistics' });
    }
};

module.exports = {
    createContactMessage,
    getContactMessages,
    getContactMessageById,
    updateContactMessageStatus,
    deleteContactMessage,
    getContactStats
};
