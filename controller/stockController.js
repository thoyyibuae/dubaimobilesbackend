const Stock = require("../models/stock_model");



// exports.createStock = async (req, res) => {
//     try {
//         const body = req.body;
// // const createdBy= req.user.userId;

//  const createdBy = req.user.userId;

//         console.log("Received body:", body); // Check what's in body
//         console.log("User ID (createdBy):", createdBy);

// console.log("created stock user :"+createdBy);

//         const images = req.files?.map(file => `/uploads/stocks/${file.filename}`) || [];
//         const specifications = body.specifications ? JSON.parse(body.specifications) : {};

//         const stock = {
//             ...body,
//             images,
//             specifications,
//          created_by: createdBy  // Use snake_case to match database column

//         };


//         const created = await Stock.create(stock);

//         res.status(201).json({
//             message: "Stock created successfully",
//             data: created,
//         });

//     } catch (err) {
//         console.error("Create stock error:", err);

//         // ========================
//         // 🎯 HANDLE UNIQUE SKU ERROR
//         // ========================
//         if (err.code === "23505" && err.constraint === "stocks_sku_key") {
//             return res.status(400).json({
//                 status: false,
//                 message: "SKU already exists",
//                 field: "sku",
//                 existingValue: err.detail.match(/\((.*?)\)/g)[1].replace(/[()]/g, "")
//             });
//         }

//         // Default error
//         res.status(500).json({
//             status: false,
//             message: "Failed to create stock",
//             error: err.message
//         });
//     }
// };

