# Tracy Talks Health - E-Commerce Platform

A full-stack e-commerce web application for health products with multiple payment gateway integrations including Stripe, Areeba, Whish, and Cash on Delivery.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Database Setup](#database-setup)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Admin Panel](#admin-panel)
- [Payment Gateways](#payment-gateways)
- [Troubleshooting](#troubleshooting)

## Features

- User authentication and authorization (Customer, Admin, Super Admin roles)
- Product catalog with categories
- Shopping cart functionality
- Multi-payment gateway support (Stripe, Areeba, Whish, Cash on Delivery)
- Order management system
- Admin dashboard for managing products, orders, and users
- Email notifications
- CSRF protection and security headers
- Session management with PostgreSQL
- Responsive design
- **Interactive API documentation with Swagger/OpenAPI**

## Tech Stack

### Backend
- Node.js & Express.js
- PostgreSQL 14+
- Session-based authentication
- Helmet.js for security
- CSRF protection
- Bcrypt for password hashing
- Nodemailer for emails
- Swagger/OpenAPI for API documentation

### Frontend
- Vanilla JavaScript (ES6+)
- HTML5 & CSS3
- DOMPurify for XSS protection
- Responsive design

### Payment Integrations
- Stripe (International)
- Areeba (Lebanon & Middle East)
- Whish (Lebanon)
- Cash on Delivery

## Prerequisites

Before running this application, ensure you have the following installed:

- **Node.js** (v14 or higher)
- **npm** (v6 or higher)
- **PostgreSQL** (v14 or higher)
- **Docker** (optional, for containerized database)
- **Python 3** (for serving frontend)

### Check Prerequisites

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check PostgreSQL
psql --version

# Check Docker (optional)
docker --version

# Check Python 3
python3 --version
```

## Installation

### 1. Clone the Repository

```bash
cd /home/hassan/Projects/Personal\ -\ 42/tracyWeb
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Environment Configuration

Copy the `.env` file from the root directory to configure your environment variables:

```bash
# The .env file is already in the root directory
# Located at: /home/hassan/Projects/Personal - 42/tracyWeb/.env
```

## Configuration

### Environment Variables

The [.env](.env) file contains all necessary configuration. Key variables include:

```env
# Server Configuration
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:8000

# Database
DATABASE_URL=postgresql://tracyapp:TracyPass666@localhost:5433/tracytalkshealth

# Security
SESSION_SECRET=your_session_secret_here
BCRYPT_ROUNDS=12

# Payment Provider
PAYMENT_PROVIDER=stripe  # Options: stripe, areeba, whish, cash

# Stripe (International)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=your_email@gmail.com
ADMIN_EMAIL=admin@example.com
```

### Payment Provider Configuration

The app supports multiple payment providers. Configure based on your region:

- **International**: Use `PAYMENT_PROVIDER=stripe`
- **Lebanon (Card)**: Use `PAYMENT_PROVIDER=areeba` or `PAYMENT_PROVIDER=whish`
- **Cash Only**: Use `PAYMENT_PROVIDER=cash`

## Running the Application

### Option 1: Using the Start Script (Recommended)

The easiest way to run the application:

```bash
cd /home/hassan/Projects/Personal\ -\ 42/tracyWeb
./scripts/start.sh
```

This script will:
1. Start PostgreSQL database (via Docker)
2. Apply database schema (if needed)
3. Seed initial data (categories and products)
4. Start backend server on port 3000
5. Start frontend server on port 8000

### Option 2: Manual Setup

#### Step 1: Setup PostgreSQL Database

**Using Docker:**

```bash
# Create and start PostgreSQL container
docker run -d \
  --name tracytalks-db \
  -e POSTGRES_PASSWORD=TracyPass666 \
  -e POSTGRES_DB=tracytalkshealth \
  -e POSTGRES_USER=tracyapp \
  -p 5433:5432 \
  postgres:14
```

**Using Local PostgreSQL:**

```bash
# Connect as postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE tracytalkshealth;
CREATE USER tracyapp WITH PASSWORD 'TracyPass666';
GRANT ALL PRIVILEGES ON DATABASE tracytalkshealth TO tracyapp;
\q
```

#### Step 2: Apply Database Schema

```bash
# Apply schema
PGPASSWORD=TracyPass666 psql -h localhost -p 5433 -U tracyapp -d tracytalkshealth < database/schema.sql
```

#### Step 3: Seed Database

```bash
cd backend

# Seed categories
npm run db:seed:categories

# Seed products
npm run db:seed:products

# Or run both
npm run db:seed
```

#### Step 4: Start Backend Server

```bash
cd backend

# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The backend will be available at `http://localhost:3000`

#### Step 5: Start Frontend Server

Open a new terminal:

```bash
cd public
python3 -m http.server 8000
```

The frontend will be available at `http://localhost:8000`

## Database Setup

### Database Configuration

- **Database Name**: `tracytalkshealth`
- **Host**: `localhost`
- **Port**: `5433` (Docker) or `5432` (local)
- **Username**: `tracyapp`
- **Password**: `TracyPass666`

### Connect to Database

```bash
# Using psql
PGPASSWORD=TracyPass666 psql -h localhost -p 5433 -U tracyapp -d tracytalkshealth

# Or with connection URL
psql postgresql://tracyapp:TracyPass666@localhost:5433/tracytalkshealth
```

### Database Management

```bash
# View all tables
\dt

# View table structure
\d users

# View data
SELECT * FROM users;

# Exit
\q
```

For more database operations, see [database/DATABASE.md](database/DATABASE.md)

## Project Structure

```
tracyWeb/
├── backend/                    # Backend Node.js application
│   ├── src/
│   │   ├── index.js           # Main server file
│   │   ├── config/            # Database and app config
│   │   ├── routes/            # API routes
│   │   ├── middleware/        # Auth, validation, etc.
│   │   ├── controllers/       # Business logic
│   │   └── utils/             # Utility functions
│   ├── migrations/            # Database seeds
│   ├── package.json
│   └── Dockerfile
├── public/                     # Frontend static files
│   ├── index.html             # Homepage
│   ├── shop.html              # Product catalog
│   ├── cart.html              # Shopping cart
│   ├── checkout.html          # Checkout page
│   ├── login.html             # Login page
│   ├── register.html          # Registration
│   ├── admin.html             # Admin dashboard
│   ├── orders.html            # Order history
│   ├── js/                    # JavaScript files
│   ├── css/                   # Stylesheets
│   └── images/                # Static images
├── database/
│   ├── schema.sql             # Database schema
│   └── DATABASE.md            # Database documentation
├── scripts/
│   ├── start.sh               # Start all services
│   ├── stop.sh                # Stop all services
│   └── promote-admin.sh       # Promote user to admin
├── .env                        # Environment variables
└── README.md                   # This file
```

## API Endpoints

### Interactive API Documentation

The application includes **Swagger/OpenAPI documentation** for all endpoints. Access the interactive API documentation at:

**http://localhost:3000/api-docs**

The Swagger UI provides:
- Complete list of all available endpoints
- Request/response schemas
- Authentication requirements
- Try-it-out functionality to test endpoints directly
- Request examples and response samples

You can also access the raw OpenAPI JSON specification at:
**http://localhost:3000/api-docs.json**

### Quick Reference

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/verify-email` - Verify email with OTP
- `POST /api/auth/forgot-password` - Request password reset

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `GET /api/categories` - Get all categories

### Cart
- `GET /api/cart` - Get user's cart
- `POST /api/cart/add` - Add item to cart
- `PUT /api/cart/update/:itemId` - Update cart item
- `DELETE /api/cart/remove/:itemId` - Remove from cart

### Orders
- `GET /api/orders` - Get user's orders
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get order details

### Checkout & Payment
- `POST /api/checkout` - Process checkout
- `POST /api/payment/create-intent` - Create payment intent
- `POST /api/webhooks/stripe` - Stripe webhook handler

### Admin (Requires Admin Role)
- `GET /api/admin/dashboard` - Dashboard stats
- `GET /api/admin/orders` - All orders
- `PUT /api/admin/orders/:id` - Update order status
- `POST /api/admin/products` - Create product
- `PUT /api/admin/products/:id` - Update product
- `DELETE /api/admin/products/:id` - Delete product

### Utilities
- `GET /health` - Health check
- `GET /api/config` - Public configuration
- `GET /api/csrf-token` - Get CSRF token

## Admin Panel

### Access Admin Panel

1. Navigate to `http://localhost:8000/admin.html`
2. Login with admin credentials

### Creating Your First Admin User

**Option 1: Using the promote script**

```bash
./scripts/promote-admin.sh
```

**Option 2: Manual SQL**

```bash
# First register as a normal user, then promote via SQL
PGPASSWORD=TracyPass666 psql -h localhost -p 5433 -U tracyapp -d tracytalkshealth

# Promote user to admin
UPDATE users SET role = 'admin' WHERE email = 'your_email@example.com';
```

### Admin Features

- View dashboard with sales analytics
- Manage products (create, edit, delete)
- Manage categories
- View and update orders
- Manage users
- View payment transactions

## Payment Gateways

### Stripe (International)

1. Get your API keys from [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Update [.env](.env):
   ```env
   PAYMENT_PROVIDER=stripe
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

### Areeba (Lebanon & Middle East)

1. Contact your bank (Bank Audi, BLOM Bank, BankMed) for credentials
2. Update [.env](.env):
   ```env
   PAYMENT_PROVIDER=areeba
   AREEBA_MERCHANT_ID=your_merchant_id
   AREEBA_API_PASSWORD=your_password
   ```

### Whish (Lebanon)

1. Get credentials from [Whish Merchant Portal](https://merchant.whish.money)
2. Update [.env](.env):
   ```env
   PAYMENT_PROVIDER=whish
   WHISH_MERCHANT_ID=your_merchant_id
   WHISH_API_KEY=your_api_key
   ```

### Cash on Delivery

```env
PAYMENT_PROVIDER=cash
```

## Troubleshooting

### Backend Won't Start

```bash
# Check logs
tail -f /tmp/backend.log

# Common issues:
# 1. Database not running
docker ps | grep tracytalks-db

# 2. Port already in use
lsof -i :3000

# 3. Missing environment variables
cat .env
```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Or for Docker
docker ps | grep tracytalks-db

# Test connection
PGPASSWORD=TracyPass666 psql -h localhost -p 5433 -U tracyapp -d tracytalkshealth -c "SELECT 1;"
```

### Frontend Not Loading

```bash
# Check if frontend server is running
lsof -i :8000

# Check logs
tail -f /tmp/frontend.log

# Restart frontend
pkill -f "python3.*http.server"
cd public
python3 -m http.server 8000
```

### CORS Errors

Make sure `FRONTEND_URL` in [.env](.env) matches your frontend URL:
```env
FRONTEND_URL=http://localhost:8000
```

### Payment Issues

1. Check payment provider configuration in [.env](.env)
2. Verify API keys are correct
3. Check webhook URLs (for Stripe)
4. Review payment logs in database:
   ```sql
   SELECT * FROM payments ORDER BY created_at DESC LIMIT 10;
   ```

### Stop All Services

```bash
./scripts/stop.sh
```

Or manually:
```bash
# Stop backend
pkill -f "node.*index.js"

# Stop frontend
pkill -f "python3.*http.server"

# Stop database (Docker)
docker stop tracytalks-db
```

## URLs After Starting

Once the application is running, you can access:

### Frontend
- **Homepage**: http://localhost:8000
- **Shop**: http://localhost:8000/shop.html
- **Cart**: http://localhost:8000/cart.html
- **Checkout**: http://localhost:8000/checkout.html
- **Login**: http://localhost:8000/login.html
- **Register**: http://localhost:8000/register.html
- **Orders**: http://localhost:8000/orders.html
- **Admin Panel**: http://localhost:8000/admin.html

### Backend API
- **API Documentation**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health
- **Products API**: http://localhost:3000/api/products
- **Categories API**: http://localhost:3000/api/categories
- **Config API**: http://localhost:3000/api/config

## Security Features

- Session-based authentication with PostgreSQL storage
- CSRF protection on all state-changing operations
- Helmet.js security headers
- Password hashing with bcrypt
- XSS protection with DOMPurify
- SQL injection prevention with parameterized queries
- Rate limiting
- Secure cookie configuration
- Input validation and sanitization

## Development

### Development Mode

```bash
cd backend
npm run dev
```

This runs the backend with `nodemon` for auto-reloading on file changes.

### Database Migrations

```bash
# Run migrations
cd backend
npm run db:setup

# Seed data
npm run db:seed
```

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production` in [.env](.env)
2. Use a process manager like PM2 for the backend
3. Set up SSL certificates
4. Configure secure cookie settings
5. Set up proper logging
6. Configure production database
7. Set up automated backups

## Support

For issues or questions:
- Check logs: `/tmp/backend.log` and `/tmp/frontend.log`
- Review database documentation: [database/DATABASE.md](database/DATABASE.md)
- Check environment variables in [.env](.env)

## License

Private project - All rights reserved

---

**Last Updated**: January 2026
**Version**: 0.1.0
