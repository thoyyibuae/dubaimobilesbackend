const Brand = require('../models/brands_model');
const FileHandler = require('../src/utils/file_handler');

class BrandController {
  // Create brand with icon
  static async createBrand(req, res) {
    try {
      const { name, description } = req.body;
      
      const createdBy = req.user.userId;



console.log(">>>>>>>>>>26"+createdBy);

      if (!name) {
        return res.status(400).json({ error: 'Brand name is required' });
      }

      // Check if brand already exists
      const brandExists = await Brand.existsByName(name);
      if (brandExists) {
        return res.status(400).json({ error: 'Brand with this name already exists' });
      }

      // Get uploaded file
   
      const iconImage = req.file ? req.file.filename : null;


      // Create brand
      const brand = await Brand.create(name, description, iconImage,createdBy);

      // Generate file URL if icon exists
      if (iconImage) {
        brand.icon_url = FileHandler.getFileUrl(req, iconImage, 'brands');
      }

      res.status(201).json({
        message: 'Brand created successfully',
        brand
      });
    } catch (error) {
      console.error('Create brand error:', error);
      res.status(500).json({ error: 'Failed to create brand' });
    }
  }

  // Get all brands
  static async getAllBrands(req, res) {
    try {
            const createdBy = req.user?.userId;

      const brands = await Brand.findAll(createdBy);
      
      
      // Add full URLs to icon images
      const brandsWithUrls = brands.map(brand => ({
        ...brand,
        icon_url: brand.icon_image ? 
          FileHandler.getFileUrl(req, brand.icon_image, 'brands') : null
      }));

      res.json({
        count: brandsWithUrls.length,
        brands: brandsWithUrls
      });
    } catch (error) {
      console.error('Get brands error:', error);
      res.status(500).json({ error: 'Failed to fetch brands' });
    }
  }

  // Get single brand
  static async getBrand(req, res) {
    try {
      const { id } = req.params;
      const brand = await Brand.findById(id);

      if (!brand) {
        return res.status(404).json({ error: 'Brand not found' });
      }

      // Add full URL to icon image
      brand.icon_url = brand.icon_image ? 
        FileHandler.getFileUrl(req, brand.icon_image, 'brands') : null;

      res.json(brand);
    } catch (error) {
      console.error('Get brand error:', error);
      res.status(500).json({ error: 'Failed to fetch brand' });
    }
  }

  // Update brand
  static async updateBrand(req, res) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      // Check if brand exists
      const existingBrand = await Brand.findById(id);
      if (!existingBrand) {
        return res.status(404).json({ error: 'Brand not found' });
      }

      // Check if new name already exists (excluding current brand)
      if (name && name !== existingBrand.name) {
        const nameExists = await Brand.existsByName(name, id);
        if (nameExists) {
          return res.status(400).json({ error: 'Brand with this name already exists' });
        }
      }

      // Handle file upload
      let iconImage = existingBrand.icon_image;
      if (req.file) {
        // Delete old file if exists
        if (existingBrand.icon_image) {
          await FileHandler.deleteFile(`uploads/brands/${existingBrand.icon_image}`);
        }
        iconImage = req.file.filename;
      }

      // Update brand
      const updatedBrand = await Brand.update(
        id, 
        name || existingBrand.name, 
        description || existingBrand.description, 
        iconImage
      );

      // Add full URL to icon image
      updatedBrand.icon_url = updatedBrand.icon_image ? 
        FileHandler.getFileUrl(req, updatedBrand.icon_image, 'brands') : null;

      res.json({
        message: 'Brand updated successfully',
        brand: updatedBrand
      });
    } catch (error) {
      console.error('Update brand error:', error);
      res.status(500).json({ error: 'Failed to update brand' });
    }
  }

  // Delete brand
  static async deleteBrand(req, res) {
    try {
      const { id } = req.params;

      // Get brand before deletion to get icon filename
      const existingBrand = await Brand.findById(id);
      if (!existingBrand) {
        return res.status(404).json({ error: 'Brand not found' });
      }

      // Delete brand from database
      const deletedBrand = await Brand.delete(id);

      // Delete associated file
      if (deletedBrand.icon_image) {
        await FileHandler.deleteFile(`uploads/brands/${deletedBrand.icon_image}`);
      }

      res.json({
        message: 'Brand deleted successfully',
        brandId: deletedBrand.id
      });
    } catch (error) {
      console.error('Delete brand error:', error);
      res.status(500).json({ error: 'Failed to delete brand' });
    }
  }
}

module.exports = BrandController;