exports.createStock = async (req, res) => {
    try {
        const body = req.body;
        const createdBy = req.user.userId;

        console.log("Received body:", body);
        console.log("User ID (createdBy):", createdBy);


        const images = req.files?.map(file => `/uploads/stocks/${file.filename}`) || [];
        
        const specifications = body.specifications ? JSON.parse(body.specifications) : {};

        // ==============================================
        // 🎯 FIXED: Simple qrcodelist parsing
        // ==============================================
        let qrcodelist = [];
        if (body.qrcodelist) {
            console.log("Raw qrcodelist input:", body.qrcodelist);
            
            if (Array.isArray(body.qrcodelist)) {
                qrcodelist = body.qrcodelist;
            } else if (typeof body.qrcodelist === 'string') {
                // Clean the string: remove quotes and brackets
                let cleanString = body.qrcodelist.replace(/[\[\]"]/g, '');
                // Split by comma and clean
                qrcodelist = cleanString.split(',')
                    .map(item => item.trim())
                    .filter(item => item.length > 0);
            }
        }

        const stock = {
            ...body,
            images,
            specifications,
            qrcodelist, // 🎯 FIXED: Clean array
            created_by: createdBy
        };

        console.log("QR Code List to be saved:", qrcodelist);

        const created = await Stock.create(stock);

        // 🎯 FIX: Ensure response has proper qrcodelist format
        const responseData = {
            ...created,
            qrcodelist: created.qrcodelist || []  // Ensure it's always an array in response
        };

        res.status(201).json({
            message: "Stock created successfully",
            data: responseData,  // 🎯 Use fixed response data
        });

    } catch (err) {
        console.error("Create stock error:", err);

        if (err.code === "23505" && err.constraint === "stocks_sku_key") {
            return res.status(400).json({
                status: false,
                message: "SKU already exists",
                field: "sku",
                existingValue: err.detail.match(/\((.*?)\)/g)[1].replace(/[()]/g, "")
            });
        }

        res.status(500).json({
            status: false,
            message: "Failed to create stock",
            error: err.message
        });
    }
};


exports.updateStock = async (req, res) => {
    try {
        const body = req.body;

        console.log('Update request body:', body);
        console.log('Update request params:', req.params);

        // Handle images
        let images = [];
        if (body.images) {
            if (typeof body.images === 'string') {
                try {
                    images = JSON.parse(body.images);
                } catch (e) {
                    images = [body.images];
                }
            } else if (Array.isArray(body.images)) {
                images = body.images;
            }
        }
        
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => `/uploads/stocks/${file.filename}`);
            images = [...images, ...newImages];
        }
        
        // Parse specifications
        const specifications = body.specifications
            ? (typeof body.specifications === 'string' 
                ? JSON.parse(body.specifications) 
                : body.specifications)
            : {};

        // ==============================================
        // 🎯 FIXED: Simple qrcodelist parsing for update
        // ==============================================
        let qrcodelist = [];
        if (body.qrcodelist !== undefined) {
            console.log("Update - Raw qrcodelist input:", body.qrcodelist);
            
            if (Array.isArray(body.qrcodelist)) {
                qrcodelist = body.qrcodelist;
            } else if (typeof body.qrcodelist === 'string') {
                // Clean the string: remove quotes and brackets
                let cleanString = body.qrcodelist.replace(/[\[\]"]/g, '');
                // Split by comma and clean
                qrcodelist = cleanString.split(',')
                    .map(item => item.trim())
                    .filter(item => item.length > 0);
            }
        }

        // Prepare stock object
        const stock = {
            name: body.name,
            sku: body.sku,
            description: body.description,
            category_id: parseInt(body.category_id) || null,
            brand_id: parseInt(body.brand_id) || null,
            branch_id: parseInt(body.branch_id) || null,
            supplier_id: parseInt(body.supplier_id) || null,
            cost_price: parseFloat(body.cost_price) || 0.0,
            selling_price: parseFloat(body.selling_price) || 0.0,
            dealer_price: parseFloat(body.dealer_price) || 0.0,
            shop_price: parseFloat(body.shop_price) || 0.0,
            quantity: parseInt(body.quantity) || 0,
            low_stock_threshold: parseInt(body.low_stock_threshold) || 0,
            unit: body.unit || 'pcs',
            status: body.status || 'active',
            images: images,
            specifications: specifications,
            qrcodelist: qrcodelist // 🎯 FIXED
        };

        console.log('QR Code List for update:', qrcodelist);
        
        // Update the stock
        const updated = await Stock.update(req.params.id, stock);
        
        // Get the updated record
        const fullRecord = await Stock.findByIdWithBasicDetails(updated.id);

        // 🎯 FIX: Ensure response has proper qrcodelist format
        const responseData = {
            ...fullRecord,
            qrcodelist: fullRecord.qrcodelist || []  // Ensure it's always an array in response
        };

        res.json({
            message: "Stock updated successfully",
            data: responseData,  // 🎯 Use fixed response data
        });
    } catch (err) {
        console.error('Update stock error:', err.message);
        res.status(500).json({ 
            error: "Failed to update stock",
            details: err.message 
        });
    }
};


// exports.getStocks = async (req, res) => {
//     try {
//         const page = parseInt(req.query.page) || 1;
//         const limit = parseInt(req.query.limit);
//         const search = req.query.search || "";
//         const branchId = req.query.branchId || null;
//         const categoryId = req.query.categoryId || null;
//         const brandId = req.query.brandId || null;
//         const supplierId = req.query.supplierId || null;
        
//         // Get created_by from authenticated user
//         const createdBy = req.user.userId;
        
//         // Check if user is admin (you need to set this in your auth middleware)
//         const isAdmin = req.user.role === 'admin'; // or whatever logic you have
        
//         console.log(`Fetching stocks for ${isAdmin ? 'admin' : 'user'} ID: ${createdBy}`);
        
//         const offset = (page - 1) * limit;

//         // Call model function with createdBy and isAdmin flag
//         const { data, total, statistics } = await Stock.getAll({ 
//             search, 
//             branchId, 
//             categoryId, 
//             brandId, 
//             supplierId, 
//             offset, 
//             limit,
//             createdBy,
//             isAdmin  // Pass isAdmin flag
//         });

//         return res.status(200).json({
//             status: true,
//             message: "Stocks fetched successfully",
//             data,
//             pagination: {
//                 page,
//                 limit,
//                 total,
//                 totalPages: Math.ceil(total / limit),
//                 hasMore: page < Math.ceil(total / limit),
//                 outOfStock: statistics.outOfStock,
//                 lowStock: statistics.lowStock,
//                 totalStockValue: statistics.totalStockValue
//             }
//         });

//     } catch (err) {
//         console.error("Get stocks error:", err);
//         return res.status(500).json({
//             status: false,
//             message: "Failed to fetch stocks",
//             error: err.message
//         });
//     }
// };


// exports.getbranchwiseStocks = async (req, res) => {
//     try {
//         const page = parseInt(req.query.page) || 1;
//         const limit = parseInt(req.query.limit); // Add default value here
//         const search = req.query.search || "";
//         const branchId = req.params.id || null;
//         const categoryId = req.query.categoryId || null;
//         const brandId = req.query.brandId || null;
//         const supplierId = req.query.supplierId || null;
        
//         // Get created_by from authenticated user
//         const createdBy = req.user.userId;
        
//         // Check if user is admin (you need to set this in your auth middleware)
//         const isAdmin = req.user.role === 'admin'; // or whatever logic you have
        
//         console.log(`Fetching stocks for ${isAdmin ? 'admin' : 'user'} ID: ${createdBy}`);
        
//         const offset = (page - 1) * limit;

//         // Call model function with createdBy and isAdmin flag
//         const { data, total, statistics } = await Stock.getBranchStocks({ 
//             search, 
//             branchId, 
//             categoryId, 
//             brandId, 
//             supplierId, 
//             offset, 
//             limit,
//             createdBy,
//             isAdmin  // Pass isAdmin flag
//         });

//         // Calculate totalPages properly
//         const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;

//         return res.status(200).json({
//             status: true,
//             message: "Stocks fetched successfully",
//             data,
//             pagination: {
//                 page,
//                 limit: limit, // Use the parsed limit
//                 total,
//                 totalPages: totalPages, // Use calculated totalPages
//                 hasMore: page < totalPages,
//                 outOfStock: statistics.outOfStock,
//                 lowStock: statistics.lowStock,
//                 totalStockValue: statistics.totalStockValue
//             }
//         });

//     } catch (err) {
//         console.error("Get stocks error:", err);
//         return res.status(500).json({
//             status: false,
//             message: "Failed to fetch stocks",
//             error: err.message
//         });
//     }
// };




// exports.getbranchwiselowStocks = async (req, res) => {
//     try {
//         const page = parseInt(req.query.page) || 1;
//         const limit = parseInt(req.query.limit); // Add default value here
//         const search = req.query.search || "";
//         const branchId = req.params.id || null;
//         const categoryId = req.query.categoryId || null;
//         const brandId = req.query.brandId || null;
//         const supplierId = req.query.supplierId || null;
        
//         // Get created_by from authenticated user
//         const createdBy = req.user.userId;
        
//         // Check if user is admin (you need to set this in your auth middleware)
//         const isAdmin = req.user.role === 'admin'; // or whatever logic you have
        
//         console.log(`Fetching stocks for ${isAdmin ? 'admin' : 'user'} ID: ${createdBy}`);
        
//         const offset = (page - 1) * limit;

//         // Call model function with createdBy and isAdmin flag
//         const { data, total, statistics } = await Stock.getBranchLowStocks({ 
//             search, 
//             branchId, 
//             categoryId, 
//             brandId, 
//             supplierId, 
//             offset, 
//             limit,
//             createdBy,
//             isAdmin  // Pass isAdmin flag
//         });
        

//         // Calculate totalPages properly
//         const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;

//         return res.status(200).json({
//             status: true,
//             message: "Stocks fetched successfully",
//             data,
//             pagination: {
//                 page,
//                 limit: limit, // Use the parsed limit
//                 total,
//                 totalPages: totalPages, // Use calculated totalPages
//                 hasMore: page < totalPages,
//                 outOfStock: statistics.outOfStock,
//                 lowStock: statistics.lowStock,
//                 totalStockValue: statistics.totalStockValue
//             }
//         });

//     } catch (err) {
//         console.error("Get stocks error:", err);
//         return res.status(500).json({
//             status: false,
//             message: "Failed to fetch stocks",
//             error: err.message
//         });
//     }
// };


exports.getStocks = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit);
        const search = req.query.search || "";
        const branchId = req.query.branchId || null;
        const categoryId = req.query.categoryId || null;
        const brandId = req.query.brandId || null;
        const supplierId = req.query.supplierId || null;
        
        // Get created_by from authenticated user
        const createdBy = req.user.userId;
        
        // Check if user is admin (you need to set this in your auth middleware)
        const isAdmin = req.user.role === 'admin'; // or whatever logic you have
        
        console.log(`Fetching stocks for ${isAdmin ? 'admin' : 'user'} ID: ${createdBy}`);
        
        const offset = (page - 1) * limit;

        // Call model function with createdBy and isAdmin flag
        const { data, total, statistics } = await Stock.getAll({ 
            search, 
            branchId, 
            categoryId, 
            brandId, 
            supplierId, 
            offset, 
            limit,
            createdBy,
            isAdmin  // Pass isAdmin flag
        });

        // ==============================================
        // 🎯 ADDED: Process each stock to include qrcodelist properly
        // ==============================================
        const processedData = data.map(stock => {
            // Ensure qrcodelist is properly formatted as array
            let qrcodelist = [];
            if (stock.qrcodelist) {
                if (Array.isArray(stock.qrcodelist)) {
                    qrcodelist = stock.qrcodelist;
                } else if (typeof stock.qrcodelist === 'string') {
                    try {
                        qrcodelist = JSON.parse(stock.qrcodelist);
                    } catch (e) {
                        // If already a string representation of array, just use it
                        qrcodelist = stock.qrcodelist;
                    }
                }
            }
            
            return {
                ...stock,
                qrcodelist: qrcodelist, // 🎯 Ensure qrcodelist is included
                qrcode_count: Array.isArray(qrcodelist) ? qrcodelist.length : 0 // Optional: add count
            };
        });

        return res.status(200).json({
            status: true,
            message: "Stocks fetched successfully",
            data: processedData, // 🎯 Use processed data with qrcodelist
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasMore: page < Math.ceil(total / limit),
                outOfStock: statistics.outOfStock,
                lowStock: statistics.lowStock,
                totalStockValue: statistics.totalStockValue
            }
        });

    } catch (err) {
        console.error("Get stocks error:", err);
        return res.status(500).json({
            status: false,
            message: "Failed to fetch stocks",
            error: err.message
        });
    }
};


