const pool = require('../config/database');

/**
 * Audit Logging Service
 * Logs security-relevant actions for compliance and security monitoring
 */

// Action types (must match audit_action enum in database)
const ACTION_TYPES = {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    LOGIN: 'login',
    LOGOUT: 'logout',
    PASSWORD_RESET: 'password_reset',
    STATUS_CHANGE: 'status_change',
    REFUND: 'refund'
};

/**
 * Log an action to the audit log
 * @param {string} userId - UUID of the user performing the action (or null for anonymous)
 * @param {string} action - Action type (from ACTION_TYPES)
 * @param {string} entityType - Type of entity affected (user, product, order, etc.)
 * @param {string} entityId - UUID of the affected entity (or null)
 * @param {object} changes - Additional context (old/new values, IP, etc.)
 * @param {string} ipAddress - IP address of the request
 * @param {string} userAgent - User agent string
 */
async function log(userId, action, entityType, entityId, changes, ipAddress, userAgent) {
    try {
        await pool.query(
            `INSERT INTO audit_logs 
             (user_id, action, entity_type, entity_id, changes, ip_address, user_agent) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                userId || null,
                action,
                entityType,
                entityId || null,
                JSON.stringify(changes || {}),
                ipAddress || null,
                userAgent || null
            ]
        );
    } catch (error) {
        // Don't let audit logging failures break the application
        console.error('Audit log error:', error);
    }
}

/**
 * Express middleware to extract IP and user agent
 */
function getRequestInfo(req) {
    return {
        ipAddress: req.ip || req.connection.remoteAddress || null,
        userAgent: req.get('user-agent') || null
    };
}

// Convenience functions for common actions

async function logLoginSuccess(req, userId, email) {
    const { ipAddress, userAgent } = getRequestInfo(req);
    await log(
        userId,
        ACTION_TYPES.LOGIN,
        'user',
        userId,
        { email, success: true },
        ipAddress,
        userAgent
    );
}

async function logLoginFailed(req, email, reason) {
    const { ipAddress, userAgent } = getRequestInfo(req);
    await log(
        null,
        ACTION_TYPES.LOGIN,
        'user',
        null,
        { email, success: false, reason },
        ipAddress,
        userAgent
    );
}

async function logLogout(req, userId) {
    const { ipAddress, userAgent } = getRequestInfo(req);
    await log(
        userId,
        ACTION_TYPES.LOGOUT,
        'user',
        userId,
        {},
        ipAddress,
        userAgent
    );
}

async function logRegister(req, userId, email) {
    const { ipAddress, userAgent } = getRequestInfo(req);
    await log(
        userId,
        ACTION_TYPES.CREATE,
        'user',
        userId,
        { email, type: 'registration' },
        ipAddress,
        userAgent
    );
}

async function logPasswordResetRequest(req, email) {
    const { ipAddress, userAgent } = getRequestInfo(req);
    await log(
        null,
        ACTION_TYPES.PASSWORD_RESET,
        'user',
        null,
        { email, type: 'request' },
        ipAddress,
        userAgent
    );
}

async function logPasswordResetComplete(req, userId) {
    const { ipAddress, userAgent } = getRequestInfo(req);
    await log(
        userId,
        ACTION_TYPES.PASSWORD_RESET,
        'user',
        userId,
        { type: 'complete' },
        ipAddress,
        userAgent
    );
}

async function logPasswordChange(req, userId) {
    const { ipAddress, userAgent } = getRequestInfo(req);
    await log(
        userId,
        ACTION_TYPES.PASSWORD_RESET,
        'user',
        userId,
        { type: 'change' },
        ipAddress,
        userAgent
    );
}

async function logProductCreate(req, userId, productId, productData) {
    const { ipAddress, userAgent } = getRequestInfo(req);
    await log(
        userId,
        ACTION_TYPES.CREATE,
        'product',
        productId,
        { 
            name: productData.name,
            price: productData.price,
            stock_quantity: productData.stock_quantity
        },
        ipAddress,
        userAgent
    );
}

async function logProductUpdate(req, userId, productId, oldData, newData) {
    const { ipAddress, userAgent } = getRequestInfo(req);
    const changes = {};
    
    // Track what changed
    for (const key in newData) {
        if (oldData[key] !== newData[key]) {
            changes[key] = {
                old: oldData[key],
                new: newData[key]
            };
        }
    }
    
    await log(
        userId,
        ACTION_TYPES.UPDATE,
        'product',
        productId,
        { changes },
        ipAddress,
        userAgent
    );
}

async function logProductDelete(req, userId, productId, productName) {
    const { ipAddress, userAgent } = getRequestInfo(req);
    await log(
        userId,
        ACTION_TYPES.DELETE,
        'product',
        productId,
        { name: productName },
        ipAddress,
        userAgent
    );
}

async function logOrderStatusUpdate(req, userId, orderId, oldStatus, newStatus) {
    const { ipAddress, userAgent } = getRequestInfo(req);
    await log(
        userId,
        ACTION_TYPES.STATUS_CHANGE,
        'order',
        orderId,
        { 
            old_status: oldStatus,
            new_status: newStatus
        },
        ipAddress,
        userAgent
    );
}

async function logUserRoleChange(req, adminUserId, targetUserId, oldRole, newRole) {
    const { ipAddress, userAgent } = getRequestInfo(req);
    await log(
        adminUserId,
        ACTION_TYPES.UPDATE,
        'user',
        targetUserId,
        { 
            type: 'role_change',
            old_role: oldRole,
            new_role: newRole
        },
        ipAddress,
        userAgent
    );
}

async function logOrderCreated(req, userId, orderId, totalCents) {
    const { ipAddress, userAgent } = getRequestInfo(req);
    await log(
        userId,
        ACTION_TYPES.CREATE,
        'order',
        orderId,
        { total_cents: totalCents },
        ipAddress,
        userAgent
    );
}

async function logPaymentSuccess(req, userId, orderId, paymentId, amountCents) {
    const { ipAddress, userAgent } = getRequestInfo(req);
    await log(
        userId,
        ACTION_TYPES.CREATE,
        'payment',
        paymentId,
        { 
            order_id: orderId,
            amount_cents: amountCents,
            success: true
        },
        ipAddress,
        userAgent
    );
}

async function logPaymentFailed(req, userId, orderId, reason) {
    const { ipAddress, userAgent } = getRequestInfo(req);
    await log(
        userId,
        ACTION_TYPES.CREATE,
        'payment',
        null,
        { 
            order_id: orderId,
            reason,
            success: false
        },
        ipAddress,
        userAgent
    );
}

/**
 * Get recent audit logs (admin only)
 */
async function getRecentLogs(limit = 100, offset = 0, filters = {}) {
    let query = `
        SELECT 
            al.id,
            al.user_id,
            u.email as user_email,
            u.first_name as user_first_name,
            u.last_name as user_last_name,
            al.action,
            al.entity_type,
            al.entity_id,
            al.changes,
            al.ip_address,
            al.user_agent,
            al.created_at
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    // Apply filters
    if (filters.userId) {
        query += ` AND al.user_id = $${paramIndex++}`;
        params.push(filters.userId);
    }
    
    if (filters.action) {
        query += ` AND al.action = $${paramIndex++}`;
        params.push(filters.action);
    }
    
    if (filters.entityType) {
        query += ` AND al.entity_type = $${paramIndex++}`;
        params.push(filters.entityType);
    }
    
    if (filters.startDate) {
        query += ` AND al.created_at >= $${paramIndex++}`;
        params.push(filters.startDate);
    }
    
    if (filters.endDate) {
        query += ` AND al.created_at <= $${paramIndex++}`;
        params.push(filters.endDate);
    }
    
    query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    return result.rows;
}

/**
 * Get audit log statistics
 */
async function getStatistics(startDate, endDate) {
    const query = `
        SELECT 
            action,
            COUNT(*) as count
        FROM audit_logs
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY action
        ORDER BY count DESC
    `;
    
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows;
}

module.exports = {
    ACTION_TYPES,
    log,
    logLoginSuccess,
    logLoginFailed,
    logLogout,
    logRegister,
    logPasswordResetRequest,
    logPasswordResetComplete,
    logPasswordChange,
    logProductCreate,
    logProductUpdate,
    logProductDelete,
    logOrderStatusUpdate,
    logUserRoleChange,
    logOrderCreated,
    logPaymentSuccess,
    logPaymentFailed,
    getRecentLogs,
    getStatistics
};
