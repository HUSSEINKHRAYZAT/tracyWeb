const pool = require('../config/database');

/**
 * Get all site settings
 */
exports.getSettings = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT key, value, description FROM site_settings ORDER BY key');
        
        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = row.value;
        });

        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get single setting
 */
exports.getSetting = async (req, res, next) => {
    try {
        const { key } = req.params;
        
        const result = await pool.query(
            'SELECT key, value, description FROM site_settings WHERE key = $1',
            [key]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'SETTING_NOT_FOUND',
                    message: 'Setting not found'
                }
            });
        }

        res.json({
            success: true,
            data: {
                key: result.rows[0].key,
                value: result.rows[0].value,
                description: result.rows[0].description
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update setting (admin only)
 */
exports.updateSetting = async (req, res, next) => {
    try {
        const { key } = req.params;
        const { value } = req.body;

        // Validate value type based on key
        if (key === 'tax_rate' && (value < 0 || value > 1)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_TAX_RATE',
                    message: 'Tax rate must be between 0 and 1 (e.g., 0.1 for 10%)'
                }
            });
        }

        if ((key === 'shipping_fee_cents' || key === 'free_shipping_threshold_cents') && value < 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_VALUE',
                    message: 'Value must be non-negative'
                }
            });
        }

        const result = await pool.query(
            `UPDATE site_settings 
             SET value = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP 
             WHERE key = $3 
             RETURNING *`,
            [JSON.stringify(value), req.user.id, key]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'SETTING_NOT_FOUND',
                    message: 'Setting not found'
                }
            });
        }

        res.json({
            success: true,
            data: {
                key: result.rows[0].key,
                value: result.rows[0].value
            },
            message: 'Setting updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get shop configuration (public - for cart/checkout)
 */
exports.getShopConfig = async (req, res, next) => {
    try {
        // Prevent caching so changes reflect immediately
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        const result = await pool.query(`
            SELECT key, value 
            FROM site_settings 
            WHERE key IN ('shipping_fee_cents', 'free_shipping_threshold_cents', 'tax_rate')
        `);
        
        const config = {};
        result.rows.forEach(row => {
            config[row.key] = row.value;
        });

        res.json({
            success: true,
            data: {
                shippingFeeCents: parseInt(config.shipping_fee_cents) || 1000,
                freeShippingThresholdCents: parseInt(config.free_shipping_threshold_cents) || 5000,
                taxRate: parseFloat(config.tax_rate) || 0.10
            }
        });
    } catch (error) {
        next(error);
    }
};
