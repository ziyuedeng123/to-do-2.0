/* ============================================================
   任务清单 V5.3 — 前端（已对齐 Node.js 后端 · Vercel 部署版）
   ✅ 后端路由：
      GET    /api/tasks
      POST   /api/tasks
      PUT    /api/tasks/:id
      DELETE /api/tasks/:id
   ============================================================ */

// 使用相对路径，适配任意域名（本地开发 & Vercel 部署均可）
const API_BASE = "/api/tasks";
// 🔴 注意：此处密钥仅用于演示。生产环境应使用用户登录 + JWT 方案
const API_KEY  = "my-secret-key";

let currentTab = "all";
let sortOrder = "asc";
let editingId = null;
let editPhotos = [];
let cachedTasks = []; // 缓存已加载的任务，避免重复请求

/* =========================
   DOM 快捷
   ========================= */
const $ = id => document.getElementById(id);

const noInput     = $("noInput");
const taskInput   = $("taskInput");
const hint        = $("hint");
const tableBody   = $("tableBody");
const sortNoBtn   = $("sortNoBtn");
const tabsEl      = $("tabs");
const tabIndicator = $("tabIndicator");

/* =========================
   初始化
   ========================= */
window.addEventListener("load", async () => {
  updateTabIndicator();
  updateSortUI();
  await refreshTable();
});

window.addEventListener("resize", updateTabIndicator);

/* =========================
   Tab 切换
   ========================= */
function updateTabIndicator() {
  const activeTab = tabsEl.querySelector(".tab.active");
  if (!activeTab) return;
  tabIndicator.style.width = activeTab.offsetWidth + "px";
  tabIndicator.style.left  = activeTab.offsetLeft + "px";
}

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t =>
      t.classList.toggle("active", t === tab)
    );
    currentTab = tab.dataset.tab;
    updateTabIndicator();
    renderTable(cachedTasks);
  });
});

/* =========================
   排序
   ========================= */
function cycleSortOrder() {
  sortOrder = sortOrder === "asc" ? "desc" : "asc";
}

function updateSortUI() {
  if (!sortNoBtn) return;
  // 同步 data-sort 属性（CSS 样式依赖此属性）
  sortNoBtn.setAttribute("data-sort", sortOrder);
  const icon = sortNoBtn.querySelector(".sort-icon");
  if (icon) icon.textContent = sortOrder === "asc" ? "↑" : "↓";
}

sortNoBtn.addEventListener("click", () => {
  cycleSortOrder();
  updateSortUI();
  renderTable(cachedTasks);
});

/* =========================
   数据加载
   ========================= */
async function loadTasks() {
  try {
    console.log(`[请求] GET ${API_BASE}`);
    const res = await fetch(API_BASE, {
      headers: { "x-api-key": API_KEY }
    });

    if (!res.ok) {
      if (res.status === 401) {
        showToast("❌ API Key 无效：请确认前后端密钥一致");
        console.error("API Key 校验失败：", await res.text());
      } else if (res.status === 404) {
        showToast("❌ 后端接口不存在：请确认地址带 /api/tasks");
        console.error("接口 404：", API_BASE);
      } else {
        showToast(`⚠️ 后端请求失败：${res.status}`);
        console.error("请求失败，状态码：", res.status);
      }
      return [];
    }

    const data = await res.json();
    return data.map(migrateTask);
  } catch (err) {
    console.error("网络错误：", err);
    showToast("⚠️ 无法连接后端：请确认后端已启动");
    return [];
  }
}

/**
 * 数据格式转换：后端字段 → 前端字段
 * 后端 status: "pending" | "in-progress" | "completed"
 */
function migrateTask(t) {
  return {
    id: String(t.id),
    no: t.no || "",
    text: t.text || "",
    done: t.status === "completed",
    status: t.status || "pending",
    photos: Array.isArray(t.photos) ? t.photos : [],
    createdAt: t.createdAt || null,
    updatedAt: t.updatedAt || null
  };
}

/* =========================
   表格渲染
   ========================= */
async function refreshTable() {
  cachedTasks = await loadTasks();
  renderTable(cachedTasks);
}

