require("dotenv").config();

/**
 * Middleware to check for a fixed API key in the request headers
 */
const authenticateAPIKey = (req, res, next) => {
    const apiKey = req.header("x-api-key"); // Get API key from headers

    if (!apiKey) {
        return res.status(403).json({ error: "Access denied. No API key provided." });
    }

    if (apiKey !== process.env.API_KEY) {
        return res.status(401).json({ error: "Invalid API key" });
    }

    next(); // API key is valid, proceed to the next function
};

module.exports = authenticateAPIKey;
