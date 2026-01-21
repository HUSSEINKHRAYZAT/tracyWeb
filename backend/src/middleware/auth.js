/**
 * Authentication Middleware
 * Protects routes and checks user roles
 */

/**
 * Require user to be authenticated
 */
function requireAuth(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message: 'Authentication required'
            }
        });
    }

    next();
}

/**
 * Require specific role
 */
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required'
                }
            });
        }

        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'Insufficient permissions'
                }
            });
        }

        next();
    };
}

/**
 * Attach user object to request if authenticated
 */
async function attachUser(req, res, next) {
    if (req.session && req.session.userId) {
        try {
            const User = require('../models/User');
            const user = await User.findById(req.session.userId);
            
            if (user) {
                req.user = user;
            } else {
                // User not found, clear invalid session
                req.session.destroy();
            }
        } catch (error) {
            console.error('Error attaching user:', error);
        }
    }

    next();
}

/**
 * Require admin role
 */
const requireAdmin = requireRole('admin', 'super_admin');

/**
 * Optional auth - attach user if logged in, but don't require it
 */
function optionalAuth(req, res, next) {
    attachUser(req, res, next);
}

module.exports = {
    requireAuth,
    requireRole,
    requireAdmin,
    attachUser,
    optionalAuth
};
