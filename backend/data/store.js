// backend/data/store.js
const fs = require('fs').promises;
const path = require('path');

// Vercel 环境下使用 /tmp，本地开发使用当前目录
const DATA_DIR = process.env.VERCEL ? '/tmp' : __dirname;
const DATA_FILE = path.join(DATA_DIR, 'tasks.json');

// 简单的内存锁，防止并发写入
let writeLock = false;
const pendingWrites = [];

async function acquireLock() {
    while (writeLock) {
        await new Promise(resolve => pendingWrites.push(resolve));
    }
    writeLock = true;
}

function releaseLock() {
    writeLock = false;
    const next = pendingWrites.shift();
    if (next) next();
}

// 读取数据
async function readData() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const parsed = JSON.parse(data);
        if (!Array.isArray(parsed)) {
            console.error('⚠️  Data file is not an array, resetting to empty array.');
            return [];
        }
        return parsed;
    } catch (error) {
        if (error.code === 'ENOENT') {
            // 文件不存在，初始化空文件
            await fs.writeFile(DATA_FILE, '[]', 'utf8');
            return [];
        }
        if (error instanceof SyntaxError) {
            console.error('⚠️  Data file is corrupted, resetting to empty array.');
            await fs.writeFile(DATA_FILE, '[]', 'utf8');
            return [];
        }
        console.error('❌ Failed to read data:', error);
        throw error;
    }
}

// 写入数据（带锁防止竞态 + 临时文件原子写入）
async function writeData(data) {
    await acquireLock();
    try {
        const tmpFile = DATA_FILE + '.tmp';
        await fs.writeFile(tmpFile, JSON.stringify(data, null, 2), 'utf8');
        await fs.rename(tmpFile, DATA_FILE);
    } finally {
        releaseLock();
    }
}

module.exports = { readData, writeData };