/**
 * Cleanup abandoned orders (orders with pending payment status older than 24 hours)
 * This ensures orders without payment don't clutter the database
 */

const pool = require('../config/database');

async function cleanupAbandonedOrders() {
    try {
        console.log('Starting cleanup of abandoned orders...');
        
        // Find orders older than 24 hours with pending payment status
        const result = await pool.query(`
            UPDATE orders
            SET status = 'cancelled',
                cancellation_reason = 'Payment not completed within 24 hours',
                cancelled_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE payment_status = 'pending'
              AND status = 'pending'
              AND created_at < NOW() - INTERVAL '24 hours'
            RETURNING id, order_number
        `);

        if (result.rows.length > 0) {
            console.log(`Cancelled ${result.rows.length} abandoned orders:`);
            result.rows.forEach(order => {
                console.log(`  - Order ${order.order_number} (ID: ${order.id})`);
            });
        } else {
            console.log('No abandoned orders found.');
        }

        // Also cleanup pending payments older than 24 hours
        const paymentResult = await pool.query(`
            UPDATE payments
            SET status = 'failed',
                updated_at = CURRENT_TIMESTAMP
            WHERE status = 'pending'
              AND created_at < NOW() - INTERVAL '24 hours'
            RETURNING id
        `);

        if (paymentResult.rows.length > 0) {
            console.log(`Marked ${paymentResult.rows.length} pending payments as failed.`);
        }

        console.log('Cleanup completed successfully.');
    } catch (error) {
        console.error('Error during cleanup:', error);
        throw error;
    }
}

// If run directly
if (require.main === module) {
    cleanupAbandonedOrders()
        .then(() => {
            console.log('Done!');
            process.exit(0);
        })
        .catch(error => {
            console.error('Cleanup failed:', error);
            process.exit(1);
        });
}

module.exports = cleanupAbandonedOrders;
