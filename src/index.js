import { scrapeHotNews } from "./newspicScraper.js";
import { sendTelegram } from "./telegram.js";
import { isDuplicateByTitle, saveTitle } from "./dedupStore.js";

console.log("🚀 뉴스픽 자동 업로드 (사건사고 최우선 + 연예 필터)");

const INCIDENT_KEYWORDS = [
  "사망", "사고", "화재", "폭행", "살인", "추돌", "전복",
  "검거", "체포", "구속", "경찰", "재판", "폭발",
  "추락", "부상", "실종", "참사", "음주운전",
];

const ENTERTAINMENT_ALLOW_KEYWORDS = [
  "논란", "의혹", "수사", "폭로", "충격", "논쟁", "파장", "고백"
];

function detectCategory(title) {
  if (INCIDENT_KEYWORDS.some(k => title.includes(k))) return "사건사고";
  if (title.match(/증시|주가|금리|환율|코스피|코스닥/)) return "경제";
  if (title.match(/대통령|국회|정부|여당|야당|총선/)) return "정치";
  if (title.match(/연예|배우|가수|아이돌/)) return "연예";
  return "사회";
}

function isAllowedEntertainment(title) {
  return ENTERTAINMENT_ALLOW_KEYWORDS.some(k => title.includes(k));
}

async function main() {
  const articles = await scrapeHotNews();
  console.log(`🧪 스크래핑 결과: ${articles.length}`);

  const buckets = {
    사건사고: [],
    사회: [],
    경제: [],
    정치: [],
    연예: [],
  };

  for (const a of articles) {
    if (isDuplicateByTitle(a.title)) continue;
    const category = detectCategory(a.title);

    if (category === "연예" && !isAllowedEntertainment(a.title)) {
      continue; // 연예 필터
    }

    buckets[category].push(a);
  }

  const selected = [];

  // 1️⃣ 사건사고 최우선
  if (buckets.사건사고.length > 0) {
    const a = buckets.사건사고[0];
    selected.push({ ...a, category: "사건사고" });
    saveTitle(a.title);
  }

  // 2️⃣ 사회 → 경제 → 정치
  for (const cat of ["사회", "경제", "정치"]) {
    if (selected.length >= 2) break;
    if (buckets[cat].length === 0) continue;

    const a = buckets[cat][0];
    selected.push({ ...a, category: cat });
    saveTitle(a.title);
  }

  // 3️⃣ 연예는 정말 없을 때만
  if (selected.length === 0 && buckets.연예.length > 0) {
    const a = buckets.연예[0];
    selected.push({ ...a, category: "연예" });
    saveTitle(a.title);
  }

  if (selected.length === 0) {
    console.log("❌ 업로드할 기사 없음");
    return;
  }

  console.log(`📤 업로드 기사 수: ${selected.length}`);

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
