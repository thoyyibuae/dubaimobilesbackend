const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

// Ensure upload directories exist
const createUploadDirs = () => {
  const dirs = [
    path.join(__dirname, '../../uploads/brands'),
    path.join(__dirname, '../../uploads/categories')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createUploadDirs();

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = '';
    
    if (req.baseUrl.includes('brands')) {
      uploadPath = path.join(__dirname, '../../uploads/brands');
    } else if (req.baseUrl.includes('categories')) {
      uploadPath = path.join(__dirname, '../../uploads/categories');
    } else {
      uploadPath = path.join(__dirname, '../../uploads');
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|svg|webp|ico/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

// Multer instance
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

module.exports = upload;