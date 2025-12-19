import axios from "axios";
import { XMLParser } from "fast-xml-parser";

function normalizeItems(items) {
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

export async function fetchHotNews() {
  const rssUrl = process.env.NEWSPIC_RSS_URL;

  if (!rssUrl) {
    throw new Error(
      "NEWSPIC_RSS_URL is empty. GitHub Secrets에 NEWSPIC_RSS_URL(뉴스픽 파트너스 RSS 주소)을 등록하세요."
    );
  }

  const res = await axios.get(rssUrl, {
    headers: { "User-Agent": "Mozilla/5.0" },
    timeout: 15000,
  });

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    // RSS마다 구조가 조금 달라서 CDATA 등 최대한 살림
    processEntities: true,
  });

  const xml = parser.parse(res.data);

  // 일반 RSS: rss.channel.item
  // Atom: feed.entry (혹시 몰라서 둘 다 커버)
  const rssItems = normalizeItems(xml?.rss?.channel?.item);
  const atomItems = normalizeItems(xml?.feed?.entry);

  const items = rssItems.length ? rssItems : atomItems;

  const mapped = items
    .map((it) => {
      const title = (it?.title && (it.title["#text"] || it.title))?.toString?.() ?? it?.title?.toString?.() ?? "";
      // RSS: link가 문자열 or link.href 형태 / Atom: link.@_href
      const link =
        (typeof it?.link === "string" && it.link) ||
        it?.link?.["@_href"] ||
        it?.link?.href ||
        it?.guid ||
        "";

      const pubDate = it?.pubDate || it?.updated || it?.published || "";

      return {
        title: title.trim(),
        link: (link || "").toString().trim(),
        pubDate: pubDate ? pubDate.toString().trim() : "",
      };
    })
    .filter((x) => x.title && x.link);

  return mapped;
}
