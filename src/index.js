// src/index.js
import { scrapeHotNews } from "./newspicScraper.js";
import { sendTelegram } from "./telegram.js";
import { makePartnerLink } from "./partnerLink.js";
import { isDuplicate, savePosted } from "./dedupStore.js";

function rewriteTitle(title) {
  const hooks = ["🚨", "🔥", "⚠️"];
  if (/[🚨🔥⚠️]/.test(title)) return title;
  return `${hooks[Math.floor(Math.random() * hooks.length)]} ${title}`;
}

async function main() {
  console.log("🟢 [START] 뉴스픽 안전모드 실행");

  const newsList = await scrapeHotNews();

  if (!newsList || newsList.length === 0) {
    console.log("❌ 수집된 뉴스 없음 → 종료");
    return;
  }

  console.log(`📰 수집된 뉴스 수: ${newsList.length}`);

  // ✅ 1️⃣ 중복 아닌 첫 기사 무조건 선택
  let target = null;
  for (const news of newsList) {
    if (!isDuplicate(news.id)) {
      target = news;
      break;
    }
  }

  // 만약 전부 중복이어도 첫 기사 강제 사용
  if (!target) {
    target = newsList[0];
    console.log("⚠️ 전부 중복 → 첫 기사 강제 사용");
  }

  console.log("📌 선택된 기사:", target.title);

  const finalTitle = rewriteTitle(target.title);
  const partnerUrl = makePartnerLink(target.link);

  console.log("📤 텔레그램 전송 시도");
  await sendTelegram(partnerUrl, finalTitle);

  savePosted(target.id);

  console.log("✅ 업로드 완료");
}

main().catch(err => {
  console.error("🔥 치명적 오류:", err);
  process.exit(1);
});
