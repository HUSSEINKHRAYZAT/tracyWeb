# Tracy Talks Health - Database Documentation

## Database Configuration

### Current Credentials
- **Database Name:** `tracytalkshealth`
- **Host:** `localhost`
- **Port:** `5433`
- **Username:** `tracyapp`
- **Password:** `TracyPass666`
- **Connection URL:** `postgresql://tracyapp:TracyPass666@localhost:5433/tracytalkshealth`

### Environment Variables (.env)
```env
DATABASE_URL=postgresql://tracyapp:TracyPass666@localhost:5433/tracytalkshealth
```

---

## Quick Access

### Connect to Database
```bash
# Using connection URL
psql postgresql://tracyapp:TracyPass666@localhost:5433/tracytalkshealth

# Using parameters
PGPASSWORD=TracyPass666 psql -h localhost -p 5433 -U tracyapp -d tracytalkshealth

# For system postgres user (no password needed)
sudo -u postgres psql -d tracytalkshealth
```

### List All Tables
```bash
PGPASSWORD=TracyPass666 psql -h localhost -p 5433 -U tracyapp -d tracytalkshealth -c "\dt"
```

### View Table Structure
```bash
PGPASSWORD=TracyPass666 psql -h localhost -p 5433 -U tracyapp -d tracytalkshealth -c "\d users"
```

---

## Database Schema

### Tables Overview

#### 1. **users** - User Accounts
Stores customer and admin accounts.

**Structure:**
```sql
\d users
```

**Common Queries:**
```sql
-- View all users
SELECT id, email, first_name, last_name, role, email_verified, created_at 
FROM users 
ORDER BY created_at DESC;

-- Count users by role
SELECT role, COUNT(*) as count 
FROM users 
GROUP BY role;

-- Find user by email
SELECT * FROM users WHERE email = 'user@example.com';

-- Make user admin
UPDATE users SET role = 'admin' WHERE email = 'user@example.com';
```

#### 2. **categories** - Product Categories
Manages product organization.

**Common Queries:**
```sql
-- View all categories
SELECT * FROM categories ORDER BY display_order;

-- View active categories
SELECT * FROM categories WHERE is_active = true;

-- Count products per category
SELECT c.name, COUNT(p.id) as product_count
FROM categories c
LEFT JOIN products p ON c.id = p.category_id
GROUP BY c.id, c.name;
```

#### 3. **products** - Product Catalog
Main product inventory.

**Common Queries:**
```sql
-- View all products
SELECT id, name, price, category_id, stock_quantity, is_active 
FROM products 
ORDER BY created_at DESC;

-- View products with category names
SELECT p.id, p.name, p.price, c.name as category, p.stock_quantity
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.is_active = true;

-- Low stock products
SELECT name, stock_quantity 
FROM products 
WHERE stock_quantity < 10 
ORDER BY stock_quantity ASC;

-- Out of stock products
SELECT name, category_id 
FROM products 
WHERE stock_quantity = 0;
```

#### 4. **product_images** - Product Photos
Stores product image URLs.

**Common Queries:**
```sql
-- View products with images
SELECT p.name, pi.url, pi.is_primary
FROM products p
LEFT JOIN product_images pi ON p.id = pi.product_id;
```

#### 5. **orders** - Customer Orders
Tracks all customer orders.

**Common Queries:**
```sql
-- Recent orders
SELECT order_number, user_id, total_amount, status, created_at 
FROM orders 
ORDER BY created_at DESC 
LIMIT 20;

-- Orders by status
SELECT status, COUNT(*) as count, SUM(total_amount) as total_revenue
FROM orders
GROUP BY status;

-- Today's orders
SELECT COUNT(*) as orders_today, SUM(total_amount) as revenue_today
FROM orders
WHERE DATE(created_at) = CURRENT_DATE;

-- Pending orders
SELECT order_number, total_amount, created_at
FROM orders
WHERE status = 'pending'
ORDER BY created_at;
```

#### 6. **order_items** - Order Line Items
Individual products in orders.

**Common Queries:**
```sql
-- View order details
SELECT oi.*, p.name as product_name
FROM order_items oi
JOIN products p ON oi.product_id = p.id
WHERE oi.order_id = 'order-uuid-here';
```

#### 7. **carts** - Shopping Carts
Active user shopping carts.

**Common Queries:**
```sql
-- Active carts
SELECT * FROM carts WHERE status = 'active';

-- Cart with items count
SELECT c.user_id, COUNT(ci.id) as items_count
FROM carts c
LEFT JOIN cart_items ci ON c.id = ci.cart_id
GROUP BY c.id, c.user_id;
```

#### 8. **cart_items** - Cart Contents
Products in shopping carts.

#### 9. **payments** - Payment Records
Payment transaction history.

**Common Queries:**
```sql
-- Recent payments
SELECT * FROM payments ORDER BY created_at DESC LIMIT 10;

-- Payment success rate
SELECT 
    status,
    COUNT(*) as count,
    SUM(amount) as total_amount
FROM payments
GROUP BY status;
```

