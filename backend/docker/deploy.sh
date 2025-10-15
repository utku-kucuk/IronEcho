#!/bin/bash

# IronEcho Pi 5 Deployment Script
# This script sets up the complete IronEcho backend on a Raspberry Pi 5

set -e

echo "🚀 IronEcho Pi 5 Deployment Script"
echo "=================================="

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

# Check if running on Raspberry Pi
check_pi() {
    if ! grep -q "Raspberry Pi" /proc/cpuinfo; then
        print_warning "This script is designed for Raspberry Pi. Continue anyway? (y/N)"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Update system packages
update_system() {
    print_status "Updating system packages..."
    sudo apt update && sudo apt upgrade -y
    print_success "System updated"
}

# Install Docker
install_docker() {
    if command -v docker &> /dev/null; then
        print_success "Docker is already installed"
        return
    fi

    print_status "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    print_success "Docker installed"
}

# Install Docker Compose
install_docker_compose() {
    if command -v docker-compose &> /dev/null; then
        print_success "Docker Compose is already installed"
        return
    fi

    print_status "Installing Docker Compose..."
    sudo apt-get install docker-compose-plugin -y
    print_success "Docker Compose installed"
}

# Install additional tools
install_tools() {
    print_status "Installing additional tools..."
    sudo apt install -y git curl wget ufw fail2ban
    print_success "Additional tools installed"
}

# Configure firewall
configure_firewall() {
    print_status "Configuring firewall..."
    sudo ufw --force enable
    sudo ufw allow ssh
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw allow 3000/tcp
    print_success "Firewall configured"
}

# Setup environment
setup_environment() {
    print_status "Setting up environment..."

    if [ ! -f .env ]; then
        print_status "Creating .env file..."
        cp env.example .env
        
        # Generate JWT secret
        JWT_SECRET=$(openssl rand -base64 32)
        sed -i "s/your-super-secret-jwt-key-change-this-in-production/$JWT_SECRET/" .env
        
        # Get local IP
        LOCAL_IP=$(hostname -I | awk '{print $1}')
        sed -i "s/192.168.1.100/$LOCAL_IP/" .env
        
        print_success "Environment file created"
        print_warning "Please review and update .env file with your settings"
    else
        print_success "Environment file already exists"
    fi
}

# Create SSL certificates (self-signed for development)
create_ssl_certificates() {
    print_status "Creating SSL certificates..."
    
    mkdir -p ssl
    
    if [ ! -f ssl/cert.pem ]; then
        openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
        print_success "SSL certificates created"
    else
        print_success "SSL certificates already exist"
    fi
}

# Deploy with Docker
deploy_application() {
    print_status "Deploying IronEcho application..."
    
    # Stop existing containers
    docker-compose down 2>/dev/null || true
    
    # Build and start containers
    docker-compose up -d --build
    
    print_success "Application deployed"
}

# Wait for services to be ready
wait_for_services() {
    print_status "Waiting for services to be ready..."
    
    # Wait for MongoDB
    print_status "Waiting for MongoDB..."
    timeout 60 bash -c 'until docker-compose exec -T mongodb mongosh --eval "db.runCommand(\"ping\")" > /dev/null 2>&1; do sleep 2; done'
    
    # Wait for API
    print_status "Waiting for API..."
    timeout 60 bash -c 'until curl -f http://localhost:3000/health > /dev/null 2>&1; do sleep 2; done'
    
    print_success "All services are ready"
}

# Show deployment information
show_deployment_info() {
    LOCAL_IP=$(hostname -I | awk '{print $1}')
    
    echo ""
    echo "🎉 IronEcho Deployment Complete!"
    echo "================================"
    echo ""
    echo "📱 Frontend Configuration:"
    echo "   Update API base URL in your React Native app:"
    echo "   http://$LOCAL_IP:3000/api"
    echo ""
    echo "🌐 Access URLs:"
    echo "   API Health Check: http://$LOCAL_IP:3000/health"
    echo "   API Documentation: http://$LOCAL_IP:3000/api"
    echo ""
    echo "🔧 Management Commands:"
    echo "   View logs: docker-compose logs -f"
    echo "   Stop services: docker-compose down"
    echo "   Restart services: docker-compose restart"
    echo "   Update application: git pull && docker-compose up -d --build"
    echo ""
    echo "📊 Monitoring:"
    echo "   Container status: docker-compose ps"
    echo "   Resource usage: docker stats"
    echo ""
    echo "🔒 Security Notes:"
    echo "   - Change default passwords in .env"
    echo "   - Set up proper SSL certificates for production"
    echo "   - Configure port forwarding for external access"
    echo "   - Set up automated backups"
    echo ""
}

# Main deployment function
main() {
    echo "Starting IronEcho deployment on Raspberry Pi 5..."
    echo ""
    
    check_pi
    update_system
    install_docker
    install_docker_compose
    install_tools
    configure_firewall
    setup_environment
    create_ssl_certificates
    deploy_application
    wait_for_services
    show_deployment_info
    
    print_success "Deployment completed successfully!"
    print_warning "Please log out and log back in to use Docker without sudo"
}

# Run main function
main "$@"