exports.getbranchwiseStocks = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit); // Add default value here
        const search = req.query.search || "";
        const branchId = req.params.id || null;
        const categoryId = req.query.categoryId || null;
        const brandId = req.query.brandId || null;
        const supplierId = req.query.supplierId || null;
        
        // Get created_by from authenticated user
        const createdBy = req.user.userId;
        
        // Check if user is admin (you need to set this in your auth middleware)
        const isAdmin = req.user.role === 'admin'; // or whatever logic you have
        
        console.log(`Fetching stocks for ${isAdmin ? 'admin' : 'user'} ID: ${createdBy}`);
        
        const offset = (page - 1) * limit;

        // Call model function with createdBy and isAdmin flag
        const { data, total, statistics } = await Stock.getBranchStocks({ 
            search, 
            branchId, 
            categoryId, 
            brandId, 
            supplierId, 
            offset, 
            limit,
            createdBy,
            isAdmin  // Pass isAdmin flag
        });

        // ==============================================
        // 🎯 ADDED: Process each stock to include qrcodelist properly
        // ==============================================
        const processedData = data.map(stock => {
            // Ensure qrcodelist is properly formatted as array
            let qrcodelist = [];
            if (stock.qrcodelist) {
                if (Array.isArray(stock.qrcodelist)) {
                    qrcodelist = stock.qrcodelist;
                } else if (typeof stock.qrcodelist === 'string') {
                    try {
                        qrcodelist = JSON.parse(stock.qrcodelist);
                    } catch (e) {
                        // If already a string representation of array, just use it
                        qrcodelist = stock.qrcodelist;
                    }
                }
            }
            
            return {
                ...stock,
                qrcodelist: qrcodelist, // 🎯 Ensure qrcodelist is included
                qrcode_count: Array.isArray(qrcodelist) ? qrcodelist.length : 0 // Optional: add count
            };
        });

        // Calculate totalPages properly
        const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;

        return res.status(200).json({
            status: true,
            message: "Stocks fetched successfully",
            data: processedData, // 🎯 Use processed data with qrcodelist
            pagination: {
                page,
                limit: limit, // Use the parsed limit
                total,
                totalPages: totalPages, // Use calculated totalPages
                hasMore: page < totalPages,
                outOfStock: statistics.outOfStock,
                lowStock: statistics.lowStock,
                totalStockValue: statistics.totalStockValue
            }
        });

    } catch (err) {
        console.error("Get stocks error:", err);
        return res.status(500).json({
            status: false,
            message: "Failed to fetch stocks",
            error: err.message
        });
    }
};


