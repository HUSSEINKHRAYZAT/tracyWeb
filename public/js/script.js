// Mobile Navigation Toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Close mobile menu when clicking on a link
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offset = 80; // Height of fixed navbar
            const targetPosition = target.offsetTop - offset;
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Form Submission Handler
const contactForm = document.getElementById('contactForm');

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Get form data
        const formData = {
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            message: document.getElementById('message').value
        };

        // Disable submit button
        const submitButton = contactForm.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';

        try {
            // Get CSRF token
            const csrfResponse = await fetch(window.location.hostname === 'localhost' 
                ? 'http://localhost:3000/api/csrf-token'
                : '/api/csrf-token', {
                credentials: 'include'
            });
            const { csrfToken } = await csrfResponse.json();

            // Send to API
            const response = await fetch(window.location.hostname === 'localhost' 
                ? 'http://localhost:3000/api/contact'
                : '/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                // Show success message
                if (typeof notify !== 'undefined') {
                    notify.success(result.message || 'Thank you for your message! We will get back to you soon.');
                } else {
                    alert(result.message || 'Thank you for your message! We will get back to you soon.');
                }

                // Reset form
                contactForm.reset();
            } else {
                throw new Error(result.message || 'Failed to send message');
            }
        } catch (error) {
            console.error('Contact form error:', error);
            if (typeof notify !== 'undefined') {
                notify.error(error.message || 'Failed to send message. Please try again.');
            } else {
                alert('Failed to send message. Please try again.');
            }
        } finally {
            // Re-enable submit button
            submitButton.disabled = false;
            submitButton.textContent = originalText;
        }
    });
}

// Reveal on scroll
const revealTargets = document.querySelectorAll(
    '.hero-content, .problem-card, .service-card, .values-block, .values-brand, .about-content, .wellness-center, .contact-form, .social-links, .results-section .container, .footer-content, .learn-hero, .learn-hero-actions, .learn-intro-grid, .learn-section, .learn-section-media, .learn-card'
);

revealTargets.forEach((el, index) => {
    el.classList.add('reveal');
    const delay = (index % 6) * 0.08;
    el.style.setProperty('--reveal-delay', `${delay}s`);
});

const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -10% 0px'
};

const observer = new IntersectionObserver((entries, observerInstance) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observerInstance.unobserve(entry.target);
        }
    });
}, observerOptions);

revealTargets.forEach(el => observer.observe(el));

// Navbar + scroll-driven effects
const navbar = document.querySelector('.navbar');
let latestScroll = 0;
let ticking = false;

const updateScrollState = () => {
    if (navbar) {
        navbar.classList.toggle('scrolled', latestScroll > 10);
    }
    document.documentElement.style.setProperty('--scroll', `${latestScroll}px`);
    ticking = false;
};

updateScrollState();

// Smooth scroll behavior for navbar
window.addEventListener('scroll', () => {
    latestScroll = window.scrollY;
    if (!ticking) {
        window.requestAnimationFrame(updateScrollState);
        ticking = true;
    }
    
    // Add scrolled class to navbar
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        if (latestScroll > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#') {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
});

// Form validation
const inputs = document.querySelectorAll('.form-group input, .form-group textarea');

inputs.forEach(input => {
    input.addEventListener('blur', function() {
        if (this.value.trim() === '' && this.hasAttribute('required')) {
            this.style.borderColor = '#ef4444';
        } else {
            this.style.borderColor = 'var(--border-color)';
        }
    });
    
    input.addEventListener('focus', function() {
        this.style.borderColor = 'var(--secondary-color)';
    });
});

// Email validation
const emailInput = document.getElementById('email');
if (emailInput) {
    emailInput.addEventListener('blur', function() {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(this.value) && this.value !== '') {
            this.style.borderColor = '#ef4444';
            if (!this.nextElementSibling || !this.nextElementSibling.classList.contains('error-message')) {
                const errorMsg = document.createElement('span');
                errorMsg.className = 'error-message';
                errorMsg.textContent = 'Please enter a valid email address';
                this.parentNode.appendChild(errorMsg);
            }
        } else {
            this.style.borderColor = 'var(--border-color)';
            const errorMsg = this.nextElementSibling;
            if (errorMsg && errorMsg.classList.contains('error-message')) {
                errorMsg.remove();
            }
        }
    });
}

// Phone validation (basic)
const phoneInput = document.getElementById('phone');
if (phoneInput) {
    phoneInput.addEventListener('blur', function() {
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        if (!phoneRegex.test(this.value) && this.value !== '') {
            this.style.borderColor = '#ef4444';
        } else {
            this.style.borderColor = 'var(--border-color)';
        }
    });
}

// Console welcome message
console.log('%cTracyTalksHealth', 'color: #2f4b57; font-size: 24px; font-weight: bold;');
console.log('%cHealthyWithin • HealthyThroughout', 'color: #7a6c5e; font-size: 14px;');
console.log('Science-backed coaching and heartfelt guidance.');

// Update cart count on all pages
async function updateCartCount() {
    try {
        const response = await api.getCart();
        const cart = response.success ? response.data : { items: [] };
        const totalItems = cart.items ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
        const cartCountElements = document.querySelectorAll('.cart-count');
        cartCountElements.forEach(el => {
            el.textContent = totalItems;
            el.setAttribute('data-count', totalItems);
        });
    } catch (error) {
        // User not logged in or cart unavailable - show 0
        const cartCountElements = document.querySelectorAll('.cart-count');
        cartCountElements.forEach(el => {
            el.textContent = '0';
            el.setAttribute('data-count', '0');
        });
    }
}

