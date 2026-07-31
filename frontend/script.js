/* ============================================================
   任务清单 V5.2 — 前端（已对齐 Node.js 后端）
   ✅ 后端地址：http://localhost:3000/api
   ✅ 后端接口：
      GET    /api/tasks
      POST   /api/tasks
      PUT    /api/tasks/:id
      DELETE /api/tasks/:id
   ============================================================ */

const API_BASE = "to-do-2-0-1qdko3ysq-111-f894.vercel.app/api"; // ✅ 关键点：加了 /api
const API_KEY  = "abc123xyz789";

let currentTab = "all";
let sortOrder = "asc";
let editingId = null;
let editPhotos = [];

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
  updateSortIndicator();
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
    refreshTable();
  });
});

/* =========================
   排序
   ========================= */
function cycleSortOrder() {
  sortOrder = sortOrder === "asc" ? "desc" : "asc";
}

function updateSortIndicator() {
  if (!sortNoBtn) return;
  const icon = sortNoBtn.querySelector(".sort-icon");
  if (!icon) return;
  icon.textContent = sortOrder === "asc" ? "↑" : "↓";
}

sortNoBtn.addEventListener("click", () => {
  cycleSortOrder();
  updateSortIndicator();
  refreshTable();
});

/* =========================
   数据加载（✅ 已修复）
   ========================= */
async function loadTasks() {
  try {
    const res = await fetch(API_BASE, {
      headers: { "x-api-key": API_KEY }
    });

    if (!res.ok) {
      if (res.status === 401) {
        showToast("❌ API Key 无效，请检查后端配置");
      } else {
        showToast("⚠️ 无法连接后端，请确认 node app.js 已运行");
      }
      return [];
    }

    const data = await res.json();
    return data.map(migrateTask);
  } catch (err) {
    console.error(err);
    showToast("⚠️ 网络错误，无法连接后端");
    return [];
  }
}

/**
 * ✅ 数据格式转换
 * 后端字段 → 前端字段
 */
function migrateTask(t) {
  return {
    id: String(t.id),
    no: t.no || "",
    text: t.text || "",
    done: t.status === "fixed",   // pending → false, fixed → true
    photos: Array.isArray(t.photos) ? t.photos : [],
    finishedAt: t.finishedAt || null
  };
}

/* =========================
   表格渲染
   ========================= */
async function refreshTable() {
  const tasks = await loadTasks();
  renderTable(tasks);
}

function renderTable(tasks) {
  let list = [...tasks];

  // Tab 过滤
  if (currentTab === "todo") list = list.filter(t => !t.done);
  if (currentTab === "done") list = list.filter(t => t.done);

  // 排序
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
      : `<span class="status todo">未完成</span>`;

    const evidenceBtn = task.photos.length
      ? `<button class="btn btn-secondary" data-action="show-evidence">📷 查看证据</button>`
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
    await fetch(`${API_BASE}/${id}`, {
      method: "DELETE",
      headers: { "x-api-key": API_KEY }
    });
    await refreshTable();
    showToast("✅ 任务已删除");
    return;
  }

  if (action === "show-evidence") {
    toggleEvidence(tr, id);
    return;
  }
});

/* =========================
   添加任务（✅ 已修复）
   ========================= */
async function addTask() {
  const no = noInput.value.trim();
  const text = taskInput.value.trim();
  hint.textContent = "";

  if (!no || !text) {
    hint.textContent = "编号和任务名称不能为空";
    return;
  }

  await fetch(API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY
    },
    body: JSON.stringify({
      no,
      text,
      status: "pending", // 后端约定：pending = 未完成
      photos: []
    })
  });

  noInput.value = "";
  taskInput.value = "";
  noInput.focus();
  await refreshTable();
  showToast("✅ 任务已添加");
}

$("addBtn").addEventListener("click", addTask);
noInput.addEventListener("keydown", e => { if (e.key === "Enter") addTask(); });
taskInput.addEventListener("keydown", e => { if (e.key === "Enter") addTask(); });

/* =========================
   编辑浮层
   ========================= */
function openEditModal(id) {
  loadTasks().then(tasks => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    editingId = id;
    editPhotos = [...task.photos];

    $("editNo").value = task.no;
    $("editText").value = task.text;
    $("editStatus").value = String(task.done);
    $("editHint").textContent = "";

    renderEditPreviews();
    $("editModal").hidden = false;
  });
}

function renderEditPreviews() {
  const box = $("editPreviewList");
  box.innerHTML = editPhotos.map((src, i) => `
    <div class="preview-item">
      <img src="${src}" />
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

  await fetch(`${API_BASE}/${editingId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY
    },
    body: JSON.stringify({
      no,
      text,
      status: done ? "fixed" : "pending", // 后端约定
      photos: editPhotos
    })
  });

  closeEditModal();
  await refreshTable();
  showToast("✅ 任务已更新");
});

$("cancelEdit").addEventListener("click", closeEditModal);
$("editModal").addEventListener("click", e => {
  if (e.target === $("editModal")) closeEditModal();
});

function closeEditModal() {
  $("editModal").hidden = true;
  editingId = null;
  editPhotos = [];
}

/* =========================
   证据展开
   ========================= */
function toggleEvidence(row, id) {
  loadTasks().then(tasks => {
    const task = tasks.find(t => t.id === id);
    const next = row.nextElementSibling;
    if (!next) return;
    const open = !next.hidden;
    next.hidden = open;
    if (!open) {
      next.querySelector("td").innerHTML = `
        <div class="evidence-grid">
          ${task.photos.map(p => `<img src="${p}" />`).join("")}
        </div>`;
    }
  });
}

/* =========================
   工具
   ========================= */
function escapeHtml(str) {
  const div = document. createElement("div");
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