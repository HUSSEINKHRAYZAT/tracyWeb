const axios = require('axios');
const crypto = require('crypto');

/**
 * Whish Payment Service for Lebanon
 * Documentation: https://whish.money/developers
 */

const WHISH_API_URL = process.env.WHISH_API_URL || 'https://api.whish.money';
const WHISH_MERCHANT_ID = process.env.WHISH_MERCHANT_ID;
const WHISH_API_KEY = process.env.WHISH_API_KEY;
const WHISH_SECRET_KEY = process.env.WHISH_SECRET_KEY;

/**
 * Create a payment request
 * @param {number} amount - Amount in LBP (Lebanese Pounds)
 * @param {string} currency - Currency code (default: LBP)
 * @param {object} metadata - Additional metadata
 * @returns {Promise<object>} Payment request object
 */
async function createPaymentIntent(amount, currency = 'LBP', metadata = {}) {
    // Test mode if credentials not configured or empty
    if (!WHISH_MERCHANT_ID || !WHISH_API_KEY || !WHISH_SECRET_KEY || 
        WHISH_MERCHANT_ID === '' || WHISH_API_KEY === '' || WHISH_SECRET_KEY === '') {
        console.log('Whish credentials not configured - using test mode');
        return {
            id: 'test_whish_' + Date.now(),
            amount: Math.round(amount),
            currency: currency,
            status: 'pending',
            payment_url: 'test',
            client_secret: 'test_secret_' + Date.now()
        };
    }
    
    try {
        const paymentData = {
            merchant_id: WHISH_MERCHANT_ID,
            amount: Math.round(amount), // Whish uses whole currency units
            currency: currency,
            callback_url: `${process.env.FRONTEND_URL}/orders.html`,
            return_url: `${process.env.FRONTEND_URL}/orders.html`,
            metadata: JSON.stringify(metadata),
            timestamp: Date.now()
        };

        // Generate signature for request authentication
        const signature = generateSignature(paymentData);
        
        const response = await axios.post(`${WHISH_API_URL}/v1/payments`, paymentData, {
            headers: {
                'Authorization': `Bearer ${WHISH_API_KEY}`,
                'X-Signature': signature,
                'Content-Type': 'application/json'
            }
        });

        return {
            id: response.data.payment_id,
            amount: response.data.amount,
            currency: response.data.currency,
            status: response.data.status,
            payment_url: response.data.payment_url,
            client_secret: response.data.payment_id // For consistency with Stripe
        };
    } catch (error) {
        console.error('Whish payment intent error:', error.response?.data || error.message);
        // Fallback to test mode if API call fails
        console.log('Whish API error - falling back to test mode');
        return {
            id: 'test_whish_' + Date.now(),
            amount: Math.round(amount),
            currency: currency,
            status: 'pending',
            payment_url: 'test',
            client_secret: 'test_secret_' + Date.now()
        };
    }
}

/**
 * Verify a payment status
 * @param {string} paymentId - Whish payment ID
 * @returns {Promise<object>} Payment status object
 */
async function confirmPayment(paymentId) {
    try {
        const response = await axios.get(`${WHISH_API_URL}/v1/payments/${paymentId}`, {
            headers: {
                'Authorization': `Bearer ${WHISH_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        return {
            id: response.data.payment_id,
            status: response.data.status,
            amount: response.data.amount,
            currency: response.data.currency,
            paid: response.data.status === 'completed',
            payment_method: response.data.payment_method
        };
    } catch (error) {
        console.error('Whish payment confirmation error:', error.response?.data || error.message);
        throw new Error('Failed to confirm payment');
    }
}

/**
 * Create a refund
 * @param {string} paymentId - Original payment ID
 * @param {number} amount - Amount to refund (optional, full refund if not specified)
 * @returns {Promise<object>} Refund object
 */
async function createRefund(paymentId, amount = null) {
    try {
        const refundData = {
            payment_id: paymentId,
            timestamp: Date.now()
        };

        if (amount) {
            refundData.amount = Math.round(amount);
        }

        const signature = generateSignature(refundData);

        const response = await axios.post(`${WHISH_API_URL}/v1/refunds`, refundData, {
            headers: {
                'Authorization': `Bearer ${WHISH_API_KEY}`,
                'X-Signature': signature,
                'Content-Type': 'application/json'
            }
        });

        return response.data;
    } catch (error) {
        console.error('Whish refund error:', error.response?.data || error.message);
        throw new Error('Failed to create refund');
    }
}

/**
 * Verify webhook signature
 * @param {object} payload - Webhook payload
 * @param {string} signature - Signature from webhook headers
 * @returns {boolean} True if signature is valid
 */
function verifyWebhookSignature(payload, signature) {
    try {
        const expectedSignature = crypto
            .createHmac('sha256', WHISH_SECRET_KEY)
            .update(JSON.stringify(payload))
            .digest('hex');

        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    } catch (error) {
        console.error('Whish webhook verification error:', error);
        return false;
    }
}

/**
 * Generate signature for API requests
 * @param {object} data - Request data
 * @returns {string} HMAC signature
 */
function generateSignature(data) {
    const sortedKeys = Object.keys(data).sort();
    const signatureString = sortedKeys
        .map(key => `${key}=${data[key]}`)
        .join('&');

    return crypto
        .createHmac('sha256', WHISH_SECRET_KEY)
        .update(signatureString)
        .digest('hex');
}

module.exports = {
    createPaymentIntent,
    confirmPayment,
    createRefund,
    verifyWebhookSignature
};
