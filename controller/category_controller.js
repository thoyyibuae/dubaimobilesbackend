const Category = require('../models/categories_model');
const FileHandler = require('../src/utils/file_handler');

class CategoryController {
  // Create category with icon
  static async createCategory(req, res) {
    try {
      const { name, description } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'Category name is required' });
      }

      // Check if category already exists
      const categoryExists = await Category.existsByName(name);
      if (categoryExists) {
        return res.status(400).json({ error: 'Category with this name already exists' });
      }

      // Get uploaded file
      const iconImage = req.file ? req.file.filename : null;

      // Create category
      const category = await Category.create(name, description, iconImage);

      // Generate file URL if icon exists
      if (iconImage) {
        category.icon_url = FileHandler.getFileUrl(req, iconImage, 'categories');
      }

      res.status(201).json({
        message: 'Category created successfully',
        category
      });
    } catch (error) {
      console.error('Create category error:', error);
      res.status(500).json({ error: 'Failed to create category' });
    }
  }

  // Get all categories
  static async getAllCategories(req, res) {
    try {
      const categories = await Category.findAll();
      
      // Add full URLs to icon images
      const categoriesWithUrls = categories.map(category => ({
        ...category,
        icon_url: category.icon_image ? 
          FileHandler.getFileUrl(req, category.icon_image, 'categories') : null
      }));

      res.json({
        count: categoriesWithUrls.length,
        categories: categoriesWithUrls
      });
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  }

  // Get single category
  static async getCategory(req, res) {
    try {
      const { id } = req.params;
      const category = await Category.findById(id);

      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }

      // Add full URL to icon image
      category.icon_url = category.icon_image ? 
        FileHandler.getFileUrl(req, category.icon_image, 'categories') : null;

      res.json(category);
    } catch (error) {
      console.error('Get category error:', error);
      res.status(500).json({ error: 'Failed to fetch category' });
    }
  }

  // Update category
  static async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      // Check if category exists
      const existingCategory = await Category.findById(id);
      if (!existingCategory) {
        return res.status(404).json({ error: 'Category not found' });
      }

      // Check if new name already exists (excluding current category)
      if (name && name !== existingCategory.name) {
        const nameExists = await Category.existsByName(name, id);
        if (nameExists) {
          return res.status(400).json({ error: 'Category with this name already exists' });
        }
      }

      // Handle file upload
      let iconImage = existingCategory.icon_image;
      if (req.file) {
        // Delete old file if exists
        if (existingCategory.icon_image) {
          await FileHandler.deleteFile(`uploads/categories/${existingCategory.icon_image}`);
        }
        iconImage = req.file.filename;
      }

      // Update category
      const updatedCategory = await Category.update(
        id, 
        name || existingCategory.name, 
        description || existingCategory.description, 
        iconImage
      );

      // Add full URL to icon image
      updatedCategory.icon_url = updatedCategory.icon_image ? 
        FileHandler.getFileUrl(req, updatedCategory.icon_image, 'categories') : null;

      res.json({
        message: 'Category updated successfully',
        category: updatedCategory
      });
    } catch (error) {
      console.error('Update category error:', error);
      res.status(500).json({ error: 'Failed to update category' });
    }
  }

  // Delete category
  static async deleteCategory(req, res) {
    try {
      const { id } = req.params;

      // Get category before deletion to get icon filename
      const existingCategory = await Category.findById(id);
      if (!existingCategory) {
        return res.status(404).json({ error: 'Category not found' });
      }

      // Delete category from database
      const deletedCategory = await Category.delete(id);

      // Delete associated file
      if (deletedCategory.icon_image) {
        await FileHandler.deleteFile(`uploads/categories/${deletedCategory.icon_image}`);
      }

      res.json({
        message: 'Category deleted successfully',
        categoryId: deletedCategory.id
      });
    } catch (error) {
      console.error('Delete category error:', error);
      res.status(500).json({ error: 'Failed to delete category' });
    }
  }
}

module.exports = CategoryController;