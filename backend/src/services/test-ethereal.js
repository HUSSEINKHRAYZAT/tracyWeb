// Generate Ethereal Email test account
const nodemailer = require('nodemailer');

async function createTestAccount() {
    try {
        const testAccount = await nodemailer.createTestAccount();
        console.log('\n📧 Ethereal Email Test Account Created:');
        console.log('=====================================');
        console.log('SMTP_HOST=smtp.ethereal.email');
        console.log('SMTP_PORT=587');
        console.log('SMTP_SECURE=false');
        console.log(`SMTP_USER=${testAccount.user}`);
        console.log(`SMTP_PASS=${testAccount.pass}`);
        console.log('SMTP_FROM=noreply@tracytalkshealth.com');
        console.log('=====================================\n');
        console.log('Copy these values to your .env file');
        console.log('\nTest account valid for ~7 days');
        console.log('Web Interface: https://ethereal.email/login');
        console.log(`Username: ${testAccount.user}`);
        console.log(`Password: ${testAccount.pass}`);
    } catch (error) {
        console.error('Failed to create test account:', error);
    }
}

createTestAccount();
