// ========================================
// ADMIN.JS - Enhanced Admin Dashboard
// ========================================

let autoRefreshInterval = null;

// Check authentication and authorization on page load
async function checkAuth() {
    try {
        const response = await api.getCurrentUser();
        
        if (!response.success) {
            window.location.href = 'login.html?redirect=admin.html';
            return;
        }
        
        const user = response.data.user;
        
        // Check if user has admin role
        if (user.role !== 'admin' && user.role !== 'super_admin') {
            notify.error('Access denied. Admin privileges required.');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            return;
        }
        
        showAdminPanel(user);
        
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = 'login.html?redirect=admin.html';
    }
}

// Show admin panel
function showAdminPanel(user) {
    const adminPanel = document.getElementById('adminPanel');
    
    if (adminPanel) adminPanel.style.display = 'block';
    
    // Load all data
    loadDashboardStats();
    loadOrders();
    loadProducts();
    loadCategories();
    loadInventory();
    loadSettings();

    // Auto-refresh orders every 30 seconds
    autoRefreshInterval = setInterval(() => {
        loadOrders(true); // silent refresh
        loadDashboardStats();
    }, 30000);
}

// Handle logout
async function handleLogout() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    try {
        await api.logout();
    } catch (error) {
        console.error('Logout error:', error);
    }
    window.location.href = 'login.html';
}

// ========================================
// DASHBOARD STATS
// ========================================

// Date filter helper functions
function getDateRange(period) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    
    switch (period) {
        case 'today':
            return { start: startOfDay, end: endOfDay, label: 'Today' };
        
        case 'week':
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startOfWeek.setHours(0, 0, 0, 0);
            return { start: startOfWeek, end: endOfDay, label: 'This Week' };
        
        case 'month':
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            return { start: startOfMonth, end: endOfDay, label: 'This Month' };
        
        case 'year':
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            return { start: startOfYear, end: endOfDay, label: 'This Year' };
        
        case 'custom':
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            if (startDate && endDate) {
                return {
                    start: new Date(startDate),
                    end: new Date(new Date(endDate).setHours(23, 59, 59)),
                    label: `${startDate} to ${endDate}`
                };
            }
            return { start: new Date(0), end: endOfDay, label: 'Custom Range' };
        
        case 'all':
        default:
            return { start: new Date(0), end: endOfDay, label: 'All Time' };
    }
}

function filterOrdersByDate(orders, startDate, endDate) {
    return orders.filter(order => {
        const orderDate = new Date(order.createdAt || order.created_at);
        return orderDate >= startDate && orderDate <= endDate;
    });
}

// Handle period selection change
function handlePeriodChange() {
    const period = document.getElementById('revenuePeriod').value;
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const applyBtn = document.getElementById('applyDateBtn');
    
    if (period === 'custom') {
        startDateInput.style.display = 'inline-block';
        endDateInput.style.display = 'inline-block';
        applyBtn.style.display = 'inline-block';
        
        // Set default to current month
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        startDateInput.value = firstDay.toISOString().split('T')[0];
        endDateInput.value = lastDay.toISOString().split('T')[0];
    } else {
        startDateInput.style.display = 'none';
        endDateInput.style.display = 'none';
        applyBtn.style.display = 'none';
    }
}

async function loadDashboardStats() {
    try {
        const [ordersResponse, productsResponse] = await Promise.all([
            api.admin.getOrders(),
            api.admin.getProducts()
        ]);

        const allOrders = ordersResponse.success ? ordersResponse.data : [];
        const products = productsResponse.success ? productsResponse.data : [];

        // Get selected period
        const period = document.getElementById('revenuePeriod').value;
        const dateRange = getDateRange(period);
        
        // Filter orders by date range
        const filteredOrders = filterOrdersByDate(allOrders, dateRange.start, dateRange.end);

        // Calculate total revenue for selected period
        const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.totalCents || 0), 0) / 100;
        document.getElementById('totalRevenue').textContent = `$${totalRevenue.toFixed(2)}`;
        document.getElementById('revenueChange').textContent = dateRange.label;

        // Orders today (always show today regardless of filter)
        const today = new Date().toDateString();
        const ordersToday = allOrders.filter(o => new Date(o.createdAt).toDateString() === today).length;
        document.getElementById('ordersToday').textContent = ordersToday;

        // Total products
        document.getElementById('totalProducts').textContent = products.length;

        // Low stock alert
        const lowStockProducts = products.filter(p => (p.stock || p.stockQuantity || 0) < 10);
        if (lowStockProducts.length > 0) {
            document.getElementById('lowStockAlert').innerHTML = `⚠️ ${lowStockProducts.length} low stock items`;
            document.getElementById('lowStockAlert').style.color = '#e74c3c';
        }

        // Pending orders (always show all pending)
        const pendingOrders = allOrders.filter(o => o.orderStatus === 'pending' || o.orderStatus === 'processing').length;
        document.getElementById('pendingOrders').textContent = pendingOrders;

    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Period change handler will be initialized in main DOMContentLoaded

