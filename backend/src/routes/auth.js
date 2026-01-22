const express = require('express');
const router = express.Router();
const csrf = require('csurf');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { loginLimiter, registerLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const {
    validateRegister,
    validateLogin,
    validatePasswordChange,
    validatePasswordResetRequest,
    validatePasswordReset,
    validateProfileUpdate
} = require('../middleware/validators');

// CSRF Protection middleware
const csrfProtection = csrf({
    cookie: false, // Use session instead of cookies
    ignoreMethods: ['GET', 'HEAD', 'OPTIONS']
});

// Public routes (NO CSRF protection for register, login, password reset)
router.post('/register', registerLimiter, validateRegister, authController.register);
router.post('/login', loginLimiter, validateLogin, authController.login);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerificationOTP);
router.post('/forgot-password', passwordResetLimiter, validatePasswordResetRequest, authController.forgotPassword);
router.post('/reset-password', validatePasswordReset, authController.resetPassword);

// Protected routes (WITH CSRF protection)
router.post('/logout', csrfProtection, requireAuth, authController.logout);
router.get('/me', requireAuth, authController.getCurrentUser);
router.put('/profile', csrfProtection, requireAuth, validateProfileUpdate, authController.updateProfile);
router.post('/change-password', csrfProtection, requireAuth, validatePasswordChange, authController.changePassword);

module.exports = router;
