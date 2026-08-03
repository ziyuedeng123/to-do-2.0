// backend/routes/tasks.js
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { readData, writeData } = require('../data/store');
const { checkApiKey } = require('../middleware/auth');

const VALID_STATUSES = ['pending', 'in-progress', 'completed'];
const MAX_TEXT_LENGTH = 500;

// 应用鉴权中间件到所有路由
router.use(checkApiKey);

// 生成唯一 ID
function generateId() {
    return `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

// 校验任务字段
function validateTaskFields(body, isUpdate = false) {
    const errors = [];

    if (!isUpdate || body.text !== undefined) {
        if (!body.text || typeof body.text !== 'string') {
            errors.push('text is required and must be a string');
        } else if (body.text.trim().length === 0) {
            errors.push('text cannot be empty');
        } else if (body.text.length > MAX_TEXT_LENGTH) {
            errors.push(`text must be at most ${MAX_TEXT_LENGTH} characters`);
        }
    }

    if (!isUpdate || body.status !== undefined) {
        if (body.status && !VALID_STATUSES.includes(body.status)) {
            errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);
        }
    }

    if (body.photos !== undefined && !Array.isArray(body.photos)) {
        errors.push('photos must be an array');
    }

    return errors;
}

// @route   GET /api/tasks
// @desc    获取所有任务
router.get('/tasks', async (req, res) => {
    try {
        const tasks = await readData();
        res.json(tasks);
    } catch (err) {
        console.error(`[${new Date().toISOString()}] GET /tasks error:`, err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   POST /api/tasks
// @desc    创建新任务
router.post('/tasks', async (req, res) => {
    try {
        const { no, text, status, photos } = req.body;

        if (!no) {
            return res.status(400).json({ error: 'Missing required field: no' });
        }

        const validationErrors = validateTaskFields(req.body);
        if (validationErrors.length > 0) {
            return res.status(400).json({ errors: validationErrors });
        }

        const tasks = await readData();

        if (tasks.some(task => task.no === no)) {
            return res.status(409).json({ error: `Task number ${no} already exists` });
        }

        const newTask = {
            id: generateId(),
            no,
            text: text.trim(),
            status: status || 'pending',
            photos: photos || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        tasks.push(newTask);
        await writeData(tasks);
        res.status(201).json(newTask);
    } catch (err) {
        console.error(`[${new Date().toISOString()}] POST /tasks error:`, err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   PUT /api/tasks/:id
// @desc    更新任务
router.put('/tasks/:id', async (req, res) => {
    try {
        const taskId = req.params.id;
        const { no, text, status, photos } = req.body;

        const validationErrors = validateTaskFields(req.body, true);
        if (validationErrors.length > 0) {
            return res.status(400).json({ errors: validationErrors });
        }

        const tasks = await readData();
        const taskIndex = tasks.findIndex(task => task.id === taskId);

        if (taskIndex === -1) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // 只更新传入的字段，保留未传入的字段
        const updatedTask = { ...tasks[taskIndex] };
        if (no !== undefined) updatedTask.no = no;
        if (text !== undefined) updatedTask.text = text.trim();
        if (status !== undefined) updatedTask.status = status;
        if (photos !== undefined) updatedTask.photos = photos;
        updatedTask.updatedAt = new Date().toISOString();

        tasks[taskIndex] = updatedTask;
        await writeData(tasks);

        res.json(updatedTask);
    } catch (err) {
        console.error(`[${new Date().toISOString()}] PUT /tasks/${req.params.id} error:`, err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   DELETE /api/tasks/:id
// @desc    删除任务
router.delete('/tasks/:id', async (req, res) => {
    try {
        const taskId = req.params.id;
        const tasks = await readData();

        const initialLength = tasks.length;
        const filteredTasks = tasks.filter(task => task.id !== taskId);

        if (filteredTasks.length === initialLength) {
            return res.status(404).json({ error: 'Task not found' });
        }

        await writeData(filteredTasks);
        res.json({ message: 'Task deleted successfully' });
    } catch (err) {
        console.error(`[${new Date().toISOString()}] DELETE /tasks/${req.params.id} error:`, err);
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;