// ========================================
// PRODUCTS MANAGEMENT
// ========================================

async function getProducts() {
    try {
        const response = await api.admin.getProducts();
        return response.success ? response.data : [];
    } catch (error) {
        console.error('Error loading products:', error);
        return [];
    }
}

async function loadProducts() {
    const products = await getProducts();
    const tableBody = document.getElementById('productsTableBody');
    
    if (!tableBody) return;
    
    if (products.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:#666;">No products yet</td></tr>`;
        return;
    }
    
    tableBody.innerHTML = products.map(product => {
        const stock = product.stock || product.stockQuantity || 0;
        const stockClass = stock < 10 ? 'low-stock' : '';
        return `
        <tr>
            <td><img src="${product.images?.[0]?.url || 'images/placeholder.avif'}" alt="${product.name}" style="width:50px;height:50px;object-fit:cover;border-radius:4px;"></td>
            <td>${escapeHtml(product.name)}</td>
            <td>${escapeHtml(product.category || product.categoryName || 'N/A')}</td>
            <td>$${parseFloat(product.price).toFixed(2)}</td>
            <td class="${stockClass}">${stock} ${stock < 10 ? '⚠️' : ''}</td>
            <td>
                <button onclick="editProduct('${product.id}')" class="btn btn-secondary" style="margin-right:5px;">Edit</button>
                <button onclick="deleteProduct('${product.id}')" class="btn btn-secondary">Delete</button>
            </td>
        </tr>
    `;
    }).join('');
}

// ========================================
// INVENTORY MANAGEMENT
// ========================================

async function loadInventory() {
    const products = await getProducts();
    const tableBody = document.getElementById('inventoryTableBody');
    
    if (!tableBody) return;
    
    if (products.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:2rem;color:#666;">No products yet</td></tr>`;
        return;
    }
    
    tableBody.innerHTML = products.map(product => {
        const stock = product.stock || product.stockQuantity || 0;
        const stockClass = stock < 10 ? 'low-stock' : '';
        const statusBadge = stock < 10 ? '<span class="status-badge status-cancelled">Low Stock</span>' : 
                           stock < 50 ? '<span class="status-badge status-pending">Medium</span>' :
                           '<span class="status-badge status-shipped">In Stock</span>';
        return `
        <tr>
            <td>${escapeHtml(product.name)}</td>
            <td class="${stockClass}">${stock}</td>
            <td>${statusBadge}</td>
            <td>
                <input type="number" id="stock-${product.id}" value="${stock}" min="0" style="width:100px;padding:0.5rem;border:1px solid #ddd;border-radius:4px;">
                <button onclick="updateStock('${product.id}')" class="btn btn-primary" style="margin-left:0.5rem;">Update</button>
            </td>
        </tr>
    `;
    }).join('');
}

// ========================================
// CATEGORIES
// ========================================

async function loadCategoriesForProductForm() {
    try {
        const response = await api.getCategories();
        const categories = response.success ? response.data : (Array.isArray(response) ? response : []);
        
        const categorySelect = document.getElementById('productCategory');
        if (!categorySelect) return;
        
        // Keep the default option and add categories
        const currentValue = categorySelect.value;
        categorySelect.innerHTML = '<option value="">Select category</option>' + 
            categories.map(cat => `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`).join('');
        
        // Restore previous selection if exists
        if (currentValue) categorySelect.value = currentValue;
        
        return categories;
    } catch (error) {
        console.error('Failed to load categories:', error);
        return [];
    }
}

// ========================================
// PRODUCT FORM FUNCTIONS
// ========================================

