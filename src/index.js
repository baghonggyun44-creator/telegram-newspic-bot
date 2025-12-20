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

function parseTitles(xml) {
  const matches = [...xml.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g)];
  return matches
    .map(m => m[1])
    .filter(t => t && !t.includes("Google 뉴스"));
}

(async () => {
  try {
    const rss = await fetchRSS();
    const titles = parseTitles(rss);

    console.log("[DEBUG] titles:", titles);

    if (titles.length === 0) {
      console.log("[STOP] no titles parsed");
      return;
    }

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
