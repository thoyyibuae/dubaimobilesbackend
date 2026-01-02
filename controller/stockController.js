const Stock = require("../models/stock_model");

exports.createStock = async (req, res) => {
    try {
        const body = req.body;
// const createdBy= req.user.userId;

 const createdBy = req.user.userId;

        console.log("Received body:", body); // Check what's in body
        console.log("User ID (createdBy):", createdBy);

console.log("created stock user :"+createdBy);

        const images = req.files?.map(file => `/uploads/stocks/${file.filename}`) || [];
        const specifications = body.specifications ? JSON.parse(body.specifications) : {};

        const stock = {
            ...body,
            images,
            specifications,
         created_by: createdBy  // Use snake_case to match database column

        };


        const created = await Stock.create(stock);

        res.status(201).json({
            message: "Stock created successfully",
            data: created,
        });

    } catch (err) {
        console.error("Create stock error:", err);

        // ========================
        // 🎯 HANDLE UNIQUE SKU ERROR
        // ========================
        if (err.code === "23505" && err.constraint === "stocks_sku_key") {
            return res.status(400).json({
                status: false,
                message: "SKU already exists",
                field: "sku",
                existingValue: err.detail.match(/\((.*?)\)/g)[1].replace(/[()]/g, "")
            });
        }

        // Default error
        res.status(500).json({
            status: false,
            message: "Failed to create stock",
            error: err.message
        });
    }
};





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

        return res.status(200).json({
            status: true,
            message: "Stocks fetched successfully",
            data,
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

        // Calculate totalPages properly
        const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;

        return res.status(200).json({
            status: true,
            message: "Stocks fetched successfully",
            data,
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
        

        // Calculate totalPages properly
        const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;

        return res.status(200).json({
            status: true,
            message: "Stocks fetched successfully",
            data,
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




exports.getStockById = async (req, res) => {
    try {
        const data = await Stock.getById(req.params.id);
        if (!data) return res.status(404).json({ message: "Stock not found" });

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch stock" });
    }
};

exports.updateStock = async (req, res) => {
    try {
        const body = req.body;

        // Debug logging
        console.log('Update request body:', body);
        console.log('Update request params:', req.params);
        console.log('Files:', req.files);

        // Handle images - keep existing if no new images uploaded
        let images = [];
        
        // Parse existing images if provided as string
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
        
        // If new files are uploaded, use them
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => `/uploads/stocks/${file.filename}`);
            images = [...images, ...newImages]; // Combine existing and new images
        }
        
        // Parse specifications if provided
        const specifications = body.specifications
            ? (typeof body.specifications === 'string' 
                ? JSON.parse(body.specifications) 
                : body.specifications)
            : {};

        // Prepare stock object with proper field names
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
            specifications: specifications
        };

        console.log('Stock object for update:', stock);
        
        // Update the stock
        const updated = await Stock.update(req.params.id, stock);
        
        // Get the updated record with basic details
        const fullRecord = await Stock.findByIdWithBasicDetails(updated.id);

        res.json({
            message: "Stock updated successfully",
            data: fullRecord,
        });
    } catch (err) {
        console.error('Update stock error:', err.message);
        console.error('Error stack:', err.stack);
        res.status(500).json({ 
            error: "Failed to update stock",
            details: err.message 
        });
    }
};



exports.deleteStock = async (req, res) => {
    try {
        await Stock.delete(req.params.id);
        res.json({ message: "Stock deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete stock" });
    }
};