function updateStock(productId) {
    const newStock = parseInt(document.getElementById(`stock-${productId}`).value);
    
    if (isNaN(newStock) || newStock < 0) {
        notify.warning('Please enter a valid stock quantity');
        return;
    }

    api.admin.updateProduct(productId, { stockQuantity: newStock }).then(response => {
        if (response.success) {
            showNotification('Stock updated successfully!');
            loadInventory();
            loadProducts();
            loadDashboardStats();
        }
    }).catch(error => {
        notify.error('Error updating stock: ' + (error.message || 'Unknown error'));
    });
}

function showProductModal(productId = null) {
    console.log('showProductModal called with productId:', productId);
    const modal = document.getElementById('productModal');
    const form = document.getElementById('productForm');
    const modalTitle = document.getElementById('modalTitle');
    
    if (!modal || !form || !modalTitle) {
        console.error('Modal elements not found!');
        return;
    }
    
    // Load categories into dropdown
    loadCategoriesForProductForm().then(() => {
        if (productId) {
            modalTitle.textContent = 'Edit Product';
            getProducts().then(products => {
                const product = products.find(p => p.id === productId);
                
                if (product) {
                    document.getElementById('productId').value = product.id;
                    document.getElementById('productName').value = product.name;
                    document.getElementById('productPrice').value = product.price;
                    document.getElementById('productDescription').value = product.description || '';
                    document.getElementById('productStock').value = product.stock || product.stockQuantity || 100;
                    document.getElementById('productCategory').value = product.categoryId || product.category_id || '';
                    // Make image optional for edit
                    document.getElementById('productImage').removeAttribute('required');
                }
            });
        } else {
            modalTitle.textContent = 'Add New Product';
            form.reset();
            document.getElementById('productId').value = '';
            document.getElementById('productImage').setAttribute('required', 'required');
        }
        
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('active', 'show');
        }, 10);
    });
}

function closeProductModal() {
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.classList.remove('active', 'show');
        setTimeout(() => modal.style.display = 'none', 200);
    }
}

function handleProductSubmit(e) {
    e.preventDefault();
    
    const productId = document.getElementById('productId').value;
    const imageFile = document.getElementById('productImage').files[0];
    
    // Use FormData for file upload
    const formData = new FormData();
    formData.append('name', document.getElementById('productName').value);
    formData.append('description', document.getElementById('productDescription').value);
    formData.append('price', parseFloat(document.getElementById('productPrice').value));
    formData.append('stockQuantity', parseInt(document.getElementById('productStock').value) || 100);
    
    const categoryId = document.getElementById('productCategory').value;
    if (categoryId) {
        formData.append('categoryId', categoryId);
    }
    
    formData.append('isActive', 'true');
    
    // Add image file if provided
    if (imageFile) {
        formData.append('image', imageFile);
    }
    
    submitProduct(productId, formData);
}

async function submitProduct(productId, formData) {
    try {
        let response;
        if (productId) {
            response = await api.admin.updateProduct(productId, formData);
        } else {
            response = await api.admin.createProduct(formData);
        }
        
        if (response.success) {
            closeProductModal();
            await loadProducts();
            showNotification(productId ? '✅ Product updated!' : '✅ Product added!');
        }
    } catch (error) {
        notify.error('Error: ' + (error.message || 'Unknown error'));
    }
}

function editProduct(productId) {
    console.log('editProduct called with productId:', productId);
    showProductModal(productId);
}

async function deleteProduct(productId) {
    const shouldDelete = await customConfirm('Are you sure you want to delete this product? This action cannot be undone.', 'Delete', 'Cancel');
    if (!shouldDelete) return;
    
    api.admin.deleteProduct(productId).then(response => {
        if (response.success) {
            notify.success('Product deleted successfully!');
            loadProducts();
        }
    }).catch(error => {
        notify.error('Error: ' + (error.message || 'Unknown error'));
    });
}

// ========================================
// ORDERS MANAGEMENT
// ========================================

let lastOrderCount = 0;
let allOrders = []; // Store all orders for filtering

