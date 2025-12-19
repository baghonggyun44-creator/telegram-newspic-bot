/**
 * index.js (FINAL STABLE)
 * - 뉴스픽 핫뉴스 수집
 * - 중복 기사 차단 (posted.json)
 * - CTR 낮은 기사 필터링
 * - 댓글 반응형 주제 선별
 * - 제목 자동 리라이팅
 * - 파트너 링크(pn) 붙여 텔레그램 전송
 * - posted.json GitHub 커밋으로 영구 중복 방지
 */

import { scrapeHotNews } from "./newspicScraper.js";
import { isDuplicate, savePosted } from "./dedupStore.js";
import { makePartnerLink } from "./partnerLink.js";
import { sendTelegram } from "./telegram.js";
import { shouldPost, rewriteTitle } from "./ctrFilter.js";
import { execSync } from "child_process";

const MAX_POSTS_PER_RUN = 5;   // 🔧 한 번 실행당 최대 업로드 개수
const SLEEP_MS = 1200;         // 요청 간 딜레이 (안정성)

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("🚀 NewsPic AutoPost START");

  const articles = await scrapeHotNews();
  if (!articles || articles.length === 0) {
    console.log("⚠️ 수집된 기사 없음");
    return;
  }

  let postedCount = 0;

  for (const article of articles) {
    if (postedCount >= MAX_POSTS_PER_RUN) break;

    const { nid, title, url } = article;
    if (!nid || !title || !url) continue;

    // 1️⃣ 중복 기사 차단
    if (isDuplicate(nid)) {
      console.log(`⏭️ DUPLICATE SKIP: ${nid}`);
      continue;
    }

    // 2️⃣ CTR 낮은 기사 + 무난한 기사 컷
    const decision = shouldPost(title);
    if (!decision.ok) {
      console.log(`🧹 FILTER SKIP (${decision.reason}): ${title}`);
      continue;
    }

    // 3️⃣ 제목 리라이팅
    const newTitle = rewriteTitle(title);

    // 4️⃣ 파트너 링크 생성 (pn 붙이기)
    const partnerUrl = makePartnerLink(url);

    // 5️⃣ 텔레그램 메시지
    const message =
      `가장빠른 실시간 뉴스픽\n` +
      `🚨 오늘의 핫이슈\n\n` +
      `${newTitle}\n\n` +
      `👉 원문 바로가기\n` +
      `${partnerUrl}`;

    await sendTelegram(message);

    // 6️⃣ 업로드 기록
    savePosted(nid);
    postedCount++;

    console.log(`✅ POSTED (${postedCount}/${MAX_POSTS_PER_RUN}): ${newTitle}`);

    await sleep(SLEEP_MS);
  }

  // 7️⃣ posted.json 커밋 → 다음 실행 때 중복 완전 차단
  try {
    execSync("git config user.name 'github-actions'", { stdio: "ignore" });
    execSync("git config user.email 'github-actions@github.com'", { stdio: "ignore" });
    execSync("git add posted.json", { stdio: "ignore" });
    execSync("git commit -m 'update posted news'", { stdio: "ignore" });
    execSync("git push", { stdio: "ignore" });
    console.log("🧠 posted.json 커밋 완료");
  } catch {
    console.log("ℹ️ 변경사항 없음 (커밋 생략)");
  }

  console.log("🏁 NewsPic AutoPost END");
}

main().catch((err) => {
  console.error("❌ FATAL ERROR:", err);
  process.exit(1);
});
