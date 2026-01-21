// Custom Notification System
// Replaces alert() with beautiful, on-brand notifications

class NotificationSystem {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Create container if it doesn't exist
        if (!document.getElementById('notificationContainer')) {
            this.container = document.createElement('div');
            this.container.id = 'notificationContainer';
            this.container.className = 'notification-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('notificationContainer');
        }
    }

    show(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icon = this.getIcon(type);
        
        notification.innerHTML = `
            <div class="notification-icon">${icon}</div>
            <div class="notification-content">
                <p class="notification-message">${message}</p>
            </div>
            <button class="notification-close" aria-label="Close">×</button>
        `;

        this.container.appendChild(notification);

        // Trigger animation
        setTimeout(() => notification.classList.add('show'), 10);

        // Close button functionality
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => this.hide(notification));

        // Auto-hide after duration
        if (duration > 0) {
            setTimeout(() => this.hide(notification), duration);
        }

        return notification;
    }

    hide(notification) {
        notification.classList.remove('show');
        notification.classList.add('hide');
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    getIcon(type) {
        const icons = {
            success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>',
            error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
            warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
            info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/></svg>'
        };
        return icons[type] || icons.info;
    }

    success(message, duration) {
        return this.show(message, 'success', duration);
    }

    error(message, duration) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration) {
        return this.show(message, 'info', duration);
    }
}

// Create global instance
const notify = new NotificationSystem();

// Create global showNotification function for consistency
window.showNotification = function(message, type = 'info', duration = 5000) {
    return notify.show(message, type, duration);
};

// Override window.alert for backward compatibility
window.alert = function(message) {
    notify.info(message);
};

// Custom confirm dialog
window.customConfirm = function(message, confirmText = 'OK', cancelText = 'Cancel') {
    return new Promise((resolve) => {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';
        
        // Create dialog
        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';
        dialog.innerHTML = `
            <div class="confirm-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 8v4m0 4h.01"/>
                </svg>
            </div>
            <div class="confirm-message">${message}</div>
            <div class="confirm-actions">
                <button class="confirm-btn confirm-cancel">${cancelText}</button>
                <button class="confirm-btn confirm-ok">${confirmText}</button>
            </div>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // Trigger animation
        setTimeout(() => {
            overlay.classList.add('show');
            dialog.classList.add('show');
        }, 10);
        
        // Handle button clicks
        const handleClose = (result) => {
            overlay.classList.remove('show');
            dialog.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(overlay);
                resolve(result);
            }, 200);
        };
        
        dialog.querySelector('.confirm-cancel').addEventListener('click', () => handleClose(false));
        dialog.querySelector('.confirm-ok').addEventListener('click', () => handleClose(true));
        
        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                handleClose(false);
            }
        });
    });
};
