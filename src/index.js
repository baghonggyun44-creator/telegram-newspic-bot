import fetch from "node-fetch";
import crypto from "crypto";
import { isDuplicate, savePosted } from "./dedupStore.js";
import { sendTelegram } from "./telegram.js";

console.log("[START] newspic telegram bot");

// =====================
// 설정
// =====================
const RSS_URL =
  "https://news.google.com/rss/search?q=site:newspic.kr&hl=ko&gl=KR&ceid=KR:ko";

const ENTERTAINMENT_BLOCK = [
  "결혼","열애","출산","컴백","팬미팅",
  "화보","신곡","콘서트","예능","아이돌"
];

// =====================
// 유틸
// =====================

// nid 기준 중복 제거
function makeIdFromUrl(url) {
  const m = url.match(/nid=(\d+)/);
  const nid = m ? m[1] : url;
  return crypto.createHash("md5").update(nid).digest("hex");
}

function isBlockedEntertainment(title) {
  return ENTERTAINMENT_BLOCK.some(k => title.includes(k));
}

async function fetchText(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  return await res.text();
}

// RSS 파싱
function parseRss(xml) {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
  return items.map(item => {
    const block = item[1];
    const title =
      block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ||
      block.match(/<title>(.*?)<\/title>/)?.[1] ||
      "";

    const link =
      block.match(/<link>(.*?)<\/link>/)?.[1] || "";

    return {
      title: title.trim(),
      link: link.trim()
    };
  });
}

// =====================
// 메인
// =====================
(async () => {
  try {
    // RSS 가져오기
    const rssXml = await fetchText(RSS_URL);
    const articles = parseRss(rssXml);

    console.log("[DEBUG] rss articles count:", articles.length);

    for (const { title, link } of articles) {
      if (!link.includes("newspic.kr")) continue;
      if (!title) continue;
      if (isBlockedEntertainment(title)) continue;

      const id = makeIdFromUrl(link);
      if (isDuplicate(id)) continue;

      // ✅ 텔레그램 전송
      await sendTelegram(
        `🔥 가장 빠른 실시간 뉴스픽\n\n${title}\n\n👉 원문 바로가기\n${link}`
      );

      savePosted(id);
      console.log("[DONE] sent:", title);
      return;
    }

    console.log("[STOP] no suitable article found");

  } catch (e) {
    console.error("[FATAL ERROR]", e.message);
    process.exit(1);
  }
})();
