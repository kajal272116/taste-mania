export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!process.env.PEXELS_API_KEY) {
    return res.status(500).json({ error: "PEXELS_API_KEY not set in Vercel Environment Variables" });
  }

  try {
    const { dishes } = req.body;

    // Fetch all dish images in parallel using Promise.all
    const results = await Promise.all(
      dishes.map(async (dish) => {
        const response = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(dish + " food")}&per_page=1&orientation=landscape`,
          { headers: { Authorization: process.env.PEXELS_API_KEY } }
        );
        const data = await response.json();
        const url = data?.photos?.[0]?.src?.medium || null;
        return { dish, url };
      })
    );

    // Return as a simple { dishName: imageUrl } map
    const imageMap = {};
    results.forEach(r => { if (r.url) imageMap[r.dish] = r.url; });

    res.status(200).json(imageMap);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}