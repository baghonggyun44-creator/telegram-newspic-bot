import fetch from "node-fetch";
import crypto from "crypto";
import { isDuplicate, savePosted } from "./dedupStore.js";
import { sendTelegram } from "./telegram.js";

const RSS_URL = "https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko";

console.log("[START] newspic telegram bot");

async function fetchRSS() {
  const res = await fetch(RSS_URL, { signal: AbortSignal.timeout(10000) });
  return await res.text();
}

function parseTitles(xml) {
  const matches = [...xml.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g)];
  return matches
    .map(m => m[1])
    .filter(t => !t.includes("Google 뉴스"));
}

// ✅ hash 기반 ID 생성 (운영 안정화 핵심)
function makeId(title) {
  return crypto.createHash("md5").update(title).digest("hex");
}

(async () => {
  try {
    const rss = await fetchRSS();
    const titles = parseTitles(rss);

    console.log("[DEBUG] titles count:", titles.length);

    if (titles.length === 0) {
      console.log("[STOP] no titles");
      return;
    }

    // 👉 현재는 테스트 안정성을 위해 1건만 전송
    for (const title of titles.slice(0, 1)) {
      const id = makeId(title);

      if (isDuplicate(id)) {
        console.log("[SKIP DUPLICATE]", title);
        continue;
      }

      await sendTelegram(`🚨 뉴스픽\n\n${title}`);
      savePosted(id);
    }

    console.log("[DONE]");
  } catch (e) {
    console.error("[FATAL]", e.message);
    process.exit(1);
  }
})();
