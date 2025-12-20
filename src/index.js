import fetch from "node-fetch";
import { isDuplicate, savePosted } from "./dedupStore.js";
import { sendTelegram } from "./telegram.js";

const RSS_URL = "https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko";

// 사건사고 키워드
const ACCIDENT_KEYWORDS = [
  "사망", "사고", "화재", "폭발", "추락", "구속",
  "체포", "살인", "음주운전", "경찰", "검찰", "재판"
];

// 연예 차단 키워드
const ENTERTAINMENT_BLOCK = [
  "결혼", "출산", "열애", "컴백", "데뷔", "아이돌", "예능"
];

console.log("[START] newspic telegram bot");

async function fetchRSS() {
  const res = await fetch(RSS_URL, { signal: AbortSignal.timeout(10000) });
  const text = await res.text();
  return text;
}

function parseTitles(xml) {
  const matches = [...xml.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g)];
  return matches
    .map(m => m[1])
    .filter(t => !t.includes("Google 뉴스"));
}

function isAccident(title) {
  return ACCIDENT_KEYWORDS.some(k => title.includes(k));
}

function isEntertainmentBlocked(title) {
  return ENTERTAINMENT_BLOCK.some(k => title.includes(k));
}

(async () => {
  try {
    const rss = await fetchRSS();
    const titles = parseTitles(rss);

    console.log("[DEBUG] fetched titles:", titles.length);

    let filtered = titles.filter(t =>
      isAccident(t) && !isEntertainmentBlocked(t)
    );

    console.log("[DEBUG] after filter:", filtered.length);

    // ✅ fallback (이게 텔레그램 안 오던 문제 해결 포인트)
    if (filtered.length === 0) {
      console.log("[FALLBACK] no accident news, use general");
      filtered = titles.slice(0, 1);
    }

    for (const title of filtered) {
      const id = title;

      if (isDuplicate(id)) {
        console.log("[SKIP DUPLICATE]", title);
        continue;
      }

      await sendTelegram(`🚨 뉴스픽\n\n${title}`);
      savePosted(id);
    }

    console.log("[DONE] finished");
  } catch (e) {
    console.error("[FATAL ERROR]", e.message);
    process.exit(1);
  }
})();
