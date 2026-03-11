import type { CheckResult } from "./types";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

function buildMessage(result: CheckResult, changed: boolean): string {
  const icon = result.available ? "\u{1F7E2}" : "\u{1F534}";
  const name = result.label || result.url.split("/p/")[1]?.split("/")[0] || "?";
  let msg = `${icon} ${name}\n`;
  msg += `Store: ${result.store}\n`;
  msg += `Status: ${result.statusText}\n`;
  if (changed) msg += `(status changed)`;
  return msg;
}

async function sendTelegram(result: CheckResult, changed: boolean): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

  const res = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: buildMessage(result, changed),
      }),
    }
  );
  if (!res.ok) console.error(`  Telegram error: ${res.status}`);
}

async function sendDiscord(result: CheckResult, changed: boolean): Promise<void> {
  if (!DISCORD_WEBHOOK_URL) return;

  const name = result.label || result.url.split("/p/")[1]?.split("/")[0] || "?";
  const color = result.available ? 0x57f287 : 0xed4245;

  const res = await fetch(DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [
        {
          title: `${result.available ? "\u{1F7E2}" : "\u{1F534}"} ${name}`,
          color,
          fields: [
            { name: "Store", value: result.store, inline: true },
            { name: "Status", value: result.statusText, inline: true },
          ],
          footer: changed ? { text: "Status changed" } : undefined,
          timestamp: result.checkedAt,
        },
      ],
    }),
  });
  if (!res.ok) console.error(`  Discord error: ${res.status}`);
}

export async function notify(result: CheckResult, changed: boolean): Promise<void> {
  await Promise.allSettled([
    sendTelegram(result, changed),
    sendDiscord(result, changed),
  ]);
}
