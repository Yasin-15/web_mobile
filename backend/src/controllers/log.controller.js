const AuditLog = require('../models/auditLog.model');

// @desc    Get all audit logs
// @route   GET /api/logs
// @access  Super Admin
exports.getAuditLogs = async (req, res) => {
    try {
        const query = {};
        if (req.user.role !== 'super-admin') {
            query.tenantId = req.user.tenantId;
        }

        const logs = await AuditLog.find(query)
            .populate('performedBy', 'firstName lastName email role')
            .sort({ createdAt: -1 })
            .limit(200);

        res.status(200).json({
            success: true,
            count: logs.length,
            data: logs
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
