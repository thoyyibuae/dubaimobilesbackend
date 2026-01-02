// const Category = require('../models/categories_model');
// const FileHandler = require('../src/utils/file_handler');

// class CategoryController {
//   // Create category with icon
//   static async createCategory(req, res) {
//     try {
//       const { name, description } = req.body;
//       const userId = req.user.userId; // Get user ID from authentication
//       const categoryData = req.body;

//       if (!name) {
//         return res.status(400).json({ error: 'Category name is required' });
//       }

//       // Check if category already exists for this user
//       const categoryExists = await Category.existsByName(name, null, userId);
//       if (categoryExists) {
//         return res.status(400).json({ error: 'Category with this name already exists' });
//       }

//       // Get uploaded file
//       const iconImage = req.file ? req.file.filename : null;

//   const createData = { ...categoryData };

//     // Add file from multer if uploaded
//     if (req.file) {
//       createData.icon_image_file = req.file;
//     } else if (req.files && req.files['icon_image']) {
//       createData.icon_image_file = req.files['icon_image'][0];
//     }

//     // Handle base64 image
//     if (categoryData.icon_image_base64) {
//       createData.icon_image_base64 = categoryData.icon_image_base64;
//       createData.icon_image_type = categoryData.icon_image_type || 'image/jpeg';
//     }




//       // Create category
//       const category = await Category.create(name, description, createDataiconImage, userId);

//       // Generate file URL if icon exists
//       if (iconImage) {
//         category.icon_url = FileHandler.getFileUrl(req, iconImage, 'categories');
//       }

//       res.status(201).json({
//         message: 'Category created successfully',
//         category
//       });
//     } catch (error) {
//       console.error('Create category error:', error);
//       res.status(500).json({ error: 'Failed to create category' });
//     }
//   }

//   // Get all categories for logged-in user
//   static async getAllCategories(req, res) {
//     try {
//       const userId = req.user.userId; // Get user ID from authentication
//       const categories = await Category.findAll(userId);
      
//       // Add full URLs to icon images
//       const categoriesWithUrls = categories.map(category => ({
//         ...category,
//         icon_url: category.icon_image ? 
//           FileHandler.getFileUrl(req, category.icon_image, 'categories') : null
//       }));

//       res.json({
//         count: categoriesWithUrls.length,
//         categories: categoriesWithUrls,
//         user: {
//           id: userId,
//           created_by: userId
//         }
//       });
//     } catch (error) {
//       console.error('Get categories error:', error);
//       res.status(500).json({ error: 'Failed to fetch categories' });
//     }
//   }

//   // Get all categories with pagination for logged-in user
//   static async getAllCategoriesPaginated(req, res) {
//     try {
//       const userId = req.user.userId;
//       const page = parseInt(req.query.page) || 1;
//       const limit = parseInt(req.query.limit) || 10;
//       const search = req.query.search || '';

//       const result = await Category.findAllPaginated(userId, page, limit, search);
      
//       // Add full URLs to icon images
//       const categoriesWithUrls = result.data.map(category => ({
//         ...category,
//         icon_url: category.icon_image ? 
//           FileHandler.getFileUrl(req, category.icon_image, 'categories') : null
//       }));

//       res.json({
//         success: true,
//         message: 'Categories retrieved successfully',
//         data: categoriesWithUrls,
//         pagination: result.pagination,
//         filters: {
//           search,
//           page,
//           limit
//         },
//         user: {
//           id: userId,
//           created_by: userId
//         }
//       });
//     } catch (error) {
//       console.error('Get paginated categories error:', error);
//       res.status(500).json({ 
//         success: false,
//         error: 'Failed to fetch categories' 
//       });
//     }
//   }

//   // Get single category for logged-in user
//   static async getCategory(req, res) {
//     try {
//       const { id } = req.params;
//       const userId = req.user.userId; // Get user ID from authentication
      
//       const category = await Category.findById(id, userId);

//       if (!category) {
//         return res.status(404).json({ error: 'Category not found' });
//       }

//       // Add full URL to icon image
//       category.icon_url = category.icon_image ? 
//         FileHandler.getFileUrl(req, category.icon_image, 'categories') : null;

