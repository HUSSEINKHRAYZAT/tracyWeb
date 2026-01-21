# Database Access Guide

## Your Database Configuration
- **Database Name:** `tracytalkshealth`
- **Host:** `localhost`
- **Port:** `5433`
- **Username:** `tracyapp`
- **Password:** `TracyPass666`

## Method 1: Using psql (Command Line) - RECOMMENDED

### Connect to Database
```bash
psql -h localhost -p 5433 -U tracyapp -d tracytalkshealth
```
When prompted, enter password: `TracyPass666`

Or using the connection URL:
```bash
psql postgresql://tracyapp:TracyPass666@localhost:5433/tracytalkshealth
```

### Common psql Commands
Once connected, you can use these commands:

```sql
-- List all tables
\dt

-- Describe a table structure
\d users
\d products
\d orders

-- List all databases
\l

-- Quit psql
\q

-- Show current connection info
\conninfo

-- Execute SQL file
\i /path/to/file.sql
```

### Useful Queries
```sql
-- View all users
SELECT id, email, first_name, last_name, role, email_verified, created_at 
FROM users 
ORDER BY created_at DESC;

-- View all products
SELECT id, name, price, category, stock, created_at 
FROM products 
ORDER BY created_at DESC;

-- View all orders
SELECT id, order_number, user_id, total_amount, status, created_at 
FROM orders 
ORDER BY created_at DESC;

-- Count users by role
SELECT role, COUNT(*) as count 
FROM users 
GROUP BY role;

-- View recent audit logs
SELECT * FROM audit_logs 
ORDER BY created_at DESC 
LIMIT 20;

-- Check product inventory
SELECT name, category, stock, price 
FROM products 
WHERE stock > 0 
ORDER BY stock ASC;
```

## Method 2: Using pgAdmin (GUI Tool)

### Install pgAdmin
```bash
# On Ubuntu/Debian
sudo apt install pgadmin4

# On macOS
brew install --cask pgadmin4
```

### Connect in pgAdmin
1. Open pgAdmin
2. Right-click "Servers" → "Register" → "Server"
3. **General Tab:**
   - Name: `Tracy Talks Health`
4. **Connection Tab:**
   - Host: `localhost`
   - Port: `5433`
   - Database: `tracytalkshealth`
   - Username: `tracyapp`
   - Password: `TracyPass666`
5. Click "Save"

## Method 3: Using DBeaver (Universal Database Tool)

### Install DBeaver
```bash
# Download from: https://dbeaver.io/download/
# Or using snap
sudo snap install dbeaver-ce
```

### Connect in DBeaver
1. Click "New Database Connection"
2. Select "PostgreSQL"
3. Enter connection details:
   - Host: `localhost`
   - Port: `5433`
   - Database: `tracytalkshealth`
   - Username: `tracyapp`
   - Password: `TracyPass666`
4. Test Connection → Finish

## Method 4: Using Node.js Script

Create a file `scripts/db-console.js`:

```javascript
#!/usr/bin/env node
const pool = require('../backend/src/config/database');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🗄️  Tracy Talks Health Database Console');
console.log('=====================================\n');
console.log('Type SQL queries or commands:');
console.log('  .tables - List all tables');
console.log('  .users - Show all users');
console.log('  .products - Show all products');
console.log('  .orders - Show all orders');
console.log('  .quit - Exit\n');

const askQuery = () => {
    rl.question('db> ', async (input) => {
        const query = input.trim();
        
        if (!query) {
            askQuery();
            return;
        }
        
        if (query === '.quit' || query === 'exit') {
            console.log('Goodbye!');
            await pool.end();
            rl.close();
            process.exit(0);
        }
        
        if (query === '.tables') {
            try {
                const result = await pool.query(`
                    SELECT tablename 
                    FROM pg_tables 
                    WHERE schemaname = 'public'
                    ORDER BY tablename
                `);
                console.table(result.rows);
            } catch (error) {
                console.error('Error:', error.message);
            }
            askQuery();
            return;
        }
        
        if (query === '.users') {
            try {
                const result = await pool.query('SELECT id, email, first_name, last_name, role, email_verified FROM users ORDER BY created_at DESC LIMIT 10');
                console.table(result.rows);
            } catch (error) {
                console.error('Error:', error.message);
            }
            askQuery();
            return;
        }
        
        if (query === '.products') {
            try {
                const result = await pool.query('SELECT id, name, category, price, stock FROM products ORDER BY created_at DESC LIMIT 10');
                console.table(result.rows);
            } catch (error) {
                console.error('Error:', error.message);
            }
            askQuery();
            return;
        }
        
        if (query === '.orders') {
            try {
                const result = await pool.query('SELECT id, order_number, user_id, total_amount, status FROM orders ORDER BY created_at DESC LIMIT 10');
                console.table(result.rows);
            } catch (error) {
                console.error('Error:', error.message);
            }
            askQuery();
            return;
        }
        
        // Execute custom SQL
        try {
            const result = await pool.query(query);
            if (result.rows && result.rows.length > 0) {
                console.table(result.rows);
            } else {
                console.log('Query executed successfully. Rows affected:', result.rowCount);
            }
        } catch (error) {
            console.error('Error:', error.message);
        }
        
        askQuery();
    });
};

askQuery();
```

