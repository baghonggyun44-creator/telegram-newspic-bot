import { fetchHotNews } from "./newspicScraper.js";
import { sendTelegram } from "./telegram.js";

function formatMessage(items) {
  const lines = [];
  lines.push("🚨 오늘의 핫이슈 (뉴스픽 파트너스)");
  lines.push("");

  items.forEach((it, idx) => {
    lines.push(`${idx + 1}) ${it.title}`);
    if (it.pubDate) lines.push(`🗓 ${it.pubDate}`);
    lines.push(`👉 원문 바로가기`);
    lines.push(it.link);
    lines.push("");
  });

  return lines.join("\n").trim();
}

async function main() {
  const all = await fetchHotNews();

  // 최신 2개 (원하면 숫자 바꾸기)
  const top = all.slice(0, 2);

  if (!top.length) {
    throw new Error("RSS에서 가져온 기사 목록이 비었습니다. NEWSPIC_RSS_URL이 올바른지 확인하세요.");
  }

  const msg = formatMessage(top);
  await sendTelegram(msg);

  console.log("✅ Telegram posted:", top.length);
}

main().catch((err) => {
  console.error("❌ Error:", err?.message || err);
  process.exit(1);
});
