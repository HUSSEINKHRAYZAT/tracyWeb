const Product = require('../models/Product');
const Order = require('../models/Order');
const pool = require('../config/database');
const { sendOrderStatusUpdateEmail } = require('../services/email');
const User = require('../models/User');
const auditLog = require('../services/auditLog');
const { deleteImageFile } = require('../middleware/upload');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * Save base64 image to file system
 */
async function saveBase64Image(base64Data, productName) {
    try {
        // Extract image format and data
        const matches = base64Data.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
        if (!matches) {
            throw new Error('Invalid base64 image format');
        }
        
        const imageType = matches[1].replace('+', ''); // e.g., 'jpeg', 'png', 'webp'
        const imageBuffer = Buffer.from(matches[2], 'base64');
        
        // Generate unique filename
        const hash = crypto.createHash('md5').update(productName + Date.now()).digest('hex');
        const sanitizedName = productName.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30);
        const filename = `${sanitizedName}-${hash}.${imageType}`;
        
        // Ensure uploads/products directory exists
        const uploadsDir = path.join(__dirname, '../../../public/uploads/products');
        await fs.mkdir(uploadsDir, { recursive: true });
        
        // Save file
        const filepath = path.join(uploadsDir, filename);
        await fs.writeFile(filepath, imageBuffer);
        
        // Return relative URL (from public folder perspective)
        return `uploads/products/${filename}`;
    } catch (error) {
        console.error('Failed to save image:', error);
        throw new Error('Failed to save product image');
    }
}

/**
 * Get all products (admin)
 */
