const express = require('express');
const router = express.Router();
const { requireAuth, attachUser } = require('../middleware/auth');
const pool = require('../config/database');

// Get payment provider from env
const PAYMENT_PROVIDER = process.env.PAYMENT_PROVIDER || 'areeba';

// Load payment service based on provider
let paymentService;
if (PAYMENT_PROVIDER === 'stripe') {
    paymentService = require('../services/stripe');
}

/**
 * Verify Stripe payment session and update order
 * GET /api/payment/verify-stripe-session?session_id=xxx
 */
router.get('/verify-stripe-session', requireAuth, attachUser, async (req, res, next) => {
    try {
        const { session_id } = req.query;

        if (!session_id) {
            return res.status(400).json({
                success: false,
                error: { message: 'Session ID is required' }
            });
        }

        // Get session from Stripe
        const session = await paymentService.getCheckoutSession(session_id);

        if (!session) {
            return res.status(404).json({
                success: false,
                error: { message: 'Session not found' }
            });
        }

        // Get order ID from metadata
        const orderId = session.metadata.orderId;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                error: { message: 'Order ID not found in session' }
            });
        }

        // Verify the order belongs to the user
        const orderCheck = await pool.query(
            'SELECT id, user_id, status, payment_status FROM orders WHERE id = $1',
            [orderId]
        );

        if (orderCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: { message: 'Order not found' }
            });
        }

        const order = orderCheck.rows[0];

        if (order.user_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: { message: 'Unauthorized' }
            });
        }

        // Check if already processed
        if (order.payment_status === 'succeeded') {
            return res.json({
                success: true,
                data: { 
                    orderId: order.id,
                    alreadyProcessed: true,
                    message: 'Payment already confirmed'
                }
            });
        }

        // Update order based on payment status
        if (session.payment_status === 'paid') {
            // Update order status
            await pool.query(
                `UPDATE orders 
                SET status = 'confirmed', 
                    payment_status = 'succeeded',
                    updated_at = NOW()
                WHERE id = $1`,
                [orderId]
            );

            // Update payment record
            await pool.query(
                `UPDATE payments 
                SET status = 'succeeded',
                    provider_payment_id = $1,
                    updated_at = NOW()
                WHERE order_id = $2`,
                [session.payment_intent, orderId]
            );

            // Clear user's cart - need to delete from carts table which cascades to cart_items
            await pool.query(
                `DELETE FROM carts WHERE user_id = $1`,
                [req.user.id]
            );

            return res.json({
                success: true,
                data: {
                    orderId: order.id,
                    paymentStatus: 'succeeded',
                    message: 'Payment confirmed successfully'
                }
            });
        } else {
            return res.json({
                success: false,
                error: {
                    message: 'Payment not completed',
                    paymentStatus: session.payment_status
                }
            });
        }

    } catch (error) {
        console.error('Error verifying Stripe session:', error);
        next(error);
    }
});

module.exports = router;
