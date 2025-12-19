import { scrapeHotNews } from "./newspicScraper.js";
import { sendTelegram } from "./telegram.js";
import { isDuplicate, savePosted } from "./dedupStore.js";

console.log("🚀 NewsPic Telegram AutoPost 시작");

async function main() {
  console.log("📰 뉴스픽 핫이슈 수집 중...");
  const articles = await scrapeHotNews();

  console.log(`🔎 수집된 기사 수: ${articles.length}`);

  if (articles.length === 0) {
    console.log("⚠️ 기사 없음 → 종료");
    return;
  }

  // 🔽 필터 완화 전략
  const candidates = articles
    // 제목 길이 너무 짧거나 광고성 제외
    .filter(a => a.title && a.title.length >= 10)
    // 중복만 최소 차단
    .filter(a => !isDuplicate(a.id))
    // 최대 3개만 전송
    .slice(0, 3);

  console.log(`📤 전송 대상 기사 수: ${candidates.length}`);

  if (candidates.length === 0) {
    console.log("⚠️ 전송 대상 없음 (중복 때문일 가능성 큼)");
    return;
  }

  for (const a of candidates) {
    console.log("➡️ 전송:", a.title);

    await sendTelegram(
      a.url,
      a.title
    );

    savePosted(a.id);

    // ⏱️ 텔레그램 스팸 방지용 딜레이
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log("✅ 기사 전송 완료");
}

main().catch(err => {
  console.error("❌ 실행 중 에러:", err);
  process.exit(1);
});
