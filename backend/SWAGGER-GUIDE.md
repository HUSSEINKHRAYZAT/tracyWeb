# Swagger API Documentation Guide

This guide explains how to add new endpoints to the Swagger documentation so they automatically appear in the API docs.

## How It Works

The Swagger documentation is **automatically generated** from JSDoc comments in your code. When you add a new endpoint with proper JSDoc comments, it will automatically appear in the Swagger UI at `http://localhost:3000/api-docs`.

## Adding Documentation for New Endpoints

### Method 1: Add JSDoc Comments in Route Files (Recommended)

You can add Swagger documentation directly above your route handlers:

```javascript
/**
 * @swagger
 * /api/your-endpoint:
 *   post:
 *     summary: Brief description of what this endpoint does
 *     tags: [Category Name]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               field1:
 *                 type: string
 *               field2:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Success response
 *       400:
 *         description: Bad request
 */
router.post('/your-endpoint', async (req, res) => {
    // Your endpoint logic here
});
```

### Method 2: Add to swagger-annotations.js

For centralized documentation, add your endpoint documentation to `src/docs/swagger-annotations.js`:

```javascript
/**
 * @swagger
 * /api/your-endpoint:
 *   get:
 *     summary: Get something
 *     tags: [YourCategory]
 *     responses:
 *       200:
 *         description: Success
 */
```

## Examples

### Simple GET Endpoint (No Authentication)

```javascript
/**
 * @swagger
 * /api/products/featured:
 *   get:
 *     summary: Get featured products
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: List of featured products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 */
router.get('/featured', async (req, res) => {
    // Your code
});
```

### POST Endpoint with Authentication and Request Body

```javascript
/**
 * @swagger
 * /api/products/review:
 *   post:
 *     summary: Add a product review
 *     tags: [Products]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - rating
 *               - comment
 *             properties:
 *               productId:
 *                 type: string
 *                 format: uuid
 *                 description: Product UUID
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Rating from 1 to 5
 *               comment:
 *                 type: string
 *                 description: Review comment
 *     responses:
 *       201:
 *         description: Review added successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/review', requireAuth, csrfProtection, async (req, res) => {
    // Your code
});
```

### Endpoint with Path Parameters

```javascript
/**
 * @swagger
 * /api/orders/{orderId}/items/{itemId}:
 *   delete:
 *     summary: Remove item from order
 *     tags: [Orders]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Item ID
 *     responses:
 *       200:
 *         description: Item removed successfully
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.delete('/:orderId/items/:itemId', requireAuth, async (req, res) => {
    // Your code
});
```

### Endpoint with Query Parameters

```javascript
/**
 * @swagger
 * /api/products/search:
 *   get:
 *     summary: Search products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by category
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/search', async (req, res) => {
    // Your code
});
```

## Available Tags

Use these predefined tags to categorize your endpoints:

- `Authentication` - Auth-related endpoints
- `Products` - Product catalog
- `Categories` - Product categories
- `Cart` - Shopping cart
- `Orders` - Order management
- `Checkout` - Checkout and payment
- `Admin` - Admin-only endpoints
- `System` - Health checks and utilities

To add a new tag, update `src/config/swagger.js`:

```javascript
tags: [
  // ... existing tags
  {
    name: 'YourNewTag',
    description: 'Description of this tag'
  }
]
```

## Reusable Schemas

You can reference predefined schemas in `src/config/swagger.js`:

Available schemas:
- `User`
- `Product`
- `Category`
- `Cart`
- `Order`
- `Error`

Reference them with:
```javascript
$ref: '#/components/schemas/Product'
```

## Common Response References

Use these for common error responses:

```javascript
responses:
  401:
    $ref: '#/components/responses/UnauthorizedError'
  403:
    $ref: '#/components/responses/ForbiddenError'
  404:
    $ref: '#/components/responses/NotFoundError'
  400:
    $ref: '#/components/responses/ValidationError'
```

## Security Schemes

For protected endpoints, use these security schemes:

```javascript
security:
  - cookieAuth: []       # For session-based auth
  - csrfToken: []        # For CSRF protection
```

## Testing Your Documentation

1. Start your server: `npm run dev`
2. Navigate to: `http://localhost:3000/api-docs`
3. Your new endpoint should appear automatically
4. Use the "Try it out" button to test the endpoint directly from Swagger UI

## Tips

1. **Be Descriptive**: Use clear summaries and descriptions
2. **Include Examples**: Add example values in your schema definitions
3. **Document Errors**: List all possible error responses
4. **Required Fields**: Mark required fields in request bodies
5. **Data Types**: Use accurate data types (string, integer, boolean, etc.)
6. **Validation Rules**: Include min/max, patterns, enums where applicable

## Complete Example: New Wishlist Endpoint

Here's a complete example of adding a new wishlist feature:

```javascript
// In src/routes/wishlist.js

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

/**
 * @swagger
 * /api/wishlist:
 *   get:
 *     summary: Get user's wishlist
 *     tags: [Wishlist]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User's wishlist items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/', requireAuth, async (req, res) => {
    // Get wishlist logic
});

/**
 * @swagger
 * /api/wishlist:
 *   post:
 *     summary: Add product to wishlist
 *     tags: [Wishlist]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *             properties:
 *               productId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Product added to wishlist
 *       400:
 *         description: Product already in wishlist
 *       404:
 *         description: Product not found
 */
router.post('/', requireAuth, async (req, res) => {
    // Add to wishlist logic
});

module.exports = router;
```

Then register the route in `src/index.js`:

```javascript
app.use('/api/wishlist', csrfProtection, require('./routes/wishlist'));
```

That's it! Your new endpoints will automatically appear in the Swagger documentation.

## Adding New Schema Definitions

If you create new data models, add them to `src/config/swagger.js`:

```javascript
components: {
  schemas: {
    // ... existing schemas
    Wishlist: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        user_id: { type: 'string', format: 'uuid' },
        product_id: { type: 'string', format: 'uuid' },
        created_at: { type: 'string', format: 'date-time' }
      }
    }
  }
}
```

## Troubleshooting

### Endpoint not showing in Swagger?

1. Check JSDoc comment syntax is correct
2. Ensure the route file is in `src/routes/` directory
3. Restart your server (`npm run dev`)
4. Check for syntax errors in the Swagger annotations
5. Visit `/api-docs.json` to see the raw OpenAPI spec

### Swagger UI not loading?

1. Ensure dependencies are installed: `npm install`
2. Check server is running on port 3000
3. Visit `http://localhost:3000/health` to verify server is up
4. Check browser console for errors

## Resources

- [Swagger/OpenAPI Specification](https://swagger.io/specification/)
- [Swagger JSDoc Documentation](https://github.com/Surnet/swagger-jsdoc)
- [OpenAPI Data Types](https://swagger.io/docs/specification/data-models/data-types/)

---

**Note**: The Swagger documentation is regenerated on every server start, so your changes appear immediately after restarting the server.
