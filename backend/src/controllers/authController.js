const User = require('../models/User');
const crypto = require('crypto');
const { sendPasswordResetEmail, sendWelcomeEmail } = require('../services/email');
const auditLog = require('../services/auditLog');
const emailService = require('../services/email');

// Generate random 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Register a new user
 */
exports.register = async (req, res, next) => {
    try {
        const { email, password, firstName, lastName, phone } = req.body;

        // Check if email already exists
        const exists = await User.emailExists(email);
        if (exists) {
            return res.status(409).json({
                success: false,
                error: {
                    code: 'EMAIL_EXISTS',
                    message: 'An account with this email already exists'
                }
            });
        }

        // Generate OTP
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Create user (unverified)
        const user = await User.create({
            email,
            password,
            firstName,
            lastName,
            phone,
            emailVerificationToken: otp,
            emailVerificationExpiry: otpExpiry
        });

        // Log registration
        auditLog.logRegister(req, user.id, user.email).catch(err => {
            console.error('Failed to log registration:', err);
        });

        // Send verification OTP email
        try {
            await emailService.sendEmail(
                email,
                'verificationOTP',
                user,
                otp
            );
        } catch (emailError) {
            console.error('Failed to send verification email:', emailError);
            // Don't fail registration if email fails
        }

        // DO NOT create session yet - user must verify email first
        res.status(201).json({
            success: true,
            data: {
                userId: user.id,
                email: user.email,
                requiresVerification: true
            },
            message: 'Registration successful! Please check your email for verification code.'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Login user
 */
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findByEmail(email);
        if (!user) {            // Log failed login attempt
            auditLog.logLoginFailed(req, email, 'User not found').catch(err => {
                console.error('Failed to log login failure:', err);
            });
                        return res.status(401).json({
                success: false,
                error: {
                    code: 'INVALID_CREDENTIALS',
                    message: 'Invalid email or password'
                }
            });
        }

        // Check if email is verified
        if (!user.email_verified) {
            // Generate new OTP if expired or doesn't exist
            const now = new Date();
            if (!user.email_verification_expiry || new Date(user.email_verification_expiry) < now) {
                const newOTP = generateOTP();
                const newExpiry = new Date(Date.now() + 10 * 60 * 1000);
                await User.updateVerificationToken(user.id, newOTP, newExpiry);
                
                // Resend verification email
                try {
                    await emailService.sendEmail(email, 'verificationOTP', user, newOTP);
                } catch (emailError) {
                    console.error('Failed to resend verification email:', emailError);
                }
            }
            
            return res.status(403).json({
                success: false,
                error: {
                    code: 'EMAIL_NOT_VERIFIED',
                    message: 'Please verify your email before logging in. Check your inbox for the verification code.',
                    userId: user.id
                }
            });
        }

        // Check if account is locked
        const isLocked = await User.isAccountLocked(user);
        if (isLocked) {
            return res.status(423).json({
                success: false,
                error: {
                    code: 'ACCOUNT_LOCKED',
                    message: 'Account locked due to too many failed login attempts. Please try again later.'
                }
            });
        }

        // Verify password
        const isValid = await User.verifyPassword(user, password);
        if (!isValid) {
            // Increment failed attempts
            await User.incrementFailedLogins(user.id);
                        // Log failed login attempt
            auditLog.logLoginFailed(req, email, 'Invalid password').catch(err => {
                console.error('Failed to log login failure:', err);
            });
                        return res.status(401).json({
                success: false,
                error: {
                    code: 'INVALID_CREDENTIALS',
                    message: 'Invalid email or password'
                }
            });
        }

        // Reset failed attempts on successful login
        await User.resetFailedLogins(user.id);

        // Create session
        req.session.userId = user.id;
        req.session.userRole = user.role;

        // Log successful login
        auditLog.logLoginSuccess(req, user.id, user.email).catch(err => {
            console.error('Failed to log login success:', err);
        });

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    phone: user.phone,
                    role: user.role
                }
            },
            message: 'Logged in successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Logout user
 */
exports.logout = async (req, res, next) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                return next(err);
            }

            res.clearCookie('sid');
            res.json({
                success: true,
                message: 'Logged out successfully'
            });
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get current user
 */
exports.getCurrentUser = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Not authenticated'
                }
            });
        }

        res.json({
            success: true,
            data: {
                user: {
                    id: req.user.id,
                    email: req.user.email,
                    firstName: req.user.first_name,
                    lastName: req.user.last_name,
                    phone: req.user.phone,
                    role: req.user.role,
                    emailVerified: req.user.email_verified
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Request password reset with OTP
 */
exports.forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;

        console.log('Forgot password request for email:', email);

        const user = await User.findByEmail(email);
        
        // Always return success to prevent email enumeration
        if (!user) {
            console.log('User not found, but returning success to prevent enumeration');
            return res.json({
                success: true,
                message: 'If an account exists with that email, a password reset code has been sent'
            });
        }

        // Generate OTP
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        
        console.log('Generated OTP:', otp, 'Expires:', otpExpiry);
        
        // Store OTP in password reset token field
        await User.setPasswordResetToken(user.id, otp, otpExpiry);

        // Send password reset OTP email
        try {
            await emailService.sendEmail(
                email,
                'passwordResetOTP',
                user,
                otp
            );
            console.log('Password reset email sent successfully to:', email);
        } catch (emailError) {
            console.error('Failed to send password reset email:', emailError);
            // Continue anyway - user shouldn't know if email exists
        }

        res.json({
            success: true,
            message: 'If an account exists with that email, a password reset code has been sent',
            data: { email }
        });
    } catch (error) {
        console.error('Error in forgotPassword:', error);
        next(error);
    }
};

/**
 * Reset password with OTP
 */
exports.resetPassword = async (req, res, next) => {
    try {
        const { email, otp, password } = req.body;

        console.log('Reset password request:', { email, otp: otp ? 'provided' : 'missing', password: password ? 'provided' : 'missing' });

        if (!email || !otp || !password) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_FIELDS',
                    message: 'Email, OTP, and new password are required'
                }
            });
        }

        const user = await User.findByEmail(email);
        if (!user) {
            console.log('User not found for email:', email);
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_OTP',
                    message: 'Invalid verification code'
                }
            });
        }

        console.log('User found:', { 
            id: user.id, 
            reset_token: user.password_reset_token, 
            expires: user.password_reset_expires 
        });

        // Check if OTP matches
        if (user.password_reset_token !== otp) {
            console.log('OTP mismatch:', { expected: user.password_reset_token, received: otp });
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_OTP',
                    message: 'Invalid verification code'
                }
            });
        }

        // Check if OTP expired
        if (!user.password_reset_expires || new Date() > new Date(user.password_reset_expires)) {
            console.log('OTP expired:', { expires: user.password_reset_expires, now: new Date() });
            return res.status(400).json({
                success: false,
                error: {
                    code: 'OTP_EXPIRED',
                    message: 'Verification code has expired. Please request a new one.'
                }
            });
        }

        // Update password and clear reset token
        await User.updatePassword(user.id, password);
        await User.clearPasswordResetToken(user.id);

        console.log('Password reset successfully for user:', user.id);

        res.json({
            success: true,
            message: 'Password reset successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Verify email with OTP
 */
exports.verifyEmail = async (req, res, next) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_FIELDS',
                    message: 'Email and OTP are required'
                }
            });
        }

        // Find user
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User not found'
                }
            });
        }

        // Check if already verified
        if (user.email_verified) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'ALREADY_VERIFIED',
                    message: 'Email already verified'
                }
            });
        }

        // Check OTP
        if (user.email_verification_token !== otp) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_OTP',
                    message: 'Invalid verification code'
                }
            });
        }

        // Check expiry
        if (new Date() > new Date(user.email_verification_expiry)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'OTP_EXPIRED',
                    message: 'Verification code has expired. Please request a new one.'
                }
            });
        }

        // Verify email
        await User.verifyEmail(user.id);

        // Create session (log user in)
        req.session.userId = user.id;
        req.session.userRole = user.role;

        // Send welcome email
        sendWelcomeEmail(user).catch(err => {
            console.error('Failed to send welcome email:', err);
        });

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    phone: user.phone,
                    role: user.role
                }
            },
            message: 'Email verified successfully! Welcome to Tracy Talks Health.'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Resend verification OTP
 */
