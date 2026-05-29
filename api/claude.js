const https = require("https");

module.exports = async function handler(req, res) {
  // Allow CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { messages, system, max_tokens } = req.body;

    const result = await new Promise((resolve, reject) => {
      const payload = JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: max_tokens || 1000,
        system,
        messages,
      });

      const options = {
        hostname: "api.anthropic.com",
        path: "/v1/messages",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Length": Buffer.byteLength(payload),
        },
      };

      const request = https.request(options, (response) => {
        let data = "";
        response.on("data", (chunk) => { data += chunk; });
        response.on("end", () => resolve(data));
      });

      request.on("error", reject);
      request.write(payload);
      request.end();
    });

    res.status(200).json(JSON.parse(result));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};