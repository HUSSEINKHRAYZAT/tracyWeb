const pool = require('../config/database');
const bcrypt = require('bcrypt');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

class User {
    /**
     * Create a new user with hashed password
     */
    static async create(userData) {
        const {
            email,
            password,
            firstName,
            lastName,
            phone,
            role = 'customer',
            emailVerificationToken = null,
            emailVerificationExpiry = null
        } = userData;

        // Hash password
        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

        const query = `
            INSERT INTO users (
                email, password_hash, first_name, last_name, 
                phone, role, status, email_verification_token, 
                email_verification_expiry, email_verified
            )
            VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8, false)
            RETURNING id, email, first_name, last_name, phone, role, 
                      status, email_verified, email_verification_token,
                      email_verification_expiry, created_at
        `;

        const values = [
            email, 
            passwordHash, 
            firstName, 
            lastName, 
            phone, 
            role,
            emailVerificationToken,
            emailVerificationExpiry
        ];
        
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    /**
     * Find user by email
     */
    static async findByEmail(email) {
        const query = `
            SELECT * FROM users 
            WHERE email = $1 AND deleted_at IS NULL
        `;
        const result = await pool.query(query, [email]);
        return result.rows[0] || null;
    }

    /**
     * Find user by ID
     */
    static async findById(id) {
        const query = `
            SELECT id, email, first_name, last_name, phone, role, 
                   status, email_verified, last_login, created_at
            FROM users 
            WHERE id = $1 AND deleted_at IS NULL
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0] || null;
    }

    /**
     * Verify password against hash
     */
    static async verifyPassword(user, password) {
        return await bcrypt.compare(password, user.password_hash);
    }

    /**
     * Update password
     */
    static async updatePassword(userId, newPassword) {
        const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        
        const query = `
            UPDATE users 
            SET password_hash = $1,
                password_reset_token = NULL,
                password_reset_expires = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id
        `;

        const result = await pool.query(query, [passwordHash, userId]);
        return result.rows[0] || null;
    }

    /**
     * Increment failed login attempts
     */
    static async incrementFailedLogins(userId) {
        const query = `
            UPDATE users 
            SET failed_login_attempts = failed_login_attempts + 1,
                locked_until = CASE 
                    WHEN failed_login_attempts + 1 >= $1 
                    THEN CURRENT_TIMESTAMP + INTERVAL '${LOCK_DURATION_MINUTES} minutes'
                    ELSE locked_until
                END
            WHERE id = $2
            RETURNING failed_login_attempts, locked_until
        `;

        const result = await pool.query(query, [MAX_FAILED_ATTEMPTS, userId]);
        return result.rows[0];
    }

    /**
     * Reset failed login attempts on successful login
     */
    static async resetFailedLogins(userId) {
        const query = `
            UPDATE users 
            SET failed_login_attempts = 0,
                locked_until = NULL,
                last_login = CURRENT_TIMESTAMP
            WHERE id = $1
        `;

        await pool.query(query, [userId]);
    }

    /**
     * Check if account is locked
     */
    static async isAccountLocked(user) {
        if (!user.locked_until) return false;
        
        const now = new Date();
        const lockedUntil = new Date(user.locked_until);
        
        return lockedUntil > now;
    }

    /**
     * Set password reset token
     */
    static async setPasswordResetToken(userId, token, expiry = null) {
        const expiryDate = expiry || new Date(Date.now() + 60 * 60 * 1000); // Default 1 hour
        
        const query = `
            UPDATE users 
            SET password_reset_token = $1,
                password_reset_expires = $2
            WHERE id = $3
            RETURNING id
        `;

        const result = await pool.query(query, [token, expiryDate, userId]);
        return result.rows[0] || null;
    }

    /**
     * Find user by password reset token
     */
    static async findByResetToken(token) {
        const query = `
            SELECT * FROM users 
            WHERE password_reset_token = $1 
              AND password_reset_expires > CURRENT_TIMESTAMP
              AND deleted_at IS NULL
        `;

        const result = await pool.query(query, [token]);
        return result.rows[0] || null;
    }

    /**
     * Set email verification token
     */
    static async setEmailVerificationToken(userId, token) {
        const query = `
            UPDATE users 
            SET email_verification_token = $1
            WHERE id = $2
            RETURNING id
        `;

        const result = await pool.query(query, [token, userId]);
        return result.rows[0] || null;
    }

    /**
     * Verify email
     */
    static async verifyEmail(token) {
        const query = `
            UPDATE users 
            SET email_verified = TRUE,
                email_verification_token = NULL
            WHERE email_verification_token = $1
            RETURNING id, email
        `;

        const result = await pool.query(query, [token]);
        return result.rows[0] || null;
    }

    /**
     * Update user profile
     */
    static async update(userId, updates) {
        const { firstName, lastName, phone } = updates;
        
        const query = `
            UPDATE users 
            SET first_name = COALESCE($1, first_name),
                last_name = COALESCE($2, last_name),
                phone = COALESCE($3, phone),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING id, email, first_name, last_name, phone, role
        `;

        const result = await pool.query(query, [firstName, lastName, phone, userId]);
        return result.rows[0] || null;
    }

    /**
     * Soft delete user
     */
    static async delete(userId) {
        const query = `
            UPDATE users 
            SET deleted_at = CURRENT_TIMESTAMP,
                status = 'deleted'
            WHERE id = $1
            RETURNING id
        `;

        const result = await pool.query(query, [userId]);
        return result.rows[0] || null;
    }

    /**
     * Check if email exists
     */
    static async emailExists(email) {
        const query = `
            SELECT id FROM users 
            WHERE email = $1 AND deleted_at IS NULL
        `;
        
        const result = await pool.query(query, [email]);
        return result.rows.length > 0;
    }

    /**
     * Verify user's email
     */
    static async verifyEmail(userId) {
        const query = `
            UPDATE users 
            SET email_verified = true,
                email_verification_token = NULL,
                email_verification_expiry = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, email, email_verified
        `;

        const result = await pool.query(query, [userId]);
        return result.rows[0] || null;
    }

    /**
     * Update email verification token
     */
    static async updateVerificationToken(userId, token, expiry) {
        const query = `
            UPDATE users 
            SET email_verification_token = $1,
                email_verification_expiry = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING id
        `;

        const result = await pool.query(query, [token, expiry, userId]);
        return result.rows[0] || null;
    }

    /**
     * Clear password reset token
     */
    static async clearPasswordResetToken(userId) {
        const query = `
            UPDATE users 
            SET password_reset_token = NULL,
                password_reset_expires = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id
        `;

        const result = await pool.query(query, [userId]);
        return result.rows[0] || null;
    }
}

module.exports = User;