Then make it executable and run:
```bash
chmod +x scripts/db-console.js
node scripts/db-console.js
```

## Method 5: Quick Database Scripts

### View All Users
```bash
cd /home/husseinkhrayzat/web/backend
node -e "
const pool = require('./src/config/database');
(async () => {
  const result = await pool.query('SELECT id, email, first_name, last_name, role, email_verified FROM users ORDER BY created_at DESC');
  console.table(result.rows);
  process.exit(0);
})();
"
```

### View All Products
```bash
cd /home/husseinkhrayzat/web/backend
node -e "
const pool = require('./src/config/database');
(async () => {
  const result = await pool.query('SELECT id, name, category, price, stock FROM products');
  console.table(result.rows);
  process.exit(0);
})();
"
```

### View All Orders
```bash
cd /home/husseinkhrayzat/web/backend
node -e "
const pool = require('./src/config/database');
(async () => {
  const result = await pool.query('SELECT id, order_number, user_id, total_amount, status, created_at FROM orders ORDER BY created_at DESC LIMIT 20');
  console.table(result.rows);
  process.exit(0);
})();
"
```

### Make a User Admin
```bash
sudo ./scripts/promote-admin.sh user@example.com
```

### Delete All Users (DANGEROUS!)
```bash
cd /home/husseinkhrayzat/web/backend
node -e "
const pool = require('./src/config/database');
(async () => {
  const result = await pool.query('DELETE FROM users');
  console.log('✅ Deleted', result.rowCount, 'user(s)');
  process.exit(0);
})();
"
```

## Method 6: Database Backup & Restore

### Backup Database
```bash
# Full database backup
pg_dump -U postgres tracytalkshealth > backup.sql

# Backup with timestamp
pg_dump -U postgres tracytalkshealth > backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
pg_dump -U postgres tracytalkshealth | gzip > backup.sql.gz
```

### Restore Database
```bash
# Restore from backup
psql -U postgres tracytalkshealth < backup.sql

# Restore from compressed backup
gunzip -c backup.sql.gz | psql -U postgres tracytalkshealth
```

## Common Database Tasks

### Reset Database (Start Fresh)
```bash
# Drop and recreate database
sudo -u postgres psql -c "DROP DATABASE IF EXISTS tracytalkshealth;"
sudo -u postgres psql -c "CREATE DATABASE tracytalkshealth;"

# Run migrations
cd /home/husseinkhrayzat/web/backend
node src/db/migrate.js
```

### Check Database Size
```bash
psql -U postgres -d tracytalkshealth -c "
SELECT pg_size_pretty(pg_database_size('tracytalkshealth')) as size;
"
```

### Check Table Sizes
```bash
psql -U postgres -d tracytalkshealth -c "
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

### Check Active Connections
```bash
psql -U postgres -d tracytalkshealth -c "
SELECT pid, usename, application_name, client_addr, state 
FROM pg_stat_activity 
WHERE datname = 'tracytalkshealth';
"
```

## Security Best Practices

### Change Default Password
```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Change password
ALTER USER postgres WITH PASSWORD 'your-strong-password';

# Update .env file
DATABASE_URL=postgresql://postgres:your-strong-password@localhost:5432/tracytalkshealth
```

### Create Application-Specific User
```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create new user
CREATE USER tracytalks_app WITH PASSWORD 'secure-password';

# Grant permissions
GRANT ALL PRIVILEGES ON DATABASE tracytalkshealth TO tracytalks_app;

# Connect to database
\c tracytalkshealth

# Grant table permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tracytalks_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO tracytalks_app;

# Update .env
DATABASE_URL=postgresql://tracytalks_app:secure-password@localhost:5432/tracytalkshealth
```

## Troubleshooting

### Can't Connect?
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### Permission Denied?
```bash
# Ensure your user can access PostgreSQL
sudo -u postgres createuser --interactive

# Or use sudo for psql commands
sudo -u postgres psql -d tracytalkshealth
```

### Connection Pool Errors?
```bash
# Check active connections
psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Kill idle connections
psql -U postgres -c "
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = 'tracytalkshealth' 
AND state = 'idle' 
AND state_change < current_timestamp - INTERVAL '5 minutes';
"
```

## Quick Reference Card

```bash
# Connect
psql -U postgres -d tracytalkshealth

# List tables
\dt

# Describe table
\d table_name

# View users
SELECT * FROM users;

# Count records
SELECT COUNT(*) FROM users;

# Search
SELECT * FROM users WHERE email LIKE '%example%';

# Update
UPDATE users SET role = 'admin' WHERE email = 'user@example.com';

# Delete
DELETE FROM users WHERE id = '123';

# Quit
\q
```

## Resources

- PostgreSQL Documentation: https://www.postgresql.org/docs/
- psql Cheat Sheet: https://www.postgresqltutorial.com/postgresql-cheat-sheet/
- pgAdmin: https://www.pgadmin.org/
- DBeaver: https://dbeaver.io/
