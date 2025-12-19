/**
 * NewsPic Telegram AutoPost - index.js
 * 실행 진입점
 * Node.js 18+ / type: module 기준
 */

import { scrapeHotNews } from "./newspicScraper.js";
import { createPartnerLink } from "./partnerLink.js";
import { sendTelegram } from "./telegram.js";
import { isDuplicate, savePosted } from "./dedupStore.js";

async function main() {
  console.log("🚀 NewsPic AutoPost start");

  // 1️⃣ 뉴스픽 핫 뉴스 가져오기
  const articles = await scrapeHotNews();

  if (!articles || articles.length === 0) {
    console.log("⚠️ 가져올 뉴스 없음");
    return;
  }

  for (const article of articles) {
    try {
      const { title, nid, pn } = article;

      // 2️⃣ 중복 체크
      if (isDuplicate(nid)) {
        console.log(`⏭️ 이미 전송됨: ${nid}`);
        continue;
      }

      // 3️⃣ 뉴스픽 파트너 링크 생성
      const partnerUrl = await createPartnerLink({
        nid,
        pn,
        // cp = 파트너 키 (뉴스픽 계정 고유값)
        // 👉 newspicScraper.js 또는 partnerLink.js 안에서 고정값 사용 중
      });

      if (!partnerUrl) {
        console.log(`❌ 파트너 링크 생성 실패: ${nid}`);
        continue;
      }

      // 4️⃣ 텔레그램 메시지 구성
      const message =
        `🚨 오늘의 핫이슈\n\n` +
        `${title}\n\n` +
        `👉 원문 바로가기\n` +
        `${partnerUrl}`;

      // 5️⃣ 텔레그램 전송
      await sendTelegram(message);

      // 6️⃣ 전송 완료 저장 (중복 방지)
      savePosted(nid);

      console.log(`✅ 전송 완료: ${title}`);

      // 7️⃣ 과도한 요청 방지 (선택)
      await new Promise((r) => setTimeout(r, 2000));

    } catch (err) {
      console.error("🔥 기사 처리 중 오류", err.message);
    }
  }

  console.log("🎉 NewsPic AutoPost end");
}

// GitHub Actions / 로컬 실행 공통
main().catch((e) => {
  console.error("❌ 치명적 오류", e);
  process.exit(1);
});
