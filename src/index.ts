import { checkDelivery, closeBrowser } from "./scraper";
import { notify } from "./notify";
import type { Watch } from "./types";

// ── Config ────────────────────────────────────────────
const CHECK_INTERVAL = Number(process.env.CHECK_INTERVAL) || 30; // minutes
const WATCHES: Watch[] = JSON.parse(process.env.WATCHES || "[]");
const ONCE = process.argv.includes("--once");

if (WATCHES.length === 0) {
  console.error("No watches configured. Set WATCHES env var.");
  console.error('Example: WATCHES=\'[{"url":"https://www.ikea.com/fr/fr/p/...","store":"Grenoble","label":"KALLAX"}]\'');
  process.exit(1);
}

// ── State (track last status per watch to detect changes) ──
const lastStatus = new Map<string, boolean>();

function key(w: Watch): string {
  return `${w.url}::${w.store}`;
}

// ── Check loop ────────────────────────────────────────
async function runChecks(): Promise<void> {
  const now = new Date().toLocaleTimeString("fr-FR");
  console.log(`\n[${now}] Checking ${WATCHES.length} product(s)...`);

  for (const watch of WATCHES) {
    const label = watch.label || watch.url.split("/p/")[1]?.split("/")[0] || "?";

    try {
      const result = await checkDelivery(watch);
      const prev = lastStatus.get(key(watch));
      const changed = prev !== undefined && prev !== result.available;

      const icon = result.available ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
      console.log(`  ${icon} ${label} @ ${watch.store}: ${result.statusText}`);

      if (changed || (prev === undefined && result.available)) {
        await notify(result, changed);
        console.log(`    → notification sent`);
      }

      lastStatus.set(key(watch), result.available);
    } catch (e: any) {
      console.error(`  ✗ ${label}: ${e.message}`);
    }
  }
}

// ── Main ──────────────────────────────────────────────
async function main(): Promise<void> {
  console.log("IKEA Availability Scrapper");
  console.log(`Watches: ${WATCHES.length}`);
  console.log(`Interval: ${CHECK_INTERVAL} min`);
  WATCHES.forEach((w) => {
    const label = w.label || w.url.split("/p/")[1]?.split("/")[0] || "?";
    console.log(`  - ${label} @ ${w.store}`);
  });

  await runChecks();

  if (ONCE) {
    await closeBrowser();
    process.exit(0);
  }

  setInterval(() => runChecks(), CHECK_INTERVAL * 60 * 1000);

  process.on("SIGINT", async () => {
    await closeBrowser();
    process.exit(0);
  });
  process.on("SIGTERM", async () => {
    await closeBrowser();
    process.exit(0);
  });
}

main();
