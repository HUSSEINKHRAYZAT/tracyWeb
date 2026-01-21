const express = require('express');
const router = express.Router();
const { testAreebaPayment, getAreebaConfig } = require('../controllers/testAreebaController');

/**
 * Test Areeba Payment Gateway
 * POST /api/test/areeba-payment
 */
router.post('/areeba-payment', testAreebaPayment);

/**
 * Get Areeba Configuration
 * GET /api/test/areeba-config
 */
router.get('/areeba-config', getAreebaConfig);

module.exports = router;
