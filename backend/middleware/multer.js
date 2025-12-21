const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Use disk storage for large files to avoid memory issues
// This streams files directly to disk instead of loading into memory
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        try {
            // Get businessId from user (set by auth middleware)
            // If not available, use 'temp' as fallback
            const businessId = req.user?.businessId || 'temp';
            const uploadDir = path.join(__dirname, '../public/uploads/temp', businessId);
            
            // Create directory if it doesn't exist
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: function (req, file, cb) {
        try {
            // Generate unique filename with timestamp and random number
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname);
            cb(null, file.fieldname + '-' + uniqueSuffix + ext);
        } catch (error) {
            cb(error);
        }
    }
});

// File filter to check file types
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/mpeg',
        'video/quicktime',
        'video/x-msvideo',
        'video/webm',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        const err = new Error(`File type '${file.mimetype}' is not allowed. Supported types: images (JPEG, PNG, GIF, WebP), videos (MP4, MPEG, QuickTime, AVI, WebM), documents (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, CSV, TXT)`);
        err.code = 'LIMIT_FILE_TYPES';
        cb(err, false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB - increased for video files
    }
});

module.exports = upload;