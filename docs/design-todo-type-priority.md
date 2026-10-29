# 设计文档：Todo 任务类型 / 紧急程度 / 完成态样式强化

- 文档版本：**v1.0**
- 创建日期：2026-10-29
- 作者：Software Architect Agent
- 依据：`docs/requirements.md` v0.2（已确认需求 R-01~R-07、AC-01~AC-28、非目标清单、C-01~C-06）
- 现状基线：`index.html`（346 行，HEAD `9a88eae`）

---

## 1. 设计摘要

本次是对现有单文件 Todo 应用的**最小侵入式增量改造**，在保持「单文件、零依赖、无构建、无后端、
localStorage 唯一存储」的既有架构约束下，新增三件事：

1. 数据模型扩展：每条记录新增 `type`（个人/公共）与 `priority`（紧急/一般/不急）两个字段；
2. 新增表单第二行：两个 `<select>` 控件，仅在新增任务时选择，创建后不可修改；
3. 完成态视觉强化：由「仅文字灰化」升级为「整行灰化 + 徽章降透明并灰度 + 删除按钮降透明」。

设计原则：

- **不改**存储键名 `todo-list-data`，**不引入**版本号外层包装、多分区存储、任何第三方依赖；
- 旧数据通过**运行时归一化兜底**，加载瞬间**不写回** localStorage，归一化结果在下一次正常 `save()` 时自然持久化；
- 所有用户文本仍通过 `textContent` 渲染，**禁止** `innerHTML` 拼接用户文本；
- `id` 保持 `number` 型，用「碰撞检测 + 递增」保证唯一，兼容旧数据与 `Number(li.dataset.id)` 解析；
- 「公共」仅为本机显示标记（需求 3.6 之理解 A），**不**涉及多用户/共享/同步。

---

## 2. 数据模型设计

### 2.1 字段表

| 字段 | 类型 | 取值 / 约束 | 默认值 | 说明 |
|---|---|---|---|---|
| `id` | `number` | 正整数（`typeof === 'number'`），全局唯一 | 无（必填，运行时兜底补发） | 保持数值型，兼容旧数据与 `Number(li.dataset.id)` |
| `text` | `string` | 添加时 `trim()` 后非空；`maxlength="200"`（输入层约束） | 无（必填；旧数据缺 text 时兜底为 `''`） | 渲染一律走 `textContent` |
| `completed` | `boolean` | `true` / `false` | `false` | 现状字段，不变 |
| `type` | `string` | `'personal'` \| `'public'` | `'personal'` | **新增**，仅创建时可选，创建后不可修改 |
| `priority` | `string` | `'urgent'` \| `'normal'` \| `'low'` | `'normal'` | **新增**，仅创建时可选，创建后不可修改 |

### 2.2 枚举取值（含中文文案与配色）

| 字段 | 枚举值 | 中文文案 | 配色 |
|---|---|---|---|
| `type` | `'personal'` | 个人 | 蓝 |
| `type` | `'public'` | 公共 | 紫 |
| `priority` | `'urgent'` | 紧急 | 红 |
| `priority` | `'normal'` | 一般 | 黄 |
| `priority` | `'low'` | 不急 | 灰 |

### 2.3 id 唯一性算法（保持 number 型）

现状 `id: Date.now()` 在同一毫秒内连续新增两条会得到相同 `id`（R-07-1 缺陷）。
改造要求：**保持数值型**，检测碰撞并递增（而非字符串或 UUID）。

伪代码：

```js
// 在全部已有 id 中检测碰撞，撞上就 +1 直到唯一
function nextId(existingIds) {
  var candidate = Date.now();
  while (existingIds.indexOf(candidate) !== -1) {
    candidate += 1;
  }
  return candidate;
}
```

说明：

- 传入的 `existingIds` 来自当前内存数组 `todos`（本应用为单标签页本地存储，内存数组即全量）；
- 起点 `Date.now()` 保持与现状一致；碰撞时逐个递增，最终仍为 `number` 型整数；
- 可选增强（非必须）：`candidate = Math.max(Date.now(), maxId + 1)` 可保证单调递增、
  避免极端时钟回拨时的多次碰撞，但**不得**破坏「碰撞检测 + 递增」的基本要求；
