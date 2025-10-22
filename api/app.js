const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// Service token for authentication
const SERVICE_TOKEN = process.env.SERVICE_TOKEN || 'service-token-123';

// Middleware to check service token authentication
function requireServiceToken(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            error: 'Service token required',
            hint: 'Use Authorization: Bearer <token> header'
        });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (token !== SERVICE_TOKEN) {
        return res.status(403).json({ 
            error: 'Invalid service token',
            hint: 'Check your service token configuration'
        });
    }
    
    next();
}

// VULNERABLE: Redirect endpoint with no validation
app.get('/api/redirect', (req, res) => {
    const targetUrl = req.query.to;
    
    if (!targetUrl) {
        return res.status(400).json({ 
            error: 'Missing "to" parameter',
            example: '/api/redirect?to=https://example.org'
        });
    }
    
    // VULNERABILITY: No URL validation - allows redirect to any domain
    // This is intentional for the CTF challenge
    console.log(`Redirecting to: ${targetUrl}`);
    
    res.redirect(302, targetUrl);
});

// Protected flag endpoint
app.get('/api/flag', requireServiceToken, (req, res) => {
    const flag = process.env.FLAG2 || 'CTF{flag2-placeholder-service-token-leaked-via-redirect}';
    
    res.json({
        success: true,
        message: 'Congratulations! You have successfully exploited the node-fetch redirect vulnerability.',
        flag: flag,
        explanation: 'The admin API client forwarded the Authorization header to your external domain due to CVE-2022-0235 in node-fetch 2.6.6'
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'api',
        version: '1.0',
        endpoints: [
            'GET /api/redirect?to=<url>',
            'GET /api/flag (requires service token)',
            'GET /api/health'
        ]
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'FinCorp Internal API',
        version: '1.0',
        message: 'This is an internal API service',
        endpoints: {
            redirect: 'GET /api/redirect?to=<url>',
            flag: 'GET /api/flag (requires Authorization: Bearer <service_token>)',
            health: 'GET /api/health'
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found',
        available_endpoints: [
            'GET /api/redirect?to=<url>',
            'GET /api/flag',
            'GET /api/health'
        ]
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`API server running on port ${PORT}`);
    console.log(`Service Token configured: ${!!SERVICE_TOKEN}`);
    console.log(`Flag configured: ${!!process.env.FLAG2}`);
});
