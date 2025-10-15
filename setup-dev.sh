#!/bin/bash

# IronEcho Development Setup Script
# This script sets up the development environment for IronEcho

set -e

echo "🚀 IronEcho Development Setup"
echo "============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node --version)"
        exit 1
    fi
    
    print_success "Node.js $(node --version) is installed"
}

# Check if npm is installed
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    print_success "npm $(npm --version) is installed"
}

# Install Expo CLI
install_expo_cli() {
    if command -v expo &> /dev/null; then
        print_success "Expo CLI is already installed"
        return
    fi
    
    print_status "Installing Expo CLI..."
    npm install -g @expo/cli
    print_success "Expo CLI installed"
}

# Install frontend dependencies
install_frontend_deps() {
    print_status "Installing frontend dependencies..."
    
    if [ ! -f package.json ]; then
        print_error "package.json not found. Are you in the correct directory?"
        exit 1
    fi
    
    npm install --legacy-peer-deps
    print_success "Frontend dependencies installed"
}

# Install backend dependencies
install_backend_deps() {
    print_status "Installing backend dependencies..."
    
    if [ ! -d backend ]; then
        print_error "Backend directory not found"
        exit 1
    fi
    
    cd backend
    npm install
    cd ..
    print_success "Backend dependencies installed"
}

# Setup environment files
setup_environment() {
    print_status "Setting up environment files..."
    
    # Backend environment
    if [ ! -f backend/.env ]; then
        print_status "Creating backend .env file..."
        cp backend/env.example backend/.env
        print_success "Backend .env file created"
        print_warning "Please update backend/.env with your settings"
    else
        print_success "Backend .env file already exists"
    fi
    
    # Frontend environment (if needed)
    if [ ! -f .env ]; then
        print_status "Creating frontend .env file..."
        cat > .env << EOF
# Frontend Environment Variables
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_WS_URL=http://localhost:3000
EOF
        print_success "Frontend .env file created"
    else
        print_success "Frontend .env file already exists"
    fi
}

# Check if MongoDB is running
check_mongodb() {
    print_status "Checking MongoDB connection..."
    
    if command -v mongosh &> /dev/null; then
        if mongosh --eval "db.runCommand('ping')" > /dev/null 2>&1; then
            print_success "MongoDB is running"
        else
            print_warning "MongoDB is not running. Please start MongoDB before running the backend."
        fi
    else
        print_warning "MongoDB client not found. Please install MongoDB or use Docker."
    fi
}

# Create development scripts
create_scripts() {
    print_status "Creating development scripts..."
    
    # Start backend script
    cat > start-backend.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting IronEcho Backend..."
cd backend
npm run dev
EOF
    
    # Start frontend script
    cat > start-frontend.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting IronEcho Frontend..."
npx expo start
EOF
    
    # Start both script
    cat > start-dev.sh << 'EOF'
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
EOF
    
    chmod +x start-backend.sh start-frontend.sh start-dev.sh
    print_success "Development scripts created"
}

# Show setup information
show_setup_info() {
    echo ""
    echo "🎉 IronEcho Development Setup Complete!"
    echo "======================================"
    echo ""
    echo "📁 Project Structure:"
    echo "   Frontend: React Native + Expo"
    echo "   Backend: Node.js + Express + MongoDB"
    echo ""
    echo "🚀 Quick Start Commands:"
    echo "   Start backend only: ./start-backend.sh"
    echo "   Start frontend only: ./start-frontend.sh"
    echo "   Start both: ./start-dev.sh"
    echo ""
    echo "📱 Frontend Development:"
    echo "   npx expo start          # Start Expo dev server"
    echo "   npx expo run:ios        # Run on iOS simulator"
    echo "   npx expo run:android    # Run on Android emulator"
    echo "   npx expo start --web    # Run on web browser"
    echo ""
    echo "🔧 Backend Development:"
    echo "   cd backend && npm run dev    # Start backend server"
    echo "   cd backend && npm test       # Run backend tests"
    echo ""
    echo "📊 API Endpoints:"
    echo "   Health Check: http://localhost:3000/health"
    echo "   API Base: http://localhost:3000/api"
    echo ""
    echo "🔧 Configuration:"
    echo "   Backend: backend/.env"
    echo "   Frontend: .env"
    echo ""
    echo "📚 Documentation:"
    echo "   README.md - Complete project documentation"
    echo "   Backend API: Check routes/ directory"
    echo ""
    echo "🐛 Troubleshooting:"
    echo "   - Make sure MongoDB is running"
    echo "   - Check environment variables"
    echo "   - Verify port 3000 is available"
    echo "   - Check logs for detailed error messages"
    echo ""
}

# Main setup function
main() {
    echo "Setting up IronEcho development environment..."
    echo ""
    
    check_node
    check_npm
    install_expo_cli
    install_frontend_deps
    install_backend_deps
    setup_environment
    check_mongodb
    create_scripts
    show_setup_info
    
    print_success "Development setup completed successfully!"
    print_warning "Don't forget to:"
    print_warning "1. Start MongoDB (or use Docker)"
    print_warning "2. Update environment variables"
    print_warning "3. Run ./start-dev.sh to start development"
}

# Run main function
main "$@"
