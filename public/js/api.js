// ========================================
// API.JS - Lightweight fetch helper
// ========================================
(() => {
    const DEFAULT_TIMEOUT_MS = 8000;
    // Use /api for Netlify proxy, or direct URL for local development
    const API_BASE_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:3000/api'
        : '/api'; // Netlify will proxy to Render backend
    
    // CSRF token management
    let csrfToken = null;
    let csrfTokenPromise = null;

    async function getCsrfToken() {
        // If we already have a token, return it
        if (csrfToken) return csrfToken;
        
        // If we're already fetching a token, wait for that request
        if (csrfTokenPromise) return csrfTokenPromise;
        
        // Fetch new token with dynamic URL
        const csrfUrl = window.location.hostname === 'localhost'
            ? 'http://localhost:3000/api/csrf-token'
            : '/api/csrf-token';
            
        csrfTokenPromise = fetch(csrfUrl, {
            credentials: 'include'
        })
            .then(res => res.json())
            .then(data => {
                csrfToken = data.csrfToken;
                csrfTokenPromise = null;
                return csrfToken;
            })
            .catch(err => {
                console.error('Failed to fetch CSRF token:', err);
                csrfTokenPromise = null;
                return null;
            });
        
        return csrfTokenPromise;
    }

    // Refresh token (call this after 403 CSRF errors)
    window.refreshCsrfToken = async function() {
        csrfToken = null;
        return await getCsrfToken();
    };

    function buildApiUrl(path) {
        if (!path) return API_BASE_URL;
        if (path.startsWith('http://') || path.startsWith('https://')) {
            return path;
        }
        const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
        const suffix = path.startsWith('/') ? path : `/${path}`;
        return `${base}${suffix}`;
    }

    async function apiFetchJSON(path, options = {}) {
        const controller = new AbortController();
        const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
        const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
        const headers = Object.assign({ 'Accept': 'application/json' }, options.headers || {});

        // Add CSRF token for non-GET requests
        const method = (options.method || 'GET').toUpperCase();
        if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
            const token = await getCsrfToken();
            if (token) {
                headers['X-CSRF-Token'] = token;
            }
        }

        let body = options.body;
        // Handle FormData separately - don't stringify or set Content-Type
        // Browser will set Content-Type with proper boundary for multipart/form-data
        if (body instanceof FormData) {
            // Don't modify body or headers for FormData
        } else if (body && typeof body === 'object') {
            if (!headers['Content-Type']) {
                headers['Content-Type'] = 'application/json';
            }
            body = JSON.stringify(body);
        }

        const fetchOptions = Object.assign({}, options, {
            headers,
            body,
            signal: controller.signal,
            credentials: options.credentials || 'include'
        });

        try {
            const response = await fetch(buildApiUrl(path), fetchOptions);
            const contentType = response.headers.get('content-type') || '';
            const isJson = contentType.includes('application/json');
            const payload = isJson ? await response.json().catch(() => null) : await response.text();

            if (!response.ok) {
                // Handle CSRF token errors - refresh and retry once
                if (response.status === 403 && payload && payload.error && payload.error.code === 'EBADCSRFTOKEN') {
                    console.log('CSRF token invalid, refreshing and retrying...');
                    await refreshCsrfToken();
                    
                    // Retry once with new token
                    if (!options._isRetry) {
                        window.clearTimeout(timeoutId);
                        return await apiFetchJSON(path, { ...options, _isRetry: true });
                    }
                }
                
                const message = (payload && payload.error && payload.error.message)
                    || (payload && payload.message)
                    || response.statusText;
                const error = new Error(message);
                error.status = response.status;
                error.payload = payload;
                error.error = payload && payload.error; // Include full error object
                throw error;
            }

            return payload;
        } finally {
            window.clearTimeout(timeoutId);
        }
    }

    window.apiFetchJSON = apiFetchJSON;
    
    // Enhanced API client with all backend endpoints
    window.api = {
        // Config endpoint
        async getConfig() {
            return await apiFetchJSON('/config');
        },
        
        // Auth endpoints
        async register(userData) {
            return await apiFetchJSON('/auth/register', {
                method: 'POST',
                body: userData
            });
        },
        
        async login(email, password) {
            return await apiFetchJSON('/auth/login', {
                method: 'POST',
                body: { email, password }
            });
        },
        
        async logout() {
            return await apiFetchJSON('/auth/logout', { method: 'POST' });
        },
        
        async getCurrentUser() {
            return await apiFetchJSON('/auth/me');
        },
        
        async updateProfile(userData) {
            return await apiFetchJSON('/auth/profile', {
                method: 'PUT',
                body: userData
            });
        },
        
        async changePassword(currentPassword, newPassword) {
            return await apiFetchJSON('/auth/change-password', {
                method: 'POST',
                body: { currentPassword, newPassword }
            });
        },
        
        async verifyEmail(email, otp) {
            return await apiFetchJSON('/auth/verify-email', {
                method: 'POST',
                body: { email, otp }
            });
        },
        
        async resendVerification(email) {
            return await apiFetchJSON('/auth/resend-verification', {
                method: 'POST',
                body: { email }
            });
        },
        
        async forgotPassword(email) {
            return await apiFetchJSON('/auth/forgot-password', {
                method: 'POST',
                body: { email }
            });
        },
        
        async resetPassword(email, otp, password) {
            return await apiFetchJSON('/auth/reset-password', {
                method: 'POST',
                body: { email, otp, password }
            });
        },
        
        async changePassword(currentPassword, newPassword) {
            return await apiFetchJSON('/auth/change-password', {
                method: 'POST',
                body: { currentPassword, newPassword }
            });
        },
        
        // Generic POST method for flexibility
        async post(endpoint, data) {
            return await apiFetchJSON(endpoint, {
                method: 'POST',
                body: data
            });
        },
        
        // Generic GET method
        async get(endpoint) {
            return await apiFetchJSON(endpoint, {
                method: 'GET'
            });
        },
        
        // Generic PUT method
        async put(endpoint, data) {
            return await apiFetchJSON(endpoint, {
                method: 'PUT',
                body: data
            });
        },
        
        // Generic DELETE method
        async delete(endpoint) {
            return await apiFetchJSON(endpoint, {
                method: 'DELETE'
            });
        },
        
        // Product endpoints
        async getProducts(params = {}) {
            const query = new URLSearchParams(params).toString();
            return await apiFetchJSON(`/products${query ? '?' + query : ''}`);
        },
        
        async getProduct(slug) {
            return await apiFetchJSON(`/products/${slug}`);
        },
        
        // Category endpoints
        async getCategories() {
            return await apiFetchJSON('/categories');
        },
        
        // Cart endpoints
        async getCart() {
            return await apiFetchJSON('/cart');
        },
        
        async addToCart(productId, quantity = 1) {
            return await apiFetchJSON('/cart/items', {
                method: 'POST',
                body: { productId, quantity }
            });
        },
        
        async updateCartItem(itemId, quantity) {
            return await apiFetchJSON(`/cart/items/${itemId}`, {
                method: 'PUT',
                body: { quantity }
            });
        },
        
        async removeFromCart(itemId) {
            return await apiFetchJSON(`/cart/items/${itemId}`, {
                method: 'DELETE'
            });
        },
        
        async clearCart() {
            return await apiFetchJSON('/cart', { method: 'DELETE' });
        },
        
        // Order endpoints
        async createOrder(orderData) {
            return await apiFetchJSON('/orders', {
                method: 'POST',
                body: orderData
            });
        },
        
        async getOrders(params = {}) {
            const query = new URLSearchParams(params).toString();
            return await apiFetchJSON(`/orders${query ? '?' + query : ''}`);
        },
        
        async getOrder(orderId) {
            return await apiFetchJSON(`/orders/${orderId}`);
        },
        
        async cancelOrder(orderId) {
            return await apiFetchJSON(`/orders/${orderId}/cancel`, {
                method: 'POST'
            });
        },
        
        // Checkout endpoints
        async createPaymentIntent(orderId) {
            return await apiFetchJSON('/checkout/create-payment-intent', {
                method: 'POST',
                body: { orderId }
            });
        },
        
        async confirmPayment(paymentIntentId) {
            return await apiFetchJSON('/checkout/confirm-payment', {
                method: 'POST',
                body: { paymentIntentId }
            });
        },
        
        async getPaymentStatus(orderId) {
            return await apiFetchJSON(`/checkout/payment-status/${orderId}`);
        },
        
        // Admin endpoints
        admin: {
            async getProducts(params = {}) {
                const query = new URLSearchParams(params).toString();
                return await apiFetchJSON(`/admin/products${query ? '?' + query : ''}`);
            },
            
            async createProduct(productData) {
                return await apiFetchJSON('/admin/products', {
                    method: 'POST',
                    body: productData
                });
            },
            
            async updateProduct(productId, productData) {
                return await apiFetchJSON(`/admin/products/${productId}`, {
                    method: 'PUT',
                    body: productData
                });
            },
            
            async deleteProduct(productId) {
                return await apiFetchJSON(`/admin/products/${productId}`, {
                    method: 'DELETE'
                });
            },
            
            async getOrders(params = {}) {
                const query = new URLSearchParams(params).toString();
                return await apiFetchJSON(`/admin/orders${query ? '?' + query : ''}`);
            },
            
            async getOrder(orderId) {
                return await apiFetchJSON(`/admin/orders/${orderId}`);
            },
            
            async updateOrderStatus(orderId, status) {
                return await apiFetchJSON(`/admin/orders/${orderId}/status`, {
                    method: 'PUT',
                    body: { status }
                });
            },
            
            async getAnalytics(period = 30) {
                return await apiFetchJSON(`/admin/analytics?period=${period}`);
            },
            
            async getSettings() {
                return await apiFetchJSON('/settings');
            },
            
            async updateSetting(key, value) {
                return await apiFetchJSON(`/settings/${key}`, {
                    method: 'PUT',
                    body: { value }
                });
            }
        }
    };
})();
