const router = require("express").Router();
const { searchStock } = require("../controllers/search.js");

router.get("/", searchStock);

module.exports = router;
