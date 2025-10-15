#!/bin/bash
echo "🚀 Starting IronEcho Development Environment..."

# Start backend in background
echo "Starting backend..."
cd backend && npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "Starting frontend..."
cd .. && npx expo start

# Cleanup on exit
trap "kill $BACKEND_PID" EXIT
