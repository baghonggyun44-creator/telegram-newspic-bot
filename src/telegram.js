import axios from "axios";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function sendTelegram(url, title) {
  const api = `https://api.telegram.org/bot${TOKEN}/sendMessage`;

  const text =
`가장빠른 실시간 뉴스픽
🚨 오늘의 핫이슈

${title}

👉 원문 바로가기
${url}`;

  try {
    console.log("📡 텔레그램 전송 정보");
    console.log("TOKEN 있음:", !!TOKEN);
    console.log("CHAT_ID:", CHAT_ID);

    const res = await axios.post(api, {
      chat_id: CHAT_ID,
      text,
      disable_web_page_preview: false,
    });

    console.log("✅ 텔레그램 응답:", res.data);
  } catch (err) {
    console.error("❌ 텔레그램 전송 실패");
    if (err.response) {
      console.error("상태코드:", err.response.status);
      console.error("응답:", err.response.data);
    } else {
      console.error(err.message);
    }
    throw err;
  }
}
