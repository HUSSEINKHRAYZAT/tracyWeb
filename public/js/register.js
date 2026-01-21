const registerForm = document.getElementById('registerForm');
const submitBtn = document.getElementById('submitBtn');
const errorMessage = document.getElementById('errorMessage');

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Prevent double submission
    if (submitBtn.disabled) return;
    
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validate passwords match
    if (password !== confirmPassword) {
        errorMessage.textContent = 'Passwords do not match';
        errorMessage.style.display = 'block';
        return;
    }
    
    // Validate password requirements
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        errorMessage.textContent = 'Password must contain uppercase, lowercase, and number';
        errorMessage.style.display = 'block';
        return;
    }
    
    const userData = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        password: password
    };
    
    errorMessage.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';
    
    try {
        const response = await api.register(userData);
        
        if (response.success && response.data.requiresVerification) {
            showNotification('Account created! Please verify your email.', 'success');
            
            // Show verification modal
            if (typeof emailVerification !== 'undefined') {
                emailVerification.show(userData.email, response.data.userId);
            } else {
                console.error('Email verification module not loaded');
                showNotification('Please check your email for the verification code.', 'info');
            }
            
            submitBtn.textContent = 'Account Created ✓';
            setTimeout(() => {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Account';
            }, 2000);
        }
    } catch (error) {
        const errorMsg = error.error?.message || error.message || 'Registration failed. Please try again.';
        showNotification(errorMsg, 'error');
        errorMessage.textContent = errorMsg;
        errorMessage.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
    }
});
