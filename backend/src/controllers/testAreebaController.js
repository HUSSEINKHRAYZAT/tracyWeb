const axios = require('axios');

/**
 * Areeba Payment Gateway Test Controller
 * This endpoint captures and returns exactly what data is being sent to Areeba
 */

const AREEBA_API_URL = process.env.AREEBA_API_URL || 'https://bankalfalah.gateway.mastercard.com/api/rest';
const AREEBA_MERCHANT_ID = process.env.AREEBA_MERCHANT_ID || 'TEST_MERCHANT';
const AREEBA_API_PASSWORD = process.env.AREEBA_API_PASSWORD || 'TEST_PASSWORD';
const AREEBA_VERSION = process.env.AREEBA_VERSION || '57';

/**
 * Test Areeba payment creation and show exact request/response data
 */
async function testAreebaPayment(req, res) {
    try {
        const { amount, currency = 'USD', orderNumber, description } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid amount. Amount must be greater than 0.'
            });
        }

        const orderId = orderNumber || `ORD${Date.now()}`;
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Prepare the exact request data that will be sent to Areeba
        const requestData = {
            apiOperation: 'CREATE_CHECKOUT_SESSION',
            order: {
                id: orderId,
                amount: parseFloat(amount).toFixed(2),
                currency: currency,
                description: description || `Order ${orderId}`
            },
            interaction: {
                operation: 'PURCHASE',
                returnUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders.html`,
                cancelUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/checkout.html`
            }
        };

        // Prepare authentication header
        const auth = Buffer.from(`merchant.${AREEBA_MERCHANT_ID}:${AREEBA_API_PASSWORD}`).toString('base64');
        const apiUrl = `${AREEBA_API_URL}/version/${AREEBA_VERSION}/merchant/${AREEBA_MERCHANT_ID}/session`;
        
        const headers = {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        let responseData = null;
        let error = null;
        let httpStatus = null;

        // Make the actual API call to Areeba
        try {
            const response = await axios.post(apiUrl, requestData, { headers });
            
            responseData = response.data;
            httpStatus = response.status;

            // If successful, add checkout URL
            if (response.data.session?.id) {
                responseData.checkoutUrl = `${AREEBA_API_URL}/checkout/version/${AREEBA_VERSION}/checkout.html?session.id=${response.data.session.id}`;
            }

        } catch (apiError) {
            error = {
                message: apiError.message,
                code: apiError.code,
                status: apiError.response?.status,
                statusText: apiError.response?.statusText,
                data: apiError.response?.data
            };
            httpStatus = apiError.response?.status || 500;
        }

        // Return comprehensive test data
        return res.json({
            success: !error,
            timestamp: new Date().toISOString(),
            
            // Configuration info
            config: {
                apiUrl: AREEBA_API_URL,
                merchantId: AREEBA_MERCHANT_ID,
                apiVersion: AREEBA_VERSION,
                passwordConfigured: !!AREEBA_API_PASSWORD && AREEBA_API_PASSWORD !== 'TEST_PASSWORD',
                testMode: AREEBA_API_PASSWORD === 'TEST_PASSWORD' || !AREEBA_API_PASSWORD
            },

            // Exact request details
            requestData: requestData,
            
            // Request headers (with password masked)
            headers: {
                ...headers,
                'Authorization': `Basic ${auth.substring(0, 20)}...` // Masked for security
            },

            // Full URL being called
            endpoint: apiUrl,

            // Response from Areeba
            responseData: responseData || error,
            
            // HTTP status
            httpStatus: httpStatus,

            // Additional info
            notes: error ? [
                'The API call failed. Check the error details above.',
                'If credentials are not configured, this is expected.',
                'Set AREEBA_MERCHANT_ID and AREEBA_API_PASSWORD in your .env file.'
            ] : [
                'The API call was successful!',
                'Session ID can be used to redirect customer to Areeba checkout.',
                `Checkout URL: ${responseData?.checkoutUrl || 'N/A'}`
            ]
        });

    } catch (error) {
        console.error('Test endpoint error:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}

/**
 * Get current Areeba configuration (without sensitive data)
 */
async function getAreebaConfig(req, res) {
    try {
        return res.json({
            success: true,
            config: {
                provider: 'Areeba',
                apiUrl: AREEBA_API_URL,
                merchantId: AREEBA_MERCHANT_ID,
                apiVersion: AREEBA_VERSION,
                passwordConfigured: !!AREEBA_API_PASSWORD && AREEBA_API_PASSWORD !== 'TEST_PASSWORD',
                testMode: AREEBA_API_PASSWORD === 'TEST_PASSWORD' || !AREEBA_API_PASSWORD,
                supportedCurrencies: ['USD', 'LBP', 'EUR'],
                features: {
                    '3DSecure': true,
                    'multiCurrency': true,
                    'refunds': true,
                    'partialRefunds': true
                }
            }
        });
    } catch (error) {
        console.error('Config endpoint error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

module.exports = {
    testAreebaPayment,
    getAreebaConfig
};
