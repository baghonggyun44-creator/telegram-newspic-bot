import { scrapeHotNews } from "./newspicScraper.js";
import { sendTelegram } from "./telegram.js";
import { isDuplicateByTitle, saveTitle } from "./dedupStore.js";
import { detectCategory } from "./category.js";

console.log("🚀 뉴스픽 자동 업로드 (사건사고 우선 + 카테고리 분산)");

const CATEGORY_ORDER = ["사회", "경제", "정치", "연예"];

async function main() {
  const articles = await scrapeHotNews();
  if (!articles || articles.length === 0) {
    console.log("⚠️ 기사 수집 실패");
    return;
  }

  // 1️⃣ 중복 제거 + 카테고리 분류
  const categorized = {
    사건사고: [],
    사회: [],
    경제: [],
    정치: [],
    연예: [],
    기타: [],
  };

  for (const a of articles) {
    if (isDuplicateByTitle(a.title)) continue;

    const category = detectCategory(a.title);
    if (!categorized[category]) {
      categorized.기타.push(a);
    } else {
      categorized[category].push(a);
    }
  }

  const selected = [];

  // 2️⃣ 사건사고 최우선 (최신 1건)
  if (categorized.사건사고.length > 0) {
    const breaking = categorized.사건사고[0];
    selected.push({ ...breaking, category: "사건사고" });
    saveTitle(breaking.title);
  }

  // 3️⃣ 나머지 카테고리 섞어서 최대 3개
  for (const cat of CATEGORY_ORDER) {
    if (selected.length >= 4) break;

    const list = categorized[cat];
    if (!list || list.length === 0) continue;

    const article = list[0];
    selected.push({ ...article, category: cat });
    saveTitle(article.title);
  }

  if (selected.length === 0) {
    console.log("❌ 업로드할 기사 없음");
    return;
  }

  console.log(`📤 업로드 기사 수: ${selected.length}`);

  // 4️⃣ 업로드
  for (const a of selected) {
    console.log(`➡️ [${a.category}] ${a.title}`);
    await sendTelegram(a.url, a.title);
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log("✅ 업로드 완료");
}

main().catch(err => {
  console.error("❌ 실행 오류:", err);
  process.exit(1);
});
