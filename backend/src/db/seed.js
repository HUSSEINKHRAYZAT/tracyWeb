const pool = require('./pool');
const fallbackProducts = require('../data/products.json');

function mapProduct(product) {
    return {
        id: product.id,
        name: product.name,
        description: product.description || '',
        priceCents: Math.round(Number(product.price || 0) * 100),
        category: product.category || 'general',
        imageUrl: product.image || null
    };
}

async function seedProducts(client) {
    const result = await client.query('SELECT COUNT(*)::int AS count FROM products');
    if (result.rows[0].count > 0) {
        console.log('Products already seeded, skipping.');
        return;
    }

    const values = fallbackProducts.map(mapProduct);
    if (values.length === 0) {
        console.log('No fallback products to seed.');
        return;
    }

    const insertSql = `
        INSERT INTO products (id, name, description, price_cents, category, image_url, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, TRUE)
        ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name,
            description = EXCLUDED.description,
            price_cents = EXCLUDED.price_cents,
            category = EXCLUDED.category,
            image_url = EXCLUDED.image_url,
            is_active = TRUE
    `;

    for (const product of values) {
        await client.query(insertSql, [
            product.id,
            product.name,
            product.description,
            product.priceCents,
            product.category,
            product.imageUrl
        ]);
    }

    console.log(`Seeded ${values.length} products.`);
}

async function run() {
    const client = await pool.connect();
    try {
        await seedProducts(client);
    } finally {
        client.release();
    }
}

run()
    .catch(err => {
        console.error('Seed failed:', err.message);
        process.exitCode = 1;
    })
    .finally(() => pool.end());
