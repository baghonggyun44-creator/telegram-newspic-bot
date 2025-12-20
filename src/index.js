import fetch from "node-fetch";
import crypto from "crypto";
import { isDuplicate, savePosted } from "./dedupStore.js";
import { sendTelegram } from "./telegram.js";

console.log("[START] newspic accident html bot");

// =====================
// 설정
// =====================
const LIST_URL = "https://m.newspic.kr/list?category=CA0105";

// 주인님 뉴스픽 PN
const MY_PN = "570"; // ← 본인 PN 확인

const HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "accept-language": "ko-KR,ko;q=0.9",
};

// =====================
// 유틸
// =====================
function makeId(nid) {
  return crypto.createHash("md5").update(String(nid)).digest("hex");
}

async function fetchHtml(url) {
  const res = await fetch(url, { headers: HEADERS });
  return await res.text();
}

// 사건사고 리스트에서 기사 추출
function extractArticles(html) {
  const results = [];

  // view.html?nid=XXXX 형태 전부 추출 (순서 유지)
  const regex = /href="\/view\.html\?nid=(\d+)"/g;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const nid = match[1];

    // 제목은 nid 근처의 <strong> 또는 <p>에서 추출
    const slice = html.slice(match.index, match.index + 500);
    const titleMatch =
      slice.match(/<strong[^>]*>(.*?)<\/strong>/) ||
      slice.match(/<p[^>]*>(.*?)<\/p>/);

    const title = titleMatch
      ? titleMatch[1].replace(/<[^>]+>/g, "").trim()
      : null;

    if (nid && title) {
      results.push({ nid, title });
    }
  }

  return results;
}

// =====================
// 메인
// =====================
(async () => {
  try {
    const html = await fetchHtml(LIST_URL);
    const articles = extractArticles(html);

    console.log("[DEBUG] extracted articles:", articles.length);

    if (!articles.length) {
      console.log("[STOP] no articles found");
      return;
    }

    // 1️⃣ 화면 맨 위 기사 사용
    const top = articles[0];

    const id = makeId(top.nid);
    if (isDuplicate(id)) {
      console.log("[STOP] duplicate article");
      return;
    }

    const articleUrl =
      `https://m.newspic.kr/view.html?nid=${top.nid}&pn=${MY_PN}`;

    await sendTelegram(
      `🚨 사건·사고 TOP 뉴스\n\n${top.title}\n\n👉 원문 바로가기\n${articleUrl}`
    );

    savePosted(id);
    console.log("[DONE] sent:", top.title);

  } catch (e) {
    console.error("[FATAL ERROR]", e.message);
    process.exit(1);
  }
})();
