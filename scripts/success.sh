#!/bin/bash
# Mark ALL orders as successfully paid and completed

echo "✅ Marking all orders as successfully paid..."
echo ""
read -p "Continue? (y/n): " confirmation

if [ "$confirmation" != "y" ] && [ "$confirmation" != "Y" ]; then
    echo "❌ Operation cancelled."
    exit 1
fi

echo ""
echo "💰 Updating all orders to paid status..."

# Update orders using database connection from .env
PGPASSWORD=TracyPass666 psql -h localhost -p 5433 -U tracyapp -d tracytalkshealth << EOF
-- Update all orders to succeeded payment status
UPDATE orders 
SET 
    status = 'delivered',
    payment_status = 'succeeded',
    updated_at = NOW()
WHERE status != 'cancelled';

-- Update all payments to completed
UPDATE payments 
SET 
    status = 'completed',
    updated_at = NOW()
WHERE status != 'failed';

-- Show results
SELECT 
    payment_status,
    status,
    COUNT(*) as count
FROM orders
GROUP BY payment_status, status;
EOF

echo ""
echo "✅ All orders marked as successfully paid at $(date)"
echo "📊 Orders should now appear on the orders page"
