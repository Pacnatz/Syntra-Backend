const {
  subscribeSymbol,
  unsubscribeSymbol,
} = require("../services/finnhubSocket");

const InitializeSockets = (server) => {
  const io = require("socket.io")(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
    },
  });

  // FIXME:joinStockRoom event does not fire when navigating directly to a stock page
  io.on("connection", (socket) => {
    console.log(socket.id, "connected");
    socket.on("disconnect", () => {
      console.log(socket.id, "disconnected");
    });
    socket.on("joinStockRoom", (symbol) => {
      // Subscribe to finnhub stock updates for the given symbol and emit updates to the room
      socket.join(symbol);
      subscribeSymbol(symbol); // Fetch live data for the stock
      console.log(socket.id, "joined room for stock:", symbol);
    });
    socket.on("leaveStockRoom", (symbol) => {
      socket.leave(symbol);
      const roomSize = io.sockets.adapter.rooms.get(symbol)?.size || 0;
      // unsubscribe from finnhub stock updates if no clients are left in the room
      if (roomSize === 0) {
        unsubscribeSymbol(symbol); // Stop fetching live data for the stock
      }
      console.log(socket.id, "left room for stock:", symbol);
    });
  });

  return io;
};

module.exports = InitializeSockets;