//       res.json({
//         success: true,
//         message: 'Category retrieved successfully',
//         data: category,
//         user: {
//           id: userId,
//           created_by: userId
//         }
//       });
//     } catch (error) {
//       console.error('Get category error:', error);
//       res.status(500).json({ 
//         success: false,
//         error: 'Failed to fetch category' 
//       });
//     }
//   }

//   // Update category for logged-in user
//   static async updateCategory(req, res) {
//     try {
//       const { id } = req.params;
//       const { name, description } = req.body;
//       const userId = req.user.userId; // Get user ID from authentication

//       // Check if category exists and belongs to user
//       const existingCategory = await Category.findById(id, userId);
//       if (!existingCategory) {
//         return res.status(404).json({ error: 'Category not found' });
//       }

//       // Check if new name already exists for this user (excluding current category)
//       if (name && name !== existingCategory.name) {
//         const nameExists = await Category.existsByName(name, id, userId);
//         if (nameExists) {
//           return res.status(400).json({ error: 'Category with this name already exists' });
//         }
//       }

//       // Handle file upload
//       let iconImage = existingCategory.icon_image;
//       if (req.file) {
//         // Delete old file if exists
//         if (existingCategory.icon_image) {
//           await FileHandler.deleteFile(`uploads/categories/${existingCategory.icon_image}`);
//         }
//         iconImage = req.file.filename;
//       }

//       // Update category
//       const updatedCategory = await Category.update(
//         id, 
//         name || existingCategory.name, 
//         description || existingCategory.description, 
//         iconImage,
//         userId
//       );

//       // Add full URL to icon image
//       updatedCategory.icon_url = updatedCategory.icon_image ? 
//         FileHandler.getFileUrl(req, updatedCategory.icon_image, 'categories') : null;

//       res.json({
//         message: 'Category updated successfully',
//         category: updatedCategory,
//         user: {
//           id: userId,
//           created_by: userId
//         }
//       });
//     } catch (error) {
//       console.error('Update category error:', error);
//       res.status(500).json({ error: 'Failed to update category' });
//     }
//   }

//   // Delete category for logged-in user
//   static async deleteCategory(req, res) {
//     try {
//       const { id } = req.params;
//       const userId = req.user.userId; // Get user ID from authentication

//       // Get category before deletion to check ownership and get icon filename
//       const existingCategory = await Category.findById(id, userId);
//       if (!existingCategory) {
//         return res.status(404).json({ error: 'Category not found' });
//       }

//       // Delete category from database
//       const deletedCategory = await Category.delete(id, userId);

//       // Delete associated file
//       if (deletedCategory && deletedCategory.icon_image) {
//         await FileHandler.deleteFile(`uploads/categories/${deletedCategory.icon_image}`);
//       }

//       res.json({
//         message: 'Category deleted successfully',
//         categoryId: deletedCategory ? deletedCategory.id : id,
//         user: {
//           id: userId,
//           created_by: userId
//         }
//       });
//     } catch (error) {
//       console.error('Delete category error:', error);
//       res.status(500).json({ error: 'Failed to delete category' });
//     }
//   }

//   // Search categories by name for logged-in user
//   static async searchCategories(req, res) {
//     try {
//       const { name } = req.query;
//       const userId = req.user.userId;
      
//       if (!name || name.trim() === '') {
//         return res.status(400).json({ 
//           success: false,
//           error: 'Search query is required' 
//         });
//       }

//       const page = parseInt(req.query.page) || 1;
//       const limit = parseInt(req.query.limit) || 10;

//       const result = await Category.searchByName(name.trim(), userId, page, limit);
      
//       // Add full URLs to icon images
//       const categoriesWithUrls = result.data.map(category => ({
//         ...category,
//         icon_url: category.icon_image ? 
//           FileHandler.getFileUrl(req, category.icon_image, 'categories') : null
//       }));