// Check auth status and show/hide login buttons
async function updateAuthButtons() {
    const userDropdownContainer = document.getElementById('userDropdownContainer');
    
    if (!userDropdownContainer) return;
    
    try {
        const response = await api.getCurrentUser();
        if (response.success && response.data && response.data.user) {
            const user = response.data.user;
            
            // User is logged in - show user dropdown
            userDropdownContainer.style.display = 'block';
            userDropdownContainer.innerHTML = `
                <div class="user-menu">
                    <button class="user-menu-toggle" onclick="toggleUserDropdown()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        <span>${user.firstName || 'Account'}</span>
                        <svg class="dropdown-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                    <div class="user-dropdown" id="userDropdown">
                        <div class="user-dropdown-header">
                            <strong>${user.firstName} ${user.lastName}</strong>
                            <small>${user.email}</small>
                        </div>
                        ${user.role === 'admin' || user.role === 'super_admin' ? `
                        <a href="admin.html" class="user-dropdown-item admin-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                                <path d="M2 17l10 5 10-5M2 12l10 5 10-5"></path>
                            </svg>
                            Admin Panel
                        </a>
                        ` : ''}
                        <a href="orders.html" class="user-dropdown-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                            </svg>
                            My Orders
                        </a>
                        <button onclick="showChangePasswordModal()" class="user-dropdown-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                            Change Password
                        </button>
                        <button onclick="handleLogout()" class="user-dropdown-item logout-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                <polyline points="16 17 21 12 16 7"></polyline>
                                <line x1="21" y1="12" x2="9" y2="12"></line>
                            </svg>
                            Logout
                        </button>
                    </div>
                </div>
            `;
        } else {
            // User is not logged in - show login button
            userDropdownContainer.style.display = 'block';
            userDropdownContainer.innerHTML = `
                <a href="login.html" class="btn-login">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                        <polyline points="10 17 15 12 10 7"></polyline>
                        <line x1="15" y1="12" x2="3" y2="12"></line>
                    </svg>
                    Login
                </a>
            `;
        }
    } catch (error) {
        // User is not logged in - show login button
        userDropdownContainer.style.display = 'block';
        userDropdownContainer.innerHTML = `
            <a href="login.html" class="btn-login">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                    <polyline points="10 17 15 12 10 7"></polyline>
                    <line x1="15" y1="12" x2="3" y2="12"></line>
                </svg>
                Login
            </a>
        `;
    }
}

// Toggle user dropdown menu
window.toggleUserDropdown = function() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const userMenu = document.querySelector('.user-menu');
    const dropdown = document.getElementById('userDropdown');
    
    if (dropdown && userMenu && !userMenu.contains(e.target)) {
        dropdown.classList.remove('show');
    }
});

// Change Password Modal
window.showChangePasswordModal = function() {
    // Close dropdown first
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) dropdown.classList.remove('show');
    
    const modal = document.createElement('div');
    modal.id = 'changePasswordModal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 99999;';
    modal.innerHTML = `
        <div class="modal-container" style="background: white; border-radius: 16px; padding: 40px; max-width: 500px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
            <h2 style="margin: 0 0 10px 0; font-family: var(--font-heading); color: var(--neutral-900);">Change Password</h2>
            <p style="color: var(--neutral-600); margin-bottom: 25px;">Enter your current password and choose a new one.</p>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--neutral-700);">Current Password</label>
                <input type="password" id="currentPassword" placeholder="Enter current password" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--neutral-700);">New Password</label>
                <input type="password" id="newPasswordChange" placeholder="Enter new password" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
                <small style="color: var(--neutral-500); font-size: 12px;">At least 8 characters with uppercase, lowercase, and number</small>
            </div>
            
            <div style="margin-bottom: 25px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--neutral-700);">Confirm New Password</label>
                <input type="password" id="confirmPasswordChange" placeholder="Confirm new password" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
            </div>
            
            <div style="display: flex; gap: 10px;">
                <button id="changePasswordBtn" style="flex: 1; padding: 12px; background: var(--primary-600); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Change Password</button>
                <button id="cancelChangePasswordBtn" style="padding: 12px 20px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer;">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    document.getElementById('cancelChangePasswordBtn').addEventListener('click', () => {
        modal.remove();
    });
    
    document.getElementById('changePasswordBtn').addEventListener('click', async () => {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPasswordChange').value;
        const confirmPassword = document.getElementById('confirmPasswordChange').value;
        
        if (!currentPassword) {
            showNotification('Please enter your current password', 'error');
            return;
        }
        
        if (!newPassword || newPassword.length < 8) {
            showNotification('New password must be at least 8 characters', 'error');
            return;
        }
        
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
            showNotification('Password must contain uppercase, lowercase, and number', 'error');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showNotification('Passwords do not match', 'error');
            return;
        }
        
        const btn = document.getElementById('changePasswordBtn');
        btn.disabled = true;
        btn.textContent = 'Changing...';
        
        try {
            const response = await api.changePassword(currentPassword, newPassword);
            showNotification('Password changed successfully!', 'success');
            modal.remove();
        } catch (error) {
            showNotification(error.error?.message || 'Failed to change password', 'error');
            btn.disabled = false;
            btn.textContent = 'Change Password';
        }
    });
    
    // Focus on current password input
    setTimeout(() => {
        document.getElementById('currentPassword').focus();
    }, 100);
};
// Handle logout
window.handleLogout = async function() {
    try {
        await api.logout();
        // Redirect to home page after logout
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout failed:', error);
        // Force logout by clearing token and redirecting
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    }
}

// Initialize on page load
if (document.querySelector('.cart-count')) {
    updateCartCount();
}

if (document.getElementById('userDropdownContainer')) {
    updateAuthButtons();
}

// Make updateAuthButtons available globally for refreshing after login
window.updateAuthButtons = updateAuthButtons;
window.updateCartCount = updateCartCount;
