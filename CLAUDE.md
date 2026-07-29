# CLAUDE.md

请使用中文交流和思考！

## 项目结构

```
project/
├── react-admin/   # 前端项目（React），直接在此开发
├── base-api/      # 后端项目（Java），直接在此开发
```

## 上下文管理规则

**避免全量读取脚手架项目，按需读取：**

1. **不要递归列出** `react-admin/` 或 `base-api/` 全部文件
2. **先读 task 文件**（`task/`）了解当前任务范围，再针对性读源码
3. **用 Explore agent 搜索**，而不是直接 Read 整个目录
4. **一次只读一个子模块**（如 `src/components/UserTable.tsx`），不要批量读整个目录
5. **需要架构参考时**，只读 `docs/` 或 `experience/` 下的摘要文件

## 工作模式

- **直接在脚手架项目内开发**，不新建 `src/` 目录
- push 已禁用，可以放心在 `react-admin/` 和 `base-api/` 中改动代码
- 参考脚手架结构时，按需读取具体文件，不要批量扫描

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## Agent skills

### Issue tracker

工作项存放在本仓库的 GitHub Issues，skills 通过 `gh` CLI 读写。详见 `docs/agents/issue-tracker.md`。

### Triage labels

triage 流转使用 5 个默认标签（needs-triage / needs-info / ready-for-agent / ready-for-human / wontfix）。详见 `docs/agents/triage-labels.md`。

### Domain docs

单上下文：根目录 `CONTEXT.md` + `docs/adr/`。详见 `docs/agents/domain.md`。