//       res.json({
//         success: true,
//         message: 'Search completed successfully',
//         searchQuery: name,
//         data: categoriesWithUrls,
//         pagination: result.pagination,
//         user: {
//           id: userId,
//           created_by: userId
//         }
//       });
//     } catch (error) {
//       console.error('Search categories error:', error);
//       res.status(500).json({ 
//         success: false,
//         error: 'Failed to search categories' 
//       });
//     }
//   }

//   // Get total count of categories for logged-in user
//   static async getCategoriesCount(req, res) {
//     try {
//       const userId = req.user.userId;
//       const count = await Category.getCount(userId);
      
//       res.json({
//         success: true,
//         message: 'Total count retrieved successfully',
//         data: {
//           totalCategories: count
//         },
//         user: {
//           id: userId,
//           created_by: userId
//         }
//       });
//     } catch (error) {
//       console.error('Get categories count error:', error);
//       res.status(500).json({ 
//         success: false,
//         error: 'Failed to get categories count' 
//       });
//     }
//   }

//   // Get categories created by current user (alias for getAllCategories)
//   static async getMyCategories(req, res) {
//     try {
//       const userId = req.user.userId;
//       const categories = await Category.getByCreatedBy(userId);
      
//       // Add full URLs to icon images
//       const categoriesWithUrls = categories.map(category => ({
//         ...category,
//         icon_url: category.icon_image ? 
//           FileHandler.getFileUrl(req, category.icon_image, 'categories') : null
//       }));

//       res.json({
//         success: true,
//         message: 'My categories retrieved successfully',
//         data: categoriesWithUrls,
//         count: categoriesWithUrls.length,
//         user: {
//           id: userId,
//           created_by: userId
//         }
//       });
//     } catch (error) {
//       console.error('Get my categories error:', error);
//       res.status(500).json({ 
//         success: false,
//         error: 'Failed to get categories' 
//       });
//     }
//   }
// }

// module.exports = CategoryController;

const Category = require('../models/categories_model');

class CategoryController {
  // Create category with icon - UPDATED with S3
  static async createCategory(req, res) {
    try {
      console.log("=== CREATE CATEGORY REQUEST ===");
      
      const userId = req.user.userId;
      let categoryData = req.body;
      
      // Parse JSON if needed
      if (typeof categoryData === 'string') {
        try {
          categoryData = JSON.parse(categoryData);
        } catch (e) {
          // If not JSON, use as is
        }
      }

      // Basic validation
      if (!categoryData.name) {
        return res.status(400).json({ 
          success: false,
          error: 'Category name is required' 
        });
      }

      // Validate name length
      if (categoryData.name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Category name must be at least 2 characters'
        });
      }

      // Prepare category data with files
      const createData = { ...categoryData };

      // Add file from multer if uploaded
      if (req.file) {
        createData.icon_image_file = req.file;
      } else if (req.files && req.files['icon_image']) {
        createData.icon_image_file = req.files['icon_image'][0];
      }

      // Handle base64 image
      if (categoryData.icon_image_base64) {
        createData.icon_image_base64 = categoryData.icon_image_base64;
        createData.icon_image_type = categoryData.icon_image_type || 'image/jpeg';
      }

      // Check if category already exists for this user
      const categoryExists = await Category.existsByName(categoryData.name, null, userId);
      if (categoryExists) {
        return res.status(400).json({ 
          success: false,
          error: 'Category with this name already exists' 
        });
      }

      // Create category
      const category = await Category.create(createData, userId);

