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

// nid 기준 중복 방지
function makeIdFromUrl(url) {
  const m = url.match(/nid=(\d+)/);
  const nid = m ? m[1] : url;
  return crypto.createHash("md5").update(nid).digest("hex");
}

function isBlockedEntertainment(title) {
  return ENTERTAINMENT_BLOCK.some(k => title.includes(k));
}

// RSS 가져오기
async function fetchText(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  return await res.text();
}

// Google News RSS 파싱
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

    return { title: title.trim(), link: link.trim() };
  });
}

// 🔥 Google News 링크 → 실제 newspic 링크로 변환
async function resolveFinalUrl(url) {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15000)
    });
    return res.url; // ⭐ 최종 도착 URL
  } catch {
    return "";
  }
}

// =====================
// 메인
// =====================
(async () => {
  try {
    const rssXml = await fetchText(RSS_URL);
    const articles = parseRss(rssXml);

    console.log("[DEBUG] rss articles count:", articles.length);

    for (const { title, link } of articles) {
      if (!link) continue;
      if (!title) continue;
      if (isBlockedEntertainment(title)) continue;

      // 🔥 리다이렉트 해제
      const finalUrl = await resolveFinalUrl(link);
      if (!finalUrl.includes("newspic.kr/view.html")) continue;

      const id = makeIdFromUrl(finalUrl);
      if (isDuplicate(id)) continue;

      await sendTelegram(
        `🔥 가장 빠른 실시간 뉴스픽\n\n${title}\n\n👉 원문 바로가기\n${finalUrl}`
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
