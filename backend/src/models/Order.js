const pool = require('../config/database');

class Order {
    /**
     * Create a new order
     */
    static async create(orderData) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            const {
                userId,
                items,
                shippingAddress,
                billingAddress,
                subtotalCents,
                shippingCents,
                taxCents,
                totalCents,
                notes,
                paymentMethod
            } = orderData;

            // Create order
            const orderQuery = `
                INSERT INTO orders (
                    user_id, status, payment_status, email,
                    billing_first_name, billing_last_name, billing_phone,
                    billing_address_line1, billing_address_line2,
                    billing_city, billing_state, billing_postal_code,
                    billing_country,
                    shipping_first_name, shipping_last_name,
                    shipping_address_line1, shipping_address_line2,
                    shipping_city, shipping_state, shipping_postal_code,
                    shipping_country,
                    subtotal_cents, shipping_cents, tax_cents, total_cents,
                    notes, payment_method
                )
                VALUES ($1, 'pending', 'pending', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                        $12, $13, $14, $15, $16, $17, $18, $19,
                        $20, $21, $22, $23, $24, $25)
                RETURNING *
            `;

            const orderValues = [
                userId,
                shippingAddress.email || billingAddress?.email,
                billingAddress?.firstName || shippingAddress.firstName,
                billingAddress?.lastName || shippingAddress.lastName,
                billingAddress?.phone || shippingAddress.phone,
                billingAddress?.address || shippingAddress.address,
                billingAddress?.address2 || shippingAddress.address2 || null,
                billingAddress?.city || shippingAddress.city,
                billingAddress?.state || shippingAddress.state || null,
                billingAddress?.postalCode || shippingAddress.postalCode,
                billingAddress?.country || shippingAddress.country || 'US',
                shippingAddress.firstName,
                shippingAddress.lastName,
                shippingAddress.address,
                shippingAddress.address2 || null,
                shippingAddress.city,
                shippingAddress.state || null,
                shippingAddress.postalCode,
                shippingAddress.country || 'US',
                subtotalCents,
                shippingCents,
                taxCents,
                totalCents,
                notes,
                paymentMethod || 'cash'
            ];

            const orderResult = await client.query(orderQuery, orderValues);
            const order = orderResult.rows[0];

            // Create order items
            for (const item of items) {
                const itemQuery = `
                    INSERT INTO order_items (
                        order_id, product_id, quantity, 
                        unit_price_cents, total_price_cents, product_name, product_sku
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `;

                await client.query(itemQuery, [
                    order.id,
                    item.productId,
                    item.quantity,
                    item.priceCents,
                    item.priceCents * item.quantity,
                    item.name,
                    item.sku || null
                ]);

                // Don't decrease stock yet - wait for payment confirmation
                // Stock will be decreased when payment is confirmed in confirmPayment
            }

            await client.query('COMMIT');
            return order;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Find order by ID
     */
    static async findById(orderId, userId = null) {
        let query = `
            SELECT o.*,
                   json_agg(
                       json_build_object(
                           'id', oi.id,
                           'productId', oi.product_id,
                           'name', oi.product_name,
                           'sku', oi.product_sku,
                           'quantity', oi.quantity,
                           'priceCents', oi.unit_price_cents,
                           'totalPriceCents', oi.total_price_cents
                       ) ORDER BY oi.created_at
                   ) as items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.id = $1
        `;

        const params = [orderId];

        if (userId) {
            query += ' AND o.user_id = $2';
            params.push(userId);
        }

        query += ' GROUP BY o.id';

        const result = await pool.query(query, params);
        return result.rows[0] || null;
    }

    /**
     * Find orders by user
     */
    static async findByUser(userId, options = {}) {
        const { limit = 20, offset = 0, status } = options;

        let query = `
            SELECT o.id, o.order_number, o.status, o.payment_status, o.payment_method, o.total_cents,
                   o.shipping_first_name, o.shipping_last_name,
                   o.shipping_address_line1, o.shipping_address_line2,
                   o.shipping_city, o.shipping_state, 
                   o.shipping_postal_code, o.shipping_country,
                   o.created_at, o.updated_at,
                   COUNT(oi.id) as item_count,
                   json_agg(
                       json_build_object(
                           'id', oi.id,
                           'productId', oi.product_id,
                           'name', oi.product_name,
                           'sku', oi.product_sku,
                           'quantity', oi.quantity,
                           'priceCents', oi.unit_price_cents,
                           'totalPriceCents', oi.total_price_cents
                       ) ORDER BY oi.created_at
                   ) FILTER (WHERE oi.id IS NOT NULL) as items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.user_id = $1 AND o.payment_status = 'succeeded'
        `;

        const params = [userId];
        let paramCount = 2;

        if (status) {
            query += ` AND o.status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }

        query += ` GROUP BY o.id ORDER BY o.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        return result.rows;
    }

    /**
     * Update order status
     */
    static async updateStatus(orderId, status) {
        const query = `
            UPDATE orders 
            SET status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `;

        const result = await pool.query(query, [status, orderId]);
        return result.rows[0] || null;
    }

    /**
     * Cancel order
     */
    static async cancel(orderId, userId = null) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Get order
            const order = await this.findById(orderId, userId);
            if (!order) {
                throw new Error('Order not found');
            }

            if (!['pending', 'processing'].includes(order.status)) {
                throw new Error('Order cannot be cancelled');
            }

            // Restore stock
            for (const item of order.items) {
                await client.query(
                    'UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2',
                    [item.quantity, item.productId]
                );
            }

            // Update order status
            await client.query(
                'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                ['cancelled', orderId]
            );

            await client.query('COMMIT');
            return true;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get all orders (admin)
     */
    static async findAll(options = {}) {
        const { limit = 50, offset = 0, status, search } = options;

        let query = `
            SELECT o.id, o.order_number, o.status, o.payment_status, o.total_cents,
                   o.shipping_first_name, o.shipping_last_name, o.email,
                   o.billing_phone,
                   o.created_at, o.updated_at,
                   u.email as user_email,
                   COUNT(oi.id) as item_count
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE 1=1
        `;

        const params = [];
        let paramCount = 1;

        if (status) {
            query += ` AND o.status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }

        if (search) {
            query += ` AND (o.order_number ILIKE $${paramCount} OR o.shipping_email ILIKE $${paramCount})`;
            params.push(`%${search}%`);
            paramCount++;
        }

        query += ` GROUP BY o.id, u.email ORDER BY o.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        return result.rows;
    }

    /**
     * Count orders
     */
    static async count(options = {}) {
        const { status, userId } = options;

        let query = 'SELECT COUNT(*) FROM orders WHERE payment_status = \'succeeded\'';
        const params = [];
        let paramCount = 1;

        if (status) {
            query += ` AND status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }

        if (userId) {
            query += ` AND user_id = $${paramCount}`;
            params.push(userId);
            paramCount++;
        }

        const result = await pool.query(query, params);
        return parseInt(result.rows[0].count);
    }
}

module.exports = Order;
