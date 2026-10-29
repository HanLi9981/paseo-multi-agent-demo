# 待办事项（Todo）项目 — 项目计划

- 文档版本：v0.1（骨架）
- 创建日期：2026-10-28
- 项目路径：`C:\Users\hanli\pi-test`
- 当前阶段：**阶段 0 — 环境与流程验证（进行中）**

---

## 1. 项目目标

### 1.1 已确认目标
| 编号 | 目标 | 依据 |
|---|---|---|
| G-01 | 以现有 `index.html` 单页待办应用为基线，建立可追溯的需求与计划文档 | 本次指令 |
| G-02 | 建立 PM → 系统设计 → 开发 → 测试 的多 Agent 协作交付链路，并通过分级验证确认其真实可用 | 本次指令 |

### 1.2 待确认目标
- 业务侧要交付的最终形态（继续单文件、工程化改造、还是上线部署）：见 `docs/requirements.md` R-11。
- 功能范围与验收标准：见 `docs/requirements.md` 第 3 节，**全部未确认**。

## 2. 角色与协作方式

| 角色 | Profile | 配置 | 职责 |
|---|---|---|---|
| 项目经理 | Project Manager | pi / deepseek-v4-flash / thinking=high | 需求澄清、文档、任务分解、调度、审核、汇报（当前会话） |
| 系统设计 | Software Architect | pi / deepseek-v4-flash / thinking=**off** | 架构、模块、接口、异常与安全设计 |
| 技术开发 | Software Developer | pi / deepseek-v4-flash / thinking=high | 编码、单元测试、缺陷修复 |
| 软件测试 | Software Tester | pi / deepseek-v4-flash / thinking=high | 独立功能/集成/回归测试，缺陷举证 |

环境事实：Paseo host `srv_N066WgM2ztEy`（label: enjoy），无远程 host；工作区 `wks_956a24b91eb287ac`，isolation=local。Provider 中仅 `pi` 可用（claude / codex / copilot / opencode unavailable；omp 已禁用；antigravity、muse 报 PATH 错误）。

## 3. 主要阶段

| 阶段 | 内容 | 产出物 | 状态 |
|---|---|---|---|
| 阶段 0 | 环境与流程验证 | 本文档、需求文档；L1 验证记录 | **进行中** |
| 阶段 1 | 需求澄清与确认 | 用户确认的 R-01 ~ R-12、验收标准 | 未开始（阻塞于用户输入） |
| 阶段 2 | 系统设计 | 架构与模块设计、接口/数据设计、风险标注 | 未开始 |
| 阶段 3 | 开发计划 | 任务分解、依赖、里程碑、分支策略 | 未开始 |
| 阶段 4 | 编码与单元测试 | 功能代码、单测、代码变更摘要 | 未开始 |
| 阶段 5 | 独立测试 | 测试用例、执行记录、缺陷清单 | 未开始 |
| 阶段 6 | 缺陷修复与回归 | 修复提交、回归结果 | 未开始 |
| 阶段 7 | 交付审核与发布 | 交付清单、发布记录（需用户明确批准） | 未开始 |

## 4. 当前进度

### 4.1 已完成
| 编号 | 事项 | 证据 |
|---|---|---|
| P-01 | Paseo 工具可用性核查：MCP 已连接，62 个工具；4 个 Agent Profile；仅 `pi` Provider 可用；82 个模型；pendingPermissions=0 | 工具返回结果 |
| P-02 | 工作区确认：`wks_956a24b91eb287ac` ↔ `C:\Users\hanli\pi-test`，isolation=local | `list_workspaces` |
| P-03 | `index.html` 全文读取与现状梳理（22 项已知功能事实 F-01 ~ F-22），已写入需求文档第 2 节 | 本文件 + 需求文档 |
| P-04 | **L1 单 Agent 委派验证通过** | 见 4.2 |
| P-05 | 创建 `docs/requirements.md`、`docs/project-plan.md` 骨架 | 本文件 |

### 4.2 L1 验证记录（通过）
- 子 Agent ID：`110eb3cb-4095-48dd-8697-ba406633adb8`（标题：L1-只读验证-index.html）
- 配置：`pi/deepseek/deepseek-v4-flash`，thinking=high，workspace=`wks_956a24b91eb287ac`，notifyOnFinish=true
- 任务：只读 `index.html`，返回标题、关键 DOM 结构、`<script>` 数量；禁止写文件与 bash
- 实际工具调用：`[Read] C:\Users\hanli\pi-test\index.html`（活动记录中仅此一次工具调用，无写类调用）
- 结果核对：`TITLE=待办事项`、DOM（`.app` / `h1` / `.input-row` / `#todo-input` / `#add-btn` / `.stats` / `#stats-pending` / `#stats-done` / `#todo-list`）、`SCRIPT_COUNT=1`，与真实文件 7/7 项一致
- 状态流转：running → idle（约 2 秒），`attentionReason=finished`，无权限阻塞
- 用量：input 2,616 / output 168 tokens，约 $0.00043
- 归档：`archive_agent` 返回 success=true，无残留
- 结论：**委派链路（创建→投递→工具执行→通知→审计→归档）完整可用**

