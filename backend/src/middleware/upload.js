const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs').promises;

// Ensure uploads directory exists
// Path from backend/src/middleware to web/public/uploads/products
const uploadsDir = path.join(__dirname, '../../../public/uploads/products');
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

// Configure storage
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            await fs.mkdir(uploadsDir, { recursive: true });
            cb(null, uploadsDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueSuffix = crypto.randomBytes(8).toString('hex');
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext)
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .substring(0, 30);
        cb(null, `${name}-${uniqueSuffix}${ext}`);
    }
});

// File filter - only allow images
const fileFilter = (req, file, cb) => {
    const allowedMimes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/avif',
        'image/svg+xml'
    ];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WEBP, AVIF, and SVG images are allowed.'), false);
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max file size
    }
});

// Middleware for single product image
const uploadProductImage = upload.single('image');

// Middleware for multiple product images
const uploadProductImages = upload.array('images', 5); // Max 5 images

// Helper function to delete old image file
async function deleteImageFile(imageUrl) {
    try {
        if (!imageUrl || !imageUrl.startsWith('uploads/')) {
            return; // Don't delete if not an uploaded file
        }
        
        const filePath = path.join(__dirname, '../../public', imageUrl);
        await fs.unlink(filePath);
        console.log('Deleted old image:', imageUrl);
    } catch (error) {
        console.error('Failed to delete image file:', error.message);
        // Don't throw - it's okay if file doesn't exist
    }
}

module.exports = {
    uploadProductImage,
    uploadProductImages,
    deleteImageFile
};
