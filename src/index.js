/**
 * index.js
 * 뉴스픽 핫뉴스 → 파트너 링크 생성 → 텔레그램 자동 업로드
 * 중복 기사 완전 차단 (posted.json + git commit 유지)
 */

import { scrapeHotNews } from "./newspicScraper.js";
import { isDuplicate, savePosted } from "./dedupStore.js";
import { makePartnerLink } from "./partnerLink.js";
import { sendTelegram } from "./telegram.js";
import { execSync } from "child_process";

async function main() {
  console.log("🚀 뉴스픽 자동 업로드 시작");

  const newsList = await scrapeHotNews();

  for (const news of newsList) {
    const { title, url, nid } = news;

    // 🔒 중복 체크
    if (isDuplicate(nid)) {
      console.log(`⏭️ 이미 업로드됨 → 스킵 (${nid})`);
      continue;
    }

    // 🔗 파트너 링크 생성
    const partnerUrl = await makePartnerLink(url);

    // 📨 텔레그램 메시지 구성
    const message = `
가장빠른 실시간 뉴스픽
🚨 오늘의 핫이슈

${title}

👉 원문 바로가기
${partnerUrl}
`.trim();

    // 📨 텔레그램 전송
    await sendTelegram(message);

    // 🧠 업로드 완료 → 저장
    savePosted(nid);

    console.log(`✅ 업로드 완료: ${title}`);
  }

  // 💾 posted.json GitHub에 커밋해서 중복 방지 유지
  try {
    execSync("git config user.name 'github-actions'");
    execSync("git config user.email 'github-actions@github.com'");
    execSync("git add posted.json");
    execSync("git commit -m 'update posted news'");
    execSync("git push");
    console.log("🧠 posted.json 커밋 완료 (중복 방지 유지)");
  } catch (e) {
    console.log("ℹ️ 변경사항 없음 (커밋 생략)");
  }

  console.log("🏁 뉴스픽 자동 업로드 종료");
}

// 실행
main().catch((err) => {
  console.error("❌ 실행 중 오류 발생:", err);
  process.exit(1);
});
