const stockCache = new Map();
const MAX_CACHE_SIZE = 100;

const getStockData = (req, res) => {
  const { symbol, interval } = req.params;
  const now = Math.floor(Date.now() / 1000);
  const startDate = intervalToStartDate(interval);

  // Return data if it's in the cache and not expired
  if (
    stockCache.has(`${symbol}_${interval}`) &&
    stockCache.get(`${symbol}_${interval}`).expiresAt > now
  ) {
    return res.json(stockCache.get(`${symbol}_${interval}`));
  } else {
    stockCache.delete(`${symbol}_${interval}`); // Remove expired cache
  }

  fetch(
    `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${interval}&start_date=${startDate}&end_date=${now}&apikey=${process.env.TWELVEDATA_API_KEY}`,
  )
    .then((res) =>
      res.ok ? res.json() : Promise.reject({ status: res.status }),
    )
    .then((data) => {
      // If the API returns an error status, we should handle it
      if (data.status !== "ok") {
        throw new Error(`API error: ${data.message || "Unknown error"}`);
      }

      // Cache the data with an expiration time
      stockCache.set(`${symbol}_${interval}`, {
        ...data,
        cachedAt: now,
        expiresAt: now + intervalToTTL(interval),
      });

      if (stockCache.size > MAX_CACHE_SIZE) {
        const [firstKey] = stockCache.keys();
        if (firstKey) stockCache.delete(firstKey); // simple cleanup
      }

      res.json(data);
    })
    .catch((error) => {
      if (error.status === 429) {
        return res
          .status(429)
          .json({ error: "Twelve Data API rate limit exceeded" });
      }
      res.status(500).json({ error: "Error fetching from Twelve Data API" });
    });
};

function intervalToStartDate(interval) {
  switch (interval) {
    case "1min":
      return Math.floor(Date.now() / 1000) - 24 * 60 * 60; // 1 day ago
    case "5min":
      return Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60; // 1 week ago
    case "15min":
      return Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60; // 1 month ago
    case "30min":
      return Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60; // 1 month ago
    case "60min":
      return Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60; // 3 months ago
    case "1day":
      return Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60; // 1 year ago
    default:
      throw new Error("Invalid interval");
  }
}

function intervalToTTL(interval) {
  switch (interval) {
    case "1min":
      return 1 * 60; // 1 minute
    case "5min":
      return 5 * 60; // 5 minutes
    case "15min":
      return 15 * 60; // 15 minutes
    case "30min":
      return 30 * 60; // 30 minutes
    case "60min":
      return 60 * 60; // 1 hour
    case "1day":
      return 24 * 60 * 60; // 1 day
    default:
      throw new Error("Invalid interval");
  }
}

module.exports = { getStockData };
