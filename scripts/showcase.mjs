// Takes the showcase screenshots from the live demo (claude-config/DEMO-STANDARD.md
// > Showcase screenshots). Run it again after a screen in the set changes a lot.
//
//   npm run showcase
//   npm run showcase -- http://127.0.0.1:3000
//
// It opens the Landing Page and presses "Try the demo" in one fresh browser, so
// the data is the Sample Data. Each screen at desktop 1440x900 and phone 390x844,
// English, light theme (the CRM has no dark theme), demo banner and dev badge
// hidden. The PNGs go to `showcase/`, named for what they show. They change only
// when someone runs this.
//
// It drives the Edge or Chrome already on the laptop (playwright-core), so no
// browser is downloaded. Each run starts one Guest; the 7-day cleanup deletes it.
// The door allows 5 Guests an hour per IP.
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

function fail(message) {
  console.error(`showcase: ${message}`);
  process.exit(1);
}

const site = (process.argv[2] ?? "https://tekguyz-crm.vercel.app").replace(/\/$/, "");

const OUT = "showcase";
const DESKTOP = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 };
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const LOOK = { locale: "en-US", reducedMotion: "reduce", colorScheme: "light" };

// Each screen, at both widths. `open` is a path inside the app.
const SCREENS = [
  { name: "today", open: "/" },
  { name: "pipeline", open: "/pipeline" },
  { name: "contacts", open: "/contacts" },
  { name: "reports", open: "/reports" },
];
const DEVICES = [
  { suffix: "desktop", options: DESKTOP },
  { suffix: "phone", options: PHONE },
];

// The demo banner has no hook of its own, only its label. `nextjs-portal` is
// the Next.js dev badge, for when the site is `next dev`.
const HIDE = "aside[aria-label='Demo'], nextjs-portal { display: none !important; }";

async function launch() {
  for (const channel of ["msedge", "chrome"]) {
    try {
      return await chromium.launch({ channel });
    } catch {
      // Not on this laptop: try the next one.
    }
  }
  fail("needs Microsoft Edge or Google Chrome installed.");
}

/** Presses "Try the demo"; returns the Guest's signed-in cookies. */
async function startDemo(browser) {
  const context = await browser.newContext({ ...DESKTOP, ...LOOK });
  const page = await context.newPage();
  await page.goto(site);
  await page.getByRole("button", { name: "Try the demo" }).first().click();
  await page.waitForSelector("aside[aria-label='Demo']", { timeout: 60_000 });
  const session = await context.storageState();
  await context.close();
  return session;
}

async function shoot(browser, session, screen, device) {
  const context = await browser.newContext({ ...device.options, ...LOOK, storageState: session });
  const page = await context.newPage();
  await page.goto(site + screen.open);
  await page.waitForLoadState("networkidle");
  await page.addStyleTag({ content: HIDE });
  await page.evaluate(() => document.fonts.ready);
  const file = `${OUT}/${screen.name}-${device.suffix}.png`;
  await page.screenshot({ path: file });
  await context.close();
  console.log(`showcase: ${file}`);
}

mkdirSync(OUT, { recursive: true });
const browser = await launch();
try {
  const session = await startDemo(browser);
  for (const screen of SCREENS) for (const device of DEVICES) await shoot(browser, session, screen, device);
} finally {
  await browser.close();
}
