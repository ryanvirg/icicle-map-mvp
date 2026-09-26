import puppeteer from "puppeteer-core";
import { mkdir, readFile } from "node:fs/promises";
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

async function assertMapVisible(page) {
  const state = await page.evaluate(() => ({
    painted: Boolean(document.querySelector('[data-vectors-painted="true"]')),
    schematic: Boolean(
      document.querySelector('[data-testid="watershed-schematic-fallback"]'),
    ),
    chart: Boolean(
      document.querySelector('svg[aria-label="Historical Channel hydrograph"]'),
    ),
    mapCanvas: Boolean(document.querySelector(".maplibre-gl-canvas")),
  }));
  const ok = (state.painted || state.schematic) && state.chart;
  if (!ok) {
    throw new Error(
      `Map/chart not visible: ${JSON.stringify(state)}`,
    );
  }
}

async function capture(browser, url, outfile, width, height) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "networkidle0", timeout: 120000 });
  await page.waitForSelector(".maplibre-gl-canvas, [data-testid=\"watershed-schematic-fallback\"]", {
    timeout: 90000,
  });
  await page.waitForSelector('[data-vectors-painted="true"], [data-testid="watershed-schematic-fallback"]', {
    timeout: 90000,
  });
  await page.waitForSelector('svg[aria-label="Historical Channel hydrograph"]', {
    timeout: 60000,
  });
  await new Promise((r) => setTimeout(r, 4000));
  await assertMapVisible(page);
  await page.screenshot({ path: outfile, fullPage: false });
  const buf = await readFile(outfile);
  if (buf.length < 80_000) {
    throw new Error(`Screenshot ${outfile} too small — likely blank`);
  }
  await page.close();
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await waitForServer("http://127.0.0.1:4317/");

  const browser = await puppeteer.launch({
    executablePath: "/usr/local/bin/google-chrome",
    headless: false,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--enable-webgl",
      "--use-gl=angle",
    ],
    defaultViewport: null,
  });

  const desktop = path.join(OUT_DIR, "icicle-map-mvp.png");
  const mobile = path.join(OUT_DIR, "icicle-map-mvp-mobile.png");

  await capture(browser, BASE, desktop, 1440, 900);
  await capture(browser, BASE, mobile, 390, 844);

  await browser.close();
  console.log("Wrote", desktop);
  console.log("Wrote", mobile);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
