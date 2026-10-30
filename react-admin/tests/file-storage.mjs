import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const port = 4197;
const base = `http://127.0.0.1:${port}`;
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
const vite = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
  cwd: new URL("..", import.meta.url), stdio: "ignore",
});
let browser;
try {
  let ready = false;
  for (let i = 0; i < 100; i += 1) {
    try { ready = (await fetch(base)).ok; } catch { /* Wait for Vite. */ }
    if (ready) break;
    await delay(100);
  }
  assert.ok(ready, "Vite did not start within 10 seconds");
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
  const page = await browser.newPage();
  page.setDefaultTimeout(10000);
  const apiRequests = [];
  const r2Requests = [];
  await page.route("**/api/v1/system/file/**", async (route) => {
    const request = route.request();
    apiRequests.push(request);
    const url = new URL(request.url());
    const id = Number(url.pathname.split("/").at(-2));
    const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization" };
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
    } else if (url.pathname.endsWith("/access-url")) {
      const action = url.searchParams.get("disposition") === "attachment" ? "download" : "view";
      const remoteName = id === 3 ? "missing" : id === 4 ? "missing-avatar" : "report";
      const data = id === 1 || id === 3 || id === 4
        ? { url: `https://r2-files.example.test/${remoteName}?X-Amz-Signature=test`, direct: true }
        : { url: `/api/v1/system/file/${id}/${action}`, direct: false };
      await route.fulfill({ status: 200, headers, contentType: "application/json", body: JSON.stringify({ code: 200, message: "OK", data }) });
    } else if (url.pathname.endsWith("/view")) {
      await route.fulfill({ status: 200, headers, contentType: "image/png", body: png });
    } else {
      await route.fulfill({ status: 200, headers, contentType: "text/plain", body: "local content" });
    }
  });
  await page.route("https://r2-files.example.test/**", async (route) => {
    r2Requests.push(route.request());
    if (new URL(route.request().url()).pathname.startsWith("/missing")) {
      await route.fulfill({ status: 404, body: "Not found" });
    } else if (route.request().resourceType() === "image") {
      // Direct image display must work without a CORS response or a Blob fetch.
      await route.fulfill({ status: 200, contentType: "image/png", body: png });
    } else {
      await route.fulfill({ status: 200, headers: { "Access-Control-Allow-Origin": "*" }, contentType: "text/plain", body: "R2 content" });
    }
  });
  await page.route(`${base}/file-storage-test`, (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>File storage test</title>" }));
  await page.goto(`${base}/file-storage-test`);
  const result = await page.evaluate(async () => {
    const { setAuthTokenProvider } = await import("/src/lib/api/client.ts");
    const { downloadFile } = await import("/src/features/files/api.ts");
    const { createElement } = (await import("/node_modules/.vite/deps/react.js")).default;
    const { createRoot } = (await import("/node_modules/.vite/deps/react-dom_client.js")).default;
    const { useAuthenticatedFileUrl } = await import("/src/hooks/useAuthenticatedFileUrl.ts");
    setAuthTokenProvider(() => "file-storage-test");
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    function Preview({ id }) {
      const { url, error, onError } = useAuthenticatedFileUrl(`/api/v1/system/file/${id}/view`);
      if (error) return createElement("p", { role: "alert" }, error);
      return url ? createElement("img", { id: "preview", src: url, onError }) : null;
    }
    function Avatar({ id }) {
      const { url, error, onError } = useAuthenticatedFileUrl(`/api/v1/system/file/${id}/view`);
      void error;
      return url
        ? createElement("img", { id: "avatar", src: url, onError })
        : createElement("span", { id: "avatar-placeholder" }, "U");
    }
    window.renderFilePreview = (id) => root.render(createElement(Preview, { id }));
    window.renderAvatar = (id) => root.render(createElement(Avatar, { id }));
    window.revokedFileUrls = [];
    const revoke = URL.revokeObjectURL.bind(URL);
    URL.revokeObjectURL = (url) => { window.revokedFileUrls.push(url); revoke(url); };
    return {
      remoteDownload: await (await downloadFile(1)).text(),
      localDownload: await (await downloadFile(2)).text(),
    };
  });
  assert.deepEqual(result, {
    remoteDownload: "R2 content", localDownload: "local content",
  });

  await page.evaluate(() => window.renderFilePreview(1));
  await page.waitForFunction(() => {
    const image = document.querySelector("#preview");
    return image?.complete && image.naturalWidth > 0;
  });
  assert.match(await page.locator("#preview").getAttribute("src"), /^https:\/\/r2-files\.example\.test\//);
  assert.equal(r2Requests.at(-1).resourceType(), "image", "R2 preview must be loaded by img, not fetch");

  await page.evaluate(() => window.renderFilePreview(2));
  await page.waitForFunction(() => {
    const image = document.querySelector("#preview");
    return image?.src.startsWith("blob:") && image.complete && image.naturalWidth > 0;
  });
  const localBlobUrl = await page.locator("#preview").getAttribute("src");
  await page.evaluate(() => window.renderFilePreview(3));
  await page.getByRole("alert").waitFor();
  assert.match(await page.getByRole("alert").innerText(), /文件加载失败/);
  assert.ok(await page.evaluate((url) => window.revokedFileUrls.includes(url), localBlobUrl), "local Blob URLs must be released when switching previews");

  const avatarImageFailed = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.hostname === "r2-files.example.test" && url.pathname === "/missing-avatar";
  });
  await page.evaluate(() => window.renderAvatar(4));
  await avatarImageFailed;
  await page.waitForFunction(() => !document.querySelector("#avatar") && Boolean(document.querySelector("#avatar-placeholder")));

  assert.equal(r2Requests.length, 4);
  for (const request of r2Requests) {
    assert.equal(request.headers().authorization, undefined, "R2 must never receive the API token");
  }
  const authenticatedRequests = apiRequests.filter((request) => request.method() !== "OPTIONS");
  assert.ok(authenticatedRequests.length >= 8);
  for (const request of authenticatedRequests) {
    assert.equal(request.headers().authorization, "Bearer file-storage-test");
  }
  console.log("file storage: R2 direct image, local Blob cleanup, load errors, avatar fallback, download and credential isolation OK");
} finally {
  await browser?.close();
  vite.kill();
}
