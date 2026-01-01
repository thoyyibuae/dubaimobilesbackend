const Subcategory = require('../models/subcategory_model');



exports.createSubcategory = async (req, res) => {
  try {
    console.log("=== CREATE SUBCATEGORY REQUEST ===");
    
    let subcategoryData = req.body;
    
    // Parse JSON if needed
    if (typeof subcategoryData === 'string') {
      try {
        subcategoryData = JSON.parse(subcategoryData);
      } catch (e) {
        // If not JSON, use as is
      }
    }

    // Basic validation
    if (!subcategoryData.maincategoryId || !subcategoryData.subName) {
      return res.status(400).json({ 
        success: false,
        error: 'maincategoryId and subName are required' 
      });
    }

    // Validate subName length
    if (subcategoryData.subName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Subcategory name must be at least 2 characters'
      });
    }

    // Prepare subcategory data with files
    const createData = { ...subcategoryData };

    // Add file from multer if uploaded
    if (req.file) {
      createData.icon_image_file = req.file;
    } else if (req.files && req.files['icon_image']) {
      createData.icon_image_file = req.files['icon_image'][0];
    }

    // Handle base64 image
    if (subcategoryData.icon_image_base64) {
      createData.icon_image_base64 = subcategoryData.icon_image_base64;
      createData.icon_image_type = subcategoryData.icon_image_type || 'image/jpeg';
    }

    // Check if subcategory already exists
    const existingSubcategories = await Subcategory.findAll(1, 1, subcategoryData.subName, subcategoryData.maincategoryId);
    if (existingSubcategories.subcategories.length > 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Subcategory with this name already exists for the selected category' 
      });
    }

    // Determine created_by from authenticated user
    const createdById = req.user ? req.user.userId : null;

    // Create subcategory
    const subcategory = await Subcategory.create(createData, createdById);

    // Get the created subcategory with category_name
    const subcategoryWithCategory = await Subcategory._getSubcategoryWithCategory(subcategory.id);

    console.log("=== CREATE SUBCATEGORY SUCCESS ===");
    
    res.status(201).json({
      success: true,
      message: 'Subcategory created successfully',
      data: subcategoryWithCategory  // Directly return the object from model
    });
  } catch (error) {
    console.error('Create subcategory error:', error);
    
    let statusCode = 500;
    let errorMessage = error.message || 'Error creating subcategory';
    
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
};

exports.getAllSubcategories = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const maincategoryId = req.query.maincategoryId || null;

    const result = await Subcategory.findAll(page, limit, search, maincategoryId);
    
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Get subcategories error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error fetching subcategories'
    });
  }
};

exports.getSubcategoryById = async (req, res) => {
  try {
    const subcategory = await Subcategory.findById(req.params.id);
    
    if (!subcategory) {
      return res.status(404).json({
        success: false,
        error: 'Subcategory not found'
      });
    }

    res.status(200).json({
      success: true,
      data: subcategory
    });
  } catch (error) {
    console.error('Get subcategory error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error fetching subcategory'
    });
  }
};

exports.getSubcategoriesByCategory = async (req, res) => {
  try {
    const { maincategoryId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await Subcategory.findByCategoryId(maincategoryId, page, limit);
    
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Get subcategories by category error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error fetching subcategories'
    });
  }
};

// exports.updateSubcategory = async (req, res) => {
//   try {
//     console.log("=== UPDATE SUBCATEGORY REQUEST ===");
    
//     const { id } = req.params;
//     let updateData = req.body;
    
//     // Parse JSON if needed
//     if (typeof updateData === 'string' || updateData instanceof String) {
//       try {
//         updateData = JSON.parse(updateData);
//       } catch (e) {
//         // If not JSON, use as is
//       }
//     }

//     // Validation: at least one field should be provided for update
//     if (!updateData.subName && !updateData.icon_image_base64 && !req.file && !req.files) {
//       return res.status(400).json({
//         success: false,
//         error: 'At least one field (subName or icon_image) is required for update'
//       });
//     }

//     // Prepare update data with files
//     if (req.file) {
//       updateData.icon_image_file = req.file;
//     } else if (req.files && req.files['icon_image']) {
//       updateData.icon_image_file = req.files['icon_image'][0];
//     }

