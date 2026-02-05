const stripe = require('../config/stripe');
const User = require('../models/user.model');
const Invoice = require('../models/invoice.model');
const Payment = require('../models/payment.model');

class StripeService {
    /**
     * Create or retrieve Stripe customer for a user
     */
    async createOrGetCustomer(user) {
        try {
            // Check if user already has a Stripe customer ID
            if (user.profile?.stripeCustomerId) {
                try {
                    const customer = await stripe.customers.retrieve(user.profile.stripeCustomerId);
                    return customer;
                } catch (error) {
                    // Customer doesn't exist in Stripe, create new one
                    console.log('Stripe customer not found, creating new one');
                }
            }

            // Create new Stripe customer
            const customer = await stripe.customers.create({
                email: user.email,
                name: `${user.firstName} ${user.lastName}`,
                metadata: {
                    userId: user._id.toString(),
                    tenantId: user.tenantId,
                    role: user.role
                }
            });

            // Save Stripe customer ID to user profile
            await User.findByIdAndUpdate(user._id, {
                $set: {
                    'profile.stripeCustomerId': customer.id
                }
            });

            return customer;
        } catch (error) {
            console.error('Error creating/retrieving Stripe customer:', error);
            throw new Error('Failed to create Stripe customer');
        }
    }

    /**
     * Create payment intent for an invoice
     */
    async createPaymentIntent(invoice, user) {
        try {
            const customer = await this.createOrGetCustomer(user);
            
            // Calculate amount in cents (Stripe uses smallest currency unit)
            const amountInCents = Math.round((invoice.totalAmount - invoice.paidAmount) * 100);

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amountInCents,
                currency: 'usd', // You can get this from tenant config
                customer: customer.id,
                metadata: {
                    invoiceId: invoice._id.toString(),
                    invoiceNumber: invoice.invoiceNumber,
                    studentId: invoice.student.toString(),
                    tenantId: invoice.tenantId
                },
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            // Update invoice with payment intent ID
            await Invoice.findByIdAndUpdate(invoice._id, {
                stripePaymentIntentId: paymentIntent.id,
                paymentGateway: 'stripe'
            });

            return paymentIntent;
        } catch (error) {
            console.error('Error creating payment intent:', error);
            throw new Error('Failed to create payment intent');
        }
    }

    /**
     * Handle successful payment webhook
     */
    async handlePaymentSuccess(paymentIntent) {
        try {
            const invoiceId = paymentIntent.metadata.invoiceId;
            const invoice = await Invoice.findById(invoiceId);

            if (!invoice) {
                throw new Error('Invoice not found');
            }

            // Calculate payment amount from cents to dollars
            const paymentAmount = paymentIntent.amount / 100;

            // Create payment record
            const payment = await Payment.create({
                invoice: invoice._id,
                amount: paymentAmount,
                paymentMethod: 'stripe',
                paymentGateway: 'stripe',
                transactionId: paymentIntent.id,
                stripePaymentIntentId: paymentIntent.id,
                stripeChargeId: paymentIntent.latest_charge,
                stripeCustomerId: paymentIntent.customer,
                stripeReceiptUrl: paymentIntent.charges?.data[0]?.receipt_url,
                tenantId: invoice.tenantId,
                markedBy: invoice.student // System payment, marked by student
            });

            // Update invoice status and paid amount
            const newPaidAmount = invoice.paidAmount + paymentAmount;
            const newStatus = newPaidAmount >= invoice.totalAmount ? 'paid' : 'partially_paid';

            await Invoice.findByIdAndUpdate(invoice._id, {
                paidAmount: newPaidAmount,
                status: newStatus
            });

            return { payment, invoice };
        } catch (error) {
            console.error('Error handling payment success:', error);
            throw error;
        }
    }

    /**
     * Get payment intent status
     */
    async getPaymentIntentStatus(paymentIntentId) {
        try {
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            return paymentIntent;
        } catch (error) {
            console.error('Error retrieving payment intent:', error);
            throw new Error('Failed to retrieve payment status');
        }
    }

    /**
     * Create refund for a payment
     */
    async createRefund(paymentIntentId, amount = null) {
        try {
            const refundData = {
                payment_intent: paymentIntentId
            };

            if (amount) {
                refundData.amount = Math.round(amount * 100); // Convert to cents
            }

            const refund = await stripe.refunds.create(refundData);
            return refund;
        } catch (error) {
            console.error('Error creating refund:', error);
            throw new Error('Failed to create refund');
        }
    }
}

module.exports = new StripeService();