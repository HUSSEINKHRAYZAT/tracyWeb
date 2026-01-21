const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { requireAuth } = require('../middleware/auth');
const { validateOrder } = require('../middleware/validators');

// All order routes require authentication
router.use(requireAuth);

router.post('/', validateOrder, orderController.create);
router.get('/', orderController.list);
router.get('/:id', orderController.show);
router.post('/:id/cancel', orderController.cancel);

module.exports = router;
