require('dotenv').config({ path: '../.env' });
const pool = require('../src/config/database');

// No demo products - use admin panel to add products
const products = [];

async function migrateProducts() {
    console.log('ℹ️  No demo products to migrate.');
    console.log('💡 Use the admin panel to add products to your store.');
    process.exit(0);
}

migrateProducts();
