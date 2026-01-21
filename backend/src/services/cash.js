/**
 * Cash on Delivery Payment Service
 * For Lebanon and other regions where COD is preferred
 */

/**
 * Create a payment intent for Cash on Delivery
 * @param {number} amount - Amount to be paid in USD
 * @param {string} currency - Currency code (default: USD)
 * @param {object} metadata - Additional metadata
 * @returns {Promise<object>} Payment intent object
 */
async function createPaymentIntent(amount, currency = 'USD', metadata = {}) {
    try {
        // For COD, we just create a pending payment record
        const paymentId = `cod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        return {
            id: paymentId,
            amount: amount,
            currency: currency,
            status: 'pending',
            payment_method: 'cash_on_delivery',
            client_secret: paymentId, // For consistency
            metadata: metadata
        };
    } catch (error) {
        console.error('COD payment intent error:', error);
        throw new Error('Failed to create payment');
    }
}

/**
 * Confirm a Cash on Delivery payment
 * @param {string} paymentId - Payment ID
 * @returns {Promise<object>} Payment confirmation object
 */
async function confirmPayment(paymentId) {
    try {
        // For COD, payment is confirmed when cash is received
        // This would typically be called by admin after delivery
        return {
            id: paymentId,
            status: 'pending', // Will be 'completed' when cash received
            payment_method: 'cash_on_delivery',
            paid: false // Will be true when confirmed by admin
        };
    } catch (error) {
        console.error('COD payment confirmation error:', error);
        throw new Error('Failed to confirm payment');
    }
}

/**
 * Mark COD payment as completed (called by admin after receiving cash)
 * @param {string} paymentId - Payment ID
 * @returns {Promise<object>} Updated payment object
 */
async function markAsCompleted(paymentId) {
    return {
        id: paymentId,
        status: 'completed',
        payment_method: 'cash_on_delivery',
        paid: true,
        completed_at: new Date().toISOString()
    };
}

/**
 * No refunds for COD - cash is returned directly
 */
async function createRefund(paymentId, amount = null) {
    return {
        id: `refund_${paymentId}`,
        status: 'manual_refund_required',
        message: 'Cash refunds must be processed manually'
    };
}

module.exports = {
    createPaymentIntent,
    confirmPayment,
    markAsCompleted,
    createRefund
};
