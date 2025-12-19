// src/index.js
import { scrapeHotNews } from "./newspicScraper.js";
import { sendTelegram } from "./telegram.js";
import { makePartnerLink } from "./partnerLink.js";
import { isDuplicate, savePosted } from "./dedupStore.js";
import { shouldPost } from "./ctrFilter.js";

// 한 번 실행 시 최대 업로드 개수
const MAX_POSTS_PER_RUN = 5;

// 최소 1개는 무조건 업로드 (0개 방지)
const MIN_POST_PER_RUN = 1;

// 제목 간단 리라이팅 (CTR 보정용)
function rewriteTitle(title) {
  const hooks = [
    "🚨",
    "⚠️",
    "🔥",
    "지금 난리 난 이유",
    "이게 왜 화제냐면"
  ];

  // 이미 후킹 이모지가 있으면 그대로
  if (/[🚨⚠️🔥]/.test(title)) return title;

  const hook = hooks[Math.floor(Math.random() * hooks.length)];
  return `${hook} ${title}`;
}

async function main() {
  console.log("🟢 뉴스픽 자동 수집 시작");

  // 1️⃣ 뉴스픽 핫뉴스 수집
  const newsList = await scrapeHotNews();

  if (!newsList || newsList.length === 0) {
    console.log("❌ 수집된 뉴스 없음");
    return;
  }

  console.log(`📰 수집된 뉴스 수: ${newsList.length}`);

  let postedCount = 0;
  const candidates = [];

  // 2️⃣ 필터 + 중복 체크
  for (const news of newsList) {
    if (postedCount >= MAX_POSTS_PER_RUN) break;

    const { id, title, link } = news;

    // 중복 기사 스킵
    if (isDuplicate(id)) {
      console.log("⏭️ DUPLICATE SKIP:", title);
      continue;
    }

    // CTR 필터 판단
    const decision = shouldPost(title);
    if (!decision.ok) {
      console.log(`🧹 FILTER SKIP (${decision.reason}):`, title);
      continue;
    }

    candidates.push(news);
  }

  // 3️⃣ 조건 통과 기사 업로드
  for (const news of candidates) {
    if (postedCount >= MAX_POSTS_PER_RUN) break;

    const partnerUrl = makePartnerLink(news.link);
    const finalTitle = rewriteTitle(news.title);

    await sendTelegram(partnerUrl, finalTitle);

    savePosted(news.id);
    postedCount++;

    console.log("✅ POSTED:", finalTitle);
  }

  // 4️⃣ 최소 1개 강제 업로드 (보험)
  if (postedCount < MIN_POST_PER_RUN) {
    const fallback = newsList.find(n => !isDuplicate(n.id));

    if (fallback) {
      console.log("⚠️ 조건 미달 → 1개 강제 업로드:", fallback.title);

      const partnerUrl = makePartnerLink(fallback.link);
      const finalTitle = rewriteTitle(fallback.title);

      await sendTelegram(partnerUrl, finalTitle);
      savePosted(fallback.id);

      postedCount++;
    }
  }

  console.log(`🏁 실행 종료 / 업로드 수: ${postedCount}`);
}

// 실행
main().catch(err => {
  console.error("🔥 실행 중 오류 발생:", err);
  process.exit(1);
});
