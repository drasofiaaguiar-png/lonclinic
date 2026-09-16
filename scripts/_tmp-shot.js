const fs = require("fs");

const wsUrl = process.argv[2];
if (!wsUrl) {
  console.error("missing ws url");
  process.exit(1);
}

(async () => {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  ws.on("message", (data) => {
    const msg = JSON.parse(data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  });
  await new Promise((res, rej) => {
    ws.on("open", res);
    ws.on("error", rej);
  });
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const i = ++id;
      pending.set(i, resolve);
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  await send("Page.enable");
  await send("Runtime.enable");

  async function shot(url, w, h, file, selector) {
    await send("Emulation.setDeviceMetricsOverride", {
      width: w,
      height: h,
      deviceScaleFactor: 1,
      mobile: w < 500,
    });
    await send("Page.navigate", { url });
    await new Promise((r) => setTimeout(r, 1500));
    if (selector) {
      await send("Runtime.evaluate", {
        expression: `document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({block:"center"})`,
      });
      await new Promise((r) => setTimeout(r, 700));
    }
    const img = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(file, Buffer.from(img.result.data, "base64"));
    console.log("wrote", file);
  }

  await shot("http://127.0.0.1:8770/", 1440, 900, "scripts/_tmp-hero-desktop.png");
  await shot("http://127.0.0.1:8770/", 390, 844, "scripts/_tmp-hero-mobile.png");
  await shot("http://127.0.0.1:8770/", 1440, 900, "scripts/_tmp-burnout-desktop.png", "#teste-burnout");
  await shot("http://127.0.0.1:8770/", 390, 844, "scripts/_tmp-burnout-mobile.png", "#teste-burnout");
  await shot("http://127.0.0.1:8770/", 1440, 900, "scripts/_tmp-cta-desktop.png", ".lon-consult-cta");
  await shot("http://127.0.0.1:8770/", 390, 844, "scripts/_tmp-cta-mobile.png", ".lon-consult-cta");
  ws.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
