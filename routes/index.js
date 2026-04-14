const router = require("express").Router();
const searchRoutes = require("./search");
const stockRoutes = require("./stock");

// Search routes
router.use("/search", searchRoutes);
router.use("/stock", stockRoutes);

module.exports = router;
