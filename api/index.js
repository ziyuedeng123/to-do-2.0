// Vercel Serverless Function 入口
// 部署在 api/ 目录下，被 vercel.json 的 rewrites 规则调用：
//   /api/(.*) → /api/index
// 即所有 /api/xxx 请求都会转发到此函数处理
//
// backend/ 目录通过 vercel.json 的 includeFiles 显式打包进函数

const app = require('../backend/app');

module.exports = app;