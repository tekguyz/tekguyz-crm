// A REAL-BROWSER LAYOUT CHECK: does any text in the Stage 1 comps get squeezed
// to nothing at realistic content lengths?
//
// WHY THIS EXISTS. Shell/IA Stage 1 prompt 3 needed three measured drafts of
// one meta line before neither the company name nor the assignee could reach
// zero width — in the two rejected drafts a real field measured 1px and 24px
// respectively. Nothing in this repo catches that. It is not a jsdom failure
// mode at all: jsdom has no layout engine, every getBoundingClientRect() is
// 0x0, so a component test can assert the text is in the document while the
// browser renders it as a sliver. The defect is only visible where boxes are
// really laid out, which is why this drives Chrome rather than adding another
// *.test.tsx.
//
// WHAT IT ASSERTS. On each route, at each viewport, no visible element that
// owns at least MIN_CHARS characters of its own text may render narrower than
// MIN_WIDTH_PX. That is deliberately a floor, not a truncation ban: this
// design system truncates on purpose in several places (the pipeline card's
// company name, the webhook URL), and the question is never "did it truncate"
// but "did it survive". A field clipped to 18px is gone.
//
// HOW IT REACHES THE PAGES. Every comp route is auth-gated like the rest of
// the app, so the run starts at /api/dev-login — a REAL sign-in as the seeded
// demo owner, not a bypass (see src/app/api/dev-login/route.ts). That route
// only exists when NODE_ENV is development, which is also the only build where
// the comp routes exist at all, so this check is a dev-server check by
// construction. Start the dev server first:
//
//   npm run dev
//   npm run check:widths
//
// INDEX PAGES ARE DELIBERATELY NOT CHECKED. /shell/form and /shell/settings
// render each variant inside VariantThumb, which scales it with a CSS
// transform — and getBoundingClientRect() reports the TRANSFORMED box, so
// every element on those pages measures about a third of its real width and
// the whole page would report as collapsed. The full-size variant routes below
// are the honest place to measure.
//
// NO NEW DEPENDENCY. This speaks the Chrome DevTools Protocol over a plain
// WebSocket (global since Node 22) against the Chrome already installed on
// this machine. Adding Playwright or Puppeteer for one check would pull a
// second browser download into a repo that has neither.

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

const BASE = process.env.CHECK_WIDTHS_BASE ?? "http://localhost:3000";

// Optional: `--shots <dir>` saves one full-viewport PNG per route per viewport.
// Off by default, because the check is a pass/fail gate and writing images on
// every run would make it one. It exists so a real screenshot of a real
// overlay can be produced without a browser pane - the Browser pane is hidden
// in some sessions, and a page that loaded while it was hidden never
// composites, so its screenshots are blank.
const shotFlag = process.argv.indexOf("--shots");
const SHOT_DIR = shotFlag > -1 ? process.argv[shotFlag + 1] : null;
if (SHOT_DIR) mkdirSync(SHOT_DIR, { recursive: true });

// The floor. 24px is about two characters of the smallest type role in this
// system — below it a value is not truncated, it is gone. Prompt 3's two
// rejected drafts measured 1px and 24px on a real field, so this threshold
// would have caught both.
const MIN_WIDTH_PX = 24;
// Three characters, so the "·" separators the comps use between meta values
// are not reported. They are one character wide on purpose.
const MIN_CHARS = 3;

// 1440x800 is the viewport prompt 3 measured the pipeline card at, kept so the
// two passes are comparable. 1024x800 is added because a width floor that is
// only checked at the widest layout is checking the easy case — every one of
// these variants has a breakpoint below 1440.
const VIEWPORTS = [
  { width: 1440, height: 800 },
  { width: 1024, height: 800 },
];

