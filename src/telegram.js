import fetch from "node-fetch";

export async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: false
    })
  });

  const data = await res.json();
  console.log("[TELEGRAM RESPONSE]", data);

  if (!data.ok) {
    throw new Error(data.description || "Telegram send failed");
  }
}
