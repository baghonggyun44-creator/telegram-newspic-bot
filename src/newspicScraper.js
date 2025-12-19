import axios from "axios";
import cheerio from "cheerio";

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

    // 🔥 가장 안정적인 카드 단위 기준
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

      articles.push({ id, title, url });
    });

    console.log("🧪 스크래핑 결과 샘플:", articles.slice(0, 3));

    return articles;
  } catch (err) {
    console.error("❌ 뉴스픽 스크래핑 실패:", err.message);
    return [];
  }
}
