const router = require("express").Router();
const searchRoutes = require("./search");

// Search routes
router.use("/search", searchRoutes);

module.exports = router;
