const Stock = require("../models/stock_model");

exports.createStock = async (req, res) => {
    try {
        const body = req.body;

        const images = req.files?.map(file => `/uploads/stocks/${file.filename}`) || [];
        const specifications = body.specifications ? JSON.parse(body.specifications) : {};

        const stock = {
            ...body,
            images,
            specifications
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
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || "";
        const branchId = req.query.branchId || null;
        const categoryId = req.query.categoryId || null;
        const brandId = req.query.brandId || null;
         const suppilerId = req.query.suppilerId || null;

        const offset = (page - 1) * limit;

        // Call model function with filters
        const { data, total } = await Stock.getAll({ search, branchId, categoryId, brandId,suppilerId, offset, limit });

        return res.status(200).json({
            status: true,
            message: "Stocks fetched successfully",
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasMore: page < Math.ceil(total / limit)
            },
            filters: {
                search: search || null,
                branchId: branchId || null,
                categoryId: categoryId || null,
                 suppilerId: suppilerId || null,
                brandId: brandId || null
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

        const images =
            req.files?.map(file => `/uploads/stocks/${file.filename}`) || [];

        const specifications = body.specifications
            ? JSON.parse(body.specifications)
            : {};

        const stock = {
            ...body,
            images,
            specifications
        };

        const updated = await Stock.update(req.params.id, stock);

        res.json({
            message: "Stock updated successfully",
            data: updated,
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to update stock" });
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