//     // Handle base64 image
//     if (updateData.icon_image_base64) {
//       updateData.icon_image_base64 = updateData.icon_image_base64;
//       updateData.icon_image_type = updateData.icon_image_type || 'image/jpeg';
//     }

//     // Update subcategory
//     const subcategory = await Subcategory.update(id, updateData);
    
//     if (!subcategory) {
//       return res.status(404).json({
//         success: false,
//         error: 'Subcategory not found'
//       });
//     }

//     console.log("=== UPDATE SUBCATEGORY SUCCESS ===");
    
//     res.status(200).json({
//       success: true,
//       message: 'Subcategory updated successfully',
//       data: subcategory
//     });
//   } catch (error) {
//     console.error('Update subcategory error:', error);
//     res.status(500).json({
//       success: false,
//       error: error.message || 'Error updating subcategory'
//     });
//   }
// };



exports.updateSubcategory = async (req, res) => {
  try {
    console.log("=== UPDATE SUBCATEGORY REQUEST ===");
    console.log("Subcategory ID:", req.params.id);
    
    const { id } = req.params;
    let updateData = {};
    
    // Parse request data
    if (req.get('Content-Type')?.includes('application/json')) {
      updateData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } else if (req.get('Content-Type')?.includes('multipart/form-data')) {
      updateData = req.body;
      if (updateData.data) {
        try {
          const parsedData = JSON.parse(updateData.data);
          updateData = { ...parsedData, ...updateData };
          delete updateData.data;
        } catch (e) {
          // Ignore parse error
        }
      }
    } else {
      updateData = req.body;
    }
    
    // Handle file uploads from multer
    if (req.file) {
      updateData.icon_image_file = req.file;
    } else if (req.files && req.files['icon_image']) {
      updateData.icon_image_file = req.files['icon_image'][0];
    }
    
    // Handle base64 image
    if (updateData.icon_image_base64) {
      updateData.icon_image_base64 = updateData.icon_image_base64;
      updateData.icon_image_type = updateData.icon_image_type || 'image/jpeg';
    }
    
    // Check if any valid field is being updated
    const hasSubName = updateData.subName !== undefined && updateData.subName !== null && updateData.subName !== '';
    const hasMaincategoryId = updateData.maincategoryId !== undefined && updateData.maincategoryId !== null && updateData.maincategoryId !== '';
    const hasIcon = updateData.icon_image_base64 || updateData.icon_image_file;
    
    if (!hasSubName && !hasMaincategoryId && !hasIcon) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields provided for update'
      });
    }
    
    // Validate subName if provided
    if (hasSubName && updateData.subName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Subcategory name must be at least 2 characters'
      });
    }
    
    // Validate maincategoryId if provided
    if (hasMaincategoryId && isNaN(parseInt(updateData.maincategoryId))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category ID'
      });
    }
    
    // Update subcategory
    const subcategory = await Subcategory.update(id, updateData);
    
    if (!subcategory) {
      return res.status(404).json({
        success: false,
        error: 'Subcategory not found'
      });
    }

    console.log("=== UPDATE SUBCATEGORY SUCCESS ===");
    console.log("Response data:", subcategory);
    
    res.status(200).json({
      success: true,
      message: 'Subcategory updated successfully',
      data: subcategory  // Directly return the object from model
    });
  } catch (error) {
    console.error('Update subcategory error:', error);
    
    let statusCode = 500;
    let errorMessage = error.message || 'Error updating subcategory';
    
    if (error.message.includes('not found')) {
      statusCode = 404;
    } else if (error.message.includes('duplicate') || error.message.includes('already exists')) {
      statusCode = 400;
    } else if (error.message.includes('S3')) {
      errorMessage = 'Error uploading image to storage';
    }
    
    res.status(statusCode).json({
      success: false,
      error: errorMessage
    });
  }
};






exports.deleteSubcategory = async (req, res) => {
  try {
    console.log("=== DELETE SUBCATEGORY REQUEST ===");
    
    const subcategory = await Subcategory.delete(req.params.id);
    
    if (!subcategory) {
      return res.status(404).json({
        success: false,
        error: 'Subcategory not found'
      });
    }

    console.log("=== DELETE SUBCATEGORY SUCCESS ===");
    
    res.status(200).json({
      success: true,
      message: 'Subcategory deleted successfully',
      data: subcategory
    });
  } catch (error) {
    console.error('Delete subcategory error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error deleting subcategory'
    });
  }
};


