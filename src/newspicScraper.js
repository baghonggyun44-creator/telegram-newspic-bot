import axios from "axios";
import * as cheerio from "cheerio";

export async function scrapeHotNews() {
  try {
    const res = await axios.get("https://m.newspic.kr/", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
      timeout: 10000,
    });

    const $ = cheerio.load(res.data);
    const articles = [];

    $("a[href*='view.html']").each((_, el) => {
      const href = $(el).attr("href");
      const title = $(el).text().trim();

      if (!href || !title) return;
      if (title.length < 10) return;

      const url = href.startsWith("http")
        ? href
        : `https://m.newspic.kr${href}`;

      const idMatch = url.match(/nid=\d+/);
      const id = idMatch ? idMatch[0] : url;

      articles.push({
        id,
        title,
        url,
      });
    });

    console.log("🧪 스크래핑 결과:", articles.length);

    return articles.slice(0, 5); // 🔥 최대 5개만
  } catch (err) {
    console.error("❌ 뉴스픽 스크래핑 실패:", err.message);
    return [];
  }
}
