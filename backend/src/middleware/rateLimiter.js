const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for login attempts
 * 5 attempts per 15 minutes
 */
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many login attempts. Please try again in 15 minutes.'
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true
});

/**
 * Rate limiter for registration
 * 10 registrations per hour per IP
 */
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many accounts created. Please try again later.'
        }
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * General API rate limiter
 * 100 requests per 15 minutes
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.'
        }
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Strict limiter for password reset
 * 3 attempts per hour
 */
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many password reset attempts. Please try again later.'
        }
    },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    loginLimiter,
    registerLimiter,
    apiLimiter,
    passwordResetLimiter
};
