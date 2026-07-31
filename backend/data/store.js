// backend/data/store.js
const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join(__dirname, 'tasks.json');

// 读取数据
async function readData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // 如果文件不存在，返回空数组
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

// 写入数据
async function writeData(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

module.exports = { readData, writeData };