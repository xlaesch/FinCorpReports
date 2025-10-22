const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const fetch = require('node-fetch');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));

// JWT secret from .env file
const JWT_SECRET = process.env.WEB_JWT_SECRET || 'fallback-secret-key';
const SERVICE_TOKEN = process.env.SERVICE_TOKEN || 'service-token-123';

// Middleware to check admin authentication
function requireAdmin(req, res, next) {
    const token = req.cookies?.admin_token;
    
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/reports', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'reports.html'));
});

// VULNERABLE: Path traversal in download endpoint
app.get('/download', (req, res) => {
    const filePath = req.query.path;
    
    if (!filePath) {
        return res.status(400).json({ error: 'Path parameter required' });
    }
    
    // VULNERABILITY: No path validation - allows directory traversal
    const fullPath = path.join(__dirname, filePath);
    
    try {
        // Check if file exists
        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ error: 'File not found' });
        }
        
        // Check if it's a file (not directory)
        if (!fs.statSync(fullPath).isFile()) {
            return res.status(400).json({ error: 'Path is not a file' });
        }
        
        // VULNERABLE: Read and send file contents (allows reading sensitive files)
        const content = fs.readFileSync(fullPath, 'utf8');
        res.type('text/plain').send(content);
    } catch (error) {
        res.status(500).json({ error: 'Something went wrong!' });
    }
});

// Admin login endpoint (for testing purposes)
app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    
    // Simple hardcoded admin credentials for testing
    if (username === 'admin' && password === 'admin123') {
        const token = jwt.sign(
            { uid: 1, role: 'admin', username: 'admin' },
            JWT_SECRET,
            { expiresIn: '1h' }
        );
        
        res.cookie('admin_token', token, { httpOnly: true });
        res.json({ success: true, message: 'Login successful' });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Admin login page
app.get('/admin/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Admin dashboard
app.get('/admin', requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Admin flag endpoint (FLAG1)
app.get('/api/admin-flag', requireAdmin, (req, res) => {
    const flag1 = process.env.FLAG1 || 'CTF{admin-access-gained-via-jwt-secret-extraction}';
    
    res.json({
        success: true,
        message: 'Congratulations! You have successfully gained admin access.',
        flag: flag1,
        explanation: 'You extracted the JWT secret from the .env file using path traversal and forged an admin token.'
    });
});

// Admin API client endpoint - VULNERABLE to CVE-2022-0235
app.post('/api/admin-request', requireAdmin, async (req, res) => {
    const { method, path: apiPath, body } = req.body;
    
    if (!apiPath) {
        return res.status(400).json({ error: 'API path required' });
    }
    
    try {
        // VULNERABILITY: Using vulnerable node-fetch version that forwards headers on redirect
        const fetchOptions = {
            method: method || 'GET',
            headers: {
                'Authorization': `Bearer ${SERVICE_TOKEN}`,
                'Content-Type': 'application/json',
                'User-Agent': 'FinCorp-Admin-Client/1.0'
            },
            redirect: 'follow' // This enables the vulnerability
        };
        
        if (body && (method === 'POST' || method === 'PUT')) {
            fetchOptions.body = body;
        }
        
        // Make request to internal API
        const apiUrl = `http://api:3001${apiPath}`;
        const response = await fetch(apiUrl, fetchOptions);
        
        const responseBody = await response.text();
        const responseHeaders = {};
        
        // Extract response headers
        response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
        });
        
        res.json({
            status: response.status,
            headers: responseHeaders,
            body: responseBody
        });
        
    } catch (error) {
        console.error('API request error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Health check endpoint
app.get('/healthz', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'web',
        version: '1.4',
        env_loaded: !!process.env.WEB_JWT_SECRET
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Web server running on port ${PORT}`);
    console.log(`JWT Secret loaded: ${!!JWT_SECRET}`);
    console.log(`Service Token loaded: ${!!SERVICE_TOKEN}`);
});
