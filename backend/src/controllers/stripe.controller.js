const stripeService = require('../services/stripe.service');
const Invoice = require('../models/invoice.model');
const { logAction } = require('../utils/logger');
const stripe = require('../config/stripe');

// @desc    Create payment intent for invoice
// @route   POST /api/stripe/create-payment-intent
exports.createPaymentIntent = async (req, res) => {
    try {
        const { invoiceId } = req.body;

        // Get invoice with student details
        const invoice = await Invoice.findById(invoiceId)
            .populate('student', 'firstName lastName email')
            .populate('class', 'name');

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        // Check if invoice belongs to user's tenant
        if (invoice.tenantId !== req.user.tenantId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Check if user can pay this invoice (student or parent)
        if (req.user.role === 'student' && invoice.student._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only pay your own invoices'
            });
        }

        if (req.user.role === 'parent') {
            // Check if invoice belongs to user's child
            const children = req.user.profile?.children || [];
            if (!children.includes(invoice.student._id.toString())) {
                return res.status(403).json({
                    success: false,
                    message: 'You can only pay invoices for your children'
                });
            }
        }

        // Check if invoice is already paid
        if (invoice.status === 'paid') {
            return res.status(400).json({
                success: false,
                message: 'Invoice is already paid'
            });
        }

        // Create payment intent
        const paymentIntent = await stripeService.createPaymentIntent(invoice, req.user);

        await logAction({
            action: 'CREATE',
            module: 'PAYMENT',
            details: `Created payment intent for invoice ${invoice.invoiceNumber}`,
            userId: req.user._id,
            tenantId: req.user.tenantId
        });

        res.status(200).json({
            success: true,
            data: {
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
                invoice: {
                    id: invoice._id,
                    invoiceNumber: invoice.invoiceNumber,
                    totalAmount: invoice.totalAmount,
                    paidAmount: invoice.paidAmount,
                    outstandingAmount: invoice.totalAmount - invoice.paidAmount
                }
            }
        });
    } catch (error) {
        console.error('Create payment intent error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create payment intent'
        });
    }
};

// @desc    Handle Stripe webhooks
// @route   POST /api/stripe/webhook
exports.handleWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        switch (event.type) {
            case 'payment_intent.succeeded':
                await stripeService.handlePaymentSuccess(event.data.object);
                console.log('Payment succeeded:', event.data.object.id);
                break;

            case 'payment_intent.payment_failed':
                console.log('Payment failed:', event.data.object.id);
                // Handle payment failure if needed
                break;

            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Webhook handling error:', error);
        res.status(500).json({ error: 'Webhook handling failed' });
    }
};

// @desc    Get payment status
// @route   GET /api/stripe/payment-status/:paymentIntentId
exports.getPaymentStatus = async (req, res) => {
    try {
        const { paymentIntentId } = req.params;

        const paymentIntent = await stripeService.getPaymentIntentStatus(paymentIntentId);

        // Get associated invoice
        const invoice = await Invoice.findOne({ stripePaymentIntentId: paymentIntentId });

        res.status(200).json({
            success: true,
            data: {
                status: paymentIntent.status,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
                invoice: invoice ? {
                    id: invoice._id,
                    invoiceNumber: invoice.invoiceNumber,
                    status: invoice.status,
                    paidAmount: invoice.paidAmount
                } : null
            }
        });
    } catch (error) {
        console.error('Get payment status error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get payment status'
        });
    }
};

// @desc    Create refund
// @route   POST /api/stripe/refund
exports.createRefund = async (req, res) => {
    try {
        const { paymentIntentId, amount, reason } = req.body;

        // Only allow admins and accountants to create refunds
        if (!['school-admin', 'accountant'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const refund = await stripeService.createRefund(paymentIntentId, amount);

        await logAction({
            action: 'CREATE',
            module: 'PAYMENT',
            details: `Created refund for payment intent ${paymentIntentId}`,
            userId: req.user._id,
            tenantId: req.user.tenantId
        });

        res.status(200).json({
            success: true,
            data: refund
        });
    } catch (error) {
        console.error('Create refund error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create refund'
        });
    }
};