- 兼容性：旧数据的 `id` 仍是 number，`Number(li.dataset.id)` 解析逻辑不变。

---

## 3. 旧数据归一化设计

### 3.1 目标（对应 R-06）

- 加载时对 `load()` 解析出的数组**逐项归一化**；
- 缺失 `type` → `'personal'`，缺失 `priority` → `'normal'`；
- 非法枚举值按默认值处理；
- 非对象条目丢弃（不产生 `undefined` 徽章、不报错）；
- 整体 JSON 损坏或非数组 → 回退空数组（保持 F-15）；
- **运行时兜底**：归一化只发生在内存中，加载瞬间**不写回** localStorage（R-06-2）。

### 3.2 `normalizeTodo(item)` 语义 / 伪代码

```js
// 输入：load() 得到的数组中的任意一项；输出：归一化后的记录，或 null（应丢弃）
function normalizeTodo(item) {
  // 1. 非对象（null / 原始值 / 数组）→ 丢弃该条目
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return null;
  }

  // 2. text：缺失或非 string → 兜底为空字符串（保留条目，不丢失 id/状态）
  var text = (typeof item.text === 'string') ? item.text : '';

  // 3. completed：仅严格 true 视为已完成，其余（缺失/非布尔）→ false
  var completed = (item.completed === true);

  // 4. type：仅 'public' 通过，其余（缺失 / 'personal' / 非法值）→ 'personal'
  var type = (item.type === 'public') ? 'public' : 'personal';

  // 5. priority：'urgent' / 'low' 通过，其余（缺失 / 'normal' / 非法值）→ 'normal'
  var priority = (item.priority === 'urgent' || item.priority === 'low')
    ? item.priority : 'normal';

  // 6. id：缺失 / 非 number / NaN → 运行时补发唯一数值 id（仅在内存，不写回）
  var id = (typeof item.id === 'number' && !isNaN(item.id))
    ? item.id : nextId(existingIdsInMemory());

  return { id: id, text: text, completed: completed, type: type, priority: priority };
}
```

要点：

- **非对象丢弃**：这是唯一「丢条目」的场景，仅针对结构上无法归一化的脏数据（如数组里混入 `null`），
  符合 R-06-6 的「整体损坏回退」精神；普通旧数据 `{id,text,completed}` 不会被丢弃；
- **缺 text 不丢条目**：为满足 R-06-4「不得丢失条目」，缺 text 保留为 `''`（显示为空文本项），
  而非整条丢弃；
- **归一化结果不落盘**：`load()` 只返回归一化后的内存数组，调用处不得在加载路径调用 `save()`；
  下次用户操作（增/删/切换）触发的 `save()` 自然写入新字段（R-06-3）。

---

## 4. 函数改动清单

| 函数 | 现状 | 改动 | 原因 | 标记 |
|---|---|---|---|---|
| `load` | `JSON.parse`，数组则原样返回，否则回退 `[]` | 对数组逐项 `normalizeTodo`，丢弃 `null` 项后返回；**不调用 save** | 旧数据归一化、运行时兜底（R-06） | 修改 |
| `save` | `JSON.stringify(todos)` + try/catch | **不变** | 归一化结果随下次 save 自然持久化（R-06-3） | 不变 |
| `addTodo` | `push({ id: Date.now(), text, completed:false })` | 读取 `#type-select`、`#priority-select` 的值，改调用 `createTodo(text, type, priority)`；成功后重置两个 select 回默认值（个人/一般） | 新增字段、id 唯一、AC-01~05 | 修改 |
| `toggleTodo` | 遍历匹配 `id` 翻转 `completed` | **不变** | 逻辑不受新字段影响 | 不变 |
| `deleteTodo` | `filter(id !== item.id)` | **不变** | 逻辑不受新字段影响 | 不变 |
| `render` | 逐条建 `span.text` + `button.delete-btn` | 在列表项内增加类型徽章、紧急度徽章（`createElement` + `textContent`） | AC-07~09 展示徽章 | 修改 |
| `updateStats` | 统计 done / pending 文案 | **不变** | F-17 统计逻辑与文案不改 | 不变 |
| `normalizeTodo` | 无 | 新增：单条记录归一化（见第 3 节） | R-06 | 新增 |
| `createTodo` | 无 | 新增：生成含默认值与唯一 id 的新记录（见下） | R-05 / R-07 | 新增 |

