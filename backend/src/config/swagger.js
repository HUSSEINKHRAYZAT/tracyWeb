const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Tracy Talks Health API',
      version: '1.0.0',
      description: 'E-commerce API for Tracy Talks Health platform with multiple payment gateway integrations',
      contact: {
        name: 'API Support',
        email: 'support@tracytalkshealth.com'
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'sid',
          description: 'Session-based authentication via cookies'
        },
        csrfToken: {
          type: 'apiKey',
          in: 'header',
          name: 'X-CSRF-Token',
          description: 'CSRF token for state-changing operations'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            phone: { type: 'string' },
            role: { type: 'string', enum: ['customer', 'admin', 'super_admin'] },
            email_verified: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number' },
            stock_quantity: { type: 'integer' },
            category_id: { type: 'string', format: 'uuid' },
            is_active: { type: 'boolean' },
            images: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  url: { type: 'string' },
                  is_primary: { type: 'boolean' }
                }
              }
            }
          }
        },
        Category: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string' },
            display_order: { type: 'integer' },
            is_active: { type: 'boolean' },
            product_count: { type: 'integer' }
          }
        },
        Cart: {
          type: 'object',
          properties: {
            cartId: { type: 'string', format: 'uuid' },
            items: { type: 'array', items: { type: 'object' } },
            itemCount: { type: 'integer' },
            subtotal: { type: 'string' }
          }
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            order_number: { type: 'string' },
            user_id: { type: 'string', format: 'uuid' },
            status: {
              type: 'string',
              enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']
            },
            total_amount: { type: 'number' },
            payment_method: { type: 'string' },
            shipping_address: { type: 'object' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    },
    tags: [
      { name: 'Authentication', description: 'User authentication and account management' },
      { name: 'Products', description: 'Product catalog' },
      { name: 'Categories', description: 'Product categories' },
      { name: 'Cart', description: 'Shopping cart management' },
      { name: 'Orders', description: 'Order management' },
      { name: 'Checkout', description: 'Checkout and payment' },
      { name: 'Admin', description: 'Admin-only endpoints' },
      { name: 'System', description: 'System utilities and health checks' }
    ]
  },
  // This will automatically scan all route files and docs for JSDoc comments
  apis: [
    path.join(__dirname, '../routes/*.js'),
    path.join(__dirname, '../docs/*.js'),
    path.join(__dirname, '../index.js')
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
