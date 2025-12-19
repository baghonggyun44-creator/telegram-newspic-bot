// src/telegram.js
import axios from "axios";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function sendTelegram(title, link) {
  const text = `
가장빠른 실시간 뉴스픽
🚨 오늘의 핫이슈

${title}

👉 원문 바로가기
${link}
`;

  await axios.post(
    `https://api.telegram.org/bot${TOKEN}/sendMessage`,
    {
      chat_id: CHAT_ID,
      text,
      disable_web_page_preview: false
    }
  );
}
