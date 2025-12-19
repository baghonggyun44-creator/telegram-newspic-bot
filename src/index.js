// src/index.js
import { scrapeHotNews } from "./newspicScraper.js";
import { sendTelegram } from "./telegram.js";
import { makePartnerLink } from "./partnerLink.js";
import { isDuplicate, savePosted } from "./dedupStore.js";
import { shouldPost } from "./ctrFilter.js";

const MAX_POSTS_PER_RUN = 5;
const MIN_POST_PER_RUN = 1;

// 제목 리라이팅 (CTR 보정)
function rewriteTitle(title) {
  const hooks = ["🚨", "⚠️", "🔥", "지금 화제인 이유", "이게 왜 난리냐면"];

  if (/[🚨⚠️🔥]/.test(title)) return title;

  const hook = hooks[Math.floor(Math.random() * hooks.length)];
  return `${hook} ${title}`;
}

async function main() {
  console.log("🟢 뉴스픽 자동 수집 시작");

  const newsList = await scrapeHotNews();

  if (!newsList || newsList.length === 0) {
    console.log("❌ 수집된 뉴스 없음");
    return;
  }

  console.log(`📰 수집된 뉴스 수: ${newsList.length}`);

  let postedCount = 0;
  const usedIds = new Set(); // 이번 실행에서 사용한 ID 추적

  // 1️⃣ 정상 필터 통과 기사 업로드
  for (const news of newsList) {
    if (postedCount >= MAX_POSTS_PER_RUN) break;

    const { id, title, link } = news;

    if (usedIds.has(id)) continue;

    // 과거 실행 중복은 스킵
    if (isDuplicate(id)) {
      console.log("⏭️ DUPLICATE SKIP:", title);
      continue;
    }

    const decision = shouldPost(title);
    if (!decision.ok) {
      console.log(`🧹 FILTER SKIP (${decision.reason}):`, title);
      continue;
    }

    const finalTitle = rewriteTitle(title);
    const partnerUrl = makePartnerLink(link);

    await sendTelegram(partnerUrl, finalTitle);

    savePosted(id);
    usedIds.add(id);
    postedCount++;

    console.log("✅ POSTED:", finalTitle);
  }

  // 2️⃣ 🔥 최소 1개 강제 업로드 (핵심 수정)
  if (postedCount < MIN_POST_PER_RUN) {
    const fallback = newsList[0]; // 무조건 첫 기사 사용

    if (fallback && !usedIds.has(fallback.id)) {
      console.log("⚠️ 조건 미달 → 강제 1개 업로드:", fallback.title);

      const finalTitle = rewriteTitle(fallback.title);
      const partnerUrl = makePartnerLink(fallback.link);

      await sendTelegram(partnerUrl, finalTitle);

      savePosted(fallback.id);
      usedIds.add(fallback.id);
      postedCount++;
    }
  }

  console.log(`🏁 실행 종료 / 업로드 수: ${postedCount}`);
}

main().catch(err => {
  console.error("🔥 실행 중 오류:", err);
  process.exit(1);
});
