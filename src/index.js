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

const HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
};

// =====================
// 유틸
// =====================
function makeIdFromUrl(url) {
  const m = url.match(/nid=(\d+)/);
  const nid = m ? m[1] : url;
  return crypto.createHash("md5").update(nid).digest("hex");
}

function isBlockedEntertainment(title) {
  return ENTERTAINMENT_BLOCK.some(k => title.includes(k));
}

async function fetchText(url) {
  const res = await fetch(url, { headers: HEADERS });
  return await res.text();
}

function parseRss(xml) {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
  return items.map(item => {
    const block = item[1];
    const title =
      block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ||
      block.match(/<title>(.*?)<\/title>/)?.[1] ||
      "";
    const link = block.match(/<link>(.*?)<\/link>/)?.[1] || "";
    return { title: title.trim(), link: link.trim() };
  });
}

async function resolveFinalUrl(url) {
  try {
    const res = await fetch(url, {
      headers: HEADERS,
      redirect: "follow"
    });
    return res.url;
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

    let fallback = null;

    for (const { title, link } of articles) {
      if (!title || !link) continue;

      const finalUrl = await resolveFinalUrl(link);
      if (!finalUrl) continue;

      const id = makeIdFromUrl(finalUrl);
      if (isDuplicate(id)) continue;

      if (!fallback) {
        fallback = { title, finalUrl, id };
      }

      if (isBlockedEntertainment(title)) continue;
      if (!finalUrl.includes("newspic.kr/view.html")) continue;

      await sendTelegram(
        `🔥 가장 빠른 실시간 뉴스픽\n\n${title}\n\n👉 원문 바로가기\n${finalUrl}`
      );
      savePosted(id);
      console.log("[DONE] sent (filtered):", title);
      return;
    }

    // 🔥 조건 통과 기사 없으면 fallback 1건 전송
    if (fallback) {
      await sendTelegram(
        `📰 가장 빠른 실시간 뉴스픽\n\n${fallback.title}\n\n👉 원문 바로가기\n${fallback.finalUrl}`
      );
      savePosted(fallback.id);
      console.log("[DONE] sent (fallback):", fallback.title);
      return;
    }

    console.log("[STOP] nothing to send");

  } catch (e) {
    console.error("[FATAL ERROR]", e.message);
    process.exit(1);
  }
})();
