require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mainRouter = require("./routes/index");
const InitializeSockets = require("./sockets/index");
const { startSocket } = require("./services/finnhubSocket");

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

app.use("/api", mainRouter);
// Start the server
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const io = InitializeSockets(server);
startSocket(io);
