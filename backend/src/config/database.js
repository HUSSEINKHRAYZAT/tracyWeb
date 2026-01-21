const { Pool } = require('pg');

// Parse connection URL or use explicit config
const dbConfig = process.env.DATABASE_URL 
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? {
            rejectUnauthorized: true
        } : false
    }
    : {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'tracytalkshealth',
        password: process.env.DB_PASSWORD || 'postgres',
        port: process.env.DB_PORT || 5432,
        ssl: process.env.NODE_ENV === 'production' ? {
            rejectUnauthorized: true
        } : false
    };

const pool = new Pool({
    ...dbConfig,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
});

pool.on('error', (err) => {
    console.error('Unexpected database error', err);
    process.exit(-1);
});

// Test connection on startup
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Database connection failed:', err);
        process.exit(-1);
    } else {
        console.log('✓ Database connected successfully');
    }
});

module.exports = pool;
