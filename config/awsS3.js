const AWS = require('aws-sdk');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'ap-southeast-2'
});


const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'dubaimobiles';

class S3Service {
  constructor() {
    console.log(`S3 Service initialized for bucket: ${BUCKET_NAME}`);
  }

  // Check if bucket exists
  async checkBucketExists() {
    try {
      await s3.headBucket({ Bucket: BUCKET_NAME }).promise();
      console.log(`✅ Bucket exists: ${BUCKET_NAME}`);
      return true;
    } catch (error) {
      if (error.statusCode === 404) {
        console.log(`❌ Bucket does not exist: ${BUCKET_NAME}`);
        return false;
      } else if (error.statusCode === 403) {
        console.log(`❌ Access denied to bucket: ${BUCKET_NAME}`);
        console.log('Check your AWS credentials and permissions');
        return false;
      }
      throw error;
    }
  }

  // Create bucket if it doesn't exist (optional - like in user_model.js)
  async ensureBucketExists() {
    try {
      await s3.headBucket({ Bucket: BUCKET_NAME }).promise();
      console.log(`✅ Bucket already exists: ${BUCKET_NAME}`);
      return true;
    } catch (error) {
      if (error.statusCode === 404) {
        console.log(`Creating bucket: ${BUCKET_NAME}`);
        
        const params = {
          Bucket: BUCKET_NAME,
        };

        // For regions other than us-east-1, add LocationConstraint
        if (process.env.AWS_REGION && process.env.AWS_REGION !== 'us-east-1') {
          params.CreateBucketConfiguration = {
            LocationConstraint: process.env.AWS_REGION
          };
        }

        await s3.createBucket(params).promise();
        console.log(`✅ Bucket created successfully: ${BUCKET_NAME}`);
        
        // Set bucket policy for public read access (optional)
        await this.setBucketPolicy();
        
        return true;
      }
      throw error;
    }
  }

  // Set bucket policy for public read access (optional - similar to user model)
  async setBucketPolicy() {
    try {
      const bucketPolicy = {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'PublicReadGetObject',
            Effect: 'Allow',
            Principal: '*',
            Action: 's3:GetObject',
            Resource: `arn:aws:s3:::${BUCKET_NAME}/*`
          }
        ]
      };

      const params = {
        Bucket: BUCKET_NAME,
        Policy: JSON.stringify(bucketPolicy)
      };

