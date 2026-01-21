const { sendContactFormEmail } = require('../services/email');

/**
 * Submit contact form
 * POST /api/contact
 */
async function submitContactForm(req, res) {
    try {
        const { firstName, lastName, email, phone, message } = req.body;

        // Validate required fields
        if (!firstName || !lastName || !email || !message) {
            return res.status(400).json({
                success: false,
                message: 'First name, last name, email, and message are required'
            });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email address'
            });
        }

        // Send email
        await sendContactFormEmail({
            firstName,
            lastName,
            email,
            phone: phone || null,
            message
        });

        res.json({
            success: true,
            message: 'Thank you for your message! We will get back to you soon.'
        });
    } catch (error) {
        console.error('Contact form submission error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message. Please try again later.'
        });
    }
}

module.exports = {
    submitContactForm
};
