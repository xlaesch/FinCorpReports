const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;
const path = require('path');
const fs = require('fs');

// Middleware
app.use(express.json());

// Service token for authentication
const SERVICE_TOKEN = process.env.SERVICE_TOKEN || 'service-token-123';
// Directories allowed for downloads (mapped by top-level segment)
const REPORTS_DIR = process.env.REPORTS_DIR || '/app/reports';
const CONFIG_DIR = process.env.CONFIG_DIR || '/app/config';
const LOGS_DIR = process.env.LOGS_DIR || '/app/logs';

// Map the first path segment to an absolute base directory
const ALLOWED_DOWNLOAD_MAP = Object.freeze({
    reports: REPORTS_DIR,
    config: CONFIG_DIR,
    logs: LOGS_DIR,
});

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
            error: 'Missing "to" parameter'
        });
    }
    
    // VULNERABILITY: No URL validation - allows redirect to any domain
    // This is intentional for the CTF challenge
    res.redirect(302, targetUrl);
});

// Protected flag endpoint - requires valid service token
app.get('/api/flag', (req, res) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            error: 'Service token required',
            hint: 'Use Authorization: Bearer <token> header'
        });
    }
    
    const token = authHeader.substring(7);
    
    if (token !== SERVICE_TOKEN) {
        return res.status(403).json({ 
            error: 'Invalid service token'
        });
    }
    
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
        service: 'api'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'FinCorp Internal API'
    });
});

// Secure file download endpoint
// Contract:
// - Input: query param `path` starting with one of: reports/, config/, logs/
// - Output: initiates file download with Content-Disposition header
// - Errors: 400 on bad input, 404 on missing file, 500 on unexpected error
app.get('/api/download', (req, res) => {
    const relPath = req.query.path;
    if (!relPath || typeof relPath !== 'string') {
        return res.status(400).json({ error: 'Query parameter "path" is required' });
    }

    // Extract top-level segment to map to base dir
    const [segment, ...restParts] = relPath.split('/');
    const baseDir = ALLOWED_DOWNLOAD_MAP[segment];
    if (!baseDir) {
        return res.status(400).json({ error: 'Invalid path segment. Allowed: reports/, config/, logs/' });
    }

    // Build absolute path safely and prevent traversal
    const targetPath = path.resolve(baseDir, restParts.join('/'));
    if (!targetPath.startsWith(path.resolve(baseDir) + path.sep)) {
        return res.status(400).json({ error: 'Invalid path' });
    }

    try {
        if (!fs.existsSync(targetPath)) {
            return res.status(404).json({ error: 'File not found' });
        }
        const stat = fs.statSync(targetPath);
        if (!stat.isFile()) {
            return res.status(400).json({ error: 'Path is not a file' });
        }

        // Use Express helper to set appropriate headers and stream file
        return res.download(targetPath, path.basename(targetPath));
    } catch (err) {
        console.error('Download error:', err);
        return res.status(500).json({ error: 'Failed to download file' });
    }
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
});
