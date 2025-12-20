import fetch from "node-fetch";
import crypto from "crypto";
import { isDuplicate, savePosted } from "./dedupStore.js";
import { sendTelegram } from "./telegram.js";

console.log("[START] newspic telegram bot");

const FEED_URLS = [
  "https://m.newspic.kr/",
  "https://m.newspic.kr/index.html",
  "https://m.newspic.kr/main.html"
];

// 최소 연예/홍보 차단 (너무 빡세지 않게)
const ENTERTAINMENT_BLOCK = [
  "결혼","열애","출산","컴백","팬미팅",
  "화보","신곡","콘서트","예능","아이돌"
];

// ===== 유틸 =====

// nid 기준 중복 방지 (pn 변화 무관)
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
  return { status: res.status, text: await res.text() };
}

// 뉴스픽 메인 HTML에서 view.html 링크 전부 추출 (등장 순서 유지)
function extractViewLinks(html) {
  const regex =
    /https?:\/\/m\.newspic\.kr\/view\.html\?nid=\d+&pn=\d+/g;
  return [...new Set(html.match(regex) || [])];
}

// 기사 제목 추출 (OG 우선)
async function getTitleFromView(url) {
  const { status, text } = await fetchText(url);
  if (status !== 200) return "";

  const og = text.match(
    /property=["']og:title["']\s+content=["']([^"']+)["']/i
  );
  if (og?.[1]) return og[1].trim();

  const t = text.match(/<title>(.*?)<\/title>/i);
  return t?.[1]?.trim() || "";
}

// ===== 메인 =====

(async () => {
  try {
    let viewLinks = [];

    // 1️⃣ 뉴스픽 메인에서 상단 기사 링크 수집
    for (const feed of FEED_URLS) {
      console.log("[FETCH FEED]", feed);
      const { status, text } = await fetchText(feed);
      if (status !== 200) continue;

      const links = extractViewLinks(text);
      if (links.length) {
        viewLinks = links;
        break;
      }
    }

    if (!viewLinks.length) {
      console.log("[STOP] no view links found");
      return;
    }

    // 2️⃣ 상단부터 하나씩 검사 → 첫 유효 기사 전송
    for (const url of viewLinks) {
      const id = makeIdFromUrl(url);
      if (isDuplicate(id)) continue;

      const title = await getTitleFromView(url);
      if (!title) continue;

      if (isBlockedEntertainment(title)) continue;

      await sendTelegram(
        `🔥 가장 빠른 실시간 뉴스픽\n\n${title}\n\n👉 원문 바로가기\n${url}`
      );

      savePosted(id);
      console.log("[DONE] sent:", title);
      return;
    }

    console.log("[STOP] all top articles were duplicates or blocked");
  } catch (e) {
    console.error("[FATAL ERROR]", e.message);
    process.exit(1);
  }
})();
