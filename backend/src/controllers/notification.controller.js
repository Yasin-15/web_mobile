const Notification = require('../models/notification.model');
const User = require('../models/user.model');
const { sendSMS, sendEmail } = require('../services/notification.service');
const { logAction } = require('../utils/logger');

// @desc    Create and send notification
// @route   POST /api/notifications
exports.createNotification = async (req, res) => {
    try {
        const { title, message, type, channels, targetRole, targetClass } = req.body;
        const tenantId = req.user.tenantId;

        const notification = await Notification.create({
            title,
            message,
            type,
            channels,
            targetRole,
            targetClass,
            sender: req.user._id,
            tenantId
        });

        // Resolve targets
        const query = { tenantId, role: { $ne: 'super-admin' } };
        if (targetRole !== 'all') query.role = targetRole;
        if (targetClass) query['profile.class'] = targetClass;

        const targets = await User.find(query);

        // Process channels
        if (channels.includes('sms')) {
            targets.forEach(u => {
                if (u.profile?.phone) sendSMS(u.profile.phone, `${title}: ${message}`);
            });
        }

        if (channels.includes('email')) {
            targets.forEach(u => {
                if (u.email) sendEmail(u.email, title, message, `<p>${message}</p>`);
            });
        }

        await logAction({
            action: 'CREATE',
            module: 'NOTIFICATION',
            details: `Sent ${type} notification: ${title} to ${targetRole}`,
            userId: req.user._id,
            tenantId
        });

        const { emitToTenant } = require('../config/socket');
        emitToTenant(tenantId, 'notification-received', notification);

        res.status(201).json({ success: true, data: notification });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get notifications for user
// @route   GET /api/notifications
exports.getNotifications = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const role = req.user.role;
        const userClass = req.user.profile?.class;

        // Find notifications that target the user's role or 'all'
        const notifications = await Notification.find({
            tenantId,
            $or: [
                { targetRole: 'all' },
                { targetRole: role }
            ]
        })
            .populate('sender', 'firstName lastName')
            .sort({ createdAt: -1 })
            .limit(20);

        // Filter by class if applicable
        const filtered = notifications.filter(n => !n.targetClass || n.targetClass === userClass);

        // Add isRead flag for each notification
        const withReadStatus = filtered.map(n => ({
            ...n.toObject(),
            isRead: n.readBy.includes(req.user._id)
        }));

        res.status(200).json({ success: true, data: withReadStatus });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
exports.markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        // Check if user has access to this notification
        const tenantId = req.user.tenantId;
        const role = req.user.role;
        const userClass = req.user.profile?.class;

        if (notification.tenantId !== tenantId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        if (notification.targetRole !== 'all' && notification.targetRole !== role) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        if (notification.targetClass && notification.targetClass !== userClass) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        // Add user to readBy array if not already there
        if (!notification.readBy.includes(req.user._id)) {
            notification.readBy.push(req.user._id);
            await notification.save();
        }

        res.status(200).json({ success: true, data: notification });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get unread notification count
// @route   GET /api/notifications/unread/count
exports.getUnreadCount = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const role = req.user.role;
        const userClass = req.user.profile?.class;

        // Find notifications that target the user's role or 'all'
        const notifications = await Notification.find({
            tenantId,
            $or: [
                { targetRole: 'all' },
                { targetRole: role }
            ],
            readBy: { $ne: req.user._id } // Not read by current user
        });

        // Filter by class if applicable
        const filtered = notifications.filter(n => !n.targetClass || n.targetClass === userClass);

        res.status(200).json({ success: true, count: filtered.length });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