#### 10. **discount_codes** - Promo Codes
Discount and coupon codes.

**Common Queries:**
```sql
-- Active discount codes
SELECT code, discount_type, discount_value, expires_at
FROM discount_codes
WHERE is_active = true;
```

#### 11. **product_variants** - Product Variations
Different versions of products (size, color, etc.).

#### 12. **sessions** - User Sessions
Login session management.

#### 13. **site_settings** - Shop Configuration
Global shop settings (tax, shipping, etc.).

**Common Queries:**
```sql
-- View all settings
SELECT * FROM site_settings;

-- Get specific setting
SELECT value FROM site_settings WHERE key = 'tax_rate';
```

#### 14. **audit_logs** - Activity Tracking
System activity and changes audit trail.

**Common Queries:**
```sql
-- Recent activity
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20;

-- Activity by user
SELECT * FROM audit_logs WHERE user_id = 'user-uuid' ORDER BY created_at DESC;
```

---

## Common Database Operations

### Revenue & Analytics

#### Total Revenue
```sql
SELECT SUM(total_amount) as total_revenue
FROM orders
WHERE status IN ('completed', 'delivered');
```

#### Revenue by Period
```sql
-- Today
SELECT SUM(total_amount) as today_revenue
FROM orders
WHERE DATE(created_at) = CURRENT_DATE;

-- This Week
SELECT SUM(total_amount) as week_revenue
FROM orders
WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE);

-- This Month
SELECT SUM(total_amount) as month_revenue
FROM orders
WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE);

-- This Year
SELECT SUM(total_amount) as year_revenue
FROM orders
WHERE created_at >= DATE_TRUNC('year', CURRENT_DATE);
```

#### Best Selling Products
```sql
SELECT 
    p.name,
    COUNT(oi.id) as times_ordered,
    SUM(oi.quantity) as total_quantity_sold
FROM order_items oi
JOIN products p ON oi.product_id = p.id
GROUP BY p.id, p.name
ORDER BY total_quantity_sold DESC
LIMIT 10;
```

### User Management

#### Find Admin Users
```sql
SELECT email, first_name, last_name, created_at
FROM users
WHERE role = 'admin';
```

#### Promote User to Admin
```sql
UPDATE users 
SET role = 'admin' 
WHERE email = 'user@example.com';
```

#### Delete User
```sql
DELETE FROM users WHERE email = 'user@example.com';
```

### Product Management

#### Add New Category
```sql
INSERT INTO categories (id, name, slug, description, display_order, is_active)
VALUES (
    gen_random_uuid(),
    'New Category',
    'new-category',
    'Category description',
    1,
    true
);
```

#### Update Product Stock
```sql
UPDATE products 
SET stock_quantity = 100 
WHERE id = 'product-uuid';
```

#### Deactivate Product
```sql
UPDATE products 
SET is_active = false 
WHERE id = 'product-uuid';
```

### Order Management

#### Update Order Status
```sql
UPDATE orders 
SET status = 'shipped' 
WHERE order_number = 'ORD-12345';
```

#### Cancel Order
```sql
UPDATE orders 
SET status = 'cancelled' 
WHERE id = 'order-uuid';
```

---

## Database Maintenance

### Backup Database

#### Full Backup
```bash
# Backup to file
PGPASSWORD=TracyPass666 pg_dump -h localhost -p 5433 -U tracyapp tracytalkshealth > backup.sql

# Backup with timestamp
PGPASSWORD=TracyPass666 pg_dump -h localhost -p 5433 -U tracyapp tracytalkshealth > backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
PGPASSWORD=TracyPass666 pg_dump -h localhost -p 5433 -U tracyapp tracytalkshealth | gzip > backup.sql.gz
```

#### Backup Specific Tables
```bash
PGPASSWORD=TracyPass666 pg_dump -h localhost -p 5433 -U tracyapp -t products -t categories tracytalkshealth > products_backup.sql
```

### Restore Database

#### Restore from Backup
```bash
# Restore from SQL file
PGPASSWORD=TracyPass666 psql -h localhost -p 5433 -U tracyapp tracytalkshealth < backup.sql

# Restore from compressed backup
gunzip -c backup.sql.gz | PGPASSWORD=TracyPass666 psql -h localhost -p 5433 -U tracyapp tracytalkshealth
```

### Database Size

#### Check Database Size
```bash
PGPASSWORD=TracyPass666 psql -h localhost -p 5433 -U tracyapp -d tracytalkshealth -c "SELECT pg_size_pretty(pg_database_size('tracytalkshealth'));"
```

