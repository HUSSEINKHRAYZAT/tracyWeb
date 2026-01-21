const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { requireAuth, requireAdmin, attachUser } = require('../middleware/auth');

// Get all categories (public - only active)
router.get('/', async (req, res, next) => {
    try {
        const query = `
            SELECT 
                c.id,
                c.name,
                c.slug,
                c.description,
                c.display_order,
                COUNT(p.id) as product_count
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id AND p.deleted_at IS NULL AND p.is_active = true
            WHERE c.is_active = true
            GROUP BY c.id, c.name, c.slug, c.description, c.display_order
            ORDER BY c.display_order, c.name
        `;

        const result = await pool.query(query);

        res.json({
            success: true,
            data: result.rows.map(cat => ({
                id: cat.id,
                name: cat.name,
                slug: cat.slug,
                description: cat.description,
                display_order: cat.display_order,
                is_active: true,
                productCount: parseInt(cat.product_count)
            }))
        });
    } catch (error) {
        next(error);
    }
});

// Get all categories for admin (includes inactive)
router.get('/admin/all', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const query = `
            SELECT 
                c.id,
                c.name,
                c.slug,
                c.description,
                c.display_order,
                c.is_active,
                c.created_at,
                c.updated_at,
                COUNT(p.id) as product_count
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id AND p.deleted_at IS NULL
            GROUP BY c.id, c.name, c.slug, c.description, c.display_order, c.is_active, c.created_at, c.updated_at
            ORDER BY c.display_order, c.name
        `;

        const result = await pool.query(query);

        res.json({
            success: true,
            data: result.rows.map(cat => ({
                id: cat.id,
                name: cat.name,
                slug: cat.slug,
                description: cat.description,
                display_order: cat.display_order,
                is_active: cat.is_active,
                product_count: parseInt(cat.product_count),
                created_at: cat.created_at,
                updated_at: cat.updated_at
            }))
        });
    } catch (error) {
        next(error);
    }
});

// Get single category
router.get('/:id', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const result = await pool.query(
            'SELECT * FROM categories WHERE id = $1',
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        next(error);
    }
});

// Create category
router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const { name, slug, description, display_order, is_active } = req.body;

        // Check if slug already exists
        const existing = await pool.query(
            'SELECT id FROM categories WHERE slug = $1',
            [slug]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'A category with this slug already exists'
            });
        }

        const result = await pool.query(
            `INSERT INTO categories (name, slug, description, display_order, is_active)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [name, slug, description || null, display_order || 1, is_active !== false]
        );

        res.json({
            success: true,
            message: 'Category created successfully',
            data: result.rows[0]
        });
    } catch (error) {
        next(error);
    }
});

// Update category
router.put('/:id', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const { name, slug, description, display_order, is_active } = req.body;

        // Check if slug is taken by another category
        const existing = await pool.query(
            'SELECT id FROM categories WHERE slug = $1 AND id != $2',
            [slug, req.params.id]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'A category with this slug already exists'
            });
        }

        const result = await pool.query(
            `UPDATE categories 
             SET name = $1, slug = $2, description = $3, display_order = $4, is_active = $5, updated_at = CURRENT_TIMESTAMP
             WHERE id = $6
             RETURNING *`,
            [name, slug, description, display_order, is_active, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.json({
            success: true,
            message: 'Category updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        next(error);
    }
});

// Delete category
router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        // Check if category has products
        const products = await pool.query(
            'SELECT COUNT(*) as count FROM products WHERE category_id = $1 AND deleted_at IS NULL',
            [req.params.id]
        );

        if (parseInt(products.rows[0].count) > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete category with existing products. Please reassign or delete the products first.'
            });
        }

        const result = await pool.query(
            'DELETE FROM categories WHERE id = $1 RETURNING *',
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
