const Salary = require('../models/salary.model');
const User = require('../models/user.model');
const { logAction } = require('../utils/logger');

// @desc    Get current user's salary history
// @route   GET /api/salaries/me
exports.getMySalaries = async (req, res) => {
    try {
        const salaries = await Salary.find({
            user: req.user._id,
            tenantId: req.user.tenantId
        }).sort({ year: -1, month: -1 });

        res.status(200).json({ success: true, data: salaries });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Generate a salary record (Admin only)
// @route   POST /api/salaries
exports.createSalary = async (req, res) => {
    try {
        const { userId, month, year, basicSalary, allowances, deductions } = req.body;
        const tenantId = req.user.tenantId;

        const netSalary = basicSalary +
            (allowances?.reduce((sum, a) => sum + a.amount, 0) || 0) -
            (deductions?.reduce((sum, d) => sum + d.amount, 0) || 0);

        const salary = await Salary.create({
            user: userId,
            month,
            year,
            basicSalary,
            allowances,
            deductions,
            netSalary,
            tenantId
        });

        await logAction({
            action: 'CREATE',
            module: 'SALARY',
            details: `Generated payslip for user ${userId} for ${month} ${year}`,
            userId: req.user._id,
            tenantId
        });

        res.status(201).json({ success: true, data: salary });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Run payroll for all staff
// @route   POST /api/salaries/run
exports.runPayroll = async (req, res) => {
    try {
        const { month, year } = req.body;
        const tenantId = req.user.tenantId;

        const staff = await User.find({
            tenantId,
            role: { $in: ['teacher', 'school-admin', 'receptionist', 'accountant', 'librarian'] },
            status: 'active'
        });

        let count = 0;
        let created = 0;
        let updated = 0;

        for (const member of staff) {
            const basicSalary = parseFloat(member.profile?.salary || 0);
            if (basicSalary <= 0) continue;

            // Check if already generated
            const existing = await Salary.findOne({
                user: member._id,
                month,
                year,
                tenantId
            });

            if (existing) {
                // If exists and pending, update the amount (in case profile changed)
                if (existing.status === 'pending') {
                    existing.basicSalary = basicSalary;
                    existing.netSalary = basicSalary; // Simplified
                    await existing.save();
                    updated++;
                }
                continue;
            }

            await Salary.create({
                user: member._id,
                month,
                year,
                basicSalary,
                netSalary: basicSalary,
                tenantId,
                status: 'pending'
            });
            created++;
        }

        await logAction({
            action: 'CREATE',
            module: 'SALARY',
            details: `Ran payroll for ${month} ${year}: ${created} created, ${updated} updated`,
            userId: req.user._id,
            tenantId
        });

        res.status(200).json({ success: true, message: `Payroll complete: ${created} created, ${updated} updated`, count: created + updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Mark salary as paid
// @route   PUT /api/salaries/:id/pay
exports.markSalaryPaid = async (req, res) => {
    try {
        const salary = await Salary.findOne({ _id: req.params.id, tenantId: req.user.tenantId });

        if (!salary) {
            return res.status(404).json({ success: false, message: 'Salary record not found' });
        }

        salary.status = 'paid';
        salary.paymentDate = new Date();
        await salary.save();

        await logAction({
            action: 'UPDATE',
            module: 'SALARY',
            details: `Marked salary ${salary._id} as paid`,
            userId: req.user._id,
            tenantId: req.user.tenantId
        });

        res.status(200).json({ success: true, data: salary });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all salaries (Admin only)
exports.getAllSalaries = async (req, res) => {
    try {
        const salaries = await Salary.find({ tenantId: req.user.tenantId })
            .populate('user', 'firstName lastName email profile')
            .sort({ year: -1, month: -1 });
        res.status(200).json({ success: true, data: salaries });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
