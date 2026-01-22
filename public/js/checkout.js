// ========================================
// CHECKOUT.JS - Payment Integration (Stripe/Whish/Cash/Areeba)
// ========================================

const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api'
    : '/api';

let currentCart = null;
let currentUser = null;
let currentOrder = null;
let paymentProvider = null; // 'stripe', 'whish', 'cash', or 'areeba'
let selectedPaymentMethod = null; // User's selected payment method
let whishMerchantId = null;
let areebaMerchantId = null;

// Initialize Payment System
async function initializePayment() {
    try {
        // Fetch payment provider config
        const config = await api.getConfig();
        
        console.log('Payment config:', config.data);
        
        // Store config data for later use
        if (config.data.whish) {
            whishMerchantId = config.data.whish.merchantId;
        }
        if (config.data.areeba) {
            areebaMerchantId = config.data.areeba.merchantId;
        }
        
        console.log('Payment methods initialized');
        return true;
    } catch (error) {
        console.error('Failed to initialize payment system:', error);
        showError('Unable to initialize payment system.');
        return false;
    }
}

// Initialize Stripe
async function initializeStripe(config) {
    console.log('Stripe Checkout payment method enabled');
    return true;
}

// Initialize Whish
async function initializeWhish(config) {
    whishMerchantId = config.data.whish?.merchantId;
    
    if (!whishMerchantId) {
        console.error('Whish merchant ID not found in config:', config);
        showError('Payment system configuration error.');
        return false;
    }
    
    console.log('Whish initialized for merchant:', whishMerchantId);
    return true;
}

// Initialize Cash on Delivery
async function initializeCash(config) {
    console.log('Cash on Delivery payment method enabled');
    return true;
}

// Initialize Areeba
async function initializeAreeba(config) {
    areebaMerchantId = config.data.areeba?.merchantId;
    
    if (!areebaMerchantId) {
        console.error('Areeba merchant ID not found in config:', config);
        showError('Payment system configuration error.');
        return false;
    }
    
    console.log('Areeba payment gateway initialized');
    return true;
}

