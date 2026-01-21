#!/bin/bash

# Tracy Talks Health - Production Deployment Script
# Usage: ./deploy.sh

set -e

echo "🚀 Tracy Talks Health - Production Deployment"
echo "=============================================="

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ Error: .env.production not found"
    echo "📝 Copy .env.production.example to .env.production and configure it"
    exit 1
fi

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

echo "✅ Environment loaded"

# Check required variables
REQUIRED_VARS="POSTGRES_PASSWORD SESSION_SECRET DOMAIN"
for VAR in $REQUIRED_VARS; do
    if [ -z "${!VAR}" ]; then
        echo "❌ Error: $VAR is not set in .env.production"
        exit 1
    fi
done

echo "✅ Required variables validated"

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

# Build backend image
echo "🔧 Building backend image..."
docker-compose -f docker-compose.prod.yml build backend

# Start database first
echo "📦 Starting database..."
docker-compose -f docker-compose.prod.yml up -d postgres

# Wait for database to be ready
echo "⏳ Waiting for database..."
sleep 10

# Run database migrations (if needed)
echo "🗄️  Running database migrations..."
# docker-compose -f docker-compose.prod.yml exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -f /docker-entrypoint-initdb.d/schema.sql

# Start backend
echo "🚀 Starting backend..."
docker-compose -f docker-compose.prod.yml up -d backend

# Wait for backend to be ready
echo "⏳ Waiting for backend..."
sleep 15

# Setup SSL/TLS with Let's Encrypt (first time only)
if [ ! -d "./certbot/conf/live/$DOMAIN" ]; then
    echo "🔐 Setting up SSL/TLS certificates..."
    
    # Start nginx temporarily for HTTP challenge
    docker-compose -f docker-compose.prod.yml up -d nginx
    
    # Get certificate
    docker-compose -f docker-compose.prod.yml run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email $EMAIL_FOR_LETSENCRYPT \
        --agree-tos \
        --no-eff-email \
        -d $DOMAIN \
        -d www.$DOMAIN
    
    echo "✅ SSL/TLS certificates obtained"
else
    echo "✅ SSL/TLS certificates already exist"
fi

# Start all services
echo "🌐 Starting all services..."
docker-compose -f docker-compose.prod.yml up -d

# Show status
echo ""
echo "=============================================="
echo "✅ Deployment Complete!"
echo "=============================================="
echo ""
docker-compose -f docker-compose.prod.yml ps
echo ""
echo "🌐 Your site should be available at:"
echo "   https://$DOMAIN"
echo ""
echo "📊 Check logs with:"
echo "   docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo "🛑 Stop services with:"
echo "   docker-compose -f docker-compose.prod.yml down"
echo ""
