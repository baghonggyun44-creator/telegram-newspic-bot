import { scrapeHotNews } from "./newspicScraper.js";
import { sendTelegram } from "./telegram.js";

console.log("🚀 index.js 실행 시작");

async function main() {
  console.log("📰 뉴스 수집 시작");

  const articles = await scrapeHotNews();

  console.log("🧪 수집된 기사 수:", articles.length);

  // 🔥 강제 테스트: 기사 없어도 테스트 메시지 전송
  if (articles.length === 0) {
    console.log("⚠️ 기사 0개 → 강제 테스트 메시지 전송");
    await sendTelegram(
      "https://im.newspic.kr",
      "[테스트] GitHub Actions → 텔레그램 연결 확인"
    );
    return;
  }

  // 🔥 첫 기사 하나만 테스트 전송
  const a = articles[0];

  console.log("📤 테스트 기사 전송:", a.title);

  await sendTelegram(a.url, a.title);
}

main().catch(err => {
  console.error("❌ main 실행 중 에러:", err);
  process.exit(1);
});
