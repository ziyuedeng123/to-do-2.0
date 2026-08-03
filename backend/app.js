// backend/app.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const tasksRouter = require('./routes/tasks');

const app = express();
const PORT = process.env.PORT || 3000;

// 启动前校验 API Key
if (!process.env.API_KEY) {
    console.error('❌ FATAL: API_KEY is not set in environment variables.');
    process.exit(1);
}

// CORS 配置（允许 Vercel 预览域名）
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'x-api-key']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务：托管前端页面
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// 挂载路由：所有 /api 开头的请求都交给 tasksRouter 处理
app.use('/api', tasksRouter);

// SPA fallback：所有非 API 请求返回 index.html
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    if (req.method !== 'GET') return next();
    const indexPath = path.join(frontendPath, 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error('Failed to send index.html:', err);
            next(err);
        }
    });
});

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
        console.log(`🌐 Frontend:  http://localhost:${PORT}`);
        console.log(`📡 API:       http://localhost:${PORT}/api/tasks`);
        console.log('🔑 API Key is configured.');
    });
}

module.exports = app;