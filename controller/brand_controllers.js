// const Brand = require('../models/brands_model');
// const FileHandler = require('../src/utils/file_handler');

// class BrandController {
//   // Create brand with icon
//   static async createBrand(req, res) {
//     try {
//       const { name, description } = req.body;
      
//       const createdBy = req.user.userId;



// console.log(">>>>>>>>>>26"+createdBy);

//       if (!name) {
//         return res.status(400).json({ error: 'Brand name is required' });
//       }

//       // Check if brand already exists
//       const brandExists = await Brand.existsByName(name);
//       if (brandExists) {
//         return res.status(400).json({ error: 'Brand with this name already exists' });
//       }

//       // Get uploaded file
   

//       const iconImage = req.file ? req.file.filename : null;

//       // Create brand
//       const brand = await Brand.create(name, description, iconImage,createdBy);

//       // Generate file URL if icon exists
//       if (iconImage) {
//         brand.icon_url = FileHandler.getFileUrl(req, iconImage, 'brands');
//       }

//       res.status(201).json({
//         message: 'Brand created successfully',
//         brand
//       });
//     } catch (error) {
//       console.error('Create brand error:', error);
//       res.status(500).json({ error: 'Failed to create brand' });
//     }
//   }

//   // Get all brands
//   static async getAllBrands(req, res) {
//     try {
//             const createdBy = req.user?.userId;

//       const brands = await Brand.findAll(createdBy);
      
      
//       // Add full URLs to icon images
//       const brandsWithUrls = brands.map(brand => ({
//         ...brand,
//         icon_url: brand.icon_image ? 
//           FileHandler.getFileUrl(req, brand.icon_image, 'brands') : null
//       }));

//       res.json({
//         count: brandsWithUrls.length,
//         brands: brandsWithUrls
//       });
//     } catch (error) {
//       console.error('Get brands error:', error);
//       res.status(500).json({ error: 'Failed to fetch brands' });
//     }
//   }

//   // Get single brand
//   static async getBrand(req, res) {
//     try {
//       const { id } = req.params;
//       const brand = await Brand.findById(id);

//       if (!brand) {
//         return res.status(404).json({ error: 'Brand not found' });
//       }

//       // Add full URL to icon image
//       brand.icon_url = brand.icon_image ? 
//         FileHandler.getFileUrl(req, brand.icon_image, 'brands') : null;

//       res.json(brand);
//     } catch (error) {
//       console.error('Get brand error:', error);
//       res.status(500).json({ error: 'Failed to fetch brand' });
//     }
//   }

//   // Update brand
//   static async updateBrand(req, res) {
//     try {
//       const { id } = req.params;
//       const { name, description } = req.body;

//       // Check if brand exists
//       const existingBrand = await Brand.findById(id);
//       if (!existingBrand) {
//         return res.status(404).json({ error: 'Brand not found' });
//       }

//       // Check if new name already exists (excluding current brand)
//       if (name && name !== existingBrand.name) {
//         const nameExists = await Brand.existsByName(name, id);
//         if (nameExists) {
//           return res.status(400).json({ error: 'Brand with this name already exists' });
//         }
//       }

//       // Handle file upload
//       let iconImage = existingBrand.icon_image;
//       if (req.file) {
//         // Delete old file if exists
//         if (existingBrand.icon_image) {
//           await FileHandler.deleteFile(`uploads/brands/${existingBrand.icon_image}`);
//         }
//         iconImage = req.file.filename;
//       }

//       // Update brand
//       const updatedBrand = await Brand.update(
//         id, 
//         name || existingBrand.name, 
//         description || existingBrand.description, 
//         iconImage
//       );

//       // Add full URL to icon image
//       updatedBrand.icon_url = updatedBrand.icon_image ? 
//         FileHandler.getFileUrl(req, updatedBrand.icon_image, 'brands') : null;

//       res.json({
//         message: 'Brand updated successfully',
//         brand: updatedBrand
//       });
//     } catch (error) {
//       console.error('Update brand error:', error);
//       res.status(500).json({ error: 'Failed to update brand' });
//     }
//   }

//   // Delete brand
//   static async deleteBrand(req, res) {
//     try {
//       const { id } = req.params;

//       // Get brand before deletion to get icon filename
//       const existingBrand = await Brand.findById(id);
//       if (!existingBrand) {
//         return res.status(404).json({ error: 'Brand not found' });
//       }

//       // Delete brand from database
//       const deletedBrand = await Brand.delete(id);

//       // Delete associated file
//       if (deletedBrand.icon_image) {
//         await FileHandler.deleteFile(`uploads/brands/${deletedBrand.icon_image}`);
//       }

//       res.json({
//         message: 'Brand deleted successfully',
//         brandId: deletedBrand.id
//       });
//     } catch (error) {
//       console.error('Delete brand error:', error);
//       res.status(500).json({ error: 'Failed to delete brand' });
//     }
//   }
// }

// module.exports = BrandController;





const Brand = require('../models/brands_model');

class BrandController {
  // Create brand with icon using S3
  // static async createBrand(req, res) {
  //   try {
  //     console.log("=== CREATE BRAND REQUEST ===");
      
