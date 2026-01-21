require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const csrf = require('csurf');
const pool = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'SESSION_SECRET'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`❌ Missing required environment variable: ${envVar}`);
        process.exit(1);
    }
}

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'"
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'", // Required for inline styles (consider removing)
                "https://fonts.googleapis.com"
            ],
            fontSrc: [
                "'self'",
                "https://fonts.gstatic.com"
            ],
            imgSrc: [
                "'self'",
                "data:", // For inline images
                "https:" // Allow HTTPS images (for product images, avatars, etc.)
            ],
            connectSrc: [
                "'self'"
            ],
            frameSrc: [],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: []
        }
    },
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            process.env.FRONTEND_URL || 'http://localhost:8000',
            'http://127.0.0.1:8000',
            'http://localhost:5500', // Live Server default
            'http://127.0.0.1:5500'
        ];
        
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'Cache-Control'],
    exposedHeaders: ['X-CSRF-Token']
};

app.use(cors(corsOptions));

// Serve static files from public directory
const path = require('path');
app.use(express.static(path.join(__dirname, '../../public')));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Webhook routes (BEFORE body parsing middleware for raw body)
app.use('/api/webhooks', require('./routes/webhooks'));

// Session middleware
app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'sessions',
        createTableIfMissing: false
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: 'sid',
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
    },
    rolling: true
}));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Attach user to request if authenticated
const { attachUser } = require('./middleware/auth');
app.use(attachUser);

// CSRF Protection
const csrfProtection = csrf({ 
    cookie: false, // Use session instead of cookies
    ignoreMethods: ['GET', 'HEAD', 'OPTIONS']
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV 
    });
});

// Config endpoint (public keys only)
app.get('/api/config', (req, res) => {
    const paymentProvider = process.env.PAYMENT_PROVIDER || 'areeba';
    
    const config = {
        success: true,
        data: {
            paymentProvider: paymentProvider
        }
    };
    
    // Add provider-specific keys
    if (paymentProvider === 'whish') {
        config.data.whish = {
            merchantId: process.env.WHISH_MERCHANT_ID
        };
    } else if (paymentProvider === 'cash') {
        config.data.cash = {
            enabled: true,
            message: 'Cash on Delivery available'
        };
    } else if (paymentProvider === 'areeba') {
        config.data.areeba = {
            merchantId: process.env.AREEBA_MERCHANT_ID,
            enabled: true
        };
    }
    
    res.json(config);
});

// CSRF token endpoint
app.get('/api/csrf-token', csrfProtection, (req, res) => {
    res.json({ 
        csrfToken: req.csrfToken() 
    });
});

// API Routes (with CSRF protection)
app.use('/api/auth', csrfProtection, require('./routes/auth'));
app.use('/api/products', require('./routes/products')); // Read-only, no CSRF needed
app.use('/api/categories', require('./routes/categories')); // Read-only, no CSRF needed
app.use('/api/cart', csrfProtection, require('./routes/cart'));
app.use('/api/orders', csrfProtection, require('./routes/orders'));
app.use('/api/checkout', csrfProtection, require('./routes/checkout'));
app.use('/api/payment', require('./routes/payment')); // Payment verification (no CSRF for GET requests)
app.use('/api/admin', csrfProtection, require('./routes/admin'));
app.use('/api/settings', require('./routes/settings')); // Settings API
app.use('/api/contact', csrfProtection, require('./routes/contact')); // Contact form
app.use('/api/test', require('./routes/testRoutes')); // Test endpoints (no CSRF for debugging)

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: 'Endpoint not found'
        }
    });
});

// Error handler (must be last)
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    res.status(err.status || 500).json({
        success: false,
        error: {
            code: err.code || 'SERVER_ERROR',
            message: process.env.NODE_ENV === 'production'
                ? 'Internal server error'
                : err.message
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log('');
    console.log('='.repeat(50));
    console.log('🚀 Tracy Talks Health API Server');
    console.log('='.repeat(50));
    console.log(`📡 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`🛍️  Products API: http://localhost:${PORT}/api/products`);
    console.log('='.repeat(50));
    console.log('');
});
