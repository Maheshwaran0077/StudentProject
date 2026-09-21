const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

// Configure Cloudinary
const isMock = process.env.CLOUDINARY_CLOUD_NAME === 'mock_cloudinary' || !process.env.CLOUDINARY_CLOUD_NAME;

if (!isMock) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  logger.info('Cloudinary configured successfully.');
} else {
  logger.warn('Cloudinary is running in MOCK mode. Uploaded files will be simulated with placeholder URLs.');
}

// Multer memory storage (never save to server disk)
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  const ext = path.extname(file.originalname).toLowerCase();
  const isValidExt = allowedExtensions.includes(ext);
  const isValidMime = allowedMimeTypes.includes(file.mimetype);

  if (isValidExt && isValidMime) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Only PDF, JPG, JPEG, PNG, DOC, and DOCX are allowed.', 400), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Cloudinary upload stream helper
const uploadToCloudinary = (fileBuffer, originalname) => {
  return new Promise((resolve, reject) => {
    if (isMock) {
      // Return a simulated URL based on the file type
      const ext = path.extname(originalname).toLowerCase();
      let url = 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg';
      if (ext === '.pdf') {
        url = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
      } else if (['.doc', '.docx'].includes(ext)) {
        url = 'https://calibre-ebook.com/downloads/demos/demo.docx';
      } else if (['.png', '.jpg', '.jpeg'].includes(ext)) {
        url = `https://picsum.photos/seed/${Math.random()}/600/400`;
      }
      return resolve({
        url,
        public_id: `mock_${Date.now()}`
      });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'college_communication',
        resource_type: 'auto',
        public_id: `${path.parse(originalname).name}_${Date.now()}`
      },
      (error, result) => {
        if (error) {
          logger.error(`Cloudinary Upload Error: ${error.message}`);
          return reject(new AppError('File upload to cloud storage failed', 500));
        }
        resolve(result);
      }
    );

    // Write file buffer to stream and end
    uploadStream.end(fileBuffer);
  });
};

module.exports = {
  upload,
  uploadToCloudinary
};