  //     let brandData = req.body;
      
  //     // Parse JSON if needed
  //     if (typeof brandData === 'string' || brandData instanceof String) {
  //       try {
  //         brandData = JSON.parse(brandData);
  //       } catch (e) {
  //         // If not JSON, use as is
  //       }
  //     }

  //     // Basic validation
  //     if (!brandData.name) {
  //       return res.status(400).json({ 
  //         success: false,
  //         error: 'Brand name is required' 
  //       });
  //     }

  //     // Validate name length
  //     if (brandData.name.trim().length < 2) {
  //       return res.status(400).json({
  //         success: false,
  //         error: 'Brand name must be at least 2 characters'
  //       });
  //     }

  //     const createdBy = req.user?.userId;
  //     if (!createdBy) {
  //       return res.status(401).json({
  //         success: false,
  //         error: 'Authentication required'
  //       });
  //     }

  //     console.log("Creating brand for user:", createdBy);

  //     // Check if brand already exists
  //     const brandExists = await Brand.existsByName(brandData.name);
  //     if (brandExists) {
  //       return res.status(400).json({ 
  //         success: false,
  //         error: 'Brand with this name already exists' 
  //       });
  //     }

  //     // Prepare brand data with files
  //     const createData = { ...brandData };

  //     // Add file from multer if uploaded
  //     if (req.file) {
  //       createData.icon_image_file = req.file;
  //     } else if (req.files && req.files['icon_image']) {
  //       createData.icon_image_file = req.files['icon_image'][0];
  //     }

  //     // Handle base64 image
  //     if (brandData.icon_image_base64) {
  //       createData.icon_image_base64 = brandData.icon_image_base64;
  //       createData.icon_image_type = brandData.icon_image_type || 'image/jpeg';
  //     }

  //     // Create brand
  //     const brand = await Brand.create(createData, createdBy);

  //     console.log("=== CREATE BRAND SUCCESS ===");
      
  //     res.status(201).json({
  //       success: true,
  //       message: 'Brand created successfully',
  //       data: brand
  //     });
  //   } catch (error) {
  //     console.error('Create brand error:', error);
      
  //     let statusCode = 500;
  //     let errorMessage = error.message || 'Failed to create brand';
      
  //     if (error.message.includes('duplicate') || error.message.includes('already exists')) {
  //       statusCode = 400;
  //     } else if (error.message.includes('S3')) {
  //       errorMessage = 'Error uploading image to storage';
  //     }
      
  //     res.status(statusCode).json({ 
  //       success: false,
  //       error: errorMessage 
  //     });
  //   }
  // }





static async createBrand(req, res) {
  try {
    console.log("=== CREATE BRAND REQUEST ===");
    
    let brandData = req.body;
    
    // Parse JSON if needed
    if (typeof brandData === 'string' || brandData instanceof String) {
      try {
        brandData = JSON.parse(brandData);
      } catch (e) {
        // If not JSON, use as is
      }
    }

    // Basic validation
    if (!brandData.name) {
      return res.status(400).json({ 
        success: false,
        error: 'Brand name is required' 
      });
    }

    const createdBy = req.user?.userId;
    if (!createdBy) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    console.log("Creating brand for user:", createdBy);

    // Check if brand already exists
    const brandExists = await Brand.existsByName(brandData.name);
    if (brandExists) {
      return res.status(400).json({ 
        success: false,
        error: 'Brand with this name already exists' 
      });
    }

    // Prepare brand data with files
    const createData = { ...brandData };

    // DEBUG: Log file structure
    console.log("=== FILE DEBUG INFO ===");
    console.log("req.file:", req.file ? {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      buffer: req.file.buffer ? `Buffer exists, length: ${req.file.buffer.length}` : 'No buffer',
      hasBuffer: !!req.file.buffer,
      keys: Object.keys(req.file)
    } : 'No file');
    
    console.log("req.files:", req.files ? JSON.stringify(req.files, null, 2) : 'No files');
    console.log("=== END FILE DEBUG ===");

    // Add file from multer if uploaded
    if (req.file) {
      console.log("Adding file from req.file");
      createData.icon_image_file = req.file;
    } else if (req.files && req.files['icon_image']) {
      console.log("Adding file from req.files['icon_image']");
      createData.icon_image_file = req.files['icon_image'][0];
    } else {
      console.log("No file received in request");
    }

    // Handle base64 image
    if (brandData.icon_image_base64) {
      console.log("Base64 image received");
      createData.icon_image_base64 = brandData.icon_image_base64;
      createData.icon_image_type = brandData.icon_image_type || 'image/jpeg';
    }

    // DEBUG: Log what we're passing to Brand.create
    console.log("Passing to Brand.create:", {
      name: createData.name,
      description: createData.description,
      hasIconFile: !!createData.icon_image_file,
      hasIconBase64: !!createData.icon_image_base64,
      iconFileKeys: createData.icon_image_file ? Object.keys(createData.icon_image_file) : 'No file'
    });

    // Create brand
    const brand = await Brand.create(createData, createdBy);

    console.log("=== CREATE BRAND SUCCESS ===");
    
    res.status(201).json({
      success: true,
      message: 'Brand created successfully',
      data: brand
    });
  } catch (error) {
    console.error('Create brand error:', error);
    
    let statusCode = 500;
    let errorMessage = error.message || 'Failed to create brand';
    
    if (error.message.includes('duplicate') || error.message.includes('already exists')) {
      statusCode = 400;
    } else if (error.message.includes('S3')) {
      errorMessage = 'Error uploading image to storage';
    }
    
    res.status(statusCode).json({ 
      success: false,
      error: errorMessage 
    });
  }
}



