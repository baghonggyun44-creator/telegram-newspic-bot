import axios from "axios";
import * as cheerio from "cheerio";

export async function fetchHotNews(url, limit) {
  const { data } = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
  });

  const $ = cheerio.load(data);
  const list = [];

  $("a").each((_, el) => {
    const title = $(el).text().trim();
    const href = $(el).attr("href");

    if (title.length < 15) return;
    if (!href || !href.includes("/view")) return;

    list.push({
      title,
      url: href.startsWith("http")
        ? href
        : `https://m.newspic.kr${href}`
    });
  });

  return list.slice(0, limit);
}
