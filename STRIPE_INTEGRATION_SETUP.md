# Stripe Integration Setup Guide

## Overview
This guide will help you complete the Stripe integration for your school management system. The integration allows students and parents to pay invoices online using credit cards, debit cards, and other payment methods supported by Stripe.

## Prerequisites
1. Stripe account (create at https://stripe.com)
2. Node.js and npm installed
3. Your school management system running

## Step 1: Get Your Stripe API Keys

1. **Log in to your Stripe Dashboard** at https://dashboard.stripe.com
2. **Navigate to Developers → API keys**
3. **Copy your keys:**
   - **Secret key** (starts with `sk_test_` for testing)
   - **Publishable key** (starts with `pk_test_` for testing)

## Step 2: Configure Environment Variables

### Backend Configuration
Update `backend/.env` with your Stripe secret key:
```env
STRIPE_SECRET_KEY=sk_test_your_actual_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### Frontend Configuration
Update `frontend/.env.local` with your Stripe publishable key:
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_stripe_publishable_key_here
```

## Step 3: Set Up Stripe Webhooks

1. **Go to Stripe Dashboard → Developers → Webhooks**
2. **Click "Add endpoint"**
3. **Enter your webhook URL:**
   - For development: `http://localhost:5000/api/stripe/webhook`
   - For production: `https://your-domain.com/api/stripe/webhook`
4. **Select events to listen for:**
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. **Copy the webhook signing secret** and add it to your backend `.env` file

## Step 4: Test the Integration

### Using Stripe Test Cards
Use these test card numbers for testing:
- **Successful payment:** `4242424242424242`
- **Declined payment:** `4000000000000002`
- **Requires authentication:** `4000002500003155`

### Test Flow
1. **Log in as a student or parent**
2. **Navigate to the Finance page**
3. **Click "Pay Now" on an unpaid invoice**
4. **Enter test card details:**
   - Card number: `4242424242424242`
   - Expiry: Any future date (e.g., `12/25`)
   - CVC: Any 3 digits (e.g., `123`)
   - Name: Any name
5. **Complete the payment**
6. **Verify the invoice status updates to "paid"**

## Step 5: Go Live

### When Ready for Production:
1. **Activate your Stripe account** (complete business verification)
2. **Switch to live keys:**
   - Replace `sk_test_` with `sk_live_` in backend
   - Replace `pk_test_` with `pk_live_` in frontend
3. **Update webhook endpoint** to production URL
4. **Test with real payment methods**

## Features Included

### For Students/Parents:
- **Online Payment**: Pay invoices using credit/debit cards
- **Payment History**: View all payment transactions
- **Receipt Generation**: Download payment receipts
- **Real-time Updates**: Invoice status updates immediately after payment

### For School Administrators:
- **Payment Tracking**: Monitor all online payments
- **Refund Management**: Process refunds through Stripe
- **Financial Reports**: View payment analytics
- **Multi-tenant Support**: Each school has isolated payment data

### Security Features:
- **PCI Compliance**: Stripe handles all sensitive card data
- **Webhook Verification**: Secure webhook signature validation
- **Multi-tenant Isolation**: Payment data isolated per school
- **Role-based Access**: Students can only pay their own invoices

## API Endpoints Added

### Payment Endpoints:
- `POST /api/stripe/create-payment-intent` - Create payment intent for invoice
- `POST /api/stripe/webhook` - Handle Stripe webhooks
- `GET /api/stripe/payment-status/:paymentIntentId` - Get payment status
- `POST /api/stripe/refund` - Create refund (admin only)

## Database Changes

### Extended Models:
- **Payment Model**: Added Stripe-specific fields
- **Invoice Model**: Added payment intent tracking
- **User Model**: Added Stripe customer ID storage

## Troubleshooting

### Common Issues:

1. **"Invalid API key" error:**
   - Verify your Stripe secret key is correct
   - Ensure you're using the right key for your environment (test vs live)

2. **Webhook not working:**
   - Check webhook URL is accessible
   - Verify webhook secret is correct
   - Check webhook endpoint logs

3. **Payment not updating invoice:**
   - Verify webhook is configured correctly
   - Check webhook signature verification
   - Review server logs for errors

4. **Frontend payment form not loading:**
   - Verify publishable key is correct
   - Check browser console for errors
   - Ensure Stripe Elements are properly loaded

### Support:
- **Stripe Documentation**: https://stripe.com/docs
- **Stripe Support**: https://support.stripe.com
- **Test Cards**: https://stripe.com/docs/testing

## Next Steps

1. **Set up your Stripe account**
2. **Add your API keys to environment variables**
3. **Configure webhooks**
4. **Test with test cards**
5. **Go live when ready**

The integration is now complete and ready for testing!