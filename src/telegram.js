/**
 * telegram.js
 * 텔레그램 메시지 전송 모듈
 * Node.js 18+ / type: module
 */

import axios from "axios";

// GitHub Secrets 또는 로컬 환경변수에서 가져옴
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!BOT_TOKEN) {
  throw new Error("❌ TELEGRAM_BOT_TOKEN 환경변수가 없습니다");
}

if (!CHAT_ID) {
  throw new Error("❌ TELEGRAM_CHAT_ID 환경변수가 없습니다");
}

/**
 * 텔레그램 메시지 전송
 * @param {string} text - 보낼 메시지
 */
export async function sendTelegram(text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  try {
    await axios.post(url, {
      chat_id: CHAT_ID,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: false
    });

    console.log("📨 텔레그램 전송 성공");
  } catch (error) {
    if (error.response) {
      console.error(
        "❌ 텔레그램 API 오류:",
        error.response.data
      );
    } else {
      console.error("❌ 텔레그램 전송 실패:", error.message);
    }
    throw error;
  }
}
