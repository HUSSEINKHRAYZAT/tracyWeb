#!/bin/bash

echo "🛑 Stopping Tracy Talks Health E-Commerce Platform"
echo "=================================================="
echo ""

# Stop Node.js backend
echo "Stopping backend server..."
pkill -f "node.*index.js"
sleep 1

# Stop Python frontend
echo "Stopping frontend server..."
pkill -f "python3.*http.server"
sleep 1

# Stop PostgreSQL container (optional - comment out if you want to keep it running)
# echo "Stopping PostgreSQL database..."
# sudo docker stop tracytalks-db

echo ""
echo "✅ All services stopped"
echo ""
