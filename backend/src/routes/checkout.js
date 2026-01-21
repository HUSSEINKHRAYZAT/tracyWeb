const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');
const { requireAuth } = require('../middleware/auth');
const { body } = require('express-validator');

// All checkout routes require authentication
router.use(requireAuth);

router.post('/create-payment-intent', [
    body('orderId').isUUID().withMessage('Invalid order ID')
], checkoutController.createPaymentIntent);

router.post('/confirm-payment', [
    body('paymentIntentId').notEmpty().withMessage('Payment intent ID is required')
], checkoutController.confirmPayment);

router.get('/payment-status/:orderId', checkoutController.getPaymentStatus);

module.exports = router;
