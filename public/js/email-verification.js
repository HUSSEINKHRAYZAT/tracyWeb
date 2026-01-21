// Email Verification Modal and Handler
class EmailVerification {
    constructor() {
        this.email = null;
        this.userId = null;
        this.initModal();
    }

    initModal() {
        // Wait for body to be available
        if (!document.body) {
            console.warn('⚠️ document.body not ready, waiting...');
            setTimeout(() => this.initModal(), 50);
            return;
        }
        
        // Create modal HTML
        const modalHTML = `
            <div id="verificationModal" class="modal-overlay" style="display: none;">
                <div class="modal-container">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2>🔐 Verify Your Email</h2>
                            <p>We've sent a 6-digit verification code to <strong id="verifyEmail"></strong></p>
                        </div>
                        
                        <div class="modal-body">
                            <div class="otp-input-container">
                                <input type="text" maxlength="1" class="otp-input" data-index="0" />
                                <input type="text" maxlength="1" class="otp-input" data-index="1" />
                                <input type="text" maxlength="1" class="otp-input" data-index="2" />
                                <input type="text" maxlength="1" class="otp-input" data-index="3" />
                                <input type="text" maxlength="1" class="otp-input" data-index="4" />
                                <input type="text" maxlength="1" class="otp-input" data-index="5" />
                            </div>
                            
                            <div class="verification-actions">
                                <button type="button" id="verifyButton" class="btn btn-primary">
                                    Verify Email
                                </button>
                                <button type="button" id="resendOtpButton" class="btn btn-secondary">
                                    Resend Code
                                </button>
                            </div>
                            
                            <div class="verification-info">
                                <p class="info-text">
                                    ⏱️ Code expires in <span id="otpTimer">10:00</span>
                                </p>
                                <p class="info-text">
                                    Didn't receive the code? Check your spam folder or click resend.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to body
        try {
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            console.log('✅ Verification modal HTML added to page');
            
            // Verify it was added
            const modalCheck = document.getElementById('verificationModal');
            console.log('✅ Modal element exists:', !!modalCheck);
        } catch (error) {
            console.error('❌ Failed to add modal HTML:', error);
        }
        
        // Initialize OTP inputs
        this.initOtpInputs();
        
        // Attach event listeners
        const verifyBtn = document.getElementById('verifyButton');
        const resendBtn = document.getElementById('resendOtpButton');
        
        if (verifyBtn) {
            verifyBtn.addEventListener('click', () => this.verifyEmail());
            console.log('✅ Verify button listener attached');
        }
        if (resendBtn) {
            resendBtn.addEventListener('click', () => this.resendOtp());
            console.log('✅ Resend button listener attached');
        }
    }

    initOtpInputs() {
        const inputs = document.querySelectorAll('.otp-input');
        
        inputs.forEach((input, index) => {
            // Auto-focus next input
            input.addEventListener('input', (e) => {
                const value = e.target.value;
                
                if (value.length === 1 && index < inputs.length - 1) {
                    inputs[index + 1].focus();
                }
            });
            
            // Handle backspace
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    inputs[index - 1].focus();
                }
            });
            
            // Only allow numbers
            input.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
            });
            
            // Handle paste
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
                
                if (pastedData.length === 6) {
                    inputs.forEach((inp, i) => {
                        inp.value = pastedData[i] || '';
                    });
                    inputs[5].focus();
                }
            });
        });
    }

    show(email, userId) {
        this.email = email;
        this.userId = userId;
        
        console.log('📧 Showing verification modal for:', email);
        
        const emailElement = document.getElementById('verifyEmail');
        const modalElement = document.getElementById('verificationModal');
        
        if (!emailElement || !modalElement) {
            console.error('❌ Modal elements not found! emailElement:', emailElement, 'modalElement:', modalElement);
            
            // Try to reinitialize modal
            console.log('🔄 Attempting to reinitialize modal...');
            this.initModal();
            
            // Try again after a short delay
            setTimeout(() => {
                const retryEmailElement = document.getElementById('verifyEmail');
                const retryModalElement = document.getElementById('verificationModal');
                if (retryEmailElement && retryModalElement) {
                    retryEmailElement.textContent = email;
                    retryModalElement.style.display = 'flex';
                    console.log('✅ Modal shown on retry');
                    
                    const firstInput = document.querySelector('.otp-input');
                    if (firstInput) firstInput.focus();
                    this.startTimer(10 * 60);
                } else {
                    alert('Verification modal failed to load. Please refresh the page and try again.');
                }
            }, 200);
            return;
        }
        
        emailElement.textContent = email;
        
        // Force display with multiple methods
        modalElement.style.display = 'flex';
        modalElement.style.setProperty('display', 'flex', 'important');
        modalElement.classList.add('active');
        
        console.log('✅ Modal display set to flex');
        console.log('✅ Modal computed display:', window.getComputedStyle(modalElement).display);
        console.log('✅ Modal computed z-index:', window.getComputedStyle(modalElement).zIndex);
        console.log('✅ Modal classList:', modalElement.classList.toString());
        console.log('✅ Modal inline style:', modalElement.style.cssText);
        
        // Focus first input
        const firstInput = document.querySelector('.otp-input');
        if (firstInput) {
            firstInput.focus();
            console.log('✅ First input focused');
        }
        
        // Start timer
        this.startTimer(10 * 60); // 10 minutes
    }

    hide() {
        document.getElementById('verificationModal').style.display = 'none';
        
        // Clear inputs
        document.querySelectorAll('.otp-input').forEach(input => input.value = '');
        
        // Clear timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }

    getOtpValue() {
        const inputs = document.querySelectorAll('.otp-input');
        return Array.from(inputs).map(input => input.value).join('');
    }

    async verifyEmail() {
        const otp = this.getOtpValue();
        
        if (otp.length !== 6) {
            showNotification('Please enter the complete 6-digit code', 'warning');
            return;
        }
        
        const verifyButton = document.getElementById('verifyButton');
        verifyButton.disabled = true;
        verifyButton.textContent = 'Verifying...';
        
        try {
            const response = await api.verifyEmail(this.email, otp);
            
            if (response.success) {
                showNotification(response.message || 'Email verified successfully!', 'success');
                this.hide();
                
                // Update auth state
                if (typeof window.updateAuthButtons === 'function') {
                    window.updateAuthButtons();
                }
                if (typeof window.updateCartCount === 'function') {
                    window.updateCartCount();
                }
                
                // Redirect to shop page after successful verification
                setTimeout(() => {
                    window.location.href = '/shop.html';
                }, 1500);
            }
        } catch (error) {
            console.error('Verification error:', error);
            showNotification(error.error?.message || error.message || 'Verification failed', 'error');
            verifyButton.disabled = false;
            verifyButton.textContent = 'Verify Email';
        }
    }

    async resendOtp() {
        const resendButton = document.getElementById('resendOtpButton');
        resendButton.disabled = true;
        resendButton.textContent = 'Sending...';
        
        try {
            const response = await api.resendVerification(this.email);
            
            if (response.success) {
                showNotification(response.message || 'Code sent! Check your email.', 'success');
                
                // Restart timer
                this.startTimer(10 * 60);
                
                // Re-enable button after 30 seconds
                setTimeout(() => {
                    resendButton.disabled = false;
                    resendButton.textContent = 'Resend Code';
                }, 30000);
            }
        } catch (error) {
            console.error('Resend error:', error);
            showNotification(error.error?.message || error.message || 'Failed to resend code', 'error');
            resendButton.disabled = false;
            resendButton.textContent = 'Resend Code';
        }
    }

    startTimer(seconds) {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        let timeLeft = seconds;
        const timerElement = document.getElementById('otpTimer');
        
        const updateTimer = () => {
            const minutes = Math.floor(timeLeft / 60);
            const secs = timeLeft % 60;
            timerElement.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;
            
            if (timeLeft <= 0) {
                clearInterval(this.timerInterval);
                timerElement.textContent = 'Expired';
                showNotification('Verification code expired. Please request a new one.', 'warning');
            }
            
            timeLeft--;
        };
        
        updateTimer();
        this.timerInterval = setInterval(updateTimer, 1000);
    }
}

// Initialize global verification handler after DOM is ready
let emailVerification;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        emailVerification = new EmailVerification();
        console.log('✅ EmailVerification initialized');
    });
} else {
    // DOM already loaded
    emailVerification = new EmailVerification();
    console.log('✅ EmailVerification initialized');
}
