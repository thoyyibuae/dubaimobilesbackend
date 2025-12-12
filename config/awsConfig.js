const AWS = require('aws-sdk');
require('dotenv').config();

// Configure AWS SDK
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

const bucketName = process.env.S3_BUCKET_NAME || 'your-stock-images-bucket';

// Generate public URL for S3 objects
const getPublicUrl = (key) => {
    return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};

// Generate presigned URL for direct uploads
const generatePresignedUrl = async (fileName, fileType) => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const path = require('path');
    const ext = path.extname(fileName);
    const key = `stocks/${timestamp}-${randomString}${ext}`;
    
    const params = {
        Bucket: bucketName,
        Key: key,
        Expires: 300, // 5 minutes
        ContentType: fileType,
        ACL: 'public-read'
    };
    
    try {
        const uploadURL = await s3.getSignedUrlPromise('putObject', params);
        return {
            uploadURL,
            fileURL: getPublicUrl(key),
            key
        };
    } catch (error) {
        console.error('Error generating presigned URL:', error);
        throw error;
    }
};

// Delete file from S3
const deleteFromS3 = async (key) => {
    try {
        const params = {
            Bucket: bucketName,
            Key: key
        };
        
        await s3.deleteObject(params).promise();
        return true;
    } catch (error) {
        console.error('Error deleting from S3:', error);
        return false;
    }
};

// Delete multiple files
const deleteMultipleFromS3 = async (keys) => {
    try {
        const params = {
            Bucket: bucketName,
            Delete: {
                Objects: keys.map(key => ({ Key: key })),
                Quiet: false
            }
        };
        
        await s3.deleteObjects(params).promise();
        return true;
    } catch (error) {
        console.error('Error deleting multiple files from S3:', error);
        return false;
    }
};

module.exports = {
    s3,
    bucketName,
    getPublicUrl,
    generatePresignedUrl,
    deleteFromS3,
    deleteMultipleFromS3
};