      console.log("=== CREATE CATEGORY SUCCESS ===");
      
      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        category
      });
    } catch (error) {
      console.error('Create category error:', error);
      
      let statusCode = 500;
      let errorMessage = error.message || 'Error creating category';
      
      if (error.message.includes('S3')) {
        errorMessage = 'Error uploading image to storage';
      } else if (error.message.includes('duplicate') || error.message.includes('already exists')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json({ 
        success: false,
        error: errorMessage 
      });
    }
  }

  // Get all categories for logged-in user - UPDATED (no FileHandler dependency)
  static async getAllCategories(req, res) {
    try {
      const userId = req.user.userId;
      const categories = await Category.findAll(userId);
      
      // No need to modify icon URLs - they're already full S3 URLs
      const categoriesWithUrls = categories.map(category => ({
        ...category
      }));

      res.json({
        success: true,
        message: 'Categories retrieved successfully',
        count: categoriesWithUrls.length,
        categories: categoriesWithUrls,
        user: {
          id: userId,
          created_by: userId
        }
      });
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch categories' 
      });
    }
  }

  // Get all categories with pagination for logged-in user - UPDATED
  static async getAllCategoriesPaginated(req, res) {
    try {
      const userId = req.user.userId;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';

      const result = await Category.findAllPaginated(userId, page, limit, search);
      
      // No need to modify icon URLs
      const categoriesWithUrls = result.data.map(category => ({
        ...category
      }));

      res.json({
        success: true,
        message: 'Categories retrieved successfully',
        data: categoriesWithUrls,
        pagination: result.pagination,
        filters: {
          search,
          page,
          limit
        },
        user: {
          id: userId,
          created_by: userId
        }
      });
    } catch (error) {
      console.error('Get paginated categories error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch categories' 
      });
    }
  }

  // Get single category for logged-in user - UPDATED
  static async getCategory(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      
      const category = await Category.findById(id, userId);

      if (!category) {
        return res.status(404).json({ 
          success: false,
          error: 'Category not found' 
        });
      }

      // No need to modify icon URL
      res.json({
        success: true,
        message: 'Category retrieved successfully',
        data: category,
        user: {
          id: userId,
          created_by: userId
        }
      });
    } catch (error) {
      console.error('Get category error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch category' 
      });
    }
  }

  // Update category for logged-in user - UPDATED with S3
