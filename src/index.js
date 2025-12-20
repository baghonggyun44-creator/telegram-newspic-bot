import fetch from "node-fetch";
import crypto from "crypto";
import { isDuplicate, savePosted } from "./dedupStore.js";
import { sendTelegram } from "./telegram.js";

console.log("[START] newspic accident hot/ctr bot");

// =====================
// 설정
// =====================
const CONTENT_API = "https://partners.newspic.kr/main/contentList";

// 사건·사고 채널 번호 (확정)
const CHANNEL_NO = 12;

// 허용 뱃지
const ALLOWED_BADGES = ["핫클릭", "열독률"];

// 내 뉴스픽 PN (❗ 반드시 본인 PN)
const MY_PN = "570"; // ← 주인님 PN 값

// 공통 헤더
const HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
  "accept": "application/json, text/plain, */*",
  "accept-language": "ko-KR,ko;q=0.9"
};

// =====================
// 유틸
// =====================
function makeId(nid) {
  return crypto.createHash("md5").update(String(nid)).digest("hex");
}

// =====================
// 메인
// =====================
(async () => {
  try {
    // 1️⃣ 사건·사고 콘텐츠 목록 요청
    const body = new URLSearchParams({
      channelNo: CHANNEL_NO,
      inputSwitch: "false",
      adultContentCheck: "N",
      pageSize: "20"
    }).toString();

    const res = await fetch(CONTENT_API, {
      method: "POST",
      headers: HEADERS,
      body
    });

    if (!res.ok) {
      throw new Error("contentList API failed");
    }

    const json = await res.json();
    const list = json?.recList || [];

    console.log("[DEBUG] recList count:", list.length);

    if (!list.length) {
      console.log("[STOP] no articles");
      return;
    }

    // 2️⃣ 핫클릭 / 열독률 기사 우선 선택
    let target = null;

    for (const item of list) {
      if (!ALLOWED_BADGES.includes(item.recomTypeName)) continue;
      target = item;
      break;
    }

    // 없으면 1위 기사 fallback
    if (!target) {
      target = list[0];
      console.log("[FALLBACK] top rank article used");
    }

    const nid = target.nid;
    const title = target.title;
    const badge = target.recomTypeName || "사건·사고";

    const id = makeId(nid);
    if (isDuplicate(id)) {
      console.log("[STOP] duplicate article");
      return;
    }

    // 3️⃣ 뉴스픽 기사 링크 생성 (수익 구조 유지)
    const articleUrl =
      `https://m.newspic.kr/view.html?nid=${nid}&pn=${MY_PN}`;

    // 4️⃣ 텔레그램 전송
    await sendTelegram(
      `🚨 사건·사고 TOP 뉴스 (${badge})\n\n${title}\n\n👉 원문 바로가기\n${articleUrl}`
    );

    savePosted(id);
    console.log("[DONE] sent:", title);

  } catch (e) {
    console.error("[FATAL ERROR]", e.message);
    process.exit(1);
  }
})();
