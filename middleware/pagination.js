const validatePagination = (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    if (page < 1) {
        return res.status(400).json({
            success: false,
            error: 'Page number must be greater than 0'
        });
    }
    
    if (limit < 1 || limit > 100) {
        return res.status(400).json({
            success: false,
            error: 'Limit must be between 1 and 100'
        });
    }
    
    // Add validated values to request object
    req.validatedPage = page;
    req.validatedLimit = limit;
    
    next();
};

module.exports = { validatePagination };