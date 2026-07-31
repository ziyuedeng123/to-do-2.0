// backend/middleware/auth.js
const API_KEY = process.env.API_KEY;

function checkApiKey(req, res, next) {
    const clientKey = req.headers['x-api-key']; // 前端需要在请求头里带这个
    
    if (!clientKey || clientKey !== API_KEY) {
        return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }
    next(); // 验证通过，放行
}

module.exports = { checkApiKey };