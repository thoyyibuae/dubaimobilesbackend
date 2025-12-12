const fs = require('fs-extra');
const path = require('path');

class FileHandler {
  // Delete file
  static async deleteFile(filePath) {
    try {
      if (filePath) {
        const fullPath = path.join(__dirname, '../..', filePath);
        if (await fs.pathExists(fullPath)) {
          await fs.remove(fullPath);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  // Get file URL for response
  static getFileUrl(req, filename, type) {
    if (!filename) return null;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return `${baseUrl}/uploads/${type}/${filename}`;
  }

  // Check if file exists
  static async fileExists(filePath) {
    try {
      return await fs.pathExists(filePath);
    } catch (error) {
      return false;
    }
  }
}

module.exports = FileHandler;