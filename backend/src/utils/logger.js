const AuditLog = require('../models/auditLog.model');

/**
 * Log a system action
 * @param {Object} logData 
 */
exports.logAction = async (logData) => {
    try {
        await AuditLog.create({
            action: logData.action,
            module: logData.module,
            details: logData.details,
            performedBy: logData.userId,
            tenantId: logData.tenantId || 'platform',
            ipAddress: logData.ip || '',
            userAgent: logData.userAgent || ''
        });
    } catch (error) {
        console.error('Audit Log Error:', error);
        // Don't throw error to prevent breaking main transaction
    }
};