// `?long=1` is what makes this a check rather than a formality: it swaps in the
// deliberately longest fixture values (see preview/mock-form.ts and
// preview/mock-org.ts). The ordinary fixtures never squeeze anything.
// An entry is either a plain path string, or an object that also carries an
// `open` expression to run IN the page before measuring. The real lead panels
// are overlays with no URL of their own - there is no ?editLeadId= and adding
// one would be production surface invented for a check - so the only honest
// way to measure them is to open them the way a person does, by clicking.
//
// The expression is awaited, polls for hydration rather than sleeping a fixed
// amount, and returns a string the runner prints. A route whose `open` does
// not return "ok" FAILS the run: a check that silently measured the page
// behind an overlay that never opened would be the vacuous pass this whole
// file exists to avoid.
const OPEN_EDIT_DRAWER = `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 60; i += 1) {
    const card = document.querySelector('div[role="button"].cursor-pointer');
    if (card) { card.click(); break; }
    await sleep(250);
  }
  for (let i = 0; i < 60; i += 1) {
    if (document.querySelector('[data-slot="sheet-content"]')) break;
    await sleep(250);
  }
  await sleep(500);
  return document.querySelector('[data-slot="sheet-content"]') ? "ok" : "no drawer";
})()`;

const OPEN_READ_PANEL = `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 60; i += 1) {
    const card = document.querySelector('div[role="button"].cursor-pointer');
    if (card) { card.click(); break; }
    await sleep(250);
  }
  for (let i = 0; i < 60; i += 1) {
    if (document.querySelector('[data-slot="sheet-content"]')) break;
    await sleep(250);
  }
  await sleep(400);
  const toProfile = [...document.querySelectorAll("button")]
    .find((b) => b.textContent.trim() === "View full profile");
  if (!toProfile) return "no profile button";
  toProfile.click();
  for (let i = 0; i < 60; i += 1) {
    if (document.querySelector('nav[aria-label="Jump to section"]')) break;
    await sleep(250);
  }
  await sleep(600);
  return document.querySelector('nav[aria-label="Jump to section"]') ? "ok" : "no panel";
})()`;

const OPEN_CREATE_DRAWER = `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 60; i += 1) {
    const trigger = [...document.querySelectorAll("button")]
      .find((b) => b.textContent.trim() === "New Lead");
    if (trigger) { trigger.click(); break; }
    await sleep(250);
  }
  for (let i = 0; i < 60; i += 1) {
    if (document.querySelector('[data-slot="sheet-content"]')) break;
    await sleep(250);
  }
  await sleep(500);
  return document.querySelector('[data-slot="sheet-content"]') ? "ok" : "no drawer";
})()`;

const ROUTES = [
  // THE REAL ROUTES, added with Shell/IA Stage 2. The comps below are still
  // checked because they are still the record of the comparison, but the
  // shipped surfaces are what actually has to survive a long value now.
  { path: "/contacts", label: "real lead EDIT drawer", open: OPEN_EDIT_DRAWER },
  { path: "/contacts", label: "real lead READ panel", open: OPEN_READ_PANEL },
  { path: "/contacts", label: "real lead CREATE drawer", open: OPEN_CREATE_DRAWER },
  "/shell/form/modal?long=1",
  "/shell/form/drawer?long=1",
  "/shell/form/inline?long=1",
  // The real-scale drawer at its narrowest and its widest. The narrow one is
  // the one that matters: its two-column grid is driven by the `sm:` VIEWPORT
  // breakpoint, not by the panel, so a 448px panel on a 1440px screen still
  // lays out two columns of roughly 200px. If that squeezes a label or a value
  // to nothing, this is where it shows up.
  "/shell/form/full?long=1&width=md",
  "/shell/form/full?long=1&width=3xl",
  "/shell/settings/stacked?long=1",
  "/shell/settings/rail?long=1",
  "/shell/settings/split?long=1",
];

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);

