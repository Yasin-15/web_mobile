const Tenant = require('../models/tenant.model');
const User = require('../models/user.model');
const { logAction } = require('../utils/logger');

// @desc    Create a new school (Tenant)
// @route   POST /api/tenants
// @access  Super Admin
exports.createTenant = async (req, res) => {
    try {
        const {
            name,
            tenantId,
            domain,
            adminEmail,
            adminDetails,
            config,
            subscription
        } = req.body;

        const tenantExists = await Tenant.findOne({ $or: [{ tenantId }, { domain }] });
        if (tenantExists) {
            return res.status(400).json({ message: 'Tenant ID or Domain already exists' });
        }

        const tenant = await Tenant.create({
            name,
            tenantId,
            domain,
            config,
            subscription
        });

        let adminUser = null;
        if (adminEmail && adminDetails) {
            adminUser = await User.create({
                firstName: adminDetails.firstName,
                lastName: adminDetails.lastName,
                email: adminEmail,
                password: adminDetails.password,
                role: 'school-admin',
                tenantId: tenant.tenantId
            });
        }

        // Audit Log
        await logAction({
            action: 'CREATE',
            module: 'TENANT',
            details: `Created school: ${name} (${tenantId})`,
            userId: req.user?._id,
            tenantId: 'platform'
        });

        res.status(201).json({
            success: true,
            data: {
                tenant,
                admin: adminUser ? { id: adminUser._id, email: adminUser.email } : null
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all tenants
exports.getAllTenants = async (req, res) => {
    try {
        const tenants = await Tenant.find({}).sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: tenants.length, data: tenants });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get tenant by ID
exports.getTenantById = async (req, res) => {
    try {
        const tenant = await Tenant.findById(req.params.id);
        if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
        res.status(200).json({ success: true, data: tenant });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update tenant details
exports.updateTenant = async (req, res) => {
    try {
        let tenant = await Tenant.findById(req.params.id);

        if (!tenant) {
            return res.status(404).json({ message: 'Tenant not found' });
        }

        const oldName = tenant.name;

        tenant = await Tenant.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        // Audit Log
        await logAction({
            action: 'UPDATE',
            module: 'TENANT',
            details: `Updated school: ${oldName} -> ${tenant.name}`,
            userId: req.user?._id,
            tenantId: 'platform'
        });

        res.status(200).json({ success: true, data: tenant });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete tenant
exports.deleteTenant = async (req, res) => {
    try {
        const tenant = await Tenant.findById(req.params.id);

        if (!tenant) {
            return res.status(404).json({ message: 'Tenant not found' });
        }

        const tenantName = tenant.name;
        const tId = tenant.tenantId;

        await Tenant.deleteOne({ _id: req.params.id });

        // Audit Log
        await logAction({
            action: 'DELETE',
            module: 'TENANT',
            details: `Deleted school: ${tenantName} (${tId})`,
            userId: req.user?._id,
            tenantId: 'platform'
        });

        res.status(200).json({ success: true, message: 'Tenant deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get current tenant details (for Dashboard/Branding)
// @route   GET /api/tenants/me
exports.getMyTenant = async (req, res) => {
    try {
        const tenant = await Tenant.findOne({ tenantId: req.user.tenantId });
        if (!tenant) return res.status(404).json({ message: 'School not found' });
        res.status(200).json({ success: true, data: tenant });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update current tenant branding (School Admin)
// @route   PUT /api/tenants/me
exports.updateMyTenant = async (req, res) => {
    try {
        let tenant = await Tenant.findOne({ tenantId: req.user.tenantId });
        if (!tenant) return res.status(404).json({ message: 'School not found' });

        // Update name and config
        if (req.body.name) tenant.name = req.body.name;
        if (req.body.config) {
            tenant.config = { ...tenant.config, ...req.body.config };
        }

        await tenant.save();

        await logAction({
            action: 'UPDATE',
            module: 'TENANT',
            details: `Updated institutional branding for: ${tenant.name}`,
            userId: req.user._id,
            tenantId: tenant.tenantId
        });

        res.status(200).json({ success: true, data: tenant });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
