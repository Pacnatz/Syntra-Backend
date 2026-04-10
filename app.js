const express = require("express");
const cors = require("cors");
const mainRouter = require("./routes/index");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
  }),
);
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.send({ message: "Hello from the server!" });
});
app.use("/", mainRouter);
// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
