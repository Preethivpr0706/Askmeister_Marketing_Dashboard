const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const FileService = require('../services/FileService');
const upload = require('../middleware/multer');

// Multer error handling middleware
const handleMulterError = (err, req, res, next) => {
    if (err) {
        console.error('Multer error:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                success: false,
                message: 'File size too large (max 50MB)'
            });
        }
        if (err.code === 'LIMIT_FILE_TYPES') {
            return res.status(415).json({
                success: false,
                message: err.message || 'Invalid file type'
            });
        }
        if (err.code === 'ECONNRESET' || err.code === 'EPIPE') {
            return res.status(408).json({
                success: false,
                message: 'Connection was reset during upload. Please try again.'
            });
        }
        return res.status(400).json({
            success: false,
            message: err.message || 'File upload error'
        });
    }
    next();
};

// Upload file endpoint
router.post('/upload', authenticate, (req, res, next) => {
    // Set longer timeout for file uploads
    req.setTimeout(600000); // 10 minutes
    res.setTimeout(600000); // 10 minutes
    
    // Enable keep-alive for long uploads
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Keep-Alive', 'timeout=600');
    
    // Handle connection errors
    req.on('error', (err) => {
        console.error('Request error during upload:', err.code, err.message);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Upload connection error: ' + err.message
            });
        }
    });
    
    res.on('error', (err) => {
        console.error('Response error during upload:', err.code, err.message);
    });
    
    res.on('close', () => {
        console.log('Response closed during upload - headers sent:', res.headersSent);
    });
    
    req.on('close', () => {
        console.log('Request closed by client during upload');
    });
    
    req.on('aborted', () => {
        console.log('Request aborted by client');
    });
    
    next();
}, upload.single('file'), handleMulterError, async(req, res) => {
    try {
        // Handle multer errors
        if (req.fileValidationError) {
            return res.status(400).json({ 
                success: false, 
                message: req.fileValidationError 
            });
        }

        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                message: 'No file uploaded. Please select a file.' 
            });
        }

        console.log(`Uploading file: ${req.file.originalname}, size: ${req.file.size} bytes, type: ${req.file.mimetype}`);
        console.log(`File path: ${req.file.path || 'in memory'}`);
        console.log(`Request connection state: ${req.socket.readyState}`);

        // Process file upload asynchronously to avoid blocking
        try {
            const result = await FileService.uploadFile(
                req.user.id,
                req.user.businessId,
                req.file
            );

            console.log(`File uploaded successfully: ${result.id}`);
            
            // Check if response is still writable
            if (res.headersSent) {
                console.warn('Response already sent, cannot send success response');
                return;
            }
            
            if (res.writableEnded) {
                console.warn('Response already ended');
                return;
            }
            
            res.json({ success: true, data: result });
        } catch (uploadError) {
            console.error('Error in FileService.uploadFile:', uploadError);
            
            // Clean up temp file if it exists
            if (req.file && req.file.path) {
                try {
                    const fs = require('fs');
                    if (fs.existsSync(req.file.path)) {
                        await fs.promises.unlink(req.file.path);
                        console.log(`Cleaned up temp file: ${req.file.path}`);
                    }
                } catch (cleanupError) {
                    console.error('Error cleaning up temp file:', cleanupError);
                }
            }
            
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    message: uploadError.message || 'Failed to process uploaded file'
                });
            }
        }
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to upload file'
        });
    }
});

// Send file as message
router.post('/conversations/:id/send-file', authenticate, async(req, res) => {
    try {
        const { fileId, caption } = req.body;

        if (!fileId) {
            return res.status(400).json({ success: false, message: 'File ID is required' });
        }

        const message = await FileService.sendFileMessage(
            req.params.id,
            fileId,
            caption,
            req.user.id,
            req.app.get('wss')
        );

        res.json({ success: true, data: message });
    } catch (error) {
        console.error('Error sending file message:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to send file message'
        });
    }
});

// Get file info
router.get('/:id', authenticate, async(req, res) => {
    try {
        const { filePath, file } = await FileService.getFileById(
            req.params.id,
            req.user.business_id
        );

        res.json({ success: true, data: file });
    } catch (error) {
        console.error('Error getting file:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get file'
        });
    }
});

module.exports = router;