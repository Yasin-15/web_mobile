const FeeType = require('../models/feeType.model');
const Invoice = require('../models/invoice.model');
const Payment = require('../models/payment.model');
const User = require('../models/user.model');
const Expense = require('../models/expense.model');
const { logAction } = require('../utils/logger');

// @desc    Create a new fee type
// @route   POST /api/fees/types
exports.createFeeType = async (req, res) => {
    try {
        const feeType = await FeeType.create({
            ...req.body,
            tenantId: req.user.tenantId
        });

        await logAction({
            action: 'CREATE',
            module: 'FINANCE',
            details: `Created fee type: ${feeType.name}`,
            userId: req.user._id,
            tenantId: req.user.tenantId
        });

        res.status(201).json({ success: true, data: feeType });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all fee types
exports.getFeeTypes = async (req, res) => {
    try {
        const feeTypes = await FeeType.find({ tenantId: req.user.tenantId });
        res.status(200).json({ success: true, count: feeTypes.length, data: feeTypes });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Bulk Generate Invoices for a Class
// @route   POST /api/fees/generate-invoices
exports.generateClassInvoices = async (req, res) => {
    try {
        const { classId, className, section, feeTypeIds, dueDate } = req.body;
        const tenantId = req.user.tenantId;

        // 1. Get Class Students
        const students = await User.find({
            tenantId,
            role: 'student',
            'profile.class': className,
            'profile.section': section
        });

        if (students.length === 0) {
            return res.status(404).json({ message: 'No students found for this class' });
        }

        // 2. Get Fee Types
        const feeTypes = await FeeType.find({ _id: { $in: feeTypeIds }, tenantId });
        const items = feeTypes.map(ft => ({
            feeType: ft._id,
            name: ft.name,
            amount: ft.amount
        }));

        const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

        // 3. Create Invoices
        const invoices = students.map(student => ({
            invoiceNumber: `INV-${Date.now()}-${student._id.toString().slice(-4)}`,
            student: student._id,
            class: classId,
            items,
            totalAmount,
            dueDate,
            tenantId
        }));

        await Invoice.insertMany(invoices);

        await logAction({
            action: 'CREATE',
            module: 'FINANCE',
            details: `Generated ${invoices.length} invoices for ${className} ${section}`,
            userId: req.user._id,
            tenantId
        });

        res.status(201).json({ success: true, message: `Successfully generated ${invoices.length} invoices` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get Invoices
exports.getInvoices = async (req, res) => {
    try {
        const { studentId, status } = req.query;
        const filter = { tenantId: req.user.tenantId };
        if (studentId) filter.student = studentId;
        if (status) filter.status = status;

        const invoices = await Invoice.find(filter)
            .populate('student', 'firstName lastName email')
            .populate('class', 'name section')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, count: invoices.length, data: invoices });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Record a payment
// @route   POST /api/fees/pay
exports.recordPayment = async (req, res) => {
    try {
        const { invoiceId, amount, paymentMethod, transactionId } = req.body;
        const tenantId = req.user.tenantId;

        const invoice = await Invoice.findOne({ _id: invoiceId, tenantId });
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

        const payment = await Payment.create({
            invoice: invoiceId,
            amount,
            paymentMethod,
            transactionId,
            tenantId,
            markedBy: req.user._id
        });

        // Update Invoice status
        invoice.paidAmount += parseFloat(amount);
        if (invoice.paidAmount >= invoice.totalAmount) {
            invoice.status = 'paid';
        } else if (invoice.paidAmount > 0) {
            invoice.status = 'partially_paid';
        }
        await invoice.save();

        await logAction({
            action: 'UPDATE',
            module: 'FINANCE',
            details: `Recorded payment of ${amount} for invoice ${invoice.invoiceNumber}`,
            userId: req.user._id,
            tenantId
        });

        res.status(201).json({ success: true, data: payment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single invoice by ID
// @route   GET /api/fees/invoices/:id
exports.getInvoiceById = async (req, res) => {
    try {
        const invoice = await Invoice.findOne({ _id: req.params.id, tenantId: req.user.tenantId })
            .populate('student', 'firstName lastName email profile.rollNo')
            .populate('class', 'name section')
            .populate('items.feeType', 'name description');

        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

        res.status(200).json({ success: true, data: invoice });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Add an expense
// @route   POST /api/fees/expenses
exports.createExpense = async (req, res) => {
    try {
        const expense = await Expense.create({
            ...req.body,
            tenantId: req.user.tenantId,
            recordedBy: req.user._id
        });

        await logAction({
            action: 'CREATE',
            module: 'FINANCE',
            details: `Recorded expense: ${expense.title} (${expense.amount})`,
            userId: req.user._id,
            tenantId: req.user.tenantId
        });

        res.status(201).json({ success: true, data: expense });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all expenses
// @route   GET /api/fees/expenses
exports.getExpenses = async (req, res) => {
    try {
        const expenses = await Expense.find({ tenantId: req.user.tenantId })
            .populate('recordedBy', 'firstName lastName')
            .sort({ date: -1 });
        res.status(200).json({ success: true, count: expenses.length, data: expenses });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
