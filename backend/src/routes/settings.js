const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Public routes (must come before authentication middleware)
router.get('/shop-config', settingsController.getShopConfig);

// Apply authentication for all routes below
router.use(requireAuth);
router.use(requireAdmin);

// Admin routes
router.get('/', settingsController.getSettings);
router.get('/:key', settingsController.getSetting);
router.put('/:key', settingsController.updateSetting);

module.exports = router;
