/**
 * newspicScraper.js
 * 뉴스픽 핫뉴스 HTML 파싱 (RSS 없이)
 */

import axios from "axios";
import * as cheerio from "cheerio";

/**
 * 뉴스픽 핫뉴스 수집
 * @returns {Array<{ title: string, url: string, nid: string }>}
 */
export async function scrapeHotNews() {
  const targetUrl = "https://m.newspic.kr/";

  const { data: html } = await axios.get(targetUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
  });

  const $ = cheerio.load(html);
  const newsList = [];

  $("a[href*='view.html?nid=']").each((_, el) => {
    const href = $(el).attr("href");
    const title = $(el).text().trim();

    if (!href || !title) return;

    const fullUrl = href.startsWith("http")
      ? href
      : `https://m.newspic.kr${href}`;

    const nidMatch = fullUrl.match(/nid=(\d+)/);
    if (!nidMatch) return;

    newsList.push({
      title,
      url: fullUrl,
      nid: nidMatch[1]
    });
  });

  // 최신순 + 중복 제거
  const unique = [];
  const seen = new Set();

  for (const item of newsList) {
    if (seen.has(item.nid)) continue;
    seen.add(item.nid);
    unique.push(item);
  }

  console.log(`📰 수집된 뉴스 수: ${unique.length}`);

  return unique.slice(0, 5); // 상위 5개만 사용
}
