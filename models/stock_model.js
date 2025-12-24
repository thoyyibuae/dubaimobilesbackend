const pool = require("../config/database");


module.exports = {


    async create(stock) {
        const query = `
            INSERT INTO stocks (
              name, sku, description, category_id, brand_id, branch_id,
              supplier_id, cost_price, selling_price, dealer_price, shop_price,
              quantity, low_stock_threshold, unit, status, images,
              specifications,
              created_by
            ) VALUES (
              $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
            ) RETURNING *;
        `;

    const createdBy = stock.created_by || stock.createdBy;


    
        const values = [
            stock.name,
            stock.sku,
            stock.description,
            stock.category_id,
            stock.brand_id,
            stock.branch_id,
            stock.supplier_id,
            stock.cost_price,
            stock.selling_price,
            stock.dealer_price,
            stock.shop_price,
            stock.quantity,
            stock.low_stock_threshold,
            stock.unit,
            stock.status,
            stock.images,
            stock.specifications,
        createdBy  // Use the resolved value
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    },

        // models/Stock.js
// async getAll({ search, branchId, categoryId, brandId, supplierId, offset, limit }) {
//     try {
//         let query = `
//             SELECT 
//                 s.*,
//                 b.name AS brand_name,
//                 c.name AS category_name,
//                 br.name AS branch_name,
//                 sp.name AS supplier_name
//             FROM stocks s
//             LEFT JOIN brands b ON s.brand_id = b.id
//             LEFT JOIN categories c ON s.category_id = c.id
//             LEFT JOIN branches br ON s.branch_id = br.id
//             LEFT JOIN suppliers sp ON s.supplier_id = sp.id
//             WHERE 1 = 1
//         `;

//         const params = [];
//         let paramCount = 1;

//         // Search filter
//         if (search && search.trim() !== "") {
//             query += ` AND (
//                 s.name ILIKE $${paramCount} OR
//                 s.sku ILIKE $${paramCount}
//             )`;
//             params.push(`%${search.trim()}%`);
//             paramCount++;
//         }

//         // Branch filter
//         if (branchId) {
//             query += ` AND s.branch_id = $${paramCount}`;
//             params.push(branchId);
//             paramCount++;
//         }

//         // Category filter
//         if (categoryId) {
//             query += ` AND s.category_id = $${paramCount}`;
//             params.push(categoryId);
//             paramCount++;
//         }

//         // Brand filter
//         if (brandId) {
//             query += ` AND s.brand_id = $${paramCount}`;
//             params.push(brandId);
//             paramCount++;
//         }

//         // Supplier filter
//         if (supplierId) {
//             query += ` AND s.supplier_id = $${paramCount}`;
//             params.push(supplierId);
//             paramCount++;
//         }

//         // ORDER BY
//         query += ` ORDER BY s.id DESC`;

//         // Build count query BEFORE adding limit/offset
//         const countQuery = `
//             SELECT COUNT(*) AS total
//             FROM (${query}) AS sub
//         `;

//         const countResult = await pool.query(countQuery, params);
//         const total = parseInt(countResult.rows[0].total, 10);

//         // Add pagination
//         query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
//         params.push(limit, offset);

//         // Fetch data
//         const dataResult = await pool.query(query, params);

//         // Format result
//         const data = dataResult.rows.map(row => ({
//             id: row.id,
//             name: row.name,
//             sku: row.sku,
//             description: row.description,
//             category_id: row.category_id,
//             brand_id: row.brand_id,
//             branch_id: row.branch_id,
//             supplier_id: row.supplier_id,
//             cost_price: row.cost_price,
//             selling_price: row.selling_price,
//             dealer_price: row.dealer_price,
//             shop_price: row.shop_price,
//             quantity: row.quantity,
//             low_stock_threshold: row.low_stock_threshold,
//             unit: row.unit,
//             status: row.status,
//             images: row.images || [],
//             specifications: row.specifications || {},
//             created_at: row.created_at,
//             updated_at: row.updated_at,

            
//             // Related joins
//             brand: row.brand_id ? { id: row.brand_id, name: row.brand_name } : null,
//             category: row.category_id ? { id: row.category_id, name: row.category_name } : null,
//             branch: row.branch_id ? { id: row.branch_id, name: row.branch_name } : null,
//             supplier: row.supplier_id ? { id: row.supplier_id, name: row.supplier_name } : null
//         }));

//         return { data, total };

//     } catch (error) {
//         console.error("Get all stocks error:", error);
//         throw error;
//     }
// },


// async getAll({ search, branchId, categoryId, brandId, supplierId, offset, limit }) {
//     try {
//         let query = `
//             SELECT 
//                 s.*,
//                 b.name AS brand_name,
//                 c.name AS category_name,
//                 br.name AS branch_name,
//                 sp.name AS supplier_name
//             FROM stocks s
//             LEFT JOIN brands b ON s.brand_id = b.id
//             LEFT JOIN categories c ON s.category_id = c.id
//             LEFT JOIN branches br ON s.branch_id = br.id
//             LEFT JOIN suppliers sp ON s.supplier_id = sp.id
//             WHERE 1 = 1
//         `;

//         const params = [];
//         let paramCount = 1;

//         // Search filter
//         if (search && search.trim() !== "") {
//             query += ` AND (
//                 s.name ILIKE $${paramCount} OR
//                 s.sku ILIKE $${paramCount}
//             )`;
//             params.push(`%${search.trim()}%`);
//             paramCount++;
//         }

//         // Branch filter
//         if (branchId) {
//             query += ` AND s.branch_id = $${paramCount}`;
//             params.push(branchId);
//             paramCount++;
//         }

//         // Category filter
//         if (categoryId) {
//             query += ` AND s.category_id = $${paramCount}`;
//             params.push(categoryId);
//             paramCount++;
//         }

//         // Brand filter
//         if (brandId) {
//             query += ` AND s.brand_id = $${paramCount}`;
//             params.push(brandId);
//             paramCount++;
//         }

//         // Supplier filter
//         if (supplierId) {
//             query += ` AND s.supplier_id = $${paramCount}`;
//             params.push(supplierId);
//             paramCount++;
//         }

//         // ORDER BY
//         query += ` ORDER BY s.id DESC`;

//         // Get total count for pagination info (always needed)
//         const countQuery = `
//             SELECT COUNT(*) AS total
//             FROM (${query}) AS sub
//         `;

//         const countResult = await pool.query(countQuery, params);
//         const total = parseInt(countResult.rows[0].total, 10);

//         // Conditionally apply pagination
//         if (limit && limit > 0) {
//             // Apply pagination only if limit is provided and positive
//             query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
            
//             // Ensure offset has a default value if not provided
//             const offsetValue = offset || 0;
//             params.push(limit, offsetValue);
//             paramCount += 2; // Increment paramCount for the added parameters
//         }

//         // Fetch data
//         const dataResult = await pool.query(query, params);

//         // Format result
//         const data = dataResult.rows.map(row => ({
//             id: row.id,
//             name: row.name,
//             sku: row.sku,
//             description: row.description,
//             category_id: row.category_id,
//             brand_id: row.brand_id,
//             branch_id: row.branch_id,
//             supplier_id: row.supplier_id,
//             cost_price: row.cost_price,
//             selling_price: row.selling_price,
//             dealer_price: row.dealer_price,
//             shop_price: row.shop_price,
//             quantity: row.quantity,
//             low_stock_threshold: row.low_stock_threshold,
//             unit: row.unit,
//             status: row.status,
//             images: row.images || [],
//             specifications: row.specifications || {},
//             created_at: row.created_at,
//             updated_at: row.updated_at,

//             // Related joins
//             brand: row.brand_id ? { id: row.brand_id, name: row.brand_name } : null,
//             category: row.category_id ? { id: row.category_id, name: row.category_name } : null,
//             branch: row.branch_id ? { id: row.branch_id, name: row.branch_name } : null,
//             supplier: row.supplier_id ? { id: row.supplier_id, name: row.supplier_name } : null
//         }));

//         // Return pagination info even when not using limit
//         return {
//             data,
//             total,
//             pagination: {
//                 hasPagination: limit && limit > 0,
//                 limit: limit || null,
//                 offset: offset || 0,
//                 hasMore: limit && limit > 0 ? (total > (offset || 0) + limit) : false
//             }
//         };

//     } catch (error) {
//         console.error("Get all stocks error:", error);
//         throw error;
//     }
// },



// async getAll({ search, branchId, categoryId, brandId, supplierId, offset, limit,createdBy }) {
//     try {

//         let query = `
//             SELECT 
//                 s.*,
//                 b.name AS brand_name,
//                 c.name AS category_name,
//                 br.name AS branch_name,
//                 sp.name AS supplier_name
//             FROM stocks s
//             LEFT JOIN brands b ON s.brand_id = b.id
//             LEFT JOIN categories c ON s.category_id = c.id
//             LEFT JOIN branches br ON s.branch_id = br.id
//             LEFT JOIN suppliers sp ON s.supplier_id = sp.id
//          AND s.created_by = $1  -       
//         `;


//         const params = [];
//         let paramCount = 1;

//         // Search filter
//         if (search && search.trim() !== "") {
//             query += ` AND (
//                 s.name ILIKE $${paramCount} OR
//                 s.sku ILIKE $${paramCount}
//             )`;
//             params.push(`%${search.trim()}%`);
//             paramCount++;
//         }

//         // Branch filter
//         if (branchId) {
//             query += ` AND s.branch_id = $${paramCount}`;
//             params.push(branchId);
//             paramCount++;
//         }

//         // Category filter
//         if (categoryId) {
//             query += ` AND s.category_id = $${paramCount}`;
//             params.push(categoryId);
//             paramCount++;
//         }

//         // Brand filter
//         if (brandId) {
//             query += ` AND s.brand_id = $${paramCount}`;
//             params.push(brandId);
//             paramCount++;
//         }

//         // Supplier filter
//         if (supplierId) {
//             query += ` AND s.supplier_id = $${paramCount}`;
//             params.push(supplierId);
//             paramCount++;
//         }

//         // ORDER BY
//         query += ` ORDER BY s.id DESC`;

//         // 1. First get total count
//         const countQuery = `
//             SELECT COUNT(*) AS total
//             FROM (${query}) AS sub
//         `;

//         const countResult = await pool.query(countQuery, params);
//         const total = parseInt(countResult.rows[0].total, 10);

//         // 2. Get statistics for ALL filtered items (using the SAME WHERE conditions)
//         // Build the base WHERE conditions for statistics query
//         let statsWhereClause = "WHERE 1 = 1";
//         const statsParams = [];
//         let statsParamCount = 1;

//         if (search && search.trim() !== "") {
//             statsWhereClause += ` AND (s.name ILIKE $${statsParamCount} OR s.sku ILIKE $${statsParamCount})`;
//             statsParams.push(`%${search.trim()}%`);
//             statsParamCount++;
//         }

//         if (branchId) {
//             statsWhereClause += ` AND s.branch_id = $${statsParamCount}`;
//             statsParams.push(branchId);
//             statsParamCount++;
//         }

//         if (categoryId) {
//             statsWhereClause += ` AND s.category_id = $${statsParamCount}`;
//             statsParams.push(categoryId);
//             statsParamCount++;
//         }

//         if (brandId) {
//             statsWhereClause += ` AND s.brand_id = $${statsParamCount}`;
//             statsParams.push(brandId);
//             statsParamCount++;
//         }

//         if (supplierId) {
//             statsWhereClause += ` AND s.supplier_id = $${statsParamCount}`;
//             statsParams.push(supplierId);
//             statsParamCount++;
//         }

//         const statsQuery = `
//             SELECT 
//                 COUNT(*) FILTER (WHERE quantity < 1) as out_of_stock,
//                 COUNT(*) FILTER (WHERE quantity < 5) as low_stock,
//                 COALESCE(SUM(cost_price * quantity), 0) as total_value
//             FROM stocks s
//            Where s.created_by = $1  -       
//             ${statsWhereClause}
//         `;

//         const statsResult = await pool.query(statsQuery, statsParams);
//         const stats = statsResult.rows[0];

//         // 3. Apply pagination to main query if limit is provided
//         if (limit && limit > 0) {
//             query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
//             params.push(limit, offset);
//             paramCount += 2;
//         }

//         // 4. Fetch paginated data
//         const dataResult = await pool.query(query, params);

//         // Format result
//         const data = dataResult.rows.map(row => ({
//             id: row.id,
//             name: row.name,
//             sku: row.sku,
//             description: row.description,
//             category_id: row.category_id,
//             brand_id: row.brand_id,
//             branch_id: row.branch_id,
//             supplier_id: row.supplier_id,
//             cost_price: row.cost_price,
//             selling_price: row.selling_price,
//             dealer_price: row.dealer_price,
//             shop_price: row.shop_price,
//             quantity: row.quantity,
//             low_stock_threshold: row.low_stock_threshold,
//             unit: row.unit,
//             status: row.status,
//             images: row.images || [],
//             specifications: row.specifications || {},
//             created_at: row.created_at,
//             updated_at: row.updated_at,

//             // Related joins
//             brand: row.brand_id ? { id: row.brand_id, name: row.brand_name } : null,
//             category: row.category_id ? { id: row.category_id, name: row.category_name } : null,
//             branch: row.branch_id ? { id: row.branch_id, name: row.branch_name } : null,
//             supplier: row.supplier_id ? { id: row.supplier_id, name: row.supplier_name } : null
//         }));

//         // Return with statistics
//         return { 
//             data, 
//             total,
//             statistics: {
//                 outOfStock: parseInt(stats.out_of_stock || 0),
//                 lowStock: parseInt(stats.low_stock || 0),
//                 totalStockValue: parseFloat(stats.total_value || 0)
//             }
//         };

//     } catch (error) {
//         console.error("Get all stocks error:", error);
//         throw error;
//     }
// },


async getAll({ search, branchId, categoryId, brandId, supplierId, offset, limit, createdBy, isAdmin = false }) {
    try {
        

        let query = `
            SELECT 
                s.*,
                b.name AS brand_name,
                c.name AS category_name,
                br.name AS branch_name,
                sp.name AS supplier_name
            FROM stocks s
            LEFT JOIN brands b ON s.brand_id = b.id
            LEFT JOIN categories c ON s.category_id = c.id
            LEFT JOIN branches br ON s.branch_id = br.id
            LEFT JOIN suppliers sp ON s.supplier_id = sp.id
            WHERE 1=1
        `;

        const params = [];
        let paramCount = 1;

        // Only add created_by filter if NOT admin and createdBy is provided
        if (createdBy) {
            query += ` AND s.created_by = $${paramCount}`;
            params.push(createdBy);
            paramCount++;
        }

        // Search filter
        if (search && search.trim() !== "") {
            query += ` AND (
                s.name ILIKE $${paramCount} OR
                s.sku ILIKE $${paramCount}
            )`;
            params.push(`%${search.trim()}%`);
            paramCount++;
        }

        
        // Branch filter
        if (branchId) {
            query += ` AND s.branch_id = $${paramCount}`;
            params.push(branchId);
            paramCount++;
        }

        // Category filter
        if (categoryId) {
            query += ` AND s.category_id = $${paramCount}`;
            params.push(categoryId);
            paramCount++;
        }

        // Brand filter
        if (brandId) {
            query += ` AND s.brand_id = $${paramCount}`;
            params.push(brandId);
            paramCount++;
        }

        // Supplier filter
        if (supplierId) {
            query += ` AND s.supplier_id = $${paramCount}`;
            params.push(supplierId);
            paramCount++;
        }

        // ORDER BY
        query += ` ORDER BY s.id DESC`;

        // 1. First get total count
        const countQuery = `
            SELECT COUNT(*) AS total
            FROM (${query}) AS sub
        `;

        const countResult = await pool.query(countQuery, params);
        const total = parseInt(countResult.rows[0].total, 10);

        // 2. Get statistics for ALL filtered items
        // Build stats query base
        let statsQuery = `
            SELECT 
                COUNT(*) FILTER (WHERE s.quantity < 1) as out_of_stock,
                COUNT(*) FILTER (WHERE s.quantity < 5) as low_stock,
                COALESCE(SUM(s.cost_price * s.quantity), 0) as total_value
            FROM stocks s
            WHERE 1=1
        `;

        // Build stats parameters separately
        const statsParams = [];
        let statsParamCount = 1;

        // Only add created_by filter if NOT admin and createdBy is provided
        if (createdBy) {
            statsQuery += ` AND s.created_by = $${statsParamCount}`;
            statsParams.push(createdBy);
            statsParamCount++;
        }

        // Add same filters to stats query
        if (search && search.trim() !== "") {
            statsQuery += ` AND (s.name ILIKE $${statsParamCount} OR s.sku ILIKE $${statsParamCount})`;
            statsParams.push(`%${search.trim()}%`);
            statsParamCount++;
        }

        if (branchId) {
            statsQuery += ` AND s.branch_id = $${statsParamCount}`;
            statsParams.push(branchId);
            statsParamCount++;
        }

        if (categoryId) {
            statsQuery += ` AND s.category_id = $${statsParamCount}`;
            statsParams.push(categoryId);
            statsParamCount++;
        }

        if (brandId) {
            statsQuery += ` AND s.brand_id = $${statsParamCount}`;
            statsParams.push(brandId);
            statsParamCount++;
        }

        if (supplierId) {
            statsQuery += ` AND s.supplier_id = $${statsParamCount}`;
            statsParams.push(supplierId);
            statsParamCount++;
        }

        const statsResult = await pool.query(statsQuery, statsParams);
        const stats = statsResult.rows[0];

        // 3. Apply pagination to main query if limit is provided
        if (limit && limit > 0) {
            query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
            params.push(limit, offset);
            paramCount += 2;
        }

        // 4. Fetch paginated data
        const dataResult = await pool.query(query, params);

        // Format result
        const data = dataResult.rows.map(row => ({
            id: row.id,
            name: row.name,
            sku: row.sku,
            description: row.description,
            category_id: row.category_id,
            brand_id: row.brand_id,
            branch_id: row.branch_id,
            supplier_id: row.supplier_id,
            cost_price: row.cost_price,
            selling_price: row.selling_price,
            dealer_price: row.dealer_price,
            shop_price: row.shop_price,
            quantity: row.quantity,
            low_stock_threshold: row.low_stock_threshold,
            unit: row.unit,
            status: row.status,
            images: row.images || [],
            specifications: row.specifications || {},
            created_by: row.created_by,  // Include created_by in response
            created_at: row.created_at,
            updated_at: row.updated_at,

            // Related joins
            brand: row.brand_id ? { id: row.brand_id, name: row.brand_name } : null,
            category: row.category_id ? { id: row.category_id, name: row.category_name } : null,
            branch: row.branch_id ? { id: row.branch_id, name: row.branch_name } : null,
            supplier: row.supplier_id ? { id: row.supplier_id, name: row.supplier_name } : null
        }));

        // Return with statistics
        return { 
            data, 
            total,
            statistics: {
                outOfStock: parseInt(stats.out_of_stock || 0),
                lowStock: parseInt(stats.low_stock || 0),
                totalStockValue: parseFloat(stats.total_value || 0)
            }
        };

    } catch (error) {
        console.error("Get all stocks error:", error);
        throw error;
    }
},





async getBranchStocks({ search, branchId, categoryId, brandId, supplierId, offset, limit, createdBy, isAdmin = false }) {
    try {
        // Validate that branchId is provided for branch-wise endpoint
        if (!branchId) {
            throw new Error('Branch ID is required for branch-wise stock retrieval');
        }

        let query = `
            SELECT 
                s.*,
                b.name AS brand_name,
                c.name AS category_name,
                br.name AS branch_name,
                sp.name AS supplier_name
            FROM stocks s
            LEFT JOIN brands b ON s.brand_id = b.id
            LEFT JOIN categories c ON s.category_id = c.id
            LEFT JOIN branches br ON s.branch_id = br.id
            LEFT JOIN suppliers sp ON s.supplier_id = sp.id
            WHERE s.branch_id = $1  -- Branch filter is mandatory
        `;

        const params = [branchId];
        let paramCount = 2;

        // Only add created_by filter if NOT admin and createdBy is provided
        if (createdBy) {
            query += ` AND s.created_by = $${paramCount}`;
            params.push(createdBy);
            paramCount++;
        }

        // Search filter
        if (search && search.trim() !== "") {
            query += ` AND (
                s.name ILIKE $${paramCount} OR
                s.sku ILIKE $${paramCount}
            )`;
            params.push(`%${search.trim()}%`);
            paramCount++;
        }

        // Category filter
        if (categoryId) {
            query += ` AND s.category_id = $${paramCount}`;
            params.push(categoryId);
            paramCount++;
        }

        // Brand filter
        if (brandId) {
            query += ` AND s.brand_id = $${paramCount}`;
            params.push(brandId);
            paramCount++;
        }

        // Supplier filter
        if (supplierId) {
            query += ` AND s.supplier_id = $${paramCount}`;
            params.push(supplierId);
            paramCount++;
        }

        // ORDER BY
        query += ` ORDER BY s.id DESC`;

        // 1. First get total count
        const countQuery = `
            SELECT COUNT(*) AS total
            FROM (${query}) AS sub
        `;

        const countResult = await pool.query(countQuery, params);
        const total = parseInt(countResult.rows[0].total, 10);

        // 2. Get statistics for ALL filtered items
        // Build stats query base
        let statsQuery = `
            SELECT 
                COUNT(*) FILTER (WHERE s.quantity < 1) as out_of_stock,
                COUNT(*) FILTER (WHERE s.quantity < 5) as low_stock,
                COALESCE(SUM(s.cost_price * s.quantity), 0) as total_value
            FROM stocks s
            WHERE s.branch_id = $1  -- Branch filter is mandatory for stats too
        `;

        // Build stats parameters separately
        const statsParams = [branchId];
        let statsParamCount = 2;

        // Only add created_by filter if NOT admin and createdBy is provided
        if (createdBy) {
            statsQuery += ` AND s.created_by = $${statsParamCount}`;
            statsParams.push(createdBy);
            statsParamCount++;
        }

        // Add same filters to stats query
        if (search && search.trim() !== "") {
            statsQuery += ` AND (s.name ILIKE $${statsParamCount} OR s.sku ILIKE $${statsParamCount})`;
            statsParams.push(`%${search.trim()}%`);
            statsParamCount++;
        }

        if (categoryId) {
            statsQuery += ` AND s.category_id = $${statsParamCount}`;
            statsParams.push(categoryId);
            statsParamCount++;
        }

        if (brandId) {
            statsQuery += ` AND s.brand_id = $${statsParamCount}`;
            statsParams.push(brandId);
            statsParamCount++;
        }

        if (supplierId) {
            statsQuery += ` AND s.supplier_id = $${statsParamCount}`;
            statsParams.push(supplierId);
            statsParamCount++;
        }

        const statsResult = await pool.query(statsQuery, statsParams);
        const stats = statsResult.rows[0];

        // 3. Apply pagination to main query if limit is provided
        if (limit && limit > 0) {
            query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
            params.push(limit, offset);
            paramCount += 2;
        }

        // 4. Fetch paginated data
        const dataResult = await pool.query(query, params);

        // Format result - EXACT SAME FORMAT as your getAll method
        const data = dataResult.rows.map(row => ({
            id: row.id,
            name: row.name,
            sku: row.sku,
            description: row.description,
            category_id: row.category_id,
            brand_id: row.brand_id,
            branch_id: row.branch_id,
            supplier_id: row.supplier_id,
            cost_price: row.cost_price,
            selling_price: row.selling_price,
            dealer_price: row.dealer_price,
            shop_price: row.shop_price,
            quantity: row.quantity,
            low_stock_threshold: row.low_stock_threshold,
            unit: row.unit,
            status: row.status,
            images: row.images || [],
            specifications: row.specifications || {},
            created_by: row.created_by,  // Include created_by in response
            created_at: row.created_at,
            updated_at: row.updated_at,

            // Related joins
            brand: row.brand_id ? { id: row.brand_id, name: row.brand_name } : null,
            category: row.category_id ? { id: row.category_id, name: row.category_name } : null,
            branch: row.branch_id ? { id: row.branch_id, name: row.branch_name } : null,
            supplier: row.supplier_id ? { id: row.supplier_id, name: row.supplier_name } : null
        }));

        // Return with statistics - EXACT SAME RESPONSE STRUCTURE
        return { 
            data, 
            total,
            statistics: {
                outOfStock: parseInt(stats.out_of_stock || 0),
                lowStock: parseInt(stats.low_stock || 0),
                totalStockValue: parseFloat(stats.total_value || 0)
            }
        };

    } catch (error) {
        console.error("Get branch stocks error:", error);
        throw error;
    }
},



// In your Stock.js model
async getStatistics({ search, branchId, categoryId, brandId, supplierId }) {
    try {
        let query = `
            SELECT 
                COUNT(*) FILTER (WHERE quantity < 1) as out_of_stock,
                COUNT(*) FILTER (WHERE quantity < 5) as low_stock,
                SUM(cost_price * quantity) as total_value,
                COUNT(*) as total_items
            FROM stocks s
            WHERE 1 = 1
        `;

        const params = [];
        let paramCount = 1;

        // Apply same filters as getAll()
        if (search && search.trim() !== "") {
            query += ` AND (
                s.name ILIKE $${paramCount} OR
                s.sku ILIKE $${paramCount}
            )`;
            params.push(`%${search.trim()}%`);
            paramCount++;
        }

        if (branchId) {
            query += ` AND s.branch_id = $${paramCount}`;
            params.push(branchId);
            paramCount++;
        }

        if (categoryId) {
            query += ` AND s.category_id = $${paramCount}`;
            params.push(categoryId);
            paramCount++;
        }

        if (brandId) {
            query += ` AND s.brand_id = $${paramCount}`;
            params.push(brandId);
            paramCount++;
        }

        if (supplierId) {
            query += ` AND s.supplier_id = $${paramCount}`;
            params.push(supplierId);
            paramCount++;
        }

        const result = await pool.query(query, params);
        const row = result.rows[0];

        return {
            outOfStock: parseInt(row.out_of_stock || 0),
            lowStock: parseInt(row.low_stock || 0),
            totalStockValue: parseFloat(row.total_value || 0),
            totalItems: parseInt(row.total_items || 0)
        };

    } catch (error) {
        console.error("Get statistics error:", error);
        throw error;
    }
},

    async getById(id) {
        const result = await pool.query(`SELECT * FROM stocks WHERE id=$1`, [id]);
        return result.rows[0];
    },

   async update(id, stock) {
    const query = `
        UPDATE stocks SET
            name=$1, 
            sku=$2, 
            description=$3,
            category_id=$4, 
            brand_id=$5, 
            branch_id=$6, 
            supplier_id=$7,
            cost_price=$8, 
            selling_price=$9, 
            dealer_price=$10, 
            shop_price=$11,
            quantity=$12, 
            low_stock_threshold=$13, 
            unit=$14, 
            status=$15,
            images=$16, 
            specifications=$17,
            updated_at=CURRENT_TIMESTAMP
        WHERE id=$18 
        RETURNING *;
    `;

    const values = [
        stock.name || '',
        stock.sku || '',
        stock.description || '',
        stock.category_id,
        stock.brand_id,
        stock.branch_id,
        stock.supplier_id,
        stock.cost_price || 0.0,
        stock.selling_price || 0.0,
        stock.dealer_price || 0.0,
        stock.shop_price || 0.0,
        stock.quantity || 0,
        stock.low_stock_threshold || 0,
        stock.unit || 'pcs',
        stock.status || 'active',
        stock.images || [],
        stock.specifications || {},
        id
    ];

    console.log('Update Query:', query);
    console.log('Update Values:', values);
    
    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (error) {
        console.error('Database update error:', error.message);
        console.error('Error details:', error);
        throw error;
    }
},

// Add this method to get stock with basic details
async findByIdWithBasicDetails(id) {
    const query = `
        SELECT 
            s.*,
            c.id AS category_id,
            c.name AS category_name,
            
            b.id AS brand_id,
            b.name AS brand_name,
            
            br.id AS branch_id,
            br.name AS branch_name,
            
            sup.id AS supplier_id,
            sup.name AS supplier_name
            
        FROM stocks s
        LEFT JOIN categories c ON s.category_id = c.id
        LEFT JOIN brands b ON s.brand_id = b.id
        LEFT JOIN branches br ON s.branch_id = br.id
        LEFT JOIN suppliers sup ON s.supplier_id = sup.id
        WHERE s.id = $1;
    `;
    
    try {
        const result = await pool.query(query, [id]);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        const row = result.rows[0];
        
        // Format the response with nested objects
        const stockWithDetails = {
            id: row.id,
            name: row.name,
            sku: row.sku,
            description: row.description,
            cost_price: row.cost_price,
            selling_price: row.selling_price,
            dealer_price: row.dealer_price,
            shop_price: row.shop_price,
            quantity: row.quantity,
            low_stock_threshold: row.low_stock_threshold,
            unit: row.unit,
            status: row.status,
            images: row.images || [],
            specifications: row.specifications || {},
            created_at: row.created_at,
            updated_at: row.updated_at,
            
            // Category details - just id and name
            category: row.category_id ? {
                id: row.category_id,
                name: row.category_name
            } : null,
            
            // Brand details - just id and name
            brand: row.brand_id ? {
                id: row.brand_id,
                name: row.brand_name
            } : null,
            
            // Branch details - just id and name
            branch: row.branch_id ? {
                id: row.branch_id,
                name: row.branch_name
            } : null,
            
            // Supplier details - just id and name
            supplier: row.supplier_id ? {
                id: row.supplier_id,
                name: row.supplier_name
            } : null
        };
        
        return stockWithDetails;
        
    } catch (error) {
        console.error('Database find by id error:', error.message);
        throw error;
    }
},

    async delete(id) {
        await pool.query(`DELETE FROM stocks WHERE id=$1`, [id]);
        return { message: "Stock deleted" };
    }
};
