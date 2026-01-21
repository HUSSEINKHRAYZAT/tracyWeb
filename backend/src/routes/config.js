const express = require('express');
const router = express.Router();

/**
 * Get public configuration
 */
router.get('/', (req, res) => {
    res.json({
        success: true,
        data: {
            areeba: {
                merchantId: process.env.AREEBA_MERCHANT_ID || ''
            },
            whish: {
                merchantId: process.env.WHISH_MERCHANT_ID || ''
            }
        }
    });
});

module.exports = router;
