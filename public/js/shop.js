// ========================================
// SHOP.JS - Product Listing & Filtering (API-Backed)
// ========================================

let productsCache = null;
let categoriesCache = null;
let currentCategory = 'all';
let isAuthenticated = false;

// Check authentication (optional for shop viewing)
async function checkAuth() {
    try {
        const response = await api.getCurrentUser();
        isAuthenticated = !!(response && response.success && response.data && response.data.user);
        return isAuthenticated;
    } catch (error) {
        isAuthenticated = false;
        return false;
    }
}

// Fetch products from API
async function fetchProducts() {
    try {
        const response = await api.getProducts();
        productsCache = Array.isArray(response) ? response : (response.products || []);
        return productsCache;
    } catch (error) {
        console.error('Failed to fetch products:', error);
        showError('Unable to load products. Please refresh the page.');
        return [];
    }
}

// Display products
function displayProducts(category = 'all') {
    currentCategory = category;
    const products = productsCache || [];
    const productsGrid = document.getElementById('productsGrid');
    
    if (!productsGrid) return;
    
    // Get active category slugs for filtering
    const activeCategorySlugs = categoriesCache 
        ? categoriesCache.filter(cat => cat.is_active).map(cat => cat.slug)
        : [];
    
    // Filter products by category and active status
    const filteredProducts = products.filter(p => {
        const matchesCategory = category === 'all' || p.category_slug === category;
        const isActive = p.is_active !== false;
        // Hide products if their category is inactive
        const categoryIsActive = categoriesCache === null || activeCategorySlugs.includes(p.category_slug);
        return matchesCategory && isActive && categoryIsActive;
    });
    
    if (filteredProducts.length === 0) {
        productsGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <p style="color: var(--text-light); font-size: 1.1rem;">No products found in this category.</p>
            </div>
        `;
        return;
    }
    
    productsGrid.innerHTML = filteredProducts.map(product => {
        const price = parseFloat(product.price);
        const stock = product.stock_quantity || 0;
        const isOutOfStock = stock === 0;
        // Use image_url from backend
        const imageUrl = product.image_url || 'images/placeholder.avif';
        
        return `
            <div class="product-card" data-category="${escapeHtml(product.category_slug || '')}">
                <div class="product-image">
                    <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.name)}" loading="lazy">
                    ${isOutOfStock ? '<div class="out-of-stock-badge">Out of Stock</div>' : ''}
                </div>
                <div class="product-info">
                    <div class="product-category">${escapeHtml(product.category_name || product.category_slug || 'product')}</div>
                    <h3 class="product-name">${escapeHtml(product.name)}</h3>
                    <p class="product-description">${escapeHtml(product.description || '')}</p>
                    <div class="product-footer">
                        <span class="product-price">$${price.toFixed(2)}</span>
                        <button 
                            class="add-to-cart-btn" 
                            onclick="addToCart('${product.id}')"
                            ${isOutOfStock ? 'disabled' : ''}
                        >
                            ${isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                        </button>
                    </div>
                    ${stock > 0 && stock < 10 ? `<p class="stock-warning">Only ${stock} left</p>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Add to cart (requires authentication)
async function addToCart(productId) {
    // Check if user is logged in
    if (!isAuthenticated) {
        const shouldLogin = await customConfirm('You need to login to add items to cart. Login now?', 'Login', 'Cancel');
        if (shouldLogin) {
            window.location.href = `login.html?redirect=shop.html`;
        }
        return;
    }
    
    const btn = event.target;
    const originalText = btn.textContent;
    
    try {
        btn.disabled = true;
        btn.textContent = 'Adding...';
        
        await api.addToCart(productId, 1);
        
        // Visual feedback
        btn.textContent = 'Added!';
        btn.style.background = '#10b981';
        
        // Update cart count
        await updateCartCount();
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
            btn.disabled = false;
        }, 1500);
    } catch (error) {
        console.error('Failed to add to cart:', error);
        btn.textContent = originalText;
        btn.disabled = false;
        
        // Check if error is due to stock
        if (error.message && error.message.includes('stock')) {
            showError('This item is out of stock');
        } else if (error.message && error.message.includes('login')) {
            showError('Please login to add items to cart');
            setTimeout(() => {
                window.location.href = 'login.html?redirect=shop.html';
            }, 1500);
        } else {
            showError(error.message || 'Failed to add to cart. Please try again.');
        }
    }
}

// Update cart count in navbar
async function updateCartCount() {
    if (!isAuthenticated) {
        const cartCountElements = document.querySelectorAll('.cart-count');
        cartCountElements.forEach(el => {
            el.textContent = '0';
            el.setAttribute('data-count', '0');
        });
        return;
    }
    
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

// XSS Protection
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

// Load categories dynamically
async function loadCategoryFilters() {
    try {
        console.log('Loading category filters...');
        const response = await api.get('/categories');
        console.log('Categories API response:', response);
        
        if (response.success && response.data) {
            // Store all categories in cache
            categoriesCache = response.data;
            
            const categories = response.data.filter(cat => cat.is_active);
            console.log('Active categories:', categories);
            const filtersContainer = document.getElementById('categoryFilters');
            
            if (!filtersContainer) {
                console.error('Category filters container not found');
                return;
            }
            
            // Add "All Products" button first
            let filtersHTML = '<button class="filter-btn active" data-category="all">All Products</button>';
            
            // Add category buttons sorted by display_order
            categories
                .sort((a, b) => a.display_order - b.display_order)
                .forEach(category => {
                    filtersHTML += `<button class="filter-btn" data-category="${category.slug}">${category.name}</button>`;
                });
            
            filtersContainer.innerHTML = filtersHTML;
            console.log('Category filters rendered:', categories.length, 'categories');
            
            // Setup click handlers
            setupFilterHandlers();
        } else {
            console.error('Invalid response format:', response);
        }
    } catch (error) {
        console.error('Error loading category filters:', error);
        // Fallback to "All Products" only
        const filtersContainer = document.getElementById('categoryFilters');
        if (filtersContainer) {
            filtersContainer.innerHTML = '<button class="filter-btn active" data-category="all">All Products</button>';
            setupFilterHandlers();
        }
    }
}

function setupFilterHandlers() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const category = btn.dataset.category;
            displayProducts(category);
        });
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication status
    await checkAuth();
    
    // Update auth buttons (login/user menu)
    if (window.updateAuthButtons) {
        await window.updateAuthButtons();
    }
    
    // Load category filters first
    await loadCategoryFilters();
    
    // Fetch and display products
    await fetchProducts();
    displayProducts();
    
    // Update cart count
    await updateCartCount();
});
