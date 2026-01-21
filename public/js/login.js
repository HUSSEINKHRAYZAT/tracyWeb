// Login Form Handler with Beautiful Notifications and Enhanced UX
const loginForm = document.getElementById('loginForm');
const submitBtn = document.getElementById('submitBtn');
const btnText = document.getElementById('btnText');
const togglePasswordBtn = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');
const emailInput = document.getElementById('email');
const eyeIcon = document.getElementById('eyeIcon');

// Form validation
const validators = {
    email: (value) => {
        if (!value) return 'Email is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Please enter a valid email address';
        return '';
    },
    password: (value) => {
        if (!value) return 'Password is required';
        if (value.length < 6) return 'Password must be at least 6 characters';
        return '';
    }
};

// Validate field and show error
function validateField(fieldId, value) {
    const error = validators[fieldId](value);
    const group = document.getElementById(fieldId + 'Group');
    const errorEl = document.getElementById(fieldId + '-error');
    
    if (error) {
        group.classList.add('error');
        group.classList.remove('success');
        errorEl.textContent = error;
        return false;
    } else {
        group.classList.remove('error');
        if (value) group.classList.add('success');
        errorEl.textContent = '';
        return true;
    }
}

// Real-time validation on blur
if (emailInput) {
    emailInput.addEventListener('blur', () => {
        validateField('email', emailInput.value);
    });
    
    // Clear error on input
    emailInput.addEventListener('input', () => {
        const group = document.getElementById('emailGroup');
        if (group.classList.contains('error')) {
            validateField('email', emailInput.value);
        }
    });
}

if (passwordInput) {
    passwordInput.addEventListener('blur', () => {
        validateField('password', passwordInput.value);
    });
    
    passwordInput.addEventListener('input', () => {
        const group = document.getElementById('passwordGroup');
        if (group.classList.contains('error')) {
            validateField('password', passwordInput.value);
        }
    });
}

// Password visibility toggle with smooth animation
if (togglePasswordBtn && passwordInput && eyeIcon) {
    togglePasswordBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        eyeIcon.textContent = type === 'password' ? '👁️' : '🙈';
        
        // Add ripple effect
        const ripple = document.createElement('span');
        ripple.style.cssText = 'position: absolute; width: 100%; height: 100%; background: rgba(0,0,0,0.1); border-radius: 50%; transform: scale(0); animation: ripple 0.4s ease-out;';
        togglePasswordBtn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 400);
    });
}

// Remember me functionality
const rememberMeCheckbox = document.getElementById('rememberMe');
if (rememberMeCheckbox) {
    // Load saved preference
    if (localStorage.getItem('rememberMe') === 'true') {
        rememberMeCheckbox.checked = true;
        const savedEmail = localStorage.getItem('savedEmail');
        if (savedEmail && emailInput) {
            emailInput.value = savedEmail;
        }
    }
}

// Form submission
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        // Validate all fields
        const emailValid = validateField('email', email);
        const passwordValid = validateField('password', password);
        
        if (!emailValid || !passwordValid) {
            // Focus first invalid field
            if (!emailValid) emailInput.focus();
            else if (!passwordValid) passwordInput.focus();
            return;
        }
        
        // Disable form and show loading state
        submitBtn.disabled = true;
        btnText.textContent = 'Logging in...';
        loginForm.style.pointerEvents = 'none';
        
        try {
            const response = await api.login(email, password);
            
            if (response.success) {
                // Handle remember me
                if (rememberMeCheckbox && rememberMeCheckbox.checked) {
                    localStorage.setItem('rememberMe', 'true');
                    localStorage.setItem('savedEmail', email);
                } else {
                    localStorage.removeItem('rememberMe');
                    localStorage.removeItem('savedEmail');
                }
                
                showNotification('Login successful! Redirecting...', 'success');
                
                // Update auth state immediately
                if (typeof window.updateAuthButtons === 'function') {
                    window.updateAuthButtons();
                }
                if (typeof window.updateCartCount === 'function') {
                    window.updateCartCount();
                }
                
                // Redirect based on user role with smooth transition
                setTimeout(() => {
                    if (response.data.user.role === 'admin' || response.data.user.role === 'super_admin') {
                        window.location.href = '/admin.html';
                    } else {
                        window.location.href = '/shop.html';
                    }
                }, 1200);
            }
        } catch (error) {
            // Re-enable form
            submitBtn.disabled = false;
            btnText.textContent = 'Log In';
            loginForm.style.pointerEvents = 'auto';
            
            // Check if error is due to unverified email
            if (error.error && error.error.code === 'EMAIL_NOT_VERIFIED') {
                showNotification('Please verify your email first.', 'warning');
                
                // Show verification modal
                if (typeof emailVerification !== 'undefined') {
                    emailVerification.show(email, error.error.userId);
                } else {
                    showNotification('Check your inbox for the verification code.', 'error');
                }
            } else {
                const errorMessage = error.error?.message || error.message || 'Login failed. Please check your credentials.';
                showNotification(errorMessage, 'error');
                
                // Show field-specific errors if credentials are wrong
                if (errorMessage.toLowerCase().includes('password') || errorMessage.toLowerCase().includes('credentials')) {
                    document.getElementById('passwordGroup').classList.add('error');
                    document.getElementById('password-error').textContent = 'Invalid credentials';
                }
            }
        }
    });
}

