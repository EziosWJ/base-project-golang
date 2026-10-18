// 组件级夹具验证单据布局与既有弹窗的兼容行为；示例页部分使用拦截请求，不写业务数据。
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const port = 4183;
const base = `http://127.0.0.1:${port}`;
const vite = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], { cwd: new URL("..", import.meta.url), stdio: "ignore" });

const menus = [{
  id: 12, parentId: 0, menuName: "页面示例", menuType: "DIR", path: "/examples", icon: "FileText", permissionCode: "examples", sortOrder: 4, visible: 1,
  children: [{ id: 42, parentId: 12, menuName: "单据弹窗 Demo", menuType: "MENU", path: "/examples/document-dialog", icon: "ClipboardList", permissionCode: "examples:document-dialog", sortOrder: 7, visible: 1, children: [] }],
}];

const dialogWidth = (dialog) => dialog.evaluate((el) => Math.round(el.getBoundingClientRect().width));

const frame = (el) => {
  const header = el.querySelector("header").getBoundingClientRect();
  const footer = el.querySelector("footer").getBoundingClientRect();
  return { headerTop: Math.round(header.top), footerBottom: Math.round(footer.bottom), viewportHeight: window.innerHeight };
};

let browser;
try {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(base)).ok) break; } catch { /* Vite is still starting. */ } await delay(100); }
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => localStorage.setItem("react-admin-auth", JSON.stringify({ token: "Bearer document-dialog", user: { id: 1, username: "demo", nickname: "演示", roles: [] } })));
  const writes = [];
  await context.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (!path.startsWith("/api/")) return route.fallback();
    if (request.method() !== "GET") writes.push(`${request.method()} ${path}`);
    const respond = (value) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ code: 200, message: "OK", data: value }) });
    if (path === "/api/auth/me") return respond({ id: 1, username: "demo", nickname: "演示", roles: [] });
    if (path === "/api/auth/menus") return respond(menus);
    if (path.endsWith("unread-count")) return respond(0);
    if (path.endsWith("/page")) return respond({ records: [], total: 0, page: 1, pageSize: 10 });
    if (path.endsWith("/events")) return route.fulfill({ status: 200, contentType: "text/event-stream", body: "" });
    return respond([]);
  });

  const errors = [];
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(String(error)));

  // A. 兼容回归：未启用单据布局的既有弹窗尺寸与关闭策略不变
  await page.goto(`${base}/tests/document-dialog.html`, { waitUntil: "networkidle" });

  await page.getByTestId("open-detail").click();
  const plainDetail = page.getByRole("dialog", { name: "普通详情弹窗" });
  await plainDetail.waitFor();
  assert.equal(await dialogWidth(plainDetail), 860, "普通详情弹窗应保持 860px");
  await page.keyboard.press("Escape");
  await plainDetail.waitFor({ state: "hidden" });

  await page.getByTestId("open-form").click();
  const plainForm = page.getByRole("dialog", { name: "普通表单弹窗" });
  await plainForm.waitFor();
  assert.equal(await dialogWidth(plainForm), 760, "普通表单弹窗应保持 760px");
  await page.keyboard.press("Escape");
  await plainForm.waitFor({ state: "hidden" });

  await page.getByTestId("open-loading-form").click();
  const loadingForm = page.getByRole("dialog", { name: "提交中的表单弹窗" });
  await loadingForm.waitFor();
  await page.keyboard.press("Escape");
  await delay(200);
  assert.ok(await loadingForm.isVisible(), "提交中的表单弹窗不应被 Escape 关闭");
  // 提交中按设计不可关闭，重新加载夹具页复位状态。
  await page.goto(`${base}/tests/document-dialog.html`, { waitUntil: "networkidle" });
  console.log("✓ 兼容：普通详情 860px、普通表单 760px、提交中不可 Escape 关闭");

  // B. 单据布局：固定头尾、正文独立滚动、折叠区可键盘到达
  await page.getByTestId("open-document-detail").click();
  const documentDetail = page.getByRole("dialog", { name: "单据详情弹窗" });
  await documentDetail.waitFor();
  assert.equal(await dialogWidth(documentDetail), 1100, "单据详情弹窗应放宽到 1100px");
  const before = await documentDetail.evaluate(frame);
  assert.ok(before.headerTop >= 0 && before.footerBottom <= before.viewportHeight, `头尾应在视口内：${JSON.stringify(before)}`);
  const overflowing = await documentDetail.evaluate((el) => {
    const tall = el.querySelector("[data-testid='document-detail-tall']").getBoundingClientRect();
    const footer = el.querySelector("footer").getBoundingClientRect();
    return tall.bottom > footer.top;
  });
  assert.ok(overflowing, "长内容应真实溢出正文区域");
  await documentDetail.evaluate((el) => {
    const scroller = [...el.querySelectorAll("*")].find((node) => node.scrollHeight > node.clientHeight + 1);
    scroller.scrollTop = scroller.scrollHeight;
  });
  await delay(200);
  assert.deepEqual(await documentDetail.evaluate(frame), before, "正文滚动时头部与底部操作区位置不变");

  const tabStops = [];
  for (let i = 0; i < 6; i += 1) {
    await page.keyboard.press("Tab");
    tabStops.push(await page.evaluate(() => document.activeElement?.tagName ?? ""));
  }
  assert.ok(tabStops.includes("SUMMARY"), `折叠区应能通过 Tab 到达：${tabStops.join(",")}`);

  await documentDetail.getByTestId("document-detail-close").click();
  await documentDetail.waitFor({ state: "hidden" });
  await page.getByTestId("open-document-form").click();
  const documentForm = page.getByRole("dialog", { name: "单据确认弹窗" });
  await documentForm.waitFor();
  assert.equal(await dialogWidth(documentForm), 1100, "单据确认弹窗应放宽到 1100px");
  await page.keyboard.press("Escape");
  await documentForm.waitFor({ state: "hidden" });
  console.log("✓ 单据布局：1100px、头尾固定、正文独立滚动、折叠区可 Tab 到达");

  // C. 示例页：两种模式都能打开，取消不产生写请求
  await page.goto(`${base}/dashboard`);
  await page.getByRole("button", { name: "页面示例" }).click();
  await page.getByRole("link", { name: "单据弹窗 Demo" }).click();
  await page.waitForURL("**/examples/document-dialog");
  await page.getByRole("heading", { name: "单据弹窗 Demo" }).waitFor();

  await page.getByRole("button", { name: "查看单据详情" }).click();
  const demoDetail = page.getByRole("dialog", { name: /演示单据 · DEMO-20261014-001/ });
  await demoDetail.waitFor();
  const order = await demoDetail.evaluate((el) => {
    const overview = el.querySelector("section[aria-label='单据概览']");
    const items = el.querySelector("section[aria-label='商品明细']");
    const delivery = [...el.querySelectorAll("details")].find((node) => node.querySelector("summary")?.textContent?.includes("送货资料"));
    const follows = (first, second) => Boolean(first && second && (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) > 0);
    return { itemsAfterOverview: follows(overview, items), disclosureAfterItems: follows(items, delivery), openDisclosures: el.querySelectorAll("details[open]").length };
  });
  assert.deepEqual(order, { itemsAfterOverview: true, disclosureAfterItems: true, openDisclosures: 0 }, "示例页信息顺序与折叠默认收起");
  await demoDetail.getByRole("button", { name: "关闭", exact: true }).click();
  await demoDetail.waitFor({ state: "hidden" });

  await page.getByRole("button", { name: "保存并过账" }).click();
  const demoConfirm = page.getByRole("dialog", { name: "确认过账演示单据" });
  await demoConfirm.waitFor();
  await demoConfirm.getByText("即将提交的明细").waitFor();
  await demoConfirm.getByRole("button", { name: "取消" }).click();
  await demoConfirm.waitFor({ state: "hidden" });
  assert.deepEqual(writes, [], "示例页不应产生写请求");
  console.log("✓ 示例页：菜单可进入，详情与确认都能打开，取消不产生写请求");

  assert.deepEqual(errors, []);
  console.log("\n单据弹窗组件与示例页验收通过。");
} finally {
  await browser?.close();
  vite.kill();
}