exports.resendVerificationOTP = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_EMAIL',
                    message: 'Email is required'
                }
            });
        }

        // Find user
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User not found'
                }
            });
        }

        // Check if already verified
        if (user.email_verified) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'ALREADY_VERIFIED',
                    message: 'Email already verified'
                }
            });
        }

        // Generate new OTP
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Update user with new OTP
        await User.updateVerificationToken(user.id, otp, otpExpiry);

        // Send OTP email
        try {
            await emailService.sendEmail(
                email,
                'verificationOTP',
                user,
                otp
            );
        } catch (emailError) {
            console.error('Failed to send verification email:', emailError);
            return res.status(500).json({
                success: false,
                error: {
                    code: 'EMAIL_SEND_FAILED',
                    message: 'Failed to send verification email. Please try again.'
                }
            });
        }

        res.json({
            success: true,
            message: 'Verification code sent! Please check your email.'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Change password (when logged in)
 */
exports.changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findByEmail(req.user.email);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User not found'
                }
            });
        }

        // Verify current password
        const isValid = await User.verifyPassword(user, currentPassword);
        if (!isValid) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'INVALID_PASSWORD',
                    message: 'Current password is incorrect'
                }
            });
        }

        await User.updatePassword(user.id, newPassword);

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update user profile
 */
exports.updateProfile = async (req, res, next) => {
    try {
        const { firstName, lastName, phone } = req.body;

        const user = await User.update(req.user.id, {
            firstName,
            lastName,
            phone
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User not found'
                }
            });
        }

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    phone: user.phone,
                    role: user.role
                }
            },
            message: 'Profile updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = exports;