// Check authentication
async function checkAuth() {
    try {
        const response = await api.getCurrentUser();
        if (!response.success || !response.data || !response.data.user) {
            window.location.href = 'login.html?redirect=checkout.html';
            return false;
        }
        
        currentUser = response.data.user;
        
        console.log('Current user loaded:', currentUser);
        
        // Validate that user has required information
        if (!currentUser.firstName || !currentUser.lastName || !currentUser.phone) {
            if (typeof notify !== 'undefined') {
                notify.error('Please update your profile with your full name and phone number before checkout.');
            }
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 3000);
            return false;
        }
        
        // Pre-fill user information from account
        const emailField = document.getElementById('email');
        const firstNameField = document.getElementById('firstName');
        const lastNameField = document.getElementById('lastName');
        const phoneField = document.getElementById('phone');
        const addressField = document.getElementById('address');
        const cityField = document.getElementById('city');
        const postalCodeField = document.getElementById('postalCode');
        const countryField = document.getElementById('country');
        
        if (emailField) {
            emailField.value = currentUser.email || '';
            emailField.readOnly = true;
            emailField.style.backgroundColor = 'var(--neutral-100)';
            emailField.style.cursor = 'not-allowed';
        }
        
        if (firstNameField) {
            firstNameField.value = currentUser.firstName || '';
            firstNameField.readOnly = true;
            firstNameField.style.backgroundColor = 'var(--neutral-100)';
            firstNameField.style.cursor = 'not-allowed';
        }
        
        if (lastNameField) {
            lastNameField.value = currentUser.lastName || '';
            lastNameField.readOnly = true;
            lastNameField.style.backgroundColor = 'var(--neutral-100)';
            lastNameField.style.cursor = 'not-allowed';
        }
        
        if (phoneField) {
            phoneField.value = currentUser.phone || '';
            phoneField.readOnly = true;
            phoneField.style.backgroundColor = 'var(--neutral-100)';
            phoneField.style.cursor = 'not-allowed';
        }
        
        // Try to load previously saved address info from localStorage
        const savedAddress = localStorage.getItem('userAddress');
        if (savedAddress) {
            try {
                const addressData = JSON.parse(savedAddress);
                if (addressField && addressData.address) {
                    addressField.value = addressData.address;
                }
                if (cityField && addressData.city) {
                    cityField.value = addressData.city;
                }
                if (postalCodeField && addressData.postalCode) {
                    postalCodeField.value = addressData.postalCode;
                }
                if (countryField && addressData.country) {
                    countryField.value = addressData.country;
                }
            } catch (err) {
                console.log('Could not parse saved address');
            }
        }
        
        console.log('User fields pre-filled successfully');
        
        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = 'login.html?redirect=checkout.html';
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

// Display order summary
async function displayOrderSummary() {
    const cart = await getCart();
    const orderItemsContainer = document.getElementById('orderItems');
    
    if (!cart.items || cart.items.length === 0) {
        window.location.href = 'cart.html';
        return;
    }
    
    orderItemsContainer.innerHTML = cart.items.map(item => `
        <div class="order-item">
            <span class="order-item-name">${escapeHtml(item.name)}</span>
            <span class="order-item-qty">x${item.quantity}</span>
            <span class="order-item-price">$${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
        </div>
    `).join('');
    
    const subtotal = cart.items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
    
    // Fetch shop config for accurate calculation (with timestamp cache busting)
    try {
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
        const tax = Math.round(subtotalCents * taxRate) / 100;
        const shipping = subtotalCents >= freeShippingThresholdCents ? 0 : (shippingFeeCents / 100);
        const total = subtotal + tax + shipping;
        
        document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('tax').textContent = `$${tax.toFixed(2)}`;
        document.getElementById('shipping').textContent = `$${shipping.toFixed(2)}`;
        document.getElementById('total').textContent = `$${total.toFixed(2)}`;
    } catch (error) {
        console.error('Failed to fetch shop config:', error);
        // Fallback to default values (match database defaults)
        const tax = Math.round(subtotal * 0.10 * 100) / 100;
        const shipping = subtotal >= 100 ? 0 : 10; // $10 shipping, free over $100
        const total = subtotal + tax + shipping;
        
        document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('tax').textContent = `$${tax.toFixed(2)}`;
        document.getElementById('shipping').textContent = `$${shipping.toFixed(2)}`;
        document.getElementById('total').textContent = `$${total.toFixed(2)}`;
    }
}

// Handle form submission (Step 1: Create Order)
async function handleCheckout(e) {
    if (e) e.preventDefault();
    
    if (!currentCart || !currentCart.items || currentCart.items.length === 0) {
        showError('Your cart is empty');
        window.location.href = 'cart.html';
        return;
    }
    
    const submitBtn = document.getElementById('submitBtn');
    const buttonText = document.getElementById('button-text');
    const spinner = document.getElementById('spinner');
    
    // If payment section is not shown yet, create order first
    const paymentSection = document.getElementById('paymentSection');
    if (paymentSection.style.display === 'none') {
        // Get selected payment method
        selectedPaymentMethod = document.getElementById('paymentMethod').value;
        
        if (!selectedPaymentMethod) {
            showError('Please select a payment method');
            return;
        }
        
        // Set the payment provider based on user selection
        paymentProvider = selectedPaymentMethod;
        
        try {
            setLoading(true, 'Creating order...');
            
            // Prepare items from cart
            const items = currentCart.items.map(item => ({
                productId: item.product_id,
                quantity: item.quantity
            }));
            
            // Prepare order data
            const orderData = {
                items: items,
                paymentMethod: selectedPaymentMethod, // Add payment method to order
                shippingAddress: {
                    firstName: document.getElementById('firstName').value,
                    lastName: document.getElementById('lastName').value,
                    email: document.getElementById('email').value,
                    phone: document.getElementById('phone').value,
                    address: document.getElementById('address').value,
                    city: document.getElementById('city').value,
                    postalCode: document.getElementById('postalCode').value,
                    country: document.getElementById('country').value
                },
                billingAddress: {
                    firstName: document.getElementById('firstName').value,
                    lastName: document.getElementById('lastName').value,
                    email: document.getElementById('email').value,
                    phone: document.getElementById('phone').value,
                    address: document.getElementById('address').value,
                    city: document.getElementById('city').value,
                    postalCode: document.getElementById('postalCode').value,
                    country: document.getElementById('country').value
                },
                notes: document.getElementById('notes').value || null
            };
            
            // Save address info to localStorage for future use
            const addressData = {
                address: orderData.shippingAddress.address,
                city: orderData.shippingAddress.city,
                postalCode: orderData.shippingAddress.postalCode,
                country: orderData.shippingAddress.country
            };
            localStorage.setItem('userAddress', JSON.stringify(addressData));
            
            // Create order on server
            const orderResponse = await api.createOrder(orderData);
            currentOrder = orderResponse.data.order;
            console.log('Order created:', currentOrder);
            console.log('Order number property:', currentOrder.orderNumber, currentOrder.order_number);
            
            // Create payment intent
            const paymentIntentResponse = await api.createPaymentIntent(currentOrder.id);
            console.log('Payment intent response:', paymentIntentResponse);
            
            // Show payment section
            paymentSection.style.display = 'block';
            console.log('Payment section display set to block');
            console.log('Payment provider:', paymentProvider);
            console.log('Payment intent data:', paymentIntentResponse.data);
            
            // Show important payment notice
            const paymentNotice = document.createElement('div');
            paymentNotice.style.cssText = 'background: #fef3c7; border: 2px solid #f59e0b; padding: 15px; border-radius: 8px; margin-bottom: 20px;';
            paymentNotice.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <svg style="width: 24px; height: 24px; color: #f59e0b; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                    <div>
                        <strong style="color: #92400e; display: block; margin-bottom: 5px;">Payment Required</strong>
                        <p style="margin: 0; color: #92400e; font-size: 14px;">
                            Your order will only be confirmed after successful payment. Please complete the payment below to finalize your order.
                        </p>
                    </div>
                </div>
            `;
            paymentSection.insertBefore(paymentNotice, paymentSection.firstChild);
            
            // Handle selected payment method
            if (paymentProvider === 'cash') {
                // Cash on Delivery - no payment intent needed
                const cardContainer = document.getElementById('card-element');
                const orderAmount = paymentIntentResponse.data.amount || 0;
                const orderNumber = currentOrder.orderNumber || 'N/A';
                
                cardContainer.innerHTML = `
                    <div class="cash-payment-info">
                        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border: 2px solid #22c55e;">
                            <div style="display: flex; align-items: center; margin-bottom: 15px;">
                                <svg style="width: 24px; height: 24px; color: #16a34a; margin-right: 10px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                </svg>
                                <h3 style="margin: 0; color: #15803d; font-size: 18px;">Cash on Delivery</h3>
                            </div>
                            <p style="margin: 0 0 10px 0; color: #15803d;">
                                <strong>Amount:</strong> $${orderAmount.toFixed(2)}
                            </p>
                            <p style="margin: 0; color: #15803d; font-size: 14px;">
                                <strong>Order:</strong> ${orderNumber}
                            </p>
                        </div>
                        <div style="margin-top: 15px; padding: 15px; background: #fffbeb; border-radius: 8px; border: 1px solid #fbbf24;">
                            <p style="margin: 0; font-size: 14px; color: #92400e;">
                                <strong>ℹ️ Important</strong><br>
                                • Prepare exact amount<br>
                                • Payment upon delivery<br>
                                • Keep your order number ready
                            </p>
                        </div>
                    </div>
                `;
                
                submitBtn.dataset.paymentMethod = 'cash';
                submitBtn.dataset.sessionId = paymentIntentResponse.data.session_id;
                buttonText.textContent = 'Confirm Order';
                
            } else // Handle payment UI based on provider
            if (paymentProvider === 'stripe') {
                // Show Stripe payment info
                const cardContainer = document.getElementById('card-element');
                const orderAmount = paymentIntentResponse.data.amount || 0;
                const orderNumber = currentOrder.orderNumber || 'N/A';
                
                cardContainer.innerHTML = `
                    <div class="stripe-payment-info">
                        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; border: 2px solid #635bff;">
                            <div style="display: flex; align-items: center; margin-bottom: 15px;">
                                <svg style="width: 24px; height: 24px; color: #635bff; margin-right: 10px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                                </svg>
                                <h3 style="margin: 0; color: #635bff; font-size: 18px;">Secure Card Payment - Stripe</h3>
                            </div>
                            <p style="margin: 0 0 10px 0; color: #635bff;">
                                <strong>Amount:</strong> $${orderAmount.toFixed(2)}
                            </p>
                            <p style="margin: 0; color: #635bff; font-size: 14px;">
                                <strong>Order:</strong> ${orderNumber}
                            </p>
                        </div>
                        <div style="margin-top: 15px; padding: 15px; background: #f0fdf4; border-radius: 8px; border: 1px solid #86efac;">
                            <p style="margin: 0; font-size: 14px; color: #166534;">
                                <strong>✓ Secure Payment</strong><br>
                                • Powered by Stripe<br>
                                • SSL encrypted<br>
                                • Accepts all major cards<br>
                                • 3D Secure authentication
                            </p>
                        </div>
                    </div>
                `;
                
                submitBtn.dataset.checkoutUrl = paymentIntentResponse.data.checkout_url;
                submitBtn.dataset.sessionId = paymentIntentResponse.data.session_id;
                buttonText.textContent = 'Pay with Card';
                
            } else if (paymentProvider === 'whish') {
                // Show Whish payment button
                const cardContainer = document.getElementById('card-element');
                const paymentUrl = paymentIntentResponse.data.payment_url;
                
                // Check if we have a payment URL (real Whish) or use test mode
                if (paymentUrl && paymentUrl !== 'test' && paymentUrl !== 'undefined') {
                    // Production mode - redirect to Whish
                    const orderAmount = paymentIntentResponse.data.amount || 0;
                    const orderNumber = currentOrder.orderNumber || 'N/A';
                    
                    cardContainer.innerHTML = `
                        <div class="whish-payment-info">
                            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border: 2px solid #f59e0b;">
                                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                                    <svg style="width: 24px; height: 24px; color: #d97706; margin-right: 10px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                                    </svg>
                                    <h3 style="margin: 0; color: #92400e; font-size: 18px;">Secure Payment - Whish Money</h3>
                                </div>
                                <p style="margin: 0 0 10px 0; color: #92400e;">
                                    <strong>Amount:</strong> $${orderAmount.toFixed(2)}
                                </p>
                                <p style="margin: 0; color: #92400e; font-size: 14px;">
                                    <strong>Order:</strong> ${orderNumber}
                                </p>
                            </div>
                            <div style="margin-top: 15px; padding: 15px; background: #f0fdf4; border-radius: 8px; border: 1px solid #86efac;">
                                <p style="margin: 0; font-size: 14px; color: #166534;">
                                    <strong>✓ Secure Payment</strong><br>
                                    • Powered by Whish Money<br>
                                    • SSL encrypted<br>
                                    • Multiple payment methods<br>
                                    • Instant confirmation
                                </p>
                            </div>
                        </div>
                    `;
                    
                    submitBtn.dataset.paymentUrl = paymentUrl;
                    submitBtn.dataset.paymentId = paymentIntentResponse.data.paymentIntentId;
                    buttonText.textContent = 'Continue to Whish Payment';
                } else {
                    // Test mode - show test payment UI
                    const orderAmount = paymentIntentResponse.data.amount || 0;
                    const orderNumber = currentOrder.orderNumber || 'N/A';
                    
                    cardContainer.innerHTML = `
                        <div class="whish-test-mode">
                            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border: 1px solid #fbbf24; margin-bottom: 15px;">
                                <p style="margin: 0; font-size: 14px; color: #92400e;">
                                    <strong>⚠️ TEST MODE</strong> - Whish credentials not configured. Using test payment.
                                </p>
                            </div>
                            <div style="padding: 20px; background: white; border: 1px solid #e5e7eb; border-radius: 8px;">
                                <h3 style="margin: 0 0 15px 0; color: #1f2937;">Test Card Payment</h3>
                                <p style="color: #6b7280; font-size: 14px; margin-bottom: 10px;">
                                    <strong>Amount:</strong> $${orderAmount.toFixed(2)}
                                </p>
                                <p style="color: #6b7280; font-size: 14px; margin-bottom: 15px;">
                                    <strong>Order:</strong> ${orderNumber}
                                </p>
                                <p style="color: #6b7280; font-size: 14px;">
                                    In production, this will redirect to Whish Money's secure payment page.<br>
                                    Configure WHISH_MERCHANT_ID and WHISH_API_KEY in .env file.
                                </p>
                            </div>
                        </div>
                    `;
                    
                    submitBtn.dataset.sessionId = paymentIntentResponse.data.session_id;
                    buttonText.textContent = 'Complete Test Payment';
                }
                
            } else if (paymentProvider === 'areeba') {
                // Show Areeba payment form
                const cardContainer = document.getElementById('card-element');
                
                // Check if we have a checkout URL (real Areeba) or use embedded form (test mode)
                if (paymentIntentResponse.data.checkout_url) {
                    // Redirect to Areeba hosted checkout
                    const orderAmount = paymentIntentResponse.data.amount || 0;
                    const orderNumber = currentOrder.orderNumber || 'N/A';
                    
                    cardContainer.innerHTML = `
                        <div class="areeba-payment-info">
                            <div style="background: #eff6ff; padding: 20px; border-radius: 8px; border: 2px solid #60a5fa;">
                                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                                    <svg style="width: 24px; height: 24px; color: #2563eb; margin-right: 10px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                                    </svg>
                                    <h3 style="margin: 0; color: #1e40af; font-size: 18px;">Secure Card Payment - Areeba</h3>
                                </div>
                                <p style="margin: 0 0 10px 0; color: #1e40af;">
                                    <strong>Amount:</strong> $${orderAmount.toFixed(2)}
                                </p>
                                <p style="margin: 0; color: #1e40af; font-size: 14px;">
                                    <strong>Order:</strong> ${orderNumber}
                                </p>
                            </div>
                            <div style="margin-top: 15px; padding: 15px; background: #f0fdf4; border-radius: 8px; border: 1px solid #86efac;">
                                <p style="margin: 0; font-size: 14px; color: #166534;">
                                    <strong>✓ Secure Payment</strong><br>
                                    • Powered by Mastercard<br>
                                    • SSL encrypted<br>
                                    • Accepts all major cards<br>
                                    • 3D Secure authentication
                                </p>
                            </div>
                        </div>
                    `;
                    
                    submitBtn.dataset.checkoutUrl = paymentIntentResponse.data.checkout_url;
                    submitBtn.dataset.sessionId = paymentIntentResponse.data.session_id;
                    buttonText.textContent = 'Pay with Card';
                } else {
                    // Test mode - show simple card input
                    const orderAmount = paymentIntentResponse.data.amount || 0;
                    const orderNumber = currentOrder.orderNumber || 'N/A';
                    
                    cardContainer.innerHTML = `
                        <div class="areeba-test-mode">
                            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border: 1px solid #fbbf24; margin-bottom: 15px;">
                                <p style="margin: 0; font-size: 14px; color: #92400e;">
                                    <strong>⚠️ TEST MODE</strong> - Areeba credentials not configured. Using test payment.
                                </p>
                            </div>
                            <div style="padding: 20px; background: white; border: 1px solid #e5e7eb; border-radius: 8px;">
                                <h3 style="margin: 0 0 15px 0; color: #1f2937;">Test Card Payment</h3>
                                <p style="color: #6b7280; font-size: 14px; margin-bottom: 10px;">
                                    <strong>Amount:</strong> $${orderAmount.toFixed(2)}
                                </p>
                                <p style="color: #6b7280; font-size: 14px; margin-bottom: 15px;">
                                    <strong>Order:</strong> ${orderNumber}
                                </p>
                                <p style="color: #6b7280; font-size: 14px;">
                                    In production, this will redirect to Areeba's secure payment page.<br>
                                    Configure AREEBA_MERCHANT_ID and AREEBA_API_PASSWORD in .env file.
                                </p>
                            </div>
                        </div>
                    `;
                    
                    submitBtn.dataset.sessionId = paymentIntentResponse.data.session_id;
                    buttonText.textContent = 'Complete Test Payment';
                }
            }
            
            // Scroll to payment section
            paymentSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            showMessage('Order created! Please complete payment.', 'success');
            
            // Re-enable the form but change behavior
            setLoading(false);
            
        } catch (error) {
            console.error('Order creation failed:', error);
            
            if (error.message && error.message.includes('stock')) {
                showError('Some items are out of stock. Please update your cart.');
                setTimeout(() => window.location.href = 'cart.html', 2000);
            } else {
                showError(error.message || 'Failed to create order. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    } else {
        // Payment section is shown, process payment
        console.log('Processing payment. Provider:', paymentProvider);
        console.log('Button datasets:', submitBtn.dataset);
        
        if (paymentProvider === 'cash') {
            await processCashPayment(submitBtn.dataset.sessionId);
        } else if (paymentProvider === 'stripe') {
            const checkoutUrl = submitBtn.dataset.checkoutUrl || submitBtn.getAttribute('data-checkout-url');
            const sessionId = submitBtn.dataset.sessionId || submitBtn.getAttribute('data-session-id');
            console.log('Stripe checkout URL:', checkoutUrl);
            console.log('Stripe session ID:', sessionId);
            await processStripePayment(checkoutUrl, sessionId);
        } else if (paymentProvider === 'whish') {
            const paymentUrl = submitBtn.dataset.paymentUrl;
            const sessionId = submitBtn.dataset.sessionId;
            // Check if we have a real payment URL or test mode session ID
            if (paymentUrl && paymentUrl !== 'undefined') {
                await processWhishPayment(paymentUrl, submitBtn.dataset.paymentId);
            } else if (sessionId) {
                // Test mode - use session ID
                await processWhishPayment('test', sessionId);
            } else {
                showError('Payment configuration error');
            }
        } else if (paymentProvider === 'areeba') {
            await processAreebaPayment(submitBtn.dataset.checkoutUrl, submitBtn.dataset.sessionId);
        }
    }
}

// Process Stripe payment - redirect to Stripe Checkout
async function processStripePayment(checkoutUrl, sessionId) {
    try {
        console.log('processStripePayment called with URL:', checkoutUrl);
        console.log('Session ID:', sessionId);
        setLoading(true, 'Redirecting to payment...');
        
        if (!checkoutUrl || checkoutUrl === 'null' || checkoutUrl === 'undefined') {
            console.error('Invalid checkout URL:', checkoutUrl);
            showError('Payment URL not available. Please contact support.');
            setLoading(false);
            return;
        }
        
        console.log('Redirecting to Stripe checkout:', checkoutUrl);
        // Small delay to ensure UI updates
        setTimeout(() => {
            window.location.href = checkoutUrl;
        }, 100);
        
    } catch (error) {
        console.error('Stripe payment redirect failed:', error);
        showError('Payment processing failed. Please try again.');
        setLoading(false);
    }
}

// Process Areeba payment
async function processAreebaPayment(checkoutUrl, sessionId) {
    try {
        setLoading(true, 'Processing payment...');
        
        if (checkoutUrl) {
            // Redirect to Areeba hosted checkout page
            window.location.href = checkoutUrl;
        } else {
            // Test mode - simulate payment success
            await api.clearCart();
            showMessage('Test payment completed! Order confirmed.', 'success');
            
            setTimeout(() => {
                window.location.href = 'orders.html';
            }, 2000);
        }
        
    } catch (error) {
        console.error('Areeba payment failed:', error);
        showError('Payment processing failed. Please try again.');
        setLoading(false);
    }
}

// Process Cash on Delivery - just confirm the order
async function processCashPayment(paymentId) {
    try {
        setLoading(true, 'Confirming order...');
        
        // For COD, order is already created, just show success
        await api.clearCart();
        
        // Show success message
        showMessage('Order confirmed! You will pay cash upon delivery.', 'success');
        
        // Redirect to orders page after a moment
        setTimeout(() => {
            window.location.href = 'orders.html';
        }, 2000);
        
    } catch (error) {
        console.error('Order confirmation failed:', error);
        showError('Unable to confirm order. Please try again.');
        setLoading(false);
    }
}

// Process Whish payment - redirect to payment page
async function processWhishPayment(paymentUrl, paymentId) {
    try {
        console.log('processWhishPayment called with URL:', paymentUrl);
        console.log('Payment ID:', paymentId);
        setLoading(true, 'Processing payment...');
        
        // Check if test mode
        if (paymentUrl === 'test') {
            // Test mode - simulate payment success
            await api.clearCart();
            showMessage('Test payment completed! Order confirmed.', 'success');
            
            setTimeout(() => {
                window.location.href = 'orders.html';
            }, 2000);
            return;
        }
        
        if (!paymentUrl || paymentUrl === 'null' || paymentUrl === 'undefined') {
            console.error('Invalid payment URL:', paymentUrl);
            showError('Payment URL not available. Please contact support.');
            setLoading(false);
            return;
        }
        
        console.log('Redirecting to Whish payment:', paymentUrl);
        // Redirect to Whish payment page
        window.location.href = paymentUrl;
        
    } catch (error) {
        console.error('Payment redirect failed:', error);
        showError('Unable to redirect to payment page. Please try again.');
        setLoading(false);
    }
}

// Update cart count in navbar
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
        console.error('Failed to update cart count:', error);
    }
}

// Loading state
function setLoading(isLoading, message = 'Processing...') {
    const submitBtn = document.getElementById('submitBtn');
    const buttonText = document.getElementById('button-text');
    const spinner = document.getElementById('spinner');
    
    if (isLoading) {
        submitBtn.disabled = true;
        buttonText.textContent = message;
        spinner.style.display = 'inline-block';
    } else {
        submitBtn.disabled = false;
        spinner.style.display = 'none';
        // Button text is managed by the flow
    }
}

// XSS Protection
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show error message
function showError(message) {
    const messageDiv = document.getElementById('payment-message');
    messageDiv.textContent = message;
    messageDiv.className = 'payment-message error';
    messageDiv.style.display = 'block';
    
    // Scroll to message
    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (messageDiv.className.includes('error')) {
            messageDiv.style.display = 'none';
        }
    }, 5000);
}

// Show success message
function showMessage(message, type = 'success') {
    const messageDiv = document.getElementById('payment-message');
    messageDiv.textContent = message;
    messageDiv.className = `payment-message ${type}`;
    messageDiv.style.display = 'block';
    
    // Auto-hide success messages after 3 seconds
    if (type === 'success') {
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) return;
    
    await displayOrderSummary();
    await updateCartCount();
    
    // Initialize payment system (Whish or Areeba)
    const paymentInitialized = await initializePayment();
    if (!paymentInitialized) {
        showError('Payment system not available. Please try again later.');
        return;
    }
    
    // Form and button handling
    const checkoutForm = document.getElementById('checkoutForm');
    const submitBtn = document.getElementById('submitBtn');
    
    // Handle button click instead of form submit
    submitBtn.addEventListener('click', handleCheckout);
    
    // Prevent actual form submission
    checkoutForm.addEventListener('submit', (e) => {
        e.preventDefault();
    });
    
    // Success modal handlers
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('successModal');
        if (e.target === modal) {
            modal.style.display = 'none';
            window.location.href = 'orders.html';
        }
    });
    
    // "Continue Shopping" button in success modal
    const continueShoppingBtn = document.querySelector('#successModal .btn-primary');
    if (continueShoppingBtn) {
        continueShoppingBtn.addEventListener('click', () => {
            window.location.href = 'orders.html';
        });
    }
});
