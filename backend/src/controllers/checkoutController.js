const Order = require('../models/Order');
const pool = require('../config/database');

// Get payment provider from order's payment method
function getPaymentService(paymentMethod) {
    if (paymentMethod === 'stripe') {
        return require('../services/stripe');
    } else if (paymentMethod === 'whish') {
        return require('../services/whish');
    } else if (paymentMethod === 'cash') {
        return require('../services/cash');
    } else if (paymentMethod === 'areeba') {
        return require('../services/areeba');
    }
    // Default to cash if not specified
    return require('../services/cash');
}

const { sendOrderConfirmationEmail } = require('../services/email');
const User = require('../models/User');

/**
 * Create payment intent for checkout
 */
exports.createPaymentIntent = async (req, res, next) => {
    try {
        const { orderId } = req.body;

        // Get order
        const order = await Order.findById(orderId, req.user.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'ORDER_NOT_FOUND',
                    message: 'Order not found'
                }
            });
        }

        if (order.status !== 'pending') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_ORDER_STATUS',
                    message: 'Order has already been processed'
                }
            });
        }

        // Check if payment_status is already succeeded
        if (order.payment_status === 'succeeded') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'PAYMENT_ALREADY_COMPLETED',
                    message: 'Payment for this order has already been completed'
                }
            });
        }

        // Check if a payment intent already exists for this order
        const existingPayment = await pool.query(
            'SELECT * FROM payments WHERE order_id = $1 AND status = $2',
            [orderId, 'pending']
        );

        // If payment already exists and is pending, return existing payment intent
        if (existingPayment.rows.length > 0) {
            const payment = existingPayment.rows[0];
            return res.json({
                success: true,
                data: {
                    clientSecret: payment.provider_payment_id,
                    paymentIntentId: payment.provider_payment_id,
                    amount: payment.amount_cents / 100,
                    session_id: payment.provider_payment_id,
                    checkout_url: null,
                    payment_url: null
                },
                message: 'Using existing payment intent'
            });
        }

        // Get order to determine payment method
        const orderData = await pool.query('SELECT payment_method FROM orders WHERE id = $1', [orderId]);
        const paymentMethod = orderData.rows[0]?.payment_method || 'cash';
        
        // Get appropriate payment service based on order's payment method
        const paymentService = getPaymentService(paymentMethod);
        const { createPaymentIntent } = paymentService;

        // Create payment intent
        const currency = 'USD'; // Use USD for all payments
        const amount = order.total_cents / 100; // Convert cents to dollars for display
            
        const paymentIntent = await createPaymentIntent(
            amount,
            currency,
            {
                orderId: order.id,
                orderNumber: order.order_number,
                userId: req.user.id
            }
        );

        // Store payment intent in database
        await pool.query(
            `INSERT INTO payments (
                order_id, provider_payment_id, 
                amount_cents, currency, status, payment_method
            ) VALUES ($1, $2, $3, $4, 'pending', $5)`,
            [order.id, paymentIntent.id, order.total_cents, currency, paymentMethod]
        );

        console.log('Payment Intent created:', {
            id: paymentIntent.id,
            checkout_url: paymentIntent.checkout_url,
            payment_url: paymentIntent.payment_url,
            session_id: paymentIntent.session_id,
            paymentMethod: paymentMethod
        });

        res.json({
            success: true,
            data: {
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                amount: amount,
                session_id: paymentIntent.session_id || paymentIntent.id,
                checkout_url: paymentIntent.checkout_url || null,
                payment_url: paymentIntent.payment_url || paymentIntent.checkout_url || null
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Confirm payment and update order
 */
exports.confirmPayment = async (req, res, next) => {
    try {
        const { paymentIntentId } = req.body;

        // Get payment record
        const paymentResult = await pool.query(
            'SELECT * FROM payments WHERE provider_payment_id = $1',
            [paymentIntentId]
        );

        const payment = paymentResult.rows[0];

        if (!payment) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'PAYMENT_NOT_FOUND',
                    message: 'Payment not found'
                }
            });
        }

        // Prevent duplicate payment confirmation
        if (payment.status === 'succeeded') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'PAYMENT_ALREADY_CONFIRMED',
                    message: 'Payment has already been confirmed'
                }
            });
        }

        // Update payment status to succeeded
        await pool.query(
            `UPDATE payments 
             SET status = 'succeeded', completed_at = CURRENT_TIMESTAMP 
             WHERE id = $1`,
            [payment.id]
        );

        // Update order status AND payment_status
        await pool.query(
            `UPDATE orders 
             SET status = 'processing', 
                 payment_status = 'succeeded',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [payment.order_id]
        );

        // Reduce stock quantities now that payment is confirmed
        const orderItemsResult = await pool.query(
            'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
            [payment.order_id]
        );

        for (const item of orderItemsResult.rows) {
            await pool.query(
                'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
                [item.quantity, item.product_id]
            );
        }

        const order = await Order.findById(payment.order_id);
        
        // Send order confirmation email (don't block on this)
        User.findById(req.user.id).then(user => {
            if (user) {
                sendOrderConfirmationEmail(order, user).catch(err => {
                    console.error('Failed to send order confirmation:', err);
                });
            }
        });

        res.json({
            success: true,
            data: {
                order: {
                    id: order.id,
                    orderNumber: order.order_number,
                    status: order.status
                }
            },
            message: 'Payment confirmed successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get payment status
 */
exports.getPaymentStatus = async (req, res, next) => {
    try {
        const { orderId } = req.params;

        const result = await pool.query(
            `SELECT p.*, o.order_number, o.total_cents
             FROM payments p
             JOIN orders o ON p.order_id = o.id
             WHERE p.order_id = $1 AND o.user_id = $2
             ORDER BY p.created_at DESC
             LIMIT 1`,
            [orderId, req.user.id]
        );

        const payment = result.rows[0];

        if (!payment) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'PAYMENT_NOT_FOUND',
                    message: 'No payment found for this order'
                }
            });
        }

        res.json({
            success: true,
            data: {
                payment: {
                    id: payment.id,
                    status: payment.status,
                    amount: (payment.amount_cents / 100).toFixed(2),
                    currency: payment.currency,
                    paidAt: payment.paid_at,
                    orderNumber: payment.order_number
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = exports;
