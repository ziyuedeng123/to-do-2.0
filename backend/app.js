// backend/app.js
// ── 仅在本地开发时加载 .env（Vercel 通过 Dashboard 注入环境变量）──
if (process.env.VERCEL !== '1') {
    require('dotenv').config();
}

const express = require('express');
const path = require('path');
const cors = require('cors');
const tasksRouter = require('./routes/tasks');

const app = express();
const PORT = process.env.PORT || 3000;

// 启动前校验 API Key（不 crash，让 auth 中间件来拒绝请求）
if (!process.env.API_KEY) {
    console.error('⚠️  WARNING: API_KEY is not set. All API requests will be rejected.');
}

// CORS 配置
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'x-api-key']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── 本地开发：静态文件服务 + SPA fallback ──
// Vercel 自动从项目根目录提供 index.html、style.css、script.js
// 本地开发时由 Express 从根目录提供
const rootDir = path.join(__dirname, '..');
app.use(express.static(rootDir));

// SPA fallback：非 API 的 GET 请求返回 index.html
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    if (req.method !== 'GET') return next();
    res.sendFile(path.join(rootDir, 'index.html'), (err) => {
        if (err) next(err);
    });
});

// ── API 路由 ──
app.use('/api', tasksRouter);

// 404 处理（API 路由未匹配时）
app.use('/api', (req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

// 全局错误处理
app.use((err, req, res, _next) => {
    console.error(`[${new Date().toISOString()}] Unhandled Error:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
});

// Vercel serverless 兼容：直接运行时才监听端口
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`✅ Server is running on http://localhost:${PORT}`);
        console.log(`🌐 Frontend:  http://localhost:${PORT} (from project root)`);
        console.log(`📡 API:       http://localhost:${PORT}/api/tasks`);
        console.log('🔑 API Key is configured.');
    });
}

module.exports = app;