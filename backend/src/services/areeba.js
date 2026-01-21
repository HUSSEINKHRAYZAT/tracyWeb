const axios = require('axios');
const crypto = require('crypto');

/**
 * Areeba Payment Service for Lebanon and Middle East
 * Documentation: https://www.areeba.com/developers
 */

const AREEBA_API_URL = process.env.AREEBA_API_URL || 'https://bankalfalah.gateway.mastercard.com/api/rest';
const AREEBA_MERCHANT_ID = process.env.AREEBA_MERCHANT_ID;
const AREEBA_API_PASSWORD = process.env.AREEBA_API_PASSWORD;
const AREEBA_VERSION = process.env.AREEBA_VERSION || '57';

/**
 * Create a checkout session
 * @param {number} amount - Amount in USD (dollars)
 * @param {string} currency - Currency code (USD, LBP, etc.)
 * @param {object} metadata - Additional metadata
 * @returns {Promise<object>} Session object
 */
async function createPaymentIntent(amount, currency = 'USD', metadata = {}) {
    try {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const orderId = metadata.orderNumber || `order_${Date.now()}`;
        
        const requestData = {
            apiOperation: 'CREATE_CHECKOUT_SESSION',
            order: {
                id: orderId,
                amount: amount.toFixed(2),
                currency: currency,
                description: `Order ${metadata.orderNumber || orderId}`
            },
            interaction: {
                operation: 'PURCHASE',
                returnUrl: `${process.env.FRONTEND_URL}/orders.html`,
                cancelUrl: `${process.env.FRONTEND_URL}/checkout.html`
            }
        };

        const auth = Buffer.from(`merchant.${AREEBA_MERCHANT_ID}:${AREEBA_API_PASSWORD}`).toString('base64');
        
        const response = await axios.post(
            `${AREEBA_API_URL}/version/${AREEBA_VERSION}/merchant/${AREEBA_MERCHANT_ID}/session`,
            requestData,
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            id: response.data.session.id || sessionId,
            amount: amount,
            currency: currency,
            status: 'pending',
            session_id: response.data.session.id,
            checkout_url: `${AREEBA_API_URL}/checkout/version/${AREEBA_VERSION}/checkout.html?session.id=${response.data.session.id}`,
            client_secret: response.data.session.id // For consistency
        };
    } catch (error) {
        console.error('Areeba payment session error:', error.response?.data || error.message);
        
        // If API fails, create a manual session for testing
        const fallbackSessionId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        return {
            id: fallbackSessionId,
            amount: amount,
            currency: currency,
            status: 'pending',
            session_id: fallbackSessionId,
            checkout_url: null, // Will use embedded form instead
            client_secret: fallbackSessionId,
            test_mode: true
        };
    }
}

/**
 * Verify a payment status
 * @param {string} sessionId - Areeba session ID
 * @returns {Promise<object>} Payment status object
 */
async function confirmPayment(sessionId) {
    try {
        const auth = Buffer.from(`merchant.${AREEBA_MERCHANT_ID}:${AREEBA_API_PASSWORD}`).toString('base64');
        
        const response = await axios.get(
            `${AREEBA_API_URL}/version/${AREEBA_VERSION}/merchant/${AREEBA_MERCHANT_ID}/session/${sessionId}`,
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const status = response.data.status;
        
        return {
            id: sessionId,
            status: status,
            amount: response.data.order?.amount,
            currency: response.data.order?.currency,
            paid: status === 'CAPTURED' || status === 'APPROVED',
            payment_method: 'card'
        };
    } catch (error) {
        console.error('Areeba payment confirmation error:', error.response?.data || error.message);
        
        // Return pending status if verification fails
        return {
            id: sessionId,
            status: 'pending',
            paid: false,
            payment_method: 'card'
        };
    }
}

/**
 * Create a refund
 * @param {string} transactionId - Original transaction ID
 * @param {number} amount - Amount to refund (optional)
 * @returns {Promise<object>} Refund object
 */
async function createRefund(transactionId, amount = null) {
    try {
        const auth = Buffer.from(`merchant.${AREEBA_MERCHANT_ID}:${AREEBA_API_PASSWORD}`).toString('base64');
        
        const refundData = {
            apiOperation: 'REFUND',
            transaction: {
                amount: amount ? amount.toFixed(2) : undefined
            }
        };

        const response = await axios.put(
            `${AREEBA_API_URL}/version/${AREEBA_VERSION}/merchant/${AREEBA_MERCHANT_ID}/order/${transactionId}/transaction/refund`,
            refundData,
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('Areeba refund error:', error.response?.data || error.message);
        throw new Error('Failed to create refund');
    }
}

/**
 * Verify webhook signature (if Areeba sends webhooks)
 * @param {object} payload - Webhook payload
 * @param {string} signature - Signature from webhook headers
 * @returns {boolean} True if signature is valid
 */
function verifyWebhookSignature(payload, signature) {
    try {
        // Areeba webhook verification logic
        // This depends on Areeba's implementation
        const expectedSignature = crypto
            .createHmac('sha256', AREEBA_API_PASSWORD)
            .update(JSON.stringify(payload))
            .digest('hex');

        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    } catch (error) {
        console.error('Areeba webhook verification error:', error);
        return false;
    }
}

module.exports = {
    createPaymentIntent,
    confirmPayment,
    createRefund,
    verifyWebhookSignature
};