  // Get all brands for the authenticated user
  static async getAllBrands(req, res) {
    try {
      console.log("=== GET ALL BRANDS REQUEST ===");
      
      const createdBy = req.user?.userId;
      if (!createdBy) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Get pagination parameters
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';

      console.log("Getting brands for user:", createdBy, "page:", page, "search:", search);

      let result;
      if (search || page > 1) {
        // Use paginated version if searching or not first page
        result = await Brand.findAllPaginated(createdBy, page, limit, search);
      } else {
        // Use simple version for first page without search
        const brands = await Brand.findAll(createdBy);
        result = {
          brands: brands,
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalItems: brands.length,
            itemsPerPage: brands.length,
            hasNextPage: false,
            hasPreviousPage: false
          }
        };
      }

      console.log(`Found ${result.brands.length} brands out of ${result.pagination.totalItems} total`);
      console.log("=== GET ALL BRANDS SUCCESS ===");

      res.json({
        success: true,
        count: result.brands.length,
        brands: result.brands,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Get brands error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch brands' 
      });
    }
  }

  // Get single brand
  static async getBrand(req, res) {
    try {
      console.log("=== GET BRAND REQUEST ===");
      const { id } = req.params;
      console.log("Brand ID:", id);

      const brand = await Brand.findById(id);

      if (!brand) {
        return res.status(404).json({ 
          success: false,
          error: 'Brand not found' 
        });
      }

      console.log("=== GET BRAND SUCCESS ===");

      res.json({
        success: true,
        data: brand
      });
    } catch (error) {
      console.error('Get brand error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch brand' 
      });
    }
  }

  // Update brand
  static async updateBrand(req, res) {
    try {
      console.log("=== UPDATE BRAND REQUEST ===");
      console.log("Brand ID:", req.params.id);
      
      const { id } = req.params;
      let updateData = req.body;
      
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
      
      console.log("Update data received:", {
        keys: Object.keys(updateData),
        name: updateData.name,
        description: updateData.description,
        hasIconBase64: !!updateData.icon_image_base64
      });
      
      // Handle file uploads from multer
      if (req.file) {
        console.log("Single file received:", req.file.originalname);
        updateData.icon_image_file = req.file;
      } else if (req.files && req.files['icon_image']) {
        console.log("Multiple files received in icon_image field:", req.files['icon_image'].length);
        updateData.icon_image_file = req.files['icon_image'][0];
      }
      
      // Handle base64 image
      if (updateData.icon_image_base64) {
        console.log("Base64 image received");
        updateData.icon_image_base64 = updateData.icon_image_base64;
        updateData.icon_image_type = updateData.icon_image_type || 'image/jpeg';
      }
      
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
          error: 'Brand name must be at least 2 characters'
        });
      }
      
      // Check if new name already exists (excluding current brand)
      if (hasName) {
        const nameExists = await Brand.existsByName(updateData.name, id);
        if (nameExists) {
          return res.status(400).json({ 
            success: false,
            error: 'Brand with this name already exists' 
          });
        }
      }
      
      console.log("Calling Brand.update with data:", Object.keys(updateData));
      
      // Update brand
      const brand = await Brand.update(id, updateData);
      
      if (!brand) {
        return res.status(404).json({
          success: false,
          error: 'Brand not found'
        });
      }

      console.log("=== UPDATE BRAND SUCCESS ===");
      console.log("Updated brand:", {
        id: brand.id,
        name: brand.name,
        hasIconImage: !!brand.icon_image
      });
      
      res.json({
        success: true,
        message: 'Brand updated successfully',
        data: brand
      });
    } catch (error) {
      console.error('Update brand error:', error);
      
      let statusCode = 500;
      let errorMessage = error.message || 'Failed to update brand';
      
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
  }

  // Delete brand
  static async deleteBrand(req, res) {
    try {
      console.log("=== DELETE BRAND REQUEST ===");
      const { id } = req.params;
      console.log("Brand ID to delete:", id);

      // Delete brand
      const deletedBrand = await Brand.delete(id);

      if (!deletedBrand) {
        return res.status(404).json({ 
          success: false,
          error: 'Brand not found' 
        });
      }

      console.log("=== DELETE BRAND SUCCESS ===");

      res.json({
        success: true,
        message: 'Brand deleted successfully',
        data: {
          id: deletedBrand.id,
          name: deletedBrand.name
        }
      });
    } catch (error) {
      console.error('Delete brand error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to delete brand' 
      });
    }
  }
}

module.exports = BrandController;
