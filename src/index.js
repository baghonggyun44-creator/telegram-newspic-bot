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

// 최소 차단 (너무 빡세지 않게)
const ENTERTAINMENT_BLOCK = [
  "결혼","열애","출산","컴백","팬미팅",
  "화보","신곡","콘서트","예능","아이돌"
];

// Google / 뉴스픽 접근용 헤더 (필수)
const HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  "accept":
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
};

// =====================
// 유틸
// =====================

// nid 기준 중복 제거 (pn 바뀌어도 동일 기사 차단)
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
  const res = await fetch(url, { headers: HEADERS });
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

    return { title: title.trim(), link: link.trim() };
  });
}

// 🔥 Google News → newspic 최종 링크 수동 추적
async function resolveFinalNewspicUrl(startUrl) {
  let current = startUrl;

  try {
    for (let i = 0; i < 6; i++) {
      const res = await fetch(current, {
        headers: HEADERS,
        redirect: "manual"
      });

      const location = res.headers.get("location");
      if (!location) break;

      current = location.startsWith("http")
        ? location
        : new URL(location, current).href;

      // 🎯 진짜 뉴스픽 기사 도착
      if (
        current.includes("newspic.kr/view.html") ||
        current.includes("m.newspic.kr/view.html")
      ) {
        return current;
      }

      // 로그인/파트너스 페이지면 실패 처리
      if (current.includes("/login")) {
        return "";
      }
    }
  } catch (e) {
    return "";
  }

  return "";
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
      if (isBlockedEntertainment(title)) continue;

      // 🔥 중간 링크 → 최종 newspic 링크
      const finalUrl = await resolveFinalNewspicUrl(link);
      if (!finalUrl) continue;

      const id = makeIdFromUrl(finalUrl);
      if (isDuplicate(id)) continue;

      // fallback 후보 저장
      if (!fallback) {
        fallback = { title, finalUrl, id };
      }

      // 정상 기사 전송
      await sendTelegram(
        `🔥 가장 빠른 실시간 뉴스픽\n\n${title}\n\n👉 원문 바로가기\n${finalUrl}`
      );

      savePosted(id);
      console.log("[DONE] sent:", title);
      return;
    }

    // 🔁 조건 통과 기사 없으면 fallback 1건
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
    console.error("[FATAL ERROR]", e);
    process.exit(1);
  }
})();
