// Auth Modal Functions - Modern with smooth transitions

function openAuthModal(mode = 'choice') {
    const modal = document.getElementById('authModal');
    const content = document.getElementById('authModalContent');
    
    if (mode === 'choice') {
        content.innerHTML = `
            <div class="modal-header">
                <h2 class="modal-title">Welcome Back</h2>
                <button onclick="closeAuthModal()" class="modal-close" aria-label="Close">×</button>
            </div>
            <p style="text-align: center; margin-bottom: 2rem; color: var(--neutral-600); font-size: var(--text-lg);">
                Please login or create an account to continue
            </p>
            <div style="display: flex; flex-direction: column; gap: var(--space-3);">
                <button onclick="showLoginForm()" class="btn btn-primary" style="width: 100%;">
                    Login to Your Account
                </button>
                <button onclick="showRegisterForm()" class="btn btn-outline" style="width: 100%;">
                    Create New Account
                </button>
            </div>
        `;
    }
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

function showLoginForm() {
    const content = document.getElementById('authModalContent');
    content.innerHTML = `
        <div class="modal-header">
            <h2 class="modal-title">Login</h2>
            <button onclick="closeAuthModal()" class="modal-close" aria-label="Close">×</button>
        </div>
        <form id="modalLoginForm" style="display: flex; flex-direction: column; gap: var(--space-5);">
            <div class="form-group">
                <label for="loginEmail" class="form-label required">Email</label>
                <input type="email" id="loginEmail" class="form-input" placeholder="you@example.com" required>
            </div>
            <div class="form-group">
                <label for="loginPassword" class="form-label required">Password</label>
                <div class="password-input-wrapper" style="position: relative;">
                    <input type="password" id="loginPassword" class="form-input" placeholder="••••••••" required>
                    <button type="button" onclick="togglePassword('loginPassword')" class="password-toggle" style="position: absolute; right: var(--space-3); top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--neutral-500);">
                        👁️
                    </button>
                </div>
            </div>
            <div id="loginError" class="alert alert-error" style="display: none;"></div>
            <div style="display: flex; flex-direction: column; gap: var(--space-3);">
                <button type="submit" class="btn btn-primary" id="loginSubmitBtn">
                    Login to Account
                </button>
                <button type="button" onclick="openAuthModal('choice')" class="btn btn-ghost">
                    ← Back
                </button>
            </div>
        </form>
    `;
    
    document.getElementById('modalLoginForm').addEventListener('submit', handleModalLogin);
}

function showRegisterForm() {
    const content = document.getElementById('authModalContent');
    content.innerHTML = `
        <div class="modal-header">
            <h2 class="modal-title">Create Account</h2>
            <button onclick="closeAuthModal()" class="modal-close" aria-label="Close">×</button>
        </div>
        <form id="modalRegisterForm" style="display: flex; flex-direction: column; gap: var(--space-4);">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
                <div class="form-group">
                    <label for="regFirstName" class="form-label required">First Name</label>
                    <input type="text" id="regFirstName" class="form-input" placeholder="Tracy" required>
                </div>
                <div class="form-group">
                    <label for="regLastName" class="form-label required">Last Name</label>
                    <input type="text" id="regLastName" class="form-input" placeholder="Health" required>
                </div>
            </div>
            <div class="form-group">
                <label for="regEmail" class="form-label required">Email</label>
                <input type="email" id="regEmail" class="form-input" placeholder="you@example.com" required>
            </div>
            <div class="form-group">
                <label for="regPhone" class="form-label">Phone</label>
                <input type="tel" id="regPhone" class="form-input" placeholder="+961 XX XXX XXX">
            </div>
            <div class="form-group">
                <label for="regPassword" class="form-label required">Password</label>
                <div class="password-input-wrapper" style="position: relative;">
                    <input type="password" id="regPassword" class="form-input" placeholder="••••••••" required>
                    <button type="button" onclick="togglePassword('regPassword')" class="password-toggle" style="position: absolute; right: var(--space-3); top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--neutral-500);">
                        👁️
                    </button>
                </div>
                <small style="color: var(--neutral-500); font-size: var(--text-sm);">Must contain uppercase, lowercase, and number</small>
            </div>
            <div class="form-group">
                <label for="regConfirmPassword" class="form-label required">Confirm Password</label>
                <div class="password-input-wrapper" style="position: relative;">
                    <input type="password" id="regConfirmPassword" class="form-input" placeholder="••••••••" required>
                    <button type="button" onclick="togglePassword('regConfirmPassword')" class="password-toggle" style="position: absolute; right: var(--space-3); top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--neutral-500);">
                        👁️
                    </button>
                </div>
            </div>
            <div id="registerError" class="alert alert-error" style="display: none;"></div>
            <div style="display: flex; flex-direction: column; gap: var(--space-3);">
                <button type="submit" class="btn btn-primary" id="registerSubmitBtn">
                    Create Account
                </button>
                <button type="button" onclick="openAuthModal('choice')" class="btn btn-ghost">
                    ← Back
                </button>
            </div>
        </form>
    `;
    
    document.getElementById('modalRegisterForm').addEventListener('submit', handleModalRegister);
}

// Password visibility toggle
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    input.type = input.type === 'password' ? 'text' : 'password';
}async function handleModalLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const submitBtn = document.getElementById('loginSubmitBtn');
    const errorDiv = document.getElementById('loginError');
    
    errorDiv.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';
    
    try {
        const response = await api.login({ email, password });
        
        if (response.success) {
            closeAuthModal();
            // Reload page to update auth state
            window.location.reload();
        }
    } catch (error) {
        errorDiv.textContent = error.message || 'Login failed. Please try again.';
        errorDiv.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
    }
}

async function handleModalRegister(e) {
    e.preventDefault();
    
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const submitBtn = document.getElementById('registerSubmitBtn');
    const errorDiv = document.getElementById('registerError');
    
    errorDiv.style.display = 'none';
    
    // Validate passwords match
    if (password !== confirmPassword) {
        errorDiv.textContent = 'Passwords do not match';
        errorDiv.style.display = 'block';
        return;
    }
    
    // Validate password requirements
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        errorDiv.textContent = 'Password must contain uppercase, lowercase, and number';
        errorDiv.style.display = 'block';
        return;
    }
    
    const userData = {
        firstName: document.getElementById('regFirstName').value,
        lastName: document.getElementById('regLastName').value,
        email: document.getElementById('regEmail').value,
        phone: document.getElementById('regPhone').value || '',
        password: password
    };
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';
    
    try {
        const response = await api.register(userData);
        
        if (response.success) {
            closeAuthModal();
            // Reload page to update auth state
            window.location.reload();
        }
    } catch (error) {
        errorDiv.textContent = error.message || 'Registration failed. Please try again.';
        errorDiv.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
    }
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    const modal = document.getElementById('authModal');
    if (e.target === modal) {
        closeAuthModal();
    }
});
