const Supplier = require('../models/supplier_model');


class SupplierController {
    /**
     * Create a new supplier
     */
    static async createSupplier(req, res) {
        try {
            const { name, address, phone_number } = req.body;
            
            // Validation
            if (!name || name.trim() === '') {
                return res.status(400).json({
                    success: false,
                    error: 'Supplier name is required'
                });
            }

            if (phone_number && phone_number.length > 20) {
                return res.status(400).json({
                    success: false,
                    error: 'Phone number cannot exceed 20 characters'
                });
            }

            const supplierData = {
                name: name.trim(),
                address: address ? address.trim() : null,
                phone_number: phone_number ? phone_number.trim() : null
            };

            const supplier = await Supplier.create(supplierData);

            res.status(201).json({
                success: true,
                message: 'Supplier created successfully',
                data: supplier
            });
        } catch (error) {
            console.error('Error creating supplier:', error);
            
            // Handle duplicate name error
            if (error.code === '23505') { // PostgreSQL unique violation
                return res.status(409).json({
                    success: false,
                    error: 'Supplier with this name already exists'
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Failed to create supplier',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Get all suppliers with pagination and filters
     */
    static async getAllSuppliers(req, res) {
        try {
            // Extract and validate query parameters
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
            const sortBy = req.query.sortBy || 'created_at';
            const sortOrder = req.query.sortOrder || 'DESC';
            const search = req.query.search || '';
            const phoneNumber = req.query.phoneNumber || '';

            // Validate parameters
            if (page < 1) {
                return res.status(400).json({
                    success: false,
                    error: 'Page must be greater than 0'
                });
            }

            if (limit < 1 || limit > 100) {
                return res.status(400).json({
                    success: false,
                    error: 'Limit must be between 1 and 100'
                });
            }

            // Validate sort fields
            const validSortFields = ['id', 'name', 'address', 'phone_number', 'created_at', 'updated_at'];
            if (!validSortFields.includes(sortBy)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid sort field. Valid fields are: ${validSortFields.join(', ')}`
                });
            }

            // Validate sort order
            const validSortOrders = ['ASC', 'DESC', 'asc', 'desc'];
            if (!validSortOrders.includes(sortOrder.toUpperCase())) {
                return res.status(400).json({
                    success: false,
                    error: 'Sort order must be ASC or DESC'
                });
            }

            const filters = {
                page,
                limit,
                sortBy,
                sortOrder: sortOrder.toUpperCase(),
                search,
                phoneNumber
            };

            const result = await Supplier.findAllWithFilters(filters);

            res.json({
                success: true,
                message: 'Suppliers retrieved successfully',
                ...result
            });
        } catch (error) {
            console.error('Error fetching suppliers:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch suppliers',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Get supplier by ID
     */
    static async getSupplierById(req, res) {
        try {
            const { id } = req.params;
            
            // Validate ID
            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    error: 'Valid supplier ID is required'
                });
            }

            const supplier = await Supplier.findById(parseInt(id));

            if (!supplier) {
                return res.status(404).json({
                    success: false,
                    error: 'Supplier not found'
                });
            }

            res.json({
                success: true,
                message: 'Supplier retrieved successfully',
                data: supplier
            });
        } catch (error) {
            console.error('Error fetching supplier:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch supplier',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Update supplier (full update)
     */
    static async updateSupplier(req, res) {
        try {
            const { id } = req.params;
            const { name, address, phone_number } = req.body;

            // Validate ID
            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    error: 'Valid supplier ID is required'
                });
            }

            // Check if supplier exists
            const existingSupplier = await Supplier.findById(parseInt(id));
            if (!existingSupplier) {
                return res.status(404).json({
                    success: false,
                    error: 'Supplier not found'
                });
            }

            // Validation
            if (!name || name.trim() === '') {
                return res.status(400).json({
                    success: false,
                    error: 'Supplier name is required'
                });
            }

            if (phone_number && phone_number.length > 20) {
                return res.status(400).json({
                    success: false,
                    error: 'Phone number cannot exceed 20 characters'
                });
            }

            const updateData = {
                name: name.trim(),
                address: address ? address.trim() : null,
                phone_number: phone_number ? phone_number.trim() : null
            };

            const updatedSupplier = await Supplier.update(parseInt(id), updateData);

            res.json({
                success: true,
                message: 'Supplier updated successfully',
                data: updatedSupplier
            });
        } catch (error) {
            console.error('Error updating supplier:', error);
            
            if (error.code === '23505') {
                return res.status(409).json({
                    success: false,
                    error: 'Supplier with this name already exists'
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Failed to update supplier',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Partially update supplier
     */
    static async partialUpdateSupplier(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            // Validate ID
            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    error: 'Valid supplier ID is required'
                });
            }

            // Check if supplier exists
            const existingSupplier = await Supplier.findById(parseInt(id));
            if (!existingSupplier) {
                return res.status(404).json({
                    success: false,
                    error: 'Supplier not found'
                });
            }

            // Validate update data
            if (Object.keys(updateData).length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No fields to update'
                });
            }

            // Prepare update data
            const allowedFields = ['name', 'address', 'phone_number'];
            const filteredData = {};
            
            for (const field of allowedFields) {
                if (updateData[field] !== undefined) {
                    if (field === 'name' && (!updateData[field] || updateData[field].trim() === '')) {
                        return res.status(400).json({
                            success: false,
                            error: 'Supplier name cannot be empty'
                        });
                    }
                    
                    if (field === 'phone_number' && updateData[field] && updateData[field].length > 20) {
                        return res.status(400).json({
                            success: false,
                            error: 'Phone number cannot exceed 20 characters'
                        });
                    }
                    
                    filteredData[field] = updateData[field] ? updateData[field].trim() : null;
                }
            }

            const updatedSupplier = await Supplier.partialUpdate(parseInt(id), filteredData);

            res.json({
                success: true,
                message: 'Supplier partially updated successfully',
                data: updatedSupplier
            });
        } catch (error) {
            console.error('Error partially updating supplier:', error);
            
            if (error.code === '23505') {
                return res.status(409).json({
                    success: false,
                    error: 'Supplier with this name already exists'
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Failed to update supplier',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Delete supplier
     */
    static async deleteSupplier(req, res) {
        try {
            const { id } = req.params;

            // Validate ID
            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    error: 'Valid supplier ID is required'
                });
            }

            const deletedSupplier = await Supplier.delete(parseInt(id));
            
            if (!deletedSupplier) {
                return res.status(404).json({
                    success: false,
                    error: 'Supplier not found'
                });
            }

            res.json({
                success: true,
                message: 'Supplier deleted successfully',
                data: deletedSupplier
            });
        } catch (error) {
            console.error('Error deleting supplier:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete supplier',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Search suppliers by name with pagination
     */
    static async searchSuppliers(req, res) {
        try {
            const { name, page = 1, limit = 10 } = req.query;
            
            if (!name || name.trim() === '') {
                return res.status(400).json({
                    success: false,
                    error: 'Search query (name) is required'
                });
            }

            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

            // Validate parameters
            if (pageNum < 1) {
                return res.status(400).json({
                    success: false,
                    error: 'Page must be greater than 0'
                });
            }

            if (limitNum < 1 || limitNum > 100) {
                return res.status(400).json({
                    success: false,
                    error: 'Limit must be between 1 and 100'
                });
            }

            const result = await Supplier.searchByName(name.trim(), pageNum, limitNum);
            
            res.json({
                success: true,
                message: 'Search completed successfully',
                searchQuery: name,
                ...result
            });
        } catch (error) {
            console.error('Error searching suppliers:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to search suppliers',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Get total count of suppliers
     */
    static async getSuppliersCount(req, res) {
        try {
            const count = await Supplier.getCount();
            
            res.json({
                success: true,
                message: 'Total count retrieved successfully',
                data: {
                    totalSuppliers: count
                }
            });
        } catch (error) {
            console.error('Error getting suppliers count:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get suppliers count',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Export suppliers data (example: CSV format)
     */
    static async exportSuppliers(req, res) {
        try {
            const { format = 'json', page = 1, limit = 1000 } = req.query;
            
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.min(5000, Math.max(1, parseInt(limit)));

            const result = await Supplier.findAllWithFilters({
                page: pageNum,
                limit: limitNum,
                sortBy: 'id',
                sortOrder: 'ASC'
            });

            if (format.toLowerCase() === 'csv') {
                // Convert to CSV
                const headers = ['ID', 'Name', 'Address', 'Phone Number', 'Created At', 'Updated At'];
                const rows = result.data.map(supplier => [
                    supplier.id,
                    `"${supplier.name.replace(/"/g, '""')}"`,
                    `"${(supplier.address || '').replace(/"/g, '""')}"`,
                    supplier.phone_number || '',
                    supplier.created_at,
                    supplier.updated_at
                ]);

                const csvContent = [
                    headers.join(','),
                    ...rows.map(row => row.join(','))
                ].join('\n');

                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="suppliers_${Date.now()}.csv"`);
                return res.send(csvContent);
            }

            // Default to JSON
            res.json({
                success: true,
                message: 'Suppliers exported successfully',
                format: 'json',
                ...result
            });
        } catch (error) {
            console.error('Error exporting suppliers:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to export suppliers',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

module.exports = SupplierController;