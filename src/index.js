import fetch from "node-fetch";
import crypto from "crypto";
import { isDuplicate, savePosted } from "./dedupStore.js";
import { sendTelegram } from "./telegram.js";

const RSS_URL = "https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko";

console.log("[START] newspic telegram bot");

function makeId(title) {
  return crypto.createHash("md5").update(title).digest("hex");
}

async function fetchRSS() {
  const res = await fetch(RSS_URL, { signal: AbortSignal.timeout(10000) });
  return await res.text();
}

// ✅ CDATA 유무 상관없이 title 파싱
function parseTitles(xml) {
  const matches = [...xml.matchAll(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/g)];
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

    // ▶ 테스트/운영 안정용: 1건만 전송
    const title = titles[0];
    const id = makeId(title);

    if (isDuplicate(id)) {
      console.log("[SKIP DUPLICATE]", title);
      return;
    }

    await sendTelegram(`🚨 뉴스픽\n\n${title}`);
    savePosted(id);

    console.log("[DONE] sent 1 news");
  } catch (e) {
    console.error("[FATAL ERROR]", e.message);
    process.exit(1);
  }
})();
