// backend/middleware/auth.js
const crypto = require('crypto');

const API_KEY = process.env.API_KEY;

function checkApiKey(req, res, next) {
    const clientKey = req.headers['x-api-key'];

    if (!clientKey) {
        return res.status(401).json({ error: 'Unauthorized: Missing API Key' });
    }

    // 使用 timingSafeEqual 防止时序攻击
    const keyBuffer = Buffer.from(API_KEY);
    const clientBuffer = Buffer.from(clientKey);

    if (clientBuffer.length !== keyBuffer.length ||
        !crypto.timingSafeEqual(keyBuffer, clientBuffer)) {
        return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    next();
}

module.exports = { checkApiKey };