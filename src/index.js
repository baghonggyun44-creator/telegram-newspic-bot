import fetch from "node-fetch";
import crypto from "crypto";
import { isDuplicate, savePosted } from "./dedupStore.js";
import { sendTelegram } from "./telegram.js";

const RSS_URL = "https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko";
const NEWSPIC_BASE = "https://newspic.kr/r";

console.log("[START] newspic telegram bot");

// hash 기반 중복 ID
function makeId(title) {
  return crypto.createHash("md5").update(title).digest("hex");
}

// 뉴스픽 중계 링크 생성 (수익 구조 핵심)
function makeNewsPicLink(title) {
  const params = new URLSearchParams({ t: title });
  return `${NEWSPIC_BASE}?${params.toString()}`;
}

async function fetchRSS() {
  const res = await fetch(RSS_URL, { signal: AbortSignal.timeout(10000) });
  return await res.text();
}

// CDATA 유무 상관없이 title 파싱
function parseTitles(xml) {
  const matches = [
    ...xml.matchAll(
      /<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/g
    )
  ];

  return matches
    .map(m => m[1].trim())
    .filter(
      t =>
        t &&
        !t.includes("Google 뉴스") &&
        !t.includes("Google News")
    );
}

(async () => {
  try {
    const rss = await fetchRSS();
    const titles = parseTitles(rss);

    console.log("[DEBUG] titles parsed:", titles.length);

    if (titles.length === 0) {
      console.log("[STOP] no titles parsed");
      return;
    }

    // ▶ 안정 운영: 1회 1건 전송
    const title = titles[0];
    const id = makeId(title);

    if (isDuplicate(id)) {
      console.log("[SKIP DUPLICATE]", title);
      return;
    }

    const link = makeNewsPicLink(title);

    await sendTelegram(
      `🚨 뉴스픽\n\n${title}\n\n👉 뉴스픽에서 보기\n${link}`
    );

    savePosted(id);
    console.log("[DONE] sent 1 news");
  } catch (e) {
    console.error("[FATAL ERROR]", e.message);
    process.exit(1);
  }
})();