### 4.3 未完成
| 编号 | 事项 | 状态 |
|---|---|---|
| N-01 | **L2 验证**：Developer 在功能分支提交最小改动 + 单测 → Tester 独立实跑测试 → PM 审核 | **未完成**，被 shell / Git 阻塞 |
| N-02 | Git 分支与 worktree 隔离验证 | 未完成 |
| N-03 | 需求范围与验收标准确认 | 未开始，等待用户 |
| N-04 | 系统设计与开发计划 | 未开始 |
| N-05 | 编码、测试、缺陷闭环 | 未开始 |
| N-06 | GitHub 仓库接入与认证验证 | 未开始 |

## 5. 下一步任务（按依赖排序）

1. **解除 B1**：由用户安装 Git for Windows（或提供可用 bash 路径），随后验证 `bash` 可执行 `git status`。此项是 L2 的前置条件。
2. **解除 B2**：在获得用户许可后执行 `git init` + 首次提交；确认功能分支与 worktree 可用（本次指令禁止执行，故未做）。
3. **L2 打通**：Developer 在 `feat/validation` 分支完成一个最小可测改动与单测 → Tester 独立运行并出具报告 → PM 核对测试输出。
4. **需求澄清**：就需求文档第 3 节 R-01 ~ R-12 逐项向用户确认，形成可验收条目。
5. **设计阶段**：需求确认后启动系统设计 Agent，产出架构与模块设计，重大技术选型提交用户确认。
6. **GitHub 接入**：确认仓库地址、默认分支、认证方式，再执行提交/推送；合并与发布须另行获批。

## 6. 风险与阻塞

| 编号 | 风险/阻塞 | 等级 | 影响 | 应对 |
|---|---|---|---|---|
| B1 | 缺少 Bash 环境 | **高** | 开发无法装依赖/跑测试；测试无法执行；Git 与 `paseo` CLI 不可用 | 安装 Git for Windows 或配置 `shellPath` |
| B2 | 未初始化 Git 仓库 | **高** | 无分支/worktree 隔离，无法提交与回溯 | 获准后 `git init` |
| B3 | GitHub 认证状态未确认 | 中 | 无法推送、PR、发布；不得假设已配置 | 用户提供仓库与凭据信息后实测 |
| B4 | 需求与验收标准未确认 | **高** | 开发范围不可控，无法判定完成 | 阶段 1 逐项确认，禁止提前开发 |
| B5 | `pi` Provider 的 `availableModes` 为空 | 中 | 无法为委派 Agent 指定 plan/full-access 等模式，权限边界只能依赖默认值 | 确认实际写入权限；必要时改为工具层限制 |
| B6 | Architect Profile 的 thinking=off | 中 | 设计质量可能不足 | 与用户确认是否改为 high |
| B7 | 其他 Provider 全部不可用 | 低 | 无备用模型；`pi` 不可用时全链路中断 | 保持 `pi` 可用性监控 |
| B8 | 单文件架构无测试与依赖管理 | 中 | 引入测试需结构性改动（可能违反当前形态） | 先确认 R-11 交付形态 |
| B9 | `save()` 静默失败、`load()` 静默回退 | 低 | 存储异常时用户无感知，可能丢数据 | 列入待确认需求（是否需要错误提示） |

## 7. 待解决问题清单

- [ ] 本机 bash 不可用（B1）— 待用户安装/配置
- [ ] Git 仓库未初始化（B2）— 待用户授权后执行
- [ ] GitHub 认证状态未确认（B3）— 待用户提供信息并实测
- [ ] 需求范围与验收标准未确认（B4）
- [ ] L2 开发/测试/分支验证未完成（N-01、N-02）
- [ ] 委派 Agent 的权限模式无法显式指定（B5）
- [ ] Architect thinking 配置待定（B6）
- [ ] 交付形态待定（R-11）

## 8. 变更记录

| 版本 | 日期 | 变更 | 作者 |
|---|---|---|---|
| v0.1 | 2026-10-28 | 创建骨架；记录 L1 通过、L2 未完成、B1~B3 阻塞 | Project Manager Agent |
