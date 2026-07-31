// backend/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const tasksRouter = require('./routes/tasks'); // 引入路由

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 挂载路由：所有 /api 开头的请求都交给 tasksRouter 处理
app.use('/api', tasksRouter); 

app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
    console.log(`🔑 API Key: ${process.env.API_KEY}`);
});