import fetch from "node-fetch";
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

(async () => {
  try {
    const rss = await fetchRSS();
    const titles = parseTitles(rss);

    console.log("[DEBUG] titles count:", titles.length);

    if (titles.length === 0) {
      console.log("[STOP] no titles");
      return;
    }

    for (const title of titles.slice(0, 1)) {
      if (isDuplicate(title)) {
        console.log("[SKIP DUPLICATE]", title);
        continue;
      }

      await sendTelegram(`🚨 뉴스픽\n\n${title}`);
      savePosted(title);
    }

    console.log("[DONE]");
  } catch (e) {
    console.error("[FATAL]", e.message);
    process.exit(1);
  }
})();
