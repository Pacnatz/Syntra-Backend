const router = require("express").Router();
const { getStockData } = require("../controllers/stock.js");

router.get("/:symbol/:interval", getStockData);

module.exports = router;
