import fetch from "node-fetch";
import crypto from "crypto";
import {
  isDuplicate,
  savePosted,
  canPostNow
} from "./dedupStore.js";
import { sendTelegram } from "./telegram.js";

console.log("[START] NewsPic AutoPost Bot");

// 🔐 환경변수
const COOKIE = process.env.NEWSPIC_COOKIE;
if (!COOKIE) {
  console.error("[FATAL] NEWSPIC_COOKIE is missing");
  process.exit(1);
}

// ⏱ 1시간 제한
const ONE_HOUR = 60 * 60 * 1000;

// 📌 카테고리 탐색 우선순위
const CHANNEL_PRIORITY = [
  { no: 12, name: "사건사고" },
  { no: 3,  name: "정치" },
  { no: 4,  name: "경제" },
  { no: 1,  name: "사회" }
];

// 🏷 우선 고려 뱃지
const ALLOWED_RECOM_TYPES = [
  "열독률",
  "핫클릭",
  "인기",
  "공유많은"
];

// nid → 고유 ID
function makeId(nid) {
  return crypto.createHash("md5").update(String(nid)).digest("hex");
}

// 기사 목록 호출
async function fetchArticles(channelNo) {
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
        channelNo,
        pageSize: 20
      })
    }
  );

  const text = await res.text();
  if (text.startsWith("<!DOCTYPE")) {
    throw new Error("Not logged in");
  }

  return JSON.parse(text)?.recomList || [];
}

(async () => {
  try {
    // ⛔ 1시간 제한
    if (!canPostNow(ONE_HOUR)) {
      console.log("[STOP] posted within last hour");
      return;
    }

    let target = null;
    let usedCategory = null;

    // 🔁 카테고리 순차 탐색
    for (const channel of CHANNEL_PRIORITY) {
      console.log(`[TRY] ${channel.name}`);

      const list = await fetchArticles(channel.no);
      if (list.length === 0) continue;

      // 🔥 우선순위 정렬
      const sorted = list
        .sort((a, b) => a.imRank - b.imRank)
        .sort((a, b) => {
          const aOk = ALLOWED_RECOM_TYPES.includes(a.recomTypeName);
          const bOk = ALLOWED_RECOM_TYPES.includes(b.recomTypeName);
          return bOk - aOk;
        });

      // ✅ 중복 아닌 첫 기사 선택
      for (const article of sorted) {
        const id = makeId(article.nid);
        if (!isDuplicate(id)) {
          target = article;
          usedCategory = channel.name;
          break;
        }
      }

      if (target) break;
    }

    // ❌ 전 카테고리 실패 → 무음 종료
    if (!target) {
      console.log("[STOP] no new articles in all categories");
      return;
    }

    const id = makeId(target.nid);
    const url = `https://m.newspic.kr/view.html?nid=${target.nid}`;

    await sendTelegram(
      `🚨 실시간 뉴스픽 (${usedCategory})\n\n` +
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
