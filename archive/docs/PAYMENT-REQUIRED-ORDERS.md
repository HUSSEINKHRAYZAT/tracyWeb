# Payment-Required Order System

## Overview
This system ensures that **no order is completed without successful payment**. Payment is now the most mandatory part of the order process.

## How It Works

### 1. Order Creation Flow
1. Customer adds items to cart
2. Customer proceeds to checkout and fills shipping information
3. **Order is created with `status='pending'` and `payment_status='pending'`**
4. Payment intent is created immediately
5. Customer **must complete payment** to finalize the order

### 2. Payment Requirement
- Orders with `payment_status='pending'` are **NOT confirmed**
- Customers cannot view order details until payment is completed
- Only orders with `payment_status='completed'` are visible in order history
- Stock is only reduced after successful payment

### 3. Payment Status Tracking
Each order has two status fields:
- **`status`**: pending → processing → shipped → delivered (order lifecycle)
- **`payment_status`**: pending → completed (payment lifecycle)

### 4. Abandoned Order Cleanup
Orders that remain unpaid for **24 hours** are automatically:
- Cancelled (status set to 'cancelled')
- Marked with cancellation reason: "Payment not completed within 24 hours"
- Pending payments are marked as 'failed'

## Security Features

### Backend Validations
1. **Duplicate Payment Prevention**: Cannot create multiple payment intents for same order
2. **Payment Verification**: Order status only updates after payment confirmation
3. **Stock Protection**: Stock only decreases after payment succeeds
4. **Access Control**: Users cannot view orders without completed payment

### Frontend Indicators
1. **Payment Required Notice**: Prominent warning shown during checkout
2. **Payment Status Badge**: Admin panel shows "✓ Paid" or "⚠ Unpaid" for each order
3. **Order Visibility**: Unpaid orders don't appear in customer order history

## Admin Panel Features

### Order List View
- Shows payment status badge for each order
- Green "✓ Paid" for completed payments
- Red "⚠ Unpaid" for pending payments
- Phone number displayed for all orders

### Order Details Modal
- Customer phone number included
- Payment status visible
- Full order information accessible

## Automated Cleanup

### Running Cleanup Manually
```bash
# From project root
./scripts/cleanup-orders.sh

# Or directly with node
node backend/src/jobs/cleanupAbandonedOrders.js
```

### Setting Up Automatic Cleanup (Cron Job)
Add to crontab to run daily at 2 AM:
```bash
# Edit crontab
crontab -e

# Add this line:
0 2 * * * /home/husseinkhrayzat/web/scripts/cleanup-orders.sh >> /home/husseinkhrayzat/web/logs/cleanup.log 2>&1
```

## API Endpoints

### Create Payment Intent
```
POST /api/v1/checkout/payment-intent
Body: { "orderId": "uuid" }
```
- Creates payment intent for order
- Returns payment provider details
- Validates order status and payment status

### Confirm Payment
```
POST /api/v1/checkout/confirm-payment
Body: { "paymentIntentId": "provider_payment_id" }
```
- Marks payment as completed
- Updates order status to 'processing'
- Sets payment_status to 'completed'
- Reduces product stock

### Get Orders (Customer)
```
GET /api/v1/orders
```
- Only returns orders with `payment_status='completed'`
- Filters out unpaid orders automatically

## Payment Providers Supported
- ✅ **Stripe**: Card payments with payment intents
- ✅ **Whish**: Redirect to Whish payment gateway
- ✅ **Areeba**: Redirect to Areeba hosted checkout
- ❌ **Cash on Delivery**: Disabled (payment required)

## Database Schema

### Orders Table
```sql
payment_status payment_status DEFAULT 'pending' NOT NULL
```

### Payment Status Enum
- `pending`: Payment not yet completed
- `completed`: Payment successfully processed
- `failed`: Payment failed or abandoned

## Error Messages

### Customer-Facing
- "Payment must be completed to view this order"
- "Cash on delivery is not available. Please use card payment."
- "Your order will only be confirmed after successful payment."

### Admin-Facing
- "Payment not completed within 24 hours" (cancellation reason)

## Benefits

1. **No Revenue Loss**: Every completed order has payment
2. **Clean Database**: Abandoned orders automatically cleaned up
3. **Better Analytics**: Only paid orders in reports
4. **Fraud Prevention**: Cannot create orders without payment
5. **Customer Clarity**: Clear payment requirement messaging
6. **Stock Accuracy**: Stock only reduced for paid orders

## Monitoring

Check for unpaid orders:
```sql
SELECT order_number, created_at, payment_status 
FROM orders 
WHERE payment_status = 'pending' 
AND created_at < NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

Check cleanup history:
```sql
SELECT order_number, cancelled_at, cancellation_reason 
FROM orders 
WHERE cancellation_reason LIKE '%Payment not completed%'
ORDER BY cancelled_at DESC
LIMIT 50;
```
