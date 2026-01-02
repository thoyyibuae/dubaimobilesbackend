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


async uploadCategoryFile(file, categoryId = null) {
  try {
    const fs = require('fs');
    
const path = require('path');
    console.log("=== UPLOAD CATEGORY FILE DEBUG ===");
    console.log("File object received:", {
      hasBuffer: !!file?.buffer,
      hasPath: !!file?.path,
      fieldname: file?.fieldname,
      originalname: file?.originalname,
      mimetype: file?.mimetype,
      size: file?.size
    });

    let fileBuffer, contentType, originalName;
    
    // 1. First check if file has a path (disk storage)
    if (file && file.path && fs.existsSync(file.path)) {
      console.log("📁 Reading file from disk path:", file.path);
      fileBuffer = fs.readFileSync(file.path);
      contentType = file.mimetype || 'application/octet-stream';
      originalName = file.originalname || path.basename(file.path);
    }
    // 2. Check if file has buffer (memory storage)
    else if (file && file.buffer) {
      console.log("📁 Reading file from buffer");
      fileBuffer = file.buffer;
      contentType = file.mimetype || 'application/octet-stream';
      originalName = file.originalname || 'file';
    }
    // 3. Handle multer file object without buffer/path (edge case)
    else if (file && file.fieldname) {
      console.log("📁 File has fieldname but no buffer/path");
      // This shouldn't happen, but handle gracefully
      throw new Error('Invalid file object. File has no buffer or path.');
    }
    // 4. Handle base64 file
    else if (file && file.base64) {
      console.log("📁 Reading file from base64");
      const base64Data = file.base64.replace(/^data:image\/\w+;base64,/, '');
      fileBuffer = Buffer.from(base64Data, 'base64');
      contentType = file.type || 'image/jpeg';
      originalName = 'image.jpg';
    }
    else {
      console.log("❌ Invalid file format. File object:", file);
      throw new Error('Invalid file format. Expected file object with path, buffer, or base64.');
    }

    console.log("📊 File info extracted:", {
      bufferLength: fileBuffer?.length || 0,
      contentType,
      originalName
    });

    // Determine file extension
    let fileExtension = 'jpg';
    if (originalName) {
      const ext = path.extname(originalName).toLowerCase().replace('.', '');
      const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
      if (validExtensions.includes(ext)) {
        fileExtension = ext;
      } else if (ext) {
        console.log(`⚠️ Unusual extension: ${ext}, defaulting to jpg`);
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

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const randomId = uuidv4().split('-')[0];
    const uniqueFileName = `category_${categoryId || 'temp'}_${timestamp}_${randomId}.${fileExtension}`;
    const s3Key = `categories/${uniqueFileName}`;
    
    console.log(`📤 Uploading to S3: ${s3Key}`);
    console.log(`📊 File size: ${fileBuffer.length} bytes`);
    console.log(`📄 Content type: ${contentType}`);

    const params = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: contentType
      // ACL: 'public-read' // Uncomment if you need public access
    };

    const uploadResult = await s3.upload(params).promise();
    console.log(`✅ File uploaded successfully to: ${uploadResult.Location}`);
    
    // Clean up: Delete local file after upload if it exists
    if (file && file.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
        console.log(`🧹 Cleaned up local file: ${file.path}`);
      } catch (cleanupError) {
        console.warn('⚠ Could not delete local file:', cleanupError.message);
      }
    }
    
    return {
      url: uploadResult.Location,
      key: uploadResult.Key,
      fileName: uniqueFileName
    };
  } catch (error) {
    console.error('❌ S3 uploadCategoryFile error:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    throw new Error(`Failed to upload category file to S3: ${error.message}`);
  }
}

async uploadCategoryBase64Image(base64String, categoryId = null, contentType = 'image/jpeg') {
  try {
    console.log("📤 Uploading base64 image for category:", categoryId);
    
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
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomId = uuidv4().split('-')[0];
    const uniqueFileName = `category_${categoryId || 'temp'}_${timestamp}_${randomId}.${fileExtension}`;
    const s3Key = `categories/${uniqueFileName}`;
    
    console.log(`📤 Uploading base64 image to S3: ${s3Key}, Size: ${buffer.length} bytes`);

    const params = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: buffer,
      ContentType: contentType
      // ACL: 'public-read' // Uncomment if you need public access
    };

    const uploadResult = await s3.upload(params).promise();
    console.log(`✅ Base64 category image uploaded successfully: ${uploadResult.Location}`);
    
    return {
      url: uploadResult.Location,
      key: uploadResult.Key,
      fileName: uniqueFileName
    };
  } catch (error) {
    console.error('❌ S3 uploadCategoryBase64Image error:', error);
    throw new Error(`Failed to upload base64 category image to S3: ${error.message}`);
  }
}



  



