import fetch from "node-fetch";
import crypto from "crypto";
import { isDuplicate, savePosted } from "./dedupStore.js";
import { sendTelegram } from "./telegram.js";

console.log("[START] newspic telegram bot");

/**
 * 🔥 뉴스픽 모바일 목록 페이지 후보
 * pn을 우리가 정하지 않고, 뉴스픽이 내려주는 그대로 따라감
 */
const FEED_URLS = [
  "https://m.newspic.kr/",
  "https://m.newspic.kr/index.html",
  "https://m.newspic.kr/main.html"
];

// B 방식 사건·사고 키워드
const ACCIDENT_KEYWORDS = [
  "사망","사고","화재","폭발","추락","붕괴",
  "구속","체포","살인","폭행","음주운전",
  "경찰","검찰","재판","특검","기소","압수수색",
  "피의자","피해자","중상","참사"
];

// 연예 홍보성 차단
const ENTERTAINMENT_BLOCK = [
  "결혼","열애","출산","컴백","아이돌","예능",
  "팬미팅","화보","신곡","콘서트"
];

// ===== 유틸 =====

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
  return {
    status: res.status,
    text: await res.text()
  };
}

/**
 * 🔥 뉴스픽 목록 HTML에서
 * 이미 완성된 view.html?nid=XXXX&pn=YYYY 링크를 그대로 추출
 */
function extractViewLinks(html) {
  const regex =
    /https?:\/\/m\.newspic\.kr\/view\.html\?nid=\d+&pn=\d+/g;

  const matches = html.match(regex) || [];
  // 중복 제거
  return [...new Set(matches)];
}

/**
 * 🔥 view.html 페이지에서 실제 기사 제목 추출 (OG 우선)
 */
async function getTitleFromView(url) {
  const { status, text } = await fetchText(url);
  if (status < 200 || status >= 400) return "";

  const og = text.match(
    /property=["']og:title["']\s+content=["']([^"']+)["']/i
  );
  if (og?.[1]) return og[1].trim();

  const t = text.match(/<title>(.*?)<\/title>/i);
  if (t?.[1]) return t[1].trim();

  return "";
}

// ===== 메인 =====

(async () => {
  try {
    let viewLinks = [];

    // 1️⃣ 뉴스픽 목록 페이지에서 view.html 링크 수집
    for (const url of FEED_URLS) {
      console.log("[FETCH FEED]", url);
      const { status, text } = await fetchText(url);
      if (status < 200 || status >= 400) continue;

      const links = extractViewLinks(text);
      if (links.length > 0) {
        viewLinks = links;
        break;
      }
    }

    if (viewLinks.length === 0) {
      console.log("[STOP] no view.html links found");
      return;
    }

    // 2️⃣ 하나씩 검사해서 "사건·사고" 첫 기사 선택
    for (const url of viewLinks) {
      const id = makeIdFromUrl(url);
      if (isDuplicate(id)) continue;

      const title = await getTitleFromView(url);
      if (!title) continue;

      // B 방식 필터
      if (!isAccident(title)) continue;
      if (isBlockedEntertainment(title)) continue;

      // 3️⃣ 텔레그램 전송 (URL 그대로 → 카드형 생성)
      await sendTelegram(
        `🚨 가장 빠른 실시간 뉴스픽\n\n${title}\n\n👉 원문 바로가기\n${url}`
      );

      savePosted(id);
      console.log("[DONE] sent:", title);
      return;
    }

    console.log("[STOP] no suitable accident news found");
  } catch (e) {
    console.error("[FATAL ERROR]", e.message);
    process.exit(1);
  }
})();
