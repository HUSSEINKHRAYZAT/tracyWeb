# Security Model

## User Roles and Permissions

### Role Hierarchy
1. **customer** (default) - Can shop and manage their own orders
2. **admin** - Can manage products, orders, and view analytics
3. **super_admin** - Can manage products, orders, analytics, AND promote users

### Admin Promotion Security

#### ⚠️ CRITICAL: Initial Setup Only
The `promote-admin.sh` script should ONLY be used for:
- Creating the **first super_admin** during initial setup
- Emergency recovery when all admins are locked out

#### Security Measures for promote-admin.sh
1. **Requires sudo** - Must have root/administrator access
2. **Confirmation prompt** - Asks for explicit "YES" confirmation
3. **Audit logging** - Records who was promoted and when
4. **Warning messages** - Reminds admins to use the admin panel instead

#### Production Deployment
After creating your first super_admin:

1. **Restrict script access:**
   ```bash
   chmod 700 /path/to/promote-admin.sh
   chown root:root /path/to/promote-admin.sh
   ```

2. **Remove from web-accessible directories:**
   - Never deploy scripts folder to production web server
   - Keep it in a secure location accessible only by system admins

3. **Use the Admin Panel instead:**
   - Super admins can promote users through the admin dashboard
   - All promotions are logged and audited
   - Role changes require authentication

## Secure User Promotion Workflow

### Step 1: Initial Setup (ONE TIME ONLY)
```bash
# On your server, with sudo access
sudo ./scripts/promote-admin.sh your-email@example.com
```

### Step 2: All Future Promotions (Through Admin Panel)
1. Log in as super_admin
2. Go to Admin Dashboard → Users (when implemented in UI)
3. Find the user to promote
4. Change their role to "admin"
5. The system will:
   - Verify you're a super_admin
   - Prevent you from changing your own role
   - Prevent promotion to super_admin (must use script for that)
   - Create an audit log entry

## Role Permission Matrix

| Action | Customer | Admin | Super Admin |
|--------|----------|-------|-------------|
| View products | ✅ | ✅ | ✅ |
| Place orders | ✅ | ✅ | ✅ |
| View own orders | ✅ | ✅ | ✅ |
| Manage products | ❌ | ✅ | ✅ |
| View all orders | ❌ | ✅ | ✅ |
| Update order status | ❌ | ✅ | ✅ |
| View analytics | ❌ | ✅ | ✅ |
| View all users | ❌ | ❌ | ✅ |
| Promote to admin | ❌ | ❌ | ✅ |
| Promote to super_admin | ❌ | ❌ | ❌ (script only) |

## API Endpoints Security

### User Role Management
**Endpoint:** `PUT /api/admin/users/:id/role`

**Security Checks:**
1. Requires authentication
2. Requires super_admin role
3. Cannot promote to super_admin
4. Cannot change your own role
5. Cannot demote super_admin
6. All changes are audit logged

**Usage:**
```javascript
// Only super_admin can do this
await api.put('/api/admin/users/123/role', {
  role: 'admin' // or 'customer'
});
```

## Audit Logging

All sensitive actions are logged:
- User role changes (who changed whom, from what to what)
- Admin promotions via script
- Login attempts
- Password changes
- Password resets

Logs include:
- User ID and email
- Action performed
- IP address
- User agent
- Timestamp
- Additional details

## Best Practices

### For Developers
1. Never commit database credentials to git
2. Never expose promote-admin.sh in public repositories
3. Use environment variables for sensitive configuration
4. Implement rate limiting on all authentication endpoints
5. Use HTTPS in production

### For System Administrators
1. Create only ONE super_admin initially
2. Limit super_admin accounts (max 2-3)
3. Use strong passwords for admin accounts
4. Enable 2FA when available
5. Regularly audit role changes
6. Monitor audit logs for suspicious activity
7. Restrict SSH/server access to trusted IPs

### For Production Deployment
```bash
# Secure the promote-admin script
sudo chmod 700 /opt/app/scripts/promote-admin.sh
sudo chown root:root /opt/app/scripts/promote-admin.sh

# Only include necessary files in deployment
# DO NOT deploy:
# - /scripts/ folder
# - .env files
# - Database migration scripts
# - Development tools
```

## Emergency Recovery

If all super_admins are locked out:

1. SSH into the server as root
2. Run the promote-admin script:
   ```bash
   sudo /opt/app/scripts/promote-admin.sh admin@yourdomain.com
   ```
3. Log in with the promoted account
4. Fix the issue that caused the lockout
5. Review audit logs to understand what happened

## Security Checklist

- [ ] First super_admin created via promote-admin.sh
- [ ] promote-admin.sh secured with chmod 700
- [ ] promote-admin.sh owned by root
- [ ] Scripts folder excluded from production deployment
- [ ] Environment variables set for production
- [ ] HTTPS enabled with valid SSL certificate
- [ ] Database credentials secured
- [ ] Rate limiting enabled
- [ ] Audit logging enabled
- [ ] Regular backups configured
- [ ] Admin accounts use strong passwords
- [ ] Monitoring and alerting configured
