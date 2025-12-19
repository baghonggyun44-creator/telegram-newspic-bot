// src/newspicScraper.js
import axios from "axios";
import * as cheerio from "cheerio";

export async function scrapeHotNews() {
  const res = await axios.get("https://m.newspic.kr/");
  const $ = cheerio.load(res.data);

  const items = [];

  $(".news_item").each((_, el) => {
    const title = $(el).find(".title").text().trim();
    const link = $(el).find("a").attr("href");

    if (!title || !link) return;

    items.push({
      id: link,
      title,
      url: `https://m.newspic.kr${link}`
    });
  });

  return items.slice(0, 10); // 최대 10개
}
