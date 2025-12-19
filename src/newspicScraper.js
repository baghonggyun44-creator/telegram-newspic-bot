import axios from "axios";
import * as cheerio from "cheerio";

const TARGET_URL = "https://m.newspic.kr";

export async function fetchHotNews() {
  const { data } = await axios.get(TARGET_URL);
  const $ = cheerio.load(data);

  const newsList = [];

  $("a[href^='/view.html']").each((i, el) => {
    if (i >= 5) return false;

    const title = $(el).text().trim();
    const link = "https://m.newspic.kr" + $(el).attr("href");

    if (title && link) {
      newsList.push({ title, link });
    }
  });

  return newsList;
}
