const express = require('express');
const router = express.Router();
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

// Public routes
router.post('/register', registerLimiter, validateRegister, authController.register);
router.post('/login', loginLimiter, validateLogin, authController.login);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerificationOTP);
router.post('/forgot-password', passwordResetLimiter, validatePasswordResetRequest, authController.forgotPassword);
router.post('/reset-password', validatePasswordReset, authController.resetPassword);

// Protected routes
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.getCurrentUser);
router.put('/profile', requireAuth, validateProfileUpdate, authController.updateProfile);
router.post('/change-password', requireAuth, validatePasswordChange, authController.changePassword);

module.exports = router;
