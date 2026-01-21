const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/auth');
const { validateProduct, validateProductUpdate } = require('../middleware/validators');
const { uploadProductImage } = require('../middleware/upload');
const { body } = require('express-validator');

// All admin routes require admin role
router.use(requireAdmin);

// Products
router.get('/products', adminController.listProducts);
router.post('/products', uploadProductImage, validateProduct, adminController.createProduct);
router.put('/products/:id', uploadProductImage, validateProductUpdate, adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);

// Orders
router.get('/orders', adminController.listOrders);
router.get('/orders/:id', adminController.getOrder);
router.put('/orders/:id/status', [
    body('status')
        .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
        .withMessage('Invalid order status')
], adminController.updateOrderStatus);

// Analytics
router.get('/analytics', adminController.getAnalytics);

// User Management (Super Admin only)
router.get('/users', adminController.listUsers);
router.put('/users/:id/role', [
    body('role')
        .isIn(['customer', 'admin'])
        .withMessage('Invalid role. Allowed: customer, admin')
], adminController.updateUserRole);

module.exports = router;
