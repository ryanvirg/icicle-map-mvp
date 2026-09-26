import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const OUT_DIR =
  "/cursor/stores/bc-19065879-c2dd-435a-8053-e8457f64b51e/media";
const BASE = "http://127.0.0.1:4317/?feature=historical-channel";

async function waitForServer(url, attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server not ready at ${url}`);
}

async function capture(browser, url, outfile, width, height) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
  await page.waitForFunction(
    () => {
      const map = document.querySelector('[data-map-ready="true"]');
      const chart = document.body.innerText.includes(
        "Historical Channel — routed flow",
      );
      return Boolean(map && chart);
    },
    { timeout: 45000 },
  );
  await page.screenshot({ path: outfile, fullPage: true });
  await page.close();
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await waitForServer("http://127.0.0.1:4317/");

  const browser = await puppeteer.launch({
    executablePath: "/usr/local/bin/google-chrome",
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--enable-webgl",
      "--use-gl=angle",
    ],
  });

  const desktop = path.join(OUT_DIR, "icicle-map-mvp.png");
  const mobile = path.join(OUT_DIR, "icicle-map-mvp-mobile.png");

  await capture(browser, BASE, desktop, 1440, 1600);
  await capture(browser, BASE, mobile, 390, 1200);

  await browser.close();
  console.log("Wrote", desktop);
  console.log("Wrote", mobile);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