exports.listProducts = async (req, res, next) => {
    try {
        const { page = 1, limit = 50, search, category, active } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        const options = {
            search,
            category,
            isActive: active === 'all' ? null : (active === 'false' ? false : true),
            limit: limitNum,
            offset
        };

        const [products, total] = await Promise.all([
            Product.findAll(options),
            Product.count(options)
        ]);

        res.json({
            success: true,
            data: products.map(p => ({
                id: p.id,
                name: p.name,
                slug: p.slug,
                price: parseFloat(p.price),
                stock: p.stock_quantity,
                sku: p.sku,
                isActive: p.is_active,
                isFeatured: p.is_featured,
                category: p.category_name,
                categoryId: p.category_id,
                images: p.images || [],
                createdAt: p.created_at
            })),
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create product (admin)
 */
exports.createProduct = async (req, res, next) => {
    try {
        let productData = {
            ...req.body,
            slug: req.body.slug || req.body.name.toLowerCase().replace(/\s+/g, '-')
        };
        
        // Handle uploaded image file (from multer)
        if (req.file) {
            // File path relative to public directory
            productData.imageUrl = `uploads/products/${req.file.filename}`;
        }
        // Handle base64 image upload (fallback for compatibility)
        else if (req.body.imageUrl && req.body.imageUrl.startsWith('data:image/')) {
            const savedImageUrl = await saveBase64Image(req.body.imageUrl, req.body.name);
            productData.imageUrl = savedImageUrl;
        }

        const product = await Product.create(productData);
        
        // If image was provided, also create product_images entry
        if (productData.imageUrl) {
            await pool.query(
                `INSERT INTO product_images (product_id, url, is_primary, display_order) 
                 VALUES ($1, $2, true, 0)`,
                [product.id, productData.imageUrl]
            );
        }

        // Log product creation
        auditLog.logProductCreate(req, req.user.id, product.id, product).catch(err => {
            console.error('Failed to log product creation:', err);
        });

        res.status(201).json({
            success: true,
            data: { product },
            message: 'Product created successfully'
        });
    } catch (error) {
        // Clean up uploaded file if product creation fails
        if (req.file) {
            deleteImageFile(`uploads/products/${req.file.filename}`).catch(console.error);
        }
        
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({
                success: false,
                error: {
                    code: 'DUPLICATE_PRODUCT',
                    message: 'Product with this slug or SKU already exists'
                }
            });
        }
        next(error);
    }
};

/**
 * Update product (admin)
 */
exports.updateProduct = async (req, res, next) => {
    try {
        // Get old product data for audit log
        const oldProduct = await Product.findById(req.params.id);
        
        let updateData = { ...req.body };
        
        // Handle uploaded image file (from multer)
        if (req.file) {
            // Delete old image if exists and is an uploaded file
            if (oldProduct && oldProduct.image_url) {
                await deleteImageFile(oldProduct.image_url);
            }
            
            // Set new image URL
            updateData.imageUrl = `uploads/products/${req.file.filename}`;
            
            // Update product_images table
            await pool.query(
                `DELETE FROM product_images WHERE product_id = $1`,
                [req.params.id]
            );
            await pool.query(
                `INSERT INTO product_images (product_id, url, is_primary, display_order) 
                 VALUES ($1, $2, true, 0)`,
                [req.params.id, updateData.imageUrl]
            );
        }
        
        const product = await Product.update(req.params.id, updateData);

        if (!product) {
            // Clean up uploaded file if product not found
            if (req.file) {
                deleteImageFile(`uploads/products/${req.file.filename}`).catch(console.error);
            }
            
            return res.status(404).json({
                success: false,
                error: {
                    code: 'PRODUCT_NOT_FOUND',
                    message: 'Product not found'
                }
            });
        }

        // Log product update
        if (oldProduct) {
            auditLog.logProductUpdate(req, req.user.id, product.id, oldProduct, product).catch(err => {
                console.error('Failed to log product update:', err);
            });
        }

        res.json({
            success: true,
            data: { product },
            message: 'Product updated successfully'
        });
    } catch (error) {
        // Clean up uploaded file if update fails
        if (req.file) {
            deleteImageFile(`uploads/products/${req.file.filename}`).catch(console.error);
        }
        next(error);
    }
};

/**
 * Delete product (admin)
 */
exports.deleteProduct = async (req, res, next) => {
    try {
        // Get product data before deletion to get image URL
        const productData = await Product.findById(req.params.id);
        
        const product = await Product.delete(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'PRODUCT_NOT_FOUND',
                    message: 'Product not found'
                }
            });
        }

        // Delete associated image file if it's an uploaded file
        if (productData && productData.image_url) {
            deleteImageFile(productData.image_url).catch(console.error);
        }

        // Log product deletion
        auditLog.logProductDelete(req, req.user.id, product.id, product.name).catch(err => {
            console.error('Failed to log product deletion:', err);
        });

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all orders (admin)
 */
exports.listOrders = async (req, res, next) => {
    try {
        const { page = 1, limit = 50, status, search } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        const [orders, total] = await Promise.all([
            Order.findAll({ limit: limitNum, offset, status, search }),
            Order.count({ status })
        ]);

        res.json({
            success: true,
            data: orders.map(order => ({
                id: order.id,
                orderNumber: order.order_number,
                orderStatus: order.status,
                paymentStatus: order.payment_status,
                customerEmail: order.user_email || order.email,
                customerName: `${order.shipping_first_name || ''} ${order.shipping_last_name || ''}`.trim(),
                customerPhone: order.billing_phone || 'N/A',
                totalCents: order.total_cents,
                itemCount: parseInt(order.item_count),
                createdAt: order.created_at,
                updatedAt: order.updated_at
            })),
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        next(error);
    }
};


/**
 * Get single order (admin)
 */
exports.getOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'ORDER_NOT_FOUND',
                    message: 'Order not found'
                }
            });
        }

        res.json({
            success: true,
            data: {
                order: {
                    id: order.id,
                    orderNumber: order.order_number,
                    orderStatus: order.status,
                    items: order.items,
                    shippingName: `${order.shipping_first_name || ''} ${order.shipping_last_name || ''}`.trim(),
                    shippingEmail: order.email,
                    shippingPhone: order.billing_phone || 'N/A',
                    shippingAddress: order.shipping_address_line1,
                    shippingCity: order.shipping_city,
                    shippingState: order.shipping_state,
                    shippingZip: order.shipping_postal_code,
                    totalCents: order.total_cents,
                    createdAt: order.created_at,
                    updatedAt: order.updated_at
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update order status (admin)
 */
exports.updateOrderStatus = async (req, res, next) => {
    try {
        const { status } = req.body;

        // Get old order status before update
        const oldOrder = await Order.findById(req.params.id);
        if (!oldOrder) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'ORDER_NOT_FOUND',
                    message: 'Order not found'
                }
            });
        }

        const oldStatus = oldOrder.status;
        
        // Update status
        const order = await Order.updateStatus(req.params.id, status);

        // Send status update email if status changed (don't block on this)
        if (oldStatus !== status) {
            User.findById(order.user_id).then(user => {
                if (user) {
                    sendOrderStatusUpdateEmail(order, user, oldStatus, status).catch(err => {
                        console.error('Failed to send status update email:', err);
                    });
                }
            });
        }

        // Log order status update
        auditLog.logOrderStatusUpdate(req, req.user.id, order.id, oldStatus, status).catch(err => {
            console.error('Failed to log order status update:', err);
        });

        res.json({
            success: true,
            data: { order },
            message: 'Order status updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get dashboard analytics (admin)
 */
exports.getAnalytics = async (req, res, next) => {
    try {
        const { period = '30' } = req.query; // days

        const queries = {
            totalSales: `
                SELECT COALESCE(SUM(total_cents), 0) as total
                FROM orders
                WHERE status NOT IN ('cancelled', 'refunded')
                  AND created_at >= CURRENT_TIMESTAMP - INTERVAL '${parseInt(period)} days'
            `,
            orderCount: `
                SELECT COUNT(*) as count
                FROM orders
                WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '${parseInt(period)} days'
            `,
            customerCount: `
                SELECT COUNT(DISTINCT user_id) as count
                FROM orders
                WHERE user_id IS NOT NULL
                  AND created_at >= CURRENT_TIMESTAMP - INTERVAL '${parseInt(period)} days'
            `,
            topProducts: `
                SELECT p.name, p.slug, SUM(oi.quantity) as units_sold,
                       SUM(oi.total_price_cents) as revenue
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                JOIN orders o ON oi.order_id = o.id
                WHERE o.status NOT IN ('cancelled', 'refunded')
                  AND o.created_at >= CURRENT_TIMESTAMP - INTERVAL '${parseInt(period)} days'
                GROUP BY p.id, p.name, p.slug
                ORDER BY units_sold DESC
                LIMIT 10
            `,
            ordersByStatus: `
                SELECT status, COUNT(*) as count
                FROM orders
                WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '${parseInt(period)} days'
                GROUP BY status
            `
        };

        const [totalSales, orderCount, customerCount, topProducts, ordersByStatus] = await Promise.all([
            pool.query(queries.totalSales),
            pool.query(queries.orderCount),
            pool.query(queries.customerCount),
            pool.query(queries.topProducts),
            pool.query(queries.ordersByStatus)
        ]);

        res.json({
            success: true,
            data: {
                period: `${period} days`,
                totalSales: (parseInt(totalSales.rows[0].total) / 100).toFixed(2),
                orderCount: parseInt(orderCount.rows[0].count),
                customerCount: parseInt(customerCount.rows[0].count),
                topProducts: topProducts.rows.map(p => ({
                    name: p.name,
                    slug: p.slug,
                    unitsSold: parseInt(p.units_sold),
                    revenue: (parseInt(p.revenue) / 100).toFixed(2)
                })),
                ordersByStatus: ordersByStatus.rows.reduce((acc, row) => {
                    acc[row.status] = parseInt(row.count);
                    return acc;
                }, {})
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * List all users (admin only)
 */
exports.listUsers = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT 
                id, email, first_name, last_name, role, 
                email_verified, status, created_at
            FROM users
            WHERE deleted_at IS NULL
            ORDER BY created_at DESC
        `);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update user role (admin only, cannot promote to super_admin)
 */
exports.updateUserRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        
        // Security: Only super_admin can promote users, regular admins cannot
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'Only super admins can change user roles'
                }
            });
        }
        
        // Security: Cannot promote to super_admin through this endpoint
        if (role === 'super_admin') {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'Cannot promote users to super_admin role'
                }
            });
        }
        
        // Security: Cannot change your own role
        if (id === req.user.id) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'Cannot change your own role'
                }
            });
        }
        
        // Get current user info
        const currentUser = await pool.query(
            'SELECT id, email, role, first_name, last_name FROM users WHERE id = $1',
            [id]
        );
        
        if (currentUser.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User not found'
                }
            });
        }
        
        const user = currentUser.rows[0];
        
        // Security: Cannot demote super_admin
        if (user.role === 'super_admin') {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'Cannot change super_admin role'
                }
            });
        }
        
        // Update role
        const result = await pool.query(
            'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, role, first_name, last_name',
            [role, id]
        );
        
        // Log the role change
        await auditLog.log({
            userId: req.user.id,
            action: 'USER_ROLE_CHANGED',
            details: {
                targetUserId: id,
                targetEmail: user.email,
                oldRole: user.role,
                newRole: role,
                changedBy: req.user.email
            },
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });
        
        res.json({
            success: true,
            message: 'User role updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        next(error);
    }
};

module.exports = exports;
