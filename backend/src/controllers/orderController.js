const Order = require('../models/Order');
const Product = require('../models/Product');

/**
 * Calculate order totals
 */
function calculateOrderTotals(items) {
    const subtotalCents = items.reduce((sum, item) => sum + (item.priceCents * item.quantity), 0);
    
    // Simple shipping calculation - $5 flat rate, free over $100
    const shippingCents = subtotalCents >= 10000 ? 0 : 500;
    
    // Simple tax calculation - 10% (replace with proper tax calculation)
    const taxCents = Math.round(subtotalCents * 0.10);
    
    const totalCents = subtotalCents + shippingCents + taxCents;

    return { subtotalCents, shippingCents, taxCents, totalCents };
}

/**
 * Format order for response
 */
function formatOrder(order) {
    return {
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        items: order.items || [],
        shippingAddress: {
            firstName: order.shipping_first_name,
            lastName: order.shipping_last_name,
            email: order.email,
            address: order.shipping_address_line1,
            address2: order.shipping_address_line2,
            city: order.shipping_city,
            state: order.shipping_state,
            postalCode: order.shipping_postal_code,
            country: order.shipping_country
        },
        subtotal: (order.subtotal_cents / 100).toFixed(2),
        shipping: (order.shipping_cents / 100).toFixed(2),
        tax: (order.tax_cents / 100).toFixed(2),
        total: (order.total_cents / 100).toFixed(2),
        notes: order.notes,
        createdAt: order.created_at,
        updatedAt: order.updated_at
    };
}

/**
 * Create a new order
 */
exports.create = async (req, res, next) => {
    try {
        const { items, shippingAddress, billingAddress, notes, paymentMethod } = req.body;

        // Validate and fetch products
        const orderItems = [];
        
        for (const item of items) {
            const product = await Product.findById(item.productId);
            
            if (!product) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'PRODUCT_NOT_FOUND',
                        message: `Product ${item.productId} not found`
                    }
                });
            }

            if (!product.is_active) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'PRODUCT_INACTIVE',
                        message: `Product ${product.name} is not available`
                    }
                });
            }

            if (product.stock_quantity < item.quantity) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INSUFFICIENT_STOCK',
                        message: `Insufficient stock for ${product.name}. Available: ${product.stock_quantity}`
                    }
                });
            }

            orderItems.push({
                productId: product.id,
                name: product.name,
                sku: product.sku,
                quantity: item.quantity,
                priceCents: Math.round(parseFloat(product.price) * 100)
            });
        }

        // Calculate totals
        const totals = await calculateOrderTotals(orderItems);

        // Create order
        const order = await Order.create({
            userId: req.user.id,
            items: orderItems,
            shippingAddress,
            billingAddress,
            ...totals,
            notes,
            paymentMethod: paymentMethod || 'cash'
        });

        // Fetch complete order with items
        const completeOrder = await Order.findById(order.id);

        res.status(201).json({
            success: true,
            data: {
                order: formatOrder(completeOrder)
            },
            message: 'Order created successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get user's orders
 */
exports.list = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        const [orders, total] = await Promise.all([
            Order.findByUser(req.user.id, { limit: limitNum, offset, status }),
            Order.count({ userId: req.user.id, status })
        ]);

        res.json({
            success: true,
            data: orders.map(order => ({
                id: order.id,
                orderNumber: order.order_number,
                status: order.status,
                total: (order.total_cents / 100).toFixed(2),
                totalCents: order.total_cents,
                itemCount: parseInt(order.item_count),
                items: order.items || [],
                paymentProvider: order.payment_method ? (order.payment_method === 'cash' ? 'Cash on Delivery' : order.payment_method.toUpperCase()) : 'Cash',
                shippingAddress: {
                    firstName: order.shipping_first_name,
                    lastName: order.shipping_last_name,
                    address: order.shipping_address_line1,
                    address2: order.shipping_address_line2,
                    city: order.shipping_city,
                    state: order.shipping_state,
                    postalCode: order.shipping_postal_code,
                    country: order.shipping_country
                },
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
 * Get single order
 */
exports.show = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id, req.user.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'ORDER_NOT_FOUND',
                    message: 'Order not found'
                }
            });
        }

        // Only show orders with completed payment
        if (order.payment_status !== 'completed') {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'PAYMENT_REQUIRED',
                    message: 'Payment must be completed to view this order'
                }
            });
        }

        res.json({
            success: true,
            data: {
                order: formatOrder(order)
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Cancel order
 */
exports.cancel = async (req, res, next) => {
    try {
        await Order.cancel(req.params.id, req.user.id);

        res.json({
            success: true,
            message: 'Order cancelled successfully'
        });
    } catch (error) {
        if (error.message === 'Order not found') {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'ORDER_NOT_FOUND',
                    message: 'Order not found'
                }
            });
        }

        if (error.message === 'Order cannot be cancelled') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'CANNOT_CANCEL',
                    message: 'This order cannot be cancelled'
                }
            });
        }

        next(error);
    }
};

module.exports = exports;
