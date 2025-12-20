import fetch from "node-fetch";
import cheerio from "cheerio";
import crypto from "crypto";
import { isDuplicate, savePosted } from "./dedupStore.js";
import { sendTelegram } from "./telegram.js";

console.log("[START] newspic accident html bot");

// =====================
// 설정
// =====================
const LIST_URL = "https://m.newspic.kr/list?category=CA0105";
const MY_PN = "570"; // ← 주인님 PN

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

// =====================
// 메인
// =====================
(async () => {
  try {
    const html = await fetchHtml(LIST_URL);
    const $ = cheerio.load(html);

    const articles = [];

    // 👉 모바일 뉴스픽 기사 카드 구조 기준
    $("a[href*='view.html?nid=']").each((i, el) => {
      const href = $(el).attr("href");
      const title =
        $(el).find(".title").text().trim() ||
        $(el).find("h2").text().trim() ||
        $(el).text().trim();

      const nidMatch = href.match(/nid=(\d+)/);
      if (!nidMatch || !title) return;

      articles.push({
        nid: nidMatch[1],
        title,
      });
    });

    console.log("[DEBUG] extracted articles:", articles.length);

    if (!articles.length) {
      console.log("[STOP] no articles found");
      return;
    }

    // 1️⃣ 화면 맨 위 기사
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
