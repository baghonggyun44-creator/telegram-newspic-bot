import { fetchHotNews } from "./newspicScraper.js";
import { sendTelegramMessage } from "./telegram.js";
import { toPartnerLink } from "./partnerLink.js";
import { isPosted, markPosted } from "./dedupStore.js";

async function main() {
  const newsList = await fetchHotNews();

  for (const news of newsList) {
    if (isPosted(news.link)) continue;

    const partnerLink = toPartnerLink(news.link);

    const message = `🚨 오늘의 핫이슈

${news.title}

👉 원문 바로가기
${partnerLink}`;

    await sendTelegramMessage(message);
    markPosted(news.link);

    // ⏱ 과도한 발송 방지
    await new Promise(r => setTimeout(r, 30000));
  }
}

main();
