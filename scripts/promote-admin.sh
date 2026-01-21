#!/bin/bash

echo "🔑 Promote User to Admin"
echo "========================"
echo ""
echo "⚠️  SECURITY WARNING:"
echo "This script requires database access and should only be used:"
echo "  1. During initial setup to create the first admin"
echo "  2. By system administrators with direct server access"
echo "  3. After this, use the admin panel to promote other users"
echo ""

# Get the absolute path to the web directory
WEB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Require sudo for extra security
if [ "$EUID" -ne 0 ]; then 
    echo "❌ This script must be run with sudo for security"
    echo "   Usage: sudo ./promote-admin.sh [email]"
    exit 1
fi

# Check if email was provided as argument
if [ -n "$1" ]; then
    EMAIL="$1"
else
    read -p "Enter email address to make admin: " EMAIL
fi

if [ -z "$EMAIL" ]; then
    echo "❌ Email address is required"
    exit 1
fi

# Confirmation prompt
echo ""
echo "⚠️  You are about to promote this user to ADMIN:"
echo "   Email: $EMAIL"
echo ""
read -p "Are you sure? (type 'YES' to confirm): " CONFIRM

if [ "$CONFIRM" != "YES" ]; then
    echo "❌ Cancelled"
    exit 1
fi

cd "$WEB_DIR/backend"

node -e "
const pool = require('./src/config/database');
const auditLog = require('./src/services/auditLog');
(async () => {
  try {
    const email = '$EMAIL';
    
    // Check if user exists first
    const checkResult = await pool.query(
      'SELECT id, email, role, first_name, last_name FROM users WHERE email = \$1',
      [email]
    );
    
    if (checkResult.rows.length === 0) {
      console.log('');
      console.log('❌ No user found with email:', email);
      console.log('');
      console.log('💡 Make sure the user has registered an account first.');
      console.log('');
      process.exit(1);
    }
    
    const user = checkResult.rows[0];
    
    // Check if already admin
    if (user.role === 'admin' || user.role === 'super_admin') {
      console.log('');
      console.log('ℹ️  User is already an admin:');
      console.log('   Current role:', user.role);
      console.log('');
      process.exit(0);
    }
    
    // Promote to admin
    const result = await pool.query(
      'UPDATE users SET role = \$1 WHERE email = \$2 RETURNING id, email, role, first_name, last_name',
      ['admin', email]
    );
    
    const updatedUser = result.rows[0];
    
    // Log the promotion
    try {
      await auditLog.log({
        userId: updatedUser.id,
        action: 'USER_PROMOTED',
        details: {
          email: email,
          oldRole: user.role,
          newRole: 'admin',
          promotedBy: 'system_script'
        },
        ipAddress: 'localhost',
        userAgent: 'promote-admin.sh'
      });
    } catch (logError) {
      console.error('Warning: Failed to create audit log:', logError.message);
    }
    
    console.log('');
    console.log('✅ User promoted to admin successfully!');
    console.log('');
    console.log('   Name:', updatedUser.first_name, updatedUser.last_name);
    console.log('   Email:', updatedUser.email);
    console.log('   Previous Role:', user.role);
    console.log('   New Role:', updatedUser.role);
    console.log('');
    console.log('⚠️  IMPORTANT: For security reasons, future promotions should');
    console.log('   be done through the admin panel, not this script!');
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Error:', error.message);
    console.error('');
    process.exit(1);
  }
})();
"

EXIT_CODE=$?
exit $EXIT_CODE
