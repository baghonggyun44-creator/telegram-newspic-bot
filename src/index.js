import { scrapeHotNews } from "./newspicScraper.js";
import { sendTelegram } from "./telegram.js";
import { isDuplicateByTitle, saveTitle } from "./dedupStore.js";

console.log("🚀 뉴스픽 자동 업로드 (사건사고 우선 + 카테고리 분산 v2)");

const CATEGORY_ORDER = ["사회", "경제", "정치", "연예"];

// 사건사고 키워드 묶음 (이게 핵심)
const INCIDENT_KEYWORDS = [
  "사망", "사고", "화재", "폭행", "살인", "추돌", "전복",
  "붕괴", "검거", "체포", "경찰", "구속", "재판",
  "폭발", "추락", "부상", "실종", "참사", "음주운전",
];

function detectCategoryByTitle(title) {
  // 1️⃣ 사건사고 최우선 판별
  if (INCIDENT_KEYWORDS.some(k => title.includes(k))) {
    return "사건사고";
  }

  // 2️⃣ 기타 카테고리
  if (title.match(/증시|주가|금리|환율|코스피|코스닥/)) return "경제";
  if (title.match(/대통령|국회|정부|여당|야당|총선/)) return "정치";
  if (title.match(/연예|배우|가수|아이돌|결혼|이혼/)) return "연예";

  return "사회";
}

async function main() {
  const articles = await scrapeHotNews();
  console.log(`🧪 스크래핑 결과: ${articles.length}`);

  if (!articles || articles.length === 0) return;

  const buckets = {
    사건사고: [],
    사회: [],
    경제: [],
    정치: [],
    연예: [],
  };

  // 1️⃣ 중복 제거 + 카테고리 분류
  for (const a of articles) {
    if (isDuplicateByTitle(a.title)) continue;

    const category = detectCategoryByTitle(a.title);
    buckets[category].push(a);
  }

  const selected = [];

  // 2️⃣ 사건사고 최우선 (있으면 무조건 1건)
  if (buckets.사건사고.length > 0) {
    const incident = buckets.사건사고[0];
    selected.push({ ...incident, category: "사건사고" });
    saveTitle(incident.title);
  }

  // 3️⃣ 나머지 카테고리 분산
  for (const cat of CATEGORY_ORDER) {
    if (selected.length >= 4) break;
    if (buckets[cat].length === 0) continue;

    const article = buckets[cat][0];
    selected.push({ ...article, category: cat });
    saveTitle(article.title);
  }

  if (selected.length === 0) {
    console.log("❌ 업로드할 기사 없음");
    return;
  }

  console.log(`📤 업로드 기사 수: ${selected.length}`);

  // 4️⃣ 텔레그램 업로드
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