static async updateCategory(req, res) {
  try {
    console.log("=== UPDATE CATEGORY REQUEST ===");
    console.log("Request body:", req.body);
    console.log("Req 562 category", req.file);
    console.log("User ID:", req.user?.userId);

    const { id } = req.params;
    const userId = req.user.userId;
    let updateData = {};
    
    // Parse the request data
    if (req.body) {
      // Check if data is JSON string
      if (typeof req.body === 'string') {
        try {
          updateData = JSON.parse(req.body);
        } catch (e) {
          updateData = req.body;
        }
      } else if (typeof req.body === 'object') {
        // Handle form-data fields
        updateData = { ...req.body };
        
        // Check for nested JSON data (common with Flutter/dio)
        if (req.body.data) {
          try {
            const parsedData = JSON.parse(req.body.data);
            updateData = { ...updateData, ...parsedData };
            delete updateData.data;
          } catch (e) {
            console.log("Could not parse data field as JSON:", e.message);
          }
        }
      }
    }
    
    // Handle file upload from multer
    if (req.file) {
      console.log("File received via multer:", req.file.originalname);
      updateData.icon_image_file = req.file;
    }
    
    // Handle base64 image if sent
    if (updateData.icon_image_base64) {
      console.log("Base64 image received");
      updateData.icon_image_base64 = updateData.icon_image_base64;
      updateData.icon_image_type = updateData.icon_image_type || 'image/jpeg';
    }
    
    console.log("Processed updateData:", {
      name: updateData.name,
      description: updateData.description,
      hasIconFile: !!updateData.icon_image_file,
      hasIconBase64: !!updateData.icon_image_base64
    });

    // Check if any valid field is being updated
    const hasName = updateData.name !== undefined && updateData.name !== null && updateData.name !== '';
    const hasDescription = updateData.description !== undefined;
    const hasIcon = updateData.icon_image_base64 || updateData.icon_image_file;
    
    if (!hasName && !hasDescription && !hasIcon) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields provided for update'
      });
    }
    
    // Validate name if provided
    if (hasName && updateData.name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Category name must be at least 2 characters'
      });
    }
    
    // Check if category exists and belongs to user
    const existingCategory = await Category.findById(id, userId);
    if (!existingCategory) {
      return res.status(404).json({ 
        success: false,
        error: 'Category not found' 
      });
    }

    // Check if new name already exists for this user (excluding current category)
    if (hasName && updateData.name !== existingCategory.name) {
      const nameExists = await Category.existsByName(updateData.name, id, userId);
      if (nameExists) {
        return res.status(400).json({ 
          success: false,
          error: 'Category with this name already exists' 
        });
      }
    }

    // Update category - This will handle S3 upload automatically
    const updatedCategory = await Category.update(id, updateData, userId);
    
    if (!updatedCategory) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    console.log("=== UPDATE CATEGORY SUCCESS ===");
    console.log("Updated category:", {
      id: updatedCategory.id,
      name: updatedCategory.name,
      icon_image: updatedCategory.icon_image ? 'Yes' : 'No'
    });
    
    res.json({
      success: true,
      message: 'Category updated successfully',
      category: updatedCategory, // Return the updated category object
      user: {
        id: userId,
        created_by: userId
      }
    });
  } catch (error) {
    console.error('Update category error:', error);
    
    let statusCode = 500;
    let errorMessage = error.message || 'Error updating category';
    
    if (error.message.includes('not found')) {
      statusCode = 404;
    } else if (error.message.includes('duplicate') || error.message.includes('already exists')) {
      statusCode = 400;
    } else if (error.message.includes('S3')) {
      errorMessage = 'Error uploading image to storage';
    } else if (error.message.includes('foreign key constraint')) {
      errorMessage = 'Cannot update category as it is being used by other records';
    }
    
    res.status(statusCode).json({ 
      success: false,
      error: errorMessage 
    });
  }
}


  // Delete category for logged-in user - UPDATED with S3
  static async deleteCategory(req, res) {
    try {
      console.log("=== DELETE CATEGORY REQUEST ===");
      
      const { id } = req.params;
      const userId = req.user.userId;

      // Delete category
      const deletedCategory = await Category.delete(id, userId);
      
      if (!deletedCategory) {
        return res.status(404).json({
          success: false,
          error: 'Category not found'
        });
      }

      console.log("=== DELETE CATEGORY SUCCESS ===");
      
      res.json({
        success: true,
        message: 'Category deleted successfully',
        categoryId: deletedCategory.id,
        user: {
          id: userId,
          created_by: userId
        }
      });
    } catch (error) {
      console.error('Delete category error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to delete category' 
      });
    }
  }

  // Search categories by name for logged-in user - UPDATED
  static async searchCategories(req, res) {
    try {
      const { name } = req.query;
      const userId = req.user.userId;
      
      if (!name || name.trim() === '') {
        return res.status(400).json({ 
          success: false,
          error: 'Search query is required' 
        });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await Category.searchByName(name.trim(), userId, page, limit);
      
      // No need to modify icon URLs
      const categoriesWithUrls = result.data.map(category => ({
        ...category
      }));

      res.json({
        success: true,
        message: 'Search completed successfully',
        searchQuery: name,
        data: categoriesWithUrls,
        pagination: result.pagination,
        user: {
          id: userId,
          created_by: userId
        }
      });
    } catch (error) {
      console.error('Search categories error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to search categories' 
      });
    }
  }

  // Get total count of categories for logged-in user - UPDATED
  static async getCategoriesCount(req, res) {
    try {
      const userId = req.user.userId;
      const count = await Category.getCount(userId);
      
      res.json({
        success: true,
        message: 'Total count retrieved successfully',
        data: {
          totalCategories: count
        },
        user: {
          id: userId,
          created_by: userId
        }
      });
    } catch (error) {
      console.error('Get categories count error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to get categories count' 
      });
    }
  }

  // Get categories created by current user (alias for getAllCategories) - UPDATED
  static async getMyCategories(req, res) {
    try {
      const userId = req.user.userId;
      const categories = await Category.getByCreatedBy(userId);
      
      // No need to modify icon URLs
      const categoriesWithUrls = categories.map(category => ({
        ...category
      }));

      res.json({
        success: true,
        message: 'My categories retrieved successfully',
        data: categoriesWithUrls,
        count: categoriesWithUrls.length,
        user: {
          id: userId,
          created_by: userId
        }
      });
    } catch (error) {
      console.error('Get my categories error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to get categories' 
      });
    }
  }
}

module.exports = CategoryController;