// The measuring expression, as a string because it is evaluated inside the
// page rather than here.
//
// Two exclusions are load-bearing and neither is a fudge:
//
//  - `option` elements report a 0x0 rect in Chrome while their <select> is
//    closed. Every one of them would be a false positive, on every page.
//  - visually-hidden text (Tailwind's .sr-only) is 1px by design and is
//    detected by its computed `clip` AND `clip-path`, not by its size —
//    checking size would also swallow the real collapses this exists to find.
//    BOTH properties are needed: Tailwind v4 implements .sr-only with
//    `clip-path: inset(50%)`, so a `clip`-only test misses every one of them.
//    Found 2026-09-12, when the wired read panel's visually-hidden Radix
//    dialog heading was reported as a 1px collapsed box.
//
// MIN_CHARS counts ALPHANUMERIC characters, not every character. `sm:` is a
// deliberate three-character code token in the comp prose that renders at
// 18.2px because that is how wide "sm:" is — nothing squeezed it, and it is
// the same class of false positive as the "·" separators MIN_CHARS was raised
// to 3 for in the first place. Stripping punctuation first leaves it at two
// characters and out of scope, while a real field value
// ("Holloway Custom Cabinetry & Millwork Incorporated") is untouched. This
// one was failing the check before Stage 2 touched anything.
const PROBE = `(() => {
  const MIN_WIDTH_PX = ${MIN_WIDTH_PX};
  const MIN_CHARS = ${MIN_CHARS};
  const SKIP_TAGS = new Set(["OPTION", "SCRIPT", "STYLE", "TITLE", "HEAD", "NOSCRIPT"]);
  const findings = [];
  let probed = 0;

  for (const el of document.body.querySelectorAll("*")) {
    if (SKIP_TAGS.has(el.tagName)) continue;
    if (el.closest("[aria-hidden='true'], [inert]")) continue;

    // OWN text only — the direct text-node children. Measuring an ancestor's
    // combined text would credit a collapsed child with its parent's width.
    let own = "";
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) own += node.nodeValue;
    }
    own = own.replace(/\\s+/g, " ").trim();
    if (own.replace(/[^a-z0-9]/gi, "").length < MIN_CHARS) continue;

    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") continue;
    if (parseFloat(style.opacity) === 0) continue;
    if (style.clip && style.clip !== "auto") continue;
    if (style.clipPath && style.clipPath !== "none") continue;

    const rect = el.getBoundingClientRect();
    if (rect.height <= 0) continue;

    probed += 1;
    if (rect.width < MIN_WIDTH_PX) {
      findings.push({
        tag: el.tagName.toLowerCase(),
        className: typeof el.className === "string" ? el.className.slice(0, 90) : "",
        text: own.slice(0, 60),
        width: Math.round(rect.width * 10) / 10,
      });
    }
  }

  return { probed, findings };
})()`;

function findChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

async function waitForDevTools(port) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return;
    } catch {
      // Not listening yet.
    }
    await delay(250);
  }
  throw new Error("Chrome's DevTools endpoint never came up.");
}

// The smallest CDP client that does the job: one page target, one socket,
// id-matched replies. No session plumbing, because connecting straight to the
// page target's own WebSocket skips it.
function connect(wsUrl) {
  const socket = new WebSocket(wsUrl);
  const pending = new Map();
  const waiters = [];
  let nextId = 1;

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
      return;
    }
    for (let i = waiters.length - 1; i >= 0; i -= 1) {
      if (waiters[i].method === message.method) {
        waiters[i].resolve(message.params);
        waiters.splice(i, 1);
      }
    }
  });

  const ready = new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", () => reject(new Error("CDP socket failed")), { once: true });
  });

  return {
    ready,
    send(method, params = {}) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    once(method, timeoutMs = 30_000) {
      return new Promise((resolve, reject) => {
        const waiter = { method, resolve };
        waiters.push(waiter);
        setTimeout(() => {
          const index = waiters.indexOf(waiter);
          if (index >= 0) {
            waiters.splice(index, 1);
            reject(new Error(`Timed out waiting for ${method}`));
          }
        }, timeoutMs).unref?.();
      });
    },
    close() {
      socket.close();
    },
  };
}

