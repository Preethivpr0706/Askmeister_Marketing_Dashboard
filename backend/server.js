// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { authenticate } = require('./middleware/auth');
const { testConnection } = require('./config/database');
const templateRoutes = require('./routes/templateRoutes');
const contactRoutes = require('./routes/contactRoutes');
const messageRoutes = require('./routes/messageRoutes');
const businessRoutes = require('./routes/businessRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const authRoutes = require('./routes/authRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const redirectRoutes = require('./routes/redirectRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const Message = require('./controllers/messageController');
const SchedulerService = require('./services/schedulerService');
const WSServer = require('./webSocket/wsSocket');
const fileRoutes = require('./routes/fileRoutes');
const quickReplyRoutes = require('./routes/quickReplyRoutes');
const autoReplyRoutes = require('./routes/autoReplyRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');
const flowRoutes = require('./routes/flowRoutes');
const adminRoutes = require('./routes/adminRoutes');
const ChatHistoryScheduler = require('./services/ChatHistoryScheduler');

require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ?
        process.env.FRONTEND_URL : ['http://localhost:3000', 'http://localhost:5173', 'https://askmeister-marketing-dashboard.onrender.com', 'https://askmeister.com/marketing/', 'https://askmeister.com/marketing'],
    credentials: true
}));
// Increase body parser limits for large file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Test database connection
testConnection();

// Create HTTP server first
const server = http.createServer(app);

// Increase server timeout for large file uploads (10 minutes)
server.timeout = 600000; // 10 minutes
server.keepAliveTimeout = 600000; // 10 minutes
server.headersTimeout = 600000; // 10 minutes

// Create WebSocket server and make it available to routes
const wss = new WSServer(server);
app.set('wss', wss);

// Add WebSocket instance to all requests for controllers to use
app.use((req, res, next) => {
    req.wss = wss;
    next();
});

app.use('/api/', (req, res, next) => {
    console.log('Route hit:', req.method, req.url);
    console.log('Full path:', req.originalUrl);
    console.log('Auth header:', req.headers.authorization ? 'Present' : 'Missing');
    next();
})

// Routes
app.use('/api/templates', authenticate, templateRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/contacts', authenticate, contactRoutes);
app.use('/api/messages/', messageRoutes);
app.use('/api/campaigns', authenticate, campaignRoutes);
app.use('/api/business', authenticate, businessRoutes);
app.use('/api/redirect', redirectRoutes);
app.use('/api/dashboard', authenticate, dashboardRoutes);
app.use('/api/conversations', authenticate, conversationRoutes);
app.use('/api/files', authenticate, fileRoutes);
app.use('/api/quick-replies', authenticate, quickReplyRoutes);
app.use('/api/auto-replies', authenticate, autoReplyRoutes);
// In server.js, add this BEFORE the chatbot routes line
app.use('/api/chatbot', (req, res, next) => {
    console.log('Chatbot route hit:', req.method, req.url);
    console.log('Full path:', req.originalUrl);
    console.log('Auth header:', req.headers.authorization ? 'Present' : 'Missing');
    next();
});

app.use('/api/chatbot', authenticate, chatbotRoutes);
app.use('/api/flows', (req, res, next) => {
    console.log('Flows route hit:', req.method, req.url);
    console.log('Full path:', req.originalUrl);
    console.log('Auth header:', req.headers.authorization ? 'Present' : 'Missing');
    next();
})
app.use('/api/flows', authenticate, flowRoutes);
app.use('/api/admin', adminRoutes);


// Scheduled tasks
setInterval(async() => {
    try {
        await Message.checkStalledMessages();
    } catch (error) {
        console.error('Error checking stalled messages:', error);
    }
}, 15 * 60 * 1000); // Check every 15 minutes

setInterval(() => {
    SchedulerService.processScheduledCampaigns();
}, 60000);

// Start Chat History Scheduler
ChatHistoryScheduler.start();

// Static files
app.use('/uploads', express.static(
    path.join(__dirname, 'public/uploads'), {
        maxAge: '1y',
        setHeaders: (res) => {
            res.set('Cache-Control', 'public, max-age=31536000');
        }
    }
));

// Test route
app.get('/check-uploads', (req, res) => {
    const testPath = path.join(__dirname, 'public/uploads/business-profile');
    const exists = fs.existsSync(testPath);

    res.json({
        uploadsDirectoryExists: exists,
        absolutePath: testPath,
        canWrite: exists ? fs.accessSync(testPath, fs.constants.W_OK) : false
    });
});

// WebSocket status route
app.get('/api/websocket/status', (req, res) => {
    res.json({
        connected: true,
        connectedBusinesses: wss.getConnectedBusinesses(),
        totalConnections: wss.getConnectedBusinesses().reduce((total, businessId) => {
            return total + wss.getConnectionCount(businessId);
        }, 0)
    });
});

// Root route
app.get('/', (req, res) => {
    res.send('WhatsApp Templates API is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            success: false,
            message: 'File size too large (max 50MB)'
        });
    }

    if (err.code === 'LIMIT_FILE_TYPES') {
        return res.status(415).json({
            success: false,
            message: 'Invalid file type. Supported types: images (JPEG, PNG, GIF, WebP), videos (MP4, MPEG, QuickTime, AVI, WebM), documents (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, CSV, TXT)'
        });
    }

    // Handle connection reset errors
    if (err.code === 'ECONNRESET' || err.code === 'EPIPE') {
        console.error('Connection reset during request:', req.url);
        if (!res.headersSent) {
            return res.status(408).json({
                success: false,
                message: 'Connection timeout. The file may be too large. Please try a smaller file or check your connection.'
            });
        }
        return;
    }

    console.error('Error:', err.stack);
    if (!res.headersSent) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        });
    }
});

// 404 handler
app.use((req, res, next) => {
    console.log('404 - Route not found:', req.originalUrl);
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});
const requiredDirs = [
    path.join(__dirname, 'public/uploads'),
    path.join(__dirname, 'public/uploads/temp')
];

requiredDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});
// Start server with WebSocket support
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`WebSocket server is ready at ws://localhost:${PORT}/ws`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = { app, wss };