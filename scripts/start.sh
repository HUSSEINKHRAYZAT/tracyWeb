#!/bin/bash

# Get the absolute path to the web directory
WEB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🚀 Starting Tracy Talks Health E-Commerce Platform"
echo "=================================================="
echo ""

# Check if PostgreSQL Docker container is running
if ! sudo docker ps | grep -q tracytalks-db; then
    echo "📦 Starting PostgreSQL database..."
    sudo docker start tracytalks-db 2>/dev/null || {
        echo "📦 Creating PostgreSQL database container..."
        sudo docker run -d \
            --name tracytalks-db \
            -e POSTGRES_PASSWORD=postgres \
            -e POSTGRES_DB=tracytalkshealth \
            -p 5432:5432 \
            postgres:14
        
        echo "⏳ Waiting for database to initialize..."
        sleep 10
        
        echo "📊 Applying database schema..."
        sudo docker exec -i tracytalks-db psql -U postgres -d tracytalkshealth < "$WEB_DIR/database/schema.sql"
        
        echo "📦 Seeding products..."
        cd "$WEB_DIR/backend"
        node migrations/seed-categories.js
        node migrations/migrate-products.js
    }
else
    echo "✅ PostgreSQL database already running"
fi

echo ""

# Kill any existing processes
echo "🧹 Stopping any existing servers..."
pkill -f "node.*index.js" 2>/dev/null
pkill -f "python3.*http.server" 2>/dev/null
sleep 1

# Start backend server
echo "🔧 Starting backend server on http://localhost:3000..."
cd "$WEB_DIR/backend"
node src/index.js > /tmp/backend.log 2>&1 &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Check if backend started successfully
if ps -p $BACKEND_PID > /dev/null; then
    echo "✅ Backend server running (PID: $BACKEND_PID)"
else
    echo "❌ Backend failed to start. Check /tmp/backend.log for errors"
    exit 1
fi

echo ""

# Start frontend server
echo "🌐 Starting frontend server on http://localhost:8000..."
cd "$WEB_DIR/public"
python3 -m http.server 8000 > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!

sleep 2

if ps -p $FRONTEND_PID > /dev/null; then
    echo "✅ Frontend server running (PID: $FRONTEND_PID)"
else
    echo "❌ Frontend failed to start. Check /tmp/frontend.log for errors"
    exit 1
fi

echo ""
echo "=================================================="
echo "✅ All services started successfully!"
echo "=================================================="
echo ""
echo "🌐 Frontend URLs:"
echo "   Main Site:  http://localhost:8000"
echo "   Shop:       http://localhost:8000/shop.html"
echo "   Login:      http://localhost:8000/login.html"
echo "   Register:   http://localhost:8000/register.html"
echo "   Admin:      http://localhost:8000/admin.html"
echo ""
echo "📡 Backend API:"
echo "   Base URL:   http://localhost:3000"
echo "   Health:     http://localhost:3000/health"
echo "   Products:   http://localhost:3000/api/products"
echo ""
echo "📝 Logs:"
echo "   Backend:    /tmp/backend.log"
echo "   Frontend:   /tmp/frontend.log"
echo ""
echo "🛑 To stop all services, run: ./stop.sh"
echo ""
