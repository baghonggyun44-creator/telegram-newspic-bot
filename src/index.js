import fetch from "node-fetch";
import crypto from "crypto";
import { load } from "cheerio";
import { isDuplicate, savePosted } from "./dedupStore.js";
import { sendTelegram } from "./telegram.js";

console.log("[START] newspic accident html bot");

// 🧪 텔레그램 연결 확인용 (이 메시지 오면 봇/환경 정상)

/**
 * 뉴스픽 모바일 사건사고 페이지
 */
const TARGET_URL = "https://m.newspic.kr/news?category=CA0105";

/**
 * 중복 방지용 ID (nid 기준)
 */
function makeId(nid) {
  return crypto.createHash("md5").update(String(nid)).digest("hex");
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  return res.text();
}

(async () => {
  try {
    console.log("[FETCH]", TARGET_URL);
    const html = await fetchHtml(TARGET_URL);

    const $ = load(html);

    const articles = [];

    // 🔥 사건사고 리스트 파싱
    $("section:contains('사건사고')")
      .find("li")
      .each((_, el) => {
        const link = $(el).find("a").attr("href");
        const title = $(el).find("p").text().trim();

        if (!link || !title) return;

        const nidMatch = link.match(/nid=(\d+)/);
        if (!nidMatch) return;

        articles.push({
          nid: nidMatch[1],
          title,
          url: link.startsWith("http")
            ? link
            : `https://m.newspic.kr${link}`,
        });
      });

    console.log("[DEBUG] extracted articles:", articles.length);

    if (articles.length === 0) {
      console.log("[STOP] no articles found");
      return;
    }

    // 🔥 첫 번째 기사만 처리
    const article = articles[0];
    const id = makeId(article.nid);

    if (isDuplicate(id)) {
      console.log("[STOP] duplicate article");
      return;
    }

    await sendTelegram(
      `🚨 가장 빠른 실시간 뉴스픽\n\n${article.title}\n\n👉 원문 바로가기\n${article.url}`
    );

    savePosted(id);

    console.log("[DONE] sent:", article.title);
  } catch (e) {
    console.error("[FATAL ERROR]", e.message);
    process.exit(1);
  }
})();