function renderTable(tasks) {
  let list = [...tasks];

  // Tab 过滤
  if (currentTab === "todo") list = list.filter(t => !t.done);
  if (currentTab === "done") list = list.filter(t => t.done);

  // 排序（按编号中的数字部分）
  list.sort((a, b) => {
    const na = parseInt(a.no.replace(/\D/g, "")) || 0;
    const nb = parseInt(b.no.replace(/\D/g, "")) || 0;
    return sortOrder === "asc" ? na - nb : nb - na;
  });

  tableBody.innerHTML = "";

  if (list.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center;color:#888;padding:40px;">
          暂无任务
        </td>
      </tr>`;
    return;
  }

  list.forEach(task => {
    const tr = document.createElement("tr");
    tr.dataset.id = task.id;

    const statusHtml = task.done
      ? `<span class="status done">已完成</span>`
      : task.status === "in-progress"
        ? `<span class="status in-progress">进行中</span>`
        : `<span class="status todo">未完成</span>`;

    const evidenceBtn = task.photos.length
      ? `<button class="btn btn-secondary" data-action="show-evidence">📷 查看证据 (${task.photos.length})</button>`
      : "";

    tr.innerHTML = `
      <td class="col-no">${escapeHtml(task.no)}</td>
      <td class="col-text">${escapeHtml(task.text)}</td>
      <td class="col-status">${statusHtml}</td>
      <td class="col-count">${task.photos.length}</td>
      <td class="col-action">
        <div class="action-group">
          <button class="btn btn-edit" data-action="edit">✏️ 编辑</button>
          <button class="btn btn-danger" data-action="delete">删除</button>
          ${evidenceBtn}
        </div>
      </td>
    `;
    tableBody.appendChild(tr);

    if (task.photos.length) {
      const evTr = document.createElement("tr");
      evTr.className = "evidence-row";
      evTr.hidden = true;
      evTr.innerHTML = `<td colspan="5"></td>`;
      tableBody.appendChild(evTr);
    }
  });
}

/* =========================
   事件委托
   ========================= */
tableBody.addEventListener("click", async e => {
  const action = e.target.dataset.action;
  const tr = e.target.closest("tr");
  if (!tr || !tr.dataset.id) return;

  const id = tr.dataset.id;

  if (action === "edit") {
    openEditModal(id);
    return;
  }

  if (action === "delete") {
    if (!confirm("确认删除该任务吗？")) return;
    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: "DELETE",
        headers: { "x-api-key": API_KEY }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(`❌ 删除失败：${err.error || res.status}`);
        return;
      }
      await refreshTable();
      showToast("✅ 任务已删除");
    } catch (err) {
      console.error("删除失败：", err);
      showToast("⚠️ 网络错误，删除失败");
    }
    return;
  }

  if (action === "show-evidence") {
    toggleEvidence(tr, id);
    return;
  }
});

/* =========================
   添加任务
   ========================= */
async function addTask() {
  const no = noInput.value.trim();
  const text = taskInput.value.trim();
  hint.textContent = "";

  if (!no || !text) {
    hint.textContent = "编号和任务名称不能为空";
    return;
  }

  try {
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY
      },
      body: JSON.stringify({ no, text, status: "pending", photos: [] })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      hint.textContent = err.error || (err.errors && err.errors.join("; ")) || `添加失败 (${res.status})`;
      return;
    }

    noInput.value = "";
    taskInput.value = "";
    noInput.focus();
    await refreshTable();
    showToast("✅ 任务已添加");
  } catch (err) {
    console.error("添加失败：", err);
    hint.textContent = "网络错误，请检查后端是否运行";
  }
}

$("addBtn").addEventListener("click", addTask);
noInput.addEventListener("keydown", e => { if (e.key === "Enter") addTask(); });
taskInput.addEventListener("keydown", e => { if (e.key === "Enter") addTask(); });

/* =========================
   编辑浮层
   ========================= */
function openEditModal(id) {
  // 直接从缓存中查找，无需重新请求
  const task = cachedTasks.find(t => t.id === id);
  if (!task) {
    showToast("⚠️ 任务数据未找到，请刷新页面");
    return;
  }

  editingId = id;
  editPhotos = [...task.photos];

  $("editNo").value = task.no;
  $("editText").value = task.text;
  $("editStatus").value = String(task.done);
  $("editHint").textContent = "";

  renderEditPreviews();
  $("editModal").hidden = false;
}

function renderEditPreviews() {
  const box = $("editPreviewList");
  box.innerHTML = editPhotos.map((src, i) => `
    <div class="preview-item">
      <img src="${escapeHtml(src)}" alt="预览图 ${i + 1}" />
      <span class="remove" data-index="${i}">×</span>
    </div>
  `).join("");
}

$("editPreviewList").addEventListener("click", e => {
  if (!e.target.classList.contains("remove")) return;
  editPhotos.splice(Number(e.target.dataset.index), 1);
  renderEditPreviews();
});

$("saveEdit").addEventListener("click", async () => {
  const no = $("editNo").value.trim();
  const text = $("editText").value.trim();
  const done = $("editStatus").value === "true";

  if (!no || !text) {
    $("editHint").textContent = "编号和任务名称不能为空";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/${editingId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY
      },
      body: JSON.stringify({
        no,
        text,
        status: done ? "completed" : "pending",
        photos: editPhotos
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      $("editHint").textContent = err.error || (err.errors && err.errors.join("; ")) || `保存失败 (${res.status})`;
      return;
    }

    closeEditModal();
    await refreshTable();
    showToast("✅ 任务已更新");
  } catch (err) {
    console.error("保存失败：", err);
    $("editHint").textContent = "网络错误，保存失败";
  }
});

$("cancelEdit").addEventListener("click", closeEditModal);
$("editModal").addEventListener("click", e => {
  if (e.target === $("editModal")) closeEditModal();
});

function closeEditModal() {
  $("editModal").hidden = true; // 🔴 修复：之前是 false，导致弹窗关不掉
  editingId = null;
  editPhotos = [];
}

/* =========================
   证据展开
   ========================= */
function toggleEvidence(row, id) {
  const task = cachedTasks.find(t => t.id === id);
  if (!task) return;

  const next = row.nextElementSibling;
  if (!next) return;

  const open = !next.hidden;
  next.hidden = open;

  if (!open) {
    next.querySelector("td").innerHTML = `
      <div class="evidence-grid">
        ${task.photos.map(p => `<img src="${escapeHtml(p)}" alt="证据" loading="lazy" />`).join("")}
      </div>`;
  }
}

/* =========================
   工具函数
   ========================= */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function showToast(msg) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toast.classList.remove("show"), 2500);
}