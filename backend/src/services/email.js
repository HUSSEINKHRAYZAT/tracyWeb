const nodemailer = require('nodemailer');

/**
 * Email Service for Tracy Talks Health
 * Handles all email notifications
 */

// Create transporter based on environment
let transporter;

if (process.env.NODE_ENV === 'production') {
    // Production: Use real SMTP service (SendGrid, AWS SES, etc.)
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
} else {
    // Development: Use Ethereal Email or configured SMTP from .env
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER || 'test@ethereal.email',
            pass: process.env.SMTP_PASS || 'testpassword'
        }
    });
}

// Email templates
const templates = {
    passwordReset: (resetUrl, userName) => ({
        subject: 'Reset Your Password - Tracy Talks Health',
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #d4af8b 0%, #c19a6b 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
        .button { display: inline-block; background: #d4af8b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 500; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">Tracy Talks Health</h1>
        </div>
        <div class="content">
            <h2>Password Reset Request</h2>
            <p>Hi ${userName || 'there'},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <div class="warning">
                <strong>⚠️ Security Notice:</strong><br>
                This link will expire in 1 hour. If you didn't request this, please ignore this email and your password will remain unchanged.
            </div>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Tracy Talks Health. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `,
        text: `
Password Reset Request

Hi ${userName || 'there'},

We received a request to reset your password. Click the link below to create a new password:

${resetUrl}

This link will expire in 1 hour. If you didn't request this, please ignore this email.

© ${new Date().getFullYear()} Tracy Talks Health
        `
    }),

    orderConfirmation: (order, user) => ({
        subject: `Order Confirmation #${order.order_number} - Tracy Talks Health`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #d4af8b 0%, #c19a6b 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
        .success-badge { background: #22c55e; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 10px 0; font-size: 14px; }
        .order-details { background: #f8f9fa; border-radius: 6px; padding: 20px; margin: 20px 0; }
        .order-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0e0e0; }
        .total { font-size: 18px; font-weight: bold; margin-top: 15px; padding-top: 15px; border-top: 2px solid #d4af8b; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">✓ Payment Successful!</h1>
        </div>
        <div class="content">
            <div style="text-align: center;">
                <span class="success-badge">Order Confirmed</span>
            </div>
            <h2>Thank you for your order, ${user.first_name}!</h2>
            <p>We've received your payment and your order is now being processed.</p>
            
            <div class="order-details">
                <h3>Order Details</h3>
                <p><strong>Order Number:</strong> ${order.order_number}</p>
                <p><strong>Order Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
                <p><strong>Payment Status:</strong> <span style="color: #22c55e;">Paid</span></p>
                
                <h4 style="margin-top: 20px;">Items:</h4>
                ${order.items ? order.items.map(item => `
                    <div class="order-item">
                        <span>${item.product_name} x ${item.quantity}</span>
                        <span>$${((item.unit_price_cents / 100) * item.quantity).toFixed(2)}</span>
                    </div>
                `).join('') : ''}
                
                <div class="total">
                    <div style="display: flex; justify-content: space-between;">
                        <span>Total:</span>
                        <span>$${(order.total_amount_cents / 100).toFixed(2)}</span>
                    </div>
                </div>
            </div>
            
            <div style="background: #e7f3ff; border-left: 4px solid #2196f3; padding: 12px; margin: 20px 0;">
                <strong>📦 What's Next?</strong><br>
                Your order is being prepared for shipment. We'll send you another email with tracking information once it ships.
            </div>
            
            <p style="text-align: center; margin-top: 30px;">
                <a href="${process.env.FRONTEND_URL}/orders.html" style="display: inline-block; background: #d4af8b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px;">View Order Status</a>
            </p>
        </div>
        <div class="footer">
            <p>Questions? Reply to this email or contact us at support@tracytalkshealth.com</p>
            <p>&copy; ${new Date().getFullYear()} Tracy Talks Health. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `,
        text: `
Order Confirmation #${order.order_number}

Thank you for your order, ${user.first_name}!

We've received your payment and your order is now being processed.

Order Number: ${order.order_number}
Order Date: ${new Date(order.created_at).toLocaleDateString()}
Payment Status: Paid

Total: $${(order.total_amount_cents / 100).toFixed(2)}

Your order is being prepared for shipment. We'll send tracking information once it ships.

View your order: ${process.env.FRONTEND_URL}/orders.html

© ${new Date().getFullYear()} Tracy Talks Health
        `
    }),

    verificationOTP: (user, otp) => ({
        subject: 'Verify Your Email - Tracy Talks Health',
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2f4b57 0%, #619080 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #fff; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none; }
        .otp-box { background: #f8f9fa; border: 2px dashed #619080; border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0; }
        .otp-code { font-size: 48px; font-weight: bold; letter-spacing: 8px; color: #2f4b57; font-family: 'Courier New', monospace; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">🌿 Tracy Talks Health</h1>
        </div>
        <div class="content">
            <h2 style="color: #2f4b57;">Welcome, ${user.first_name}!</h2>
            <p>Thank you for creating an account with Tracy Talks Health. To complete your registration, please verify your email address.</p>
            
            <div class="otp-box">
                <p style="margin: 0 0 15px 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
                <div class="otp-code">${otp}</div>
                <p style="margin: 15px 0 0 0; font-size: 14px; color: #666;">Enter this code to verify your email</p>
            </div>
            
            <div class="warning">
                <strong>⚠️ Important:</strong><br>
                This code will expire in 10 minutes. If you didn't create an account, please ignore this email.
            </div>
            
            <p style="margin-top: 30px;">After verification, you'll have full access to:</p>
            <ul style="color: #666;">
                <li>Browse and purchase wellness products</li>
                <li>Access exclusive coaching programs</li>
                <li>Join our wellness community</li>
                <li>Receive personalized health recommendations</li>
            </ul>
            
            <p>If you have any questions, feel free to reach out to our support team.</p>
        </div>
        <div class="footer">
            <p>Need help? Contact us at support@tracytalkshealth.com</p>
            <p>&copy; ${new Date().getFullYear()} Tracy Talks Health. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `,
        text: `
Welcome to Tracy Talks Health!

Hi ${user.first_name},

Thank you for creating an account. To complete your registration, please verify your email address.

Your Verification Code: ${otp}

This code will expire in 10 minutes.

Enter this code on the verification page to activate your account.

If you didn't create an account, please ignore this email.

© ${new Date().getFullYear()} Tracy Talks Health
        `
    }),

    passwordResetOTP: (user, otp) => ({
        subject: 'Reset Your Password - Tracy Talks Health',
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #fff; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none; }
        .otp-box { background: #f8f9fa; border: 2px dashed #e74c3c; border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0; }
        .otp-code { font-size: 48px; font-weight: bold; letter-spacing: 8px; color: #e74c3c; font-family: 'Courier New', monospace; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">🔐 Password Reset Request</h1>
        </div>
        <div class="content">
            <h2 style="color: #e74c3c;">Hi ${user.first_name},</h2>
            <p>We received a request to reset your password for your Tracy Talks Health account. Use the code below to reset your password.</p>
            
            <div class="otp-box">
                <p style="margin: 0 0 15px 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Your Reset Code</p>
                <div class="otp-code">${otp}</div>
                <p style="margin: 15px 0 0 0; font-size: 14px; color: #666;">Enter this code to reset your password</p>
            </div>
            
            <div class="warning">
                <strong>⚠️ Security Notice:</strong><br>
                This code will expire in 10 minutes. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
            </div>
            
            <p style="margin-top: 30px; color: #666;">For your security, this code can only be used once and expires in 10 minutes.</p>
        </div>
        <div class="footer">
            <p>Need help? Contact us at support@tracytalkshealth.com</p>
            <p>&copy; ${new Date().getFullYear()} Tracy Talks Health. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `,
        text: `
Password Reset Request

Hi ${user.first_name},

We received a request to reset your password for your Tracy Talks Health account.

Your Reset Code: ${otp}

This code will expire in 10 minutes.

If you didn't request a password reset, please ignore this email.

© ${new Date().getFullYear()} Tracy Talks Health
        `
    }),

    orderStatusUpdate: (order, user, oldStatus, newStatus) => {
        const statusMessages = {
            pending: '⏳ Your order is being prepared.',
            processing: '🔄 Your order is being processed.',
            shipped: '📦 Your package is on the way!',
            delivered: '🎉 Your order has been delivered!',
            cancelled: '❌ Your order has been cancelled.',
            refunded: '💰 Your order has been refunded.'
        };
        
        const statusColors = {
            pending: '#fbbf24',
            processing: '#3b82f6',
            shipped: '#10b981',
            delivered: '#22c55e',
            cancelled: '#ef4444',
            refunded: '#8b5cf6'
        };
        
        return {
            subject: `Order #${order.order_number} ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)} - Tracy Talks Health`,
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #d4af8b 0%, #c19a6b 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
        .status-badge { padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 10px 0; font-size: 14px; font-weight: 500; color: white; background: ${statusColors[newStatus] || '#6b7280'}; }
        .info-box { background: #f8f9fa; border-radius: 6px; padding: 20px; margin: 20px 0; }
        .alert-box { border-left: 4px solid ${statusColors[newStatus] || '#6b7280'}; padding: 12px; margin: 20px 0; background: #f9fafb; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">Order Update</h1>
        </div>
        <div class="content">
            <h2>Hi ${user.first_name || 'there'},</h2>
            <p>Your order status has been updated!</p>
            
            <div class="info-box">
                <p><strong>Order Number:</strong> ${order.order_number}</p>
                <p><strong>Previous Status:</strong> ${oldStatus.toUpperCase()}</p>
                <p><strong>New Status:</strong> <span class="status-badge">${newStatus.toUpperCase()}</span></p>
                ${order.tracking_number ? `<p><strong>Tracking Number:</strong> ${order.tracking_number}</p>` : ''}
            </div>
            
            <div class="alert-box">
                <strong>${statusMessages[newStatus] || 'Your order status has been updated.'}</strong>
            </div>
            
            <p style="text-align: center; margin-top: 30px;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:8000'}/orders.html" style="display: inline-block; background: #d4af8b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px;">View Order Details</a>
            </p>
        </div>
        <div class="footer">
            <p>Questions? Reply to this email or contact us</p>
            <p>&copy; ${new Date().getFullYear()} Tracy Talks Health. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
            `,
            text: `
Order Update #${order.order_number}

Hi ${user.first_name || 'there'},

Your order status has been updated!

Order Number: ${order.order_number}
Previous Status: ${oldStatus.toUpperCase()}
New Status: ${newStatus.toUpperCase()}

${order.tracking_number ? `Tracking Number: ${order.tracking_number}` : ''}

${statusMessages[newStatus] || 'Your order status has been updated.'}

View order details: ${process.env.FRONTEND_URL || 'http://localhost:8000'}/orders.html

© ${new Date().getFullYear()} Tracy Talks Health
            `
        };
    },

    welcomeEmail: (user, verificationUrl) => ({
        subject: 'Welcome to Tracy Talks Health!',
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #d4af8b 0%, #c19a6b 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
        .button { display: inline-block; background: #d4af8b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 500; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">Welcome to Tracy Talks Health!</h1>
        </div>
        <div class="content">
            <h2>Hi ${user.first_name},</h2>
            <p>Thank you for joining our wellness community! We're excited to have you.</p>
            
            ${verificationUrl ? `
            <p>Please verify your email address to get started:</p>
            <p style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email</a>
            </p>
            ` : ''}
            
            <div style="background: #f8f9fa; border-radius: 6px; padding: 20px; margin: 20px 0;">
                <h3>What's Next?</h3>
                <ul>
                    <li>Browse our wellness products</li>
                    <li>Learn about our coaching services</li>
                    <li>Join our wellness community</li>
                </ul>
            </div>
            
            <p style="text-align: center; margin-top: 30px;">
                <a href="${process.env.FRONTEND_URL}/shop.html" style="display: inline-block; background: #d4af8b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px;">Start Shopping</a>
            </p>
        </div>
        <div class="footer">
            <p>Questions? Contact us at support@tracytalkshealth.com</p>
            <p>&copy; ${new Date().getFullYear()} Tracy Talks Health. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `,
        text: `
Welcome to Tracy Talks Health!

Hi ${user.first_name},

Thank you for joining our wellness community!

${verificationUrl ? `Please verify your email: ${verificationUrl}` : ''}

Start shopping: ${process.env.FRONTEND_URL}/shop.html

© ${new Date().getFullYear()} Tracy Talks Health
        `
    })
};

/**
 * Send password reset email
 */
async function sendPasswordResetEmail(email, resetToken, userName) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password.html?token=${resetToken}`;
    const template = templates.passwordReset(resetUrl, userName);
    
    try {
        const info = await transporter.sendMail({
            from: `"Tracy Talks Health" <${process.env.SMTP_FROM || 'noreply@tracytalkshealth.com'}>`,
            to: email,
            subject: template.subject,
            text: template.text,
            html: template.html
        });
        
        console.log(`📧 Password reset email sent to ${email}`);
        if (process.env.NODE_ENV !== 'production') {
            console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
        }
        
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Failed to send password reset email:', error);
        throw error;
    }
}

/**
 * Send order confirmation email
 */
async function sendOrderConfirmationEmail(order, user) {
    const template = templates.orderConfirmation(order, user);
    
    try {
        const info = await transporter.sendMail({
            from: `"Tracy Talks Health" <${process.env.SMTP_FROM || 'orders@tracytalkshealth.com'}>`,
            to: user.email,
            subject: template.subject,
            text: template.text,
            html: template.html
        });
        
        console.log(`📧 Order confirmation sent to ${user.email} for order ${order.order_number}`);
        if (process.env.NODE_ENV !== 'production') {
            console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
        }
        
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Failed to send order confirmation:', error);
        throw error;
    }
}

/**
 * Send order status update email
 */
async function sendOrderStatusUpdateEmail(order, user, oldStatus, newStatus) {
    const template = templates.orderStatusUpdate(order, user, oldStatus, newStatus);
    
    try {
        const info = await transporter.sendMail({
            from: `"Tracy Talks Health" <${process.env.SMTP_FROM || 'orders@tracytalkshealth.com'}>`,
            to: user.email,
            subject: template.subject,
            text: template.text,
            html: template.html
        });
        
        console.log(`📧 Status update sent to ${user.email} for order ${order.order_number}`);
        if (process.env.NODE_ENV !== 'production') {
            console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
        }
        
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Failed to send status update:', error);
        throw error;
    }
}

/**
 * Send welcome email
 */
async function sendWelcomeEmail(user, verificationToken = null) {
    const verificationUrl = verificationToken 
        ? `${process.env.FRONTEND_URL}/verify-email.html?token=${verificationToken}`
        : null;
        
    const template = templates.welcomeEmail(user, verificationUrl);
    
    try {
        const info = await transporter.sendMail({
            from: `"Tracy Talks Health" <${process.env.SMTP_FROM || 'hello@tracytalkshealth.com'}>`,
            to: user.email,
            subject: template.subject,
            text: template.text,
            html: template.html
        });
        
        console.log(`📧 Welcome email sent to ${user.email}`);
        if (process.env.NODE_ENV !== 'production') {
            console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
        }
        
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Failed to send welcome email:', error);
        // Don't throw - welcome email failure shouldn't block registration
        return { success: false, error: error.message };
    }
}

/**
 * Generic email sending function
 * @param {string} to - Recipient email
 * @param {string} templateName - Template to use
 * @param {object} data - Data for template (user, order, etc.)
 * @param {string} extraParam - Extra parameter (e.g., OTP, resetUrl)
 */
async function sendEmail(to, templateName, data, extraParam) {
    try {
        let template;
        
        switch (templateName) {
            case 'passwordReset':
                template = templates.passwordReset(extraParam, data.first_name || data.firstName);
                break;
            case 'passwordResetOTP':
                template = templates.passwordResetOTP(data, extraParam); // data is user, extraParam is OTP
                break;
            case 'orderConfirmation':
                template = templates.orderConfirmation(data, extraParam); // data is order, extraParam is user
                break;
            case 'orderStatusUpdate':
                template = templates.orderStatusUpdate(data.order, data.user, data.oldStatus, data.newStatus);
                break;
            case 'verificationOTP':
                template = templates.verificationOTP(data, extraParam); // data is user, extraParam is OTP
                break;
            default:
                throw new Error(`Unknown email template: ${templateName}`);
        }
        
        const mailOptions = {
            from: `"Tracy Talks Health" <${process.env.SMTP_USER || 'noreply@tracytalkshealth.com'}>`,
            to,
            subject: template.subject,
            html: template.html,
            text: template.text
        };
        
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
        
        // Log preview URL for Ethereal Email (development)
        if (process.env.NODE_ENV !== 'production' && info.messageId) {
            const previewUrl = `https://ethereal.email/message/${info.messageId.split('@')[0]}`;
            console.log('📧 Preview email:', previewUrl);
        }
        
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Email send error:', error);
        throw error;
    }
}

/**
 * Send contact form submission email
 */
async function sendContactFormEmail({ firstName, lastName, email, phone, message }) {
    try {
        // Ensure we have separate from/to addresses
        const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
        const adminEmail = process.env.ADMIN_EMAIL || process.env.CONTACT_EMAIL;
        
        if (!adminEmail || adminEmail === fromEmail) {
            console.warn('⚠️  ADMIN_EMAIL not set or same as SMTP_USER. Please set ADMIN_EMAIL in .env to receive contact form submissions at a different address.');
        }
        
        const mailOptions = {
            from: `"Tracy Talks Health" <${fromEmail}>`,
            to: adminEmail || fromEmail,
            replyTo: `"${firstName} ${lastName}" <${email}>`, // Reply goes directly to customer
            subject: `New Contact Form Submission from ${firstName} ${lastName}`,
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
        .header { background: linear-gradient(135deg, #d4af8b 0%, #c19a6b 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
        .field { margin-bottom: 20px; }
        .field-label { font-weight: bold; color: #666; margin-bottom: 5px; }
        .field-value { background: #f5f5f5; padding: 10px; border-radius: 4px; }
        .message-box { background: #f5f5f5; padding: 15px; border-left: 4px solid #d4af8b; border-radius: 4px; margin-top: 10px; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>New Contact Form Submission</h1>
        </div>
        <div class="content">
            <div class="field">
                <div class="field-label">Name:</div>
                <div class="field-value">${firstName} ${lastName}</div>
            </div>
            
            <div class="field">
                <div class="field-label">Email:</div>
                <div class="field-value"><a href="mailto:${email}">${email}</a></div>
            </div>
            
            ${phone ? `
            <div class="field">
                <div class="field-label">Phone:</div>
                <div class="field-value"><a href="tel:${phone}">${phone}</a></div>
            </div>
            ` : ''}
            
            <div class="field">
                <div class="field-label">Message:</div>
                <div class="message-box">${message.replace(/\n/g, '<br>')}</div>
            </div>
            
            <div class="footer">
                <p>Received: ${new Date().toLocaleString()}</p>
                <p><em>💡 Click "Reply" to respond directly to ${email}</em></p>
            </div>
        </div>
    </div>
</body>
</html>
            `,
            text: `
New Contact Form Submission

Name: ${firstName} ${lastName}
Email: ${email}
${phone ? `Phone: ${phone}` : ''}

Message:
${message}

Received: ${new Date().toLocaleString()}
            `
        };
        
        const info = await transporter.sendMail(mailOptions);
        console.log('Contact form email sent:', info.messageId);
        
        // Log preview URL for Ethereal Email (development)
        if (process.env.NODE_ENV !== 'production' && info.messageId) {
            const previewUrl = `https://ethereal.email/message/${info.messageId.split('@')[0]}`;
            console.log('📧 Preview email:', previewUrl);
        }
        
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Contact form email error:', error);
        throw error;
    }
}

module.exports = {
    sendEmail,
    sendPasswordResetEmail,
    sendOrderConfirmationEmail,
    sendOrderStatusUpdateEmail,
    sendWelcomeEmail,
    sendContactFormEmail
};