      await s3.putBucketPolicy(params).promise();
      console.log(`✅ Public read policy set for bucket: ${BUCKET_NAME}`);
    } catch (error) {
      console.warn(`⚠ Could not set bucket policy (non-critical): ${error.message}`);
    }
  }

  // Upload file to S3 (consistent with user_model.js pattern)
  async uploadFile(file, subcategoryId = null) {
    try {
      let fileBuffer, contentType, originalName;
      
      // Handle different file input formats
      if (file.buffer) {
        // Handle multer file object
        fileBuffer = file.buffer;
        contentType = file.mimetype || 'application/octet-stream';
        originalName = file.originalname || 'file';
      } else if (file.base64) {
        // Handle base64 file (like in user model)
        const base64Data = file.base64.replace(/^data:image\/\w+;base64,/, '');
        fileBuffer = Buffer.from(base64Data, 'base64');
        contentType = file.type || 'image/jpeg';
        originalName = 'image.jpg';
      } else {
        throw new Error('Invalid file format');
      }

      // Determine file extension
      let fileExtension = 'jpg';
      if (originalName) {
        const parts = originalName.split('.');
        if (parts.length > 1) {
          const ext = parts.pop().toLowerCase();
          const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
          if (validExtensions.includes(ext)) {
            fileExtension = ext;
          }
        }
      } else if (contentType) {
        if (contentType.includes('jpeg') || contentType.includes('jpg')) {
          fileExtension = 'jpg';
        } else if (contentType.includes('png')) {
          fileExtension = 'png';
        } else if (contentType.includes('gif')) {
          fileExtension = 'gif';
        } else if (contentType.includes('webp')) {
          fileExtension = 'webp';
        }
      }

      // Generate unique filename with timestamp (like user model)
      const timestamp = Date.now();
      const randomId = uuidv4().split('-')[0]; // Take first part of UUID
      const uniqueFileName = `subcategory_${subcategoryId || 'temp'}_${timestamp}_${randomId}.${fileExtension}`;
      const s3Key = `subcategories/${uniqueFileName}`;
      
      console.log(`Uploading file to S3: ${s3Key}`);

      const params = {
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: contentType
        // Note: ACL is commented out in your user_model.js
        // ACL: 'public-read' // Uncomment if you need public access
      };

      const uploadResult = await s3.upload(params).promise();
      console.log(`✅ File uploaded successfully: ${uploadResult.Location}`);
      
      return {
        url: uploadResult.Location,
        key: uploadResult.Key,
        fileName: uniqueFileName
      };
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }

  // Upload base64 image (consistent with user_model.js pattern)
  async uploadBase64Image(base64String, subcategoryId = null, contentType = 'image/jpeg') {
    try {
      const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Determine file extension
      let fileExtension = 'jpg';
      if (contentType) {
        if (contentType.includes('jpeg') || contentType.includes('jpg')) {
          fileExtension = 'jpg';
        } else if (contentType.includes('png')) {
          fileExtension = 'png';
        } else if (contentType.includes('gif')) {
          fileExtension = 'gif';
        } else if (contentType.includes('webp')) {
          fileExtension = 'webp';
        }
      }
      
      // Generate unique filename (like user model)
      const timestamp = Date.now();
      const randomId = uuidv4().split('-')[0];
      const uniqueFileName = `subcategory_${subcategoryId || 'temp'}_${timestamp}_${randomId}.${fileExtension}`;
      const s3Key = `subcategories/${uniqueFileName}`;
      
      console.log(`Uploading base64 image to S3: ${s3Key}`);

      const params = {
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: buffer,
        ContentType: contentType
        // ACL: 'public-read' // Uncomment if you need public access
      };

      const uploadResult = await s3.upload(params).promise();
      console.log(`✅ Base64 image uploaded successfully: ${uploadResult.Location}`);
      
      return {
        url: uploadResult.Location,
        key: uploadResult.Key,
        fileName: uniqueFileName
      };
    } catch (error) {
      console.error('S3 base64 upload error:', error);
      throw new Error(`Failed to upload base64 image to S3: ${error.message}`);
    }
  }

  // Delete file from S3 (consistent with user_model.js pattern)
  async deleteFile(fileUrl) {
    try {
      if (!fileUrl || !fileUrl.includes('amazonaws.com')) {
        console.log('Invalid or non-S3 URL:', fileUrl);
        return true;
      }

      // Extract key from URL (same logic as user_model.js)
      const urlParts = fileUrl.split('.amazonaws.com/');
      if (urlParts.length < 2) {
        console.error('Invalid S3 URL format:', fileUrl);
        return false;
      }

      const bucketDomain = urlParts[0].replace('https://', '');
      const bucketName = bucketDomain.split('.')[0];
      const key = urlParts[1];
      
      console.log(`Extracted from URL - Bucket: ${bucketName}, Key: ${key}`);

      const params = {
        Bucket: bucketName,
        Key: key
      };

      console.log('Deleting from S3 with params:', params);
      await s3.deleteObject(params).promise();
      console.log(`✅ File deleted from S3: ${key}`);
      return true;
    } catch (error) {
      console.error('❌ S3 delete error:', error.message);
      console.error('Full error:', error);
      throw new Error(`Failed to delete file from S3: ${error.message}`);
    }
  }

  // Extract key from S3 URL (updated to match user_model.js logic)
  extractKeyFromUrl(url) {
    if (!url) return null;
    
    try {
      // If it's already a key (not a full URL)
      if (!url.includes('://')) {
        return url;
      }
      
      const urlObj = new URL(url);
      
      // For S3 URLs with bucket in subdomain
      if (urlObj.hostname.includes('.s3.')) {
        // Format: https://bucket-name.s3.region.amazonaws.com/key
        return urlObj.pathname.substring(1); // Remove leading slash
      }
      
      // For S3 URLs with bucket in path
      if (urlObj.hostname.includes('s3.amazonaws.com')) {
        // Format: https://s3.amazonaws.com/bucket-name/key
        const pathParts = urlObj.pathname.substring(1).split('/');
        if (pathParts.length > 1) {
          // Remove bucket name from path
          return pathParts.slice(1).join('/');
        }
      }
      
      // Fallback: return the path after domain
      return urlObj.pathname.substring(1);
      
    } catch (error) {
      console.error('Error extracting key from URL:', error);
      
      // Try simple extraction for common patterns
      if (url.includes('amazonaws.com/')) {
        const parts = url.split('amazonaws.com/');
        if (parts.length > 1) {
          return parts[1];
        }
      }
      
      return url;
    }
  }

  // Additional helper methods for consistency

  // Upload multiple files (if needed for future)
  async uploadMultipleFiles(files, prefix = '', folder = '') {
    if (!files || !Array.isArray(files) || files.length === 0) {
      return [];
    }

    const uploadPromises = files.map(async (file, index) => {
      try {
        const result = await this.uploadFile(file, `${prefix}_${index}`);
        return result.url;
      } catch (error) {
        console.error(`Failed to upload file ${index + 1}:`, error);
        return null;
      }
    });

    const uploadedUrls = await Promise.all(uploadPromises);
    return uploadedUrls.filter(url => url !== null);
  }

  // Validate S3 URL
  isValidS3Url(url) {
    if (!url) return false;
    return (
      url.includes('amazonaws.com') ||
      url.startsWith('https://s3.') ||
      url.includes('.s3.')
    );
  }

  // Get file info from URL
  getFileInfoFromUrl(url) {
    if (!this.isValidS3Url(url)) return null;
    
    try {
      const key = this.extractKeyFromUrl(url);
      const urlObj = new URL(url);
      const bucket = urlObj.hostname.split('.')[0];
      
      return {
        url: url,
        key: key,
        bucket: bucket,
        filename: key.split('/').pop(),
        folder: key.split('/').slice(0, -1).join('/')
      };
    } catch (error) {
      console.error('Error getting file info:', error);
      return null;
    }
  }
}

module.exports = new S3Service();

