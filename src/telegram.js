import axios from "axios";

export async function sendTelegram(token, chatId, text) {
  const apiUrl = `https://api.telegram.org/bot${token}/sendMessage`;

  await axios.post(apiUrl, {
    chat_id: chatId,
    text,
    disable_web_page_preview: false
  });
}