`createTodo` 语义（供 Developer 参考，内部可配合 `nextId` 辅助函数）：

```js
function createTodo(text, type, priority) {
  return {
    id: nextId(当前所有 id),
    text: text,
    completed: false,
    type: (type === 'public') ? 'public' : 'personal',
    priority: (priority === 'urgent' || priority === 'low') ? priority : 'normal'
  };
}
```

> 注：`nextId` 为 `createTodo` 内部的唯一 id 生成辅助函数（可独立成小函数便于测试），
> 不作为对外业务函数单独列出。

---

## 5. UI 结构设计

在现有 `.input-row`（首行：输入框 + 「添加」按钮）**下方新增第二行**，放置两个选择控件。
首行结构与行为**保持不变**（F-03、F-04、F-12）。

建议 DOM 结构（新增部分）：

```html
<div class="input-row">                    <!-- 首行：保持不变 -->
  <input type="text" id="todo-input" placeholder="输入新的待办事项…" maxlength="200">
  <button id="add-btn">添加</button>
</div>

<!-- 新增第二行：类型 + 紧急度 -->
<div class="input-row input-row--options">
  <label class="field">
    <span class="field-label">类型</span>
    <select id="type-select">
      <option value="personal">个人</option>
      <option value="public">公共</option>
    </select>
  </label>
  <label class="field">
    <span class="field-label">紧急度</span>
    <select id="priority-select">
      <option value="urgent">紧急</option>
      <option value="normal" selected>一般</option>
      <option value="low">不急</option>
    </select>
  </label>
</div>
```

命名约定：

- 控件 id：`#type-select`（类型）、`#priority-select`（紧急度）；
- 默认选中态：`personal`（个人）与 `normal`（一般），与默认值、AC-01/AC-05 一致；
- 用 `<label>` + `.field` 包裹，`.field-label` 提供可见文案，兼顾可访问性（点击 label 即聚焦 select）；
- 使用 `select` 而非自由输入，从源头保证取值在枚举内（降低非法枚举风险）。

**≤400px 不溢出布局方案：**

- `.input-row--options` 沿用 `display: flex; gap: 10px;`；
- 两个 `.field` 均设 `flex: 1; min-width: 0;`；
- `.field select { width: 100%; }`，配合全局 `box-sizing: border-box`，select 不会超出父容器；
- 不设固定像素宽度、不引入绝对定位；两个 select 各占约一半宽度，窄屏下自动收缩，无横向溢出；
- 若需 `.field-label` 与 select 分行，可设 `.field { display: flex; flex-direction: column; gap: 4px; }`。

---

## 6. 样式设计

### 6.1 徽章 `.badge` 及变体配色

基础类：

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: 12px;
  line-height: 1.6;
  border-radius: 999px;
  white-space: nowrap;
  flex-shrink: 0;   /* 窄屏不被压缩，配合 .text 的 flex:1 保证不遮挡文字 */
}
```

类型 / 紧急度变体（**具体色值**）：

| 徽章 | 类名 | 文字色 | 背景色 | 说明 |
|---|---|---|---|---|
| 个人 | `.badge.badge-type-personal` | `#1e40af` | `#dbeafe` | 蓝；建议新增 CSS 变量 `--type-personal: #3b82f6` 作为主色 |
| 公共 | `.badge.badge-type-public` | `#5b21b6` | `#ede9fe` | 紫；建议新增 CSS 变量 `--type-public: #8b5cf6` |
| 紧急 | `.badge.badge-priority-urgent` | `#b91c1c` | `#fee2e2` | 红；与现有 `--danger: #ef4444` 同色系，可复用 `--danger` |
| 一般 | `.badge.badge-priority-normal` | `#b45309` | `#fef3c7` | 黄；建议新增 CSS 变量 `--priority-normal: #f59e0b` |
| 不急 | `.badge.badge-priority-low` | `#4b5563` | `#e5e7eb` | 灰；可复用 `--text-light: #6b7280` 同色系 |

