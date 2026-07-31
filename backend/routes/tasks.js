// backend/routes/tasks.js
const express = require('express');
const router = express.Router();
const { readData, writeData } = require('../data/store');
const { checkApiKey } = require('../middleware/auth');

// 应用鉴权中间件到所有 /tasks 路由
router.use(checkApiKey);

// @route   GET /tasks
// @desc    获取所有任务
router.get('/', async (req, res) => {
    try {
        const tasks = await readData();
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   POST /tasks
// @desc    创建新任务
router.post('/', async (req, res) => {
    try {
        const { no, text, status, photos } = req.body;
        
        if (!no || !text) {
            return res.status(400).json({ error: 'Missing required fields (no, text)' });
        }

        const tasks = await readData();
        
        // 检查编号是否已存在
        if (tasks.some(task => task.no === no)) {
            return res.status(400).json({ error: `Task number ${no} already exists` });
        }

        const newTask = {
            id: Date.now(), // 简单生成一个唯一ID
            no,
            text,
            status: status || 'pending',
            photos: photos || []
        };

        tasks.push(newTask);
        await writeData(tasks);
        res.status(201).json(newTask);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   PUT /tasks/:id
// @desc    更新任务
router.put('/:id', async (req, res) => {
    try {
        const taskId = parseInt(req.params.id);
        const { no, text, status, photos } = req.body;

        let tasks = await readData();
        const taskIndex = tasks.findIndex(task => task.id === taskId);

        if (taskIndex === -1) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // 更新字段
        tasks[taskIndex] = { ...tasks[taskIndex], no, text, status, photos };
        await writeData(tasks);
        
        res.json(tasks[taskIndex]);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   DELETE /tasks/:id
// @desc    删除任务
router.delete('/:id', async (req, res) => {
    try {
        const taskId = parseInt(req.params.id);
        let tasks = await readData();
        
        const initialLength = tasks.length;
        tasks = tasks.filter(task => task.id !== taskId);

        if (tasks.length === initialLength) {
            return res.status(404).json({ error: 'Task not found' });
        }

        await writeData(tasks);
        res.json({ message: 'Task deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;