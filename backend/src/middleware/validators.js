const { body, validationResult } = require('express-validator');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid input data',
                details: errors.array().map(err => ({
                    field: err.path,
                    message: err.msg
                }))
            }
        });
    }
    
    next();
};

/**
 * Registration validation rules
 */
const validateRegister = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain uppercase, lowercase, and number'),
    
    body('firstName')
        .trim()
        .notEmpty()
        .withMessage('First name is required')
        .isLength({ max: 100 })
        .withMessage('First name too long'),
    
    body('lastName')
        .trim()
        .notEmpty()
        .withMessage('Last name is required')
        .isLength({ max: 100 })
        .withMessage('Last name too long'),
    
    body('phone')
        .optional({ nullable: true, checkFalsy: true })
        .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
        .withMessage('Invalid phone number'),
    
    handleValidationErrors
];

/**
 * Login validation rules
 */
const validateLogin = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    
    handleValidationErrors
];

/**
 * Password change validation
 */
const validatePasswordChange = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
    
    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('New password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('New password must contain uppercase, lowercase, and number'),
    
    handleValidationErrors
];

/**
 * Password reset request validation
 */
const validatePasswordResetRequest = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    
    handleValidationErrors
];

/**
 * Password reset validation
 */
const validatePasswordReset = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    
    body('otp')
        .notEmpty()
        .isLength({ min: 6, max: 6 })
        .withMessage('Valid 6-digit code is required'),
    
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain uppercase, lowercase, and number'),
    
    handleValidationErrors
];

/**
 * Profile update validation
 */
const validateProfileUpdate = [
    body('firstName')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('First name must be 1-100 characters'),
    
    body('lastName')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Last name must be 1-100 characters'),
    
    body('phone')
        .optional()
        .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
        .withMessage('Invalid phone number'),
    
    handleValidationErrors
];

/**
 * Product creation/update validation
 */
const validateProduct = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Product name is required')
        .isLength({ max: 255 })
        .withMessage('Product name too long'),
    
    body('price')
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number'),
    
    body('stockQuantity')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Stock quantity must be a non-negative integer'),
    
    body('categoryId')
        .optional()
        .isUUID()
        .withMessage('Invalid category ID'),
    
    handleValidationErrors
];

/**
 * Product update validation (all fields optional)
 */
const validateProductUpdate = [
    body('name')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Product name cannot be empty')
        .isLength({ max: 255 })
        .withMessage('Product name too long'),
    
    body('price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number'),
    
    body('stockQuantity')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Stock quantity must be a non-negative integer'),
    
    body('categoryId')
        .optional()
        .isUUID()
        .withMessage('Invalid category ID'),
    
    handleValidationErrors
];

/**
 * Order creation validation
 */
const validateOrder = [
    body('shippingAddress.firstName')
        .trim()
        .notEmpty()
        .withMessage('First name is required'),
    
    body('shippingAddress.lastName')
        .trim()
        .notEmpty()
        .withMessage('Last name is required'),
    
    body('shippingAddress.address')
        .trim()
        .notEmpty()
        .withMessage('Address is required'),
    
    body('shippingAddress.city')
        .trim()
        .notEmpty()
        .withMessage('City is required'),
    
    body('shippingAddress.postalCode')
        .trim()
        .notEmpty()
        .withMessage('Postal code is required'),
    
    body('shippingAddress.country')
        .trim()
        .notEmpty()
        .withMessage('Country is required'),
    
    body('items')
        .isArray({ min: 1 })
        .withMessage('Order must contain at least one item'),
    
    body('items.*.productId')
        .isUUID()
        .withMessage('Invalid product ID'),
    
    body('items.*.quantity')
        .isInt({ min: 1 })
        .withMessage('Quantity must be at least 1'),
    
    handleValidationErrors
];

module.exports = {
    validateRegister,
    validateLogin,
    validatePasswordChange,
    validatePasswordResetRequest,
    validatePasswordReset,
    validateProfileUpdate,
    validateProduct,
    validateProductUpdate,
    validateOrder
};
