const FINNHUB_URL = `wss://ws.finnhub.io?token=${process.env.FINNHUB_API_KEY || "d7espqhr01qi33g7h8ngd7espqhr01qi33g7h8o0"}`;

let socket = null;
let connectionOpen = false;
let reconnectTimer = null;
let started = false;
let ioInstance = null;
const activeSymbols = new Set();

function normalizeSymbol(symbol) {
  return String(symbol || "")
    .trim()
    .toUpperCase();
}

function connect() {
  socket = new WebSocket(FINNHUB_URL);
  attachListeners();
}

function attachListeners() {
  socket.addEventListener("open", handleOpen);
  socket.addEventListener("close", handleClose);
  socket.addEventListener("message", handleMessage);
}

function detachListeners() {
  if (!socket) return;
  socket.removeEventListener("open", handleOpen);
  socket.removeEventListener("close", handleClose);
  socket.removeEventListener("message", handleMessage);
}

// Event handlers
function handleOpen() {
  connectionOpen = true;
  console.log("Finnhub connection opened");

  for (const symbol of activeSymbols) {
    socket.send(JSON.stringify({ type: "subscribe", symbol }));
  }
}

function handleClose(event) {
  connectionOpen = false;
  console.log("Finnhub connection closed", {
    code: event.code,
    reason: event.reason,
    wasClean: event.wasClean,
  });

  detachListeners();

  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    connect();
  }, 5000); // Attempt to reconnect every 5 seconds
}

function handleMessage(event) {
  // event.data is a string that needs to be parsed as JSON
  const payload = JSON.parse(event.data);
  // payload = {"data":[{"c":null,"p":75008.34,"s":"BINANCE:BTCUSDT","t":1776315883083,"v":0.00042}],"type":"trade"}
  if (!payload || payload.type !== "trade" || !Array.isArray(payload.data))
    return;

  for (const trade of payload.data) {
    // trade = { "s": "AAPL", "p": 150.25, "t": 1625256000000, "v": 100 }
    if (trade.s === "BINANCE:BTCUSDT") {
      trade.s = "MDB"; // Testing purposes only - Use MDB to get BTCUSDT for aftermarket testing
    }
    if (ioInstance && activeSymbols.has(trade.s)) {
      ioInstance.to(trade.s).emit("stockPriceUpdate", {
        symbol: trade.s,
        price: trade.p,
        time: trade.t,
        volume: trade.v,
      });
    }
  }
}

// Interface functions
function subscribeSymbol(rawSymbol) {
  const symbol = normalizeSymbol(rawSymbol);
  if (!symbol) return;

  // Return early to avoid subscribing multiple times
  if (activeSymbols.has(symbol)) {
    console.log(symbol, "is already subscribed");
    return;
  }
  activeSymbols.add(symbol);
  if (connectionOpen) {
    // Testing purposes only - Use MDB to get BTCUSDT for aftermarket testing
    if (symbol === "MDB") {
      socket.send(
        JSON.stringify({ type: "subscribe", symbol: "BINANCE:BTCUSDT" }),
      );
    } else {
      socket.send(JSON.stringify({ type: "subscribe", symbol }));
    }
    console.log(symbol, "subscribing to stock updates");
  } else {
    // If the connection isn't open yet, the symbol will be subscribed to when the connection opens
    console.log(
      symbol,
      "added to active symbols will subscribe when connection opens",
    );
  }
}

function unsubscribeSymbol(rawSymbol) {
  const symbol = normalizeSymbol(rawSymbol);
  if (!symbol) return;

  activeSymbols.delete(symbol);
  if (connectionOpen) {
    // Testing purposes only - Use MDB to get BTCUSDT for aftermarket testing
    if (symbol === "MDB") {
      socket.send(
        JSON.stringify({ type: "unsubscribe", symbol: "BINANCE:BTCUSDT" }),
      );
    } else {
      socket.send(JSON.stringify({ type: "unsubscribe", symbol }));
    }
    console.log(symbol, "unsubscribing from stock updates");
  } else {
    // If the connection isn't open, the symbol will simply not be subscribed to when the connection opens
    console.log(
      symbol,
      "removed from active symbols will not subscribe when connection opens",
    );
  }
}

// Entry point to start the socket connection
function startSocket(io) {
  ioInstance = io;
  if (started) return;
  started = true;
  connect();
}

module.exports = { startSocket, subscribeSymbol, unsubscribeSymbol };
