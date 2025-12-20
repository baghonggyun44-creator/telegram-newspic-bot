import fetch from "node-fetch";
import crypto from "crypto";
import { isDuplicate, savePosted } from "./dedupStore.js";
import { sendTelegram } from "./telegram.js";

console.log("[START] newspic accident API bot");

// 🔐 GitHub Actions 환경변수
const COOKIE = process.env.NEWSPIC_COOKIE;
if (!COOKIE) {
  console.error("[FATAL] NEWSPIC_COOKIE is missing");
  process.exit(1);
}

// 사건사고 채널 번호 (확정)
const CHANNEL_NO = 12;

// 우선 고려할 뱃지
const ALLOWED_RECOM_TYPES = [
  "열독률",
  "핫클릭",
  "인기",
  "공유많은"
];

// nid 기준 중복 방지
function makeId(nid) {
  return crypto.createHash("md5").update(String(nid)).digest("hex");
}

// 사건사고 기사 목록 API 호출
async function fetchAccidentArticles() {
  const res = await fetch(
    "https://partners.newspic.kr/main/contentList",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Cookie": COOKIE
      },
      body: new URLSearchParams({
        channelNo: CHANNEL_NO,
        pageSize: 20
      })
    }
  );

  const text = await res.text();

  // 로그인 풀리면 HTML이 내려옴
  if (text.startsWith("<!DOCTYPE")) {
    throw new Error("Not logged in (HTML response)");
  }

  return JSON.parse(text);
}

(async () => {
  try {
    const data = await fetchAccidentArticles();
    const list = data?.recomList || [];

    console.log("[DEBUG] articles fetched:", list.length);

    if (list.length === 0) {
      console.log("[STOP] no articles");
      return;
    }

    /**
     * 1️⃣ 뱃지 있는 기사 중 가장 상단(imRank 최소)
     * 2️⃣ 없으면 그냥 사건사고 최상단 기사
     */
    let target = list
      .filter(a => ALLOWED_RECOM_TYPES.includes(a.recomTypeName))
      .sort((a, b) => a.imRank - b.imRank)[0];

    if (!target) {
      target = list.sort((a, b) => a.imRank - b.imRank)[0];
    }

    if (!target) {
      console.log("[STOP] no target article");
      return;
    }

    const id = makeId(target.nid);
    if (isDuplicate(id)) {
      console.log("[STOP] duplicate article");
      return;
    }

    const url = `https://m.newspic.kr/view.html?nid=${target.nid}`;

    await sendTelegram(
      `🚨 가장 빠른 실시간 뉴스픽\n\n` +
      `${target.title}\n\n` +
      (target.recomTypeName
        ? `🏷 ${target.recomTypeName}\n\n`
        : ``) +
      `👉 원문 바로가기\n${url}`
    );

    savePosted(id);
    console.log("[DONE] sent:", target.title);
  } catch (e) {
    console.error("[FATAL ERROR]", e.message);
    process.exit(1);
  }
})();
