#!/bin/bash

# FinCorp CTF Challenge Test Script
# This script tests the basic functionality of the challenge

echo "🚀 FinCorp CTF Challenge Test Script"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local url=$1
    local expected_status=$2
    local description=$3
    
    echo -n "Testing $description... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (Status: $response)"
    else
        echo -e "${RED}✗ FAIL${NC} (Expected: $expected_status, Got: $response)"
    fi
}

echo ""
echo "📋 Testing Basic Endpoints:"
echo "-------------------------"

# Test web application
test_endpoint "http://localhost:8080" "200" "Home page"
test_endpoint "http://localhost:8080/reports" "200" "Reports page"
test_endpoint "http://localhost:8080/admin/login" "200" "Admin login page"
test_endpoint "http://localhost:8080/admin" "401" "Admin dashboard (unauthorized)"
test_endpoint "http://localhost:8080/healthz" "200" "Web health check"

echo ""
echo "🔧 Testing API Service:"
echo "---------------------"

# Test API service
test_endpoint "http://localhost:3001" "200" "API root"
test_endpoint "http://localhost:3001/api/health" "200" "API health check"
test_endpoint "http://localhost:3001/api/redirect?to=https://example.org" "302" "Redirect endpoint"
test_endpoint "http://localhost:3001/api/flag" "401" "Flag endpoint (unauthorized)"

echo ""
echo "🔍 Testing Vulnerabilities:"
echo "-------------------------"

# Test path traversal vulnerability
echo -n "Testing path traversal vulnerability... "
traversal_response=$(curl -s "http://localhost:8080/download?path=.env")
if echo "$traversal_response" | grep -q "WEB_JWT_SECRET"; then
    echo -e "${GREEN}✓ VULNERABLE${NC} (JWT secret exposed)"
else
    echo -e "${RED}✗ NOT VULNERABLE${NC} (JWT secret not found)"
fi

# Test node-fetch version
echo -n "Testing node-fetch version... "
web_container=$(docker ps --filter "name=web" --format "{{.Names}}" | head -1)
if [ ! -z "$web_container" ]; then
    node_fetch_version=$(docker exec "$web_container" npm list node-fetch 2>/dev/null | grep "node-fetch@" | cut -d'@' -f2)
    if [ "$node_fetch_version" = "2.6.6" ]; then
        echo -e "${GREEN}✓ VULNERABLE${NC} (node-fetch $node_fetch_version)"
    else
        echo -e "${RED}✗ NOT VULNERABLE${NC} (node-fetch $node_fetch_version)"
    fi
else
    echo -e "${YELLOW}⚠ SKIPPED${NC} (Web container not running)"
fi

echo ""
echo "📊 Summary:"
echo "----------"
echo "• Web application: http://localhost:8080"
echo "• API service: http://localhost:3001"
echo "• Admin login: http://localhost:8080/admin/login"
echo "• Test credentials: admin/admin123"
echo ""
echo "🎯 Challenge Stages:"
echo "1. Extract JWT secret: /download?path=.env"
echo "2. Forge admin JWT and access /admin"
echo "3. Use admin API client to exploit redirect vulnerability"
echo "4. Steal service token and call /api/flag"
echo ""
echo "Happy hacking! 🚀"