CSS 变量结论（复用 or 新增）：

- **复用**：`--danger`（紧急红的主色语义）、`--text-light`（不急灰的深色文字语义）、`--border`/`--card`（徽章边框/底色可参考）；
- **新增**（可选但建议，便于单一来源管理）：
  `--type-personal: #3b82f6`、`--type-public: #8b5cf6`、`--priority-normal: #f59e0b`；
  徽章背景/文字采用上表的浅色 tint + 深色文字（保证对比度，黄色徽章不会因纯黄底黄字不可读）。

### 6.2 `.completed` 整行灰化（完整 CSS）

现状仅 `li.completed .text` 灰化（`index.html` 第 131-134 行）。本次扩大为整行灰化：

```css
/* 整行灰化 */
li.completed {
  background: #f9fafb;             /* 浅灰底替代白色 */
  border-color: #e5e7eb;           /* 边框更浅灰 */
}

/* 文字：保持现状（灰 + 删除线） */
li.completed .text {
  color: var(--text-light);
  text-decoration: line-through;
}

/* 徽章：降低不透明度并灰度化 */
li.completed .badge {
  opacity: 0.55;
  filter: grayscale(1);
}

/* 删除按钮：降低不透明度，hover 恢复 */
li.completed .delete-btn {
  opacity: 0.65;
}

li.completed .delete-btn:hover {
  opacity: 1;
}
```

说明：

- 恢复机制：取消完成后 `li` 不再带 `.completed` 类，上述规则全部失效，样式**完全恢复**（AC-13）；
- 未完成项不带 `.completed`，不受任何影响（AC-14）；
- 判定逻辑仍仅依赖 `completed` 字段（R-03 约束「不得通过改变 completed 以外的判定逻辑实现」）；
- `filter: grayscale(1)` 只作用于徽章自身（含其文字），叠加 `opacity: 0.55` 后仍可辨认文案（AC-11）；
- 可选：`li.completed:hover` 可弱化阴影/位移，但为最小改动可保留现状 hover 效果，不强制。

---

## 7. 渲染流程设计

`render()` 必须用 `createElement` + `textContent` 安全构建徽章，**禁止** `innerHTML` 拼接用户文本。

要点：

1. 列表为空时，现状用 `innerHTML` 写入 `.empty` 提示——该字符串为**静态文案**（不含任何用户数据），
   可保留；但更稳妥的写法是 `createElement('div')` + `textContent`，二选一均可，**不得**掺入用户文本；
2. 每条列表项按顺序追加子节点：`span.text`（`flex:1`）→ 类型徽章 → 紧急度徽章 → `button.delete-btn`；
3. 徽章构建用固定字面量文案（`'个人'` / `'公共'` / `'紧急'` / `'一般'` / `'不急'`），
   通过 `span.textContent = 文案` 写入，**不**用 `innerHTML`；
4. 徽章类名按字段值映射为固定常量，**不**把 `todo.type` / `todo.priority` 直接拼进 HTML 字符串。

徽章辅助函数（伪代码）：

```js
function makeBadge(className, label) {
  var b = document.createElement('span');
  b.className = 'badge ' + className;   // className 为固定枚举映射，非用户输入
  b.textContent = label;                // label 为固定中文文案
  return b;
}

var TYPE_LABEL = { personal: '个人', public: '公共' };
var PRIORITY_LABEL = { urgent: '紧急', normal: '一般', low: '不急' };
var TYPE_CLASS = { personal: 'badge-type-personal', public: 'badge-type-public' };
var PRIORITY_CLASS = { urgent: 'badge-priority-urgent', normal: 'badge-priority-normal', low: 'badge-priority-low' };
```

渲染单条（伪代码）：

```js
li.appendChild(span /* .text, textContent = todo.text */);
li.appendChild(makeBadge(TYPE_CLASS[todo.type], TYPE_LABEL[todo.type]));
li.appendChild(makeBadge(PRIORITY_CLASS[todo.priority], PRIORITY_LABEL[todo.priority]));
li.appendChild(delBtn /* ×，aria-label=删除 */);
```

> 因为归一化保证 `todo.type` / `todo.priority` 始终在枚举内（第 3 节），映射结果不会出现 `undefined`。

