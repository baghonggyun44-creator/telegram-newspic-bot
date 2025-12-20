import fetch from "node-fetch";
import crypto from "crypto";
import { isDuplicate, savePosted } from "./dedupStore.js";
import { sendTelegram } from "./telegram.js";

const RSS_URL = "https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko";
const NEWSPIC_BASE = "https://newspic.kr/r";

// 🔥 B 방식 핵심 키워드
const ACCIDENT_KEYWORDS = [
  "사망","사고","화재","폭발","추락","붕괴",
  "구속","체포","살인","폭행","음주운전",
  "경찰","검찰","재판","특검","기소","압수수색"
];

const ENTERTAINMENT_BLOCK = [
  "결혼","열애","출산","컴백","아이돌","예능","팬미팅"
];

console.log("[START] newspic telegram bot");

// hash 기반 중복 ID
function makeId(title) {
  return crypto.createHash("md5").update(title).digest("hex");
}

// 뉴스픽 중계 링크
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

// 🔥 B 방식 판별
function isAccident(title) {
  return ACCIDENT_KEYWORDS.some(k => title.includes(k));
}

function isBlockedEntertainment(title) {
  return ENTERTAINMENT_BLOCK.some(k => title.includes(k));
}

(async () => {
  try {
    const rss = await fetchRSS();
    const titles = parseTitles(rss);

    console.log("[DEBUG] total titles:", titles.length);

    // ✅ 사건·사고 최우선
    let filtered = titles.filter(
      t => isAccident(t) && !isBlockedEntertainment(t)
    );

    // fallback (사건 없을 때는 일반 뉴스 1건)
    if (filtered.length === 0) {
      console.log("[FALLBACK] no accident news");
      filtered = titles.slice(0, 1);
    }

    const title = filtered[0];
    const id = makeId(title);

    if (isDuplicate(id)) {
      console.log("[SKIP DUPLICATE]", title);
      return;
    }

    const link = makeNewsPicLink(title);

    await sendTelegram(
      `🚨 가장 빠른 실시간 뉴스픽\n\n${title}\n\n👉 뉴스픽에서 보기\n${link}`
    );

    savePosted(id);
    console.log("[DONE] sent 1 accident news");
  } catch (e) {
    console.error("[FATAL ERROR]", e.message);
    process.exit(1);
  }
})();
