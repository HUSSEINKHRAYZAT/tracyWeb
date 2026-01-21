const fs = require('fs');
const path = require('path');

const pool = require('./pool');

const migrationsDir = path.join(__dirname, 'migrations');

function loadMigrations() {
    return fs.readdirSync(migrationsDir)
        .filter(name => name.endsWith('.sql'))
        .sort();
}

async function ensureMigrationsTable(client) {
    await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            filename TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);
}

async function getAppliedMigrations(client) {
    const result = await client.query('SELECT filename FROM schema_migrations ORDER BY filename ASC');
    return new Set(result.rows.map(row => row.filename));
}

async function applyMigration(client, filename) {
    const filePath = path.join(migrationsDir, filename);
    const sql = fs.readFileSync(filePath, 'utf8');

    await client.query('BEGIN');
    try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
        await client.query('COMMIT');
        console.log(`Applied ${filename}`);
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    }
}

async function run() {
    const client = await pool.connect();
    try {
        await ensureMigrationsTable(client);
        const applied = await getAppliedMigrations(client);
        const migrations = loadMigrations();

        for (const filename of migrations) {
            if (!applied.has(filename)) {
                await applyMigration(client, filename);
            }
        }

        console.log('Migrations complete');
    } finally {
        client.release();
    }
}

run()
    .catch(err => {
        console.error('Migration failed:', err.message);
        process.exitCode = 1;
    })
    .finally(() => pool.end());
