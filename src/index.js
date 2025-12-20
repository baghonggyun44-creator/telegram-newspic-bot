import fetch from "node-fetch";
import crypto from "crypto";
import { isDuplicate, savePosted } from "./dedupStore.js";
import { sendTelegram } from "./telegram.js";

console.log("[START] newspic telegram bot");

/**
 * 뉴스픽 모바일 목록 페이지
 */
const FEED_URLS = [
  "https://m.newspic.kr/",
  "https://m.newspic.kr/index.html",
  "https://m.newspic.kr/main.html"
];

/**
 * ✅ 메인 기준 배지 (4종)
 */
const BADGES = ["열독률", "핫클릭", "인기", "공유많은"];

/**
 * ❌ 최소 연예/홍보 차단
 */
const ENTERTAINMENT_BLOCK = [
  "결혼","열애","출산","컴백","팬미팅",
  "화보","신곡","콘서트","예능","아이돌"
];

// ===== 유틸 =====

// nid 기준 중복 방지
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

/**
 * 🔥 기사 카드 단위로 분리해서
 * 배지(열독률/핫클릭/인기/공유많은) 포함된 기사만 추출
 */
function extractPreferredArticles(html) {
  const blocks = html.split("view.html");
  const results = [];

  for (const block of blocks) {
    if (!BADGES.some(b => block.includes(b))) continue;

    const m = block.match(/view\.html\?nid=\d+&pn=\d+/);
    if (m) {
      results.push("https://m.newspic.kr/" + m[0]);
    }
  }

  return [...new Set(results)];
}

/**
 * 기사 제목 추출 (OG 우선)
 */
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
    let candidateUrls = [];

    // 1️⃣ 목록 페이지에서 배지 기반 기사 추출
    for (const url of FEED_URLS) {
      console.log("[FETCH FEED]", url);
      const { status, text } = await fetchText(url);
      if (status !== 200) continue;

      const urls = extractPreferredArticles(text);
      if (urls.length) {
        candidateUrls = urls;
        break;
      }
    }

    if (!candidateUrls.length) {
      console.log("[STOP] no badge articles found");
      return;
    }

    // 2️⃣ 하나씩 검사 → 첫 통과 기사 전송
    for (const url of candidateUrls) {
      const id = makeIdFromUrl(url);
      if (isDuplicate(id)) continue;

      const title = await getTitleFromView(url);
      if (!title) continue;

      if (isBlockedEntertainment(title)) continue;

      await sendTelegram(
        `🔥 사람들이 많이 보는 뉴스\n\n${title}\n\n👉 원문 바로가기\n${url}`
      );

      savePosted(id);
      console.log("[DONE] sent badge article");
      return;
    }

    console.log("[STOP] all badge articles were duplicates or blocked");
  } catch (e) {
    console.error("[FATAL ERROR]", e.message);
    process.exit(1);
  }
})();
