const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const { s3, bucketName } = require('../config/awsConfig');

// File filter for images only
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)!'));
    }
};

// Configure multer for S3 uploads
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: bucketName,
        metadata: function (req, file, cb) {
            cb(null, { 
                fieldName: file.fieldname,
                originalName: file.originalname
            });
        },
        key: function (req, file, cb) {
            const timestamp = Date.now();
            const randomString = Math.random().toString(36).substring(2, 15);
            const ext = path.extname(file.originalname);
            
            // Create folder structure: stocks/{year}/{month}/{filename}
            const date = new Date();
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const key = `stocks/${year}/${month}/${timestamp}-${randomString}${ext}`;
            
            cb(null, key);
        },
        contentType: multerS3.AUTO_CONTENT_TYPE
    }),
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit per file
        files: 10 // Max 10 files
    }
});

// Upload multiple images middleware
exports.uploadStockImages = (req, res, next) => {
    const uploadMiddleware = upload.array('images', 10);
    
    uploadMiddleware(req, res, function(err) {
        if (err instanceof multer.MulterError) {
            // Multer error (file size, file count, etc.)
            return res.status(400).json({
                status: false,
                message: `Upload error: ${err.message}`,
                field: err.field
            });
        } else if (err) {
            // File filter error or other errors
            return res.status(400).json({
                status: false,
                message: err.message
            });
        }
        
        // Files uploaded successfully
        next();
    });
};

// Single image upload middleware
exports.uploadSingleImage = (req, res, next) => {
    const uploadMiddleware = upload.single('image');
    
    uploadMiddleware(req, res, function(err) {
        if (err) {
            return res.status(400).json({
                status: false,
                message: err.message
            });
        }
        next();
    });
};

// Extract key from S3 URL
exports.extractS3Key = (url) => {
    if (!url) return null;
    
    try {
        const urlObj = new URL(url);
        return urlObj.pathname.substring(1); // Remove leading slash
    } catch (error) {
        // If it's already a key, return as is
        return url.includes('amazonaws.com/') ? url.split('.com/')[1] : null;
    }
};


// Validate file before upload
exports.validateFile = (file) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (file.size > maxSize) {
        return { valid: false, error: 'File size exceeds 10MB limit' };
    }
    
    if (!allowedTypes.includes(file.mimetype)) {
        return { valid: false, error: 'Invalid file type. Only images allowed' };
    }
    
    return { valid: true };
};