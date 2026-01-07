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

        res.status(200).json({ success: true, data: filtered });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