exports.getbranchwiselowStocks = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit); // Add default value here
        const search = req.query.search || "";
        const branchId = req.params.id || null;
        const categoryId = req.query.categoryId || null;
        const brandId = req.query.brandId || null;
        const supplierId = req.query.supplierId || null;
        
        // Get created_by from authenticated user
        const createdBy = req.user.userId;
        
        // Check if user is admin (you need to set this in your auth middleware)
        const isAdmin = req.user.role === 'admin'; // or whatever logic you have
        
        console.log(`Fetching stocks for ${isAdmin ? 'admin' : 'user'} ID: ${createdBy}`);
        
        const offset = (page - 1) * limit;

        // Call model function with createdBy and isAdmin flag
        const { data, total, statistics } = await Stock.getBranchLowStocks({ 
            search, 
            branchId, 
            categoryId, 
            brandId, 
            supplierId, 
            offset, 
            limit,
            createdBy,
            isAdmin  // Pass isAdmin flag
        });

        // ==============================================
        // 🎯 ADDED: Process each stock to include qrcodelist properly
        // ==============================================
        const processedData = data.map(stock => {
            // Ensure qrcodelist is properly formatted as array
            let qrcodelist = [];
            if (stock.qrcodelist) {
                if (Array.isArray(stock.qrcodelist)) {
                    qrcodelist = stock.qrcodelist;
                } else if (typeof stock.qrcodelist === 'string') {
                    try {
                        qrcodelist = JSON.parse(stock.qrcodelist);
                    } catch (e) {
                        // If already a string representation of array, just use it
                        qrcodelist = stock.qrcodelist;
                    }
                }
            }
            
            return {
                ...stock,
                qrcodelist: qrcodelist, // 🎯 Ensure qrcodelist is included
                qrcode_count: Array.isArray(qrcodelist) ? qrcodelist.length : 0 // Optional: add count
            };
        });

        // Calculate totalPages properly
        const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;

        return res.status(200).json({
            status: true,
            message: "Stocks fetched successfully",
            data: processedData, // 🎯 Use processed data with qrcodelist
            pagination: {
                page,
                limit: limit, // Use the parsed limit
                total,
                totalPages: totalPages, // Use calculated totalPages
                hasMore: page < totalPages,
                outOfStock: statistics.outOfStock,
                lowStock: statistics.lowStock,
                totalStockValue: statistics.totalStockValue
            }
        });

    } catch (err) {
        console.error("Get stocks error:", err);
        return res.status(500).json({
            status: false,
            message: "Failed to fetch stocks",
            error: err.message
        });
    }
};


