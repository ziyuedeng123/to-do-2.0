// Vercel Serverless Function 入口
// 该文件被 vercel.json 的 rewrites 规则调用：
//   /api/(.*) → /api/index
// 即所有 /api/xxx 请求都会转发到此函数处理

const app = require('../backend/app');

module.exports = app;