require('dotenv').config({ path: '../.env' });
const pool = require('../src/config/database');

// No default categories - admins can create them via the admin panel
// Uncomment and modify the categories below if you want to seed initial data
const categories = [
    // {
    //     name: 'Supplements',
    //     slug: 'supplements',
    //     description: 'Premium vitamins, minerals, and nutritional supplements for optimal health',
    //     display_order: 1
    // },
    // {
    //     name: 'Books & Resources',
    //     slug: 'books',
    //     description: 'Educational materials and guides for your wellness journey',
    //     display_order: 2
    // },
    // {
    //     name: 'Wellness Products',
    //     slug: 'wellness',
    //     description: 'Curated products to support your physical and mental wellbeing',
    //     display_order: 3
    // },
];

async function seedCategories() {
    console.log('🔄 Checking categories...\n');
    
    try {
        if (categories.length === 0) {
            console.log('ℹ️  No categories to seed.');
            console.log('💡 Use the admin panel to create categories.');
            console.log('   Navigate to Admin Dashboard → Categories tab');
            process.exit(0);
        }

        let inserted = 0;
        let skipped = 0;

        for (const category of categories) {
            const result = await pool.query(`
                INSERT INTO categories (name, slug, description, display_order, is_active)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (slug) DO NOTHING
                RETURNING id
            `, [category.name, category.slug, category.description, category.display_order, true]);

            if (result.rows.length > 0) {
                console.log(`✓ Created: ${category.name}`);
                inserted++;
            } else {
                console.log(`- Skipped (exists): ${category.name}`);
                skipped++;
            }
        }

        console.log('');
        console.log('='.repeat(50));
        console.log('✅ Category seeding complete!');
        console.log(`   Inserted: ${inserted}`);
        console.log(`   Skipped: ${skipped}`);
        console.log('='.repeat(50));
        
        process.exit(0);
    } catch (error) {
        console.error('');
        console.error('❌ Seeding failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

seedCategories();
