// ========================================
// CART.JS - Shopping Cart Management (Database-Backed)
// ========================================

const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api'
    : '/api';

let currentCart = null;

// Check authentication
async function checkAuth() {
    try {
        const response = await api.getCurrentUser();
        if (!response || !response.success || !response.data || !response.data.user) {
            window.location.href = 'login.html?redirect=cart.html';
            return false;
        }
        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = 'login.html?redirect=cart.html';
        return false;
    }
}

// Get cart from server
async function getCart() {
    try {
        const response = await api.getCart();
        currentCart = response.success ? response.data : { items: [] };
        return currentCart;
    } catch (error) {
        console.error('Failed to fetch cart:', error);
        showError('Unable to load cart. Please try again.');
        return { items: [] };
    }
}

// Display cart items
async function displayCart() {
    const cart = await getCart();
    const cartItemsContainer = document.getElementById('cartItems');
    
    if (!cart.items || cart.items.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="empty-cart">
                <div class="empty-cart-icon">🛒</div>
                <h3>Your cart is empty</h3>
                <p>Add some products to get started</p>
                <a href="shop.html" class="btn btn-primary">Browse Products</a>
            </div>
        `;
        updateCartSummary(0);
        return;
    }
    
    cartItemsContainer.innerHTML = cart.items.map(item => `
        <div class="cart-item" data-item-id="${item.id}">
            <div class="cart-item-image">
                <img src="${escapeHtml(item.image_url || 'images/placeholder.avif')}" alt="${escapeHtml(item.name)}">
            </div>
            <div class="cart-item-details">
                <h4 class="cart-item-name">${escapeHtml(item.name)}</h4>
                <p class="cart-item-price">$${parseFloat(item.price).toFixed(2)} each</p>
                <div class="cart-item-controls">
                    <div class="quantity-control">
                        <button class="quantity-btn" onclick="updateQuantity('${item.id}', ${item.quantity - 1})" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                        <span class="quantity-display">${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateQuantity('${item.id}', ${item.quantity + 1})" ${item.quantity >= item.stock_quantity ? 'disabled' : ''}>+</button>
                    </div>
                    <button class="remove-btn" onclick="removeItem('${item.id}')">Remove</button>
                </div>
                ${item.stock_quantity < 10 ? `<p class="stock-warning">Only ${item.stock_quantity} left in stock</p>` : ''}
            </div>
            <div class="cart-item-total">
                <span class="cart-item-total-price">$${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
            </div>
        </div>
    `).join('');
    
    const subtotal = cart.items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
    updateCartSummary(subtotal);
}

// Update quantity
async function updateQuantity(itemId, newQuantity) {
    if (newQuantity <= 0) {
        await removeItem(itemId);
        return;
    }
    
    try {
        showLoading();
        await api.updateCartItem(itemId, newQuantity);
        await displayCart();
        await updateCartCount();
    } catch (error) {
        console.error('Failed to update quantity:', error);
        showError(error.message || 'Failed to update quantity. Please try again.');
        await displayCart(); // Refresh to show correct state
    } finally {
        hideLoading();
    }
}

// Remove item
async function removeItem(itemId) {
    const shouldRemove = await customConfirm('Remove this item from your cart?', 'Remove', 'Cancel');
    if (!shouldRemove) {
        return;
    }
    
    try {
        showLoading();
        await api.removeFromCart(itemId);
        await displayCart();
        await updateCartCount();
    } catch (error) {
        console.error('Failed to remove item:', error);
        showError('Failed to remove item. Please try again.');
    } finally {
        hideLoading();
    }
}

// Clear entire cart
async function clearCart() {
    const shouldClear = await customConfirm('Clear all items from your cart?', 'Clear Cart', 'Cancel');
    if (!shouldClear) {
        return;
    }
    
    try {
        showLoading();
        await api.clearCart();
        await displayCart();
        await updateCartCount();
    } catch (error) {
        console.error('Failed to clear cart:', error);
        showError('Failed to clear cart. Please try again.');
    } finally {
        hideLoading();
    }
}

// Update cart summary
async function updateCartSummary(subtotal) {
    try {
        // Fetch shop config from API (with timestamp cache busting)
        const timestamp = new Date().getTime();
        const configResponse = await fetch(`${API_BASE_URL}/settings/shop-config?t=${timestamp}`, {
            cache: 'no-cache',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        const config = await configResponse.json();
        
        const shippingFeeCents = config.data.shippingFeeCents || 1000;
        const freeShippingThresholdCents = config.data.freeShippingThresholdCents || 10000;
        const taxRate = config.data.taxRate || 0.10;
        
        const subtotalCents = Math.round(subtotal * 100);
        const shipping = subtotalCents >= freeShippingThresholdCents ? 0 : (shippingFeeCents / 100);
        const tax = Math.round(subtotalCents * taxRate) / 100;
        const total = subtotal + tax + shipping;
        
        document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('tax').textContent = `$${tax.toFixed(2)}`;
        document.getElementById('shipping').textContent = shipping > 0 ? `$${shipping.toFixed(2)}` : 'Free';
        document.getElementById('total').textContent = `$${total.toFixed(2)}`;
        
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (subtotal === 0) {
            checkoutBtn.style.opacity = '0.5';
            checkoutBtn.style.pointerEvents = 'none';
        } else {
            checkoutBtn.style.opacity = '1';
            checkoutBtn.style.pointerEvents = 'auto';
        }
    } catch (error) {
        console.error('Failed to fetch shop config:', error);
        // Fallback to default values (match database defaults)
        const tax = Math.round(subtotal * 0.10 * 100) / 100;
        const shipping = subtotal >= 100 ? 0 : 10; // Free shipping over $100
        const total = subtotal + tax + shipping;
        
        document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('tax').textContent = `$${tax.toFixed(2)}`;
        document.getElementById('shipping').textContent = shipping > 0 ? `$${shipping.toFixed(2)}` : 'Free';
        document.getElementById('total').textContent = `$${total.toFixed(2)}`;
    }
}

// Update cart count in navbar
async function updateCartCount() {
    try {
        const cart = await api.getCart();
        const totalItems = cart.items ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
        const cartCountElements = document.querySelectorAll('.cart-count');
        cartCountElements.forEach(el => {
            el.textContent = totalItems;
            el.setAttribute('data-count', totalItems);
        });
    } catch (error) {
        // Silently fail - user might not be logged in
        const cartCountElements = document.querySelectorAll('.cart-count');
        cartCountElements.forEach(el => {
            el.textContent = '0';
            el.setAttribute('data-count', '0');
        });
    }
}

// XSS Protection
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Loading state
function showLoading() {
    const cartItems = document.getElementById('cartItems');
    if (cartItems) {
        cartItems.style.opacity = '0.5';
        cartItems.style.pointerEvents = 'none';
    }
}

function hideLoading() {
    const cartItems = document.getElementById('cartItems');
    if (cartItems) {
        cartItems.style.opacity = '1';
        cartItems.style.pointerEvents = 'auto';
    }
}

// Error display
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => errorDiv.remove(), 300);
    }, 3000);
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Ensure user dropdown container exists
    const userDropdownContainer = document.getElementById('userDropdownContainer');
    if (!userDropdownContainer) {
        console.error('userDropdownContainer not found in cart.html');
    }
    
    // Update auth buttons first - wait for it to be available
    if (window.updateAuthButtons) {
        await window.updateAuthButtons();
    } else {
        console.warn('updateAuthButtons not available');
    }
    
    const isAuthenticated = await checkAuth();
    if (isAuthenticated) {
        await displayCart();
        await updateCartCount();
    }
});