// exports.getStockById = async (req, res) => {
//     try {
//         const data = await Stock.getById(req.params.id);
//         if (!data) return res.status(404).json({ message: "Stock not found" });

//         res.json(data);
//     } catch (err) {
//         res.status(500).json({ error: "Failed to fetch stock" });
//     }
// };

// exports.updateStock = async (req, res) => {
//     try {
//         const body = req.body;

//         // Debug logging
//         console.log('Update request body:', body);
//         console.log('Update request params:', req.params);
//         console.log('Files:', req.files);

//         // Handle images - keep existing if no new images uploaded
//         let images = [];
        
//         // Parse existing images if provided as string
//         if (body.images) {
//             if (typeof body.images === 'string') {
//                 try {
//                     images = JSON.parse(body.images);
//                 } catch (e) {
//                     images = [body.images];
//                 }
//             } else if (Array.isArray(body.images)) {
//                 images = body.images;
//             }
//         }
        
//         // If new files are uploaded, use them
//         if (req.files && req.files.length > 0) {
//             const newImages = req.files.map(file => `/uploads/stocks/${file.filename}`);
//             images = [...images, ...newImages]; // Combine existing and new images
//         }
        
//         // Parse specifications if provided
//         const specifications = body.specifications
//             ? (typeof body.specifications === 'string' 
//                 ? JSON.parse(body.specifications) 
//                 : body.specifications)
//             : {};