---

## 8. 事件处理设计

新增的两个 `<select>` 位于**表单区**（`.input-row--options`），在 `ul#todo-list` **之外**，
因此它们的 `change`/`click` 事件不会进入 `list` 上的点击事件委托，**不需要** `stopPropagation`。

- `#add-btn` 的 `click` 与 `#todo-input` 的 `keydown`（Enter）继续调用 `addTodo()`，`addTodo` 内部读取两个 select 的当前值；
- 两个 select **无需**绑定额外事件：它们的值在点击「添加」时一次性读取；
- `addTodo` 成功后把两个 select 重置为默认值（`personal` / `normal`），满足 AC-05。

**若未来要支持「编辑已有任务的类型/紧急度」（本次明确不做，仅说明）：**

- 届时编辑控件会出现在 `li` 内部，点击会冒泡到 `list` 的委托处理器，误触发 `toggleTodo`；
- 处理方式（二选一或组合）：
  1. 在委托处理器入口加白名单守卫：`if (target.closest('select, .badge-edit, button')) return;`（对明确不触发完成的控件提前返回）；
  2. 在编辑控件自身的事件里调用 `e.stopPropagation()`；
- 编辑保存后需走 `save()` + `render()` 重绘，并注意 `li.dataset.id` 继续用 `Number()` 解析。
- 本次实现**不**引入以上任何逻辑。

---

## 9. 安全与健壮性

| 风险点 | 设计对策 |
|---|---|
| XSS（用户文本注入） | 所有用户文本经 `textContent` 写入；徽章文案/类名为固定字面量/枚举映射；仅 `.empty` 静态文案可用 `innerHTML`（不含用户数据）；禁止任何 `innerHTML` 拼接用户文本（AC-09） |
| localStorage 异常 | `load()` 保留 try/catch（JSON 损坏/配额/隐私模式异常回退 `[]`，F-15）；`save()` 保留 try/catch（写入失败静默，内存可用，F-16）；归一化逻辑不触发写操作 |
| 非法枚举值 | `normalizeTodo` 对 `type`/`priority` 做白名单校验，非法值回落默认（R-06-5）；`createTodo` 同样白名单校验，从源头避免非法值入库 |
| id 碰撞 | `nextId` 对已有 id 做碰撞检测并递增（R-07）；保持 number 型，`Number(li.dataset.id)` 解析不受影响 |
| NaN / 非法 id | 归一化时 `typeof id === 'number' && !isNaN(id)` 校验，非法则运行时补发唯一数值 id（仅内存，不写回）；渲染 `li.dataset.id` 恒为合法 number |
| 缺失字段 | `text` 缺失 → `''`；`completed` 缺失 → `false`；`type` 缺失 → `'personal'`；`priority` 缺失 → `'normal'`；`id` 缺失 → 补发。任何字段缺失都不产生 `undefined` 徽章或崩溃 |
| 非对象条目 | 归一化返回 `null`，调用方过滤丢弃，数组内混入脏数据不崩溃 |
| 统计健壮性 | `updateStats` 仅依赖 `completed` 布尔，归一化后恒为布尔，统计稳定 |

---

## 10. 测试策略建议

### 10.1 纯逻辑单测（node:test）

- **目录建议：`validation/`**（而非 `tests/`）。依据：需求 C-04 明确「纯逻辑测试可沿用 `validation/` 的 `node:test` 方式」，
  该约定来自 PR #1（`feat/l2-validation`）。当前分支尚未合并 PR #1，因此 `validation/` 目录不存在，
  Tester 需在本分支**新建** `validation/` 目录并放置测试文件，例如 `validation/todo-model.test.js`。
- 运行环境：本机 `node v24.22.1`（已实测），直接 `node --test validation/` 即可，无需 `package.json`。
- 被测纯逻辑（不涉及 DOM，可独立测试）：
  - `normalizeTodo`：覆盖「非对象 / 缺 text / type、priority 缺失 / 非法枚举 / completed 缺失 / id 缺失或 NaN」各分支；
  - `createTodo` / `nextId`：覆盖「默认值（`personal`/`normal`）」「非法 type/priority 回落默认」「id 为 number 且与已有 id 不重复」「连续多条 id 互不相同」；
