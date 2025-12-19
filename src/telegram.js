import axios from "axios";

export async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is empty (GitHub Secrets 확인).");
  if (!chatId) throw new Error("TELEGRAM_CHAT_ID is empty (GitHub Secrets 확인).");

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  await axios.post(
    url,
    {
      chat_id: chatId,
      text,
      disable_web_page_preview: false
    },
    {
      headers: { "Content-Type": "application/json" },
      timeout: 15000
    }
  );
}