#### Check Table Sizes
```bash
PGPASSWORD=TracyPass666 psql -h localhost -p 5433 -U tracyapp -d tracytalkshealth -c "
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

### Performance Monitoring

#### Active Connections
```bash
PGPASSWORD=TracyPass666 psql -h localhost -p 5433 -U tracyapp -d tracytalkshealth -c "
SELECT pid, usename, application_name, client_addr, state, query
FROM pg_stat_activity
WHERE datname = 'tracytalkshealth';
"
```

#### Kill Idle Connections
```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'tracytalkshealth'
AND state = 'idle'
AND state_change < current_timestamp - INTERVAL '10 minutes';
```

---

## Using Node.js for Database Access

### Quick Query Script
```javascript
// scripts/db-query.js
const pool = require('../backend/src/config/database');

async function query() {
    const result = await pool.query('SELECT * FROM users LIMIT 5');
    console.table(result.rows);
    await pool.end();
}

query();
```

### View Users
```bash
cd /home/husseinkhrayzat/web/backend
node -e "
const pool = require('./src/config/database');
(async () => {
  const result = await pool.query('SELECT id, email, first_name, last_name, role FROM users ORDER BY created_at DESC');
  console.table(result.rows);
  process.exit(0);
})();
"
```

### View Products
```bash
cd /home/husseinkhrayzat/web/backend
node -e "
const pool = require('./src/config/database');
(async () => {
  const result = await pool.query('SELECT id, name, price, stock_quantity FROM products');
  console.table(result.rows);
  process.exit(0);
})();
"
```

### View Orders
```bash
cd /home/husseinkhrayzat/web/backend
node -e "
const pool = require('./src/config/database');
(async () => {
  const result = await pool.query('SELECT order_number, total_amount, status, created_at FROM orders ORDER BY created_at DESC LIMIT 10');
  console.table(result.rows);
  process.exit(0);
})();
"
```

---

## Troubleshooting

### Can't Connect?

#### Check PostgreSQL Status
```bash
sudo systemctl status postgresql
```

#### Start PostgreSQL
```bash
sudo systemctl start postgresql
```

#### Check Logs
```bash
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### Permission Denied?

Use system postgres user:
```bash
sudo -u postgres psql -d tracytalkshealth
```

### Wrong Port?

Check which port PostgreSQL is listening on:
```bash
sudo netstat -tlnp | grep postgres
```

### Connection Pool Exhausted?

Check active connections:
```bash
PGPASSWORD=TracyPass666 psql -h localhost -p 5433 -U tracyapp -d tracytalkshealth -c "
SELECT COUNT(*) FROM pg_stat_activity WHERE datname = 'tracytalkshealth';
"
```

---

## Database Tools

### GUI Tools

#### pgAdmin
```bash
# Install
sudo apt install pgadmin4

# Connect with:
Host: localhost
Port: 5433
Database: tracytalkshealth
Username: tracyapp
Password: TracyPass666
```

#### DBeaver
```bash
# Install
sudo snap install dbeaver-ce

# Same connection details as above
```

### Command Line Tools

#### psql (Interactive Mode)
```bash
PGPASSWORD=TracyPass666 psql -h localhost -p 5433 -U tracyapp -d tracytalkshealth
```

Once connected, useful commands:
```sql
\dt              -- List tables
\d users         -- Describe table
\l               -- List databases
\du              -- List users
\q               -- Quit
\?               -- Help
```

---

## Migration & Schema Changes

### Run Migrations
```bash
cd /home/husseinkhrayzat/web/backend
node src/db/migrate.js
```

### Reset Database (Dangerous!)
```bash
# Drop and recreate
sudo -u postgres psql -c "DROP DATABASE IF EXISTS tracytalkshealth;"
sudo -u postgres psql -c "CREATE DATABASE tracytalkshealth;"

# Run migrations
cd /home/husseinkhrayzat/web/backend
node src/db/migrate.js
```

---

## Security Best Practices

### Current Setup
- Database user: `tracyapp` (application-specific user, not postgres superuser)
- Password: Strong password stored in `.env` file
- Port: Custom port `5433` (not default 5432)
- Access: Localhost only (not exposed externally)

### Recommended Actions

1. **Never commit .env file** - Already in .gitignore
2. **Use environment variables** - Already configured
3. **Regular backups** - Set up automated backups
4. **Monitor access logs** - Check audit_logs table regularly
5. **Strong passwords** - Current password is strong
6. **Limit permissions** - tracyapp user has limited permissions

---

## Quick Reference

```bash
# Connect
PGPASSWORD=TracyPass666 psql -h localhost -p 5433 -U tracyapp -d tracytalkshealth

# List tables
\dt

# View data
SELECT * FROM users;

# Count records
SELECT COUNT(*) FROM products;

# Export data
\copy (SELECT * FROM products) TO '/tmp/products.csv' CSV HEADER

# Import data
\copy products FROM '/tmp/products.csv' CSV HEADER

# Quit
\q
```

---

## Support

For issues or questions about the database:
1. Check this documentation first
2. Review logs: `sudo tail -f /var/log/postgresql/postgresql-*.log`
3. Check application logs: `/tmp/backend.log`
4. Verify credentials in `.env` file

---

**Last Updated:** January 2026  
**Database Version:** PostgreSQL (check with `SELECT version();`)
