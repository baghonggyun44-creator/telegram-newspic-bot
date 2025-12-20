import { scrapeHotNews } from "./newspicScraper.js";
import { sendTelegram } from "./telegram.js";
import { isDuplicateByTitle, saveTitle } from "./dedupStore.js";
import { detectCategory } from "./category.js";

console.log("🚀 뉴스픽 자동 업로드 (옵션 A: 최소 1개 보장) 시작");

async function main() {
  const articles = await scrapeHotNews();

  console.log(`📰 수집 기사 수: ${articles.length}`);
  if (!articles || articles.length === 0) {
    console.log("⚠️ 수집된 기사 없음 → 종료");
    return;
  }

  const selected = [];
  const usedCategories = new Set();

  // 1️⃣ 1차 시도: 중복 제거 + 카테고리 분산 (최대 3개)
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

  // 2️⃣ 옵션 A 핵심: 아무것도 안 뽑혔을 경우 → 카테고리 제한 완화
  if (selected.length === 0) {
    console.log("⚠️ 1차 선택 실패 → 카테고리 제한 완화하여 1개 강제 선택");

    const fallback = articles.find(
      a => !isDuplicateByTitle(a.title)
    );

    if (!fallback) {
      console.log("❌ 모든 기사가 중복 → 이번 실행 업로드 없음");
      return;
    }

    selected.push({
      ...fallback,
      category: detectCategory(fallback.title),
    });
  }

  console.log(`📤 최종 업로드 기사 수: ${selected.length}`);

  // 3️⃣ 업로드 실행
  for (const a of selected) {
    console.log(`➡️ 업로드 [${a.category}] ${a.title}`);

    await sendTelegram(a.url, a.title);

    saveTitle(a.title);

    // 텔레그램 스팸 방지 딜레이
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log("✅ 업로드 완료");
}

main().catch(err => {
  console.error("❌ 실행 오류:", err);
  process.exit(1);
});
