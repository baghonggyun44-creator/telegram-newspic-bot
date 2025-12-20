import fetch from "node-fetch";
import crypto from "crypto";
import { isDuplicate, savePosted } from "./dedupStore.js";
import { sendTelegram } from "./telegram.js";

const RSS_URL = "https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko";
const NEWSPIC_VIEW = "https://m.newspic.kr/view.html";
const PN = "570"; // 주인님 뉴스픽 계정 번호 (고정)

console.log("[START] newspic telegram bot");

// hash 기반 중복 제거
function makeId(nid) {
  return crypto.createHash("md5").update(nid).digest("hex");
}

async function fetchRSS() {
  const res = await fetch(RSS_URL, { signal: AbortSignal.timeout(10000) });
  return await res.text();
}

// 🔥 title + Google News link 함께 파싱
function parseItems(xml) {
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  const titleRegex = /<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/;
  const linkRegex = /<link>(.*?)<\/link>/;

  const items = [];
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const titleMatch = block.match(titleRegex);
    const linkMatch = block.match(linkRegex);

    if (!titleMatch || !linkMatch) continue;

    const title = titleMatch[1].trim();
    const link = linkMatch[1].trim();

    if (title.includes("Google 뉴스") || title.includes("Google News")) continue;

    items.push({ title, link });
  }

  return items;
}

// 🔥 Google News 링크 → nid 추출
function extractNid(googleLink) {
  // Google News 링크에 포함된 id를 nid로 사용
  const m = googleLink.match(/\/articles\/([^?]+)/);
  if (!m) return null;
  return m[1];
}

// 🔥 뉴스픽 view 링크 생성 (원래 구조)
function makeNewsPicViewLink(nid) {
  const params = new URLSearchParams({
    nid,
    pn: PN
  });
  return `${NEWSPIC_VIEW}?${params.toString()}`;
}

(async () => {
  try {
    const rss = await fetchRSS();
    const items = parseItems(rss);

    console.log("[DEBUG] items parsed:", items.length);

    if (items.length === 0) {
      console.log("[STOP] no items");
      return;
    }

    // ▶ 1건만 전송 (안정 운영)
    const { title, link } = items[0];
    const nid = extractNid(link);

    if (!nid) {
      console.log("[SKIP] nid not found");
      return;
    }

    const id = makeId(nid);
    if (isDuplicate(id)) {
      console.log("[SKIP DUPLICATE]", nid);
      return;
    }

    const newspicLink = makeNewsPicViewLink(nid);

    await sendTelegram(
      `🚨 가장 빠른 실시간 뉴스픽\n\n${title}\n\n👉 뉴스픽에서 보기\n${newspicLink}`
    );

    savePosted(id);
    console.log("[DONE] sent 1 newspic news");
  } catch (e) {
    console.error("[FATAL ERROR]", e.message);
    process.exit(1);
  }
})();