async uploadBrandFile(file, brandId = null) {
  try {
    console.log("=== S3 UPLOAD DEBUG ===");
    console.log("Received file object:", {
      type: typeof file,
      isObject: typeof file === 'object',
      keys: Object.keys(file || {}),
      path: file?.path,
      bufferExists: file?.buffer ? `Buffer length: ${file.buffer.length}` : 'No buffer',
      mimetype: file?.mimetype,
      originalname: file?.originalname
    });
    
    let fileBuffer, contentType, originalName;
    const fs = require('fs'); // Add this at the top
    
    // Check if file has a path property (saved to disk)
    if (file && file.path && fs.existsSync(file.path)) {
      console.log("Reading file from disk path:", file.path);
      fileBuffer = fs.readFileSync(file.path);
      contentType = file.mimetype || 'application/octet-stream';
      originalName = file.originalname || path.basename(file.path);
    }
    // Check if file is a Buffer directly
    else if (file instanceof Buffer) {
      console.log("File is a Buffer directly");
      fileBuffer = file;
      contentType = 'application/octet-stream';
      originalName = 'file.bin';
    }
    // Handle multer file object with buffer
    else if (file && file.buffer && Buffer.isBuffer(file.buffer)) {
      console.log("File has buffer property");
      fileBuffer = file.buffer;
      contentType = file.mimetype || 'application/octet-stream';
      originalName = file.originalname || 'file';
    }
    // Handle file with data property (alternative format)
    else if (file && file.data && Buffer.isBuffer(file.data)) {
      console.log("File has data property");
      fileBuffer = file.data;
      contentType = file.mimetype || file.type || 'application/octet-stream';
      originalName = file.name || file.originalname || 'file';
    }
    // Handle base64 file
    else if (file && file.base64) {
      console.log("File has base64 property");
      const base64Data = file.base64.replace(/^data:image\/\w+;base64,/, '');
      fileBuffer = Buffer.from(base64Data, 'base64');
      contentType = file.type || 'image/jpeg';
      originalName = 'image.jpg';
    }
    else {
      console.log("Invalid file format received:", file);
      throw new Error('Invalid file format. Expected: file object with path, buffer, or base64 string');
    }
    
    console.log("File processing complete:", {
      bufferLength: fileBuffer.length,
      contentType,
      originalName
    });

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

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = uuidv4().split('-')[0];
    const uniqueFileName = `brands_${brandId || 'temp'}_${timestamp}_${randomId}.${fileExtension}`;
    const s3Key = `brands/${uniqueFileName}`;
    
    console.log(`Uploading to S3: ${s3Key}, Content-Type: ${contentType}`);

    const params = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: contentType
    };

    console.log("S3 upload params prepared");
    const uploadResult = await s3.upload(params).promise();
    console.log(`✅ File uploaded successfully: ${uploadResult.Location}`);
    
    // Clean up: Delete local file after upload if it exists
    if (file && file.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
        console.log(`Cleaned up local file: ${file.path}`);
      } catch (cleanupError) {
        console.warn('Could not delete local file:', cleanupError.message);
      }
    }
    
    return {
      url: uploadResult.Location,
      key: uploadResult.Key,
      fileName: uniqueFileName
    };
  } catch (error) {
    console.error('S3 upload error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode
    });
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
}


  async uploadCategoryBase64Image(base64String, categoryId = null, contentType = 'image/jpeg') {
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
      const uniqueFileName = `category_${subcategoryId || 'temp'}_${timestamp}_${randomId}.${fileExtension}`;
      const s3Key = `categories/${uniqueFileName}`;
      
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



  // Upload base64 image (consistent with user_model.js pattern)
  async uploadBrandBase64Image(base64String, brandId = null, contentType = 'image/jpeg') {
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
      
      // Generate unique filename
      const timestamp = Date.now();
      const randomId = uuidv4().split('-')[0];
      const uniqueFileName = `brand_${brandId || 'temp'}_${timestamp}_${randomId}.${fileExtension}`;
      const s3Key = `brands/${uniqueFileName}`;
      
      console.log(`Uploading base64 image to S3: ${s3Key}, Size: ${buffer.length} bytes`);

      const params = {
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: buffer,
        ContentType: contentType
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

