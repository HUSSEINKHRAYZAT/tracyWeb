// API Base URL
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api'
    : '/api';

async function loadOrders() {
    const container = document.getElementById('ordersContainer');
    
    // Check if we're coming back from a payment
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const paymentStatus = urlParams.get('payment_status');
    
    // Handle Stripe success redirect
    if (sessionId && paymentStatus === 'success') {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⏳</div>
                <h2>Verifying Payment...</h2>
                <p>Please wait while we confirm your payment.</p>
            </div>
        `;
        
        try {
            const response = await fetch(`${API_BASE_URL}/payment/verify-stripe-session?session_id=${sessionId}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            
            if (data.success) {
                // Clear URL parameters
                window.history.replaceState({}, document.title, '/orders.html');
                
                // Force refresh cart from server to ensure it's cleared
                if (typeof api !== 'undefined' && typeof api.getCart === 'function') {
                    api.getCart().then(cartResponse => {
                        const cart = cartResponse.success ? cartResponse.data : { items: [] };
                        const totalItems = cart.items ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
                        
                        // Update cart count display
                        const cartCountElements = document.querySelectorAll('.cart-count');
                        cartCountElements.forEach(el => {
                            el.textContent = totalItems;
                            el.setAttribute('data-count', totalItems);
                        });
                    }).catch(() => {
                        // Fallback: set to 0
                        const cartCountElements = document.querySelectorAll('.cart-count');
                        cartCountElements.forEach(el => {
                            el.textContent = '0';
                            el.setAttribute('data-count', '0');
                        });
                    });
                } else if (typeof updateCartCount === 'function') {
                    updateCartCount();
                } else {
                    // Manually update cart count to 0
                    const cartCountElements = document.querySelectorAll('.cart-count');
                    cartCountElements.forEach(el => {
                        el.textContent = '0';
                        el.setAttribute('data-count', '0');
                    });
                }
                
                // Show success message
                if (typeof showNotification === 'function') {
                    showNotification('Payment successful! Your order has been confirmed.', 'success');
                }
                
                // Load orders after a short delay
                setTimeout(() => {
                    loadOrdersList();
                }, 1000);
            } else {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">⚠️</div>
                        <h2>Payment Verification Failed</h2>
                        <p>${data.error?.message || 'Unable to verify payment'}</p>
                        <button onclick="loadOrders()" class="btn btn-secondary" style="margin-top: var(--space-4);">Try Again</button>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Payment verification error:', error);
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⚠️</div>
                    <h2>Verification Error</h2>
                    <p>Unable to verify payment. Please contact support.</p>
                    <button onclick="loadOrders()" class="btn btn-secondary" style="margin-top: var(--space-4);">Reload Orders</button>
                </div>
            `;
        }
        return;
    }
    
    // Handle cancelled payment
    if (paymentStatus === 'cancelled') {
        if (typeof showNotification === 'function') {
            showNotification('Payment was cancelled. You can try again from checkout.', 'warning');
        }
        window.history.replaceState({}, document.title, '/orders.html');
    }
    
    // Load orders normally
    loadOrdersList();
}

async function loadOrdersList() {
    const container = document.getElementById('ordersContainer');
    
    try {
        const response = await api.getOrders();
        
        console.log('Orders API response:', response);
        console.log('First order payment data:', response.data[0] ? {
            paymentProvider: response.data[0].paymentProvider,
            payment_method: response.data[0].payment_method
        } : 'No orders');
        
        if (!response.success || !response.data || response.data.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📦</div>
                    <h2>No orders yet</h2>
                    <p>Start shopping to see your orders here!</p>
                    <a href="shop.html" class="btn btn-primary" style="margin-top: var(--space-4);">Browse Products</a>
                </div>
            `;
            return;
        }
        
        container.innerHTML = response.data.map(order => `
            <div class="order-card">
                <div class="order-header">
                    <div class="order-number">Order #${order.orderNumber}</div>
                    <div class="order-status status-${order.orderStatus || order.status}">${(order.orderStatus || order.status).toUpperCase()}</div>
                </div>
                <div class="order-details">
                    <div class="detail-group">
                        <label>Order Date</label>
                        <div class="value">${new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                    </div>
                    <div class="detail-group">
                        <label>Total Amount</label>
                        <div class="value">$${((order.totalCents || order.total) / 100).toFixed(2)}</div>
                    </div>
                    <div class="detail-group">
                        <label>Payment Method</label>
                        <div class="value">${(order.paymentProvider || 'Cash').toUpperCase()}</div>
                    </div>
                    <div class="detail-group">
                        <label>Shipping Address</label>
                        <div class="value">
                            ${order.shippingAddress ? `
                                ${order.shippingAddress.firstName || ''} ${order.shippingAddress.lastName || ''}<br>
                                ${order.shippingAddress.address || ''}<br>
                                ${order.shippingAddress.address2 ? `${order.shippingAddress.address2}<br>` : ''}
                                ${order.shippingAddress.city || ''}, ${order.shippingAddress.state || ''} ${order.shippingAddress.postalCode || ''}<br>
                                ${order.shippingAddress.country || ''}
                            `.trim() : 'N/A'}
                        </div>
                    </div>
                </div>
                ${order.items && order.items.length > 0 ? `
                    <div class="order-items">
                        <h4>Order Items (${order.items.length})</h4>
                        ${order.items.map(item => `
                            <div class="order-item">
                                <span>${item.name} × ${item.quantity}</span>
                                <span>$${((item.priceCents || 0) / 100).toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('');
        
    } catch (error) {
        if (error.message.includes('Authentication required') || error.message.includes('Unauthorized')) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔒</div>
                    <h2>Please Log In</h2>
                    <p>You need to be logged in to view your orders</p>
                    <a href="index.html" class="btn btn-primary" style="margin-top: var(--space-4);">Go to Home</a>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⚠️</div>
                    <h2>Error loading orders</h2>
                    <p>${error.message}</p>
                    <button onclick="loadOrders()" class="btn btn-secondary" style="margin-top: var(--space-4);">Try Again</button>
                </div>
            `;
        }
    }
}

// Initialize on page load
if (window.updateAuthButtons) {
    window.updateAuthButtons();
}

loadOrders();