//         // Prepare stock object with proper field names
//         const stock = {
//             name: body.name,
//             sku: body.sku,
//             description: body.description,
//             category_id: parseInt(body.category_id) || null,
//             brand_id: parseInt(body.brand_id) || null,
//             branch_id: parseInt(body.branch_id) || null,
//             supplier_id: parseInt(body.supplier_id) || null,
//             cost_price: parseFloat(body.cost_price) || 0.0,
//             selling_price: parseFloat(body.selling_price) || 0.0,
//             dealer_price: parseFloat(body.dealer_price) || 0.0,
//             shop_price: parseFloat(body.shop_price) || 0.0,
//             quantity: parseInt(body.quantity) || 0,
//             low_stock_threshold: parseInt(body.low_stock_threshold) || 0,
//             unit: body.unit || 'pcs',
//             status: body.status || 'active',
//             images: images,
//             specifications: specifications
//         };

//         console.log('Stock object for update:', stock);
        
//         // Update the stock
//         const updated = await Stock.update(req.params.id, stock);
        
//         // Get the updated record with basic details
//         const fullRecord = await Stock.findByIdWithBasicDetails(updated.id);

//         res.json({
//             message: "Stock updated successfully",
//             data: fullRecord,
//         });
//     } catch (err) {
//         console.error('Update stock error:', err.message);
//         console.error('Error stack:', err.stack);
//         res.status(500).json({ 
//             error: "Failed to update stock",
//             details: err.message 
//         });
//     }
// };


// exports.deleteStock = async (req, res) => {
//     try {
//         await Stock.delete(req.params.id);
//         res.json({ message: "Stock deleted successfully" });
//     } catch (err) {
//         res.status(500).json({ error: "Failed to delete stock" });
//     }
// };





exports.getStockById = async (req, res) => {
    try {
        const data = await Stock.getById(req.params.id);
        if (!data) return res.status(404).json({ message: "Stock not found" });

        // ==============================================
        // 🎯 ADDED: Process stock to include qrcodelist properly
        // ==============================================
        let qrcodelist = [];
        if (data.qrcodelist) {
            if (Array.isArray(data.qrcodelist)) {
                qrcodelist = data.qrcodelist;
            } else if (typeof data.qrcodelist === 'string') {
                try {
                    qrcodelist = JSON.parse(data.qrcodelist);
                } catch (e) {
                    // If already a string representation of array, just use it
                    qrcodelist = data.qrcodelist;
                }
            }
        }

        const processedData = {
            ...data,
            qrcodelist: qrcodelist, // 🎯 Ensure qrcodelist is included
            qrcode_count: Array.isArray(qrcodelist) ? qrcodelist.length : 0 // Optional: add count
        };

        res.json(processedData); // 🎯 Return processed data with qrcodelist
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch stock" });
    }
};



