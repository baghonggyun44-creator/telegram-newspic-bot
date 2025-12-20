import { scrapeHotNews } from "./newspicScraper.js";
import { sendTelegram } from "./telegram.js";
import { isDuplicateByTitle, saveTitle } from "./dedupStore.js";
import { detectCategory } from "./category.js";

console.log("🚀 뉴스픽 자동 업로드 시작");

async function main() {
  const articles = await scrapeHotNews();

  console.log(`📰 수집 기사 수: ${articles.length}`);
  if (articles.length === 0) return;

  const selected = [];
  const usedCategories = new Set();

  for (const a of articles) {
    if (selected.length >= 3) break;

    if (isDuplicateByTitle(a.title)) {
      console.log("⛔ 중복 기사 스킵:", a.title);
      continue;
    }

    const category = detectCategory(a.title);

    if (usedCategories.has(category)) {
      console.log("⛔ 카테고리 중복 스킵:", category);
      continue;
    }

    usedCategories.add(category);
    selected.push({ ...a, category });
  }

  console.log(`📤 최종 업로드 기사 수: ${selected.length}`);

  for (const a of selected) {
    console.log(`➡️ 업로드 [${a.category}] ${a.title}`);

    await sendTelegram(a.url, a.title);

    saveTitle(a.title);

    await new Promise(r => setTimeout(r, 1500));
  }

  console.log("✅ 업로드 완료");
}

main().catch(err => {
  console.error("❌ 실행 오류:", err);
  process.exit(1);
});
