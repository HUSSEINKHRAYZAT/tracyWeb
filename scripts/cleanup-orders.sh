#!/bin/bash
# Clear ALL orders from database (DANGEROUS - Use with caution!)

echo "⚠️  WARNING: This will DELETE ALL ORDERS from the database!"
echo "This action CANNOT be undone."
echo ""
read -p "Are you sure you want to continue? (type 'D' to confirm): " confirmation

if [ "$confirmation" != "D" ]; then
    echo "❌ Operation cancelled."
    exit 1
fi

echo ""
echo "🗑️  Deleting all orders..."

# Delete using database connection from .env
PGPASSWORD=TracyPass666 psql -h localhost -p 5433 -U tracyapp -d tracytalkshealth << EOF
-- Delete order items first (foreign key constraint)
DELETE FROM order_items;

-- Delete orders
DELETE FROM orders;

-- Delete payments related to orders
DELETE FROM payments;

-- Reset sequences if needed
SELECT 'Deleted ' || COUNT(*) || ' order items' FROM order_items;
SELECT 'Deleted ' || COUNT(*) || ' orders' FROM orders;
SELECT 'Deleted ' || COUNT(*) || ' payments' FROM payments;
EOF

echo ""
echo "✅ All orders have been deleted at $(date)"
echo "📊 Database cleaned successfully"