async function main() {
  const chrome = findChrome();
  if (!chrome) {
    console.error("No Chrome or Edge binary found. Set CHROME_PATH to one.");
    process.exit(2);
  }

  try {
    const probe = await fetch(`${BASE}/`, { redirect: "manual" });
    if (!probe.status) throw new Error("no status");
  } catch {
    console.error(`No dev server answering at ${BASE}. Start one with \`npm run dev\`.`);
    process.exit(2);
  }

  const port = 9333;
  const child = spawn(
    chrome,
    [
      "--headless=new",
      `--remote-debugging-port=${port}`,
      "--remote-allow-origins=*",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-gpu",
      `--user-data-dir=${process.env.TEMP ?? "/tmp"}/tekguyz-width-check`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  let failures = 0;
  let cdp;

  try {
    await waitForDevTools(port);
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const page = targets.find((t) => t.type === "page");
    if (!page) throw new Error("Chrome opened no page target.");

    cdp = connect(page.webSocketDebuggerUrl);
    await cdp.ready;
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");

    // A real sign-in first, so the comp routes are reachable at all. Without
    // it every navigation below lands on /login and the check would pass by
    // measuring the wrong page — which is exactly the kind of vacuous pass
    // this file exists to avoid.
    const loaded = cdp.once("Page.loadEventFired");
    await cdp.send("Page.navigate", { url: `${BASE}/api/dev-login?next=/` });
    await loaded;

    const signedIn = await cdp.send("Runtime.evaluate", {
      expression: "location.pathname",
      returnByValue: true,
    });
    if (signedIn.result.value === "/login") {
      console.error("Sign-in failed — run `npm run seed:demo` (PowerShell, it needs .env).");
      process.exit(2);
    }

    for (const viewport of VIEWPORTS) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: false,
      });

      for (const entry of ROUTES) {
        const route = typeof entry === "string" ? entry : entry.path;
        const opener = typeof entry === "string" ? null : entry.open;
        const name = typeof entry === "string" ? entry : `${entry.path} (${entry.label})`;

        const done = cdp.once("Page.loadEventFired");
        await cdp.send("Page.navigate", { url: `${BASE}${route}` });
        await done;
        // React 19 reveals streamed content on a requestAnimationFrame, so a
        // measurement taken on the load event alone can read the fallback.
        // Two frames plus a beat is enough and is cheap.
        await delay(600);

        if (opener) {
          const opened = await cdp.send("Runtime.evaluate", {
            expression: opener,
            awaitPromise: true,
            returnByValue: true,
          });
          if (opened.result.value !== "ok") {
            failures += 1;
            console.log(
              `  FAIL ${viewport.width}x${viewport.height} ${name} — could not open it: ${opened.result.value}`,
            );
            continue;
          }
        }

        if (SHOT_DIR) {
          const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
          const file = `${SHOT_DIR}/${viewport.width}-${route.replace(/[^a-z0-9]+/gi, "_")}${
            opener ? `-${(typeof entry === "string" ? "" : entry.label).replace(/[^a-z0-9]+/gi, "_")}` : ""
          }.png`;
          writeFileSync(file, Buffer.from(shot.data, "base64"));
          console.log(`  shot ${file}`);
        }

        const evaluated = await cdp.send("Runtime.evaluate", {
          expression: PROBE,
          returnByValue: true,
        });
        const { probed, findings } = evaluated.result.value;
        const label = `${viewport.width}x${viewport.height} ${name}`;

        if (findings.length === 0) {
          console.log(`  ok   ${label} — ${probed} text boxes, none under ${MIN_WIDTH_PX}px`);
        } else {
          failures += findings.length;
          console.log(`  FAIL ${label} — ${findings.length} of ${probed} text boxes under ${MIN_WIDTH_PX}px`);
          for (const finding of findings) {
            console.log(`         ${finding.width}px  <${finding.tag}> "${finding.text}"`);
            if (finding.className) console.log(`                 class="${finding.className}"`);
          }
        }
      }
    }
  } finally {
    cdp?.close();
    child.kill();
  }

  if (failures > 0) {
    console.error(`\ncheck:widths FAILED — ${failures} collapsed text box(es).`);
    process.exit(1);
  }
  console.log("\ncheck:widths passed.");
}

await main();
