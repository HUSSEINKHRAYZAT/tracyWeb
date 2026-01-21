const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { body } = require('express-validator');
const pool = require('../config/database');

// All cart routes require authentication
router.use(requireAuth);

/**
 * GET /api/cart
 * Get user's current cart
 */
router.get('/', async (req, res, next) => {
    try {
        const userId = req.session.userId;
        
        // Get or create cart for user
        let cart = await pool.query(
            `SELECT * FROM carts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
            [userId]
        );
        
        if (cart.rows.length === 0) {
            // Create new cart
            cart = await pool.query(
                `INSERT INTO carts (user_id) VALUES ($1) RETURNING *`,
                [userId]
            );
        }
        
        const cartId = cart.rows[0].id;
        
        // Get cart items with product details
        const items = await pool.query(
            `SELECT 
                ci.id,
                ci.quantity,
                p.id as product_id,
                p.name,
                p.slug,
                p.price,
                p.stock_quantity,
                p.is_active,
                COALESCE(
                    (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1),
                    (SELECT url FROM product_images WHERE product_id = p.id ORDER BY display_order LIMIT 1)
                ) as image_url,
                (ci.quantity * p.price) as line_total
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            WHERE ci.cart_id = $1 AND p.deleted_at IS NULL
            ORDER BY ci.created_at DESC`,
            [cartId]
        );
        
        const subtotal = items.rows.reduce((sum, item) => sum + parseFloat(item.line_total), 0);
        
        res.json({
            success: true,
            data: {
                cartId,
                items: items.rows,
                itemCount: items.rows.reduce((sum, item) => sum + item.quantity, 0),
                subtotal: subtotal.toFixed(2)
            }
        });
        
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/cart/items
 * Add item to cart
 */
router.post('/items', [
    body('productId').isUUID().withMessage('Valid product ID required'),
    body('quantity').isInt({ min: 1, max: 100 }).withMessage('Quantity must be between 1-100')
], async (req, res, next) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.session.userId;
        
        // Get or create cart
        let cart = await pool.query(
            `SELECT * FROM carts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
            [userId]
        );
        
        if (cart.rows.length === 0) {
            cart = await pool.query(
                `INSERT INTO carts (user_id) VALUES ($1) RETURNING *`,
                [userId]
            );
        }
        
        const cartId = cart.rows[0].id;
        
        // Verify product exists and is active
        const product = await pool.query(
            `SELECT * FROM products WHERE id = $1 AND is_active = true AND deleted_at IS NULL`,
            [productId]
        );
        
        if (product.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'PRODUCT_NOT_FOUND',
                    message: 'Product not found or unavailable'
                }
            });
        }
        
        // Check stock
        if (product.rows[0].stock_quantity < quantity) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INSUFFICIENT_STOCK',
                    message: `Only ${product.rows[0].stock_quantity} items in stock`
                }
            });
        }
        
        // Check if item already in cart
        const existingItem = await pool.query(
            `SELECT * FROM cart_items WHERE cart_id = $1 AND product_id = $2`,
            [cartId, productId]
        );
        
        if (existingItem.rows.length > 0) {
            // Update quantity
            await pool.query(
                `UPDATE cart_items SET quantity = quantity + $1, updated_at = NOW() 
                 WHERE cart_id = $2 AND product_id = $3`,
                [quantity, cartId, productId]
            );
        } else {
            // Add new item with current price
            await pool.query(
                `INSERT INTO cart_items (cart_id, product_id, quantity, price_at_add) 
                 VALUES ($1, $2, $3, $4)`,
                [cartId, productId, quantity, product.rows[0].price]
            );
        }
        
        res.json({
            success: true,
            message: 'Item added to cart'
        });
        
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/cart/items/:itemId
 * Update cart item quantity
 */
router.put('/items/:itemId', [
    body('quantity').isInt({ min: 0, max: 100 }).withMessage('Quantity must be between 0-100')
], async (req, res, next) => {
    try {
        const { itemId } = req.params;
        const { quantity } = req.body;
        const userId = req.session.userId;
        
        if (quantity === 0) {
            // Remove item
            await pool.query(
                `DELETE FROM cart_items ci 
                 USING carts c 
                 WHERE ci.cart_id = c.id AND c.user_id = $1 AND ci.id = $2`,
                [userId, itemId]
            );
        } else {
            // Update quantity
            await pool.query(
                `UPDATE cart_items ci 
                 SET quantity = $1, updated_at = NOW()
                 FROM carts c
                 WHERE ci.cart_id = c.id AND c.user_id = $2 AND ci.id = $3`,
                [quantity, userId, itemId]
            );
        }
        
        res.json({
            success: true,
            message: quantity === 0 ? 'Item removed' : 'Cart updated'
        });
        
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/cart/items/:itemId
 * Remove item from cart
 */
router.delete('/items/:itemId', async (req, res, next) => {
    try {
        const { itemId } = req.params;
        const userId = req.session.userId;
        
        await pool.query(
            `DELETE FROM cart_items ci 
             USING carts c 
             WHERE ci.cart_id = c.id AND c.user_id = $1 AND ci.id = $2`,
            [userId, itemId]
        );
        
        res.json({
            success: true,
            message: 'Item removed from cart'
        });
        
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/cart
 * Clear entire cart
 */
router.delete('/', async (req, res, next) => {
    try {
        const userId = req.session.userId;
        
        await pool.query(
            `DELETE FROM cart_items ci
             USING carts c
             WHERE ci.cart_id = c.id AND c.user_id = $1`,
            [userId]
        );
        
        res.json({
            success: true,
            message: 'Cart cleared'
        });
        
    } catch (error) {
        next(error);
    }
});

module.exports = router;