- **实现衔接建议**：由于交付约束为单文件（`index.html` 含内联脚本），纯逻辑函数位于 IIFE 内不可直接 `import`。
  两个可选方案（供 Tester 决策，不改变单文件约束）：
  1. **标记提取法（推荐，避免漂移）**：测试文件读取 `index.html`，按注释标记（如 `// ==== pure logic ====` 起止）截取纯函数段，`new Function` 求值后导出并断言——需 Developer 在 `index.html` 内把 `normalizeTodo`/`createTodo`/`nextId` 圈入明确标记且不触碰 DOM；
  2. **镜像副本法（简单但易漂移）**：测试文件内复制一份纯逻辑副本并加「与 index.html 保持同步」注释。
- 测试断言要点与验收标准对齐：AC-16（旧数据归一化为「个人」「一般」）、AC-20（非法枚举回落默认）、AC-26（同毫秒 id 不重复）、AC-01（默认值）。

### 10.2 浏览器手工验收要点（供 Tester）

- 直接打开 `index.html`，用 DevTools → Application → Local Storage 预置/检查 `todo-list-data`；
- 覆盖 AC-01~AC-28，重点：
  - 默认值：不动 select 直接添加 → 存 `personal`/`normal`（AC-01）；添加后 select 复位（AC-05）；
  - 徽章展示与配色：个人蓝/公共紫/紧急红/一般黄/不急灰（AC-07、AC-08）；
  - 完成态：整行灰化、徽章 0.55 透明度 + 灰度、删除按钮 0.65 + hover 恢复、取消后完全恢复（AC-10~14）；
  - 兼容：预置 `[{id,text,completed}]` 旧数据不报错、显示「个人」「一般」、加载瞬间 localStorage 未被改写、操作一次后新字段落盘（AC-16~18）；
  - 回归：删除精确、统计文案、空列表提示、Enter 添加、maxlength=200、≤400px 不溢出（AC-21~28）；
  - XSS：文本含 `<img onerror=...>` 时按纯文本显示（AC-09）。

---

## 11. 实施顺序建议（给 Developer 的最小步骤序列）

按依赖顺序推进，每步保持可运行、可回归：

1. **数据层（纯逻辑）**：在 `index.html` 内新增 `nextId`、`createTodo`、`normalizeTodo` 三个纯函数（暂不接线）；
2. **归一化接线**：`load()` 内对解析出的数组逐项 `normalizeTodo` 并过滤 `null`；确认**不**在 load 路径调用 `save()`；
3. **新增写入接线**：`addTodo()` 改为调用 `createTodo`（读取 select 值 + 成功后复位 select）；先接入 `#type-select`/`#priority-select` 前需完成第 4 步 UI，故第 3、4 步可合并；
4. **UI**：在 `.input-row` 下方新增 `.input-row--options` 及两个 select（含默认选中项）；
5. **渲染**：`render()` 用 `makeBadge` 增加类型/紧急度徽章，保持 `textContent`；
6. **样式**：新增 `.badge` 及 5 个变体、`.completed` 整行灰化规则（含徽章/删除按钮规则）；
7. **自测**：`node --test validation/`（若有）+ 浏览器手工回归 AC-01~AC-28，重点 AC-16~18、AC-26、AC-28。

> 顺序说明：数据层 → 归一化 → UI（含 addTodo 接线）→ 样式 → 自测，与本任务给定的「数据层 → 归一化 → UI → 样式 → 自测」一致。

---

## 12. 待确认事项

无。

> 说明：核对 `docs/requirements.md` v0.2 全文（R-01~R-07、AC-01~AC-28、非目标清单、C-01~C-06），
> 未发现需求之间相互矛盾之处。两处需求未覆盖的边界细节已在本文档内给出**最小保守方案**并注明理由，
> 不扩大范围：
> 1. 「旧数据缺 `text`」：保留条目、`text` 兜底为空字符串（满足 R-06-4「不得丢失条目」）——见第 3 节；
> 2. 「旧数据缺/非法 `id`」：运行时补发唯一数值 id，仅内存不写回——见第 2、3、9 节。