async function loadOrders(silent = false) {
    try {
        const response = await api.admin.getOrders();
        allOrders = response.success ? response.data : [];
        
        // Check for new orders
        if (!silent && allOrders.length > lastOrderCount && lastOrderCount > 0) {
            const newOrdersCount = allOrders.length - lastOrderCount;
            showNotification(`🎉 ${newOrdersCount} new order${newOrdersCount > 1 ? 's' : ''} received!`);
        }
        lastOrderCount = allOrders.length;
        
        // Apply current filters
        applyOrderFilters();
        
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

function applyOrderFilters() {
    const ordersContainer = document.getElementById('ordersTableBody');
    if (!ordersContainer) return;
    
    // Get filter values
    const dateFilter = document.getElementById('orderDateFilter').value;
    const statusFilter = document.getElementById('orderStatusFilter').value;
    
    // Handle custom date visibility
    const customDateInputs = document.getElementById('customDateInputs');
    if (dateFilter === 'custom') {
        customDateInputs.style.display = 'flex';
    } else {
        customDateInputs.style.display = 'none';
    }
    
    // Filter by date
    let filteredOrders = [...allOrders];
    
    if (dateFilter !== 'all') {
        const dateRange = getDateRange(dateFilter);
        if (dateFilter === 'custom') {
            const startDate = document.getElementById('orderStartDate').value;
            const endDate = document.getElementById('orderEndDate').value;
            if (startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(new Date(endDate).setHours(23, 59, 59));
                filteredOrders = filteredOrders.filter(order => {
                    const orderDate = new Date(order.createdAt || order.created_at);
                    return orderDate >= start && orderDate <= end;
                });
            }
        } else {
            filteredOrders = filterOrdersByDate(filteredOrders, dateRange.start, dateRange.end);
        }
    }
    
    // Filter by status
    if (statusFilter !== 'all') {
        filteredOrders = filteredOrders.filter(order => 
            (order.orderStatus || 'pending').toLowerCase() === statusFilter.toLowerCase()
        );
    }
    
    // Display filtered orders
    displayOrders(filteredOrders);
}

function displayOrders(orders) {
    const ordersContainer = document.getElementById('ordersTableBody');
    if (!ordersContainer) return;
    
    if (orders.length === 0) {
        ordersContainer.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:#666;">No orders found matching filters</td></tr>`;
        return;
    }
    
    // Sort by date (newest first)
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    ordersContainer.innerHTML = orders.map(order => {
        const statusClass = `status-${order.orderStatus || 'pending'}`;
        const paymentStatusBadge = order.paymentStatus === 'succeeded' 
            ? '<span style="color: #16a34a; font-size: 12px;">✓ Paid</span>' 
            : '<span style="color: #dc2626; font-size: 12px;">⚠ Unpaid</span>';
        return `
        <tr>
            <td><strong>${escapeHtml(order.orderNumber)}</strong><br>${paymentStatusBadge}</td>
            <td>${escapeHtml(order.customerEmail || order.shippingEmail || 'N/A')}</td>
            <td>${escapeHtml(order.customerPhone || 'N/A')}</td>
            <td>${new Date(order.createdAt).toLocaleString()}</td>
            <td><strong>$${((order.totalCents || 0) / 100).toFixed(2)}</strong></td>
            <td><span class="status-badge ${statusClass}">${(order.orderStatus || 'pending').toUpperCase()}</span></td>
            <td>
                <div class="table-actions">
                    <button onclick="viewOrderDetails('${order.id}')" class="btn btn-primary btn-sm">View</button>
                    <select onchange="updateOrderStatus('${order.id}', this.value)" class="status-select">
                        <option value="">Change Status...</option>
                        <option value="processing" ${order.orderStatus === 'processing' ? 'selected' : ''}>Processing</option>
                        <option value="shipped" ${order.orderStatus === 'shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="delivered" ${order.orderStatus === 'delivered' ? 'selected' : ''}>Delivered</option>
                        <option value="cancelled" ${order.orderStatus === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </div>
            </td>
        </tr>
    `;
    }).join('');
}

function clearOrderFilters() {
    document.getElementById('orderDateFilter').value = 'all';
    document.getElementById('orderStatusFilter').value = 'all';
    document.getElementById('orderStartDate').value = '';
    document.getElementById('orderEndDate').value = '';
    document.getElementById('customDateInputs').style.display = 'none';
    applyOrderFilters();
}

// Order filter handlers will be initialized in main DOMContentLoaded

function initializeOrderFilters() {
    const orderDateFilter = document.getElementById('orderDateFilter');
    if (orderDateFilter) {
        orderDateFilter.addEventListener('change', () => {
            const customDateInputs = document.getElementById('customDateInputs');
            if (orderDateFilter.value === 'custom') {
                customDateInputs.style.display = 'flex';
                
                // Set default to current month
                const now = new Date();
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                
                document.getElementById('orderStartDate').value = firstDay.toISOString().split('T')[0];
                document.getElementById('orderEndDate').value = lastDay.toISOString().split('T')[0];
            } else {
                customDateInputs.style.display = 'none';
            }
        });
    }
}

// ========================================
// GLOBAL FUNCTIONS FOR ONCLICK
// ========================================

function viewOrderDetails(orderId) {
    console.log('viewOrderDetails called with orderId:', orderId);
    
    api.admin.getOrder(orderId).then(response => {
        if (response.success) {
            const order = response.data.order;
            const modal = document.getElementById('orderModal');
            const detailsDiv = document.getElementById('orderDetails');
            
            detailsDiv.innerHTML = `
                <div style="line-height: 1.8;">
                    <p><strong>Order Number:</strong> ${order.orderNumber}</p>
                    <p><strong>Customer Email:</strong> ${order.shippingEmail}</p>
                    <p><strong>Customer Phone:</strong> ${order.shippingPhone || 'N/A'}</p>
                    <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
                    <p><strong>Status:</strong> <span class="status-badge status-${order.orderStatus}">${order.orderStatus?.toUpperCase()}</span></p>
                    <hr>
                    <h4>Shipping Address:</h4>
                    <p>${order.shippingName || 'N/A'}<br>
                    ${order.shippingAddress || ''}<br>
                    ${order.shippingCity || ''}, ${order.shippingState || ''} ${order.shippingZip || ''}</p>
                    <hr>
                    <h4>Order Items:</h4>
                    ${order.items ? order.items.map(item => `
                        <p>${item.name} x ${item.quantity} - $${((item.priceCents || 0) / 100).toFixed(2)}</p>
                    `).join('') : '<p>No items</p>'}
                    <hr>
                    <h4><strong>Total: $${((order.totalCents || 0) / 100).toFixed(2)}</strong></h4>
                </div>
            `;
            modal.style.display = 'flex';
            setTimeout(() => {
                modal.classList.add('active', 'show');
            }, 10);
        }
    }).catch(error => {
        console.error('Error loading order details:', error);
        notify.error('Error loading order details: ' + error.message);
    });
}

function closeOrderModal() {
    const modal = document.getElementById('orderModal');
    if (modal) {
        modal.classList.remove('active', 'show');
        setTimeout(() => modal.style.display = 'none', 200);
    }
}

function updateOrderStatus(orderId, newStatus) {
    if (!newStatus) return;
    
    api.admin.updateOrderStatus(orderId, newStatus).then(response => {
        if (response.success) {
            showNotification(`Order status updated to ${newStatus}!`);
            loadOrders(true);
            loadDashboardStats();
        }
    }).catch(error => {
        notify.error('Error updating order status: ' + (error.message || 'Unknown error'));
    });
}

function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.admin-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(tabName + 'Tab');
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Add active class to clicked button
    const clickedBtn = document.querySelector(`[data-tab="${tabName}"]`);
    if (clickedBtn) {
        clickedBtn.classList.add('active');
    }
}

// ========================================
// UTILITY
// ========================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message) {
    // Remove existing notification
    const existing = document.querySelector('.order-notification');
    if (existing) existing.remove();
    
    // Create new notification
    const notification = document.createElement('div');
    notification.className = 'order-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// ========================================
// SETTINGS MANAGEMENT
// ========================================

async function loadSettings() {
    try {
        const response = await api.admin.getSettings();
        
        if (response.success) {
            const settings = response.data;
            
            // Convert values and populate form
            const taxRate = parseFloat(settings.tax_rate) * 100; // Convert 0.1 to 10
            const shippingFee = parseInt(settings.shipping_fee_cents) / 100; // Convert cents to dollars
            const freeShippingThreshold = parseInt(settings.free_shipping_threshold_cents) / 100;
            
            document.getElementById('taxRate').value = taxRate.toFixed(2);
            document.getElementById('shippingFee').value = shippingFee.toFixed(2);
            document.getElementById('freeShippingThreshold').value = freeShippingThreshold.toFixed(2);
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        notify.error('Failed to load settings');
    }
}

async function saveSettings(e) {
    e.preventDefault();
    
    try {
        const taxRate = parseFloat(document.getElementById('taxRate').value) / 100; // Convert 10 to 0.1
        const shippingFee = parseFloat(document.getElementById('shippingFee').value) * 100; // Convert to cents
        const freeShippingThreshold = parseFloat(document.getElementById('freeShippingThreshold').value) * 100;
        
        // Update each setting
        await Promise.all([
            api.admin.updateSetting('tax_rate', taxRate),
            api.admin.updateSetting('shipping_fee_cents', Math.round(shippingFee)),
            api.admin.updateSetting('free_shipping_threshold_cents', Math.round(freeShippingThreshold))
        ]);
        
        notify.success('Settings updated successfully!');
    } catch (error) {
        console.error('Error saving settings:', error);
        notify.error('Failed to save settings: ' + (error.message || 'Unknown error'));
    }
}

// ========================================
// CATEGORIES MANAGEMENT
// ========================================

async function loadCategories() {
    try {
        const response = await api.get('/categories/admin/all');
        
        if (!response.success) {
            notify.error('Failed to load categories');
            return;
        }
        
        const categories = response.data || [];
        const tbody = document.getElementById('categoriesTableBody');
        
        if (!tbody) return;
        
        if (categories.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <div class="empty-state-icon">📁</div>
                        <div>No categories found</div>
                        <button class="btn btn-primary add-first-category-btn" style="margin-top: 1rem;">Add First Category</button>
                    </td>
                </tr>
            `;
            
            // Add event listener to the add button
            const addBtn = tbody.querySelector('.add-first-category-btn');
            if (addBtn) {
                addBtn.addEventListener('click', showAddCategoryModal);
            }
            return;
        }
        
        tbody.innerHTML = categories.map(category => `
            <tr data-category-id="${category.id}">
                <td><strong>${category.name}</strong></td>
                <td><code>${category.slug}</code></td>
                <td>${category.description || '-'}</td>
                <td>${category.product_count || 0}</td>
                <td>${category.display_order}</td>
                <td>
                    <span class="status-badge ${category.is_active ? 'status-completed' : 'status-cancelled'}">
                        ${category.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-icon edit-category-btn" title="Edit" data-id="${category.id}">✏️</button>
                        <button class="btn-icon delete-category-btn" title="Delete" data-id="${category.id}" data-name="${escapeHtml(category.name)}">🗑️</button>
                    </div>
                </td>
            </tr>
        `).join('');
        
        // Add event listeners to edit and delete buttons
        tbody.querySelectorAll('.edit-category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                editCategory(id);
            });
        });
        
        tbody.querySelectorAll('.delete-category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const name = btn.getAttribute('data-name');
                deleteCategory(id, name);
            });
        });
        
    } catch (error) {
        console.error('Error loading categories:', error);
        notify.error('Failed to load categories');
    }
}

function showAddCategoryModal() {
    console.log('showAddCategoryModal called');
    const modal = document.getElementById('categoryModal');
    const form = document.getElementById('categoryForm');
    const modalTitle = document.getElementById('categoryModalTitle');
    
    console.log('Modal found:', modal);
    console.log('Form found:', form);
    console.log('Modal title found:', modalTitle);
    
    if (!modal || !form || !modalTitle) {
        console.error('Category modal elements not found!');
        return;
    }
    
    // Reset form for adding new category
    modalTitle.textContent = 'Add New Category';
    form.reset();
    document.getElementById('categoryId').value = '';
    document.getElementById('categoryOrder').value = '1';
    document.getElementById('categoryActive').checked = true;
    
    // Show modal - set everything at once
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    modal.style.visibility = 'visible';
    modal.classList.add('active', 'show');
    
    console.log('Modal should now be visible with styles:', {
        display: modal.style.display,
        opacity: modal.style.opacity,
        visibility: modal.style.visibility,
        classes: modal.className
    });
}

function closeCategoryModal() {
    const modal = document.getElementById('categoryModal');
    if (modal) {
        modal.classList.remove('active', 'show');
    }
}

async function editCategory(id) {
    try {
        const response = await api.get(`/categories/${id}`);
        
        if (!response.success) {
            notify.error('Failed to load category');
            return;
        }
        
        const category = response.data;
        
        showAddCategoryModal();
        
        // Populate form
        document.getElementById('categoryModalTitle').textContent = 'Edit Category';
        document.getElementById('categoryId').value = category.id;
        document.getElementById('categoryName').value = category.name;
        document.getElementById('categorySlug').value = category.slug;
        document.getElementById('categoryDescription').value = category.description || '';
        document.getElementById('categoryOrder').value = category.display_order;
        document.getElementById('categoryActive').checked = category.is_active;
        
    } catch (error) {
        console.error('Error loading category:', error);
        notify.error('Failed to load category');
    }
}

async function handleCategorySubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('categoryId').value;
    const categoryData = {
        name: document.getElementById('categoryName').value.trim(),
        slug: document.getElementById('categorySlug').value.trim(),
        description: document.getElementById('categoryDescription').value.trim(),
        display_order: parseInt(document.getElementById('categoryOrder').value),
        is_active: document.getElementById('categoryActive').checked
    };
    
    try {
        let response;
        if (id) {
            response = await api.put(`/categories/${id}`, categoryData);
        } else {
            response = await api.post('/categories', categoryData);
        }
        
        if (response.success) {
            notify.success(id ? 'Category updated successfully' : 'Category created successfully');
            closeModal('categoryModal');
            loadCategories();
        } else {
            notify.error(response.message || 'Failed to save category');
        }
    } catch (error) {
        console.error('Error saving category:', error);
        notify.error(error.message || 'Failed to save category');
    }
}

async function deleteCategory(id, name) {
    if (!confirm(`Are you sure you want to delete the category "${name}"?\n\nNote: Products in this category will not be deleted.`)) {
        return;
    }
    
    try {
        const response = await api.delete(`/categories/${id}`);
        
        if (response.success) {
            notify.success('Category deleted successfully');
            loadCategories();
        } else {
            notify.error(response.message || 'Failed to delete category');
        }
    } catch (error) {
        console.error('Error deleting category:', error);
        notify.error('Failed to delete category');
    }
}

// Helper function to show modal
function showModal(modalId, content) {
    // Remove existing modal if present
    let modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
    
    // Create fresh modal
    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal-overlay';
    modal.innerHTML = `<div class="modal">${content}</div>`;
    document.body.appendChild(modal);
    
    // Show modal - set display immediately, then trigger transition
    modal.style.display = 'flex';
    // Force reflow to ensure display is applied before transition
    void modal.offsetHeight;
    modal.classList.add('active', 'show');
    
    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modalId);
        }
    });
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active', 'show');
        setTimeout(() => {
            modal.style.display = 'none';
            modal.remove();
        }, 300);
    }
}

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // Expose category functions to global scope for inline handlers
    window.loadCategories = loadCategories;
    window.showAddCategoryModal = showAddCategoryModal;
    window.editCategory = editCategory;
    window.handleCategorySubmit = handleCategorySubmit;
    window.deleteCategory = deleteCategory;
    window.showModal = showModal;
    window.closeModal = closeModal;
    
    // Update auth buttons and cart count
    if (window.updateAuthButtons) {
        window.updateAuthButtons();
    }
    if (window.updateCartCount) {
        window.updateCartCount();
    }
    
    checkAuth();
    
    // Initialize period select handler
    const periodSelect = document.getElementById('revenuePeriod');
    if (periodSelect) {
        periodSelect.addEventListener('change', handlePeriodChange);
    }
    
    // Initialize order filters
    initializeOrderFilters();
    
    const productForm = document.getElementById('productForm');
    if (productForm) {
        productForm.addEventListener('submit', handleProductSubmit);
    }

    // Settings form
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('submit', saveSettings);
    }
    
    // Category form
    const categoryForm = document.getElementById('categoryForm');
    if (categoryForm) {
        categoryForm.addEventListener('submit', handleCategorySubmit);
        
        // Auto-generate slug from name
        const categoryNameInput = document.getElementById('categoryName');
        if (categoryNameInput) {
            categoryNameInput.addEventListener('input', (e) => {
                const slug = e.target.value.toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, '');
                const slugInput = document.getElementById('categorySlug');
                if (slugInput) {
                    slugInput.value = slug;
                }
            });
        }
    }

    // Tab switching
    document.querySelectorAll('.admin-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.tab);
        });
    });

    // Add product button
    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => showProductModal());
    }
    
    // Add category button
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', showAddCategoryModal);
    }

    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            e.target.classList.remove('active', 'show');
            setTimeout(() => e.target.style.display = 'none', 200);
        }
    });
});
