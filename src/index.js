import { scrapeHotNews } from "./newspicScraper.js";
import { sendTelegram } from "./telegram.js";
import { isDuplicate, savePosted } from "./dedupStore.js";

/**
 * 설정값
 */
const MAX_POST_PER_RUN = 2;        // 한 번 실행 시 최대 업로드 수
const MAX_ENTERTAINMENT_PER_RUN = 1; // 연예 카테고리 최대 허용 수

/**
 * 카테고리 우선순위 (절대 고정)
 */
const CATEGORY_PRIORITY = [
  "사건사고",
  "사회",
  "경제",
  "정치",
  "연예"
];

/**
 * 연예 블랙리스트 키워드 (제목 기준)
 * → 포함되면 연예라도 업로드 금지
 */
const ENTERTAINMENT_BLACKLIST = [
  "결혼",
  "열애",
  "임신",
  "출산",
  "2세",
  "아이돌",
  "컴백",
  "데뷔",
  "팬미팅",
  "솔로"
];

/**
 * 연예 허용 언론사 (정보성 위주)
 */
const ENTERTAINMENT_ALLOWED_PRESS = [
  "연합뉴스",
  "KBS",
  "MBC",
  "SBS",
  "JTBC",
  "한겨레",
  "경향"
];

/**
 * 연예 기사 필터
 */
function isAllowedEntertainment(news) {
  const title = news.title || "";
  const press = news.press || "";

  // 키워드 차단
  if (ENTERTAINMENT_BLACKLIST.some(k => title.includes(k))) {
    return false;
  }

  // 언론사 제한
  if (!ENTERTAINMENT_ALLOWED_PRESS.some(p => press.includes(p))) {
    return false;
  }

  return true;
}

/**
 * 메인 실행
 */
async function main() {
  console.log("🚀 뉴스픽 자동 업로드 (B 방식: 사건사고 최우선 + 연예 제한)");

  const newsList = await scrapeHotNews();
  console.log(`🧪 스크래핑 결과: ${newsList.length}`);

  let postedCount = 0;
  let entertainmentCount = 0;

  for (const category of CATEGORY_PRIORITY) {
    if (postedCount >= MAX_POST_PER_RUN) break;

    const filteredByCategory = newsList.filter(
      n => n.category === category
    );

    for (const news of filteredByCategory) {
      if (postedCount >= MAX_POST_PER_RUN) break;

      // 중복 체크 (제목 + nid 기준)
      if (isDuplicate(news)) continue;

      // 연예 추가 필터
      if (category === "연예") {
        if (entertainmentCount >= MAX_ENTERTAINMENT_PER_RUN) continue;
        if (!isAllowedEntertainment(news)) continue;
      }

      try {
        await sendTelegram(news);
        savePosted(news);

        postedCount++;
        if (category === "연예") entertainmentCount++;

        console.log(
          `➡️ [${category}] ${news.title} (${news.press})`
        );
      } catch (err) {
        console.error("❌ 텔레그램 전송 실패:", err.message);
      }
    }
  }

  console.log(`📤 업로드 완료: ${postedCount}건`);
}

main().catch(err => {
  console.error("❌ 실행 오류:", err);
});