exports.deleteStock = async (req, res) => {
    try {
        const stockId = req.params.id;
        
        // ==============================================
        // 🎯 OPTIONAL: Get stock details before deletion
        // (including qrcodelist for logging purposes)
        // ==============================================
        const stockBeforeDelete = await Stock.getById(stockId);
        
        await Stock.delete(stockId);
        
        // ==============================================
        // 🎯 OPTIONAL: Include qrcodelist in response if needed
        // ==============================================
        let deletedQRInfo = null;
        if (stockBeforeDelete && stockBeforeDelete.qrcodelist) {
            let qrcodelist = [];
            if (Array.isArray(stockBeforeDelete.qrcodelist)) {
                qrcodelist = stockBeforeDelete.qrcodelist;
            } else if (typeof stockBeforeDelete.qrcodelist === 'string') {
                try {
                    qrcodelist = JSON.parse(stockBeforeDelete.qrcodelist);
                } catch (e) {
                    qrcodelist = stockBeforeDelete.qrcodelist;
                }
            }
            deletedQRInfo = {
                qrcode_count: Array.isArray(qrcodelist) ? qrcodelist.length : 0,
                had_qrcodes: Array.isArray(qrcodelist) && qrcodelist.length > 0
            };
        }

        const response = {
            message: "Stock deleted successfully",
            deleted_stock_id: stockId
        };

        // ==============================================
        // 🎯 ADDED: Include QR code info in response
        // ==============================================
        if (deletedQRInfo) {
            response.deleted_qr_info = deletedQRInfo;
        }

        res.json(response);
    } catch (err) {
        res.status(500).json({ error: "Failed to delete stock" });
    }
};











// Add to stock_controller.js
exports.checkSingleQRCode = async (req, res) => {
    try {
        const { qrcode } = req.body;
        
        // Validate input
        if (!qrcode || typeof qrcode !== 'string' || qrcode.trim().length === 0) {
            return res.status(400).json({
                status: false,
                message: "QR code is required and must be a non-empty string",
                example: { "qrcode": "qr_09" }
            });
        }
        
        // Clean the QR code
        const cleanedQRCode = qrcode
            .replace(/[\[\]"]/g, '') // Remove brackets and quotes
            .trim();
        
        console.log(`Checking QR code: "${cleanedQRCode}"`);
        
        // Check QR code existence with all relations
        const qrResult = await Stock.findQRCodeWithRelations(cleanedQRCode);
        
        // Prepare response data
        const response = {
            status: true,
            qrExist: qrResult.qrExist,
            message: qrResult.exists 
                ? `QR code "${cleanedQRCode}" found in ${qrResult.total_stocks} stock(s)` 
                : `QR code "${cleanedQRCode}" does not exist in any stock`,
            data: {
                qrcode: qrResult.qrcode,
                exists: qrResult.exists,
                found_in_stocks: qrResult.total_stocks,
                checked_at: qrResult.found_at,
                stocks: qrResult.stocks.map(stock => ({
                    stock_id: stock.id,
                    stock_name: stock.name,
                    stock_sku: stock.sku,
                    status: stock.status,
                    quantity: stock.quantity,
                    branch: stock.branch_name || 'N/A',
                    brand: stock.brand_name || 'N/A',
                    category: stock.category_name || 'N/A',
                    supplier: stock.supplier_name || 'N/A',
                    created_by: stock.creator_name || stock.created_by,
                    created_at: stock.created_at,
                    qrcodelist: stock.qrcodelist || []
                }))
            }
        };
        
        // If QR code exists, add summary information
        if (qrResult.exists) {
            response.data.summary = {
                total_quantity: qrResult.stocks.reduce((sum, stock) => sum + (stock.quantity || 0), 0),
                active_stocks: qrResult.stocks.filter(s => s.status === 'active').length,
                inactive_stocks: qrResult.stocks.filter(s => s.status !== 'active').length,
                out_of_stock: qrResult.stocks.filter(s => (s.quantity || 0) <= 0).length,
                low_stock: qrResult.stocks.filter(s => {
                    const qty = s.quantity || 0;
                    const threshold = s.low_stock_threshold || 0;
                    return qty > 0 && qty <= threshold;
                }).length
            };
        }
        
        return res.status(200).json(response);
        
    } catch (err) {
        console.error('Check single QR code error:', err.message);
        return res.status(500).json({
            status: false,
            message: "Failed to check QR code",
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
};
