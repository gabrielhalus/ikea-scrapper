import { chromium, type Browser } from "playwright";
import type { CheckResult, Watch } from "./types";

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (browser?.isConnected()) await browser.close();
  browser = null;
}

export async function checkDelivery(watch: Watch): Promise<CheckResult> {
  const b = await getBrowser();
  const context = await b.newContext({ locale: "fr-FR" });
  const page = await context.newPage();

  const base: CheckResult = {
    url: watch.url,
    store: watch.store,
    label: watch.label,
    available: false,
    statusText: "unknown",
    checkedAt: new Date().toISOString(),
  };

  try {
    // 1. Navigate to product page
    await page.goto(watch.url, { waitUntil: "domcontentloaded", timeout: 30_000 });

    // 2. Accept cookies if banner appears
    try {
      await page.click("#onetrust-accept-btn-handler", { timeout: 5_000 });
    } catch {
      // No cookie banner — continue
    }

    // 3. Click "change store" button
    await page.click(".pipf-availability-group__change-store-link", { timeout: 10_000 });

    // 4. Type store name in search input and press Enter
    const searchInput = page.locator(".pipf-store-list-modal input[type='search'], .pipf-store-list-modal input[type='text'], .pipf-store-list-modal input").first();
    await searchInput.waitFor({ timeout: 10_000 });
    await searchInput.fill(watch.store);
    await searchInput.press("Enter");

    // 5. Click on matching store result
    const storeResult = page
      .locator(`.pipf-choice-item__action`)
      .filter({ has: page.locator(`.pipf-store-list-modal__store-name`, { hasText: watch.store }) })
      .first();
    await storeResult.waitFor({ timeout: 10_000 });
    await storeResult.click();

    // 6. Wait for availability status to appear
    await page.waitForSelector(".pipf-status--labelled", { timeout: 10_000 });

    // 7. Find the delivery status element
    const deliveryStatus = page
      .locator(".pipf-status--labelled")
      .filter({ hasText: "livraison" })
      .first();

    await deliveryStatus.waitFor({ timeout: 10_000 });

    const statusText = (await deliveryStatus.locator(".pipf-status__label").textContent())?.trim() ?? "unknown";

    // 8. Determine availability from status classes
    const classes = (await deliveryStatus.getAttribute("class")) ?? "";
    const available = classes.includes("pipf-status--positive") || (!classes.includes("pipf-status--negative") && statusText.toLowerCase().includes("disponible"));

    return { ...base, available, statusText };
  } catch (e: any) {
    console.error(`  Scrape error: ${e.message}`);
    return base;
  } finally {
    await context.close();
  }
}