// Add ripple animation style if not exists
if (!document.getElementById('ripple-style')) {
    const style = document.createElement('style');
    style.id = 'ripple-style';
    style.textContent = `
        @keyframes ripple {
            to { transform: scale(2); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// Forgot Password functionality
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
console.log('Forgot password link found:', forgotPasswordLink);
if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Forgot password link clicked');
        showForgotPasswordModal();
    });
}

function showForgotPasswordModal() {
    // Prevent multiple modals
    const existingModal = document.getElementById('forgotPasswordModal');
    if (existingModal) {
        console.log('Modal already exists, removing old one');
        existingModal.remove();
    }
    
    console.log('Creating forgot password modal...');
    const modal = document.createElement('div');
    modal.id = 'forgotPasswordModal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 99999;';
    modal.innerHTML = `
        <div class="modal-container" style="background: white; border-radius: 16px; padding: 40px; max-width: 500px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
            <h2 style="margin: 0 0 10px 0; font-family: var(--font-heading); color: var(--neutral-900);">Reset Your Password</h2>
            <p style="color: var(--neutral-600); margin-bottom: 25px;">Enter your email address and we'll send you a code to reset your password.</p>
                
                <div id="forgotPasswordStep1">
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--neutral-700);">Email Address</label>
                        <input type="email" id="resetEmail" placeholder="your@email.com" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button id="sendResetCodeBtn" style="flex: 1; padding: 12px; background: var(--primary-600); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Send Reset Code</button>
                        <button id="cancelResetBtn" style="padding: 12px 20px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer;">Cancel</button>
                    </div>
                </div>
                
                <div id="forgotPasswordStep2" style="display: none;">
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--neutral-700);">Verification Code</label>
                        <input type="text" id="resetOtp" placeholder="Enter 6-digit code" maxlength="6" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 20px; text-align: center; letter-spacing: 5px;">
                    </div>
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--neutral-700);">New Password</label>
                        <input type="password" id="newPassword" placeholder="Enter new password" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
                    </div>
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--neutral-700);">Confirm Password</label>
                        <input type="password" id="confirmNewPassword" placeholder="Confirm new password" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button id="resetPasswordBtn" style="flex: 1; padding: 12px; background: var(--primary-600); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Reset Password</button>
                        <button id="cancelReset2Btn" style="padding: 12px 20px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer;">Cancel</button>
                    </div>
                </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    console.log('Modal appended to body');

    // Focus on email input
    setTimeout(() => {
        const emailInput = document.getElementById('resetEmail');
        if (emailInput) emailInput.focus();
    }, 100);
    
    // Event listeners
    document.getElementById('cancelResetBtn').addEventListener('click', closeForgotPasswordModal);
    document.getElementById('cancelReset2Btn').addEventListener('click', closeForgotPasswordModal);
    
    document.getElementById('sendResetCodeBtn').addEventListener('click', async () => {
        const email = document.getElementById('resetEmail').value;
        if (!email) {
            showNotification('Please enter your email address', 'error');
            return;
        }
        
        const btn = document.getElementById('sendResetCodeBtn');
        btn.disabled = true;
        btn.textContent = 'Sending...';
        
        try {
            const response = await api.forgotPassword(email);
            showNotification('Reset code sent! Check your email.', 'success');
            
            // Show step 2
            document.getElementById('forgotPasswordStep1').style.display = 'none';
            document.getElementById('forgotPasswordStep2').style.display = 'block';
        } catch (error) {
            showNotification(error.error?.message || 'Failed to send reset code', 'error');
            btn.disabled = false;
            btn.textContent = 'Send Reset Code';
        }
    });
    
    document.getElementById('resetPasswordBtn').addEventListener('click', async () => {
        const email = document.getElementById('resetEmail').value;
        const otp = document.getElementById('resetOtp').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmNewPassword').value;
        
        if (!otp || otp.length !== 6) {
            showNotification('Please enter the 6-digit code', 'error');
            return;
        }
        
        if (!newPassword || newPassword.length < 8) {
            showNotification('Password must be at least 8 characters', 'error');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showNotification('Passwords do not match', 'error');
            return;
        }
        
        const btn = document.getElementById('resetPasswordBtn');
        btn.disabled = true;
        btn.textContent = 'Resetting...';
        
        try {
            const response = await api.resetPassword(email, otp, newPassword);
            showNotification('Password reset successfully! You can now login.', 'success');
            closeForgotPasswordModal();
        } catch (error) {
            showNotification(error.error?.message || 'Failed to reset password', 'error');
            btn.disabled = false;
            btn.textContent = 'Reset Password';
        }
    });
}

function closeForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) {
        modal.remove();
    }
}
