const searchCache = new Map();
const MAX_CACHE_SIZE = 100;

const searchStock = (req, res) => {
  const query = req.query.q;

  if (searchCache.has(query)) {
    return res.json(searchCache.get(query));
  }

  fetch(
    `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${process.env.FINNHUB_API_KEY}`,
  )
    .then((res) =>
      res.ok ? res.json() : Promise.reject({ status: res.status }),
    )
    .then((data) => {
      // Filter stocks to US Markets only
      const filtered = data.result.filter(
        (stock) =>
          stock.symbol === stock.symbol.toUpperCase() &&
          !stock.symbol.includes("."),
      );
      searchCache.set(query, filtered);

      // Cache the first 100 search results, removing the oldest if we exceed the limit
      if (searchCache.size > MAX_CACHE_SIZE) {
        const [firstKey] = searchCache.keys();
        if (firstKey) searchCache.delete(firstKey); // simple cleanup
      }
      res.json(filtered);
    })
    .catch((error) => {
      if (error.status === 429) {
        return res
          .status(429)
          .json({ error: "Finnhub API rate limit exceeded" });
      }
      res.status(500).json({ error: "Error fetching from Finnhub API" });
    });
};

module.exports = { searchStock };
