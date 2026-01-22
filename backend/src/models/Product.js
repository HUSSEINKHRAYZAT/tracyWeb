const pool = require('../config/database');

class Product {
    static async findAll(options = {}) {
        const {
            category,
            search,
            isActive = true,
            isFeatured,
            sort = 'created_at',
            order = 'DESC',
            limit = 20,
            offset = 0
        } = options;

        let query = `
            SELECT 
                p.*,
                c.name as category_name,
                c.slug as category_slug,
                json_agg(
                    json_build_object(
                        'url', pi.url,
                        'alt', pi.alt_text,
                        'isPrimary', pi.is_primary
                    ) ORDER BY pi.display_order
                ) FILTER (WHERE pi.id IS NOT NULL) as images
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN product_images pi ON p.id = pi.product_id
            WHERE p.deleted_at IS NULL
        `;

        const params = [];
        let paramCount = 1;

        if (isActive !== null) {
            query += ` AND p.is_active = $${paramCount}`;
            params.push(isActive);
            paramCount++;
        }

        if (category) {
            query += ` AND c.slug = $${paramCount}`;
            params.push(category);
            paramCount++;
        }

        if (search) {
            query += ` AND (p.name ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`;
            params.push(`%${search}%`);
            paramCount++;
        }

        if (isFeatured !== undefined) {
            query += ` AND p.is_featured = $${paramCount}`;
            params.push(isFeatured);
            paramCount++;
        }

        query += ` GROUP BY p.id, c.name, c.slug`;
        
        // Sanitize sort column
        const allowedSortColumns = ['created_at', 'price', 'name', 'stock_quantity'];
        const sortColumn = allowedSortColumns.includes(sort) ? sort : 'created_at';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        
        query += ` ORDER BY p.${sortColumn} ${sortOrder}`;
        query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        return result.rows;
    }

    static async findBySlug(slug) {
        const query = `
            SELECT 
                p.*,
                c.name as category_name,
                c.slug as category_slug,
                json_agg(
                    json_build_object(
                        'url', pi.url,
                        'alt', pi.alt_text,
                        'isPrimary', pi.is_primary
                    ) ORDER BY pi.display_order
                ) FILTER (WHERE pi.id IS NOT NULL) as images
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN product_images pi ON p.id = pi.product_id
            WHERE p.slug = $1 AND p.deleted_at IS NULL
            GROUP BY p.id, c.name, c.slug
        `;

        const result = await pool.query(query, [slug]);
        return result.rows[0] || null;
    }

    static async findById(id) {
        const query = `
            SELECT 
                p.*,
                c.name as category_name,
                c.slug as category_slug,
                json_agg(
                    json_build_object(
                        'url', pi.url,
                        'alt', pi.alt_text,
                        'isPrimary', pi.is_primary
                    ) ORDER BY pi.display_order
                ) FILTER (WHERE pi.id IS NOT NULL) as images
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN product_images pi ON p.id = pi.product_id
            WHERE p.id = $1 AND p.deleted_at IS NULL
            GROUP BY p.id, c.name, c.slug
        `;

        const result = await pool.query(query, [id]);
        return result.rows[0] || null;
    }

    static async count(options = {}) {
        const { category, isActive = true, search } = options;

        let query = 'SELECT COUNT(*) FROM products p WHERE p.deleted_at IS NULL';
        const params = [];
        let paramCount = 1;

        if (isActive !== null) {
            query += ` AND p.is_active = $${paramCount}`;
            params.push(isActive);
            paramCount++;
        }

        if (category) {
            query += ` AND p.category_id = (SELECT id FROM categories WHERE slug = $${paramCount})`;
            params.push(category);
            paramCount++;
        }

        if (search) {
            query += ` AND (p.name ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`;
            params.push(`%${search}%`);
            paramCount++;
        }

        const result = await pool.query(query, params);
        return parseInt(result.rows[0].count);
    }

    static async create(productData) {
        const {
            name,
            slug,
            description,
            categoryId,
            price,
            compareAtPrice,
            sku,
            stockQuantity,
            isActive,
            isFeatured
        } = productData;

        const query = `
            INSERT INTO products (
                name, slug, description, category_id, price, 
                compare_at_price, sku, stock_quantity, is_active, is_featured
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;

        const values = [
            name,
            slug,
            description,
            categoryId,
            price,
            compareAtPrice || null,
            sku || null,
            stockQuantity || 0,
            isActive !== undefined ? isActive : true,
            isFeatured !== undefined ? isFeatured : false
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    static async update(id, productData) {
        // First get current product
        const currentProduct = await this.findById(id);
        if (!currentProduct) return null;

        const {
            name = currentProduct.name,
            slug = currentProduct.slug,
            description = currentProduct.description,
            categoryId = currentProduct.category_id,
            price = currentProduct.price,
            compareAtPrice = currentProduct.compare_at_price,
            sku = currentProduct.sku,
            stockQuantity = currentProduct.stock_quantity,
            isActive = currentProduct.is_active,
            isFeatured = currentProduct.is_featured
        } = productData;

        const query = `
            UPDATE products
            SET name = $1, slug = $2, description = $3, category_id = $4,
                price = $5, compare_at_price = $6, sku = $7, stock_quantity = $8,
                is_active = $9, is_featured = $10, updated_at = CURRENT_TIMESTAMP
            WHERE id = $11 AND deleted_at IS NULL
            RETURNING *
        `;

        const values = [
            name,
            slug,
            description,
            categoryId,
            price,
            compareAtPrice,
            sku,
            stockQuantity,
            isActive,
            isFeatured,
            id
        ];

        const result = await pool.query(query, values);
        return result.rows[0] || null;
    }

    static async delete(id) {
        const query = `
            UPDATE products
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND deleted_at IS NULL
            RETURNING id
        `;

        const result = await pool.query(query, [id]);
        return result.rows[0] || null;
    }

    /**
     * Decrement stock quantity for a product
     * @param {string} id - Product ID
     * @param {number} quantity - Quantity to decrement
     * @param {object} client - Optional database client for transactions
     * @returns {object} Updated product with new stock quantity
     */
    static async decrementStock(id, quantity, client = null) {
        const db = client || pool;
        
        const query = `
            UPDATE products
            SET stock_quantity = stock_quantity - $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND deleted_at IS NULL
            AND stock_quantity >= $2
            RETURNING id, name, stock_quantity
        `;

        const result = await db.query(query, [id, quantity]);
        
        if (!result.rows[0]) {
            throw new Error(`Insufficient stock for product ${id}`);
        }
        
        return result.rows[0];
    }

    /**
     * Increment stock quantity for a product (for refunds/cancellations)
     * @param {string} id - Product ID
     * @param {number} quantity - Quantity to increment
     * @param {object} client - Optional database client for transactions
     * @returns {object} Updated product with new stock quantity
     */
    static async incrementStock(id, quantity, client = null) {
        const db = client || pool;
        
        const query = `
            UPDATE products
            SET stock_quantity = stock_quantity + $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND deleted_at IS NULL
            RETURNING id, name, stock_quantity
        `;

        const result = await db.query(query, [id, quantity]);
        return result.rows[0] || null;
    }
}

module.exports = Product;
