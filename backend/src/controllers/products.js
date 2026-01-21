const pool = require('../db/pool');
const fallbackProducts = require('../data/products.json');

async function getProductImages(productId) {
    const result = await pool.query(
        `SELECT url, is_primary, display_order 
         FROM product_images 
         WHERE product_id = $1 
         ORDER BY display_order, is_primary DESC`,
        [productId]
    );
    return result.rows;
}

function mapDbProduct(row, images = []) {
    return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        price: Number(row.price),
        category: row.category,
        category_name: row.category_name,
        category_slug: row.category_slug,
        description: row.description,
        image_url: row.primary_image_url || row.first_image_url || 'images/placeholder.avif',
        images: images.length > 0 ? images : (row.primary_image_url || row.first_image_url ? [{ url: row.primary_image_url || row.first_image_url, is_primary: true, display_order: 0 }] : []),
        stock_quantity: row.stock_quantity || 0,
        is_featured: row.is_featured
    };
}

async function listProducts(req, res, next) {
    try {
        const result = await pool.query(`
            SELECT p.id, p.name, p.slug, p.description, p.price, p.stock_quantity, p.is_featured,
                   p.category_id as category,
                   c.name as category_name, c.slug as category_slug,
                   (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as primary_image_url,
                   (SELECT url FROM product_images WHERE product_id = p.id ORDER BY display_order LIMIT 1) as first_image_url
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.is_active = true AND p.deleted_at IS NULL 
            ORDER BY p.created_at DESC
        `);
        
        // Fetch images for all products
        const imagesResult = await pool.query(`
            SELECT product_id, url, is_primary, display_order
            FROM product_images
            ORDER BY product_id, display_order, is_primary DESC
        `);
        
        // Group images by product_id
        const imagesByProduct = {};
        imagesResult.rows.forEach(img => {
            if (!imagesByProduct[img.product_id]) {
                imagesByProduct[img.product_id] = [];
            }
            imagesByProduct[img.product_id].push({
                url: img.url,
                is_primary: img.is_primary,
                display_order: img.display_order
            });
        });
        
        const products = result.rows.map(row => mapDbProduct(row, imagesByProduct[row.id] || []));
        return res.json({ products });
    } catch (err) {
        if (process.env.ALLOW_FALLBACK_DATA === 'true') {
            return res.json({ products: fallbackProducts, fallback: true });
        }
        return next(err);
    }
}

async function getProductById(req, res, next) {
    const productId = req.params.id; // UUIDs are strings

    try {
        const result = await pool.query(`
            SELECT p.id, p.name, p.slug, p.description, p.price, p.stock_quantity,
                   p.category_id as category,
                   c.name as category_name, c.slug as category_slug,
                   (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as primary_image_url,
                   (SELECT url FROM product_images WHERE product_id = p.id ORDER BY display_order LIMIT 1) as first_image_url
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = $1 AND p.is_active = true AND p.deleted_at IS NULL
        `, [productId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: { message: 'Product not found' } });
        }

        // Fetch images for this product
        const images = await getProductImages(productId);
        
        return res.json({ product: mapDbProduct(result.rows[0], images) });
    } catch (err) {
        if (process.env.ALLOW_FALLBACK_DATA === 'true') {
            const fallback = fallbackProducts.find(item => item.id === productId);
            if (!fallback) {
                return res.status(404).json({ error: { message: 'Product not found' } });
            }
            return res.json({ product: fallback, fallback: true });
        }
        return next(err);
    }
}

module.exports = {
    listProducts,
    getProductById
};
