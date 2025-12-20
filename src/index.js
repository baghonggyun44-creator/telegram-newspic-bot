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

const ACCIDENT_KEYWORDS = [
  "사망","사고","화재","폭발","추락","붕괴",
  "구속","체포","살인","폭행","음주운전",
  "경찰","검찰","재판","특검","기소","압수수색",
  "피의자","피해자","중상","참사","숨져","참변","충돌"
];

const ENTERTAINMENT_BLOCK = [
  "결혼","열애","출산","컴백","팬미팅","화보","신곡","콘서트"
];

function makeIdFromUrl(url) {
  return crypto.createHash("md5").update(url).digest("hex");
}

function isAccident(title) {
  return ACCIDENT_KEYWORDS.some(k => title.includes(k));
}

function isBlockedEntertainment(title) {
  return ENTERTAINMENT_BLOCK.some(k => title.includes(k));
}

async function fetchText(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  return { status: res.status, text: await res.text() };
}

function extractViewLinks(html) {
  const regex = /https?:\/\/m\.newspic\.kr\/view\.html\?nid=\d+&pn=\d+/g;
  return [...new Set(html.match(regex) || [])];
}

async function getTitleFromView(url) {
  const { status, text } = await fetchText(url);
  if (status !== 200) return "";

  const og = text.match(/property=["']og:title["']\s+content=["']([^"']+)["']/i);
  if (og?.[1]) return og[1].trim();

  const t = text.match(/<title>(.*?)<\/title>/i);
  return t?.[1]?.trim() || "";
}

(async () => {
  try {
    let viewLinks = [];

    for (const url of FEED_URLS) {
      const { status, text } = await fetchText(url);
      if (status !== 200) continue;

      const links = extractViewLinks(text);
      if (links.length) {
        viewLinks = links;
        break;
      }
    }

    if (!viewLinks.length) {
      console.log("[STOP] no view links");
      return;
    }

    let fallback = null;

    for (const url of viewLinks) {
      const id = makeIdFromUrl(url);
      if (isDuplicate(id)) continue;

      const title = await getTitleFromView(url);
      if (!title) continue;

      if (!fallback) fallback = { id, title, url };

      if (isBlockedEntertainment(title)) continue;
      if (!isAccident(title)) continue;

      await sendTelegram(
        `🚨 가장 빠른 실시간 뉴스픽\n\n${title}\n\n👉 원문 바로가기\n${url}`
      );
      savePosted(id);
      console.log("[DONE] accident sent");
      return;
    }

    // ✅ 사건사고 없으면 fallback 1건 전송
    if (fallback) {
      await sendTelegram(
        `📰 가장 빠른 실시간 뉴스픽\n\n${fallback.title}\n\n👉 원문 바로가기\n${fallback.url}`
      );
      savePosted(fallback.id);
      console.log("[DONE] fallback sent");
    }

  } catch (e) {
    console.error("[FATAL]", e.message);
    process.exit(1);
  }
})();
