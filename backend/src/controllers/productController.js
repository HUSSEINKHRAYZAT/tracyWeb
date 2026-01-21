const Product = require('../models/Product');

// Format product for API response
function formatProduct(product) {
    return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: parseFloat(product.price),
        compareAtPrice: product.compare_at_price ? parseFloat(product.compare_at_price) : null,
        stock: product.stock_quantity,
        inStock: product.stock_quantity > 0,
        sku: product.sku,
        isFeatured: product.is_featured,
        isActive: product.is_active,
        category: {
            name: product.category_name,
            slug: product.category_slug
        },
        images: product.images || [],
        createdAt: product.created_at,
        updatedAt: product.updated_at
    };
}

exports.list = async (req, res, next) => {
    try {
        const {
            category,
            search,
            sort = 'created_at',
            page = 1,
            limit = 20,
            featured
        } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        const options = {
            category,
            search,
            sort,
            limit: Math.min(limitNum, 100), // Max 100 items per page
            offset,
            isFeatured: featured === 'true' ? true : undefined
        };

        const [products, total] = await Promise.all([
            Product.findAll(options),
            Product.count({ category, search })
        ]);

        res.json({
            success: true,
            data: products.map(formatProduct),
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

exports.show = async (req, res, next) => {
    try {
        const product = await Product.findBySlug(req.params.slug);

        if (!product) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Product not found'
                }
            });
        }

        res.json({
            success: true,
            data: formatProduct(product)
        });
    } catch (error) {
        next(error);
    }
};

module.exports = exports;
