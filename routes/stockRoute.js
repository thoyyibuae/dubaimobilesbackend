// const express = require('express');
// const router = express.Router();
// const stockController = require('../controller/stockController');



// // Routes
// router.get('/', stockController.getStocks);
// router.get('/:id', stockController.getStock);
// router.post('/', stockController.createStock);
// router.put('/:id', stockController.updateStock);
// router.delete('/:id', stockController.deleteStock);

// module.exports = router;





const express = require("express");
const router = express.Router();
const stockController = require("../controller/stockController");
const upload = require("../middleware/uploadStocks");

const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');


// All routes require authentication
router.use(authenticateToken);

router.post("/", upload.array("images", 10), stockController.createStock);
router.get("/", stockController.getStocks);
router.get("/:id", stockController.getStockById);
router.put("/:id", upload.array("images", 10), stockController.updateStock);
router.delete("/:id", stockController.deleteStock);

module.exports = router;

