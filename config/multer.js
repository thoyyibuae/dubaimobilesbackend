// const multer = require('multer');
// const path = require('path');

// // Configure memory storage for multer
// const storage = multer.memoryStorage();

// // File filter
// const fileFilter = (req, file, cb) => {
//   // Accept images only
//   if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
//     return cb(new Error('Only image files are allowed!'), false);
//   }
//   cb(null, true);
// };

// // Configure multer
// const upload = multer({
//   storage: storage,
//   fileFilter: fileFilter,
//   limits: {
//     fileSize: 5 * 1024 * 1024 // 5MB limit
//   }
// });

// module.exports = upload;



const multer = require('multer');


// Use memory storage for S3 uploads
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

module.exports = upload;

